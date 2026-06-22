/**
 * seed.ts — ข้อมูลตัวอย่างครอบทุก use-case + ทุก status ที่เป็นไปได้
 *
 * รัน:  bun run src/seed.ts
 *
 * ลำดับ dependency:
 *   GradeLevel → AcademicYear → Branch → StoreSettings → Shop
 *   → Kitchen / Unit / ProductCategory → Product
 *   → User (all 8 roles) → ParentStudent → EnrollmentCode
 *   → Card → Wallet → WalletPermission → MemberGroup
 *   → MenuCategory → MenuItem → MealPeriod
 *   → BookingTimeSlot → BookingMenu → Policy(booking config)
 *   → BuffetRound → BuffetPricing → BuffetConfig → BuffetBlackout
 *   → Transaction(topup) → Order → Transaction(purchase)
 *   → Booking → BuffetSession → Transaction(buffet)
 *   → Feedback → AuditLog
 *
 * ⚠️  DATA GAPS พบระหว่างเขียน seed (อ่านด้านล่าง)
 */

import { connectDB } from './db/mongoose'
import bcrypt from 'bcryptjs'
import {
  User, ParentStudent, EnrollmentCode,
  Card, Wallet, Transaction,
  Shop, MenuCategory, MenuItem, MealPeriod,
  BuffetRound, BuffetPricing, BuffetSession,
  Order, AuditLog, Feedback, Policy,
  ProductCategory, Unit, Kitchen, Product,
  BookingTimeSlot, BookingMenu, Booking,
  MemberGroup, WalletPermission,
  AcademicYear, GradeLevel,
  Branch, StoreSettings,
  BuffetConfig, BuffetBlackout,
  BuffetCategory,
  Device, Notification,
  BookingConfig, BookingBlackout,
} from './models'

await connectDB()
console.log('[Seed] Connected to MongoDB')

// ── 0. WIPE ───────────────────────────────────────────────────────────────────
await Promise.all([
  User.deleteMany({}),         ParentStudent.deleteMany({}), EnrollmentCode.deleteMany({}),
  Card.deleteMany({}),         Wallet.deleteMany({}),        Transaction.deleteMany({}),
  Shop.deleteMany({}),         MenuCategory.deleteMany({}),  MenuItem.deleteMany({}),
  MealPeriod.deleteMany({}),   BuffetRound.deleteMany({}),   BuffetPricing.deleteMany({}),
  BuffetSession.deleteMany({}),Order.deleteMany({}),          AuditLog.deleteMany({}),
  Feedback.deleteMany({}),     Policy.deleteMany({}),
  ProductCategory.deleteMany({}), Unit.deleteMany({}),       Kitchen.deleteMany({}),
  Product.deleteMany({}),      BookingTimeSlot.deleteMany({}), BookingMenu.deleteMany({}),
  Booking.deleteMany({}),      MemberGroup.deleteMany({}),   WalletPermission.deleteMany({}),
  AcademicYear.deleteMany({}), GradeLevel.deleteMany({}),
  Branch.deleteMany({}),       StoreSettings.deleteMany({}),
  BuffetConfig.deleteMany({}), BuffetBlackout.deleteMany({}),
  BuffetCategory.deleteMany({}),
  Device.deleteMany({}), Notification.deleteMany({}),
  BookingConfig.deleteMany({}),BookingBlackout.deleteMany({}),
])
console.log('[Seed] Wiped all collections')

// ── 1. GRADE LEVELS ───────────────────────────────────────────────────────────
const [g1, g2, g3, g4, g5, g6, gStaff] = await GradeLevel.insertMany([
  { code: 'M1',    name: 'ม.1',          sortOrder: 1,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'M2',    name: 'ม.2',          sortOrder: 2,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'M3',    name: 'ม.3',          sortOrder: 3,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'M4',    name: 'ม.4',          sortOrder: 4,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'M5',    name: 'ม.5',          sortOrder: 5,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'M6',    name: 'ม.6',          sortOrder: 6,  gradeGroup: 'secondary', canRepeat: false },
  { code: 'STAFF', name: 'ครู/พนักงาน', sortOrder: 10, gradeGroup: 'staff',     canRepeat: true  },
])
console.log('[Seed] GradeLevels created')

// ── 2. ACADEMIC YEAR ──────────────────────────────────────────────────────────
await AcademicYear.create({
  year: '2568',
  active: true,
  semesters: [
    { name: 'ภาคเรียนที่ 1', startDate: '2025-05-19', endDate: '2025-10-10' },
    { name: 'ภาคเรียนที่ 2', startDate: '2025-11-03', endDate: '2026-03-20' },
  ],
})
console.log('[Seed] AcademicYear created')

// ── 3. BRANCH & STORE ─────────────────────────────────────────────────────────
await Branch.create({ code: 'DLW', name: 'Dulwich Bangkok' })
await StoreSettings.create({
  key:     'default',
  name:    'โรงเรียน Dulwich Bangkok',
  address: '999 ถ.สุขุมวิท แขวงพระโขนง กรุงเทพฯ 10260',
  taxId:   '0105556094551',
})
console.log('[Seed] Branch & StoreSettings created')

// ── 4. SHOPS ──────────────────────────────────────────────────────────────────
const shopCanteen = await Shop.create({ code: 'CANTEEN', name: 'โรงอาหาร',      type: 'a_la_carte', active: true  })
const shopBuffet  = await Shop.create({ code: 'BUFFET',  name: 'Buffet Corner', type: 'buffet',     active: true  })
const shopCafe    = await Shop.create({ code: 'CAFE',    name: 'Café Corner',   type: 'mixed',      active: false }) // ยังไม่เปิด
console.log('[Seed] Shops created')

