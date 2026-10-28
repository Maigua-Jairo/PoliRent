import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { btnPrimary } from '../auth/authStyles.jsx'
import { tarjeta } from '../dashboard/comunes.jsx'

const btnReporte = btnPrimary.replace('w-full', 'w-full sm:w-auto').replace('px-6 py-3', 'px-5 py-2.5 text-sm')

/* ---------- Descarga del reporte CSV (solicitudes + inventario) ---------- */
export default function ReporteRapido({ onReporte, deshabilitado }) {
  return (
    <section aria-labelledby="titulo-reporte" className={`${tarjeta} p-5`}>
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <Icon size={24}>{iconos.solicitudes}</Icon>
        </span>
        <div>
          <h2 id="titulo-reporte" className="font-bold text-epn-900 dark:text-white">
            Reporte rápido
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Descarga las solicitudes y el inventario en un archivo CSV que puedes abrir en Excel.
          </p>
        </div>
      </div>
      <button type="button" onClick={onReporte} disabled={deshabilitado} className={`${btnReporte} mt-4`}>
        <Icon size={16}>{iconos.descargar}</Icon> Generar reporte
      </button>
    </section>
  )
}
