import Icon from '../Icon.jsx'
import Avatar from '../Avatar.jsx'
import { iconos } from '../layout/iconos.jsx'
import TarjetaRecomendada from './TarjetaRecomendada.jsx'
import { buscarCategoria } from '../../utils/recursos.jsx'
import { EJEMPLOS_CONSULTA } from '../../utils/recomendaciones.js'

function AvatarBot() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-epn-900 text-white dark:bg-brand-500/20 dark:text-brand-300" aria-hidden="true">
      <Icon size={18}>{iconos.bot}</Icon>
    </span>
  )
}

function Hora({ children, clara = false }) {
  return <span className={`mt-1 block text-right text-[11px] ${clara ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{children}</span>
}

/* ---------- Burbuja del asistente: saludo, texto, resultados o error ---------- */
export function MensajeAsistente({ mensaje, nombre, onEjemplo }) {
  const { tipo, texto, hora, recomendaciones = [], terminos = [] } = mensaje
  return (
    <li className="flex items-start gap-3">
      <AvatarBot />
      <div className="min-w-0 flex-1 space-y-2">
        {tipo === 'bienvenida' && (
          <span className="inline-block rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
            Asistente de IA
          </span>
        )}
        <div
          className={`max-w-2xl rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${
            tipo === 'error'
              ? 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {tipo === 'bienvenida' ? (
            <>
              <p>
                ¡Hola, {nombre}! <span aria-hidden="true">👋</span>
              </p>
              <p>Cuéntame sobre tu proyecto o qué necesitas. Puedes decirme, por ejemplo:</p>
              <ul className="mt-2 space-y-1">
                {EJEMPLOS_CONSULTA.map((ejemplo) => (
                  <li key={ejemplo}>
                    <button
                      type="button"
                      onClick={() => onEjemplo(ejemplo)}
                      className="text-left text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
                    >
                      “{ejemplo}”
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>{texto}</p>
          )}
          {terminos.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5" aria-label="Términos detectados">
              {terminos.map((t) => (
                <span key={t} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-500/20 dark:bg-slate-900 dark:text-brand-300">
                  {t}
                </span>
              ))}
            </p>
          )}
          <Hora>{hora}</Hora>
        </div>

        {recomendaciones.length > 0 && (
          <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900/60 dark:ring-slate-800" aria-label="Recursos recomendados">
            <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-epn-900 dark:text-white">
              <Icon size={16} className="text-brand-500">{iconos.destello}</Icon>
              Recursos recomendados
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
              {recomendaciones.map(({ recurso, razon }) => (
                <TarjetaRecomendada key={recurso._id} recurso={recurso} razon={razon} />
              ))}
            </div>
          </section>
        )}
      </div>
    </li>
  )
}

/* ---------- Burbuja del estudiante con su consulta ---------- */
export function MensajeUsuario({ mensaje, usuario }) {
  const categoria = mensaje.categoria ? buscarCategoria(mensaje.categoria) : null
  return (
    <li className="flex items-start justify-end gap-3">
      <div className="max-w-xl rounded-2xl rounded-tr-sm bg-brand-500 px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-brand-500/25">
        <p className="whitespace-pre-line">{mensaje.texto}</p>
        {categoria && <p className="mt-2 text-xs font-semibold text-white/80">Filtro: {categoria.plural}</p>}
        <Hora clara>{mensaje.hora}</Hora>
      </div>
      <Avatar usuario={usuario} tamano="sm" className="mt-1" />
    </li>
  )
}

/* ---------- Indicador mientras el asistente busca ---------- */
export function Escribiendo() {
  return (
    <li className="flex items-center gap-3" role="status">
      <AvatarBot />
      <span className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <span className="sr-only">Buscando recursos…</span>
        {[0, 150, 300].map((retraso) => (
          <span
            key={retraso}
            className="h-2 w-2 rounded-full bg-slate-400 motion-safe:animate-bounce"
            style={{ animationDelay: `${retraso}ms` }}
            aria-hidden="true"
          />
        ))}
      </span>
    </li>
  )
}
