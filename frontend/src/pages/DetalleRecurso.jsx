import { useEffect, useState } from 'react'
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
  return <FormularioSolicitud recurso={recurso} />
}

/* ---------- Detalle de un recurso del catálogo ---------- */
export default function DetalleRecurso() {
  const { id } = useParams()
  const { hash } = useLocation()
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)
  const [{ recurso, error }, setResultado] = useState({ recurso: null, error: '' })

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
      <div role="status" aria-label="Cargando recurso" className="grid animate-pulse gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-4">
          <div className="h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-20 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const categoria = buscarCategoria(recurso.categoria)
  return (
    <div className="space-y-6">
      {volver}
      <article className="grid gap-8 md:grid-cols-2 md:items-start">
        <ImagenRecurso recurso={recurso} tamanoIcono={88} className="aspect-[4/3] w-full rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800" />
        <div>
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
          {!esAdministrador(usuario) && (
            <section
              id="solicitar"
              aria-label="Reserva del recurso"
              className="mt-6 scroll-mt-24 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <Reserva recurso={recurso} conSesion={Boolean(token)} />
            </section>
          )}
        </div>
      </article>
    </div>
  )
}
