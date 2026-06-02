import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { User, Transaction, Wallet, Order, BuffetSession, AuditLog, Policy } from '../../models'

export const adminController = new Elysia({ prefix: '/admin' })
  .use(authPlugin(['admin','supervisor']))

  // ── Dashboard ──────────────────────────────────────────────────────────────
  .get('/dashboard', async () => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

    const [todayRevenue, todayTopups, todayBuffet, lowBalance] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'purchase', status: 'success', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'topup', status: 'success', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      BuffetSession.countDocuments({ entryDate: today.toISOString().split('T')[0] }),
      Wallet.countDocuments({ $expr: { $lt: ['$balance', '$lowThreshold'] } }),
    ])

    return {
      todayRevenue:  todayRevenue[0]?.total ?? 0,
      todayTopups:   todayTopups[0]?.total ?? 0,
      topupCount:    todayTopups[0]?.count ?? 0,
      buffetEntries: todayBuffet,
      lowBalanceCount: lowBalance,
    }
  })

  // ── Reports ────────────────────────────────────────────────────────────────
  .get('/reports/sales', async ({ query }) => {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000)
    const to   = query.to   ? new Date(query.to)   : new Date()
    const txns = await Transaction.find({
      type: { $in: ['purchase','buffet'] },
      status: 'success',
      createdAt: { $gte: from, $lte: to },
    }).sort({ createdAt: 1 }).lean()
    return { transactions: txns, from, to }
  }, {
    query: t.Object({
      from: t.Optional(t.String()),
      to:   t.Optional(t.String()),
    }),
  })

  .get('/reports/topup', async ({ query }) => {
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 86400000)
    const to   = query.to   ? new Date(query.to)   : new Date()
    const txns = await Transaction.find({
      type: 'topup',
      status: 'success',
      createdAt: { $gte: from, $lte: to },
    }).sort({ createdAt: -1 }).lean()
    const total = txns.reduce((s, t) => s + t.amount, 0)
    return { transactions: txns, total, from, to }
  }, {
    query: t.Object({
      from: t.Optional(t.String()),
      to:   t.Optional(t.String()),
    }),
  })

  .get('/reports/buffet', async ({ query }) => {
    const from = query.from ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const to   = query.to   ?? new Date().toISOString().split('T')[0]
    const sessions = await BuffetSession.find({
      entryDate: { $gte: from, $lte: to },
    }).populate('userId', 'firstName lastName uid role studentProfile')
      .populate('mealPeriodId', 'name code')
      .sort({ enteredAt: -1 })
      .lean()
    return { sessions, from, to }
  }, {
    query: t.Object({
      from: t.Optional(t.String()),
      to:   t.Optional(t.String()),
    }),
  })

  // ── All Transactions ───────────────────────────────────────────────────────
  .get('/transactions', async ({ query }) => {
    const filter: any = {}
    if (query.type)   filter.type   = query.type
    if (query.status) filter.status = query.status
    if (query.from || query.to) {
      filter.createdAt = {}
      if (query.from) filter.createdAt.$gte = new Date(query.from)
      if (query.to)   filter.createdAt.$lte = new Date(query.to)
    }
    const txns = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(query.limit ?? 100))
      .lean()
    return { transactions: txns, total: txns.length }
  }, {
    query: t.Object({
      type:   t.Optional(t.String()),
      status: t.Optional(t.String()),
      from:   t.Optional(t.String()),
      to:     t.Optional(t.String()),
      limit:  t.Optional(t.String()),
    }),
  })

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  .get('/audit', async ({ query }) => {
    const filter: any = {}
    if (query.action) filter.action = query.action
    if (query.actor)  filter.actorUserId = query.actor
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(query.limit ?? 100))
      .lean()
    return { logs }
  }, {
    query: t.Object({
      action: t.Optional(t.String()),
      actor:  t.Optional(t.String()),
      limit:  t.Optional(t.String()),
    }),
  })

  // ── Policies ───────────────────────────────────────────────────────────────
  .get('/policies', async () => {
    const policies = await Policy.find().lean()
    return { policies }
  })

  .patch('/policies/:key', async ({ params, body, currentUser }) => {
    const before = await Policy.findOne({ key: params.key }).lean()
    const policy = await Policy.findOneAndUpdate(
      { key: params.key },
      { value: body.value, updatedBy: currentUser._id },
      { new: true, upsert: true },
    )
    await AuditLog.create({
      actorUserId: currentUser._id,
      actorRole: currentUser.role,
      action: 'policy_change',
      entityType: 'Policy',
      entityId: params.key,
      beforeData: before?.value,
      afterData: body.value,
      reason: body.reason,
    })
    return { policy }
  }, {
    body: t.Object({
      value:  t.Any(),
      reason: t.Optional(t.String()),
    }),
  })

  // ── Users Management ───────────────────────────────────────────────────────
  .get('/students/low-balance', async () => {
    const wallets = await Wallet.find({
      $expr: { $lt: ['$balance', '$lowThreshold'] },
    }).populate('userId', 'firstName lastName uid studentProfile').lean()
    return { wallets }
  })
