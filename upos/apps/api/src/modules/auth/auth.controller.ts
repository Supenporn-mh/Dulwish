import { Elysia, t } from 'elysia'
import bcrypt from 'bcryptjs'
import { User, Wallet, AuditLog, EnrollmentCode, ParentStudent } from '../../models'
import { signAccessToken, signRefreshToken, verifyRefreshToken, authPlugin } from '../../middleware/auth'

// ── In-memory OTP store (acceptable for demo; keyed by contact) ───────────────
// NOTE: in-memory only — all pending OTPs are LOST on server restart.
// Persisting (Redis/DB) is out of scope for this change.
const OTP_STORE: Map<string, { otp: string; expiresAt: Date; studentId?: string }> = new Map()

// In production we must never leak the OTP in the response body.
const IS_DEV = process.env.NODE_ENV !== 'production'

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export const authController = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set, request }) => {
    const { email, password } = body
    const user = await User.findOne({ email: email.toLowerCase() }).lean()

    if (!user || !user.passwordHash) {
      set.status = 401
      return { error: { code: 'AUTH_001', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } }
    }

    if (user.status !== 'active') {
      set.status = 401
      return { error: { code: 'AUTH_003', message: 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' } }
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
      .populate<{ memberUserId: any }>('memberUserId')
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

    if (enrollment.studentUserId) {
      const student = enrollment.studentUserId
      return {
        valid: true,
        type: 'student',
        student: {
          uid:        student.uid,
          firstName:  student.firstName,
          lastName:   student.lastName,
          gradeLevel: student.studentProfile?.gradeLevel ?? null,
        },
      }
    }

    if (enrollment.memberUserId) {
      const member = enrollment.memberUserId
      return {
        valid: true,
        type: 'member',
        member: {
          uid:       member.uid,
          firstName: member.firstName,
          lastName:  member.lastName,
          role:      member.role,
          email:     member.email  ?? null,
          phone:     member.phone  ?? null,
        },
      }
    }

    set.status = 400
    return { error: { code: 'ENR_005', message: 'รหัสลงทะเบียนไม่ถูกต้อง' } }
  }, {
    body: t.Object({ code: t.String({ minLength: 1 }) }),
  })

  // ── Send OTP for registration (demo: returns otp in response) ─────────────
  .post('/send-registration-otp', async ({ body, set }) => {
    const code    = body.enrollmentCode.toUpperCase().trim()
    const contact = body.contact.trim().toLowerCase()

    const enrollment = await EnrollmentCode.findOne({ code })
      .populate<{ studentUserId: any }>('studentUserId')
      .populate<{ memberUserId: any }>('memberUserId')
      .lean()

    if (!enrollment || (!enrollment.studentUserId && !enrollment.memberUserId)) {
      set.status = 400
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

    // Re-generate + re-store on every call so this endpoint also acts as RESEND (resets TTL).
    const otp       = generateOtp()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    OTP_STORE.set(`reg:${code}:${contact}`, { otp, expiresAt })

    // demoOtp always returned until SMS delivery is configured
    return { expiresAt: expiresAt.toISOString(), demoOtp: otp }
  }, {
    body: t.Object({
      enrollmentCode: t.String({ minLength: 1 }),
      contact:        t.String({ minLength: 1 }),
    }),
  })

  .post('/parent-register', async ({ body, set }) => {
    const { enrollmentCode, firstName, lastName, password, email, phone, otp } = body

    // Validate OTP
    const contact = (phone ?? email ?? '').trim().toLowerCase()
    const otpKey  = `reg:${enrollmentCode.toUpperCase().trim()}:${contact}`
    const stored  = OTP_STORE.get(otpKey)
    if (!stored || stored.otp !== otp || new Date() > stored.expiresAt) {
      set.status = 400
      return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' } }
    }
    OTP_STORE.delete(otpKey)

    const enrollment = await EnrollmentCode.findOne({ code: enrollmentCode.toUpperCase().trim() }).lean()
    if (!enrollment || !enrollment.studentUserId) {
      set.status = 400
      return { error: { code: 'ENR_001', message: 'ไม่พบรหัสลงทะเบียนนักเรียน' } }
    }
    if (enrollment.used) {
      set.status = 400
      return { error: { code: 'ENR_002', message: 'รหัสนี้ถูกใช้งานแล้ว' } }
    }
    if (new Date() > enrollment.expiresAt) {
      set.status = 400
      return { error: { code: 'ENR_003', message: 'รหัสหมดอายุแล้ว' } }
    }

    const existingLink = await ParentStudent.findOne({ studentUserId: enrollment.studentUserId }).lean()
    if (existingLink) {
      set.status = 400
      return { error: { code: 'ENR_004', message: 'นักเรียนคนนี้มีผู้ปกครองในระบบแล้ว' } }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const count = await User.countDocuments({ role: 'parent' })
    const uid   = `PRT-${String(count + 1).padStart(4, '0')}`

    const normalizedPhone = phone?.trim() ?? undefined
    const normalizedEmail = email?.trim().toLowerCase() ?? undefined
    const contactField = normalizedPhone ? { phone: normalizedPhone } : normalizedEmail ? { email: normalizedEmail } : {}

    const parent = await User.create({
      uid, role: 'parent', firstName, lastName, passwordHash,
      status: 'active', pdpaAcceptedAt: new Date(),
      ...contactField,
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
      email:          t.Optional(t.String()),
      phone:          t.Optional(t.String()),
      otp:            t.String({ minLength: 6, maxLength: 6 }),
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

  // ── Parent OTP registration flow ──────────────────────────────────────────

  .post('/parent/lookup-student', async ({ body, set }) => {
    const sid = (body.studentId ?? '').toUpperCase().trim()
    if (!sid) {
      set.status = 400
      return { error: { code: 'INVALID', message: 'กรุณากรอกรหัสนักเรียน' } }
    }
    const student = await User.findOne({ uid: sid, role: 'student', status: 'active' }).lean()
    if (!student) {
      set.status = 404
      return { error: { code: 'STD_404', message: 'ไม่พบรหัสนักเรียนในระบบ' } }
    }
    return {
      found: true,
      student: {
        uid:       student.uid,
        firstName: student.firstName,
        lastName:  student.lastName,
        grade:     student.studentProfile?.gradeLevel ?? null,
      },
    }
  }, {
    body: t.Object({ studentId: t.String({ minLength: 1 }) }),
  })

  .post('/parent/send-otp', async ({ body, set }) => {
    const contact   = (body.contact   ?? '').trim().toLowerCase()
    const studentId = (body.studentId ?? '').toUpperCase().trim()
    if (!contact || !studentId) {
      set.status = 400
      return { error: { code: 'INVALID', message: 'กรุณากรอกข้อมูลให้ครบ' } }
    }
    // Check contact not already registered
    const existing = await User.findOne({
      $or: [{ email: contact }, { phone: contact }],
      role: 'parent',
      status: 'active',
    }).lean()
    if (existing) {
      set.status = 409
      return { error: { code: 'ALREADY_REGISTERED', message: 'อีเมล/เบอร์นี้ลงทะเบียนแล้ว' } }
    }
    // Re-generate + re-store on every call so this endpoint also acts as RESEND (resets TTL).
    const otp       = generateOtp()
    const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000) // 14 days (same as mock)
    OTP_STORE.set(contact, { otp, expiresAt, studentId })
    console.log(`[OTP] ${contact} → ${otp}`)
    // demoOtp always returned until SMS delivery is configured
    return { sent: true, expiresAt: expiresAt.toISOString(), demoOtp: otp }
  }, {
    body: t.Object({
      studentId: t.String({ minLength: 1 }),
      contact:   t.String({ minLength: 1 }),
    }),
  })

  .post('/parent/register', async ({ body, set }) => {
    const contact   = (body.contact   ?? '').trim().toLowerCase()
    const otp       = (body.otp       ?? '').trim()
    const studentId = (body.studentId ?? '').toUpperCase().trim()
    const record    = OTP_STORE.get(contact)
    if (!record || record.otp !== otp) {
      set.status = 400
      return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' } }
    }
    if (new Date() > record.expiresAt) {
      set.status = 400
      return { error: { code: 'OTP_EXPIRED', message: 'รหัส OTP หมดอายุแล้ว' } }
    }
    OTP_STORE.delete(contact)

    const student = await User.findOne({ uid: studentId, role: 'student', status: 'active' }).lean()
    if (!student) {
      set.status = 404
      return { error: { code: 'STD_404', message: 'ไม่พบรหัสนักเรียนในระบบ' } }
    }

    const existingLink = await ParentStudent.findOne({ studentUserId: student._id }).lean()
    if (existingLink) {
      set.status = 400
      return { error: { code: 'ENR_004', message: 'นักเรียนคนนี้มีผู้ปกครองในระบบแล้ว' } }
    }

    const passwordHash = await bcrypt.hash(body.password, 10)
    const count = await User.countDocuments({ role: 'parent' })
    const uid   = `PRT-${String(count + 1).padStart(4, '0')}`

    // Store contact in email or phone field based on format
    const isPhone = /^0[0-9]{9}$/.test(contact) || contact.startsWith('+66')
    const contactField = isPhone ? { phone: contact } : { email: contact }

    const parent = await User.create({
      uid, role: 'parent',
      firstName: body.firstName ?? 'ผู้ปกครอง',
      lastName:  body.lastName  ?? '',
      passwordHash,
      status: 'active',
      pdpaAcceptedAt: new Date(),
      ...contactField,
    })

    await Wallet.create({ userId: parent._id, balance: 0 })

    await ParentStudent.create({
      parentUserId:  parent._id,
      studentUserId: student._id,
      isPrimary:     true,
      relationship:  'parent',
    })

    const payload = { userId: String(parent._id), role: parent.role, uid: parent.uid }
    const accessToken  = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    const { passwordHash: _ph, ...safeUser } = parent.toObject()
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      studentId: t.String({ minLength: 1 }),
      contact:   t.String({ minLength: 1 }),
      otp:       t.String({ minLength: 6 }),
      firstName: t.Optional(t.String()),
      lastName:  t.Optional(t.String()),
      password:  t.String({ minLength: 8 }),
    }),
  })

  // ── Member registration via enrollment code ───────────────────────────────

  .post('/member-register', async ({ body, set }) => {
    // Validate OTP
    const contact = (body.phone ?? body.email ?? '').trim().toLowerCase()
    const otpKey  = `reg:${body.enrollmentCode.toUpperCase().trim()}:${contact}`
    const stored  = OTP_STORE.get(otpKey)
    if (!stored || stored.otp !== body.otp || new Date() > stored.expiresAt) {
      set.status = 400
      return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' } }
    }
    OTP_STORE.delete(otpKey)

    const enrollment = await EnrollmentCode.findOne({ code: body.enrollmentCode.toUpperCase().trim() })
      .populate<{ memberUserId: any }>('memberUserId')
      .lean()

    if (!enrollment || !enrollment.memberUserId) {
      set.status = 400
      return { error: { code: 'ENR_001', message: 'ไม่พบรหัสลงทะเบียนสมาชิก' } }
    }
    if (enrollment.used) {
      set.status = 400
      return { error: { code: 'ENR_002', message: 'รหัสนี้ถูกใช้งานแล้ว' } }
    }
    if (new Date() > enrollment.expiresAt) {
      set.status = 400
      return { error: { code: 'ENR_003', message: 'รหัสหมดอายุแล้ว' } }
    }

    const member = enrollment.memberUserId
    const passwordHash = await bcrypt.hash(body.password, 10)

    const updateData: Record<string, any> = { passwordHash, pdpaAcceptedAt: new Date() }
    if (body.email) updateData.email = body.email.trim().toLowerCase()
    if (body.phone) updateData.phone = body.phone.trim()

    await User.updateOne({ _id: member._id }, updateData)

    await EnrollmentCode.updateOne(
      { _id: enrollment._id },
      { used: true, usedAt: new Date(), usedByMemberId: member._id },
    )

    const payload = { userId: String(member._id), role: member.role, uid: member.uid }
    const accessToken  = signAccessToken(payload as any)
    const refreshToken = signRefreshToken(payload as any)

    const updatedUser = await User.findById(member._id).lean()
    const { passwordHash: _ph, ...safeUser } = updatedUser!
    return { accessToken, refreshToken, user: safeUser }
  }, {
    body: t.Object({
      enrollmentCode: t.String({ minLength: 1 }),
      email:          t.Optional(t.String()),
      phone:          t.Optional(t.String()),
      otp:            t.String({ minLength: 6, maxLength: 6 }),
      password:       t.String({ minLength: 8 }),
    }),
  })

  // ── Forgot password flow ──────────────────────────────────────────────────

  .post('/forgot-password/send', async ({ body, set }) => {
    const contact = (body.contact ?? '').trim().toLowerCase()
    if (!contact) {
      set.status = 400
      return { error: { code: 'INVALID', message: 'กรุณากรอกอีเมลหรือเบอร์มือถือ' } }
    }
    const user = await User.findOne({
      $or: [{ email: contact }, { phone: contact }],
      status: 'active',
    }).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'ไม่พบบัญชีนี้ในระบบ' } }
    }
    const otp       = generateOtp()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min
    OTP_STORE.set(`reset_${contact}`, { otp, expiresAt })
    console.log(`[OTP reset] ${contact} → ${otp}`)
    // demoOtp always returned until SMS delivery is configured
    return { sent: true, demoOtp: otp }
  }, {
    body: t.Object({ contact: t.String({ minLength: 1 }) }),
  })

  .post('/forgot-password/reset', async ({ body, set }) => {
    const contact = (body.contact ?? '').trim().toLowerCase()
    const otp     = (body.otp     ?? '').trim()
    const record  = OTP_STORE.get(`reset_${contact}`)
    if (!record || record.otp !== otp) {
      set.status = 400
      return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้อง' } }
    }
    if (new Date() > record.expiresAt) {
      set.status = 400
      return { error: { code: 'OTP_EXPIRED', message: 'รหัส OTP หมดอายุ' } }
    }
    OTP_STORE.delete(`reset_${contact}`)

    const user = await User.findOne({
      $or: [{ email: contact }, { phone: contact }],
      status: 'active',
    }).lean()
    if (!user) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'ไม่พบบัญชีนี้ในระบบ' } }
    }
    const passwordHash = await bcrypt.hash(body.newPassword, 10)
    await User.updateOne({ _id: user._id }, { passwordHash })
    return { success: true }
  }, {
    body: t.Object({
      contact:     t.String({ minLength: 1 }),
      otp:         t.String({ minLength: 6 }),
      newPassword: t.String({ minLength: 8 }),
    }),
  })

  // ── Change password (authenticated) ──────────────────────────────────────

  .use(authPlugin())

  .post('/change-password', async ({ body, currentUser, set }) => {
    const oldPassword = (body as any).oldPassword ?? (body as any).currentPassword ?? ''
    const newPassword = (body as any).newPassword ?? ''

    if (!oldPassword || !newPassword) {
      set.status = 400
      return { error: { code: 'INVALID', message: 'กรุณากรอกรหัสผ่านให้ครบ' } }
    }

    const user = await User.findById(currentUser._id).lean()
    if (!user || !user.passwordHash) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: 'ไม่พบบัญชีผู้ใช้' } }
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!valid) {
      set.status = 400
      return { error: { code: 'WRONG_PASSWORD', message: 'รหัสผ่านเดิมไม่ถูกต้อง' } }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await User.updateOne({ _id: user._id }, { passwordHash })
    return { success: true }
  })
