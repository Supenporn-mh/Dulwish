import mongoose, { Schema } from 'mongoose'

// ─── User ─────────────────────────────────────────────────────────────────────
const userSchema = new Schema({
  uid:             { type: String, required: true, unique: true },
  role:            { type: String, required: true, enum: ['student','parent','teacher','staff','visitor','cashier','supervisor','admin'] },
  email:           { type: String },
  phone:           { type: String },
  passwordHash:    { type: String },
  firstName:       { type: String, required: true },
  lastName:        { type: String, required: true },
  displayName:     { type: String },
  avatarUrl:       { type: String },
  status:          { type: String, default: 'active', enum: ['active','inactive','suspended'] },
  pdpaAcceptedAt:  { type: Date },
  studentProfile:  {
    gradeLevel:    String,
    className:     String,
    dob:           Date,
    guardianEmail: String,
    familyCode:    String,
  },
}, { timestamps: true })
userSchema.index({ email: 1 }, { unique: true, sparse: true })

export const User = mongoose.model('User', userSchema)

// ─── ParentStudent ─────────────────────────────────────────────────────────────
const parentStudentSchema = new Schema({
  parentUserId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relationship:  { type: String, default: 'parent' },
  isPrimary:     { type: Boolean, default: false },
  boundAt:       { type: Date, default: Date.now },
})
parentStudentSchema.index({ parentUserId: 1, studentUserId: 1 }, { unique: true })
// A student may be linked to multiple parents — only the (parent,student) pair is unique.
// studentUserId is indexed (non-unique) for lookup performance.
parentStudentSchema.index({ studentUserId: 1 })

export const ParentStudent = mongoose.model('ParentStudent', parentStudentSchema)

// ─── EnrollmentCode ────────────────────────────────────────────────────────────
const enrollmentCodeSchema = new Schema({
  code:            { type: String, required: true, unique: true },
  studentUserId:   { type: Schema.Types.ObjectId, ref: 'User' },
  memberUserId:    { type: Schema.Types.ObjectId, ref: 'User' },
  used:            { type: Boolean, default: false },
  usedAt:          { type: Date },
  usedByParentId:  { type: Schema.Types.ObjectId, ref: 'User' },
  usedByMemberId:  { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt:       { type: Date, required: true },
  createdBy:       { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } })
enrollmentCodeSchema.index({ studentUserId: 1 })

export const EnrollmentCode = mongoose.model('EnrollmentCode', enrollmentCodeSchema)

// ─── Card ──────────────────────────────────────────────────────────────────────
const cardSchema = new Schema({
  cardUid:       { type: String, required: true, unique: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cardType:      { type: String, required: true, enum: ['student','staff','visitor_temp'] },
  status:        { type: String, default: 'active', enum: ['active','inactive','lost'] },
  issuedAt:      { type: Date, default: Date.now },
  deactivatedAt: { type: Date },
  reason:        { type: String },
})
cardSchema.index({ userId: 1, status: 1 })

export const Card = mongoose.model('Card', cardSchema)

// ─── Wallet ────────────────────────────────────────────────────────────────────
const walletSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance:       { type: Number, default: 0 },
  negativeLimit: { type: Number, default: 100 },
  lowThreshold:  { type: Number, default: 200 },
  currency:      { type: String, default: 'THB' },
  version:       { type: Number, default: 0 },
}, { timestamps: true })

export const Wallet = mongoose.model('Wallet', walletSchema)

// ─── Transaction ───────────────────────────────────────────────────────────────
const txnSplitSchema = new Schema({
  tenderMethod:    { type: String, required: true },
  sourceWalletId:  { type: Schema.Types.ObjectId, ref: 'Wallet' },
  amount:          { type: Number, required: true },
  ref:             { type: String },
}, { _id: false })

