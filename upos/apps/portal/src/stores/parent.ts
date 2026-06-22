import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ParentChild {
  id:          string
  name:        string
  firstName?:  string
  lastName?:   string
  studentCode: string
  grade?:      string
  walletId?:   string
  balance:     number
}

export interface TodayBooking {
  id:          string
  childId:     string   // student user ID — used to filter per child on dashboard
  orderNo:     string
  status:      string
  sessionKey:  string   // 'breakfast' | 'lunch' | 'dinner'
  sessionTh:   string
  sessionEn:   string
  serveDate:   string   // YYYY-MM-DD
  totalAmount: number
  items:       { name: string; qty: number; lineTotal: number }[]
}

export const useParentStore = defineStore('parent', () => {
  const children        = ref<ParentChild[]>([])
  const selectedChildId = ref<string>('')
  const loaded          = ref(false)

  // Today's bookings — written by PreorderView, read by DashboardView
  const todayBookings = ref<TodayBooking[]>([])

  const selectedChild = computed(() =>
    children.value.find(c => c.id === selectedChildId.value) ?? children.value[0] ?? null
  )

  function setChildren(list: ParentChild[]) {
    children.value = list
    if (!selectedChildId.value && list.length > 0) {
      selectedChildId.value = list[0].id
    }
    loaded.value = true
  }

  function selectChild(id: string) {
    selectedChildId.value = id
  }

  function updateBalance(childId: string, newBalance: number) {
    const c = children.value.find(c => c.id === childId)
    if (c) c.balance = newBalance
  }

  function addTodayBooking(b: TodayBooking) {
    todayBookings.value = [b, ...todayBookings.value.filter(
      x => !(x.childId === b.childId && x.sessionKey === b.sessionKey && x.serveDate === b.serveDate)
    )]
  }

  function removeTodayBooking(sessionKey: string, serveDate: string, childId: string) {
    todayBookings.value = todayBookings.value.filter(
      b => !(b.childId === childId && b.sessionKey === sessionKey && b.serveDate === serveDate)
    )
  }

  function reset() {
    children.value        = []
    selectedChildId.value = ''
    loaded.value          = false
    todayBookings.value   = []
  }

  return { children, selectedChildId, selectedChild, loaded, todayBookings,
           setChildren, selectChild, updateBalance, addTodayBooking, removeTodayBooking, reset }
})
