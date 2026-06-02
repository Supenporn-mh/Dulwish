import { connectDB } from './db/mongoose'
import {
  User, ParentStudent, Card, Wallet, Shop, MenuCategory,
  MenuItem, MealPeriod, BuffetPricing, Transaction, Policy, AuditLog, EnrollmentCode
} from './models'
import bcrypt from 'bcryptjs'

await connectDB()
console.log('[Seed] Connected to MongoDB')

async function clearAll() {
  await Promise.all([
    User.deleteMany({}), ParentStudent.deleteMany({}),
    Card.deleteMany({}), Wallet.deleteMany({}),
    Shop.deleteMany({}), MenuCategory.deleteMany({}),
    MenuItem.deleteMany({}), MealPeriod.deleteMany({}),
    BuffetPricing.deleteMany({}), Transaction.deleteMany({}),
    Policy.deleteMany({}), AuditLog.deleteMany({}),
    EnrollmentCode.deleteMany({}),
  ])
  console.log('[Seed] Cleared all collections')
}

await clearAll()

// ── Users ──────────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hashSync(pw, 10)

const student = await User.create({
  uid: 'STD-K1-0001',
  role: 'student',
  firstName: 'สมหญิง',
  lastName: 'ใจดี',
  displayName: 'สมหญิง K1-A',
  status: 'active',
  studentProfile: {
    gradeLevel: 'K1',
    className: 'K1-A',
    guardianEmail: 'suchart@example.com',
  },
})

const student2 = await User.create({
  uid: 'STD-P3-0015',
  role: 'student',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  displayName: 'สมชาย P3-B',
  status: 'active',
  studentProfile: {
    gradeLevel: 'P3',
    className: 'P3-B',
    guardianEmail: 'suchart@example.com',
  },
})

const parent = await User.create({
  uid: 'PRT-0001',
  role: 'parent',
  email: 'suchart@example.com',
  phone: '0812345678',
  passwordHash: hash('Demo1234!'),
  firstName: 'สุชาติ',
  lastName: 'ใจดี',
  status: 'active',
  pdpaAcceptedAt: new Date(),
})

const teacher = await User.create({
  uid: 'STF-001',
  role: 'teacher',
  email: 'anna@dulwich.ac.th',
  passwordHash: hash('Teacher123!'),
  firstName: 'Anna',
  lastName: 'Brown',
  status: 'active',
})

const cashier = await User.create({
  uid: 'CSH-001',
  role: 'cashier',
  email: 'nong@school.local',
  passwordHash: hash('Cashier123!'),
  firstName: 'หนอง',
  lastName: 'แคชเชียร์',
  status: 'active',
})

const supervisor = await User.create({
  uid: 'SUP-001',
  role: 'supervisor',
  email: 'patcha@school.local',
  passwordHash: hash('Super123!'),
  firstName: 'พัชรา',
  lastName: 'แมเนเจอร์',
  status: 'active',
})

const admin = await User.create({
  uid: 'ADM-001',
  role: 'admin',
  email: 'admin@dulwich.ac.th',
  passwordHash: hash('Admin1234!'),
  firstName: 'Admin',
  lastName: 'Dulwich',
  status: 'active',
})

const visitor = await User.create({
  uid: 'VIS-001',
  role: 'visitor',
  firstName: 'Visitor',
  lastName: 'Guest',
  status: 'active',
})

console.log('[Seed] Users created')

// ── Parent-Student links ───────────────────────────────────────────────────────
await ParentStudent.create([
  { parentUserId: parent._id, studentUserId: student._id,  isPrimary: true,  relationship: 'parent' },
  { parentUserId: parent._id, studentUserId: student2._id, isPrimary: false, relationship: 'parent' },
])
console.log('[Seed] Parent-Student links created')

// ── Enrollment Codes ──────────────────────────────────────────────────────────
const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
await EnrollmentCode.create([
  { code: 'ENR-DEMO01', studentUserId: student._id,  expiresAt: expires, createdBy: admin._id },
  { code: 'ENR-DEMO02', studentUserId: student2._id, expiresAt: expires, createdBy: admin._id },
])
console.log('[Seed] Enrollment codes created')

