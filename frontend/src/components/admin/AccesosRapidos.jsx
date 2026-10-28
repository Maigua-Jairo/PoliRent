import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { tarjeta } from '../dashboard/comunes.jsx'

const acceso =
  'flex min-w-0 flex-col items-start gap-2 rounded-xl p-3 text-left text-sm leading-snug font-semibold break-words text-epn-900 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:ring-brand-500/40 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-800/60'

function Contenido({ icono, tono, texto }) {
  return (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tono}`}>
        <Icon size={20}>{icono}</Icon>
      </span>
      {texto}
    </>
  )
}

/* ---------- Atajos a las tareas frecuentes del administrador ---------- */
export default function AccesosRapidos({ onReporte }) {
  return (
    <section aria-labelledby="titulo-accesos" className={`${tarjeta} h-full p-5`}>
      <h2 id="titulo-accesos" className="text-lg font-bold text-epn-900 dark:text-white">
        Accesos rápidos
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/admin/recursos" className={acceso}>
          <Contenido icono={iconos.lapiz} tono="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" texto="Gestionar herramientas" />
        </Link>
        <a href="#solicitudes-recientes" className={acceso}>
          <Contenido icono={iconos.solicitudes} tono="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" texto="Aprobar solicitudes" />
        </a>
        <a href="#inventario" className={acceso}>
          <Contenido icono={iconos.recursos} tono="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" texto="Ver inventario" />
        </a>
        <button type="button" onClick={onReporte} className={acceso}>
          <Contenido icono={iconos.descargar} tono="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" texto="Generar reporte" />
        </button>
      </div>
    </section>
  )
}
