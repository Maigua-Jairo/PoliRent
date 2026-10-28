import FiltrosRecursos from './FiltrosRecursos.jsx'
import TarjetaRecurso from './TarjetaRecurso.jsx'
import { EsqueletoRecursos, ErrorRecursos, SinRecursos } from './EstadosLista.jsx'
import useFiltrosRecursos from '../../hooks/useFiltrosRecursos.js'
import useRecursos from '../../hooks/useRecursos.js'

/* ---------- Catálogo completo (GET /api/recursos) con búsqueda y filtros en la URL (HU-006 / HU-007) ---------- */
export default function CatalogoRecursos() {
  const filtros = useFiltrosRecursos()
  const { recursos, cargando, error, recargar } = useRecursos(filtros.filtros)

  return (
    <div className="space-y-6">
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
