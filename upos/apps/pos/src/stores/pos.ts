import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface MenuItem {
  id: string
  name: string
  nameEn?: string
  price: number
  category: string
  shopId: string
  imageUrl?: string
  available: boolean
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
}

export interface CardUser {
  uid: string
  userId: string
  name: string
  role: string
  group?: string
  walletBalance: number
  walletId: string
}

export interface Shop {
  id: string
  name: string
}

export const usePosStore = defineStore('pos', () => {
  const cart = ref<CartItem[]>([])
  const currentCard = ref<CardUser | null>(null)
  const selectedShop = ref<Shop>({ id: 'cafe', name: 'Cafe Corner' })
  const menuItems = ref<MenuItem[]>([])
  const isLoadingMenu = ref(false)
  const isProcessing = ref(false)

  const cartTotal = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.qty, 0)
  )

  const cartCount = computed(() =>
    cart.value.reduce((sum, item) => sum + item.qty, 0)
  )

  const shops: Shop[] = [
    { id: 'cafe', name: 'Cafe Corner' },
    { id: 'buffet', name: 'Buffet' },
  ]

  async function readCard(uid: string): Promise<CardUser> {
    const res = await api.get(`/pos/card/${uid}`)
    currentCard.value = res.data
    return res.data
  }

  function addItem(item: MenuItem) {
    const existing = cart.value.find((c) => c.menuItemId === item.id)
    if (existing) {
      existing.qty++
    } else {
      cart.value.push({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
      })
    }
  }

  function removeItem(menuItemId: string) {
    cart.value = cart.value.filter((c) => c.menuItemId !== menuItemId)
  }

  function changeQty(menuItemId: string, delta: number) {
    const item = cart.value.find((c) => c.menuItemId === menuItemId)
    if (!item) return
    item.qty += delta
    if (item.qty <= 0) removeItem(menuItemId)
  }

  function clearCart() {
    cart.value = []
    currentCard.value = null
  }

  interface Tender {
    method: 'wallet' | 'cash'
    amount: number
  }

  async function submitSale(tenders: Tender[]) {
    if (!currentCard.value) throw new Error('No card read')
    isProcessing.value = true
    try {
      const res = await api.post('/pos/sale', {
        userId: currentCard.value.userId,
        walletId: currentCard.value.walletId,
        shopId: selectedShop.value.id,
        items: cart.value.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          qty: c.qty,
          unitPrice: c.price,
        })),
        tenders,
      })
      return res.data
    } finally {
      isProcessing.value = false
    }
  }

  async function fetchMenu(shopId?: string) {
    isLoadingMenu.value = true
    try {
      const params = shopId ? { shopId } : {}
      const res = await api.get('/pos/menu', { params })
      menuItems.value = res.data
    } catch (err) {
      // Fallback to demo menu when API unavailable
      menuItems.value = getDemoMenu()
    } finally {
      isLoadingMenu.value = false
    }
  }

  function getDemoMenu(): MenuItem[] {
    return [
      { id: 'm1', name: 'ข้าวผัดกุ้ง', price: 60, category: 'rice', shopId: 'cafe', available: true },
      { id: 'm2', name: 'ผัดไทย', price: 55, category: 'noodle', shopId: 'cafe', available: true },
      { id: 'm3', name: 'ส้มตำ', price: 45, category: 'salad', shopId: 'cafe', available: true },
      { id: 'm4', name: 'ก๋วยเตี๋ยวเรือ', price: 50, category: 'noodle', shopId: 'cafe', available: true },
      { id: 'm5', name: 'ข้าวมันไก่', price: 55, category: 'rice', shopId: 'cafe', available: true },
      { id: 'm6', name: 'น้ำเปล่า', price: 10, category: 'drink', shopId: 'cafe', available: true },
      { id: 'm7', name: 'น้ำอ้อย', price: 25, category: 'drink', shopId: 'cafe', available: true },
      { id: 'm8', name: 'ชาเย็น', price: 30, category: 'drink', shopId: 'cafe', available: true },
      { id: 'm9', name: 'ข้าวกะเพรา', price: 55, category: 'rice', shopId: 'cafe', available: true },
      { id: 'm10', name: 'ไก่ทอด', price: 45, category: 'snack', shopId: 'cafe', available: true },
      { id: 'm11', name: 'เฟรนช์ฟรายส์', price: 40, category: 'snack', shopId: 'cafe', available: true },
      { id: 'm12', name: 'สปาเก็ตตี้', price: 70, category: 'western', shopId: 'cafe', available: true },
    ]
  }

  return {
    cart,
    currentCard,
    selectedShop,
    menuItems,
    isLoadingMenu,
    isProcessing,
    cartTotal,
    cartCount,
    shops,
    readCard,
    addItem,
    removeItem,
    changeQty,
    clearCart,
    submitSale,
    fetchMenu,
  }
})
