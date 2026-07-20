import { Elysia, t } from 'elysia'
import mongoose from 'mongoose'
import { authPlugin } from '../../middleware/auth'
import {
  Card, User, Wallet, Transaction, BuffetSession, BuffetPricing,
  BuffetRound, MealPeriod, MenuItem, Shop, Order, AuditLog, GradeLevel
} from '../../models'

function genRefNo(prefix = 'TXN') {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `${prefix}${date}-${rand}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function mapUserType(role: string): 'member' | 'student' {
  return role === 'student' ? 'student' : 'member'
}

const KIOSK_ALLOWED_ROLES = ['student', 'teacher', 'staff', 'visitor']
const KIOSK_ROLE_LABEL: Record<string, string> = {
  student: 'นักเรียน',
  teacher: 'ครู',
  staff:   'เจ้าหน้าที่',
  visitor: 'ผู้เยี่ยมชม',
}
const CARD_NOT_FOUND = { error: { code: 'CARD_001', message: 'Card not found or inactive' } }

export const posController = new Elysia({ prefix: '/pos' })

  // ── Kiosk Card Read (public — no auth; self-service kiosk tap/manual entry) ──
  // Data minimization: unlike every other route in this file, this one is
  // unauthenticated, so it returns only the fields the kiosk UI needs — never
  // email/phone/passwordHash/pinHash/dob/guardianEmail/etc. Staff/admin/
  // supervisor/parent cards are treated as not-found so an anonymous caller
  // can't discover that such a card exists via this endpoint.
  .get('/kiosk-card-read/:cardUid', async ({ params, set }) => {
    const card = await Card.findOne({ cardUid: params.cardUid, status: 'active' }).lean()
    if (!card) {
      set.status = 404
      return CARD_NOT_FOUND
    }
    const user = await User.findById(card.userId).lean()
    if (!user || !KIOSK_ALLOWED_ROLES.includes(user.role)) {
      set.status = 404
      return CARD_NOT_FOUND
    }
    const wallet = await Wallet.findOne({ userId: user._id }).lean()
    return {
      user: {
        uid:       user.uid,
        name:      `${user.firstName} ${user.lastName}`.trim(),
        grade:     user.studentProfile?.gradeLevel ?? '-',
        classRoom: user.studentProfile?.className ?? '-',
        role:      user.role,
        roleLabel: KIOSK_ROLE_LABEL[user.role] ?? user.role,
      },
      wallet: {
        balance:  wallet?.balance ?? 0,
        currency: wallet?.currency ?? 'THB',
      },
    }
  })

  .use(authPlugin(['cashier','supervisor','admin']))

  // ── Card Read ──────────────────────────────────────────────────────────────
  .post('/card-read', async ({ body, set }) => {
    const card = await Card.findOne({ cardUid: body.card_uid, status: 'active' }).lean()
    if (!card) {
      set.status = 404
      return { error: { code: 'CARD_001', message: 'Card not found or inactive' } }
    }
    const user = await User.findById(card.userId).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'CARD_001', message: 'User not found' } }
    }
    const wallet = await Wallet.findOne({ userId: user._id }).lean()
    const { passwordHash: _, ...safeUser } = user as any
    return { user: safeUser, wallet, card }
  }, {
    body: t.Object({ card_uid: t.String() }),
  })

  // ── Sale ───────────────────────────────────────────────────────────────────
  .post('/sale', async ({ body, currentUser, set }) => {
    const { shop_id, items, tenders } = body

    // Calculate total
    const menuIds = items.map((i: any) => i.menu_item_id)
    const menuItems = await MenuItem.find({ _id: { $in: menuIds }, active: true }).lean()
    let total = 0
    const lineItems: any[] = []
    for (const item of items) {
      const menu = menuItems.find(m => String(m._id) === item.menu_item_id)
      if (!menu) {
        set.status = 400
        return { error: { code: 'ORDER_005', message: `Menu item not found: ${item.menu_item_id}` } }
      }
      const lineTotal = menu.price * item.qty
      total += lineTotal
      lineItems.push({ ...item, unitPrice: menu.price, lineTotal, name: menu.name })
    }

    // Validate tenders sum
    const tenderSum = tenders.reduce((s: number, t: any) => s + t.amount, 0)
    if (Math.abs(tenderSum - total) > 0.01) {
      set.status = 400
      return { error: { code: 'PAY_002', message: `Tender sum ฿${tenderSum} ≠ total ฿${total}` } }
    }

    const splits: any[] = []

    for (const tender of tenders) {
      if (tender.method === 'card_wallet') {
        const card = await Card.findOne({ cardUid: tender.card_uid, status: 'active' }).lean()
        if (!card) {
          set.status = 400
          return { error: { code: 'CARD_001', message: 'Card not found' } }
        }

        const wallet = await Wallet.findOne({ userId: card.userId })
        if (!wallet) {
          set.status = 400
          return { error: { code: 'WALLET_001', message: 'Wallet not found' } }
        }
        if (wallet.balance - tender.amount < -wallet.negativeLimit) {
          set.status = 400
          return { error: { code: 'WALLET_001', message: 'Insufficient balance' } }
        }

        wallet.balance -= tender.amount
        wallet.version += 1
        await wallet.save()
        splits.push({ tenderMethod: 'card_wallet', sourceWalletId: wallet._id, amount: tender.amount })
      } else {
        splits.push({ tenderMethod: tender.method, amount: tender.amount })
      }
    }

    const refNo = genRefNo('TXN')
    const walletTender = tenders.find((t: any) => t.method === 'card_wallet')
    let walletId: any = null
    if (walletTender) {
      const card = await Card.findOne({ cardUid: walletTender.card_uid }).lean()
      if (card) {
        const w = await Wallet.findOne({ userId: card.userId }).lean()
        walletId = w?._id
      }
    }

    const txn = await Transaction.create({
      refNo,
      walletId: walletId ?? new mongoose.Types.ObjectId(),
      type: 'purchase',
      amount: -total,
      balanceAfter: 0,
      channel: 'pos',
      paymentMethod: tenders[0].method,
      cashierId: currentUser._id,
      status: 'success',
      splits,
      items: lineItems.map((li: any) => ({
        name:      li.name,
        qty:       li.qty,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
      })),
      metadata: { items: lineItems, shopId: shop_id },
    })

    return {
      transaction: txn,
      receipt_no: genRefNo('RCP'),
      total,
      items: lineItems,
    }
  }, {
    body: t.Object({
      shop_id: t.String(),
      items:   t.Array(t.Object({
        menu_item_id: t.String(),
        qty:          t.Number(),
      })),
      tenders: t.Array(t.Object({
        method:   t.String(),
        amount:   t.Number(),
        card_uid: t.Optional(t.String()),
      })),
    }),
  })

  // ── Buffet Check-In ────────────────────────────────────────────────────────
  .post('/buffet/check-in', async ({ body, set }) => {
    const { card_uid, buffet_round_id, pay_method } = body

    const card = await Card.findOne({ cardUid: card_uid, status: 'active' }).lean()
    if (!card) {
      set.status = 404
      return { error: { code: 'CARD_001', message: 'Card not found' } }
    }

    const user = await User.findById(card.userId).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'CARD_001', message: 'User not found' } }
    }

    const round = await BuffetRound.findById(buffet_round_id).lean()
    if (!round || !round.active) {
      set.status = 400
      return { error: { code: 'BUFFET_002', message: 'Buffet round not active' } }
    }

    const today = todayStr()

    // Check if already entered — voided sessions do NOT block re-entry
    const existing = await BuffetSession.findOne({
      userId: user._id,
      buffetRoundId: round._id,
      entryDate: today,
      voidedAt: null,
    }).lean()

    if (existing) {
      return {
        allow_entry: true,
        already_checked_in: true,
        price: existing.priceCharged,
        message: 'เข้าใช้แล้วในรอบนี้',
      }
    }

    // Resolve price
    const userType = mapUserType(user.role)
    let gradeLevelDoc: any = null
    if (userType === 'student' && user.studentProfile?.gradeLevel) {
      gradeLevelDoc = await GradeLevel.findOne({ code: user.studentProfile.gradeLevel }).lean()
    }

    const pricingQuery: any = {
      userType,
      $and: [
        { $or: [{ buffetRoundId: round._id }, { buffetRoundId: null }] },
        { effectiveFrom: { $lte: new Date(today) } },
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date(today) } }] },
      ],
    }
    if (userType === 'student') {
      pricingQuery.gradeLevelId = gradeLevelDoc?._id ?? null
    }

    const pricing = await BuffetPricing.findOne(pricingQuery)
      .sort({ buffetRoundId: -1 }) // prefer round-specific over null
      .lean()

    if (!pricing) {
      set.status = 400
      return { error: { code: 'BUFFET_003', message: 'No pricing configured for this group' } }
    }

    const price = pricing.price

    const wallet = await Wallet.findOne({ userId: user._id })
    if (!wallet) {
      set.status = 400
      return { error: { code: 'WALLET_001', message: 'Wallet not found' } }
    }

    if (wallet.balance - price < -wallet.negativeLimit) {
      set.status = 400
      return { error: { code: 'WALLET_001', message: 'Insufficient balance' } }
    }

    wallet.balance -= price
    wallet.version += 1
    await wallet.save()

    const refNo = genRefNo('TXN')
    const txn = await Transaction.create({
      refNo,
      walletId: wallet._id,
      type: 'buffet',
      amount: -price,
      balanceAfter: wallet.balance,
      channel: 'pos',
      paymentMethod: pay_method ?? 'card_wallet',
      status: 'success',
    })

    const buffetSessionDoc = await BuffetSession.create({
      userId: user._id,
      buffetRoundId: round._id,
      entryDate: today,
      priceCharged: price,
      payMethod: pay_method ?? 'card_wallet',
      transactionId: txn._id,
    })

    const { passwordHash: _, ...safeUser } = user as any
    return {
      allow_entry: true,
      already_checked_in: false,
      price,
      balance_after: wallet.balance,
      user: safeUser,
      round: round.name,
      session: buffetSessionDoc,
    }
  }, {
    body: t.Object({
      card_uid:        t.String(),
      buffet_round_id: t.String(),
      pay_method:      t.Optional(t.String()),
    }),
  })

  // ── Active Meal Period ─────────────────────────────────────────────────────
  .get('/active-period', async () => {
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const periods = await MealPeriod.find({ active: true }).lean()
    const active = periods.find(p => p.startTime <= hhmm && hhmm <= p.endTime)
    return { activePeriod: active ?? null, currentTime: hhmm }
  })

  // ── Preorder Redemption ────────────────────────────────────────────────────
  .get('/orders/by-card', async ({ query, set }) => {
    const card = await Card.findOne({ cardUid: query.card_uid, status: 'active' }).lean()
    if (!card) {
      set.status = 404
      return { error: { code: 'CARD_001', message: 'Card not found' } }
    }
    const today = todayStr()
    const orders = await Order.find({
      studentUserId: card.userId,
      serveDate: today,
      status: 'confirmed',
    }).lean()
    return { orders, studentUserId: card.userId }
  }, {
    query: t.Object({ card_uid: t.String() }),
  })

  .post('/orders/:id/redeem', async ({ params, currentUser, set }) => {
    const order = await Order.findById(params.id)
    if (!order) { set.status = 404; return { error: { code: 'ORDER_004', message: 'Order not found' } } }
    if (order.status !== 'confirmed') {
      set.status = 400
      return { error: { code: 'ORDER_004', message: `Order status is ${order.status}` } }
    }
    order.status = 'redeemed'
    order.redeemedAt = new Date()
    order.redeemedByCashierId = currentUser._id as any
    await order.save()
    return { success: true, order }
  })

  // ── Void Transaction ───────────────────────────────────────────────────────
  .post('/sale/:txnId/void', async ({ params, body, currentUser, set }) => {
    if (!['supervisor','admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'POS_003', message: 'Supervisor PIN required' } }
    }

    const txn = await Transaction.findById(params.txnId)
    if (!txn) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Transaction not found' } } }
    if (txn.status === 'voided') {
      set.status = 400
      return { error: { code: 'POS_003', message: 'Already voided' } }
    }

    // Refund wallet if card_wallet was used
    const walletSplit = txn.splits?.find((s: any) => s.tenderMethod === 'card_wallet')
    if (walletSplit?.sourceWalletId) {
      const wallet = await Wallet.findById(walletSplit.sourceWalletId)
      if (wallet) {
        wallet.balance += walletSplit.amount
        wallet.version += 1
        await wallet.save()
      }
    }

    // Create void transaction
    const refNo = genRefNo('VOID')
    await Transaction.create({
      refNo,
      walletId: txn.walletId,
      type: 'void',
      amount: -txn.amount,
      balanceAfter: 0,
      channel: 'pos',
      paymentMethod: txn.paymentMethod,
      cashierId: currentUser._id,
      voidedByTxnId: txn._id,
      status: 'success',
      note: body.reason,
    })

    txn.status = 'voided'
    await txn.save()

    await AuditLog.create({
      actorUserId: currentUser._id,
      actorRole: currentUser.role,
      action: 'void_txn',
      entityType: 'Transaction',
      entityId: String(txn._id),
      reason: body.reason,
      beforeData: { status: 'success' },
      afterData:  { status: 'voided' },
    })

    return { success: true, txnId: txn._id }
  }, {
    body: t.Object({ reason: t.String() }),
  })
