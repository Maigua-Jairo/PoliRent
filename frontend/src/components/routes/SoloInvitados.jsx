import { Navigate, Outlet } from 'react-router-dom'
import { rutaInicio, useAuthStore } from '../../store/authStore.js'

/* Login, registro y recuperación de clave no tienen sentido con una sesión activa */
export default function SoloInvitados() {
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)
  return token ? <Navigate to={rutaInicio(usuario)} replace /> : <Outlet />
}
