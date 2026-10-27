import axios from 'axios'

// Which college: the API decides from the address this page was opened on.
const ORG_HOST = typeof window !== 'undefined' ? window.location.hostname : ''

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sl_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  if (ORG_HOST) cfg.headers['X-Org-Host'] = ORG_HOST
  return cfg
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    // (also "signed in for another college": the saved login is for a different address)
    if (err.response?.status === 401 && !(err.config?.url || '').includes('/auth/login')) {
      localStorage.removeItem('sl_token')
      localStorage.removeItem('sl_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