// ── 5. USERS ──────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hashSync(pw, 10)
const PW   = 'Demo1234!'

const uAdmin = await User.create({
  uid: 'ADM-001', role: 'admin', email: 'admin@dulwich.ac.th',
  firstName: 'วิชัย', lastName: 'สิทธิ์โสภณ',
  passwordHash: hash('Admin1234!'), status: 'active',
})
const uSuper = await User.create({
  uid: 'SUP-001', role: 'supervisor', email: 'supervisor@dulwich.ac.th',
  firstName: 'สมใจ', lastName: 'จันทร์พิมพ์',
  passwordHash: hash('Super123!'), status: 'active',
})
const uCashier = await User.create({
  uid: 'CSH-001', role: 'cashier', email: 'cashier@dulwich.ac.th',
  firstName: 'ธนกฤต', lastName: 'มาลัยรัตน์',
  passwordHash: hash('Cashier123!'), status: 'active',
})
// Parents
const uParent1 = await User.create({
  uid: 'PAR-001', role: 'parent', email: 'ruttana@gmail.com', phone: '0812345678',
  firstName: 'รัตนา', lastName: 'ศรีวิไล',
  passwordHash: hash(PW), status: 'active', pdpaAcceptedAt: new Date('2025-05-19'),
})
const uParent2 = await User.create({
  uid: 'PAR-002', role: 'parent', email: 'prasit@gmail.com', phone: '0898765432',
  firstName: 'ประสิทธิ์', lastName: 'อ่วมเอี่ยม',
  passwordHash: hash(PW), status: 'active', pdpaAcceptedAt: new Date('2025-05-20'),
})
// Students
const uStudent1 = await User.create({
  uid: 'STU-001', role: 'student', email: 'nirun@dulwich.ac.th',
  firstName: 'นิรันดร์', lastName: 'ศรีวิไล', status: 'active',
  studentProfile: { gradeLevel: 'M3', dob: new Date('2012-04-12'), guardianEmail: 'ruttana@gmail.com' },
})
const uStudent2 = await User.create({
  uid: 'STU-002', role: 'student', email: 'pimjai@dulwich.ac.th',
  firstName: 'พิมพ์ใจ', lastName: 'ศรีวิไล', status: 'active',
  studentProfile: { gradeLevel: 'M1', dob: new Date('2014-08-25'), guardianEmail: 'ruttana@gmail.com' },
})
const uStudent3 = await User.create({
  uid: 'STU-003', role: 'student', email: 'tossapol@dulwich.ac.th',
  firstName: 'ทศพล', lastName: 'อ่วมเอี่ยม', status: 'active',
  studentProfile: { gradeLevel: 'M4', dob: new Date('2011-01-30'), guardianEmail: 'prasit@gmail.com' },
})
// Member (staff role)
const uMember = await User.create({
  uid: 'MEM-001', role: 'staff', email: 'somchai@dulwich.ac.th', phone: '0854321678',
  firstName: 'สมชาย', lastName: 'วงษ์สุวรรณ',
  passwordHash: hash(PW), status: 'active',
})
// Teacher
const uTeacher = await User.create({
  uid: 'TCH-001', role: 'teacher', email: 'anna@dulwich.ac.th',
  firstName: 'Anna', lastName: 'Brown',
  passwordHash: hash('Teacher123!'), status: 'active',
})
// Visitor
const uVisitor = await User.create({
  uid: 'VIS-001', role: 'visitor',
  firstName: 'รัตนา', lastName: 'คำสุข', status: 'active',
})
// Suspended user
await User.create({
  uid: 'STU-999', role: 'student', email: 'suspended@dulwich.ac.th',
  firstName: 'ทดสอบ', lastName: 'ระงับ', status: 'suspended',
  studentProfile: { gradeLevel: 'M2' },
})
console.log('[Seed] Users created (all roles)')

// ── 6. PARENT-STUDENT LINKS ───────────────────────────────────────────────────
await ParentStudent.insertMany([
  { parentUserId: uParent1._id, studentUserId: uStudent1._id, relationship: 'mother', isPrimary: true,  boundAt: new Date('2025-05-19') },
  { parentUserId: uParent1._id, studentUserId: uStudent2._id, relationship: 'mother', isPrimary: true,  boundAt: new Date('2025-05-19') },
  { parentUserId: uParent2._id, studentUserId: uStudent3._id, relationship: 'father', isPrimary: true,  boundAt: new Date('2025-05-20') },
])
console.log('[Seed] ParentStudent links created')

// ── 7. ENROLLMENT CODES  (4 states) ──────────────────────────────────────────
//  ✅ used-by-parent  ✅ used-by-member  ⏳ pending  ❌ expired
const exp30  = new Date(Date.now() + 30 * 86400000)
const expOld = new Date('2025-01-01')
await EnrollmentCode.insertMany([
  { code: 'ENR-STU001', studentUserId: uStudent1._id, used: true,  usedAt: new Date('2025-05-19'), usedByParentId: uParent1._id, expiresAt: exp30, createdBy: uAdmin._id },
  { code: 'ENR-STU002', studentUserId: uStudent2._id, used: true,  usedAt: new Date('2025-05-19'), usedByParentId: uParent1._id, expiresAt: exp30, createdBy: uAdmin._id },
  { code: 'ENR-MEM001', memberUserId: uMember._id,   used: true,  usedAt: new Date('2025-05-20'), usedByMemberId: uMember._id,  expiresAt: exp30, createdBy: uAdmin._id },
  { code: 'ENR-STU003', studentUserId: uStudent3._id, used: false, expiresAt: exp30,  createdBy: uAdmin._id },  // ⏳ parent2 ยังไม่ scan
  { code: 'ENR-EXP001', studentUserId: uStudent3._id, used: false, expiresAt: expOld, createdBy: uAdmin._id },  // ❌ หมดอายุ
])
console.log('[Seed] EnrollmentCodes created (all 4 states)')

