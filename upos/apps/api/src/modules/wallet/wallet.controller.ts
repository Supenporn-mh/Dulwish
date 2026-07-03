import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { Wallet, Transaction, User, ParentStudent, BuffetSession } from '../../models'

function genRefNo(prefix = 'TXN') {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `${prefix}${date}-${rand}`
}

export const walletController = new Elysia({ prefix: '/wallets' })
  .use(authPlugin())

  .get('/me', async ({ currentUser }) => {
    const wallet = await Wallet.findOne({ userId: currentUser._id }).lean()
    return { wallet }
  })

  .get('/:userId', async ({ params, currentUser, set }) => {
    // Allow: self, parent of student, admin/supervisor/cashier
    const isStaff = ['admin','supervisor','cashier'].includes(currentUser.role)
    const isSelf  = String(currentUser._id) === params.userId

    let isParentOf = false
    if (currentUser.role === 'parent') {
      const link = await ParentStudent.findOne({
        parentUserId: currentUser._id,
        studentUserId: params.userId,
      })
      isParentOf = !!link
    }

    if (!isStaff && !isSelf && !isParentOf) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }

    const wallet = await Wallet.findOne({ userId: params.userId }).lean()
    if (!wallet) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Wallet not found' } } }
    return { wallet }
  })

  .get('/:userId/transactions', async ({ params, query }) => {
    const wallet = await Wallet.findOne({ userId: params.userId })
    if (!wallet) return { transactions: [] }
    const filter: any = { walletId: wallet._id }
    if (query.type) filter.type = query.type
    const txns = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(query.limit ?? 20))
      .lean()

    // Enrich buffet-type transactions with their session's round window so the
    // frontend can derive an "active" (still within round time) display status.
    const buffetTxnIds = txns.filter(t => t.type === 'buffet').map(t => t._id)
    const sessions = buffetTxnIds.length
      ? await BuffetSession.find({ transactionId: { $in: buffetTxnIds } })
          .populate('buffetRoundId', 'startTime endTime')
          .lean()
      : []
    const sessionByTxnId = new Map(sessions.map(s => [String(s.transactionId), s]))

    // Enrich voided/refunded transactions with the reason/actor from the
    // sibling void/refund transaction that references them via voidedByTxnId.
    const terminalIds = txns.filter(t => t.status === 'voided' || t.status === 'refunded').map(t => t._id)
    const actionTxns = terminalIds.length
      ? await Transaction.find({ voidedByTxnId: { $in: terminalIds } })
          .populate('cashierId', 'firstName lastName')
          .lean()
      : []
    const actionByOrigId = new Map(actionTxns.map(a => [String(a.voidedByTxnId), a]))

    const enriched = txns.map(t => {
      const session = t.type === 'buffet' ? sessionByTxnId.get(String(t._id)) : undefined
      const action  = actionByOrigId.get(String(t._id))
      const cashier = action?.cashierId as any
      return {
        ...t,
        ...(session ? {
          buffetRoundStart: (session.buffetRoundId as any)?.startTime,
          buffetRoundEnd:   (session.buffetRoundId as any)?.endTime,
          buffetEntryDate:  session.entryDate,
        } : {}),
        ...(action ? {
          reason:          action.note,
          actionedAt:      action.createdAt,
          actionedByName:  cashier ? `${cashier.firstName ?? ''} ${cashier.lastName ?? ''}`.trim() : undefined,
        } : {}),
      }
    })

    return { transactions: enriched }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      type:  t.Optional(t.String()),
    }),
  })

  .post('/:userId/topup', async ({ params, body, currentUser, set }) => {
    // Only parent/admin/cashier/supervisor can topup
    if (!['parent','admin','cashier','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }
    const { amount, channel, paymentMethod } = body

    if (amount < 20 || amount > 5000) {
      set.status = 400
      return { error: { code: 'WALLET_001', message: 'Amount must be 20–5000 THB' } }
    }

    const wallet = await Wallet.findOne({ userId: params.userId })
    if (!wallet) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Wallet not found' } } }

    const refNo = genRefNo('TXN')

    if (paymentMethod === 'scb_qr' || paymentMethod === 'credit_card') {
      // Confirm immediately (standalone MongoDB — no replica set, sessions not supported)
      wallet.balance += amount
      wallet.version += 1
      await wallet.save()

      const txn = await Transaction.create({
        refNo,
        walletId: wallet._id,
        type: 'topup',
        amount,
        balanceAfter: wallet.balance,
        channel,
        paymentMethod,
        paymentRef: `MOCK-${Date.now()}`,
        status: 'success',
      })

      console.log(`[Wallet] Topup confirmed: ${refNo} +฿${amount}`)
      return { transaction: txn, newBalance: wallet.balance }
    }

    // Immediate (cash topup at POS)
    wallet.balance += amount
    wallet.version += 1
    await wallet.save()

    const txn = await Transaction.create({
      refNo,
      walletId: wallet._id,
      type: 'topup',
      amount,
      balanceAfter: wallet.balance,
      channel,
      paymentMethod: paymentMethod ?? 'cash',
      cashierId: currentUser._id,
      status: 'success',
    })

    return { transaction: txn, newBalance: wallet.balance }
  }, {
    body: t.Object({
      amount:        t.Number(),
      channel:       t.String(),
      paymentMethod: t.Optional(t.String()),
    }),
  })

  .get('/:userId/balance-status', async ({ params }) => {
    const wallet = await Wallet.findOne({ userId: params.userId }).lean()
    if (!wallet) return { balance: 0, isLow: false, isNegative: false }
    return {
      balance: wallet.balance,
      isLow: wallet.balance < wallet.lowThreshold,
      isNegative: wallet.balance < 0,
      negativeLimit: wallet.negativeLimit,
      lowThreshold: wallet.lowThreshold,
    }
  })
