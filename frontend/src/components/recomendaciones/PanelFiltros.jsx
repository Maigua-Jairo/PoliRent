import { CATEGORIAS } from '../../utils/recursos.jsx'

const chip = (activo) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
    activo
      ? 'bg-brand-500 text-white ring-brand-500'
      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
  }`

/* ---------- Filtro compacto por categoría (se aplica a la siguiente consulta) ---------- */
export default function PanelFiltros({ id, categoria, onCategoria }) {
  return (
    <div id={id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
      <p className="mb-2 text-xs font-bold text-epn-900 dark:text-white">Tipo de recurso</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de recurso">
        <button type="button" aria-pressed={!categoria} onClick={() => onCategoria('')} className={chip(!categoria)}>
          Todos
        </button>
        {CATEGORIAS.map((c) => (
          <button key={c.valor} type="button" aria-pressed={categoria === c.valor} onClick={() => onCategoria(c.valor)} className={chip(categoria === c.valor)}>
            {c.plural}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Solo se recomiendan recursos disponibles.</p>
    </div>
  )
}
