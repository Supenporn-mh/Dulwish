/**
 * Mock API Server — ทดสอบทุก Role โดยไม่ต้อง MongoDB
 * รันด้วย: pnpm --filter api mock
 * Port: 4000 (เหมือน API จริง)
 */
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import jwt from 'jsonwebtoken'

const JWT_SECRET  = 'upos_super_secret_jwt_2026_dulwich'
const JWT_REFRESH = 'upos_refresh_secret_jwt_2026'

function signAccess(payload: object)  { return jwt.sign(payload, JWT_SECRET,  { expiresIn: '15m' }) }
function signRefresh(payload: object) { return jwt.sign(payload, JWT_REFRESH, { expiresIn: '7d'  }) }

// ── Mock Data ────────────────────────────────────────────────────────────────

const USERS: Record<string, any> = {
  // parent ใช้ student code login
  'PRT-0001': { _id: 'prt001', uid: 'PRT-0001', role: 'parent', firstName: 'สุชาติ', lastName: 'ใจดี', status: 'active' },
  // staff ใช้ email login
  'ADM-001':  { _id: 'adm001', uid: 'ADM-001',  role: 'admin',      firstName: 'Admin',   lastName: 'Dulwich', email: 'admin@dulwich.ac.th',  passwordPlain: 'Admin1234!'  },
  'SUP-001':  { _id: 'sup001', uid: 'SUP-001',  role: 'supervisor', firstName: 'พัชรา',  lastName: 'แมเนเจอร์', email: 'patcha@school.local', passwordPlain: 'Super123!'  },
  'CSH-001':  { _id: 'csh001', uid: 'CSH-001',  role: 'cashier',    firstName: 'หนอง',   lastName: 'แคชเชียร์', email: 'nong@school.local',  passwordPlain: 'Cashier123!' },
}

const STUDENTS: Record<string, any> = {
  'STD-K1-0001': { _id: 'std001', uid: 'STD-K1-0001', role: 'student', firstName: 'สมหญิง', lastName: 'ใจดี', studentProfile: { gradeLevel: 'K1', className: 'K1-A' } },
  'STD-P3-0015': { _id: 'std002', uid: 'STD-P3-0015', role: 'student', firstName: 'สมชาย',  lastName: 'ใจดี', studentProfile: { gradeLevel: 'P3', className: 'P3-B' } },
}

// student code → parent (1:1)
const STUDENT_TO_PARENT: Record<string, string> = {
  'STD-K1-0001': 'PRT-0001',
  'STD-P3-0015': 'PRT-0001',
}

const PARENT_PASSWORD = 'Demo1234!'

// Parent accounts: contact (email/phone) → account info
const PARENT_ACCOUNTS: Record<string, any> = {
  'suchat@dulwich.ac.th': { uid: 'PRT-0001', passwordPlain: 'Demo1234!' },
  '0812345678':           { uid: 'PRT-0001', passwordPlain: 'Demo1234!' },
}

// OTP store: contact → { otp, expiresAt, studentId }
const OTP_STORE: Map<string, { otp: string; expiresAt: Date; studentId?: string }> = new Map()

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const WALLETS: Record<string, any> = {
  'std001': { _id: 'w001', userId: 'std001', balance: 850  },
  'std002': { _id: 'w002', userId: 'std002', balance: 320  },
  'prt001': { _id: 'w003', userId: 'prt001', balance: 0    },
  'adm001': { _id: 'w004', userId: 'adm001', balance: 0    },
  'csh001': { _id: 'w005', userId: 'csh001', balance: 0    },
}

