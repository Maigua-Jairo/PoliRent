import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import FormularioSolicitud from '../components/prestamos/FormularioSolicitud.jsx'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import EtiquetaEstado from '../components/recursos/EtiquetaEstado.jsx'
import ImagenRecurso from '../components/recursos/ImagenRecurso.jsx'
import { btnSecondary, icons } from '../components/auth/authStyles.jsx'
import { obtenerRecurso } from '../services/recursoService.js'
import { obtenerMensajeError } from '../services/authService.js'
import { esAdministrador, useAuthStore } from '../store/authStore.js'
import { buscarCategoria } from '../utils/recursos.jsx'
import useMisPrestamos from '../hooks/useMisPrestamos.js'
import { ESTADOS_ACTIVOS, mensajePrestamoActivo } from '../utils/prestamos.js'

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-EC', { dateStyle: 'long' }) : '—')

/* ---------- Bloque de reserva: formulario, aviso de no disponible o acceso para invitados ---------- */
function Reserva({ recurso, conSesion }) {
  const location = useLocation()
  if (!conSesion) {
    return (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p>Para reservar este recurso inicia sesión con tu cuenta institucional o regístrate si aún no tienes una.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/login" state={{ desde: `${location.pathname}#solicitar` }} className={btnSecondary}>
            Iniciar sesión
          </Link>
          <Link to="/registro" className={`${btnSecondary} border-brand-500 text-brand-600 dark:text-brand-400`}>
            Registrarse
          </Link>
        </div>
      </div>
    )
  }
  if (recurso.estado !== 'disponible') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Este recurso no está disponible en este momento
        {recurso.estado === 'mantenimiento' ? ' porque está en mantenimiento' : ' porque está prestado'}. Vuelve a consultarlo más tarde.
      </p>
    )
  }
  return <ReservaEstudiante recurso={recurso} />
}

function ReservaEstudiante({ recurso }) {
  const { cargando, error, prestamos, recargar } = useMisPrestamos()
  if (cargando) {
    return <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Verificando tus solicitudes…</p>
  }
  if (error) {
    return (
      <div className="space-y-3">
        <Alerta>{`No pudimos verificar si tienes un préstamo activo. ${error}`}</Alerta>
        <button type="button" onClick={recargar} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Reintentar verificación
        </button>
      </div>
    )
  }

  const prestamoActivo = prestamos.find((prestamo) => ESTADOS_ACTIVOS.includes(prestamo.estado))
  if (prestamoActivo) {
    return (
      <div className="space-y-3">
        <Alerta>{mensajePrestamoActivo(prestamoActivo)}</Alerta>
        <Link
          to={prestamoActivo._id ? `/solicitudes/${prestamoActivo._id}` : '/solicitudes'}
          className="inline-flex text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          Ver mi solicitud activa
        </Link>
      </div>
    )
  }

  return <FormularioSolicitud recurso={recurso} />
}

