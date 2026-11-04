import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { tarjeta } from '../../components/dashboard/comunes.jsx'

const nombreUsuario = (usuario) => {
  if (!usuario) return 'Sin usuario'
  return [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ')
}

const nombreRecurso = (recurso) => recurso?.nombre ?? 'Recurso eliminado'

export default function AdminHistorial() {
  const { cargando, error, prestamos } = useDashboardAdmin()

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Historial de préstamos</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Seguimiento del histórico de solicitudes y movimientos del inventario.</p>
      </div>

      <section className={`${tarjeta} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Estudiante</th>
                <th className="px-4 py-3 font-semibold">Recurso</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Solicitado</th>
                <th className="px-4 py-3 font-semibold">Devolución</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Cargando historial…</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-red-600 dark:text-red-400">{error}</td>
                </tr>
              )}
              {!cargando && !error && prestamos.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">Aún no hay registros en el historial.</td>
                </tr>
              )}
              {!cargando && !error && prestamos.map((prestamo) => (
                <tr key={prestamo._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{nombreUsuario(prestamo.usuario)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{nombreRecurso(prestamo.recurso)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {prestamo.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(prestamo.createdAt).toLocaleDateString('es-EC')}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
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
