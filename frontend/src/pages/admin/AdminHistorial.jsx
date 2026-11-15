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

export default function AdminHistorial() {
  const { cargando, error, prestamos } = useDashboardAdmin()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const filas = filtrarPrestamosAdmin(prestamos, { busqueda, estado })

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Historial de préstamos</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Seguimiento del histórico de solicitudes y movimientos del inventario.</p>
      </div>

      <FiltrosTablaAdmin
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        estado={estado}
        onEstado={setEstado}
        estados={ESTADOS_PRESTAMO}
        etiquetaBusqueda="Buscar estudiante o recurso..."
      />

      <section className={`${tarjeta} overflow-hidden`}>
        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Tabla del historial de préstamos"
          tabIndex={0}
        >
          <table className="w-full table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">ID</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Estudiante</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Recurso</th>
                <th scope="col" className="break-words px-2 py-3 text-center font-semibold sm:px-4">Estado</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Solicitado</th>
                <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Devolución</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando historial…</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-red-600 dark:text-red-400">{error}</td>
                </tr>
              )}
              {!cargando && !error && filas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    {busqueda || estado ? 'No hay registros que coincidan con los filtros.' : 'Aún no hay registros en el historial.'}
                  </td>
                </tr>
              )}
              {!cargando && !error && filas.map((prestamo, indice) => (
                <tr key={prestamo._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-2 py-3 font-mono text-xs text-slate-500 sm:px-4 dark:text-slate-400">{indice + 1}</td>
                  <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreUsuario(prestamo.usuario)}</td>
                  <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreRecurso(prestamo.recurso)}</td>
                  <td className="break-words px-2 py-3 text-center sm:px-4">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {prestamo.estado}
                    </span>
                  </td>
                  <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">{new Date(prestamo.createdAt).toLocaleDateString('es-EC')}</td>
                  <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">
                    {prestamo.fechaDevolucion ? new Date(prestamo.fechaDevolucion).toLocaleDateString('es-EC') : '—'}
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
