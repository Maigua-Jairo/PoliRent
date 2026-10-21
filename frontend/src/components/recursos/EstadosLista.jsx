import Alerta from '../Alerta.jsx'
import { btnSecondary } from '../auth/authStyles.jsx'

/* ---------- Esqueleto de carga para la grilla de recursos ---------- */
export function EsqueletoRecursos({ cantidad = 6 }) {
  return (
    <div role="status" aria-label="Cargando recursos" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Error de carga con opción de reintentar ---------- */
export function ErrorRecursos({ mensaje, onReintentar }) {
  return (
    <div className="space-y-3">
      <Alerta>{mensaje}</Alerta>
      <button type="button" onClick={onReintentar} className={btnSecondary}>
        Reintentar
      </button>
    </div>
  )
}

/* ---------- Sin resultados ---------- */
export function SinRecursos({ hayFiltros, onLimpiar, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
      <p className="font-script text-3xl font-bold text-epn-900 dark:text-white">
        {hayFiltros ? 'Nada por aquí…' : 'Aún no hay recursos'}
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {hayFiltros
          ? 'Ningún recurso coincide con tu búsqueda. Prueba con otros filtros.'
          : 'Cuando las asociaciones registren recursos aparecerán en este catálogo.'}
      </p>
      <div className="mt-5 flex justify-center gap-3">
        {hayFiltros && (
          <button type="button" onClick={onLimpiar} className={btnSecondary}>
            Limpiar filtros
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
