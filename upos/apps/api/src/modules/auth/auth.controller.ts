import { Elysia, t } from 'elysia'
import bcrypt from 'bcryptjs'
import { User, Wallet, AuditLog, EnrollmentCode, ParentStudent } from '../../models'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../middleware/auth'

export const authController = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set, request }) => {
    const { email, password } = body
    const user = await User.findOne({
      email: email.toLowerCase(),
      status: 'active',
    }).lean()

    if (!user || !user.passwordHash) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const payload = { userId: String(user._id), role: user.role, uid: user.uid }
    const accessToken = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    await AuditLog.create({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'login',
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
    })

    const { passwordHash: _, ...safeUser } = user
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      email:    t.String({ format: 'email' }),
      password: t.String({ minLength: 1 }),
    }),
  })

  .post('/refresh', async ({ body, set }) => {
    try {
      const payload = verifyRefreshToken(body.refreshToken)
      const user = await User.findById(payload.userId).lean()
      if (!user || user.status !== 'active') {
        set.status = 401
        return { error: { code: 'AUTH_002', message: 'Session expired' } }
      }
      const newPayload = { userId: String(user._id), role: user.role, uid: user.uid }
      return {
        accessToken: signAccessToken(newPayload as any),
        refreshToken: signRefreshToken(newPayload as any),
      }
    } catch {
      set.status = 401
      return { error: { code: 'AUTH_002', message: 'Invalid refresh token' } }
    }
  }, {
    body: t.Object({ refreshToken: t.String() }),
  })

  .post('/logout', () => ({ success: true }))

  .get('/me-info', async ({ headers, set }) => {
    // Quick endpoint for kiosk card-based lookup (by card UID)
    return { message: 'use /pos/card-read instead' }
  })

  .post('/verify-enrollment', async ({ body, set }) => {
    const enrollment = await EnrollmentCode.findOne({ code: body.code.toUpperCase().trim() })
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
    return {
      valid: true,
      student: {
        uid:        student.uid,
        firstName:  student.firstName,
        lastName:   student.lastName,
        gradeLevel: student.studentProfile?.gradeLevel ?? null,
        className:  student.studentProfile?.className  ?? null,
      },
    }
  }, {
    body: t.Object({ code: t.String({ minLength: 1 }) }),
  })

  .post('/parent-register', async ({ body, set }) => {
    const { enrollmentCode, firstName, lastName, password } = body

    const enrollment = await EnrollmentCode.findOne({ code: enrollmentCode.toUpperCase().trim() }).lean()
    if (!enrollment || enrollment.used || new Date() > enrollment.expiresAt) {
      set.status = 400
      return { error: { code: 'ENR_001', message: 'รหัสลงทะเบียนไม่ถูกต้องหรือหมดอายุ' } }
    }

    const existingLink = await ParentStudent.findOne({ studentUserId: enrollment.studentUserId }).lean()
    if (existingLink) {
      set.status = 400
      return { error: { code: 'ENR_004', message: 'นักเรียนคนนี้มีผู้ปกครองในระบบแล้ว' } }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const count = await User.countDocuments({ role: 'parent' })
    const uid   = `PRT-${String(count + 1).padStart(4, '0')}`

    const parent = await User.create({
      uid, role: 'parent', firstName, lastName, passwordHash,
      status: 'active', pdpaAcceptedAt: new Date(),
    })

    await Wallet.create({ userId: parent._id, balance: 0 })

    await ParentStudent.create({
      parentUserId:  parent._id,
      studentUserId: enrollment.studentUserId,
      isPrimary:     true,
      relationship:  'parent',
    })

    await EnrollmentCode.updateOne(
      { _id: enrollment._id },
      { used: true, usedAt: new Date(), usedByParentId: parent._id },
    )

    const payload = { userId: String(parent._id), role: parent.role, uid: parent.uid }
    const accessToken  = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    const { passwordHash: _ph, ...safeUser } = parent.toObject()
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      enrollmentCode: t.String({ minLength: 1 }),
      firstName:      t.String({ minLength: 1 }),
      lastName:       t.String({ minLength: 1 }),
      password:       t.String({ minLength: 8 }),
    }),
  })

  .post('/parent-login', async ({ body, set, request }) => {
    const { studentCode, password } = body

    const student = await User.findOne({
      uid: studentCode.toUpperCase().trim(),
      role: 'student',
      status: 'active',
    }).lean()

    if (!student) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'ไม่พบรหัสนักเรียนในระบบ' } }
    }

    const link = await ParentStudent.findOne({ studentUserId: student._id }).lean()
    if (!link) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'ยังไม่มีผู้ปกครองลงทะเบียนสำหรับนักเรียนคนนี้' } }
    }

    const parent = await User.findById(link.parentUserId).lean()
    if (!parent || parent.status !== 'active' || !parent.passwordHash) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'บัญชีผู้ปกครองไม่พร้อมใช้งาน' } }
    }

    const valid = await bcrypt.compare(password, parent.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const payload = { userId: String(parent._id), role: parent.role, uid: parent.uid }
    const accessToken  = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    await AuditLog.create({
      actorUserId: parent._id,
      actorRole:   parent.role,
      action:      'login',
      ip:          request.headers.get('x-forwarded-for') ?? 'unknown',
    })

    const { passwordHash: _ph, ...safeUser } = parent
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      studentCode: t.String({ minLength: 1 }),
      password:    t.String({ minLength: 1 }),
    }),
  })

  .post('/parent-login-v2', async ({ body, set, request }) => {
    const { contact, password } = body
    const normalized = contact.toLowerCase().trim()

    const user = await User.findOne({
      $or: [{ email: normalized }, { phone: normalized }],
      role: { $in: ['parent', 'admin', 'supervisor', 'cashier', 'teacher'] },
      status: 'active',
    }).lean()

    if (!user || !user.passwordHash) {
      set.status = 401
      return { error: { code: 'NOT_FOUND', message: 'ไม่พบบัญชีหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'ไม่พบบัญชีหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    const payload = { userId: String(user._id), role: user.role, uid: user.uid }
    const accessToken  = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    await AuditLog.create({
      actorUserId: user._id,
      actorRole:   user.role,
      action:      'login',
      ip:          request.headers.get('x-forwarded-for') ?? 'unknown',
    })

    const { passwordHash: _ph, ...safeUser } = user
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      contact:  t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
    }),
  })