// ── 8. CARDS ──────────────────────────────────────────────────────────────────
await Card.insertMany([
  { cardUid: 'RFID-A1B2C3D4', userId: uStudent1._id, cardType: 'student', status: 'active'   },
  { cardUid: 'RFID-E5F6G7H8', userId: uStudent2._id, cardType: 'student', status: 'active'   },
  { cardUid: 'RFID-I9J0K1L2', userId: uStudent3._id, cardType: 'student', status: 'active'   },
  { cardUid: 'RFID-M3N4O5P6', userId: uMember._id,   cardType: 'staff',   status: 'active'   },
  { cardUid: 'RFID-ANNA01',   userId: uTeacher._id,  cardType: 'staff',   status: 'active'   },
  { cardUid: 'RFID-LOST0001', userId: uStudent1._id, cardType: 'student', status: 'lost',     reason: 'แจ้งหาย 2025-06-01' },
  { cardUid: 'RFID-TEMP0001', userId: uVisitor._id,  cardType: 'visitor_temp', status: 'inactive' },
])
console.log('[Seed] Cards created (active, lost, inactive)')

// ── 9. WALLETS ────────────────────────────────────────────────────────────────
const wStudent1 = await Wallet.create({ userId: uStudent1._id, balance: 500,  negativeLimit: 0,   lowThreshold: 200 })
const wStudent2 = await Wallet.create({ userId: uStudent2._id, balance: 150,  negativeLimit: 0,   lowThreshold: 200 })  // ยอดต่ำ
const wStudent3 = await Wallet.create({ userId: uStudent3._id, balance: 0,    negativeLimit: 0,   lowThreshold: 200 })  // หมด
const wMember   = await Wallet.create({ userId: uMember._id,   balance: 1200, negativeLimit: 100, lowThreshold: 300 })
const wTeacher  = await Wallet.create({ userId: uTeacher._id,  balance: 800,  negativeLimit: 100, lowThreshold: 200 })
await Wallet.create({ userId: uParent1._id, balance: 0 })
await Wallet.create({ userId: uParent2._id, balance: 0 })
await Wallet.create({ userId: uCashier._id, balance: 0 })
await Wallet.create({ userId: uSuper._id,   balance: 0 })
await Wallet.create({ userId: uAdmin._id,   balance: 0 })
const wVisitor  = await Wallet.create({ userId: uVisitor._id,  balance: 300,  negativeLimit: 0 })
console.log('[Seed] Wallets created')