const TXN_TEMPLATES = [
  { type: 'topup',    description: 'เติมเงินผ่าน PromptPay',      amount: 500  },
  { type: 'purchase', description: 'ซื้อ Ham Sandwich',           amount: -85  },
  { type: 'buffet',   description: 'Buffet กลางวัน K1-A',        amount: -120 },
  { type: 'purchase', description: 'ซื้อ Orange Juice',           amount: -45  },
  { type: 'topup',    description: 'เติมเงินผ่าน SCB QR',        amount: 300  },
  { type: 'purchase', description: 'ซื้อ Blueberry Muffin',      amount: -45  },
  { type: 'buffet',   description: 'Buffet เช้า',                 amount: -80  },
  { type: 'purchase', description: 'ซื้อ Chicken Wrap',           amount: -95  },
  { type: 'topup',    description: 'เติมเงินโดยผู้ปกครอง',      amount: 1000 },
  { type: 'purchase', description: 'ซื้อ Espresso',              amount: -55  },
]

function makeTxns(walletId: string, count = 10) {
  return TXN_TEMPLATES.slice(0, count).map((t, i) => ({
    _id:          `txn${walletId}${i}`,
    refNo:        `TXN2026-${walletId}-${String(i + 1).padStart(3,'0')}`,
    walletId,
    type:         t.type,
    amount:       t.amount,
    balanceAfter: 850 - (t.amount < 0 ? Math.abs(t.amount) * (i + 1) : 0),
    channel:      t.type === 'topup' ? 'mobile_web' : 'pos',
    status:       'success',
    note:         t.description,
    createdAt:    new Date(Date.now() - 3600000 * (i + 1) * 8).toISOString(),
  }))
}

const MENU_ITEMS = [
  // POS format (id: number, category string) + API format (_id, sku)
  { id: 1, _id: 'mi01', sku: 'LATTE',    name: 'Latte',            price: 65,  category: 'เครื่องดื่ม', emoji: '☕', isPreorderable: false, active: true },
  { id: 2, _id: 'mi02', sku: 'ESPRESSO', name: 'Espresso',         price: 55,  category: 'เครื่องดื่ม', emoji: '☕', isPreorderable: false, active: true },
  { id: 3, _id: 'mi03', sku: 'OJ',       name: 'Orange Juice',     price: 45,  category: 'เครื่องดื่ม', emoji: '🍊', isPreorderable: true,  dailyQuota: 50, active: true },
  { id: 4, _id: 'mi04', sku: 'WATER',    name: 'Water Bottle',     price: 15,  category: 'เครื่องดื่ม', emoji: '💧', isPreorderable: false, active: true },
  { id: 5, _id: 'mi05', sku: 'SAND-HAM', name: 'Ham Sandwich',     price: 85,  category: 'อาหาร',       emoji: '🥪', isPreorderable: true,  dailyQuota: 30, active: true },
  { id: 6, _id: 'mi06', sku: 'SAND-VEG', name: 'Veggie Sandwich',  price: 75,  category: 'อาหาร',       emoji: '🥗', isPreorderable: true,  dailyQuota: 20, active: true },
  { id: 7, _id: 'mi07', sku: 'WRAP-CHK', name: 'Chicken Wrap',     price: 95,  category: 'อาหาร',       emoji: '🌯', isPreorderable: true,  dailyQuota: 25, active: true },
  { id: 8, _id: 'mi08', sku: 'MUFFIN',   name: 'Blueberry Muffin', price: 45,  category: 'เบเกอรี่',   emoji: '🧁', isPreorderable: false, active: true },
  { id: 9, _id: 'mi09', sku: 'BROWNIE',  name: 'Brownie',          price: 40,  category: 'เบเกอรี่',   emoji: '🍫', isPreorderable: false, active: true },
]

const ADMIN_TXNS = Array.from({ length: 20 }, (_, i) => ({
  _id:          `atxn${i}`,
  refNo:        `TXN2026-ADMIN-${String(i + 1).padStart(3,'0')}`,
  type:         ['topup','purchase','buffet'][i % 3],
  amount:       i % 3 === 0 ? 500 : -(50 + (i * 15) % 200),
  balanceAfter: 850 - i * 20,
  channel:      i % 3 === 0 ? 'mobile_web' : 'pos',
  status:       'success',
  cashierId:    { firstName: 'หนอง', lastName: 'แคชเชียร์' },
  walletId:     { userId: { firstName: 'สมหญิง', lastName: 'ใจดี', uid: 'STD-K1-0001' } },
  createdAt:    new Date(Date.now() - 3600000 * (i + 1) * 3).toISOString(),
}))

