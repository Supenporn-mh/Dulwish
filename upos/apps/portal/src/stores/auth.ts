import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('upos_token'))
  const user  = ref<any>(JSON.parse(localStorage.getItem('upos_user') ?? 'null'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role ?? null)

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    token.value = data.accessToken
    user.value  = data.user
    localStorage.setItem('upos_token', data.accessToken)
    localStorage.setItem('upos_user', JSON.stringify(data.user))
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    return data.user
  }

  async function parentLogin(studentCode: string, password: string) {
    const { data } = await api.post('/auth/parent-login', { studentCode, password })
    token.value = data.accessToken
    user.value  = data.user
    localStorage.setItem('upos_token', data.accessToken)
    localStorage.setItem('upos_user', JSON.stringify(data.user))
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    return data.user
  }

  async function parentLoginV2(contact: string, password: string) {
    const { data } = await api.post('/auth/parent-login-v2', { contact: contact.trim().toLowerCase(), password })
    token.value = data.accessToken
    user.value  = data.user
    localStorage.setItem('upos_token', data.accessToken)
    localStorage.setItem('upos_user', JSON.stringify(data.user))
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    return data.user
  }

  function logout() {
    token.value = null
    user.value  = null
    localStorage.removeItem('upos_token')
    localStorage.removeItem('upos_user')
    delete api.defaults.headers.common.Authorization
  }

  // Restore token on boot
  if (token.value) {
    api.defaults.headers.common.Authorization = `Bearer ${token.value}`
  }

  return { token, user, isLoggedIn, role, login, parentLogin, parentLoginV2, logout }
})
