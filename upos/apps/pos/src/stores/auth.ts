import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'cashier' | 'supervisor' | 'admin'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(
    JSON.parse(localStorage.getItem('pos_user') || 'null')
  )
  const accessToken = ref<string | null>(
    localStorage.getItem('pos_token') || null
  )

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value)
  const roleBadge = computed(() => {
    if (!user.value) return ''
    const labels: Record<string, string> = {
      cashier: 'Cashier',
      supervisor: 'Supervisor',
      admin: 'Admin',
    }
    return labels[user.value.role] ?? user.value.role
  })

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, user: u } = res.data
    accessToken.value = access_token
    user.value = u
    localStorage.setItem('pos_token', access_token)
    localStorage.setItem('pos_user', JSON.stringify(u))
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  }

  function logout() {
    user.value = null
    accessToken.value = null
    localStorage.removeItem('pos_token')
    localStorage.removeItem('pos_user')
    delete api.defaults.headers.common['Authorization']
  }

  // Restore token on startup
  if (accessToken.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken.value}`
  }

  return { user, accessToken, isLoggedIn, roleBadge, login, logout }
})