const AUDIT_LOGS = Array.from({ length: 15 }, (_, i) => ({
  _id:        `audit${i}`,
  action:     ['login','topup','policy_update','user_create','order_redeem'][i % 5],
  actorRole:  ['admin','cashier','parent','supervisor','admin'][i % 5],
  ip:         `192.168.1.${10 + i}`,
  reason:     null,
  createdAt:  new Date(Date.now() - 3600000 * (i + 1) * 2).toISOString(),
  actorUserId: { firstName: ['Admin','หนอง','สุชาติ','พัชรา','Admin'][i % 5], lastName: 'Dulwich', uid: 'ADM-001' },
}))

const POLICIES = [
  { key: 'negative_balance_limit', value: 100, description: 'วงเงินติดลบสูงสุด (บาท)' },
  { key: 'low_balance_threshold',  value: 200, description: 'แจ้งเตือนเมื่อยอดเงินต่ำกว่า (บาท)' },
  { key: 'topup_min',              value: 20,  description: 'เติมเงินขั้นต่ำ (บาท)' },
  { key: 'topup_max',              value: 5000,description: 'เติมเงินสูงสุดต่อครั้ง (บาท)' },
  { key: 'preorder_max_days',      value: 7,   description: 'สั่งล่วงหน้าได้สูงสุด (วัน)' },
]

const ENROLLMENT_CODES: Record<string, any> = {
  'ENR-DEMO01': { studentUid: 'STD-K1-0001', used: false, expiresAt: new Date(Date.now() + 30 * 86400000) },
  'ENR-DEMO02': { studentUid: 'STD-P3-0015', used: false, expiresAt: new Date(Date.now() + 30 * 86400000) },
}

// ── Mock POS orders for card-read ─────────────────────────────────────────────
const POS_ORDERS = [
  {
    _id: 'ord001', orderNo: 'ORD-2026-001',
    status: 'confirmed',
    serveDate: new Date().toISOString().split('T')[0],
    totalAmount: 180,
    studentUserId: { firstName: 'สมหญิง', lastName: 'ใจดี', uid: 'STD-K1-0001' },
    items: [
      { menuItemId: { name: 'Ham Sandwich', price: 85 }, qty: 1, lineTotal: 85 },
      { menuItemId: { name: 'Orange Juice', price: 45 }, qty: 1, lineTotal: 45 },
      { menuItemId: { name: 'Blueberry Muffin', price: 45 }, qty: 1, lineTotal: 45 },
    ],
  },
]

// ── Helper ───────────────────────────────────────────────────────────────────

function authHeader(headers: any) {
  const token = headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) as any } catch { return null }
}

// ── Server ───────────────────────────────────────────────────────────────────

