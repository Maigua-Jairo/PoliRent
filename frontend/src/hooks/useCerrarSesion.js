import { useNavigate } from 'react-router-dom'
import { cerrarSesion as cerrarSesionApi } from '../services/authService.js'
import { useAuthStore } from '../store/authStore.js'

/* Invalida el token en el backend y limpia la sesión local aunque la petición falle */
export default function useCerrarSesion() {
  const navigate = useNavigate()
  const cerrarSesion = useAuthStore((state) => state.cerrarSesion)

  return async () => {
    try {
      await cerrarSesionApi()
    } catch {
      // sin conexión o token ya inválido: igual se cierra la sesión local
    } finally {
      cerrarSesion()
      navigate('/', { replace: true })
    }
  }
}
