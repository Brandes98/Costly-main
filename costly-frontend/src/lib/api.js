import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

// 👇 Función para obtener la URL base según entorno
const getBaseURL = () => {
  // En desarrollo local (npm run dev), usa el proxy de Vite
  if (import.meta.env.DEV) {
    return '/api/v1'
  }
  // En producción (Vercel), usa la variable de entorno
  return import.meta.env.VITE_API_URL || '/api/v1'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor request: agregar token JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor response: manejar 401
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api