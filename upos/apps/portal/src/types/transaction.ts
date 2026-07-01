export type TxType = 'topup' | 'purchase' | 'buffet' | 'booking' | 'refund'

export interface PurchaseItem {
  name: string
  qty: number
  price: number
}

export interface ApiLineItem {
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface Transaction {
  id: string
  type: TxType
  description: string
  amount: number
  createdAt: string
  refNo?: string
  channel?: string
  paymentMethod?: string
  items?: ApiLineItem[]
  topupSource?: string
  purchaseItems?: PurchaseItem[]
  buffetSession?: 'breakfast' | 'lunch' | 'dinner'
  buffetItems?: string[]
  bookingMeal?: 'breakfast' | 'lunch' | 'dinner'
  bookingItems?: string[]
  bookingStatus?: 'confirmed' | 'consumed' | 'cancelled'
  refundFor?: string
  balanceBefore?: number
  balanceAfter?: number
  status?: string
}
