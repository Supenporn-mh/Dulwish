import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

interface User {
  uid: string
  name: string
  email: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('upos_admin_user') || 'null'))
  const accessToken = ref<string | null>(localStorage.getItem('upos_admin_token'))

  const isAuthenticated = computed(() => !!accessToken.value)

  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password })
    const data = response.data

    accessToken.value = data.accessToken
    user.value = data.user

    localStorage.setItem('upos_admin_token', data.accessToken)
    localStorage.setItem('upos_admin_user', JSON.stringify(data.user))
  }

  function logout() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('upos_admin_token')
    localStorage.removeItem('upos_admin_user')
  }

  return { user, accessToken, isAuthenticated, login, logout }
})
