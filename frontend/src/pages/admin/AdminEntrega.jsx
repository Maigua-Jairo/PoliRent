import { useState } from 'react'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import FiltrosTablaAdmin from '../../components/admin/FiltrosTablaAdmin.jsx'
import { tarjeta } from '../../components/dashboard/comunes.jsx'
import { ESTADOS_PRESTAMO, filtrarPrestamosAdmin } from '../../utils/prestamos.js'

const nombreUsuario = (usuario) => {
  if (!usuario) return 'Sin usuario'
  return [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ')
}

const nombreRecurso = (recurso) => recurso?.nombre ?? 'Recurso eliminado'

export default function AdminEntrega() {
  const { cargando, error, prestamos } = useDashboardAdmin()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const estadosEntrega = ESTADOS_PRESTAMO.filter((opcion) => ['aprobado', 'entregado', 'devuelto'].includes(opcion.valor))
  const filas = filtrarPrestamosAdmin(prestamos, {
    busqueda,
    estado,
    estadosIncluidos: estadosEntrega.map((opcion) => opcion.valor),
  })

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Entrega y devolución</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Control de recursos en tránsito y de retorno a inventario.</p>
        </div>
        <FiltrosTablaAdmin
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          estado={estado}
          onEstado={setEstado}
          estados={estadosEntrega}
          etiquetaBusqueda="Buscar estudiante o recurso..."
        />
      </div>

      <section className={`${tarjeta} overflow-hidden`}>
        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Tabla de entregas y devoluciones"
          tabIndex={0}
        >
          <div className="scroll-progreso sticky top-0 z-20 -mb-[3px] h-[3px] bg-brand-500" aria-hidden="true" />
          <table className="w-full table-fixed text-left text-sm">
            <thead className="sticky top-[3px] z-10 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">ID</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Estudiante</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Recurso</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Fecha de entrega</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Devolución prevista</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando entregas…</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-red-600 dark:text-red-400">{error}</td>
                </tr>
              )}
              {!cargando && !error && filas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    {busqueda || estado ? 'No hay entregas ni devoluciones que coincidan con los filtros.' : 'No hay entregas ni devoluciones activas.'}
                  </td>
                </tr>
              )}
              {!cargando && !error && filas.map((prestamo, indice) => (
                <tr key={prestamo._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-2 py-3 font-mono text-xs text-slate-500 sm:px-4 dark:text-slate-400">{indice + 1}</td>
                  <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreUsuario(prestamo.usuario)}</td>
                  <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreRecurso(prestamo.recurso)}</td>
                  <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">
                    {prestamo.fechaEntrega ? new Date(prestamo.fechaEntrega).toLocaleDateString('es-EC') : 'Pendiente'}
                  </td>
                  <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">
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
