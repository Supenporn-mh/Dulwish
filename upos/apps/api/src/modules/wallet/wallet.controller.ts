import { Elysia, t } from 'elysia'
import mongoose from 'mongoose'
import { authPlugin } from '../../middleware/auth'
import { Wallet, Transaction, User, ParentStudent } from '../../models'

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
    return { transactions: txns }
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
      // Mock payment — create pending transaction, auto-confirm after 3s
      const txn = await Transaction.create({
        refNo,
        walletId: wallet._id,
        type: 'topup',
        amount,
        balanceAfter: wallet.balance,
        channel,
        paymentMethod,
        paymentRef: `MOCK-${Date.now()}`,
        status: 'pending',
      })

      // Auto-confirm after 3s (mock gateway callback)
      setTimeout(async () => {
        const session = await mongoose.startSession()
        await session.withTransaction(async () => {
          const w = await Wallet.findById(wallet._id).session(session)
          if (!w) return
          w.balance += amount
          w.version += 1
          await w.save({ session })
          await Transaction.findByIdAndUpdate(txn._id, {
            status: 'success',
            balanceAfter: w.balance,
          }, { session })
        })
        session.endSession()
        console.log(`[Wallet] Mock topup confirmed: ${refNo} +฿${amount}`)
      }, 3000)

      return {
        transaction: {
          _id: txn._id,
          refNo,
          status: 'pending',
          qr_payload: `MOCK_QR_${refNo}`,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }
      }
    }

    // Immediate (cash topup at POS)
    const session = await mongoose.startSession()
    let result: any
    await session.withTransaction(async () => {
      const w = await Wallet.findById(wallet._id).session(session)
      if (!w) throw new Error('Wallet not found')
      w.balance += amount
      w.version += 1
      await w.save({ session })

      const txn = await Transaction.create([{
        refNo,
        walletId: w._id,
        type: 'topup',
        amount,
        balanceAfter: w.balance,
        channel,
        paymentMethod: paymentMethod ?? 'cash',
        cashierId: currentUser._id,
        status: 'success',
      }], { session })

      result = { transaction: txn[0], newBalance: w.balance }
    })
    session.endSession()
    return result
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
