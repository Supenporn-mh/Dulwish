import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/axios'

export interface KioskUser {
  uid: string
  name: string
  grade: string
  classRoom: string
  role: 'student' | 'teacher' | 'staff' | 'visitor'
  roleLabel?: string
}

export interface KioskWallet {
  balance: number
  currency: string
}

export const useKioskStore = defineStore('kiosk', () => {
  const currentUser = ref<KioskUser | null>(null)
  const wallet = ref<KioskWallet | null>(null)
  const error = ref('')
  const selectedMethod = ref<'promptpay' | 'alipay' | 'wechat'>('promptpay')
  const locale = ref<'th' | 'en'>((localStorage.getItem('kiosk-locale') as 'th' | 'en') || 'th')

  function toggleLocale() {
    locale.value = locale.value === 'th' ? 'en' : 'th'
    localStorage.setItem('kiosk-locale', locale.value)
  }

  async function readCard(uid: string): Promise<boolean> {
    error.value = ''

    try {
      const res = await api.get(`/pos/kiosk-card-read/${encodeURIComponent(uid)}`)
      currentUser.value = res.data.user ?? null
      wallet.value = res.data.wallet ?? null

      if (!currentUser.value) {
        error.value = 'ไม่พบข้อมูลบัตร'
        return false
      }
      return true
    } catch {
      currentUser.value = null
      wallet.value = null
      error.value = 'ไม่พบข้อมูลบัตร'
      return false
    }
  }

  function clearSession() {
    currentUser.value = null
    wallet.value = null
    error.value = ''
  }

  function updateBalance(newBalance: number) {
    if (wallet.value) {
      wallet.value.balance = newBalance
    }
  }

  return { currentUser, wallet, error, selectedMethod, locale, toggleLocale, readCard, clearSession, updateBalance }
})
