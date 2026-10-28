import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import Avatar from '../Avatar.jsx'
import { iconos } from './iconos.jsx'
import { esAdministrador, rutaInicio } from '../../store/authStore.js'
import useCerrarSesion from '../../hooks/useCerrarSesion.js'

const opcion =
  'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'

/* ---------- Menú desplegable del usuario (avatar con iniciales) ---------- */
export default function MenuUsuario({ usuario }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef(null)
  const cerrarSesion = useCerrarSesion()

  useEffect(() => {
    if (!abierto) return
    const alClic = (e) => !contenedor.current?.contains(e.target) && setAbierto(false)
    const alTecla = (e) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  const cerrar = () => setAbierto(false)
  const rol = esAdministrador(usuario) ? 'Administrador' : 'Estudiante'
  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Avatar usuario={usuario} />
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-sm font-bold text-epn-900 dark:text-white">
            {usuario?.nombres?.split(' ')[0]} {usuario?.apellidos?.split(' ')[0]}
          </span>
          <span className="max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">
            {rol}
            {usuario?.facultad ? ` · ${usuario.facultad}` : ''}
          </span>
        </span>
        <Icon size={16} className="hidden text-slate-500 sm:block">
          {iconos.abajo}
        </Icon>
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        >
          <Link to={rutaInicio(usuario)} role="menuitem" onClick={cerrar} className={opcion}>
            <Icon size={16}>{iconos.gestion}</Icon> Mi panel
          </Link>
          {/* Para seguir explorando la landing y el catálogo */}
          <Link to="/" role="menuitem" onClick={cerrar} className={opcion}>
            <Icon size={16}>{iconos.inicio}</Icon> Página principal
          </Link>
          <Link to="/perfil" role="menuitem" onClick={cerrar} className={opcion}>
            <Icon size={16}>{iconos.cuenta}</Icon> Mi cuenta
          </Link>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            type="button"
            role="menuitem"
            onClick={cerrarSesion}
            className={`${opcion} text-red-600! hover:bg-red-50 dark:text-red-400! dark:hover:bg-red-500/10`}
          >
            <Icon size={16}>{iconos.salir}</Icon> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
