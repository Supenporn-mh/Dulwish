import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { User, Transaction, Wallet, Order, BuffetSession, AuditLog, Policy, EnrollmentCode, Card, ParentStudent } from '../../models'

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

  // 7. Promote students
  .post('/promote', async ({ body, set }) => {
    const { fromYear, toYear, studentUids } = (body as any) ?? {}

    let query: any = { role: 'student' }
    if (studentUids?.length) query = { role: 'student', uid: { $in: studentUids } }

    const students = await User.find(query).lean()

    const promoted: string[]  = []
    const graduated: string[] = []

    await Promise.all(students.map(async s => {
      const grade = s.studentProfile?.gradeLevel ?? ''
      const idx   = GRADES_ORDER.indexOf(grade)
      if (idx < 0) return

      if (idx === GRADES_ORDER.length - 1) {
        await User.updateOne({ _id: s._id }, {
          $set: { status: 'inactive', 'studentProfile.gradeLevel': 'GRADUATED' },
        })
        graduated.push(s.uid)
      } else {
        const nextGrade = GRADES_ORDER[idx + 1]
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
