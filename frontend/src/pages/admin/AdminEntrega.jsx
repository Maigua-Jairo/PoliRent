import { useCallback, useState } from 'react'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import DialogoEntrega from '../../components/admin/DialogoEntrega.jsx'
import DialogoDevolucion from '../../components/admin/DialogoDevolucion.jsx'
import Alerta from '../../components/Alerta.jsx'
import FiltrosTablaAdmin from '../../components/admin/FiltrosTablaAdmin.jsx'
import { tarjeta } from '../../components/dashboard/comunes.jsx'
import { ESTADOS_PRESTAMO, filtrarPrestamosAdmin } from '../../utils/prestamos.js'

const nombreUsuario = (usuario) => {
  if (!usuario) return 'Sin usuario'
  return [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ')
}

const nombreRecurso = (recurso) => recurso?.nombre ?? 'Recurso eliminado'

export default function AdminEntrega() {
  const { cargando, error, prestamos, recargar } = useDashboardAdmin()
  const [seccion, setSeccion] = useState('entregas')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [aEntregar, setAEntregar] = useState(null)
  const [aDevolver, setADevolver] = useState(null)
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: '' })
  const cerrarEntrega = useCallback(() => setAEntregar(null), [])
  const cerrarDevolucion = useCallback(() => setADevolver(null), [])
  const mostrarResultado = useCallback((resultado) => setAviso(resultado), [])
  const esEntrega = seccion === 'entregas'
  const estadoFlujo = esEntrega ? 'aprobado' : 'entregado'
  const estadosFlujo = ESTADOS_PRESTAMO.filter((opcion) => opcion.valor === estadoFlujo)
  const filas = filtrarPrestamosAdmin(prestamos, {
    busqueda,
    estado,
    estadosIncluidos: [estadoFlujo],
  })
  const etiquetaTabla = esEntrega ? 'Tabla de entregas por registrar' : 'Tabla de devoluciones por registrar'

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Entrega y devolución</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Registra la entrega de recursos aprobados y su devolución.</p>
        </div>
        <div role="tablist" aria-label="Tipo de movimiento" className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
          {[
            { valor: 'entregas', etiqueta: 'Entregas', total: prestamos.filter((prestamo) => prestamo.estado === 'aprobado').length },
            { valor: 'devoluciones', etiqueta: 'Devoluciones', total: prestamos.filter((prestamo) => prestamo.estado === 'entregado').length },
          ].map((opcion) => (
            <button
              key={opcion.valor}
              id={`pestana-${opcion.valor}`}
              type="button"
              role="tab"
              aria-selected={seccion === opcion.valor}
              aria-controls="panel-movimientos"
              onClick={() => {
                setSeccion(opcion.valor)
                setEstado('')
              }}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                seccion === opcion.valor
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opcion.etiqueta}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{opcion.total}</span>
            </button>
          ))}
        </div>
        <FiltrosTablaAdmin
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          estado={estado}
          onEstado={setEstado}
          estados={estadosFlujo}
          etiquetaBusqueda="Buscar estudiante o recurso..."
        />
      </div>

      <section className={`${tarjeta} overflow-hidden`}>
        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label={etiquetaTabla}
          tabIndex={0}
        >
          <div className="scroll-progreso sticky top-0 z-20 -mb-[3px] h-[3px] bg-brand-500" aria-hidden="true" />
          <div role="tabpanel" id="panel-movimientos" aria-labelledby={`pestana-${seccion}`}>
            <table className="w-full table-fixed text-left text-sm">
              <thead className="sticky top-[3px] z-10 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">ID</th>
                  <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Estudiante</th>
                  <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Recurso</th>
                  <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">{esEntrega ? 'Fecha de solicitud' : 'Fecha de entrega'}</th>
                  <th scope="col" className="break-words px-2 py-3 font-semibold sm:px-4">Devolución prevista</th>
                  <th scope="col" className="px-2 py-3 text-center font-semibold sm:px-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      Cargando {esEntrega ? 'entregas' : 'devoluciones'}…
                    </td>
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
                      {busqueda || estado
                        ? `No hay ${esEntrega ? 'entregas' : 'devoluciones'} que coincidan con los filtros.`
                        : esEntrega ? 'No hay entregas pendientes de registrar.' : 'No hay préstamos pendientes de devolución.'}
                    </td>
                  </tr>
                )}
                {!cargando && !error && filas.map((prestamo, indice) => (
                  <tr key={prestamo._id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-2 py-3 font-mono text-xs text-slate-500 sm:px-4 dark:text-slate-400">{indice + 1}</td>
                    <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreUsuario(prestamo.usuario)}</td>
                    <td className="break-words px-2 py-3 text-slate-700 sm:px-4 dark:text-slate-300">{nombreRecurso(prestamo.recurso)}</td>
                    <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">
                      {esEntrega
                        ? new Date(prestamo.createdAt).toLocaleDateString('es-EC')
                        : prestamo.fechaEntrega ? new Date(prestamo.fechaEntrega).toLocaleDateString('es-EC') : 'Sin fecha'}
                    </td>
                    <td className="break-words px-2 py-3 text-slate-600 sm:px-4 dark:text-slate-300">
                      {prestamo.fechaDevolucion ? new Date(prestamo.fechaDevolucion).toLocaleDateString('es-EC') : 'Sin fecha'}
                    </td>
                    <td className="px-2 py-3 text-center sm:px-4">
                      {esEntrega ? (
                        <button
                          type="button"
                          onClick={() => setAEntregar(prestamo)}
                          aria-label={`Registrar entrega de ${nombreRecurso(prestamo.recurso)}`}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                          Registrar entrega
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setADevolver(prestamo)}
                          aria-label={`Registrar devolución de ${nombreRecurso(prestamo.recurso)}`}
                          className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                          Registrar devolución
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
      <DialogoEntrega
        prestamo={aEntregar}
        onCerrar={cerrarEntrega}
        onResultado={mostrarResultado}
        onRecargar={recargar}
      />
      <DialogoDevolucion
        prestamo={aDevolver}
        onCerrar={cerrarDevolucion}
        onResultado={mostrarResultado}
        onRecargar={recargar}
      />
    </div>
  )
}
