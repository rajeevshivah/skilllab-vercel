import axios from 'axios'

// Direct axios instance — uses absolute paths
const api = axios.create()
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sl_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
export default api
