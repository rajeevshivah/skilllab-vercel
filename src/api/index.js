import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sl_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('sl_token'); localStorage.removeItem('sl_user')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export const authAPI = {
  login:      (d)     => api.post('/auth/login', d),
  me:         ()      => api.get('/auth/me'),
  getUsers:   ()      => api.get('/auth/users'),
  createUser: (d)     => api.post('/auth/users', d),
  updateUser: (id, d) => api.patch(`/auth/users/${id}`, d),
  deleteUser: (id)    => api.delete(`/auth/users/${id}`),
}

export const studentsAPI = {
  list:      (p)      => api.get('/students', { params: p }),
  getPhoto:  (id)     => api.get(`/students/${id}`, { params: { photo: 1 } }),
  getCycles: ()       => api.get('/students/cycles'),
  create:    (d)      => api.post('/students', d),
  update:    (id, d)  => api.put(`/students/${id}`, d),
  delete:    (id)     => api.delete(`/students/${id}`),
}

export const reportsAPI = {
  list:               (p)                      => api.get('/reports', { params: p }),
  get:                (id)                     => api.get(`/reports/${id}`),
  save:               (d)                      => api.post('/reports', d),
  update:             (id, d)                  => api.patch(`/reports/${id}`, d),
  submit:             (id)                     => api.post(`/reports/${id}/submit`),
  lock:               (id)                     => api.post(`/reports/${id}/lock`),
  download:           (id)                     => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  combinedDownload:   (cycle)                  => api.get(`/reports?combined=1&cycle=${encodeURIComponent(cycle)}`, { responseType: 'blob' }),
  executiveSummary:   (cycle)                  => api.get(`/reports?executive=1&cycle=${encodeURIComponent(cycle)}`, { responseType: 'blob' }),
  consolidatedReport: (reportIds, reportingPeriod) => api.post('/reports?consolidated=1', { reportIds, reportingPeriod }, { responseType: 'blob' }),
}

export default api