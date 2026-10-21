import Icon from '../Icon.jsx'
import { icons, inputClass, selectClass } from '../auth/authStyles.jsx'
import { CATEGORIAS, ESTADOS } from '../../utils/recursos.jsx'

const lupa = (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
)

const chip = (activo) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
    activo
      ? 'bg-epn-900 text-white shadow-md dark:bg-brand-500'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800'
  }`

/* ---------- Búsqueda + filtros por categoría y estado ---------- */
export default function FiltrosRecursos({ buscar, categoria, estado, onBuscar, onCategoria, onEstado }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="buscar" className="sr-only">
            Buscar recursos
          </label>
          <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
            {lupa}
          </Icon>
          <input
            id="buscar"
            type="search"
            value={buscar}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar por nombre o descripción…"
            maxLength={100}
            className={inputClass(false)}
          />
        </div>
        <div className="relative sm:w-56">
          <label htmlFor="estado" className="sr-only">
            Filtrar por estado
          </label>
          <select id="estado" value={estado} onChange={(e) => onEstado(e.target.value)} className={selectClass}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.etiqueta}
              </option>
            ))}
          </select>
          <Icon size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400">
            {icons.chevron}
          </Icon>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!categoria} onClick={() => onCategoria('')} className={chip(!categoria)}>
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.valor}
            type="button"
            aria-pressed={categoria === c.valor}
            onClick={() => onCategoria(c.valor)}
            className={chip(categoria === c.valor)}
          >
            <Icon size={16}>{c.icono}</Icon>
            {c.plural}
          </button>
        ))}
      </div>
    </div>
  )
}