/* ---------- Detalle de un recurso del catálogo ---------- */
export default function DetalleRecurso() {
  const { id } = useParams()
  const { hash } = useLocation()
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)
  const [{ recurso, error }, setResultado] = useState({ recurso: null, error: '' })
  const [imagenAmpliada, setImagenAmpliada] = useState(false)
  const botonImagen = useRef(null)
  const botonCerrarImagen = useRef(null)

  useEffect(() => {
    let vigente = true
    obtenerRecurso(id)
      .then((recurso) => vigente && setResultado({ recurso, error: '' }))
      .catch((e) => vigente && setResultado({ recurso: null, error: obtenerMensajeError(e) }))
    return () => {
      vigente = false
    }
  }, [id])

  // "Reservar" desde las recomendaciones llega con #solicitar
  useEffect(() => {
    if (recurso && hash === '#solicitar') document.getElementById('solicitar')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [recurso, hash])

  useEffect(() => {
    if (!imagenAmpliada) return undefined
    const overflowAnterior = document.body.style.overflow
    const imagenActivadora = botonImagen.current
    document.body.style.overflow = 'hidden'
    botonCerrarImagen.current?.focus()
    return () => {
      document.body.style.overflow = overflowAnterior
      imagenActivadora?.focus()
    }
  }, [imagenAmpliada])

  const volver = (
    <Link to="/#recursos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
      <Icon size={18}>{icons.back}</Icon> Volver al catálogo
    </Link>
  )

  if (error) {
    return (
      <div className="space-y-4">
        {volver}
        <Alerta>{error}</Alerta>
      </div>
    )
  }
  if (!recurso) {
    return (
      <div role="status" aria-label="Cargando recurso" className="mx-auto w-full max-w-5xl animate-pulse overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.75fr)] md:items-center md:p-8">
          <div className="space-y-4">
            <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="aspect-[4/3] rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:p-8">
          <div className="mx-auto h-64 max-w-3xl rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const categoria = buscarCategoria(recurso.categoria)
  return (
    <div className="space-y-6">
      {volver}
      <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <section aria-label="Información del recurso" className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.75fr)] md:items-center md:gap-8 md:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wider uppercase ${categoria.tono}`}>
                <Icon size={14}>{categoria.icono}</Icon>
                {categoria.etiqueta}
              </span>
              <EtiquetaEstado estado={recurso.estado} />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">{recurso.nombre}</h1>
            <p className="mt-4 leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
              {recurso.descripcion || 'Este recurso aún no tiene descripción.'}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-sm dark:border-slate-800">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Registrado</dt>
                <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{fecha(recurso.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Última actualización</dt>
                <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{fecha(recurso.updatedAt)}</dd>
              </div>
            </dl>
            {esAdministrador(usuario) && (
              <Link to={`/admin/recursos/${recurso._id}/editar`} className={`${btnSecondary} mt-6`}>
                Editar recurso
              </Link>
            )}
          </div>
          {recurso.imagen ? (
            <button
              ref={botonImagen}
              type="button"
              onClick={() => setImagenAmpliada(true)}
              aria-label={`Ampliar imagen de ${recurso.nombre}`}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
            >
              <ImagenRecurso recurso={recurso} tamanoIcono={72} className="aspect-[4/3] w-full rounded-2xl shadow-sm ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-[1.02] dark:ring-slate-800" />
              <span className="absolute right-3 bottom-3 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white">
                Toca para ampliar
              </span>
            </button>
          ) : (
            <ImagenRecurso recurso={recurso} tamanoIcono={72} className="aspect-[4/3] w-full rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800" />
          )}
        </section>
        {!esAdministrador(usuario) && (
          <section
            id="solicitar"
            aria-label="Reserva del recurso"
            className="scroll-mt-24 border-t border-slate-200 p-5 dark:border-slate-800 md:p-8"
          >
            <div className="mx-auto max-w-3xl">
              <Reserva recurso={recurso} conSesion={Boolean(token)} />
            </div>
          </section>
        )}
      </article>
      {imagenAmpliada && recurso.imagen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${recurso.nombre}`}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-4 backdrop-blur-sm"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) setImagenAmpliada(false)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') setImagenAmpliada(false)
            if (evento.key === 'Tab') {
              evento.preventDefault()
              botonCerrarImagen.current?.focus()
            }
          }}
        >
          <button
            ref={botonCerrarImagen}
            type="button"
            onClick={() => setImagenAmpliada(false)}
            aria-label="Cerrar imagen ampliada"
            className="absolute top-4 right-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Cerrar
          </button>
          <img
            src={recurso.imagen}
            alt={`Imagen ampliada: ${recurso.nombre}`}
            className="max-h-[85dvh] max-w-[min(90vw,80rem)] rounded-2xl object-contain shadow-2xl"
          />
          <p className="text-sm text-slate-200">Presiona Escape o toca fuera de la imagen para cerrar.</p>
        </div>
      )}
    </div>
  )
}
