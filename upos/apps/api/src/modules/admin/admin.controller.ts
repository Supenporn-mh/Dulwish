import { Elysia, t } from 'elysia'
import bcrypt from 'bcryptjs'
import { authPlugin } from '../../middleware/auth'
import { User, Transaction, Wallet, Order, BuffetSession, AuditLog, Policy, EnrollmentCode, Card, ParentStudent, TaxInvoice, GradeLevel } from '../../models'

function genRefNo(prefix = 'TXN') {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, '0')
  return `${prefix}${date}-${rand}`
}

// ── Grade order (K1→K2→K3→P1…P6→S1…S6) ──────────────────────────────────────
const GRADES_ORDER = ['K1','K2','K3','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6']

function generateEnrollmentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'ENR-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function codeExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d
}

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
      .populate('buffetRoundId', 'name startTime endTime')
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
    if (query.type)          filter.type          = query.type
    if (query.status)        filter.status        = query.status
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod
    if (query.date) {
      const d = new Date(query.date)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      filter.createdAt = { $gte: d, $lt: next }
    } else if (query.from || query.to) {
      filter.createdAt = {}
      if (query.from) filter.createdAt.$gte = new Date(query.from)
      if (query.to)   filter.createdAt.$lte = new Date(query.to)
    }
    const txns = await Transaction.find(filter)
      .populate('relatedOrderId', 'status orderNo')
      .sort({ createdAt: -1 })
      .limit(Number(query.limit ?? 200))
      .lean()
    return { transactions: txns, total: txns.length }
  }, {
    query: t.Object({
      type:          t.Optional(t.String()),
      status:        t.Optional(t.String()),
      paymentMethod: t.Optional(t.String()),
      date:          t.Optional(t.String()),
      from:          t.Optional(t.String()),
      to:            t.Optional(t.String()),
      limit:         t.Optional(t.String()),
    }),
  })

  // ── Transaction Detail ─────────────────────────────────────────────────────
  .get('/transactions/:id', async ({ params }) => {
    const tx = await Transaction.findById(params.id)
      .populate({
        path: 'walletId',
        populate: { path: 'userId', select: 'firstName lastName uid role studentProfile' },
      })
      .populate({
        path: 'relatedOrderId',
        populate: [
          { path: 'items.menuItemId', select: 'name sku' },
          { path: 'shopId', select: 'name code' },
        ],
      })
      .populate('cashierId', 'firstName lastName uid')
      .lean()
    if (!tx) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    return { transaction: tx }
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ── Tax Invoice ────────────────────────────────────────────────────────────
  .get('/transactions/:id/tax-invoice', async ({ params }) => {
    const inv = await TaxInvoice.findOne({ transactionId: params.id }).lean()
    return { invoice: inv ?? null }
  }, { params: t.Object({ id: t.String() }) })

  .post('/transactions/:id/tax-invoice', async ({ params, body, currentUser }) => {
    const inv = await TaxInvoice.findOneAndUpdate(
      { transactionId: params.id },
      { ...body, transactionId: params.id, createdBy: currentUser._id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
    return { invoice: inv }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      invoiceNo:  t.String(),
      issuedAt:   t.String(),
      seller:     t.Optional(t.Any()),
      buyer:      t.Optional(t.Any()),
      subtotal:   t.Optional(t.Number()),
      vatAmount:  t.Optional(t.Number()),
      grandTotal: t.Optional(t.Number()),
      note:       t.Optional(t.String()),
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

  // ── Student Management ─────────────────────────────────────────────────────

  // 1. List all students enriched
  .get('/students', async () => {
    const students = await User.find({ role: 'student' }).lean()
    const studentIds = students.map(s => s._id)

    const [wallets, cards, parentCounts] = await Promise.all([
      Wallet.find({ userId: { $in: studentIds } }).lean(),
      Card.find({ userId: { $in: studentIds } }).lean(),
      ParentStudent.aggregate([
        { $match: { studentUserId: { $in: studentIds } } },
        { $group: { _id: '$studentUserId', count: { $sum: 1 } } },
      ]),
    ])

    const walletMap   = new Map(wallets.map(w => [String(w.userId), w]))
    const cardMap     = new Map(cards.map(c => [String(c.userId), c]))
    const parentMap   = new Map(parentCounts.map((p: any) => [String(p._id), p.count]))

    const rows = students.map(s => {
      const id      = String(s._id)
      const wallet  = walletMap.get(id)
      const card    = cardMap.get(id)
      return {
        _id:           id,
        uid:           s.uid,
        firstName:     s.firstName,
        lastName:      s.lastName,
        gradeLevel:    s.studentProfile?.gradeLevel ?? '',
        className:     s.studentProfile?.className  ?? '',
        guardianEmail: s.studentProfile?.guardianEmail ?? '',
        cardUid:       card?.cardUid    ?? null,
        cardStatus:    card?.status     ?? null,
        balance:       wallet?.balance       ?? 0,
        lowThreshold:  wallet?.lowThreshold  ?? 200,
        parentCount:   parentMap.get(id) ?? 0,
        status:        s.status,
      }
    })
    return { students: rows }
  })

  // 2. Create a student
  .post('/students', async ({ body, set }) => {
    const uid = (body as any).uid ?? `STD-${(body as any).gradeLevel}-${Math.random().toString(36).slice(2,8).toUpperCase()}`
    try {
      const student = await User.create({
        uid,
        role:     'student',
        firstName: (body as any).firstName,
        lastName:  (body as any).lastName,
        status:    'active',
        studentProfile: {
          gradeLevel:    (body as any).gradeLevel   ?? '',
          className:     (body as any).className    ?? '',
          guardianEmail: (body as any).guardianEmail ?? '',
        },
      })
      await Wallet.create({ userId: student._id, balance: 0 })
      return { student }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'STD_CREATE_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      firstName:     t.String(),
      lastName:      t.String(),
      gradeLevel:    t.Optional(t.String()),
      className:     t.Optional(t.String()),
      guardianEmail: t.Optional(t.String()),
      uid:           t.Optional(t.String()),
    }),
  })

  // 3. Update a student by uid
  .patch('/students/:uid', async ({ params, body, set }) => {
    const update: Record<string, any> = {}
    const b = body as any
    if (b.firstName     !== undefined) update.firstName                        = b.firstName
    if (b.lastName      !== undefined) update.lastName                         = b.lastName
    if (b.status        !== undefined) update.status                           = b.status
    if (b.gradeLevel    !== undefined) update['studentProfile.gradeLevel']     = b.gradeLevel
    if (b.className     !== undefined) update['studentProfile.className']      = b.className
    if (b.guardianEmail !== undefined) update['studentProfile.guardianEmail']  = b.guardianEmail

    const student = await User.findOneAndUpdate(
      { uid: params.uid, role: 'student' },
      { $set: update },
      { new: true },
    ).lean()
    if (!student) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบนักเรียน' } } }
    return { student }
  }, {
    body: t.Object({
      firstName:     t.Optional(t.String()),
      lastName:      t.Optional(t.String()),
      gradeLevel:    t.Optional(t.String()),
      className:     t.Optional(t.String()),
      guardianEmail: t.Optional(t.String()),
      status:        t.Optional(t.String()),
    }),
  })

  // 4. All students with active enrollment codes (auto-generate if missing/used/expired)
  .get('/students/codes', async () => {
    const students = await User.find({ role: 'student' }).lean()
    const now = new Date()

    const rows = await Promise.all(students.map(async s => {
      let entry = await EnrollmentCode.findOne({
        studentUserId: s._id,
        used: false,
        expiresAt: { $gt: now },
      }).lean()

      if (!entry) {
        // ensure uniqueness on collision
        let code = generateEnrollmentCode()
        let attempts = 0
        while (attempts < 5) {
          const exists = await EnrollmentCode.findOne({ code }).lean()
          if (!exists) break
          code = generateEnrollmentCode()
          attempts++
        }
        entry = await EnrollmentCode.create({
          code,
          studentUserId: s._id,
          used:      false,
          expiresAt: codeExpiresAt(),
        })
      }

      return {
        uid:             s.uid,
        firstName:       s.firstName,
        lastName:        s.lastName,
        gradeLevel:      s.studentProfile?.gradeLevel ?? '',
        className:       s.studentProfile?.className  ?? '',
        guardianContact: s.studentProfile?.guardianEmail ?? '',
        code:            entry.code,
        expiresAt:       entry.expiresAt,
      }
    }))

    rows.sort((a, b) => {
      const gi = GRADES_ORDER.indexOf(a.gradeLevel) - GRADES_ORDER.indexOf(b.gradeLevel)
      return gi !== 0 ? gi : a.uid.localeCompare(b.uid)
    })
    return { students: rows }
  })

  // 5. Get enrollment code for a single student
  .get('/students/:uid/code', async ({ params, set }) => {
    const s = await User.findOne({ uid: params.uid, role: 'student' }).lean()
    if (!s) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบนักเรียน' } } }

    const entry = await EnrollmentCode.findOne({ studentUserId: s._id })
      .sort({ createdAt: -1 })
      .lean()

    return {
      studentUid: s.uid,
      firstName:  s.firstName,
      lastName:   s.lastName,
      gradeLevel: s.studentProfile?.gradeLevel ?? '',
      code:       entry?.code      ?? null,
      expiresAt:  entry?.expiresAt ?? null,
      used:       entry?.used      ?? false,
      expired:    entry ? entry.expiresAt < new Date() : false,
    }
  })

  // 6. Generate a new enrollment code (invalidate old)
  .post('/students/:uid/code/generate', async ({ params, currentUser, set }) => {
    const s = await User.findOne({ uid: params.uid, role: 'student' }).lean()
    if (!s) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบนักเรียน' } } }

    // invalidate existing active codes
    await EnrollmentCode.updateMany(
      { studentUserId: s._id, used: false },
      { $set: { used: true, usedAt: new Date() } },
    )

    let code = generateEnrollmentCode()
    let attempts = 0
    while (attempts < 5) {
      const exists = await EnrollmentCode.findOne({ code }).lean()
      if (!exists) break
      code = generateEnrollmentCode()
      attempts++
    }
    const exp   = codeExpiresAt()
    const entry = await EnrollmentCode.create({
      code,
      studentUserId: s._id,
      used:      false,
      expiresAt: exp,
      createdBy: currentUser._id,
    })

    return {
      studentUid: s.uid,
      firstName:  s.firstName,
      lastName:   s.lastName,
      gradeLevel: s.studentProfile?.gradeLevel ?? '',
      code:       entry.code,
      expiresAt:  entry.expiresAt,
      used:       false,
      expired:    false,
    }
  })

  // ── Member enrollment codes ───────────────────────────────────────────────

  .get('/members/:uid/code', async ({ params, set }) => {
    const MEMBER_ROLES = ['admin', 'supervisor', 'cashier', 'teacher', 'staff']
    const m = await User.findOne({ uid: params.uid, role: { $in: MEMBER_ROLES } }).lean()
    if (!m) { set.status = 404; return { error: { code: 'MEM_404', message: 'ไม่พบสมาชิก' } } }

    const entry = await EnrollmentCode.findOne({ memberUserId: m._id })
      .sort({ createdAt: -1 })
      .lean()

    return {
      memberUid:  m.uid,
      firstName:  m.firstName,
      lastName:   m.lastName,
      role:       m.role,
      code:       entry?.code      ?? null,
      expiresAt:  entry?.expiresAt ?? null,
      used:       entry?.used      ?? false,
      expired:    entry ? entry.expiresAt < new Date() : false,
    }
  })

  .post('/members/:uid/code/generate', async ({ params, currentUser, set }) => {
    const MEMBER_ROLES = ['admin', 'supervisor', 'cashier', 'teacher', 'staff']
    const m = await User.findOne({ uid: params.uid, role: { $in: MEMBER_ROLES } }).lean()
    if (!m) { set.status = 404; return { error: { code: 'MEM_404', message: 'ไม่พบสมาชิก' } } }

    await EnrollmentCode.updateMany(
      { memberUserId: m._id, used: false },
      { $set: { used: true, usedAt: new Date() } },
    )

    let code = generateEnrollmentCode()
    let attempts = 0
    while (attempts < 5) {
      const exists = await EnrollmentCode.findOne({ code }).lean()
      if (!exists) break
      code = generateEnrollmentCode()
      attempts++
    }
    const exp   = codeExpiresAt()
    const entry = await EnrollmentCode.create({
      code,
      memberUserId: m._id,
      used:      false,
      expiresAt: exp,
      createdBy: currentUser._id,
    })

    return {
      memberUid:  m.uid,
      firstName:  m.firstName,
      lastName:   m.lastName,
      role:       m.role,
      code:       entry.code,
      expiresAt:  entry.expiresAt,
      used:       false,
      expired:    false,
    }
  })

  // 7. Promote students
  .post('/promote', async ({ body, set }) => {
    const { fromYear, toYear, studentUids } = (body as any) ?? {}

    // Build the grade order from the DB (student grades only), ascending by sortOrder.
    const gradeDocs = await GradeLevel.find({ gradeGroup: { $in: ['primary', 'secondary'] } })
      .sort({ sortOrder: 1 })
      .lean()
    const gradeOrder = gradeDocs.map(g => g.code)

    let query: any = { role: 'student' }
    if (studentUids?.length) query = { role: 'student', uid: { $in: studentUids } }

    const students = await User.find(query).lean()

    const promoted: string[]  = []
    const graduated: string[] = []

    await Promise.all(students.map(async s => {
      const grade = s.studentProfile?.gradeLevel ?? ''
      const idx   = gradeOrder.indexOf(grade)
      if (idx < 0) return

      if (idx === gradeOrder.length - 1) {
        await User.updateOne({ _id: s._id }, {
          $set: { status: 'inactive', 'studentProfile.gradeLevel': 'GRADUATED' },
        })
        graduated.push(s.uid)
      } else {
        const nextGrade = gradeOrder[idx + 1]
        await User.updateOne({ _id: s._id }, {
          $set: { 'studentProfile.gradeLevel': nextGrade },
        })
        promoted.push(s.uid)
      }
    }))

    return {
      success:   true,
      fromYear:  fromYear ?? '',
      toYear:    toYear   ?? '',
      promoted:  promoted.length,
      graduated: graduated.length,
      message:   `เลื่อนชั้นสำเร็จ ${promoted.length} คน, จบการศึกษา ${graduated.length} คน`,
    }
  }, {
    body: t.Object({
      fromYear:    t.Optional(t.String()),
      toYear:      t.Optional(t.String()),
      studentUids: t.Optional(t.Array(t.String())),
    }),
  })

  // ── AD4: Void a transaction (admin/supervisor) ───────────────────────────────
  // Mirrors POST /pos/sale/:txnId/void: refund the wallet split, create a void
  // transaction, link voidedByTxnId, write AuditLog.
  .post('/transactions/:id/void', async ({ params, body, currentUser, set }) => {
    // supervisorCode: the POS void validates only by role (no PIN/password compare),
    // and the route guard already restricts this to admin/supervisor — mirror that.
    if (!['supervisor','admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'POS_003', message: 'Supervisor PIN required' } }
    }

    const txn = await Transaction.findById(params.id)
    if (!txn) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Transaction not found' } } }
    if (txn.status === 'voided') {
      set.status = 409
      return { error: { code: 'POS_003', message: 'Already voided' } }
    }

    // Refund the wallet that was debited. Prefer the card_wallet split (used by
    // multi-tender POS sales); fall back to the transaction's own wallet for
    // single-wallet debits (preorders, buffet, seeded/legacy txns with no splits).
    const walletSplit = txn.splits?.find((s: any) => s.tenderMethod === 'card_wallet')
    let refundWalletId: any = walletSplit?.sourceWalletId
    let refundAmount: number = walletSplit?.amount ?? 0
    if (!refundWalletId && txn.walletId && txn.amount < 0) {
      refundWalletId = txn.walletId
      refundAmount = -txn.amount   // amount is negative for debits
    }
    let balanceAfter = 0
    if (refundWalletId && refundAmount) {
      const wallet = await Wallet.findById(refundWalletId)
      if (wallet) {
        wallet.balance += refundAmount
        wallet.version += 1
        await wallet.save()
        balanceAfter = wallet.balance
      }
    }

    // Create void transaction
    const refNo = genRefNo('VOID')
    await Transaction.create({
      refNo,
      walletId: txn.walletId,
      type: 'void',
      amount: -txn.amount,
      balanceAfter,
      channel: 'admin',
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
    params: t.Object({ id: t.String() }),
    body: t.Object({
      reason:         t.String(),
      supervisorCode: t.Optional(t.String()),
    }),
  })

  // ── AD4: Confirm a pending payment (admin/supervisor) ────────────────────────
  // Only pending/wait → success is allowed. If the linked order is awaiting
  // payment, move it to confirmed.
  .patch('/transactions/:id/payment-status', async ({ params, body, currentUser, set }) => {
    const txn = await Transaction.findById(params.id)
    if (!txn) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'Transaction not found' } } }

    if (body.status !== 'success') {
      set.status = 400
      return { error: { code: 'TXN_STATUS_001', message: `เปลี่ยนสถานะเป็น ${body.status} ไม่ได้` } }
    }
    if (!['pending', 'wait'].includes(txn.status)) {
      set.status = 400
      return { error: { code: 'TXN_STATUS_002', message: `ยืนยันได้เฉพาะรายการที่รอชำระ (สถานะปัจจุบัน: ${txn.status})` } }
    }

    const before = txn.status
    txn.status = 'success'
    await txn.save()

    // Advance the related order if it is awaiting payment
    if (txn.relatedOrderId) {
      const order = await Order.findById(txn.relatedOrderId)
      if (order && ['select_payment', 'wait_payment', 'pending_payment'].includes(order.status)) {
        order.status = 'confirmed'
        await order.save()
      }
    }

    await AuditLog.create({
      actorUserId: currentUser._id,
      actorRole: currentUser.role,
      action: 'payment_status_change',
      entityType: 'Transaction',
      entityId: String(txn._id),
      beforeData: { status: before },
      afterData:  { status: 'success' },
    })

    return { success: true, transaction: txn }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ status: t.String() }),
  })

  // ── AD1: Create a staff member (admin/supervisor) ────────────────────────────
  .post('/staff', async ({ body, currentUser, set }) => {
    const STAFF_ROLES = ['cashier', 'supervisor', 'admin', 'teacher', 'staff']
    if (!STAFF_ROLES.includes(body.role)) {
      set.status = 400
      return { error: { code: 'STAFF_ROLE_001', message: `บทบาทไม่ถูกต้อง: ${body.role}` } }
    }

    try {
      const count = await User.countDocuments({ role: { $in: STAFF_ROLES } })
      const uid   = `STF-${String(count + 1).padStart(4, '0')}`

      const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : undefined

      const user = await User.create({
        uid,
        role:      body.role,
        firstName: body.firstName,
        lastName:  body.lastName,
        email:     body.email?.trim().toLowerCase(),
        status:    'active',
        ...(passwordHash ? { passwordHash } : {}),
      })

      // Mirror parent-register: every account gets a wallet.
      await Wallet.create({ userId: user._id, balance: 0 })

      if (body.cardUid) {
        await Card.create({
          cardUid:  body.cardUid,
          userId:   user._id,
          cardType: 'staff',
          status:   'active',
        })
      }

      await AuditLog.create({
        actorUserId: currentUser._id,
        actorRole: currentUser.role,
        action: 'staff_create',
        entityType: 'User',
        entityId: String(user._id),
        afterData: { uid: user.uid, role: user.role },
      })

      const { passwordHash: _ph, ...safeUser } = user.toObject()
      return { user: safeUser }
    } catch (err: unknown) {
      set.status = 400
      return { error: { code: 'STAFF_CREATE_001', message: err instanceof Error ? err.message : 'Create failed' } }
    }
  }, {
    body: t.Object({
      firstName:  t.String(),
      lastName:   t.String(),
      email:      t.Optional(t.String()),
      role:       t.String(),
      branchCode: t.Optional(t.String()),
      cardUid:    t.Optional(t.String()),
      password:   t.Optional(t.String()),
    }),
  })

  // ── AD2: Update a staff member by uid (admin/supervisor) ─────────────────────
  .patch('/staff/:uid', async ({ params, body, currentUser, set }) => {
    const STAFF_ROLES = ['cashier', 'supervisor', 'admin', 'teacher', 'staff']
    const user = await User.findOne({ uid: params.uid, role: { $in: STAFF_ROLES } })
    if (!user) { set.status = 404; return { error: { code: 'STAFF_404', message: 'ไม่พบสมาชิก' } } }

    const before = { firstName: user.firstName, lastName: user.lastName, email: user.email, status: user.status }

    if (body.firstName !== undefined) user.firstName = body.firstName
    if (body.lastName  !== undefined) user.lastName  = body.lastName
    if (body.email     !== undefined) user.email     = body.email?.trim().toLowerCase()
    if (body.status    !== undefined) user.status    = body.status as any
    await user.save()

    if (body.cardUid !== undefined && body.cardUid) {
      const existing = await Card.findOne({ userId: user._id })
      if (existing) {
        existing.cardUid = body.cardUid
        await existing.save()
      } else {
        await Card.create({ cardUid: body.cardUid, userId: user._id, cardType: 'staff', status: 'active' })
      }
    }

    await AuditLog.create({
      actorUserId: currentUser._id,
      actorRole: currentUser.role,
      action: 'staff_update',
      entityType: 'User',
      entityId: String(user._id),
      beforeData: before,
      afterData: { firstName: user.firstName, lastName: user.lastName, email: user.email, status: user.status },
    })

    const { passwordHash: _ph, ...safeUser } = user.toObject()
    return { user: safeUser }
  }, {
    params: t.Object({ uid: t.String() }),
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName:  t.Optional(t.String()),
      email:     t.Optional(t.String()),
      status:    t.Optional(t.String()),
      cardUid:   t.Optional(t.String()),
    }),
  })
