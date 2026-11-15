import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { tarjeta, Esqueleto } from '../../components/dashboard/comunes.jsx'
import DialogoRechazo from '../../components/admin/DialogoRechazo.jsx'
import FiltrosTablaAdmin from '../../components/admin/FiltrosTablaAdmin.jsx'
import Icon from '../../components/Icon.jsx'
import EtiquetaPrestamo from '../../components/prestamos/EtiquetaPrestamo.jsx'
import { iconos } from '../../components/layout/iconos.jsx'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { aprobarPrestamo } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { buscarCategoria } from '../../utils/recursos.jsx'
import { ESTADOS_PRESTAMO, filtrarPrestamosAdmin, formatearFechaHora } from '../../utils/prestamos.js'

const accion =
  'grid h-9 w-9 place-items-center rounded-lg text-brand-600/70 transition-colors hover:bg-brand-500/10 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-400/70 dark:hover:text-brand-400'

export default function AdminSolicitudes() {
  const { cargando, error, prestamos, recargar } = useDashboardAdmin()
  const [procesando, setProcesando] = useState(false)
  const [aRechazar, setARechazar] = useState(null)
  const [aviso, setAviso] = useState({ tipo: '', texto: '' })
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const cerrarRechazo = useCallback(() => setARechazar(null), [])

  const aprobar = async (prestamo) => {
    setProcesando(true)
    setAviso({ tipo: '', texto: '' })
    try {
      const respuesta = await aprobarPrestamo(prestamo._id)
      setAviso({ tipo: 'exito', texto: respuesta.msg })
      recargar()
    } catch (e) {
      setAviso({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setProcesando(false)
    }
  }

  const onRechazo = ({ tipo, texto }) => {
    setAviso({ tipo, texto })
    if (tipo === 'exito') recargar()
  }

  const solicitudes = filtrarPrestamosAdmin(
    [...prestamos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    { busqueda, estado },
  )

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Solicitudes de préstamo</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Revisa y gestiona las solicitudes registradas.</p>
      </div>

      {aviso.texto && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm ${
            aviso.tipo === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          {aviso.texto}
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      <FiltrosTablaAdmin
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        estado={estado}
        onEstado={setEstado}
        estados={ESTADOS_PRESTAMO}
        etiquetaBusqueda="Buscar estudiante o recurso..."
      />

      <section aria-labelledby="titulo-solicitudes-admin" className={`${tarjeta} overflow-hidden`}>
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-solicitudes-admin" className="text-lg font-bold text-epn-900 dark:text-white">Solicitudes registradas</h2>
            {!cargando && <span className="text-sm text-slate-500 dark:text-slate-400">{solicitudes.length} resultados</span>}
          </div>
        </div>

        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Tabla de solicitudes de préstamo"
          tabIndex={0}
        >
          <div className="scroll-progreso sticky top-0 z-20 -mb-[3px] h-[3px] bg-brand-500" aria-hidden="true" />
          <table className="w-full table-fixed text-left text-sm">
            <thead className="sticky top-[3px] z-10 bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                {['ID', 'Usuario', 'Recurso', 'Tipo', 'Fecha solicitud', 'Estado'].map((columna) => (
                  <th key={columna} scope="col" className={`break-words px-2 py-3 sm:px-3 ${['Tipo', 'Estado'].includes(columna) ? 'text-center' : ''} ${columna === 'Tipo' ? 'hidden 2xl:table-cell' : ''}`}>
                    {columna}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cargando && Array.from({ length: 4 }, (_, indice) => (
                <tr key={indice}>
                  <td colSpan="7" className="px-3 py-2"><Esqueleto className="h-9" /></td>
                </tr>
              ))}
              {!cargando && !error && solicitudes.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {busqueda || estado ? 'No hay solicitudes que coincidan con los filtros.' : 'Aún no hay solicitudes de préstamo.'}
                  </td>
                </tr>
              )}
              {!cargando && !error && solicitudes.map((prestamo, indice) => {
                const usuario = [prestamo.usuario?.nombres?.split(' ')[0], prestamo.usuario?.apellidos?.split(' ')[0]].filter(Boolean).join(' ') || '—'
                const recurso = prestamo.recurso?.nombre ?? 'Recurso eliminado'
                const pendiente = prestamo.estado === 'pendiente'
                return (
                  <tr key={prestamo._id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-2 py-3 font-mono text-xs text-slate-500 sm:px-3 dark:text-slate-400">{indice + 1}</td>
                    <td className="break-words px-2 py-3 font-medium text-epn-900 sm:px-3 dark:text-white">{usuario}</td>
                    <td className="break-words px-2 py-3 sm:px-3" title={recurso}>{recurso}</td>
                    <td className="hidden break-words px-3 py-3 text-center 2xl:table-cell">{prestamo.recurso ? buscarCategoria(prestamo.recurso.categoria).etiqueta : '—'}</td>
                    <td className="break-words px-2 py-3 sm:px-3">{formatearFechaHora(prestamo.createdAt)}</td>
                    <td className="break-words px-2 py-3 text-center sm:px-3"><EtiquetaPrestamo estado={prestamo.estado} /></td>
                    <td className="px-2 py-3 sm:px-3">
                      <div className="flex flex-wrap justify-center gap-1">
                        {pendiente && (
                          <>
                            <button
                              type="button"
                              onClick={() => aprobar(prestamo)}
                              disabled={procesando}
                              aria-label={`Aprobar solicitud de ${usuario} para ${recurso}`}
                              title="Aprobar"
                              className={accion}
                            >
                              <Icon size={18}>{iconos.check}</Icon>
                            </button>
                            <button
                              type="button"
                              onClick={() => setARechazar(prestamo)}
                              disabled={procesando}
                              aria-label={`Rechazar solicitud de ${usuario} para ${recurso}`}
                              title="Rechazar"
                              className={accion}
                            >
                              <Icon size={18}>{iconos.cerrar}</Icon>
                            </button>
                          </>
                        )}
                        {prestamo.recurso?._id && (
                          <Link
                            to={`/recursos/${prestamo.recurso._id}`}
                            aria-label={`Ver ${recurso}`}
                            title="Ver recurso"
                            className={accion}
                          >
                            <Icon size={18}>{iconos.ojo}</Icon>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <DialogoRechazo prestamo={aRechazar} onCerrar={cerrarRechazo} onResultado={onRechazo} />
    </div>
  )
}
