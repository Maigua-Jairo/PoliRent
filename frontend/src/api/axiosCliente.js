import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Un 401 en una petición autenticada significa que la sesión expiró o se cerró en otro dispositivo
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const conToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && conToken) useAuthStore.getState().cerrarSesion()
    return Promise.reject(error)
  },
)

export default axiosClient
