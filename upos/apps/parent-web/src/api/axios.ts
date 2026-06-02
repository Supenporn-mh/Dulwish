import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Dynamic import to avoid circular dependency at module load time
  const raw = localStorage.getItem('upos_auth')
  if (raw) {
    try {
      const auth = JSON.parse(raw)
      if (auth?.accessToken) {
        config.headers.Authorization = `Bearer ${auth.accessToken}`
      }
    } catch {
      // ignore parse errors
    }
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken))
  refreshQueue = []
}

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const raw = localStorage.getItem('upos_auth')
      let refreshToken: string | null = null
      try {
        refreshToken = JSON.parse(raw ?? '{}')?.refreshToken ?? null
      } catch {
        refreshToken = null
      }

      if (!refreshToken) {
        // No refresh token — clear auth and redirect to login
        localStorage.removeItem('upos_auth')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue requests while refresh is in-flight
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data

        // Persist new tokens
        const saved = JSON.parse(localStorage.getItem('upos_auth') ?? '{}')
        saved.accessToken = accessToken
        if (newRefresh) saved.refreshToken = newRefresh
        localStorage.setItem('upos_auth', JSON.stringify(saved))

        processQueue(accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('upos_auth')
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
