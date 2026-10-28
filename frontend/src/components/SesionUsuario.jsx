import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'
import { btnSecondary, icons } from './auth/authStyles.jsx'
import { esAdministrador, rutaInicio, useAuthStore } from '../store/authStore.js'
import useCerrarSesion from '../hooks/useCerrarSesion.js'

/* ---------- Acciones del usuario autenticado en el encabezado ---------- */
export default function SesionUsuario({ className = '' }) {
  const usuario = useAuthStore((state) => state.usuario)
  const cerrarSesion = useCerrarSesion()

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Link
        to={rutaInicio(usuario)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Avatar usuario={usuario} tamano="sm" />
        <span className="flex flex-col leading-tight">
          {usuario?.nombres?.split(' ')[0] ?? 'Mi perfil'}
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {esAdministrador(usuario) ? 'Administrador' : 'Estudiante'}
          </span>
        </span>
      </Link>
      <button type="button" onClick={cerrarSesion} className={btnSecondary}>
        <Icon size={16}>{icons.logout}</Icon> Cerrar sesión
      </button>
    </div>
  )
}
