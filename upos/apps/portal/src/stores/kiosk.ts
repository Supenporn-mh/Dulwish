import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface KioskUser {
  uid: string
  name: string
  grade: string
  classRoom: string
  role: 'student' | 'teacher' | 'staff'
}

export interface KioskWallet {
  balance: number
  currency: string
}

const MOCK_STUDENT: KioskUser = {
  uid: 'DEMO-STUDENT',
  name: 'สมหญิง',
  grade: 'K1',
  classRoom: 'A',
  role: 'student',
}

const MOCK_WALLET: KioskWallet = {
  balance: 850,
  currency: 'THB',
}

const MOCK_TEACHER: KioskUser = {
  uid: 'DEMO-TEACHER',
  name: 'Anna',
  grade: '-',
  classRoom: '-',
  role: 'teacher',
}

export const useKioskStore = defineStore('kiosk', () => {
  const currentUser = ref<KioskUser | null>(null)
  const wallet = ref<KioskWallet | null>(null)
  const error = ref('')

  async function readCard(uid: string): Promise<boolean> {
    error.value = ''

    // Demo shortcuts
    if (uid === 'DEMO-STUDENT') {
      currentUser.value = { ...MOCK_STUDENT }
      wallet.value = { ...MOCK_WALLET }
      return true
    }
    if (uid === 'DEMO-TEACHER') {
      currentUser.value = { ...MOCK_TEACHER }
      wallet.value = { balance: 0, currency: 'THB' }
      return true
    }

    try {
      const res = await fetch('/pos/card-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      })

      if (!res.ok) {
        // Fallback to demo on API error
        currentUser.value = { ...MOCK_STUDENT }
        wallet.value = { ...MOCK_WALLET }
        return true
      }

      const data = await res.json()
      currentUser.value = data.user ?? null
      wallet.value = data.wallet ?? null

      if (!currentUser.value) {
        error.value = 'ไม่พบข้อมูลบัตร'
        return false
      }
      return true
    } catch {
      // Network error — use demo fallback
      currentUser.value = { ...MOCK_STUDENT }
      wallet.value = { ...MOCK_WALLET }
      return true
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

  return { currentUser, wallet, error, readCard, clearSession, updateBalance }
})
