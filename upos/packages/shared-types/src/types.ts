import type {
  UserRole, UserStatus, CardType, CardStatus,
  TxnType, TxnChannel, TxnStatus, PayMethod,
  ShopType, OrderStatus, BuffetUserGroup, NotifChannel, FeedbackChannel
} from './enums'

export interface User {
  _id: string
  uid: string
  role: UserRole
  email?: string
  phone?: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  status: UserStatus
  pdpaAcceptedAt?: string
  studentProfile?: StudentProfile
  createdAt: string
  updatedAt: string
}

export interface StudentProfile {
  gradeLevel: string
  className?: string
  dob?: string
  guardianEmail?: string
}

export interface ParentStudent {
  _id: string
  parentUserId: string
  studentUserId: string
  relationship: string
  isPrimary: boolean
  boundAt: string
}

export interface Card {
  _id: string
  cardUid: string
  userId: string
  cardType: CardType
  status: CardStatus
  issuedAt: string
  deactivatedAt?: string
  reason?: string
}

export interface Wallet {
  _id: string
  userId: string
  balance: number
  negativeLimit: number
  lowThreshold: number
  currency: string
  version: number
  updatedAt: string
}

export interface TxnSplit {
  tenderMethod: PayMethod
  sourceWalletId?: string
  amount: number
  ref?: string
}

export interface Transaction {
  _id: string
  refNo: string
  walletId: string
  type: TxnType
  amount: number
  balanceAfter: number
  channel: TxnChannel
  paymentMethod?: PayMethod
  paymentRef?: string
  deviceId?: string
  cashierId?: string
  relatedOrderId?: string
  relatedBuffetId?: string
  voidedByTxnId?: string
  status: TxnStatus
  note?: string
  metadata?: Record<string, unknown>
  splits?: TxnSplit[]
  createdAt: string
}

export interface Shop {
  _id: string
  code: string
  name: string
  type: ShopType
  active: boolean
}

export interface MenuCategory {
  _id: string
  shopId: string
  name: string
  sortOrder: number
}

export interface MenuItem {
  _id: string
  shopId: string
  categoryId?: string
  sku: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  dailyQuota?: number
  availableFrom?: string
  availableTo?: string
  active: boolean
  isPreorderable: boolean
  createdAt: string
}

export interface MealPeriod {
  _id: string
  code: string
  name: string
  startTime: string
  endTime: string
  cutoffMinutes: number
  seatCapacity?: number
  active: boolean
}

export interface BuffetPricing {
  _id: string
  userGroup: BuffetUserGroup
  mealPeriodId?: string
  price: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface BuffetSession {
  _id: string
  userId: string
  mealPeriodId: string
  entryDate: string
  priceCharged: number
  payMethod: string
  transactionId?: string
  enteredAt: string
  deviceId?: string
}

export interface OrderItem {
  menuItemId: string
  qty: number
  unitPrice: number
  lineTotal: number
  note?: string
}

export interface Order {
  _id: string
  orderNo: string
  studentUserId: string
  parentUserId?: string
  shopId: string
  mealPeriodId: string
  serveDate: string
  totalAmount: number
  status: OrderStatus
  items: OrderItem[]
  redeemedAt?: string
  redeemedByCashierId?: string
  cancelledAt?: string
  cancelReason?: string
  transactionId?: string
  createdAt: string
}

export interface AuditLog {
  _id: string
  actorUserId?: string
  actorRole?: string
  action: string
  entityType?: string
  entityId?: string
  ip?: string
  beforeData?: unknown
  afterData?: unknown
  reason?: string
  createdAt: string
}

export interface Feedback {
  _id: string
  userId?: string
  channel: FeedbackChannel
  rating?: number
  category?: string
  comment?: string
  shopId?: string
  orderId?: string
  createdAt: string
}

export interface Policy {
  key: string
  value: unknown
  description?: string
  updatedBy?: string
  updatedAt: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    traceId?: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

export interface WalletWithUser extends Wallet {
  user?: Pick<User, '_id' | 'uid' | 'firstName' | 'lastName' | 'role'>
}
