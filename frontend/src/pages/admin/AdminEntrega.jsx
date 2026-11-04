import { useState } from 'react'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { tarjeta } from '../../components/dashboard/comunes.jsx'
import { CATEGORIAS } from '../../utils/recursos.jsx'

const nombreUsuario = (usuario) => {
  if (!usuario) return 'Sin usuario'
  return [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ')
}

const nombreRecurso = (recurso) => recurso?.nombre ?? 'Recurso eliminado'

export default function AdminEntrega() {
  const { cargando, error, prestamos } = useDashboardAdmin()
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const filas = prestamos.filter(
    (prestamo) =>
      ['aprobado', 'entregado', 'devuelto'].includes(prestamo.estado) &&
      (!categoriaSeleccionada || prestamo.recurso?.categoria === categoriaSeleccionada),
  )

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Entrega y devolución</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Control de recursos en tránsito y de retorno a inventario.</p>
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="filtro-categoria-entrega" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Filtrar por categoría
          </label>
          <select
            id="filtro-categoria-entrega"
            value={categoriaSeleccionada}
            onChange={(event) => setCategoriaSeleccionada(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria.valor} value={categoria.valor}>
                {categoria.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className={`${tarjeta} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Estudiante</th>
                <th className="px-4 py-3 font-semibold">Recurso</th>
                <th className="px-4 py-3 font-semibold">Fecha de entrega</th>
                <th className="px-4 py-3 font-semibold">Devolución prevista</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando entregas…</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-red-600 dark:text-red-400">{error}</td>
                </tr>
              )}
              {!cargando && !error && filas.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No hay entregas ni devoluciones activas.</td>
                </tr>
              )}
              {!cargando && !error && filas.map((prestamo) => (
                <tr key={prestamo._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{nombreUsuario(prestamo.usuario)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{nombreRecurso(prestamo.recurso)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {prestamo.fechaEntrega ? new Date(prestamo.fechaEntrega).toLocaleDateString('es-EC') : 'Pendiente'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {prestamo.fechaDevolucion ? new Date(prestamo.fechaDevolucion).toLocaleDateString('es-EC') : 'Sin fecha'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