// Structured line-item snapshot stored on the transaction so history screens
// don't have to parse the free-text `note`/description.
const txnItemSchema = new Schema({
  name:      { type: String, required: true },
  qty:       { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
}, { _id: false })

const transactionSchema = new Schema({
  refNo:           { type: String, required: true, unique: true },
  walletId:        { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  type:            { type: String, required: true, enum: ['topup','purchase','buffet','refund','void','adjustment'] },
  amount:          { type: Number, required: true },
  balanceAfter:    { type: Number, required: true },
  channel:         { type: String, required: true },
  paymentMethod:   { type: String },
  paymentRef:      { type: String },
  deviceId:        { type: String },
  cashierId:       { type: Schema.Types.ObjectId, ref: 'User' },
  relatedOrderId:  { type: Schema.Types.ObjectId, ref: 'Order' },
  relatedBuffetId: { type: Schema.Types.ObjectId, ref: 'BuffetSession' },
  voidedByTxnId:  { type: Schema.Types.ObjectId, ref: 'Transaction' },
  status:          { type: String, default: 'success', enum: ['pending','success','failed','voided','wait'] },
  note:            { type: String },
  metadata:        { type: Schema.Types.Mixed },
  splits:          [txnSplitSchema],
  items:           [txnItemSchema],
}, { timestamps: true })
transactionSchema.index({ walletId: 1, createdAt: -1 })
transactionSchema.index({ type: 1, createdAt: -1 })
transactionSchema.index({ status: 1 })

export const Transaction = mongoose.model('Transaction', transactionSchema)

// ─── Shop ─────────────────────────────────────────────────────────────────────
const shopSchema = new Schema({
  code:   { type: String, required: true, unique: true },
  name:   { type: String, required: true },
  type:   { type: String, required: true, enum: ['buffet','a_la_carte','mixed'] },
  active: { type: Boolean, default: true },
})

export const Shop = mongoose.model('Shop', shopSchema)

// ─── MenuCategory ─────────────────────────────────────────────────────────────
const menuCategorySchema = new Schema({
  shopId:    { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  name:      { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
})

export const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema)

// ─── MenuItem ─────────────────────────────────────────────────────────────────
const menuItemSchema = new Schema({
  shopId:        { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  categoryId:    { type: Schema.Types.ObjectId, ref: 'MenuCategory' },
  sku:           { type: String, required: true, unique: true },
  name:          { type: String, required: true },
  description:   { type: String },
  price:         { type: Number, required: true },
  imageUrl:      { type: String },
  dailyQuota:    { type: Number },
  availableFrom: { type: String },
  availableTo:   { type: String },
  active:        { type: Boolean, default: true },
  isPreorderable:{ type: Boolean, default: false },
}, { timestamps: true })
menuItemSchema.index({ shopId: 1, active: 1 })

export const MenuItem = mongoose.model('MenuItem', menuItemSchema)

// ─── MealPeriod ───────────────────────────────────────────────────────────────
const mealPeriodSchema = new Schema({
  code:           { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  startTime:      { type: String, required: true },
  endTime:        { type: String, required: true },
  cutoffMinutes:  { type: Number, default: 180 },
  seatCapacity:   { type: Number },
  description:    { type: String },
  active:         { type: Boolean, default: true },
})

export const MealPeriod = mongoose.model('MealPeriod', mealPeriodSchema)

// ─── BuffetRound ──────────────────────────────────────────────────────────────
const buffetRoundSchema = new Schema({
  name:      { type: String, required: true },
  startTime: { type: String, required: true }, // "07:00"
  endTime:   { type: String, required: true }, // "09:00"
  active:    { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

export const BuffetRound = mongoose.model('BuffetRound', buffetRoundSchema)

// ─── BuffetPricing ────────────────────────────────────────────────────────────
const buffetPricingSchema = new Schema({
  userType:      { type: String, required: true, enum: ['member', 'student'] },
  gradeLevelId:  { type: Schema.Types.ObjectId, ref: 'GradeLevel' }, // student only
  buffetRoundId: { type: Schema.Types.ObjectId, ref: 'BuffetRound' }, // null = all rounds
  categoryIds:   [{ type: Schema.Types.ObjectId, ref: 'BuffetCategory' }], // empty = all categories
  price:         { type: Number, required: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo:   { type: Date },
})

export const BuffetPricing = mongoose.model('BuffetPricing', buffetPricingSchema)

// ─── BuffetSession ────────────────────────────────────────────────────────────
const buffetSessionSchema = new Schema({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  buffetRoundId: { type: Schema.Types.ObjectId, ref: 'BuffetRound', required: true },
  entryDate:     { type: String, required: true },
  priceCharged:  { type: Number, required: true },
  payMethod:     { type: String, required: true },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  enteredAt:     { type: Date, default: Date.now },
  buffetCategoryId: { type: Schema.Types.ObjectId, ref: 'BuffetCategory' },
  deviceId:      { type: String },
  voidedAt:      { type: Date },    // set when voided (soft-delete)
  voidReason:    { type: String },
})
// unique only among non-voided sessions — enforced in application code, not DB
buffetSessionSchema.index({ userId: 1, entryDate: 1 })
buffetSessionSchema.index({ entryDate: 1, voidedAt: 1 })

export const BuffetSession = mongoose.model('BuffetSession', buffetSessionSchema)

// ─── Order ────────────────────────────────────────────────────────────────────
const orderItemSchema = new Schema({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  qty:        { type: Number, default: 1 },
  unitPrice:  { type: Number, required: true },
  lineTotal:  { type: Number, required: true },
  note:       { type: String },
}, { _id: false })

const orderSchema = new Schema({
  orderNo:              { type: String, required: true, unique: true },
  studentUserId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parentUserId:         { type: Schema.Types.ObjectId, ref: 'User' },
  shopId:               { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  mealPeriodId:         { type: Schema.Types.ObjectId, ref: 'MealPeriod', required: true },
  serveDate:            { type: String, required: true },
  totalAmount:          { type: Number, required: true },
  status:               { type: String, default: 'confirmed', enum: ['pending_payment','confirmed','redeemed','cancelled','expired','select_payment','wait_payment','complete','void'] },
  items:                [orderItemSchema],
  redeemedAt:           { type: Date },
  redeemedByCashierId:  { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledAt:          { type: Date },
  cancelReason:         { type: String },
  transactionId:        { type: Schema.Types.ObjectId, ref: 'Transaction' },
}, { timestamps: true })
orderSchema.index({ studentUserId: 1, serveDate: 1 })
orderSchema.index({ serveDate: 1, status: 1 })

export const Order = mongoose.model('Order', orderSchema)

// ─── TaxInvoice ───────────────────────────────────────────────────────────────
const partySchema = new Schema({
  name:    { type: String, default: '' },
  address: { type: String, default: '' },
  taxId:   { type: String, default: '' },
  branch:  { type: String, default: '' },
  phone:   { type: String, default: '' },
  email:   { type: String, default: '' },
}, { _id: false })

const taxInvoiceSchema = new Schema({
  transactionId:  { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
  invoiceNo:      { type: String, required: true },
  issuedAt:       { type: Date, required: true },
  seller:         { type: partySchema, default: () => ({}) },
  buyer:          {
    type: new Schema({ ...partySchema.obj, paymentMethod: { type: String, default: '' } }, { _id: false }),
    default: () => ({}),
  },
  subtotal:       { type: Number, default: 0 },
  vatAmount:      { type: Number, default: 0 },
  grandTotal:     { type: Number, default: 0 },
  note:           { type: String, default: '' },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export const TaxInvoice = mongoose.model('TaxInvoice', taxInvoiceSchema)

// ─── AuditLog ─────────────────────────────────────────────────────────────────
const auditLogSchema = new Schema({
  actorUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
  actorRole:    { type: String },
  action:       { type: String, required: true },
  entityType:   { type: String },
  entityId:     { type: String },
  ip:           { type: String },
  beforeData:   { type: Schema.Types.Mixed },
  afterData:    { type: Schema.Types.Mixed },
  reason:       { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })
auditLogSchema.index({ actorUserId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)

// ─── Feedback ─────────────────────────────────────────────────────────────────
const feedbackSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User' },
  channel:  { type: String, required: true, enum: ['kiosk','mobile'] },
  rating:   { type: Number, min: 1, max: 5 },
  category: { type: String },
  comment:  { type: String },
  shopId:   { type: Schema.Types.ObjectId, ref: 'Shop' },
  orderId:  { type: Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: { createdAt: true, updatedAt: false } })

export const Feedback = mongoose.model('Feedback', feedbackSchema)

// ─── Policy ───────────────────────────────────────────────────────────────────
const policySchema = new Schema({
  key:         { type: String, required: true, unique: true },
  value:       { type: Schema.Types.Mixed, required: true },
  description: { type: String },
  updatedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export const Policy = mongoose.model('Policy', policySchema)

// ─── ProductCategory ──────────────────────────────────────────────────────────
const productCategorySchema = new Schema({
  code:     { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  imageUrl: { type: String },
})

export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema)

// ─── Unit ─────────────────────────────────────────────────────────────────────
const unitSchema = new Schema({
  name: { type: String, required: true, unique: true },
})

export const Unit = mongoose.model('Unit', unitSchema)

// ─── Kitchen ──────────────────────────────────────────────────────────────────
const kitchenSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
})

export const Kitchen = mongoose.model('Kitchen', kitchenSchema)

// ─── Product ──────────────────────────────────────────────────────────────────
const productOptionSchema = new Schema({
  name:  { type: String },
  price: { type: Number },
}, { _id: false })

const productAttributeSchema = new Schema({
  name:    { type: String },
  type:    { type: String, enum: ['single', 'multiple', 'number', 'quantity'] },
  options: [productOptionSchema],
}, { _id: false })

const productSchema = new Schema({
  code:         { type: String, required: true, unique: true },
  barcode:      { type: String },
  name:         { type: String, required: true },
  cost:         { type: Number },
  price:        { type: Number },
  categoryCode: { type: String },
  unit:         { type: String },
  kitchenCode:  { type: String },
  branchCode:   { type: String },
  icon:         { type: String },
  imageUrl:     { type: String },
  attributes:   [productAttributeSchema],
  active:       { type: Boolean, default: true },
}, { timestamps: true })
productSchema.index({ categoryCode: 1 })

export const Product = mongoose.model('Product', productSchema)

// ─── BookingTimeSlot ──────────────────────────────────────────────────────────
const bookingTimeSlotSchema = new Schema({
  name:         { type: String, required: true },
  meal:         { type: String, enum: ['breakfast', 'lunch', 'dinner'] },
  startTime:    { type: String },
  endTime:      { type: String },
  capacity:     { type: Number },
  cutoffHours:  { type: Number },
  description:  { type: String },
  enabled:      { type: Boolean, default: true },
})

export const BookingTimeSlot = mongoose.model('BookingTimeSlot', bookingTimeSlotSchema)

// ─── BookingMenu ──────────────────────────────────────────────────────────────
const bookingMenuSchema = new Schema({
  name:       { type: String, required: true },
  ingredient: { type: String },
  timeSlot:   { type: String },
  enabled:    { type: Boolean, default: true },
  startDate:  { type: String },
  endDate:    { type: String },
}, { timestamps: true })

export const BookingMenu = mongoose.model('BookingMenu', bookingMenuSchema)

// ─── Booking ──────────────────────────────────────────────────────────────────
const bookingSchema = new Schema({
  code:           { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  type:           { type: String },
  bookingDate:    { type: String },
  slotId:         { type: Schema.Types.ObjectId, ref: 'BookingTimeSlot' },
  slot:           { type: String },
  slotTime:       { type: String },
  status:         { type: String, enum: ['จองแล้ว', 'เสร็จสิ้น', 'ยกเลิก', 'ไม่มา'], default: 'จองแล้ว' },
  bookedAt:       { type: Date },
  cancelledAt:    { type: Date },
  cancelReason:   { type: String },
  adminCode:      { type: String },
  studentUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
  parentUserId:   { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })
bookingSchema.index({ bookingDate: 1, status: 1 })
bookingSchema.index({ studentUserId: 1, bookingDate: 1 })

export const Booking = mongoose.model('Booking', bookingSchema)

// ─── MemberGroup ──────────────────────────────────────────────────────────────
const memberGroupMemberSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User' },
  joinedAt: { type: Date },
}, { _id: false })

const memberGroupSchema = new Schema({
  code:        { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  kind:        { type: String, required: true, enum: ['member', 'student'] },
  permissions: [{ type: String }],
  members:     [memberGroupMemberSchema],
})
memberGroupSchema.index({ kind: 1 })

export const MemberGroup = mongoose.model('MemberGroup', memberGroupSchema)

// ─── WalletPermission ─────────────────────────────────────────────────────────
const walletPermissionSchema = new Schema({
  code:      { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  desc:      { type: String },
  amount:    { type: Number },
  enabled:   { type: Boolean, default: false },
  startDate: { type: String },
  endDate:   { type: String },
})

export const WalletPermission = mongoose.model('WalletPermission', walletPermissionSchema)

// ─── AcademicYear ─────────────────────────────────────────────────────────────
const academicYearSemesterSchema = new Schema({
  name:      { type: String },
  startDate: { type: String },
  endDate:   { type: String },
}, { _id: false })

const academicYearSchema = new Schema({
  year:      { type: String, required: true, unique: true },
  semesters: [academicYearSemesterSchema],
  active:    { type: Boolean, default: false },
})

export const AcademicYear = mongoose.model('AcademicYear', academicYearSchema)

// ─── GradeLevel ───────────────────────────────────────────────────────────────
const gradeLevelSchema = new Schema({
  code:       { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  sortOrder:  { type: Number, required: true, default: 0 },
  gradeGroup: { type: String, required: true, enum: ['primary','secondary','staff','visitor'], default: 'secondary' },
  canRepeat:  { type: Boolean, default: false },
})

export const GradeLevel = mongoose.model('GradeLevel', gradeLevelSchema)

// ─── Branch ───────────────────────────────────────────────────────────────────
const branchSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
})

export const Branch = mongoose.model('Branch', branchSchema)

// ─── Classroom ────────────────────────────────────────────────────────────────
const classroomSchema = new Schema({
  code:       { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  gradeLevel: { type: String, required: true },
  sortOrder:  { type: Number, required: true, default: 0 },
})

export const Classroom = mongoose.model('Classroom', classroomSchema)

// ─── StoreSettings ────────────────────────────────────────────────────────────
const storeSettingsSchema = new Schema({
  key:     { type: String, default: 'default', unique: true },
  name:    { type: String },
  address: { type: String },
  taxId:   { type: String },
  logoUrl: { type: String },
})

export const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema)

// ─── BuffetConfig (singleton) ─────────────────────────────────────────────────
const buffetConfigSchema = new Schema({
  key:      { type: String, default: 'default', unique: true },
  openDays: { type: [Number], default: [1,2,3,4,5] }, // 0=Sun … 6=Sat
})
export const BuffetConfig = mongoose.model('BuffetConfig', buffetConfigSchema)

// ─── BuffetBlackout ───────────────────────────────────────────────────────────
const buffetBlackoutSchema = new Schema({
  date:    { type: String, required: true }, // YYYY-MM-DD start
  endDate: { type: String },                 // YYYY-MM-DD end (optional, for ranges)
  reason:  { type: String, default: '' },
}, { timestamps: true })
export const BuffetBlackout = mongoose.model('BuffetBlackout', buffetBlackoutSchema)

// ─── BuffetCategory ───────────────────────────────────────────────────────────
const buffetCategorySchema = new Schema({
  code:      { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  active:    { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

export const BuffetCategory = mongoose.model('BuffetCategory', buffetCategorySchema)

// ─── BookingConfig (singleton) ────────────────────────────────────────────────
const bookingConfigSchema = new Schema({
  key:      { type: String, default: 'default', unique: true },
  openDays: { type: [Number], default: [1,2,3,4,5] }, // 0=Sun … 6=Sat
})
export const BookingConfig = mongoose.model('BookingConfig', bookingConfigSchema)

// ─── BookingBlackout ──────────────────────────────────────────────────────────
const bookingBlackoutSchema = new Schema({
  date:    { type: String, required: true }, // YYYY-MM-DD start
  endDate: { type: String },                 // YYYY-MM-DD end (optional, for ranges)
  reason:  { type: String, default: '' },
}, { timestamps: true })
export const BookingBlackout = mongoose.model('BookingBlackout', bookingBlackoutSchema)

// ─── Banner ───────────────────────────────────────────────────────────────────
const bannerSchema = new Schema({
  name:        { type: String, required: true },
  imageBase64: { type: String },
  isVisible:   { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
}, { timestamps: true })

export const Banner = mongoose.model('Banner', bannerSchema)

// ─── SaleScreenPanel ──────────────────────────────────────────────────────────
const saleScreenPanelItemSchema = new Schema({
  productId:   { type: String, required: true },
  productName: { type: String, required: true },
  textColor:   { type: String, default: '#000000' },
  bgColor:     { type: String, default: '#FFFFFF' },
}, { _id: false })

const saleScreenPanelSchema = new Schema({
  name:        { type: String, required: true },
  branch:      { type: String, required: true },
  isVisible:   { type: Boolean, default: true },
  imageBase64: { type: String },
  items:       [saleScreenPanelItemSchema],
}, { timestamps: true })

export const SaleScreenPanel = mongoose.model('SaleScreenPanel', saleScreenPanelSchema)

// ─── Device ───────────────────────────────────────────────────────────────────
const deviceSchema = new Schema({
  deviceId:   { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  type:       { type: String, enum: ['pos','kiosk','tablet','printer','other'], default: 'pos' },
  branchCode: { type: String },
  status:     { type: String, enum: ['active','inactive'], default: 'active' },
  lastSeenAt: { type: Date },
  note:       { type: String },
}, { timestamps: true })
deviceSchema.index({ branchCode: 1 })

export const Device = mongoose.model('Device', deviceSchema)

// ─── Notification ───────────────────────────────────────────────────────────────
const notificationSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, default: 'info' },   // info | low_balance | order | topup | system
  title:     { type: String, required: true },
  body:      { type: String },
  action:    { type: String },                     // optional route the FE can navigate to
  read:      { type: Boolean, default: false },
  readAt:    { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } })
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
