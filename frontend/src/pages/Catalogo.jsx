import FiltrosRecursos from '../components/recursos/FiltrosRecursos.jsx'
import TarjetaRecurso from '../components/recursos/TarjetaRecurso.jsx'
import { EsqueletoRecursos, ErrorRecursos, SinRecursos } from '../components/recursos/EstadosLista.jsx'
import useFiltrosRecursos from '../hooks/useFiltrosRecursos.js'
import useRecursos from '../hooks/useRecursos.js'

/* ---------- Catálogo público de recursos (HU-006 / HU-007) ---------- */
export default function Catalogo() {
  const filtros = useFiltrosRecursos()
  const { recursos, cargando, error, recargar } = useRecursos(filtros.filtros)

  return (
    <div className="space-y-8">
      {/* Encabezado con el mismo lenguaje visual del hero de la landing */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-epn-900 px-6 py-10 sm:px-10">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-epn-950 via-epn-900 to-epn-800" />
        <div className="absolute -top-20 -right-16 -z-10 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
        <svg className="pointer-events-none absolute right-0 bottom-0 -z-10 h-28 w-96 text-brand-500/20" viewBox="0 0 320 100" fill="currentColor" aria-hidden="true">
          <path d="M0 100 70 60l30 12 60-50 25 15 20-12 55 40 60 15v20z" />
        </svg>
        <p className="-rotate-2 font-script text-2xl font-bold text-brand-400">Encuentra lo que necesitas</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Catálogo de recursos</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
          Recursos técnicos, académicos y recreativos de las asociaciones estudiantiles de la EPN, con su disponibilidad en tiempo real.
        </p>
      </section>

      <FiltrosRecursos {...filtros} />

      <div aria-live="polite">
        {!cargando && !error && (
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {recursos.length} {recursos.length === 1 ? 'recurso encontrado' : 'recursos encontrados'}
          </p>
        )}
        {cargando ? (
          <EsqueletoRecursos />
        ) : error ? (
          <ErrorRecursos mensaje={error} onReintentar={recargar} />
        ) : recursos.length === 0 ? (
          <SinRecursos hayFiltros={filtros.hayFiltros} onLimpiar={filtros.limpiar} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map((r, i) => (
              <TarjetaRecurso key={r._id} recurso={r} indice={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
