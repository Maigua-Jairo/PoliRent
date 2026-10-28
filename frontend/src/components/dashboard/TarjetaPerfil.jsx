import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import Avatar from '../Avatar.jsx'
import { iconos } from '../layout/iconos.jsx'
import { esAdministrador } from '../../store/authStore.js'
import { tarjeta } from './comunes.jsx'

/* ---------- Resumen de la cuenta con acceso a editar el perfil ---------- */
export default function TarjetaPerfil({ usuario }) {
  return (
    <section aria-labelledby="titulo-perfil" className={`${tarjeta} p-5`}>
      <div className="flex items-center justify-between">
        <h2 id="titulo-perfil" className="text-lg font-bold text-epn-900 dark:text-white">
          Tu perfil
        </h2>
        <Link
          to="/perfil"
          aria-label="Configuración de cuenta"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Icon size={18}>{iconos.ajustes}</Icon>
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Avatar usuario={usuario} tamano="lg" />
        <div className="min-w-0 text-sm">
          <p className="truncate font-bold text-epn-900 dark:text-white">
            {usuario?.nombres} {usuario?.apellidos}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {esAdministrador(usuario) ? 'Administrador' : 'Estudiante'}
            {usuario?.facultad ? ` · ${usuario.facultad}` : ''}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{usuario?.correo}</p>
        </div>
      </div>
      <Link
        to="/perfil"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-brand-400 dark:hover:bg-slate-800"
      >
        <Icon size={14}>{iconos.lapiz}</Icon> Editar perfil
      </Link>
    </section>
  )
}
