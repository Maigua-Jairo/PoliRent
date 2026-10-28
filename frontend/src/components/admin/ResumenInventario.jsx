import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { CabeceraSeccion, EnlaceVer, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'

const pastilla = 'inline-block min-w-10 rounded-full px-2.5 py-0.5 text-center text-xs font-semibold tabular-nums'

/* ---------- Inventario por categoría (también sirve como vista en tabla del anillo) ---------- */
export default function ResumenInventario({ inventario, cargando }) {
  return (
    <section id="inventario" aria-labelledby="titulo-inventario" className={`${tarjeta} h-full scroll-mt-24 overflow-hidden`}>
      <div className="p-5 pb-4">
        <CabeceraSeccion
          id="titulo-inventario"
          titulo="Resumen de inventario"
          enlace={<EnlaceVer to="/admin/recursos">Ver inventario completo</EnlaceVer>}
        />
      </div>
      {cargando ? (
        <Esqueleto className="mx-5 mb-5 h-40" />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Categoría
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Total
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  Disponibles
                </th>
                <th scope="col" className="px-3 py-3 text-center">
                  En uso
                </th>
                <th scope="col" className="w-10 px-3 py-3">
                  <span className="sr-only">Ver</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {inventario.map(({ categoria, total, disponibles, enUso }) => (
                <tr key={categoria.valor} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3 font-medium text-epn-900 dark:text-white">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${categoria.tono}`}>
                        <Icon size={18}>{categoria.icono}</Icon>
                      </span>
                      {categoria.plural}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{total}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`${pastilla} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300`}>{disponibles}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`${pastilla} bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300`}>{enUso}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to={`/admin/recursos?categoria=${categoria.valor}`}
                      aria-label={`Ver recursos ${categoria.plural.toLowerCase()}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                    >
                      <Icon size={16}>{iconos.derecha}</Icon>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
