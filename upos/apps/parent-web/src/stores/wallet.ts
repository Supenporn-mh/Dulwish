import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/axios'

export interface Wallet {
  _id: string
  userId: string
  balance: number
  currency: string
  isActive: boolean
}

export interface Transaction {
  _id: string
  walletId: string
  type: 'topup' | 'purchase' | 'refund' | 'buffet'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  referenceId?: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
}

export const useWalletStore = defineStore('wallet', () => {
  const wallet = ref<Wallet | null>(null)
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const page = ref(1)

  async function fetchWallet(userId: string) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/wallets/${userId}`)
      wallet.value = res.data?.wallet ?? res.data ?? null
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้'
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions(userId: string, reset = false) {
    if (reset) {
      page.value = 1
      transactions.value = []
      hasMore.value = true
    }

    if (!hasMore.value) return

    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/wallets/${userId}/transactions`, {
        params: { page: page.value, limit: 20 },
      })
      const data: Transaction[] = res.data?.transactions ?? res.data ?? []

      if (reset) {
        transactions.value = data
      } else {
        transactions.value.push(...data)
      }

      hasMore.value = data.length >= 20
      if (data.length > 0) page.value++
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'ไม่สามารถโหลดประวัติธุรกรรมได้'
    } finally {
      loading.value = false
    }
  }

  async function topup(userId: string, amount: number, method: 'promptpay' | 'credit_card') {
    loading.value = true
    error.value = null
    try {
      const res = await api.post(`/wallets/${userId}/topup`, { amount, channel: 'mobile_web', paymentMethod: method })
      // After topup, refresh wallet
      await fetchWallet(userId)
      return res.data
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? 'เติมเงินไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    wallet,
    transactions,
    loading,
    error,
    hasMore,
    fetchWallet,
    fetchTransactions,
    topup,
  }
})
