import { useCallback, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import ImagenRecurso from '../components/recursos/ImagenRecurso.jsx'
import EtiquetaPrestamo from '../components/prestamos/EtiquetaPrestamo.jsx'
import DialogoCancelarPrestamo from '../components/prestamos/DialogoCancelarPrestamo.jsx'
import { Esqueleto, tarjeta } from '../components/dashboard/comunes.jsx'
import { iconos } from '../components/layout/iconos.jsx'
import { pestana } from '../components/auth/authStyles.jsx'
import useMisPrestamos from '../hooks/useMisPrestamos.js'
import { filtrarPorPestana, formatearFecha, PESTANAS_SOLICITUDES, puedeCancelar } from '../utils/prestamos.js'

const btnAccion =
  'inline-flex items-center justify-center rounded-lg border px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const btnVer = `${btnAccion} border-brand-500/40 text-brand-600 hover:bg-brand-500/10 dark:text-brand-400`
const btnCancelar = `${btnAccion} border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10`

const columnas = 'md:grid md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_auto] md:items-center md:gap-4'

/* ---------- Solicitudes del estudiante con su estado (HU-007) ---------- */
export default function MisSolicitudes() {
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { cargando, error, prestamos, recargar } = useMisPrestamos()
  const [aCancelar, setACancelar] = useState(null)
  // el mensaje llega al crear una solicitud desde el detalle del recurso
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: location.state?.mensaje ?? '' })

  const activa = PESTANAS_SOLICITUDES.some((p) => p.valor === params.get('estado')) ? params.get('estado') : 'todas'
  const visibles = filtrarPorPestana(prestamos, activa)
  const cerrarDialogo = useCallback(() => setACancelar(null), [])

  const onResultado = ({ tipo, texto }) => {
    setAviso({ tipo, texto })
    if (tipo === 'exito') recargar()
  }

  const elegir = (valor) => setParams(valor === 'todas' ? {} : { estado: valor }, { replace: true })

  let contenido
  if (cargando) {
    contenido = (
      <div className="space-y-3 p-4" role="status" aria-label="Cargando solicitudes">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-16" />
        ))}
      </div>
    )
  } else if (!visibles.length) {
    contenido = (
      <div className="px-6 py-14 text-center">
        <p className="font-script text-3xl font-bold text-epn-900 dark:text-white">
          {prestamos.length ? 'Nada por aquí…' : 'Aún no tienes solicitudes'}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {prestamos.length ? 'No hay solicitudes con este estado.' : 'Explora el catálogo y solicita tu primer recurso.'}
        </p>
        {!prestamos.length && (
          <Link to="/#recursos" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Ir al catálogo
          </Link>
        )}
      </div>
    )
  } else {
    contenido = (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {visibles.map((p) => {
          const recurso = p.recurso ?? { nombre: 'Recurso eliminado' }
          return (
            <li key={p._id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 ${columnas}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ImagenRecurso recurso={recurso} tamanoIcono={18} className="h-12 w-12 shrink-0 rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-epn-900 dark:text-white">{recurso.nombre}</span>
                  <span className="block text-xs text-slate-500 md:hidden dark:text-slate-400">{formatearFecha(p.createdAt)}</span>
                </span>
              </div>
              <span className="hidden text-sm text-slate-500 md:block dark:text-slate-400">{formatearFecha(p.createdAt)}</span>
              <span>
                <EtiquetaPrestamo estado={p.estado} />
              </span>
              <div className="flex gap-2 md:justify-end">
                <Link to={`/solicitudes/${p._id}`} className={btnVer} aria-label={`Ver solicitud de ${recurso.nombre}`}>
                  Ver
                </Link>
                {puedeCancelar(p) && (
                  <button type="button" onClick={() => setACancelar(p)} className={btnCancelar} aria-label={`Cancelar solicitud de ${recurso.nombre}`}>
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Mis Solicitudes</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Consulta el estado de tus solicitudes y gestiona tus préstamos.</p>
      </div>

      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
      <Alerta>{error}</Alerta>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por estado">
        {PESTANAS_SOLICITUDES.map((p) => (
          <button key={p.valor} type="button" aria-pressed={activa === p.valor} onClick={() => elegir(p.valor)} className={pestana(activa === p.valor)}>
            {p.etiqueta} <span className="opacity-70">({filtrarPorPestana(prestamos, p.valor).length})</span>
          </button>
        ))}
      </div>

      <section aria-label="Solicitudes" className={`${tarjeta} overflow-hidden`}>
        <div
          className={`hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold tracking-wide text-slate-600 uppercase md:grid dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 ${columnas}`}
          aria-hidden="true"
        >
          <span>Recurso</span>
          <span>Fecha solicitud</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>
        {contenido}
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
