import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'

/* Solo deja pasar a usuarios autenticados (y, si se indica, con alguno de los roles) */
export default function RutaProtegida({ roles }) {
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  if (roles && !roles.includes(usuario?.rol)) return <Navigate to="/" replace />
  return <Outlet />
}
