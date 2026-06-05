import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

export interface Child {
  _id: string
  name: string
  studentId: string
  grade: string
  schoolId: string
  walletId?: string
}

export interface User {
  _id: string
  email: string
  name: string
  role: string
  phone?: string
}

const STORAGE_KEY = 'upos_auth'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToStorage(data: object) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

export const useAuthStore = defineStore('auth', () => {
  const saved = loadFromStorage()

  const user = ref<User | null>(saved?.user ?? null)
  const accessToken = ref<string | null>(saved?.accessToken ?? null)
  const refreshToken = ref<string | null>(saved?.refreshToken ?? null)
  const children = ref<Child[]>(saved?.children ?? [])
  const selectedChildId = ref<string | null>(saved?.selectedChildId ?? null)

  const isLoggedIn = computed(() => !!accessToken.value && !!user.value)

  const selectedChild = computed(() =>
    children.value.find((c) => c._id === selectedChildId.value) ?? children.value[0] ?? null,
  )

  function persist() {
    saveToStorage({
      user: user.value,
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      children: children.value,
      selectedChildId: selectedChildId.value,
    })
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    const data = res.data

    user.value = data.user ?? data.parent ?? null
    accessToken.value = data.accessToken ?? data.token ?? null
    refreshToken.value = data.refreshToken ?? null

    persist()

    // Load children after login
    await fetchChildren()
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        await api.post('/auth/logout', { refreshToken: refreshToken.value })
      }
    } catch {
      // ignore logout errors
    } finally {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      children.value = []
      selectedChildId.value = null
      clearStorage()
    }
  }

  async function fetchChildren() {
    try {
      const res = await api.get('/users/me/children')
      const raw: any[] = res.data?.children ?? (Array.isArray(res.data) ? res.data : [])
      children.value = raw.map(s => ({
        _id: s._id,
        name: s.name ?? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(),
        studentId: s.studentId ?? s.uid ?? s._id,
        grade: s.grade ?? s.studentProfile?.gradeLevel ?? '',
        schoolId: s.schoolId ?? '',
      }))

      if (!selectedChildId.value && children.value.length > 0) {
        selectedChildId.value = children.value[0]._id
      }

      persist()
    } catch {
      // keep existing children on error
    }
  }

  function selectChild(childId: string) {
    selectedChildId.value = childId
    persist()
  }

  function setTokens(newAccess: string, newRefresh?: string) {
    accessToken.value = newAccess
    if (newRefresh) refreshToken.value = newRefresh
    persist()
  }

  return {
    user,
    accessToken,
    refreshToken,
    children,
    selectedChildId,
    isLoggedIn,
    selectedChild,
    login,
    logout,
    fetchChildren,
    selectChild,
    setTokens,
  }
})
