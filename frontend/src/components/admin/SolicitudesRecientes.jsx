import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import EtiquetaPrestamo from '../prestamos/EtiquetaPrestamo.jsx'
import { iconos } from '../layout/iconos.jsx'
import { CabeceraSeccion, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'
import { buscarCategoria } from '../../utils/recursos.jsx'
import { formatearFechaHora } from '../../utils/prestamos.js'
import { codigoSolicitud } from '../../utils/reporte.js'

const accion =
  'grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-40'

/* ---------- Últimas solicitudes con acciones de aprobar / rechazar (HU-003) ---------- */
export default function SolicitudesRecientes({ prestamos, cargando, procesando, onAprobar, onRechazar, limite = 6 }) {
  const recientes = [...prestamos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limite)

  let contenido
  if (cargando) {
    contenido = (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-10" />
        ))}
      </div>
    )
  } else if (!recientes.length) {
    contenido = <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Aún no hay solicitudes de préstamo.</p>
  } else {
    contenido = (
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              {['ID', 'Usuario', 'Recurso', 'Tipo', 'Fecha solicitud', 'Estado'].map((columna) => (
                <th key={columna} scope="col" className={`px-3 py-3 whitespace-nowrap ${['ID', 'Tipo'].includes(columna) ? 'hidden 2xl:table-cell' : ''}`}>
                  {columna}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recientes.map((p) => {
              const usuario = [p.usuario?.nombres?.split(' ')[0], p.usuario?.apellidos?.split(' ')[0]].filter(Boolean).join(' ') || '—'
              const recurso = p.recurso?.nombre ?? 'Recurso eliminado'
              const pendiente = p.estado === 'pendiente'
              return (
                <tr key={p._id} className="text-slate-700 dark:text-slate-300">
                  <td className="hidden px-3 py-3 font-mono text-xs whitespace-nowrap text-slate-500 2xl:table-cell dark:text-slate-400">{codigoSolicitud(p)}</td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap text-epn-900 dark:text-white">{usuario}</td>
                  <td className="max-w-44 truncate px-3 py-3" title={recurso}>
                    {recurso}
                  </td>
                  <td className="hidden px-3 py-3 2xl:table-cell">{p.recurso ? buscarCategoria(p.recurso.categoria).etiqueta : '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatearFechaHora(p.createdAt)}</td>
                  <td className="px-3 py-3">
                    <EtiquetaPrestamo estado={p.estado} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      {pendiente && (
                        <>
                          <button
                            type="button"
                            onClick={() => onAprobar(p)}
                            disabled={procesando}
                            aria-label={`Aprobar solicitud de ${usuario} para ${recurso}`}
                            title="Aprobar"
                            className={`${accion} text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10`}
                          >
                            <Icon size={18} stroke={2.4}>{iconos.check}</Icon>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRechazar(p)}
                            disabled={procesando}
                            aria-label={`Rechazar solicitud de ${usuario} para ${recurso}`}
                            title="Rechazar"
                            className={`${accion} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
                          >
                            <Icon size={18} stroke={2.4}>{iconos.cerrar}</Icon>
                          </button>
                        </>
                      )}
                      {p.recurso?._id && (
                        <Link
                          to={`/recursos/${p.recurso._id}`}
                          aria-label={`Ver ${recurso}`}
                          title="Ver recurso"
                          className={`${accion} text-brand-600 hover:bg-brand-500/10 dark:text-brand-400`}
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
    )
  }

  return (
    <section id="solicitudes-recientes" aria-labelledby="titulo-solicitudes-recientes" className={`${tarjeta} scroll-mt-24 overflow-hidden`}>
      <div className="p-5 pb-4">
        <CabeceraSeccion id="titulo-solicitudes-recientes" titulo="Solicitudes recientes" />
      </div>
      {contenido}
    </section>
  )
}
