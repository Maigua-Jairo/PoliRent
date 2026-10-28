import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'

export const tarjeta = 'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

/* ---------- Enlace pequeño "Ver todos →" de las cabeceras ---------- */
export function EnlaceVer({ to, children, className = '' }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400 ${className}`}
    >
      {children}
      <Icon size={14}>{iconos.flecha}</Icon>
    </Link>
  )
}

/* ---------- Cabecera de una sección con título y enlace opcional ---------- */
export function CabeceraSeccion({ id, titulo, subtitulo, icono, enlace }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icono && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
            <Icon size={20}>{icono}</Icon>
          </span>
        )}
        <div>
          <h2 id={id} className="text-lg font-bold text-epn-900 dark:text-white">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
        </div>
      </div>
      {enlace}
    </div>
  )
}

/* ---------- Bloque gris animado mientras llegan los datos ---------- */
export function Esqueleto({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800 ${className}`} aria-hidden="true" />
}
