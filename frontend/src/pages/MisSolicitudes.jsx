import { useCallback, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import FiltrosTablaAdmin from '../components/admin/FiltrosTablaAdmin.jsx'
import ImagenRecurso from '../components/recursos/ImagenRecurso.jsx'
import EtiquetaPrestamo from '../components/prestamos/EtiquetaPrestamo.jsx'
import DialogoCancelarPrestamo from '../components/prestamos/DialogoCancelarPrestamo.jsx'
import { Esqueleto, tarjeta } from '../components/dashboard/comunes.jsx'
import { iconos } from '../components/layout/iconos.jsx'
import useMisPrestamos from '../hooks/useMisPrestamos.js'
import {
  filtrarPrestamosAdmin,
  formatearFecha,
  PESTANAS_SOLICITUDES,
  puedeCancelar,
} from '../utils/prestamos.js'

const btnIcono =
  'grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-400'
const btnCancelar =
  'hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400'

const columnas = 'lg:grid lg:grid-cols-[6rem_minmax(0,1fr)_9rem_8rem_10rem] lg:items-center lg:gap-4'

/* ---------- Solicitudes del estudiante con su estado (HU-007) ---------- */
export default function MisSolicitudes() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { cargando, error, prestamos, recargar } = useMisPrestamos()
  const [aCancelar, setACancelar] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  // el mensaje llega al crear una solicitud desde el detalle del recurso
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: location.state?.mensaje ?? '' })

  const activa = PESTANAS_SOLICITUDES.some((p) => p.valor === params.get('estado')) ? params.get('estado') : 'todas'
  const estadosIncluidos = PESTANAS_SOLICITUDES.find((p) => p.valor === activa)?.estados
  const visibles = filtrarPrestamosAdmin(prestamos, { busqueda, estadosIncluidos: estadosIncluidos ?? undefined })
  const cerrarDialogo = useCallback(() => setACancelar(null), [])

  const onResultado = ({ tipo, texto }) => {
    setAviso({ tipo, texto })
    if (tipo === 'exito') recargar()
  }

  const elegir = (valor) => setParams(valor === 'todas' ? {} : { estado: valor }, { replace: true })
  const cambiarEstado = (valor) => elegir(valor || 'todas')

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Mis Solicitudes</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Consulta el estado de tus solicitudes y gestiona tus préstamos.</p>
      </div>

      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
      <Alerta>{error}</Alerta>

      <FiltrosTablaAdmin
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        estado={activa === 'todas' ? '' : activa}
        onEstado={cambiarEstado}
        estados={PESTANAS_SOLICITUDES.filter((p) => p.valor !== 'todas')}
        etiquetaBusqueda="Buscar recurso..."
      />

      <section aria-label="Solicitudes" className={`${tarjeta} overflow-hidden`}>
        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Lista de solicitudes"
          tabIndex={0}
        >
          <div className="scroll-progreso sticky top-0 z-20 -mb-[3px] h-[3px] bg-brand-500" aria-hidden="true" />
          <div
            className={`sticky top-[3px] z-10 hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold tracking-wide text-slate-600 uppercase lg:grid dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 ${columnas}`}
            aria-hidden="true"
          >
            <span>ID</span>
            <span>Recurso</span>
            <span>Fecha solicitud</span>
            <span className="text-center">Estado</span>
            <span className="text-center">Acciones</span>
          </div>

          {cargando ? (
            <div className="space-y-3 p-4" role="status" aria-label="Cargando solicitudes">
              {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-16" />)}
            </div>
          ) : !visibles.length ? (
            <div className="px-6 py-14 text-center">
              <p className="font-script text-3xl font-bold text-epn-900 dark:text-white">
                {prestamos.length ? 'Nada por aquí…' : 'Aún no tienes solicitudes'}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {prestamos.length
                  ? 'No hay solicitudes que coincidan con los filtros.'
                  : 'Explora el catálogo y solicita tu primer recurso.'}
              </p>
              {!prestamos.length && (
                <Link to="/#recursos" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  Ir al catálogo
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibles.map((p, i) => {
                const recurso = p.recurso ?? { nombre: 'Recurso eliminado' }
                return (
                  <li
                    key={p._id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 motion-safe:animate-aparecer sm:px-6 ${columnas}`}
                    style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
                  >
                    <span className="w-20 shrink-0 font-mono text-xs text-slate-500 sm:w-24 lg:w-auto dark:text-slate-400">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ImagenRecurso recurso={recurso} tamanoIcono={18} className="h-12 w-12 shrink-0 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-epn-900 dark:text-white">{recurso.nombre}</span>
                        <span className="block text-xs text-slate-500 lg:hidden dark:text-slate-400">{formatearFecha(p.createdAt)}</span>
                      </span>
                    </div>
                    <span className="hidden whitespace-nowrap text-sm text-slate-500 lg:block dark:text-slate-400">{formatearFecha(p.createdAt)}</span>
                    <span className="flex justify-center">
                      <EtiquetaPrestamo estado={p.estado} />
                    </span>
                    <div className="ml-auto flex gap-1 lg:ml-0 lg:justify-center">
                      <Link
                        to={`/solicitudes/${p._id}`}
                        className={btnIcono}
                        aria-label={`Ver solicitud de ${recurso.nombre}`}
                        title="Ver solicitud"
                      >
                        <Icon size={18}>{iconos.ojo}</Icon>
                      </Link>
                      {puedeCancelar(p) && (
                        <button
                          type="button"
                          onClick={() => setACancelar(p)}
                          className={`${btnIcono} ${btnCancelar}`}
                          aria-label={`Cancelar solicitud de ${recurso.nombre}`}
                          title="Cancelar solicitud"
                        >
                          <Icon size={18}>{iconos.cerrar}</Icon>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {!cargando && prestamos.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Icon size={14}>{iconos.reloj}</Icon>
          Puedes cancelar una solicitud mientras esté en revisión o aprobada.
        </p>
      )}

      <DialogoCancelarPrestamo prestamo={aCancelar} onCerrar={cerrarDialogo} onResultado={onResultado} />
    </div>
  )
}
