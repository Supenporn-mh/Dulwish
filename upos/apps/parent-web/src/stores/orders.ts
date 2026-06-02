import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/axios'

export interface MenuItem {
  _id: string
  name: string
  nameEn?: string
  description?: string
  price: number
  category: string
  imageUrl?: string
  quota: number
  quotaUsed: number
  isAvailable: boolean
  mealPeriod: 'breakfast' | 'lunch' | 'dinner'
  schoolId: string
}

export interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export interface Order {
  _id: string
  studentId: string
  schoolId: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  orderDate: string
  mealPeriod: 'breakfast' | 'lunch' | 'dinner'
  createdAt: string
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const menu = ref<MenuItem[]>([])
  const cart = ref<CartItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOrders(studentId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/orders/student/${studentId}`)
      orders.value = res.data?.orders ?? res.data ?? []
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'ไม่สามารถโหลดคำสั่งซื้อได้'
    } finally {
      loading.value = false
    }
  }

  async function fetchMenu(params: {
    schoolId: string
    date: string
    mealPeriod: 'breakfast' | 'lunch' | 'dinner'
  }) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get('/menu', { params })
      menu.value = res.data?.items ?? res.data ?? []
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'ไม่สามารถโหลดเมนูได้'
      menu.value = []
    } finally {
      loading.value = false
    }
  }

  async function createOrder(payload: {
    studentId: string
    schoolId: string
    items: { menuItemId: string; quantity: number }[]
    totalAmount: number
    orderDate: string
    mealPeriod: 'breakfast' | 'lunch' | 'dinner'
  }) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/orders', payload)
      const newOrder: Order = res.data?.order ?? res.data
      orders.value.unshift(newOrder)
      cart.value = []
      return newOrder
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'สั่งอาหารไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function cancelOrder(orderId: string) {
    loading.value = true
    error.value = null
    try {
      await api.patch(`/orders/${orderId}/cancel`)
      const idx = orders.value.findIndex((o) => o._id === orderId)
      if (idx !== -1) orders.value[idx].status = 'cancelled'
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'ยกเลิกคำสั่งซื้อไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  function addToCart(item: MenuItem) {
    const existing = cart.value.find((c) => c.menuItem._id === item._id)
    if (existing) {
      existing.quantity++
    } else {
      cart.value.push({ menuItem: item, quantity: 1 })
    }
  }

  function removeFromCart(itemId: string) {
    const idx = cart.value.findIndex((c) => c.menuItem._id === itemId)
    if (idx !== -1) {
      if (cart.value[idx].quantity > 1) {
        cart.value[idx].quantity--
      } else {
        cart.value.splice(idx, 1)
      }
    }
  }

  function clearCart() {
    cart.value = []
  }

  const cartTotal = () => cart.value.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0)
  const cartCount = () => cart.value.reduce((sum, c) => sum + c.quantity, 0)

  return {
    orders,
    menu,
    cart,
    loading,
    error,
    fetchOrders,
    fetchMenu,
    createOrder,
    cancelOrder,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount,
  }
})
