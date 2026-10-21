import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { btnSecondary, icons } from './auth/authStyles.jsx'
import { esAdministrador, useAuthStore } from '../store/authStore.js'
import useCerrarSesion from '../hooks/useCerrarSesion.js'

/* ---------- Acciones del usuario autenticado en el encabezado ---------- */
export default function SesionUsuario({ className = '' }) {
  const usuario = useAuthStore((state) => state.usuario)
  const cerrarSesion = useCerrarSesion()

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Link
        to="/perfil"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400">
          <Icon size={16}>{icons.user}</Icon>
        </span>
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
