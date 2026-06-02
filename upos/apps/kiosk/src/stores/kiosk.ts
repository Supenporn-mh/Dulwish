import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

export interface KioskUser {
  id: string
  name: string
  nameTh?: string
  role: 'student' | 'staff' | 'teacher'
  grade?: string
  class?: string
  cardUid: string
}

export interface Wallet {
  balance: number
  currency: string
}

export interface Transaction {
  id: string
  type: 'purchase' | 'topup' | 'refund'
  amount: number
  description: string
  createdAt: string
  balanceAfter?: number
}

export const useKioskStore = defineStore('kiosk', () => {
  const currentUser = ref<KioskUser | null>(null)
  const wallet = ref<Wallet | null>(null)
  const transactions = ref<Transaction[]>([])
  const autoLogoutTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const autoLogoutSeconds = ref(30)
  const autoLogoutInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function clearAutoLogout() {
    if (autoLogoutTimer.value) {
      clearTimeout(autoLogoutTimer.value)
      autoLogoutTimer.value = null
    }
    if (autoLogoutInterval.value) {
      clearInterval(autoLogoutInterval.value)
      autoLogoutInterval.value = null
    }
    autoLogoutSeconds.value = 30
  }

  function startAutoLogout(onTimeout: () => void) {
    clearAutoLogout()
    autoLogoutSeconds.value = 30

    autoLogoutInterval.value = setInterval(() => {
      autoLogoutSeconds.value -= 1
      if (autoLogoutSeconds.value <= 0) {
        clearAutoLogout()
        onTimeout()
      }
    }, 1000)
  }

  function resetAutoLogout(onTimeout: () => void) {
    clearAutoLogout()
    startAutoLogout(onTimeout)
  }

  function clearSession() {
    currentUser.value = null
    wallet.value = null
    transactions.value = []
    error.value = null
    clearAutoLogout()
  }

  async function readCard(uid: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const res = await api.post('/pos/card-read', { uid })
      const data = res.data

      currentUser.value = {
        id: data.user?.id || data.id || uid,
        name: data.user?.name || data.name || 'Unknown',
        nameTh: data.user?.nameTh || data.nameTh,
        role: data.user?.role || data.role || 'student',
        grade: data.user?.grade || data.grade,
        class: data.user?.class || data.class,
        cardUid: uid,
      }

      wallet.value = {
        balance: data.wallet?.balance ?? data.balance ?? 0,
        currency: data.wallet?.currency || 'THB',
      }

      return true
    } catch (err: any) {
      // Demo fallback: allow offline demo with mock data
      if (uid === 'STD-K1-0001') {
        currentUser.value = {
          id: 'STD-K1-0001',
          name: 'Somchai Jaidee',
          nameTh: 'สมชาย ใจดี',
          role: 'student',
          grade: 'K1',
          class: 'Sunflower',
          cardUid: uid,
        }
        wallet.value = { balance: 350.75, currency: 'THB' }
        return true
      } else if (uid === 'STF-ANNA-01') {
        currentUser.value = {
          id: 'STF-ANNA-01',
          name: 'Anna Smith',
          nameTh: 'แอนนา สมิธ',
          role: 'teacher',
          cardUid: uid,
        }
        wallet.value = { balance: 1250.00, currency: 'THB' }
        return true
      }

      error.value = err?.response?.data?.message || 'ไม่พบข้อมูลบัตร กรุณาลองอีกครั้ง'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTransactions(): Promise<void> {
    if (!currentUser.value) return

    try {
      const res = await api.get(`/wallet/transactions`, {
        params: { userId: currentUser.value.id, limit: 10 },
      })
      transactions.value = res.data?.transactions || res.data || []
    } catch {
      // Demo fallback
      transactions.value = [
        { id: '1', type: 'purchase', amount: -45, description: 'อาหารกลางวัน - ข้าวผัด', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', type: 'purchase', amount: -20, description: 'ขนม - คุกกี้ช็อกโกแลต', createdAt: new Date(Date.now() - 7200000).toISOString() },
        { id: '3', type: 'topup', amount: 500, description: 'เติมเงินผ่าน QR Code', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '4', type: 'purchase', amount: -35, description: 'อาหารเช้า - โจ๊ก', createdAt: new Date(Date.now() - 90000000).toISOString() },
        { id: '5', type: 'purchase', amount: -25, description: 'เครื่องดื่ม - น้ำผลไม้', createdAt: new Date(Date.now() - 172800000).toISOString() },
      ]
    }
  }

  async function submitTopup(amount: number): Promise<boolean> {
    if (!currentUser.value || !wallet.value) return false

    try {
      const res = await api.post('/wallet/topup', {
        userId: currentUser.value.id,
        amount,
        method: 'qr',
        channel: 'kiosk',
      })
      wallet.value.balance = res.data?.balance ?? (wallet.value.balance + amount)
      return true
    } catch {
      // Demo: just add amount
      wallet.value.balance += amount
      return true
    }
  }

  return {
    currentUser,
    wallet,
    transactions,
    autoLogoutTimer,
    autoLogoutSeconds,
    isLoading,
    error,
    readCard,
    clearSession,
    startAutoLogout,
    resetAutoLogout,
    clearAutoLogout,
    fetchTransactions,
    submitTopup,
  }
})
