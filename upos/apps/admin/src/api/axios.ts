import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('upos_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || 'An error occurred'

    if (status === 401) {
      localStorage.removeItem('upos_admin_token')
      localStorage.removeItem('upos_admin_user')
      window.location.href = '/login'
    } else if (status === 403) {
      ElMessage.error('Access denied')
    } else if (status >= 500) {
      ElMessage.error(`Server error: ${message}`)
    }

    return Promise.reject(error)
  }
)

export default api