// ── Cards ─────────────────────────────────────────────────────────────────────
await Card.create([
  { cardUid: 'STD-K1-0001', userId: student._id,   cardType: 'student' },
  { cardUid: 'STD-P3-0015', userId: student2._id,  cardType: 'student' },
  { cardUid: 'STF-ANNA-01', userId: teacher._id,   cardType: 'staff' },
  { cardUid: 'VIS-001',     userId: visitor._id,   cardType: 'visitor_temp' },
])
console.log('[Seed] Cards created')

// ── Wallets ───────────────────────────────────────────────────────────────────
const walletData = [
  { userId: student._id,    balance: 850,  negativeLimit: 100, lowThreshold: 200 },
  { userId: student2._id,   balance: 320,  negativeLimit: 100, lowThreshold: 200 },
  { userId: parent._id,     balance: 0 },
  { userId: teacher._id,    balance: 320,  negativeLimit: 100, lowThreshold: 200 },
  { userId: cashier._id,    balance: 0 },
  { userId: supervisor._id, balance: 0 },
  { userId: admin._id,      balance: 0 },
  { userId: visitor._id,    balance: 500,  negativeLimit: 0 },
]
const wallets = await Wallet.insertMany(walletData)
console.log('[Seed] Wallets created')

// ── Shops ─────────────────────────────────────────────────────────────────────
const buffetShop = await Shop.create({ code: 'BUFFET', name: 'Canteen Buffet', type: 'buffet' })
const cafeShop   = await Shop.create({ code: 'CAFE',   name: 'Cafe Corner',   type: 'a_la_carte' })
console.log('[Seed] Shops created')

// ── Menu Categories ────────────────────────────────────────────────────────────
const catDrink  = await MenuCategory.create({ shopId: cafeShop._id, name: 'เครื่องดื่ม', sortOrder: 0 })
const catFood   = await MenuCategory.create({ shopId: cafeShop._id, name: 'อาหาร', sortOrder: 1 })
const catSnack  = await MenuCategory.create({ shopId: cafeShop._id, name: 'ของว่าง', sortOrder: 2 })
console.log('[Seed] Categories created')

// ── Menu Items ────────────────────────────────────────────────────────────────
await MenuItem.insertMany([
  { shopId: cafeShop._id, categoryId: catDrink._id, sku: 'LATTE',    name: 'Latte',          price: 65,  isPreorderable: false, availableFrom: '07:00', availableTo: '17:00' },
  { shopId: cafeShop._id, categoryId: catDrink._id, sku: 'ESPRESSO', name: 'Espresso',        price: 55,  isPreorderable: false, availableFrom: '07:00', availableTo: '17:00' },
  { shopId: cafeShop._id, categoryId: catDrink._id, sku: 'OJ',       name: 'Orange Juice',    price: 45,  isPreorderable: true,  availableFrom: '07:00', availableTo: '13:00' },
  { shopId: cafeShop._id, categoryId: catDrink._id, sku: 'WATER',    name: 'Water Bottle',    price: 15,  isPreorderable: false },
  { shopId: cafeShop._id, categoryId: catFood._id,  sku: 'SAND-HAM', name: 'Ham Sandwich',    price: 85,  isPreorderable: true,  dailyQuota: 30 },
  { shopId: cafeShop._id, categoryId: catFood._id,  sku: 'SAND-VEG', name: 'Veggie Sandwich', price: 75,  isPreorderable: true,  dailyQuota: 20 },
  { shopId: cafeShop._id, categoryId: catFood._id,  sku: 'WRAP-CHK', name: 'Chicken Wrap',    price: 95,  isPreorderable: true,  dailyQuota: 25 },
  { shopId: cafeShop._id, categoryId: catSnack._id, sku: 'MUFFIN',   name: 'Blueberry Muffin',price: 45,  isPreorderable: false },
  { shopId: cafeShop._id, categoryId: catSnack._id, sku: 'COOKIE',   name: 'Chocolate Cookie',price: 35,  isPreorderable: false },
  { shopId: cafeShop._id, categoryId: catSnack._id, sku: 'BROWNIE',  name: 'Brownie',          price: 40,  isPreorderable: false },
])
console.log('[Seed] Menu items created')

