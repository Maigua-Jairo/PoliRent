import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { icons } from '../auth/authStyles.jsx'

export default function FiltrosTablaAdmin({ busqueda, onBusqueda, estado, onEstado, estados, etiquetaBusqueda }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center">
      <div className="relative w-full min-w-0 flex-1 sm:max-w-xl">
        <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
          {iconos.buscar}
        </Icon>
        <input
          type="search"
          value={busqueda}
          onChange={(event) => onBusqueda(event.target.value)}
          placeholder={etiquetaBusqueda}
          aria-label={etiquetaBusqueda}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <div className="relative">
        <select
          value={estado}
          onChange={(event) => onEstado(event.target.value)}
          aria-label="Filtrar por estado"
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none sm:w-44 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">Todos los estados</option>
          {estados.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <Icon size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400">
          {icons.chevron}
        </Icon>
      </div>
    </div>
  )
}
