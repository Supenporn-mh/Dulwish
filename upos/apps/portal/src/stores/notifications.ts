import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotifType = 'info' | 'success' | 'warning' | 'danger'

export interface Notification {
  id:        string
  type:      NotifType
  title:     string
  titleEn:   string
  body:      string
  bodyEn:    string
  action?:   string      // route path
  createdAt: string
  read:      boolean
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])

  const unread = computed(() => items.value.filter(n => !n.read).length)

  function add(n: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    // avoid duplicate same-id notifications
    const id = `${n.type}-${n.title.replace(/\s/g,'')}`
    if (items.value.find(x => x.id === id)) return
    items.value.unshift({ ...n, id, createdAt: new Date().toISOString(), read: false })
  }

  function removeById(id: string) {
    items.value = items.value.filter(n => n.id !== id)
  }

  function markAllRead() {
    items.value.forEach(n => { n.read = true })
  }

  function markRead(id: string) {
    const n = items.value.find(x => x.id === id)
    if (n) n.read = true
  }

  // controls visibility of the notification sheet (set from any view)
  const showSheet = ref(false)

  function seedDemo() {
    if (items.value.length > 0) return
    const now = new Date()
    const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString()
    items.value.push({
      id: 'demo-lowbal-1', type: 'warning',
      title: 'ยอดเงินคงเหลือต่ำ', titleEn: 'Low Balance',
      body:  'สมหญิง ใจดี: ยอดเงินคงเหลือ ฿150 ต่ำกว่า ฿200 กรุณาเติมเงิน',
      bodyEn:'Somying Jaidee: Balance ฿150 is below ฿200. Please top up.',
      action:'/parent/topup', createdAt: ago(10), read: false,
    })
  }

  return { items, unread, showSheet, add, removeById, markAllRead, markRead, seedDemo }
})
