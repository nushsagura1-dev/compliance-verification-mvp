import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

// Attach admin key from session storage on every request
api.interceptors.request.use((config) => {
  const key = sessionStorage.getItem('admin_key')
  if (key) {
    config.headers['X-Admin-Key'] = key
  }
  return config
})

export const setAdminKey = (key) => sessionStorage.setItem('admin_key', key)
export const clearAdminKey = () => sessionStorage.removeItem('admin_key')
export const getAdminKey = () => sessionStorage.getItem('admin_key')

// ── Domain API ────────────────────────────────────────────────────────────────

export const fetchDomains = (skip = 0, limit = 100) =>
  api.get('/admin/domains', { params: { skip, limit } }).then((r) => r.data)

export const createDomain = (domain_name, compliance_level) =>
  api.post('/admin/domains', { domain_name, compliance_level }).then((r) => r.data)

export const revokeDomain = (id) =>
  api.patch(`/admin/domains/${id}/revoke`).then((r) => r.data)

export const deleteDomain = (id) =>
  api.delete(`/admin/domains/${id}`).then((r) => r.data)

export const verifyDomain = (domain) =>
  api.get('/verify', { params: { domain } }).then((r) => r.data)
