import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import ImagenRecurso from '../components/recursos/ImagenRecurso.jsx'
import EtiquetaPrestamo from '../components/prestamos/EtiquetaPrestamo.jsx'
import DialogoCancelarPrestamo from '../components/prestamos/DialogoCancelarPrestamo.jsx'
import { Esqueleto, tarjeta } from '../components/dashboard/comunes.jsx'
import { iconos } from '../components/layout/iconos.jsx'
import { btnPrimary } from '../components/auth/authStyles.jsx'
import useMisPrestamos from '../hooks/useMisPrestamos.js'
import {
  codigoRecurso,
  diasRestantes,
  formatearFecha,
  enCurso,
  INFO_ENTREGA,
  INSTRUCCIONES_DEVOLUCION,
  INSTRUCCIONES_RETIRO,
  puedeCancelar,
} from '../utils/prestamos.js'

const btnCancelar =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10'

function Fila({ etiqueta, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  )
}

function DatoEntrega({ icono, etiqueta, valor }) {
  return (
    <li className="flex items-start gap-4">
      <Icon size={22} className="mt-0.5 shrink-0 text-epn-800 dark:text-brand-400">{icono}</Icon>
      <span className="text-sm">
        {etiqueta && <span className="block text-slate-500 dark:text-slate-400">{etiqueta}</span>}
        <span className="font-medium text-slate-800 dark:text-slate-100">{valor}</span>
      </span>
    </li>
  )
}

const textoDias = (dias) => {
  if (dias > 1) return `${dias} días`
  if (dias === 1) return '1 día'
  if (dias === 0) return 'Vence hoy'
  return `Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
}

/* ---------- Pasos para retirar (aprobada) o devolver (en préstamo) el recurso ---------- */
function Instrucciones({ prestamo }) {
  const devolucion = prestamo.estado === 'entregado'
  return (
    <section aria-labelledby="titulo-instrucciones" className="rounded-xl bg-brand-500/5 p-5 ring-1 ring-brand-500/20">
      <h2 id="titulo-instrucciones" className="font-bold text-epn-900 dark:text-white">
        Instrucciones de {devolucion ? 'devolución' : 'retiro'}
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {(devolucion ? INSTRUCCIONES_DEVOLUCION : INSTRUCCIONES_RETIRO).map((paso) => (
          <li key={paso}>{paso}</li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Detalle de una solicitud del estudiante (HU-007) ---------- */
export default function DetallePrestamo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cargando, error, prestamos, ahora, recargar } = useMisPrestamos()
  const [verInstrucciones, setVerInstrucciones] = useState(false)
  const [aCancelar, setACancelar] = useState(null)
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: '' })
  const cerrarDialogo = useCallback(() => setACancelar(null), [])

  const prestamo = prestamos.find((p) => p._id === id)
  const migas = (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm">
      <Link to="/solicitudes" className="font-semibold text-slate-500 hover:text-brand-600 hover:underline dark:text-slate-400">
        Mis solicitudes
      </Link>
      <Icon size={14} className="text-slate-400">{iconos.derecha}</Icon>
      <span className="font-semibold text-epn-900 dark:text-white" aria-current="page">
        Detalle
      </span>
    </nav>
  )

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {migas}
        <Esqueleto className="h-96" />
      </div>
    )
  }

  if (!prestamo) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {migas}
        <Alerta>{error || 'No encontramos esta solicitud.'}</Alerta>
        <button type="button" onClick={() => navigate('/solicitudes')} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Volver a mis solicitudes
        </button>
      </div>
    )
  }

  const recurso = prestamo.recurso ?? { nombre: 'Recurso eliminado' }

  return (
    <div className="mx-auto max-w-3xl space-y-4 motion-safe:animate-aparecer">
      {migas}
      <h1 className="sr-only">Detalle del préstamo</h1>
      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>

      <article className={`${tarjeta} space-y-6 p-5 sm:p-6`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ImagenRecurso recurso={recurso} tamanoIcono={36} className="h-28 w-36 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-epn-900 dark:text-white">{recurso.nombre}</h2>
            {recurso._id && <p className="text-sm text-slate-500 dark:text-slate-400">Código: {codigoRecurso(recurso)}</p>}
            <EtiquetaPrestamo estado={prestamo.estado} className="mt-2" />
          </div>
        </header>

        <section aria-labelledby="titulo-info-prestamo" className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h3 id="titulo-info-prestamo" className="font-bold text-epn-900 dark:text-white">
            Información del préstamo
          </h3>
          <dl className="mt-2">
            <Fila etiqueta="Fecha de solicitud">{formatearFecha(prestamo.createdAt)}</Fila>
            {prestamo.fechaEntrega && <Fila etiqueta="Fecha de préstamo">{formatearFecha(prestamo.fechaEntrega)}</Fila>}
            <Fila etiqueta="Fecha de devolución">{formatearFecha(prestamo.fechaDevolucion)}</Fila>
            {prestamo.fechaDevolucionReal && <Fila etiqueta="Devuelto el">{formatearFecha(prestamo.fechaDevolucionReal)}</Fila>}
            {enCurso(prestamo) && <Fila etiqueta="Días restantes">{textoDias(diasRestantes(prestamo.fechaDevolucion, ahora))}</Fila>}
            {prestamo.motivo && <Fila etiqueta="Motivo">{prestamo.motivo}</Fila>}
            {prestamo.estado === 'rechazado' && <Fila etiqueta="Motivo del rechazo">{prestamo.motivoRechazo || 'Sin detalle'}</Fila>}
          </dl>
        </section>

        <section aria-labelledby="titulo-info-entrega" className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h3 id="titulo-info-entrega" className="font-bold text-epn-900 dark:text-white">
            Información de entrega y devolución
          </h3>
          <ul className="mt-4 space-y-4">
            <DatoEntrega icono={iconos.ubicacion} valor={`Retiro en ${INFO_ENTREGA.ubicacion}`} />
            <DatoEntrega icono={iconos.reloj} etiqueta="Horario de atención" valor={INFO_ENTREGA.horario} />
            <DatoEntrega icono={iconos.cuenta} etiqueta="Responsable" valor={INFO_ENTREGA.responsable} />
          </ul>
        </section>

        {verInstrucciones && enCurso(prestamo) && <Instrucciones prestamo={prestamo} />}

        {(enCurso(prestamo) || puedeCancelar(prestamo)) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {enCurso(prestamo) && (
              <button type="button" onClick={() => setVerInstrucciones((v) => !v)} aria-expanded={verInstrucciones} className={btnPrimary}>
                {verInstrucciones ? 'Ocultar instrucciones' : 'Ver instrucciones'}
              </button>
            )}
            {puedeCancelar(prestamo) && (
              <button type="button" onClick={() => setACancelar(prestamo)} className={`${btnCancelar} sm:col-start-2`}>
                Cancelar préstamo
              </button>
            )}
          </div>
        )}

        {recurso._id && (
          <Link to={`/recursos/${recurso._id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Ver ficha del recurso <Icon size={14}>{iconos.flecha}</Icon>
          </Link>
        )}
      </article>

      <DialogoCancelarPrestamo
        prestamo={aCancelar}
        onCerrar={cerrarDialogo}
        onResultado={({ tipo, texto }) => {
          setAviso({ tipo, texto })
          if (tipo === 'exito') {
            setVerInstrucciones(false)
            recargar()
          }
        }}
      />
    </div>
  )
}
