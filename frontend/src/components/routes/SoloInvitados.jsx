import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'

/* Login, registro y recuperación de clave no tienen sentido con una sesión activa */
export default function SoloInvitados() {
  const token = useAuthStore((state) => state.token)
  return token ? <Navigate to="/" replace /> : <Outlet />
}
