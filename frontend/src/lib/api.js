import axios from 'axios'

// Global API configuration — points at the REWIRE FastAPI backend.
export const API_BASE_URL = 'http://127.0.0.1:8077'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export const getStats = () => api.get('/stats').then((r) => r.data)

export const getDiseases = () => api.get('/diseases').then((r) => r.data)

export const rankDrugs = (disease_name, top_k) =>
  api.post('/rank', { disease_name, top_k }).then((r) => r.data)

export const getDrugGraph = (name) =>
  api.get(`/drug/${encodeURIComponent(name)}/graph`).then((r) => r.data)

export default api
