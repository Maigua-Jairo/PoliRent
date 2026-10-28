import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { tarjeta } from '../dashboard/comunes.jsx'
import { CONSEJOS_CONSULTA } from '../../utils/recomendaciones.js'
import { formatearFecha } from '../../utils/prestamos.js'

const DIA = 24 * 60 * 60 * 1000

const fechaRelativa = (fecha, ahora) => {
  const hora = new Date(fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dias = Math.round((new Date(ahora).setHours(0, 0, 0, 0) - new Date(fecha).setHours(0, 0, 0, 0)) / DIA)
  if (dias === 0) return `Hoy, ${hora}`
  if (dias === 1) return `Ayer, ${hora}`
  return formatearFecha(fecha)
}

/* ---------- Consejos para escribir una buena consulta ---------- */
export function ConsejosRapidos() {
  return (
    <section aria-labelledby="titulo-consejos" className={`${tarjeta} p-5`}>
      <div className="flex items-start gap-3">
        <Icon size={24} className="shrink-0 text-brand-500">{iconos.foco}</Icon>
        <div>
          <h2 id="titulo-consejos" className="font-bold text-epn-900 dark:text-white">
            Información rápida
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Consejos para mejores resultados</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {CONSEJOS_CONSULTA.map((consejo) => (
          <li key={consejo} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" aria-hidden="true">
              <Icon size={12} stroke={3}>{iconos.check}</Icon>
            </span>
            {consejo}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- Últimas consultas del estudiante (guardadas en este navegador) ---------- */
export function ConsultasRecientes({ consultas, ahora, onRepetir, deshabilitado }) {
  return (
    <section aria-labelledby="titulo-consultas" className={`${tarjeta} p-5`}>
      <h2 id="titulo-consultas" className="flex items-center gap-3 font-bold text-epn-900 dark:text-white">
        <Icon size={22} className="text-brand-500">{iconos.reloj}</Icon>
        Mis consultas recientes
      </h2>
      {consultas.length ? (
        <ul className="mt-3 space-y-1">
          {consultas.map(({ texto, fecha }) => (
            <li key={texto}>
              <button
                type="button"
                onClick={() => onRepetir(texto)}
                disabled={deshabilitado}
                className="-mx-2 flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800/60"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400" aria-hidden="true">
                  <Icon size={16}>{iconos.solicitudes}</Icon>
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{texto}</span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">{fechaRelativa(fecha, ahora)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Tus consultas aparecerán aquí para repetirlas con un clic.</p>
      )}
    </section>
  )
}
