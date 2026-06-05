import { Elysia, t } from 'elysia'
import { authPlugin } from '../../middleware/auth'
import { User, Wallet, ParentStudent, Card } from '../../models'

export const usersController = new Elysia({ prefix: '/users' })
  .use(authPlugin())
  .get('/me', async ({ currentUser }) => {
    const wallet = await Wallet.findOne({ userId: currentUser._id }).lean()
    const { passwordHash: _, ...safeUser } = currentUser as any
    return { user: safeUser, wallet }
  })

  .get('/me/children', async ({ currentUser, set }) => {
    if (currentUser.role !== 'parent') {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Parents only' } }
    }
    const links = await ParentStudent.find({ parentUserId: currentUser._id }).lean()
    const studentIds = links.map(l => l.studentUserId)
    const students = await User.find({ _id: { $in: studentIds } }).lean()
    const wallets = await Wallet.find({ userId: { $in: studentIds } }).lean()

    return students.map(s => {
      const wallet = wallets.find(w => String(w.userId) === String(s._id))
      const { passwordHash: _, ...safe } = s as any
      return { ...safe, wallet }
    })
  })

  .get('/', async ({ query, currentUser, set }) => {
    if (!['admin','supervisor'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }
    const filter: any = {}
    if (query.role) filter.role = query.role
    if (query.status) filter.status = query.status
    if (query.q) {
      filter.$or = [
        { firstName: { $regex: query.q, $options: 'i' } },
        { lastName:  { $regex: query.q, $options: 'i' } },
        { email:     { $regex: query.q, $options: 'i' } },
        { uid:       { $regex: query.q, $options: 'i' } },
      ]
    }
    const users = await User.find(filter).select('-passwordHash').lean()
    const ids = users.map(u => u._id)
    const [wallets, cards] = await Promise.all([
      Wallet.find({ userId: { $in: ids } }).lean(),
      Card.find({ userId: { $in: ids } }).lean(),
    ])
    const enriched = users.map(u => {
      const w = wallets.find(x => String(x.userId) === String(u._id))
      const c = cards.find(x => String(x.userId) === String(u._id))
      return {
        ...u,
        balance:    w?.balance ?? 0,
        cardUid:    c?.cardUid ?? null,
        cardStatus: c?.status  ?? null,
      }
    })
    return { users: enriched, total: enriched.length }
  }, {
    query: t.Object({
      role:   t.Optional(t.String()),
      status: t.Optional(t.String()),
      q:      t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params, currentUser, set }) => {
    if (!['admin','supervisor','cashier'].includes(currentUser.role) &&
        String(currentUser._id) !== params.id) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Forbidden' } }
    }
    const user = await User.findById(params.id).select('-passwordHash').lean()
    if (!user) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'User not found' } } }
    const wallet = await Wallet.findOne({ userId: params.id }).lean()
    return { user, wallet }
  })

  .patch('/:id/status', async ({ params, body, currentUser, set }) => {
    if (!['admin'].includes(currentUser.role)) {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Admin only' } }
    }
    await User.findByIdAndUpdate(params.id, { status: body.status })
    return { success: true }
  }, {
    body: t.Object({ status: t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('suspended')]) }),
  })

  .get('/:id/cards', async ({ params }) => {
    const cards = await Card.find({ userId: params.id }).lean()
    return { cards }
  })

  .post('/me/add-student', async ({ body, currentUser, set }) => {
    if (currentUser.role !== 'parent') {
      set.status = 403
      return { error: { code: 'AUTH_008', message: 'Parents only' } }
    }

    const code = (body.enrollmentCode ?? '').toUpperCase().trim()
    if (!code) {
      set.status = 400
      return { error: { code: 'ENR_001', message: 'กรุณากรอกรหัสลงทะเบียน' } }
    }

    const enrollment = await EnrollmentCode.findOne({ code })
      .populate<{ studentUserId: any }>('studentUserId')
      .lean()

    if (!enrollment) {
      set.status = 404
      return { error: { code: 'ENR_001', message: 'ไม่พบรหัสลงทะเบียน' } }
    }
    if (enrollment.used) {
      set.status = 400
      return { error: { code: 'ENR_002', message: 'รหัสนี้ถูกใช้งานแล้ว' } }
    }
    if (new Date() > enrollment.expiresAt) {
      set.status = 400
      return { error: { code: 'ENR_003', message: 'รหัสหมดอายุแล้ว' } }
    }

    const student = enrollment.studentUserId
    if (!student) {
      set.status = 404
      return { error: { code: 'ENR_001', message: 'ไม่พบข้อมูลนักเรียน' } }
    }

    // Avoid duplicate parent-student links
    const existingLink = await ParentStudent.findOne({
      parentUserId:  currentUser._id,
      studentUserId: student._id,
    }).lean()
    if (existingLink) {
      set.status = 400
      return { error: { code: 'ENR_005', message: 'นักเรียนคนนี้เชื่อมกับบัญชีของคุณแล้ว' } }
    }

    await ParentStudent.create({
      parentUserId:  currentUser._id,
      studentUserId: student._id,
      isPrimary:     false,
      relationship:  'parent',
    })

    // Ensure student wallet exists
    const existingWallet = await Wallet.findOne({ userId: student._id }).lean()
    if (!existingWallet) {
      await Wallet.create({ userId: student._id, balance: 0 })
    }

    await EnrollmentCode.updateOne(
      { _id: enrollment._id },
      { used: true, usedAt: new Date(), usedByParentId: currentUser._id },
    )

    return {
      success: true,
      student: {
        uid:        student.uid,
        firstName:  student.firstName,
        lastName:   student.lastName,
        gradeLevel: student.studentProfile?.gradeLevel ?? null,
        className:  student.studentProfile?.className  ?? null,
      },
    }
  }, {
    body: t.Object({ enrollmentCode: t.String({ minLength: 1 }) }),
  })
