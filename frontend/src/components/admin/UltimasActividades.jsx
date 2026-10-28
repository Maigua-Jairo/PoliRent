import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { CabeceraSeccion, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'
import { haceCuanto } from '../../utils/estadisticas.js'

const ESTILO = {
  nueva: { icono: iconos.solicitudes, tono: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  aprobada: { icono: iconos.check, tono: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  entrega: { icono: iconos.bolsa, tono: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' },
  devolucion: { icono: iconos.devolucion, tono: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  rechazada: { icono: iconos.equis, tono: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  cancelada: { icono: iconos.equis, tono: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400' },
  recurso: { icono: iconos.mas, tono: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
}

/* ---------- Actividad reciente de solicitudes y recursos ---------- */
export default function UltimasActividades({ actividades, ahora, cargando }) {
  return (
    <section aria-labelledby="titulo-actividades" className={`${tarjeta} h-full p-5`}>
      <CabeceraSeccion id="titulo-actividades" titulo="Últimas actividades" />
      {cargando ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} className="h-12" />
          ))}
        </div>
      ) : actividades.length ? (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {actividades.map((a) => {
            const { icono, tono } = ESTILO[a.tipo] ?? ESTILO.nueva
            return (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tono}`}>
                  <Icon size={16} stroke={2.4}>{icono}</Icon>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-epn-900 dark:text-white">{a.titulo}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{a.detalle}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{haceCuanto(a.fecha, ahora)}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Todavía no hay actividad registrada.</p>
      )}
    </section>
  )
}
