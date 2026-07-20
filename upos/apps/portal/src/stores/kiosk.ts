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
  const errorCode = ref('')
  const selectedMethod = ref<'promptpay' | 'alipay' | 'wechat'>('promptpay')
  const locale = ref<'th' | 'en'>((localStorage.getItem('kiosk-locale') as 'th' | 'en') || 'th')

  function toggleLocale() {
    locale.value = locale.value === 'th' ? 'en' : 'th'
    localStorage.setItem('kiosk-locale', locale.value)
  }

  async function readCard(uid: string): Promise<boolean> {
    error.value = ''
    errorCode.value = ''

    try {
      const res = await api.get(`/pos/kiosk-card-read/${encodeURIComponent(uid)}`)
      currentUser.value = res.data.user ?? null
      wallet.value = res.data.wallet ?? null

      if (!currentUser.value) {
        errorCode.value = 'CARD_001'
        error.value = 'ไม่พบข้อมูลบัตร'
        return false
      }
      return true
    } catch (err: any) {
      currentUser.value = null
      wallet.value = null
      errorCode.value = err?.response?.data?.error?.code ?? 'CARD_001'
      error.value = errorCode.value === 'CARD_002' ? 'บัตรถูกระงับการใช้งาน' : 'ไม่พบข้อมูลบัตร'
      return false
    }
  }

  function clearSession() {
    currentUser.value = null
    wallet.value = null
    error.value = ''
    errorCode.value = ''
  }

  function updateBalance(newBalance: number) {
    if (wallet.value) {
      wallet.value.balance = newBalance
    }
  }

  return { currentUser, wallet, error, errorCode, selectedMethod, locale, toggleLocale, readCard, clearSession, updateBalance }
})