const app = new Elysia()
  .use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }))

  // ── Health ──────────────────────────────────────────────────────────────────
  .get('/',        () => ({ status: 'ok', mode: 'mock', time: new Date().toISOString() }))
  .get('/health',  () => ({ status: 'ok' }))
  .get('/api/health', () => ({ status: 'ok' }))

  // ── Auth: email login (admin / cashier / supervisor) ───────────────────────
  .post('/auth/login', ({ body, set }: any) => {
    const { email, password } = body
    const user = Object.values(USERS).find(
      u => u.email === email.toLowerCase() && u.passwordPlain === password
    )
    if (!user) { set.status = 401; return { error: { code: 'AUTH_001', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } } }
    const payload = { userId: user._id, role: user.role, uid: user.uid }
    const { passwordPlain: _, ...safeUser } = user
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: safeUser }
  }, { body: t.Object({ email: t.String(), password: t.String() }) })

  // ── Auth: parent login (student code + password) ───────────────────────────
  .post('/auth/parent-login', ({ body, set }: any) => {
    const { studentCode, password } = body
    const student = STUDENTS[studentCode.toUpperCase().trim()]
    if (!student) { set.status = 401; return { error: { code: 'AUTH_001', message: 'ไม่พบรหัสนักเรียนในระบบ' } } }
    const parentUid = STUDENT_TO_PARENT[student.uid]
    if (!parentUid) { set.status = 401; return { error: { code: 'AUTH_001', message: 'ยังไม่มีผู้ปกครองลงทะเบียน' } } }
    if (password !== PARENT_PASSWORD) { set.status = 401; return { error: { code: 'AUTH_001', message: 'รหัสผ่านไม่ถูกต้อง' } } }
    const parent = USERS[parentUid]
    const payload = { userId: parent._id, role: parent.role, uid: parent.uid }
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: parent }
  }, { body: t.Object({ studentCode: t.String(), password: t.String() }) })

  // ── Auth: parent login v2 (email/phone + password) ────────────────────────
  .post('/auth/parent-login-v2', ({ body, set }: any) => {
    const contact  = (body.contact ?? '').trim().toLowerCase()
    const password = body.password ?? ''
    const account  = PARENT_ACCOUNTS[contact] ?? PARENT_ACCOUNTS[contact.replace(/^0/, '+660')]
    if (!account) { set.status = 401; return { error: { code: 'AUTH_001', message: 'ไม่พบบัญชีนี้ในระบบ' } } }
    if (password !== account.passwordPlain) { set.status = 401; return { error: { code: 'AUTH_001', message: 'รหัสผ่านไม่ถูกต้อง' } } }
    const parent  = USERS[account.uid]
    const payload = { userId: parent._id, role: parent.role, uid: parent.uid }
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: parent }
  })

  // ── Auth: lookup student by ID ─────────────────────────────────────────────
  .post('/auth/parent/lookup-student', ({ body, set }: any) => {
    const sid     = (body.studentId ?? '').toUpperCase().trim()
    const student = STUDENTS[sid]
    if (!student) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบรหัสนักเรียนในระบบ' } } }
    return {
      found: true,
      student: {
        uid:       student.uid,
        firstName: student.firstName,
        lastName:  student.lastName,
        grade:     student.studentProfile.gradeLevel,
        className: student.studentProfile.className,
      },
    }
  })

  // ── Auth: send OTP (registration) ─────────────────────────────────────────
  .post('/auth/parent/send-otp', ({ body, set }: any) => {
    const contact   = (body.contact ?? '').trim().toLowerCase()
    const studentId = (body.studentId ?? '').toUpperCase().trim()
    if (!contact || !studentId) { set.status = 400; return { error: { code: 'INVALID', message: 'กรุณากรอกข้อมูลให้ครบ' } } }
    if (PARENT_ACCOUNTS[contact]) { set.status = 409; return { error: { code: 'ALREADY_REGISTERED', message: 'อีเมล/เบอร์นี้ลงทะเบียนแล้ว' } } }
    const otp       = generateOtp()
    const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000)
    OTP_STORE.set(contact, { otp, expiresAt, studentId })
    return { sent: true, otp, expiresAt: expiresAt.toISOString(), _demo: `OTP: ${otp}` }
  })

  // ── Auth: parent register v2 (Student ID + OTP flow) ──────────────────────
  .post('/auth/parent/register', ({ body, set }: any) => {
    const contact   = (body.contact ?? '').trim().toLowerCase()
    const otp       = (body.otp ?? '').trim()
    const studentId = (body.studentId ?? '').toUpperCase().trim()
    const record    = OTP_STORE.get(contact)
    if (!record || record.otp !== otp) { set.status = 400; return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' } } }
    if (new Date() > record.expiresAt) { set.status = 400; return { error: { code: 'OTP_EXPIRED', message: 'รหัส OTP หมดอายุแล้ว' } } }
    OTP_STORE.delete(contact)
    // Create parent account
    const newUid = `PRT-${Date.now()}`
    const newId  = `prt_${Date.now()}`
    USERS[newUid] = {
      _id: newId, uid: newUid, role: 'parent',
      firstName: body.firstName ?? 'ผู้ปกครอง',
      lastName:  body.lastName  ?? '',
      status: 'active',
    }
    PARENT_ACCOUNTS[contact] = { uid: newUid, passwordPlain: body.password }
    STUDENT_TO_PARENT[studentId] = newUid
    const parent  = USERS[newUid]
    const payload = { userId: parent._id, role: parent.role, uid: parent.uid }
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: parent }
  })

  // ── Auth: forgot password — send OTP ──────────────────────────────────────
  .post('/auth/forgot-password/send', ({ body, set }: any) => {
    const contact = (body.contact ?? '').trim().toLowerCase()
    if (!PARENT_ACCOUNTS[contact]) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'ไม่พบบัญชีนี้ในระบบ' } } }
    const otp       = generateOtp()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min for reset
    OTP_STORE.set(`reset_${contact}`, { otp, expiresAt })
    return { sent: true, otp, _demo: `OTP: ${otp}` }
  })

  // ── Auth: forgot password — reset ─────────────────────────────────────────
  .post('/auth/forgot-password/reset', ({ body, set }: any) => {
    const contact = (body.contact ?? '').trim().toLowerCase()
    const otp     = (body.otp ?? '').trim()
    const record  = OTP_STORE.get(`reset_${contact}`)
    if (!record || record.otp !== otp) { set.status = 400; return { error: { code: 'OTP_INVALID', message: 'รหัส OTP ไม่ถูกต้อง' } } }
    if (new Date() > record.expiresAt)  { set.status = 400; return { error: { code: 'OTP_EXPIRED', message: 'รหัส OTP หมดอายุ' } } }
    OTP_STORE.delete(`reset_${contact}`)
    if (PARENT_ACCOUNTS[contact]) PARENT_ACCOUNTS[contact].passwordPlain = body.newPassword
    return { success: true }
  })

  // ── Auth: change password (authenticated) ─────────────────────────────────
  .post('/auth/change-password', ({ body, headers, set }: any) => {
    const jwtUser = authHeader(headers)
    if (!jwtUser) { set.status = 401; return { error: { code: 'UNAUTHORIZED' } } }
    const entry = Object.entries(PARENT_ACCOUNTS).find(([, v]: any) => v.uid === jwtUser.uid)
    if (!entry) { set.status = 404; return { error: { code: 'NOT_FOUND' } } }
    const [contact, account] = entry as any
    if (body.oldPassword !== account.passwordPlain) { set.status = 400; return { error: { code: 'WRONG_PASSWORD', message: 'รหัสผ่านเดิมไม่ถูกต้อง' } } }
    PARENT_ACCOUNTS[contact].passwordPlain = body.newPassword
    return { success: true }
  })

  // ── Auth: verify enrollment code ───────────────────────────────────────────
  .post('/auth/verify-enrollment', ({ body, set }: any) => {
    const enrollment = ENROLLMENT_CODES[body.code.toUpperCase().trim()]
    if (!enrollment) { set.status = 404; return { error: { code: 'ENR_001', message: 'ไม่พบรหัสลงทะเบียน' } } }
    if (enrollment.used) { set.status = 400; return { error: { code: 'ENR_002', message: 'รหัสนี้ถูกใช้งานแล้ว' } } }
    const student = STUDENTS[enrollment.studentUid]
    return {
      valid: true,
      student: {
        uid:        student.uid,
        firstName:  student.firstName,
        lastName:   student.lastName,
        gradeLevel: student.studentProfile.gradeLevel,
        className:  student.studentProfile.className,
      },
    }
  }, { body: t.Object({ code: t.String() }) })

  // ── Auth: parent register ──────────────────────────────────────────────────
  .post('/auth/parent-register', ({ body, set }: any) => {
    const { enrollmentCode, firstName, lastName } = body
    const enrollment = ENROLLMENT_CODES[enrollmentCode.toUpperCase().trim()]
    if (!enrollment || enrollment.used) {
      set.status = 400; return { error: { code: 'ENR_001', message: 'รหัสลงทะเบียนไม่ถูกต้อง' } }
    }
    enrollment.used = true
    const newId = `prt_new_${Date.now()}`
    const newUid = `PRT-${String(Object.keys(USERS).length + 1).padStart(4,'0')}`
    const newParent = { _id: newId, uid: newUid, role: 'parent', firstName, lastName, status: 'active' }
    USERS[newUid] = newParent
    WALLETS[newId] = { _id: `w_${newId}`, userId: newId, balance: 0 }
    STUDENT_TO_PARENT[enrollment.studentUid] = newUid
    const payload = { userId: newId, role: 'parent', uid: newUid }
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: newParent }
  }, { body: t.Object({ enrollmentCode: t.String(), firstName: t.String(), lastName: t.String(), password: t.String() }) })

  // ── Users: me/children ─────────────────────────────────────────────────────
  .get('/users/me/children', ({ headers }: any) => {
    const jwtUser = authHeader(headers)
    if (!jwtUser || jwtUser.role !== 'parent') return { children: [] }
    const childStudentCodes = Object.entries(STUDENT_TO_PARENT)
      .filter(([, pUid]) => pUid === jwtUser.uid)
      .map(([sCode]) => sCode)
    const children = childStudentCodes.map(code => {
      const s = STUDENTS[code]
      const wallet = WALLETS[s._id] ?? { balance: 0 }
      return {
        id:          s._id,
        uid:         s.uid,
        name:        `${s.firstName} ${s.lastName}`,
        studentCode: s.uid,
        grade:       s.studentProfile?.gradeLevel,
        className:   s.studentProfile?.className,
        walletId:    wallet._id,
        balance:     wallet.balance,
      }
    })
    return { children }
  })

  // ── Feedback ───────────────────────────────────────────────────────────────
  .post('/feedback', ({ body }: any) => {
    return { success: true, message: 'Feedback recorded', data: body }
  })

  // ── Orders: today's bookings for a student ────────────────────────────────
  .get('/orders/today', ({ query, headers }: any) => {
    const jwtUser = authHeader(headers)
    if (!jwtUser) return { orders: [] }
    const today = new Date().toISOString().split('T')[0]
    const sid   = query.studentId ?? ''
    const orders = POS_ORDERS.filter(o =>
      o.serveDate === today &&
      (!sid || o.studentUserId?.uid === sid || o.studentUserId?._id === sid)
    ).map(o => ({
      id:          o._id,
      orderNo:     o.orderNo,
      status:      o.status,
      totalAmount: o.totalAmount,
      serveDate:   o.serveDate,
      items:       (o.items ?? []).map((it: any) => ({
        name:      it.menuItemId?.name ?? it.name ?? '',
        qty:       it.qty,
        lineTotal: it.lineTotal,
      })),
    }))
    return { orders }
  })

  // ── Users: add student to existing parent ─────────────────────────────────
  .post('/users/me/add-student', ({ body, headers, set }: any) => {
    const jwtUser = authHeader(headers)
    if (!jwtUser) { set.status = 401; return { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบ' } } }

    const enrollment = ENROLLMENT_CODES[(body.enrollmentCode ?? '').toUpperCase().trim()]
    if (!enrollment) { set.status = 404; return { error: { code: 'ENR_001', message: 'ไม่พบรหัสลงทะเบียน' } } }
    if (enrollment.used) { set.status = 400; return { error: { code: 'ENR_002', message: 'รหัสนี้ถูกใช้งานแล้ว' } } }

    const student = STUDENTS[enrollment.studentUid]
    if (!student) { set.status = 404; return { error: { code: 'ENR_001', message: 'ไม่พบข้อมูลนักเรียน' } } }

    enrollment.used = true
    STUDENT_TO_PARENT[enrollment.studentUid] = jwtUser.uid

    if (!WALLETS[student._id]) {
      WALLETS[student._id] = { _id: `w_${student._id}`, userId: student._id, balance: 0 }
    }

    return {
      success: true,
      student: {
        uid:        student.uid,
        firstName:  student.firstName,
        lastName:   student.lastName,
        gradeLevel: student.studentProfile?.gradeLevel,
        className:  student.studentProfile?.className,
      },
    }
  })

  // ── Wallets: balance ───────────────────────────────────────────────────────
  .get('/wallets/:id', ({ params }: any) => {
    const wallet = Object.values(WALLETS).find((w: any) => w._id === params.id || w.userId === params.id)
    if (!wallet) return { balance: 0, _id: params.id }
    return wallet
  })

  // ── Wallets: transactions ──────────────────────────────────────────────────
  .get('/wallets/:id/transactions', ({ params }: any) => {
    const txns = makeTxns(params.id, 10)
    return { transactions: txns, total: txns.length }
  })

  // ── Wallets: topup ─────────────────────────────────────────────────────────
  .post('/wallets/:id/topup', ({ params, body }: any) => {
    const wallet: any = Object.values(WALLETS).find((w: any) => w._id === params.id || w.userId === params.id)
    if (wallet) wallet.balance += body.amount
    return {
      success:   true,
      newBalance: wallet?.balance ?? body.amount,
      transaction: {
        _id:          `topup_${Date.now()}`,
        type:         'topup',
        amount:       body.amount,
        balanceAfter: wallet?.balance ?? body.amount,
        status:       'success',
        createdAt:    new Date().toISOString(),
      },
    }
  })

  // ── Menu ───────────────────────────────────────────────────────────────────
  .get('/menu', ({ query }: any) => {
    const items = query.preorderable === 'true'
      ? MENU_ITEMS.filter(m => m.isPreorderable)
      : MENU_ITEMS
    // Return array directly (POS SaleView expects array) + also expose as {items}
    // If query asks for preorderable, return {items} for parent pre-order view
    return query.preorderable ? { items } : items
  })

  // ── Orders: create ─────────────────────────────────────────────────────────
  .post('/orders', ({ body }: any) => {
    const order = {
      _id:         `ord_${Date.now()}`,
      orderNo:     `ORD-${Date.now()}`,
      status:      'confirmed',
      totalAmount: body.totalAmount ?? 0,
      serveDate:   body.serveDate ?? new Date().toISOString().split('T')[0],
      items:       body.items ?? [],
      createdAt:   new Date().toISOString(),
    }
    POS_ORDERS.unshift(order as any)
    return { order }
  })

  // ── POS: card read ─────────────────────────────────────────────────────────
  .post('/pos/card-read', ({ body }: any) => {
    const uid = (body.cardUid ?? body.card_uid ?? '').toUpperCase().trim()
    const student = STUDENTS[uid]
    if (!student) return { found: false, error: 'Card not found' }
    const wallet = WALLETS[student._id] ?? { balance: 0 }
    return {
      found:    true,
      userId:   student._id,
      name:     `${student.firstName} ${student.lastName} (${student.studentProfile?.gradeLevel})`,
      balance:  wallet.balance,
      student:  { _id: student._id, uid: student.uid, firstName: student.firstName, lastName: student.lastName,
                  studentProfile: student.studentProfile },
      wallet:   wallet,
    }
  })

  // ── POS: sale ──────────────────────────────────────────────────────────────
  .post('/pos/sale', ({ body }: any) => {
    const userId = body.tenders?.[0]?.userId
    if (userId && WALLETS[userId]) {
      WALLETS[userId].balance -= body.total ?? 0
    }
    return {
      id:     `sale_${Date.now()}`,
      refNo:  `REF-${Date.now()}`,
      time:   new Date().toLocaleString('th-TH'),
      items:  body.items ?? [],
      total:  body.total ?? 0,
      status: 'success',
    }
  })

  // ── POS: orders by card ────────────────────────────────────────────────────
  .get('/pos/orders/by-card', ({ query }: any) => {
    const uid = (query.card_uid ?? '').toUpperCase().trim()
    const student = Object.values(STUDENTS).find((s: any) => s.uid === uid) as any
    if (!student) return { orders: [] }
    const orders = POS_ORDERS.filter((o: any) =>
      o.studentUserId?._id === student._id || o.studentUserId === student._id
    )
    return { orders }
  })

  // ── POS: redeem order ──────────────────────────────────────────────────────
  .post('/pos/orders/:id/redeem', ({ params }: any) => {
    const order = POS_ORDERS.find(o => o._id === params.id) as any
    if (order) order.status = 'redeemed'
    return { success: true, order }
  })

  // ── Admin: dashboard stats ────────────────────────────────────────────────
  .get('/admin/dashboard', () => ({
    todayRevenue:  12450,
    topUps:        8200,
    buffetEntries: 87,
    lowBalance:    12,
  }))

  // ── Admin: transactions ────────────────────────────────────────────────────
  .get('/admin/transactions', ({ query }: any) => {
    const page  = parseInt(query.page ?? '1')
    const limit = parseInt(query.limit ?? '20')
    const start = (page - 1) * limit
    const slice = ADMIN_TXNS.slice(start, start + limit)
    // Return both array and {data:[]} formats to support different views
    return { data: slice, transactions: slice, total: ADMIN_TXNS.length, page, limit }
  })

  // ── Admin: audit ───────────────────────────────────────────────────────────
  .get('/admin/audit', ({ query }: any) => {
    const page  = parseInt(query.page ?? '1')
    const limit = parseInt(query.limit ?? '20')
    const start = (page - 1) * limit
    return { logs: AUDIT_LOGS.slice(start, start + limit), total: AUDIT_LOGS.length }
  })

  // ── Admin: policies ────────────────────────────────────────────────────────
  .get('/admin/policies',    () => ({ policies: POLICIES }))
  .patch('/admin/policies/:key', ({ params, body }: any) => {
    const p = POLICIES.find(p => p.key === params.key)
    if (p) p.value = body.value
    return { policy: p }
  })

  // ── Admin: reports ─────────────────────────────────────────────────────────
  .get('/admin/reports/sales', () => ({
    totalRevenue:    12450,
    totalTransactions: 89,
    byChannel: { pos: 8200, mobile_web: 4250 },
    byType:    { topup: 6000, purchase: 4200, buffet: 2250 },
    dailySales: Array.from({ length: 7 }, (_, i) => ({
      date:    new Date(Date.now() - 86400000 * (6 - i)).toISOString().split('T')[0],
      revenue: 1200 + Math.floor(Math.random() * 800),
      count:   8 + Math.floor(Math.random() * 12),
    })),
  }))
  .get('/admin/reports/buffet', () => ({
    totalSessions: 42,
    totalRevenue:  6300,
    byPeriod: { BREAKFAST: 15, LUNCH: 22, DINNER: 5 },
    byGroup:  { primary: 28, secondary: 10, staff: 4 },
  }))

  .listen(4000)

console.log('\n🎭 Mock API Server รันที่ http://localhost:4000')
console.log('\n📋 Demo Accounts:')
console.log('  Parent:     STD-K1-0001 / Demo1234!   → /parent/dashboard')
console.log('  Admin:      admin@dulwich.ac.th / Admin1234!  → /admin/dashboard')
console.log('  Supervisor: patcha@school.local / Super123!  → /admin/dashboard')
console.log('  Cashier:    nong@school.local / Cashier123!  → /pos/sale')
console.log('  Enroll K1:  ENR-DEMO01  (ลงทะเบียนผู้ปกครองใหม่)')
console.log('  Enroll P3:  ENR-DEMO02  (ลงทะเบียนผู้ปกครองใหม่)\n')
