import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sl_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sl_token')
      localStorage.removeItem('sl_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