// ── 10. WALLET PERMISSIONS ────────────────────────────────────────────────────
await WalletPermission.insertMany([
  { code: 'TOPUP_DAILY',    name: 'วงเงิน Topup ต่อวัน',    desc: 'สูงสุด 2,000 ต่อครั้ง', amount: 2000, enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { code: 'PURCHASE_DAILY', name: 'วงเงิน Purchase ต่อวัน', desc: 'สูงสุด 500 ต่อวัน',    amount: 500,  enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { code: 'BUFFET_WEEKLY',  name: 'จำกัด Buffet ต่อสัปดาห์',desc: 'ไม่เกิน 5 ครั้ง',     amount: 5,    enabled: false, startDate: '2025-05-19', endDate: '2026-03-31' },
])
console.log('[Seed] WalletPermissions created')

// ── 11. MEMBER GROUPS ─────────────────────────────────────────────────────────
await MemberGroup.insertMany([
  {
    code: 'GRP-STAFF', name: 'กลุ่มครู-พนักงาน', kind: 'member',
    permissions: ['canteen_discount', 'buffet_staff_price'],
    members: [{ userId: uMember._id, joinedAt: new Date('2025-05-19') }, { userId: uTeacher._id, joinedAt: new Date('2025-05-19') }],
  },
  {
    code: 'GRP-M123', name: 'กลุ่มนักเรียน ม.ต้น', kind: 'student',
    permissions: ['preorder_lunch', 'buffet_student_price'],
    members: [{ userId: uStudent1._id, joinedAt: new Date('2025-05-19') }, { userId: uStudent2._id, joinedAt: new Date('2025-05-19') }],
  },
  {
    code: 'GRP-M456', name: 'กลุ่มนักเรียน ม.ปลาย', kind: 'student',
    permissions: ['preorder_lunch', 'buffet_student_price'],
    members: [{ userId: uStudent3._id, joinedAt: new Date('2025-05-20') }],
  },
])
console.log('[Seed] MemberGroups created')

// ── 12. PRODUCT CATALOG ───────────────────────────────────────────────────────
await Kitchen.insertMany([
  { code: 'KIT01', name: 'ครัวใหญ่' },
  { code: 'KIT02', name: 'ครัวเครื่องดื่ม' },
])
await Unit.insertMany([
  { name: 'จาน' }, { name: 'ชาม' }, { name: 'แก้ว' },
  { name: 'ชิ้น' }, { name: 'กล่อง' },
])
await ProductCategory.insertMany([
  { code: 'FOOD',  name: 'อาหาร',      imageUrl: '' },
  { code: 'DRINK', name: 'เครื่องดื่ม', imageUrl: '' },
  { code: 'SNACK', name: 'ของว่าง',    imageUrl: '' },
])
await Product.insertMany([
  { code: 'PRD001', name: 'ข้าวผัดกุ้ง',      price: 55, cost: 30, categoryCode: 'FOOD',  kitchenCode: 'KIT01', unit: 'จาน',  active: true  },
  { code: 'PRD002', name: 'ข้าวมันไก่',        price: 50, cost: 28, categoryCode: 'FOOD',  kitchenCode: 'KIT01', unit: 'จาน',  active: true  },
  { code: 'PRD003', name: 'ก๋วยเตี๋ยวหมู',    price: 45, cost: 25, categoryCode: 'FOOD',  kitchenCode: 'KIT01', unit: 'ชาม',  active: true  },
  { code: 'PRD004', name: 'น้ำส้มคั้น',        price: 25, cost: 10, categoryCode: 'DRINK', kitchenCode: 'KIT02', unit: 'แก้ว', active: true  },
  { code: 'PRD005', name: 'ชาไทย',            price: 30, cost: 12, categoryCode: 'DRINK', kitchenCode: 'KIT02', unit: 'แก้ว', active: true  },
  { code: 'PRD006', name: 'Latte',            price: 65, cost: 25, categoryCode: 'DRINK', kitchenCode: 'KIT02', unit: 'แก้ว', active: true  },
  { code: 'PRD007', name: 'Ham Sandwich',     price: 85, cost: 40, categoryCode: 'FOOD',  kitchenCode: 'KIT01', unit: 'ชิ้น', active: true  },
  { code: 'PRD008', name: 'ข้าวผัดหมู (ปิด)', price: 45, cost: 24, categoryCode: 'FOOD',  kitchenCode: 'KIT01', unit: 'จาน',  active: false },
])
console.log('[Seed] Products created')

// ── 13. MENU ITEMS (canteen shop) ─────────────────────────────────────────────
const catMain = await MenuCategory.create({ shopId: shopCanteen._id, name: 'อาหารจานหลัก', sortOrder: 1 })
const catBev  = await MenuCategory.create({ shopId: shopCanteen._id, name: 'เครื่องดื่ม',  sortOrder: 2 })
const catCafe = await MenuCategory.create({ shopId: shopCafe._id,    name: 'Coffee',       sortOrder: 1 })

const miChicken = await MenuItem.create({ shopId: shopCanteen._id, categoryId: catMain._id, sku: 'M001', name: 'ข้าวมันไก่',     price: 50, active: true,  isPreorderable: true,  availableFrom: '10:30', availableTo: '13:30', dailyQuota: 80 })
const miRice    = await MenuItem.create({ shopId: shopCanteen._id, categoryId: catMain._id, sku: 'M002', name: 'ข้าวผัดกุ้ง',   price: 55, active: true,  isPreorderable: true,  availableFrom: '10:30', availableTo: '13:30', dailyQuota: 50 })
const miNoodle  = await MenuItem.create({ shopId: shopCanteen._id, categoryId: catMain._id, sku: 'M003', name: 'ก๋วยเตี๋ยวหมู', price: 45, active: true,  isPreorderable: false })
const miTea     = await MenuItem.create({ shopId: shopCanteen._id, categoryId: catBev._id,  sku: 'M004', name: 'ชาไทย',         price: 30, active: true,  isPreorderable: false })
const miJuice   = await MenuItem.create({ shopId: shopCanteen._id, categoryId: catBev._id,  sku: 'M005', name: 'น้ำส้มคั้น',     price: 25, active: false, isPreorderable: false })  // ปิด
await MenuItem.create({ shopId: shopCafe._id, categoryId: catCafe._id, sku: 'C001', name: 'Latte', price: 65, active: true, isPreorderable: false })
console.log('[Seed] MenuCategories + MenuItems created')

// ── 14. MEAL PERIODS ─────────────────────────────────────────────────────────
const mpBreak = await MealPeriod.create({ code: 'BREAK', name: 'มื้อเช้า',    startTime: '07:00', endTime: '08:30', cutoffMinutes: 120, seatCapacity: 80,  active: true  })
const mpLunch = await MealPeriod.create({ code: 'LUNCH', name: 'มื้อกลางวัน', startTime: '11:00', endTime: '12:30', cutoffMinutes: 180, seatCapacity: 200, active: true  })
await MealPeriod.create({ code: 'DINNER', name: 'มื้อเย็น', startTime: '17:00', endTime: '18:30', cutoffMinutes: 180, seatCapacity: 100, active: false })  // ปิด
console.log('[Seed] MealPeriods created')

// ── 15. BOOKING TIME SLOTS ────────────────────────────────────────────────────
const btsBreak = await BookingTimeSlot.create({ name: 'Breakfast', meal: 'breakfast', startTime: '07:00', endTime: '08:30', capacity: 50,  cutoffHours: 2, description: 'มื้อเช้า',    enabled: true })
const btsLunch = await BookingTimeSlot.create({ name: 'Lunch',     meal: 'lunch',     startTime: '11:00', endTime: '12:30', capacity: 100, cutoffHours: 3, description: 'มื้อกลางวัน', enabled: true })
console.log('[Seed] BookingTimeSlots created')

// ── 16. BOOKING MENUS ─────────────────────────────────────────────────────────
await BookingMenu.insertMany([
  { name: 'ข้าวต้มหมู',         ingredient: 'หมู,ข้าว',    timeSlot: 'breakfast', enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { name: 'ข้าวไข่ดาว',         ingredient: 'ไข่,ข้าว',    timeSlot: 'breakfast', enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { name: 'ข้าวผัดกระเพราหมู',  ingredient: 'หมู,กะเพรา',  timeSlot: 'lunch',     enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { name: 'ข้าวมันไก่',          ingredient: 'ไก่,ข้าว',    timeSlot: 'lunch',     enabled: true,  startDate: '2025-05-19', endDate: '2026-03-31' },
  { name: 'ข้าวหมูกรอบ',         ingredient: 'หมู,ข้าว',    timeSlot: 'lunch',     enabled: false, startDate: '2025-05-19', endDate: '2025-12-31' },  // ปิด
])
console.log('[Seed] BookingMenus created')

// ── 17. BOOKING CONFIG & BLACKOUT (now proper models, not Policy) ────────────
await BookingConfig.create({ key: 'default', openDays: [1,2,3,4,5] })
await BookingBlackout.insertMany([
  { date: '2025-12-05',                        reason: 'วันพ่อแห่งชาติ' },
  { date: '2025-12-10',                        reason: 'วันรัฐธรรมนูญ' },
  { date: '2026-04-12', endDate: '2026-04-17', reason: 'สงกรานต์' },
])
console.log('[Seed] BookingConfig + BookingBlackout created')

await Policy.insertMany([
  { key: 'negative_balance_limit', value: 100, description: 'Default negative balance limit (THB)' },
  { key: 'low_balance_threshold',  value: 200, description: 'Warn parent when balance below this (THB)' },
  { key: 'topup_min',              value: 20,  description: 'Minimum topup amount (THB)' },
  { key: 'topup_max',              value: 5000,description: 'Maximum topup amount (THB)' },
  { key: 'preorder_max_days',      value: 7,   description: 'How many days ahead parent can pre-order' },
  { key: 'otp_ttl_minutes',        value: 5,   description: 'OTP TTL in minutes' },
  { key: 'pdpa.version',           value: '1.2', description: 'เวอร์ชัน PDPA' },
  { key: 'receipt.footer',         value: 'ขอบคุณที่ใช้บริการ Dulwich Bangkok', description: 'ข้อความท้ายใบเสร็จ' },
])
console.log('[Seed] Policies created')

// ── 18. BUFFET ROUNDS ─────────────────────────────────────────────────────────
const bfRound1 = await BuffetRound.create({ name: 'รอบเช้า',     startTime: '07:00', endTime: '09:00', active: true,  sortOrder: 1 })
const bfRound2 = await BuffetRound.create({ name: 'รอบกลางวัน', startTime: '11:30', endTime: '13:30', active: true,  sortOrder: 2 })
const bfRound3 = await BuffetRound.create({ name: 'รอบบ่าย',     startTime: '14:00', endTime: '16:00', active: false, sortOrder: 3 })  // ปิด
console.log('[Seed] BuffetRounds created (2 active, 1 inactive)')

// ── 18b. BUFFET CATEGORIES ──────────────────────────────────────────────────
const [bfCatStd, bfCatPremium] = await BuffetCategory.insertMany([
  { code: 'STD',     name: 'มาตรฐาน',  active: true, sortOrder: 1 },
  { code: 'PREMIUM', name: 'พรีเมียม', active: true, sortOrder: 2 },
])
console.log('[Seed] BuffetCategories created')

// ── 19. BUFFET PRICING ────────────────────────────────────────────────────────
// ⚠️  seed เดิมใช้ `userGroup` ผิด field — schema ใช้ `userType` enum ['member','student']
const pFrom = new Date('2025-05-19')
await BuffetPricing.insertMany([
  // นักเรียน ม.1-3  ราคาเดียวทุกรอบ (หมวดมาตรฐาน)
  { userType: 'student', gradeLevelId: g1._id, buffetRoundId: null,         categoryIds: [bfCatStd._id],     price: 85,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g2._id, buffetRoundId: null,         categoryIds: [bfCatStd._id],     price: 85,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g3._id, buffetRoundId: null,         categoryIds: [bfCatStd._id],     price: 85,  effectiveFrom: pFrom },
  // นักเรียน ม.4-6  แยกตามรอบ
  { userType: 'student', gradeLevelId: g4._id, buffetRoundId: bfRound1._id, categoryIds: [bfCatStd._id],     price: 90,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g4._id, buffetRoundId: bfRound2._id, categoryIds: [bfCatStd._id],     price: 95,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g5._id, buffetRoundId: bfRound1._id, categoryIds: [bfCatStd._id],     price: 90,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g5._id, buffetRoundId: bfRound2._id, categoryIds: [bfCatStd._id],     price: 95,  effectiveFrom: pFrom },
  { userType: 'student', gradeLevelId: g6._id, buffetRoundId: null,         categoryIds: [bfCatPremium._id], price: 100, effectiveFrom: pFrom },
  // staff / member  ราคาเดียว (หมวดพรีเมียม)
  { userType: 'member', gradeLevelId: null, buffetRoundId: null, categoryIds: [bfCatPremium._id], price: 120, effectiveFrom: pFrom },
])
console.log('[Seed] BuffetPricing created (student by grade + member flat)')

// ── 20. BUFFET CONFIG & BLACKOUT ─────────────────────────────────────────────
await BuffetConfig.create({ key: 'default', openDays: [1,2,3,4,5] })
await BuffetBlackout.insertMany([
  { date: '2025-12-31',                         reason: 'ปีใหม่' },
  { date: '2026-04-12', endDate: '2026-04-17',  reason: 'สงกรานต์' },
])
console.log('[Seed] BuffetConfig + BuffetBlackout created')

// ── 21. TRANSACTIONS — Topup (ทุก channel, ทุก status) ───────────────────────
const txTopup1 = await Transaction.create({
  refNo: 'TXN-TOP-0001', walletId: wStudent1._id, type: 'topup',
  amount: 500, balanceAfter: 500, channel: 'kiosk',
  paymentMethod: 'cash', deviceId: 'KIOSK-01', cashierId: uCashier._id, status: 'success',
})
const txTopup2 = await Transaction.create({
  refNo: 'TXN-TOP-0002', walletId: wStudent2._id, type: 'topup',
  amount: 200, balanceAfter: 200, channel: 'pos',
  paymentMethod: 'qr_promptpay', paymentRef: 'QRREF20250601', cashierId: uCashier._id, status: 'success',
})
const txTopup3 = await Transaction.create({
  refNo: 'TXN-TOP-0003', walletId: wMember._id, type: 'topup',
  amount: 1200, balanceAfter: 1200, channel: 'pos',
  paymentMethod: 'cash', cashierId: uCashier._id, status: 'success',
})
await Transaction.create({  // ❌ failed
  refNo: 'TXN-TOP-0004', walletId: wStudent3._id, type: 'topup',
  amount: 500, balanceAfter: 0, channel: 'kiosk',
  paymentMethod: 'cash', deviceId: 'KIOSK-01', cashierId: uCashier._id, status: 'failed',
  note: 'ใส่ธนบัตรไม่ผ่าน',
})
console.log('[Seed] Topup transactions created (success + failed)')

// ── 22. ORDERS + purchase transactions ───────────────────────────────────────
// Case A: confirmed — parent1 จอง lunch ให้ student1 (ยังไม่รับอาหาร)
const order1 = await Order.create({
  orderNo: 'ORD-20250609-001', studentUserId: uStudent1._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-09', totalAmount: 125, status: 'confirmed',
  items: [
    { menuItemId: miChicken._id, qty: 1, unitPrice: 50, lineTotal: 50 },
    { menuItemId: miTea._id,     qty: 1, unitPrice: 30, lineTotal: 30 },
    { menuItemId: miNoodle._id,  qty: 1, unitPrice: 45, lineTotal: 45, note: 'ไม่ใส่ผักชี' },
  ],
})
const txOrd1 = await Transaction.create({
  refNo: 'TXN-PUR-0001', walletId: wStudent1._id, type: 'purchase',
  amount: -125, balanceAfter: 375, channel: 'mobile',
  relatedOrderId: order1._id, paymentMethod: 'maemoney', paymentRef: 'MM20250609001', status: 'success',
})
await Order.findByIdAndUpdate(order1._id, { transactionId: txOrd1._id })

// Case B: redeemed — cashier สแกนแล้ว
const order2 = await Order.create({
  orderNo: 'ORD-20250608-001', studentUserId: uStudent2._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpBreak._id,
  serveDate: '2025-06-08', totalAmount: 55, status: 'redeemed',
  redeemedAt: new Date('2025-06-08T07:15:00Z'), redeemedByCashierId: uCashier._id,
  items: [{ menuItemId: miRice._id, qty: 1, unitPrice: 55, lineTotal: 55 }],
})
const txOrd2 = await Transaction.create({
  refNo: 'TXN-PUR-0002', walletId: wStudent2._id, type: 'purchase',
  amount: -55, balanceAfter: 145, channel: 'mobile',
  relatedOrderId: order2._id, paymentMethod: 'qr_promptpay', paymentRef: 'QRREF20250608001', status: 'success',
})
await Order.findByIdAndUpdate(order2._id, { transactionId: txOrd2._id })

// Case C: cancelled + refund — parent2 ยกเลิก
const order3 = await Order.create({
  orderNo: 'ORD-20250607-001', studentUserId: uStudent3._id, parentUserId: uParent2._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-07', totalAmount: 50, status: 'cancelled',
  cancelledAt: new Date('2025-06-06T20:00:00Z'), cancelReason: 'นักเรียนไม่มาโรงเรียน',
  items: [{ menuItemId: miChicken._id, qty: 1, unitPrice: 50, lineTotal: 50 }],
})
const txOrd3 = await Transaction.create({
  refNo: 'TXN-PUR-0003', walletId: wStudent3._id, type: 'purchase',
  amount: -50, balanceAfter: -50, channel: 'mobile',
  relatedOrderId: order3._id, paymentMethod: 'maemoney', paymentRef: 'MM20250607001', status: 'voided',
})
await Transaction.create({
  refNo: 'TXN-REF-0001', walletId: wStudent3._id, type: 'refund',
  amount: 50, balanceAfter: 0, channel: 'system',
  relatedOrderId: order3._id, voidedByTxnId: txOrd3._id, status: 'success',
  note: 'คืนเงินเนื่องจากยกเลิก order',
})
await Order.findByIdAndUpdate(order3._id, { transactionId: txOrd3._id })

// Case D: expired — ไม่มา redeem ตามเวลา
await Order.create({
  orderNo: 'ORD-20250605-001', studentUserId: uStudent1._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-05', totalAmount: 50, status: 'expired',
  items: [{ menuItemId: miChicken._id, qty: 1, unitPrice: 50, lineTotal: 50 }],
})

// Case E: pending_payment — รอชำระ
await Order.create({
  orderNo: 'ORD-20250610-001', studentUserId: uStudent1._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-10', totalAmount: 80, status: 'pending_payment',
  items: [{ menuItemId: miRice._id, qty: 1, unitPrice: 55, lineTotal: 55 }, { menuItemId: miTea._id, qty: 1, unitPrice: 30, lineTotal: 30 }],
})
// Case E2: select_payment — เลือกช่องทางยังไม่เลือก
const orderSP = await Order.create({
  orderNo: 'ORD-20250612-001', studentUserId: uStudent1._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-12', totalAmount: 80, status: 'select_payment',
  items: [
    { menuItemId: miRice._id, qty: 1, unitPrice: 55, lineTotal: 55 },
    { menuItemId: miTea._id,  qty: 1, unitPrice: 25, lineTotal: 25 },
  ],
})
await Transaction.create({
  refNo: 'TXN-PUR-0004', walletId: wStudent1._id, type: 'purchase',
  amount: -80, balanceAfter: 0, channel: 'mobile', relatedOrderId: orderSP._id,
  status: null,  // select_payment = ยังไม่มี payment status
})

// Case E3: wait_payment — เลือก PromptPay แล้ว รอ callback
const orderWP = await Order.create({
  orderNo: 'ORD-20250611-001', studentUserId: uStudent2._id, parentUserId: uParent1._id,
  shopId: shopCanteen._id, mealPeriodId: mpLunch._id,
  serveDate: '2025-06-11', totalAmount: 55, status: 'wait_payment',
  items: [{ menuItemId: miRice._id, qty: 1, unitPrice: 55, lineTotal: 55 }],
})
await Transaction.create({
  refNo: 'TXN-PUR-0005', walletId: wStudent2._id, type: 'purchase',
  amount: -55, balanceAfter: 0, channel: 'mobile', relatedOrderId: orderWP._id,
  paymentMethod: 'qr_promptpay', paymentRef: 'QRWAIT20250611', status: 'wait',
})
console.log('[Seed] Orders created (all 5 statuses + select_payment + wait_payment)')

// ── 23. BOOKINGS  (all 4 statuses) — now with studentUserId + parentUserId ───
await Booking.insertMany([
  {
    code: 'BK-20250609-001', name: 'นิรันดร์ ศรีวิไล',
    type: 'student', bookingDate: '2025-06-09',
    slotId: btsLunch._id, slot: 'Lunch', slotTime: '11:00-12:30',
    status: 'จองแล้ว', bookedAt: new Date('2025-06-08T18:00:00Z'),
    adminCode: 'ADM-001',
    studentUserId: uStudent1._id, parentUserId: uParent1._id,
  },
  {
    code: 'BK-20250608-001', name: 'พิมพ์ใจ ศรีวิไล',
    type: 'student', bookingDate: '2025-06-08',
    slotId: btsBreak._id, slot: 'Breakfast', slotTime: '07:00-08:30',
    status: 'เสร็จสิ้น', bookedAt: new Date('2025-06-07T19:00:00Z'),
    adminCode: 'ADM-001',
    studentUserId: uStudent2._id, parentUserId: uParent1._id,
  },
  {
    code: 'BK-20250607-001', name: 'ทศพล อ่วมเอี่ยม',
    type: 'student', bookingDate: '2025-06-07',
    slotId: btsLunch._id, slot: 'Lunch', slotTime: '11:00-12:30',
    status: 'ยกเลิก', bookedAt: new Date('2025-06-06T17:00:00Z'),
    cancelledAt: new Date('2025-06-06T20:00:00Z'), cancelReason: 'ไม่สะดวก',
    adminCode: 'ADM-001',
    studentUserId: uStudent3._id, parentUserId: uParent2._id,
  },
  {
    code: 'BK-20250606-001', name: 'นิรันดร์ ศรีวิไล',
    type: 'student', bookingDate: '2025-06-06',
    slotId: btsLunch._id, slot: 'Lunch', slotTime: '11:00-12:30',
    status: 'ไม่มา', bookedAt: new Date('2025-06-05T18:00:00Z'),
    adminCode: 'ADM-001',
    studentUserId: uStudent1._id, parentUserId: uParent1._id,
  },
])
console.log('[Seed] Bookings created (all 4 statuses)')

// ── 24. BUFFET SESSIONS + transactions ───────────────────────────────────────
// Student1 — รอบเช้า วันนี้  (M3 → ราคา 85)
const bfSes1 = await BuffetSession.create({
  userId: uStudent1._id, buffetRoundId: bfRound1._id,
  entryDate: '2025-06-09', priceCharged: 85, payMethod: 'wallet',
  enteredAt: new Date('2025-06-09T07:12:00Z'), deviceId: 'POS-01',
})
const txBuf1 = await Transaction.create({
  refNo: 'TXN-BUF-0001', walletId: wStudent1._id, type: 'buffet',
  amount: -85, balanceAfter: 290, channel: 'pos',
  cashierId: uCashier._id, relatedBuffetId: bfSes1._id, status: 'success',
})
await BuffetSession.findByIdAndUpdate(bfSes1._id, { transactionId: txBuf1._id })

// Student2 — รอบกลางวัน เมื่อวาน  (M1 → ราคา 85)
const bfSes2 = await BuffetSession.create({
  userId: uStudent2._id, buffetRoundId: bfRound2._id,
  entryDate: '2025-06-08', priceCharged: 85, payMethod: 'wallet',
  enteredAt: new Date('2025-06-08T11:45:00Z'), deviceId: 'POS-01',
})
const txBuf2 = await Transaction.create({
  refNo: 'TXN-BUF-0002', walletId: wStudent2._id, type: 'buffet',
  amount: -85, balanceAfter: 65, channel: 'pos',
  cashierId: uCashier._id, relatedBuffetId: bfSes2._id, status: 'success',
})
await BuffetSession.findByIdAndUpdate(bfSes2._id, { transactionId: txBuf2._id })

// Member — รอบกลางวัน วันนี้  (member → ราคา 120)
const bfSes3 = await BuffetSession.create({
  userId: uMember._id, buffetRoundId: bfRound2._id,
  entryDate: '2025-06-09', priceCharged: 120, payMethod: 'wallet',
  enteredAt: new Date('2025-06-09T12:10:00Z'), deviceId: 'POS-01',
})
const txBuf3 = await Transaction.create({
  refNo: 'TXN-BUF-0003', walletId: wMember._id, type: 'buffet',
  amount: -120, balanceAfter: 1080, channel: 'pos',
  cashierId: uCashier._id, relatedBuffetId: bfSes3._id, status: 'success',
})
await BuffetSession.findByIdAndUpdate(bfSes3._id, { transactionId: txBuf3._id })

// Student3 — ยอด 0 ใช้ไม่ได้ (ไม่มี session)
console.log('[Seed] BuffetSessions created')

// ── 25. FEEDBACK  (5 cases: 3 channels × 3 actors × หลาย rating) ─────────────
await Feedback.insertMany([
  // Kiosk — anonymous (ไม่มี userId)
  { channel: 'kiosk', rating: 4, category: 'food_quality', comment: 'อาหารอร่อย แต่รอนานไปหน่อย', shopId: shopCanteen._id },
  // Kiosk — visitor
  { userId: uVisitor._id, channel: 'kiosk', rating: 3, category: 'service', comment: 'พนักงานต้องรอนาน', shopId: shopCanteen._id },
  // Mobile — parent หลังรับ order
  { userId: uParent1._id, channel: 'mobile', rating: 5, category: 'preorder', comment: 'สะดวกมาก ลูกได้กินอาหารถูกต้อง', shopId: shopCanteen._id, orderId: order2._id },
  // Mobile — student
  { userId: uStudent1._id, channel: 'mobile', rating: 4, category: 'buffet',  comment: 'Buffet ดีครับ ของหลากหลาย',       shopId: shopBuffet._id },
  // Mobile — member ไม่พอใจ
  { userId: uMember._id,   channel: 'mobile', rating: 2, category: 'buffet',  comment: 'ของหมดเร็วเกินไป ควรเพิ่มปริมาณ', shopId: shopBuffet._id },
])
console.log('[Seed] Feedback created (anonymous, visitor, parent, student, member)')

// ── 26. AUDIT LOG ─────────────────────────────────────────────────────────────
await AuditLog.insertMany([
  { actorUserId: uAdmin._id,   actorRole: 'admin',      action: 'user.create',          entityType: 'User',         entityId: String(uStudent1._id), afterData: { uid: 'STU-001' } },
  { actorUserId: uAdmin._id,   actorRole: 'admin',      action: 'enrollment_code.create',entityType: 'EnrollmentCode', afterData: { code: 'ENR-STU001' } },
  { actorUserId: uSuper._id,   actorRole: 'supervisor', action: 'buffet_session.void',   entityType: 'BuffetSession',  entityId: String(bfSes2._id), beforeData: { priceCharged: 85 }, reason: 'ระบบ charge ซ้ำ' },
  { actorUserId: uCashier._id, actorRole: 'cashier',    action: 'order.redeem',          entityType: 'Order',          entityId: String(order2._id), afterData: { status: 'redeemed' } },
  { actorUserId: uAdmin._id,   actorRole: 'admin',      action: 'policy.update',         entityType: 'Policy',         entityId: 'booking.openDays', beforeData: { value: [1,2,3,4,5] }, afterData: { value: [1,2,3,4,5] } },
  { actorUserId: uAdmin._id,   actorRole: 'admin',      action: 'buffet_round.create',   entityType: 'BuffetRound',    entityId: String(bfRound3._id), afterData: { name: 'รอบบ่าย', active: false } },
])
console.log('[Seed] AuditLog created')

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n✅ Seed complete!')
console.log('\n📋 Demo Accounts:')
console.log('  Admin:      admin@dulwich.ac.th        / Admin1234!')
console.log('  Supervisor: supervisor@dulwich.ac.th   / Super123!')
console.log('  Cashier:    cashier@dulwich.ac.th      / Cashier123!')
console.log('  Parent1:    ruttana@gmail.com          / Demo1234!  (มี 2 ลูก)')
console.log('  Parent2:    prasit@gmail.com           / Demo1234!  (มี 1 ลูก ยังไม่ link)')
console.log('  Teacher:    anna@dulwich.ac.th         / Teacher123!')
console.log('  Member:     somchai@dulwich.ac.th      / Demo1234!')
console.log('\n📋 Card UIDs (tap):')
console.log('  STU-001 (M3): RFID-A1B2C3D4')
console.log('  STU-002 (M1): RFID-E5F6G7H8')
console.log('  STU-003 (M4): RFID-I9J0K1L2  (wallet = 0!)')
console.log('  Member:       RFID-M3N4O5P6')
console.log('\n📋 Enrollment Codes:')
console.log('  ENR-STU001  (used)    — นิรันดร์  by Parent1')
console.log('  ENR-STU002  (used)    — พิมพ์ใจ   by Parent1')
console.log('  ENR-MEM001  (used)    — สมชาย    member self')
console.log('  ENR-STU003  (pending) — ทศพล     Parent2 ยังไม่ scan')
console.log('  ENR-EXP001  (expired) — ทศพล     หมดอายุ')
console.log('\n✅ All gaps fixed:')
console.log('  1. Booking มี studentUserId + parentUserId แล้ว')
console.log('  2. BuffetSession มี voidedAt + voidReason แล้ว (soft-delete void)')
console.log('  3. BookingConfig + BookingBlackout มี model แยกแล้ว (consistent กับ Buffet)')
console.log('  4. BuffetPricing.userType ถูกต้อง (member/student)')
console.log('  5. Booking.adminCode คงไว้ (String UID ของ admin ที่สร้าง booking)')

process.exit(0)
