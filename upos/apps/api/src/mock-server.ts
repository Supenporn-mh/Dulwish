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

const GRADES_ORDER = ['K1','K2','P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6']
const PRE_ORDER_GRADES = ['K1','K2']

let STUDENTS: Record<string, any> = {
  'STD-K1-0001': { _id: 'std001', uid: 'STD-K1-0001', role: 'student', firstName: 'สมหญิง',  lastName: 'ใจดี',      studentProfile: { gradeLevel: 'K1', className: 'K1-A' }, guardianEmail: 'suchat@dulwich.ac.th', cardUid: '04A3B5C6', cardStatus: 'active',   balance: 850,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-K1-0012': { _id: 'std010', uid: 'STD-K1-0012', role: 'student', firstName: 'ปรีชา',   lastName: 'มานะ',      studentProfile: { gradeLevel: 'K1', className: 'K1-B' }, guardianEmail: 'preecha@gmail.com',    cardUid: '04E7F8A9', cardStatus: 'lost',    balance: 0,    lowThreshold: 200, parentCount: 0, status: 'active' },
  'STD-K2-0008': { _id: 'std003', uid: 'STD-K2-0008', role: 'student', firstName: 'มานี',    lastName: 'สุขดี',     studentProfile: { gradeLevel: 'K2', className: 'K2-A' }, guardianEmail: 'somying@gmail.com',    cardUid: '04C3D4E5', cardStatus: 'active',   balance: 150,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P1-0005': { _id: 'std011', uid: 'STD-P1-0005', role: 'student', firstName: 'กานดา',   lastName: 'ศรีสวัสดิ์', studentProfile: { gradeLevel: 'P1', className: 'P1-A' }, guardianEmail: 'kanda.s@example.com',  cardUid: '04F1A2B3', cardStatus: 'active',   balance: 400,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P2-0003': { _id: 'std012', uid: 'STD-P2-0003', role: 'student', firstName: 'ธีรพงษ์', lastName: 'จันทร์งาม', studentProfile: { gradeLevel: 'P2', className: 'P2-A' }, guardianEmail: 'thira@example.com',    cardUid: '04G4H5I6', cardStatus: 'active',   balance: 220,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P3-0015': { _id: 'std002', uid: 'STD-P3-0015', role: 'student', firstName: 'สมชาย',   lastName: 'ใจดี',      studentProfile: { gradeLevel: 'P3', className: 'P3-B' }, guardianEmail: 'suchat@dulwich.ac.th', cardUid: '04B1C2D3', cardStatus: 'active',   balance: 320,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P4-0009': { _id: 'std013', uid: 'STD-P4-0009', role: 'student', firstName: 'ลลิตา',   lastName: 'พรมมา',     studentProfile: { gradeLevel: 'P4', className: 'P4-A' }, guardianEmail: 'lalita@example.com',   cardUid: undefined,  cardStatus: undefined, balance: 190,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P5-0011': { _id: 'std014', uid: 'STD-P5-0011', role: 'student', firstName: 'นันทพร',  lastName: 'คำดี',      studentProfile: { gradeLevel: 'P5', className: 'P5-B' }, guardianEmail: 'nan.k@example.com',    cardUid: '04J7K8L9', cardStatus: 'active',   balance: 560,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-P6-0022': { _id: 'std004', uid: 'STD-P6-0022', role: 'student', firstName: 'วิชัย',   lastName: 'รักเรียน',  studentProfile: { gradeLevel: 'P6', className: 'P6-A' }, guardianEmail: 'vichai.p@example.com', cardUid: '04D5E6F7', cardStatus: 'inactive', balance: 500,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S1-0003': { _id: 'std005', uid: 'STD-S1-0003', role: 'student', firstName: 'อรุณี',   lastName: 'ดีงาม',     studentProfile: { gradeLevel: 'S1', className: 'S1-B' }, guardianEmail: 'arunee.d@example.com', cardUid: undefined,  cardStatus: undefined, balance: 200,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S2-0006': { _id: 'std015', uid: 'STD-S2-0006', role: 'student', firstName: 'ปิยะ',    lastName: 'แสงดาว',    studentProfile: { gradeLevel: 'S2', className: 'S2-A' }, guardianEmail: 'piya@example.com',     cardUid: '04M1N2O3', cardStatus: 'active',   balance: 750,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S3-0007': { _id: 'std016', uid: 'STD-S3-0007', role: 'student', firstName: 'สุนิสา',  lastName: 'พลอยงาม',   studentProfile: { gradeLevel: 'S3', className: 'S3-B' }, guardianEmail: 'sunisa@example.com',   cardUid: '04P4Q5R6', cardStatus: 'active',   balance: 310,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S4-0002': { _id: 'std017', uid: 'STD-S4-0002', role: 'student', firstName: 'กิตติ',   lastName: 'วงษ์ดี',    studentProfile: { gradeLevel: 'S4', className: 'S4-A' }, guardianEmail: 'kitti@example.com',    cardUid: '04S7T8U9', cardStatus: 'active',   balance: 430,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S5-0004': { _id: 'std018', uid: 'STD-S5-0004', role: 'student', firstName: 'พิมพ์ใจ', lastName: 'ทองคำ',     studentProfile: { gradeLevel: 'S5', className: 'S5-B' }, guardianEmail: 'pimjai@example.com',   cardUid: '04V1W2X3', cardStatus: 'active',   balance: 680,  lowThreshold: 200, parentCount: 1, status: 'active' },
  'STD-S6-0001': { _id: 'std019', uid: 'STD-S6-0001', role: 'student', firstName: 'ชานนท์',  lastName: 'บุญมา',     studentProfile: { gradeLevel: 'S6', className: 'S6-A' }, guardianEmail: 'chanon@example.com',   cardUid: '04Y4Z5A6', cardStatus: 'active',   balance: 120,  lowThreshold: 200, parentCount: 1, status: 'active' },
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

// ── Booking Schedule mock data ────────────────────────────────────────────────
let BOOKING_CONFIG = { key: 'default', openDays: [1,2,3,4,5] }
let BOOKING_BLACKOUTS: any[] = []
let _bkBlackoutSeq = 1

// ── Wallet Permissions mock data ─────────────────────────────────────────────
let WALLET_PERMISSIONS: any[] = [
  { code: 'W001', name: 'เติมเงินทั่วไป',    desc: 'เติมเงินปกติสำหรับทุกบัญชี',       amount: 1000,  enabled: true,  startDate: '', endDate: '' },
  { code: 'W002', name: 'เติมเงินพิเศษ',     desc: 'เติมเงินพิเศษวงเงินสูง',           amount: 5000,  enabled: true,  startDate: '', endDate: '' },
  { code: 'W003', name: 'เติมเงินรายเดือน',  desc: 'เติมเงินรายเดือนสำหรับผู้ดูแล',    amount: 10000, enabled: false, startDate: '', endDate: '' },
]

// ── Groups mock data ──────────────────────────────────────────────────────────
let MOCK_GROUPS: any[] = [
  { code: 'GRP-STD-001', name: 'นักเรียนประถม',   kind: 'student', permissions: ['W001'], members: [] },
  { code: 'GRP-MEM-001', name: 'สมาชิกทั่วไป',    kind: 'member',  permissions: ['W001'], members: [] },
]

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

function generateCode(): string {
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
  return `${hex().slice(0,8)}-${hex().slice(0,4)}`
}
function codeExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  d.setHours(23, 59, 59, 0)
  return d
}

const ENROLLMENT_CODES: Record<string, any> = {
  'ENR-DEMO01': { studentUid: 'STD-K1-0001', used: false, expiresAt: new Date(Date.now() + 30 * 86400000) },
  'ENR-DEMO02': { studentUid: 'STD-P3-0015', used: false, expiresAt: new Date(Date.now() + 30 * 86400000) },
}

// studentUid → current active code key
const STUDENT_ACTIVE_CODE: Record<string, string> = {
  'STD-K1-0001': 'ENR-DEMO01',
  'STD-P3-0015': 'ENR-DEMO02',
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

  // ── Admin: Students ────────────────────────────────────────────────────────
  .get('/admin/students', () => ({
    students: Object.values(STUDENTS).map((s: any) => ({
      uid:          s.uid,
      firstName:    s.firstName,
      lastName:     s.lastName,
      gradeLevel:   s.studentProfile?.gradeLevel ?? '',
      className:    s.studentProfile?.className  ?? '',
      guardianEmail: s.guardianEmail,
      cardUid:      s.cardUid,
      cardStatus:   s.cardStatus ?? 'active',
      balance:      s.balance ?? 0,
      lowThreshold: s.lowThreshold ?? 200,
      parentCount:  s.parentCount ?? 0,
      status:       s.status ?? 'active',
    })),
  }))

  // ── Admin: Promote All Students ────────────────────────────────────────────
  .post('/admin/promote', ({ body, set }: any) => {
    const { fromYear, toYear, studentUids } = body ?? {}
    const targetUids: Set<string> = studentUids?.length
      ? new Set(studentUids)
      : new Set(Object.keys(STUDENTS))

    const graduated: string[] = []
    const promoted: string[]  = []

    for (const uid of targetUids) {
      const s = STUDENTS[uid]
      if (!s) continue
      const grade = s.studentProfile?.gradeLevel ?? ''
      const idx   = GRADES_ORDER.indexOf(grade)
      if (idx < 0) continue

      if (idx === GRADES_ORDER.length - 1) {
        s.status = 'inactive'
        s.studentProfile.gradeLevel = 'GRADUATED'
        graduated.push(uid)
      } else {
        const nextGrade = GRADES_ORDER[idx + 1]
        s.studentProfile.gradeLevel = nextGrade
        s.studentProfile.className  = nextGrade + '-A'
        s.canPreorder = PRE_ORDER_GRADES.includes(nextGrade)
        promoted.push(uid)
      }
    }

    return {
      success:   true,
      fromYear:  fromYear ?? '',
      toYear:    toYear   ?? '',
      promoted:  promoted.length,
      graduated: graduated.length,
      message:   `เลื่อนชั้นสำเร็จ ${promoted.length} คน, จบการศึกษา ${graduated.length} คน`,
    }
  })

  // ── Admin: Export all students with enrollment codes ──────────────────────
  .get('/admin/students/codes', () => {
    const rows = Object.values(STUDENTS).map((s: any) => {
      let codeKey = STUDENT_ACTIVE_CODE[s.uid]
      let entry   = codeKey ? ENROLLMENT_CODES[codeKey] : null

      // auto-generate if missing or expired/used
      if (!entry || entry.used || new Date(entry.expiresAt) < new Date()) {
        const newCode = generateCode()
        const exp     = codeExpiresAt()
        ENROLLMENT_CODES[newCode]      = { studentUid: s.uid, used: false, expiresAt: exp }
        STUDENT_ACTIVE_CODE[s.uid]     = newCode
        codeKey = newCode
        entry   = ENROLLMENT_CODES[newCode]
      }

      return {
        uid:          s.uid,
        firstName:    s.firstName,
        lastName:     s.lastName,
        gradeLevel:   s.studentProfile?.gradeLevel ?? '',
        className:    s.studentProfile?.className  ?? '',
        guardianContact: s.guardianEmail ?? '',
        code:         codeKey,
        expiresAt:    entry.expiresAt,
      }
    })
    // sort by grade then uid
    rows.sort((a: any, b: any) => {
      const gi = GRADES_ORDER.indexOf(a.gradeLevel) - GRADES_ORDER.indexOf(b.gradeLevel)
      return gi !== 0 ? gi : a.uid.localeCompare(b.uid)
    })
    return { students: rows }
  })

  // ── Admin: Get enrollment code for a student ──────────────────────────────
  .get('/admin/students/:uid/code', ({ params, set }: any) => {
    const { uid } = params
    if (!STUDENTS[uid]) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบนักเรียน' } } }
    const codeKey  = STUDENT_ACTIVE_CODE[uid]
    const entry    = codeKey ? ENROLLMENT_CODES[codeKey] : null
    const s        = STUDENTS[uid]
    return {
      studentUid:   uid,
      firstName:    s.firstName,
      lastName:     s.lastName,
      gradeLevel:   s.studentProfile?.gradeLevel ?? '',
      code:         codeKey  ?? null,
      expiresAt:    entry?.expiresAt ?? null,
      used:         entry?.used      ?? false,
      expired:      entry ? new Date(entry.expiresAt) < new Date() : false,
    }
  })

  // ── Admin: Generate new enrollment code for a student ─────────────────────
  .post('/admin/students/:uid/code/generate', ({ params, set }: any) => {
    const { uid } = params
    if (!STUDENTS[uid]) { set.status = 404; return { error: { code: 'STD_404', message: 'ไม่พบนักเรียน' } } }

    // invalidate old code
    const oldKey = STUDENT_ACTIVE_CODE[uid]
    if (oldKey && ENROLLMENT_CODES[oldKey]) {
      ENROLLMENT_CODES[oldKey].used = true
    }

    // create new code
    const newCode = generateCode()
    const exp     = codeExpiresAt()
    ENROLLMENT_CODES[newCode] = { studentUid: uid, used: false, expiresAt: exp }
    STUDENT_ACTIVE_CODE[uid]  = newCode

    const s = STUDENTS[uid]
    return {
      studentUid: uid,
      firstName:  s.firstName,
      lastName:   s.lastName,
      gradeLevel: s.studentProfile?.gradeLevel ?? '',
      code:       newCode,
      expiresAt:  exp,
      used:       false,
      expired:    false,
    }
  })

  // ── Settings: Groups ─────────────────────────────────────────────────────
  .get('/groups', ({ query }: any) => {
    const list = MOCK_GROUPS.filter((g: any) => !query.kind || g.kind === query.kind)
    return { groups: list.map((g: any) => ({ id: g.code, name: g.name, kind: g.kind, permissions: g.permissions, memberCount: g.members.length })) }
  })
  .post('/groups', ({ body }: any) => {
    const g = { code: body.id, name: body.name, kind: body.kind ?? 'member', permissions: body.permissions ?? [], members: [] }
    MOCK_GROUPS.push(g)
    return { group: { id: g.code, name: g.name, kind: g.kind, permissions: g.permissions, memberCount: 0 } }
  })
  .patch('/groups/:code', ({ params, body }: any) => {
    const g: any = MOCK_GROUPS.find((x: any) => x.code === params.code)
    if (!g) return { error: { code: 'GRP_001', message: 'Group not found' } }
    if (body.name        !== undefined) g.name        = body.name
    if (body.permissions !== undefined) g.permissions = body.permissions
    return { group: { id: g.code, name: g.name, kind: g.kind, permissions: g.permissions, memberCount: g.members.length } }
  })
  .delete('/groups/:code', ({ params }: any) => {
    const idx = MOCK_GROUPS.findIndex((x: any) => x.code === params.code)
    if (idx >= 0) MOCK_GROUPS.splice(idx, 1)
    return { ok: true }
  })
  .get('/groups/:code/members', ({ params, set }: any) => {
    const g: any = MOCK_GROUPS.find((x: any) => x.code === params.code)
    if (!g) { set.status = 404; return { error: { code: 'GRP_001', message: 'Group not found' } } }
    return { members: g.members }
  })
  .post('/groups/:code/members', ({ params, body, set }: any) => {
    const g: any = MOCK_GROUPS.find((x: any) => x.code === params.code)
    if (!g) { set.status = 404; return { error: { code: 'GRP_001', message: 'Group not found' } } }
    if (g.members.find((m: any) => m.userId === body.userId)) { set.status = 409; return { error: { code: 'GRP_002', message: 'Already in group' } } }
    const entry = { userId: body.userId, id: body.userId, name: body.userId, joinedAt: new Date().toISOString() }
    g.members.push(entry)
    return { member: entry }
  })
  .delete('/groups/:code/members/:userId', ({ params, set }: any) => {
    const g: any = MOCK_GROUPS.find((x: any) => x.code === params.code)
    if (!g) { set.status = 404; return { error: { code: 'GRP_001', message: 'Group not found' } } }
    g.members = g.members.filter((m: any) => m.userId !== params.userId)
    return { ok: true }
  })

  // ── Settings: Wallet Permissions ─────────────────────────────────────────
  // ── Booking schedule ────────────────────────────────────────────────────────
  .get('/booking/config', () => ({ config: BOOKING_CONFIG }))
  .patch('/booking/config', ({ body }: any) => {
    BOOKING_CONFIG.openDays = body.openDays
    return { config: BOOKING_CONFIG }
  })
  .get('/booking/blackouts', () => ({ blackouts: BOOKING_BLACKOUTS }))
  .post('/booking/blackouts', ({ body }: any) => {
    const b = { id: String(_bkBlackoutSeq++), date: body.date, endDate: body.endDate, reason: body.reason }
    BOOKING_BLACKOUTS.push(b)
    BOOKING_BLACKOUTS.sort((a: any, b: any) => a.date.localeCompare(b.date))
    return { blackout: b }
  })
  .delete('/booking/blackouts/:id', ({ params, set }: any) => {
    const idx = BOOKING_BLACKOUTS.findIndex((b: any) => b.id === params.id)
    if (idx < 0) { set.status = 404; return { error: { message: 'not found' } } }
    BOOKING_BLACKOUTS.splice(idx, 1)
    return { ok: true }
  })

  .get('/settings/wallet-permissions', () => ({ walletPermissions: WALLET_PERMISSIONS }))
  .patch('/settings/wallet-permissions/:code', ({ params, body }: any) => {
    let p = WALLET_PERMISSIONS.find((x: any) => x.code === params.code)
    if (!p) {
      p = { code: params.code, name: '', desc: '', amount: 0, enabled: false, startDate: '', endDate: '' }
      WALLET_PERMISSIONS.push(p)
    }
    if (body.name      !== undefined) p.name      = body.name
    if (body.desc      !== undefined) p.desc      = body.desc
    if (body.amount    !== undefined) p.amount    = body.amount
    if (body.enabled   !== undefined) p.enabled   = body.enabled
    if (body.startDate !== undefined) p.startDate = body.startDate
    if (body.endDate   !== undefined) p.endDate   = body.endDate
    return { walletPermission: p }
  })

  .listen(4000)

console.log('\n🎭 Mock API Server รันที่ http://localhost:4000')
console.log('\n📋 Demo Accounts:')
console.log('  Parent:     STD-K1-0001 / Demo1234!   → /parent/dashboard')
console.log('  Admin:      admin@dulwich.ac.th / Admin1234!  → /admin/dashboard')
console.log('  Supervisor: patcha@school.local / Super123!  → /admin/dashboard')
console.log('  Cashier:    nong@school.local / Cashier123!  → /pos/sale')
console.log('  Enroll K1:  ENR-DEMO01  (ลงทะเบียนผู้ปกครองใหม่)')
console.log('  Enroll P3:  ENR-DEMO02  (ลงทะเบียนผู้ปกครองใหม่)\n')