// ── Meal Periods ──────────────────────────────────────────────────────────────
const breakfast = await MealPeriod.create({
  code: 'BREAKFAST', name: 'Breakfast', startTime: '07:30', endTime: '09:00', cutoffMinutes: 180, seatCapacity: 200,
})
const lunch = await MealPeriod.create({
  code: 'LUNCH', name: 'Lunch', startTime: '11:30', endTime: '13:30', cutoffMinutes: 180, seatCapacity: 300,
})
const dinner = await MealPeriod.create({
  code: 'DINNER', name: 'Dinner', startTime: '17:00', endTime: '18:30', cutoffMinutes: 180, seatCapacity: 150,
})
console.log('[Seed] Meal periods created')

// ── Buffet Pricing ────────────────────────────────────────────────────────────
const effectiveFrom = new Date('2026-08-01')
await BuffetPricing.insertMany([
  { userGroup: 'primary',   price: 170, effectiveFrom },
  { userGroup: 'secondary', price: 150, effectiveFrom },
  { userGroup: 'staff',     price: 150, effectiveFrom },
  { userGroup: 'visitor',   price: 200, effectiveFrom },
])
console.log('[Seed] Buffet pricing created')

// ── Sample Transactions ────────────────────────────────────────────────────────
const studentWallet = wallets.find(w => String(w.userId) === String(student._id))!
await Transaction.insertMany([
  {
    refNo: 'TXN20260801-000001',
    walletId: studentWallet._id,
    type: 'topup',
    amount: 1000,
    balanceAfter: 1850,
    channel: 'mobile_web',
    paymentMethod: 'scb_qr',
    paymentRef: 'SCB-MOCK-001',
    status: 'success',
    createdAt: new Date('2026-08-01T09:00:00Z'),
  },
  {
    refNo: 'TXN20260801-000002',
    walletId: studentWallet._id,
    type: 'buffet',
    amount: -170,
    balanceAfter: 1680,
    channel: 'pos',
    paymentMethod: 'card_wallet',
    status: 'success',
    createdAt: new Date('2026-08-01T11:35:00Z'),
  },
  {
    refNo: 'TXN20260801-000003',
    walletId: studentWallet._id,
    type: 'purchase',
    amount: -65,
    balanceAfter: 850,
    channel: 'pos',
    paymentMethod: 'card_wallet',
    status: 'success',
    createdAt: new Date('2026-08-02T10:15:00Z'),
  },
])
console.log('[Seed] Transactions created')

// ── Policies ──────────────────────────────────────────────────────────────────
await Policy.insertMany([
  { key: 'negative_balance_limit', value: 100, description: 'Default negative balance limit (THB)' },
  { key: 'low_balance_threshold',  value: 200, description: 'Warn parent when balance below this (THB)' },
  { key: 'topup_min',              value: 20,  description: 'Minimum topup amount (THB)' },
  { key: 'topup_max',              value: 5000,description: 'Maximum topup amount (THB)' },
  { key: 'preorder_max_days',      value: 7,   description: 'How many days ahead parent can pre-order' },
  { key: 'otp_ttl_minutes',        value: 5,   description: 'OTP TTL in minutes' },
  { key: 'verification_code_ttl_days', value: 14, description: 'Parent verification code TTL (days)' },
])
console.log('[Seed] Policies created')

console.log('\n✅ Seed completed!')
console.log('\n📋 Demo Accounts:')
console.log('  Parent:     suchart@example.com  / Demo1234!   → localhost:3001')
console.log('  Admin:      admin@dulwich.ac.th  / Admin1234!  → localhost:3002')
console.log('  Supervisor: patcha@school.local  / Super123!   → localhost:3002')
console.log('  Cashier:    nong@school.local    / Cashier123! → localhost:3003')
console.log('  Teacher:    anna@dulwich.ac.th   / Teacher123! → localhost:3003')
console.log('  Kiosk card: STD-K1-0001          (tap)         → localhost:3004')
console.log('  Visitor:    VIS-001              (tap)         → localhost:3004')
console.log('  Enroll K1:  ENR-DEMO01  (รหัสลงทะเบียนผู้ปกครอง สมหญิง K1-A)')
console.log('  Enroll P3:  ENR-DEMO02  (รหัสลงทะเบียนผู้ปกครอง สมชาย P3-B)')

process.exit(0)
