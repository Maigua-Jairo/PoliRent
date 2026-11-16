import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import Alerta from '../Alerta.jsx'
import { Field } from '../auth/AuthLayout.jsx'
import { btnPrimary, inputClass } from '../auth/authStyles.jsx'
import { obtenerTerminosPrestamo, solicitarPrestamo } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { regla } from '../../utils/validaciones.js'
import {
  aValorInput,
  DIAS_MAX_PRESTAMO,
  fechaDevolucionISO,
  MOTIVO_MAX,
  sumarDias,
  validarFechaDevolucion,
  validarMotivo,
} from '../../utils/prestamos.js'

/* ---------- Solicitud de préstamo de un recurso disponible (HU-008) ---------- */
export default function FormularioSolicitud({ recurso }) {
  const navigate = useNavigate()
  const [hoy] = useState(() => new Date())
  const [errorServidor, setErrorServidor] = useState('')
  const [terminos, setTerminos] = useState(null)
  const [errorTerminos, setErrorTerminos] = useState('')
  const [reintentosTerminos, setReintentosTerminos] = useState(0)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      fechaDevolucion: '',
      motivo: '',
      docenteNombre: '',
      docenteCorreo: '',
      docenteTelefono: '',
      aceptaTerminos: false,
    },
  })
  const motivo = useWatch({ control, name: 'motivo' }) ?? ''

  useEffect(() => {
    const controlador = new AbortController()
    let vigente = true
    obtenerTerminosPrestamo({ signal: controlador.signal })
      .then((respuesta) => {
        if (vigente) {
          setTerminos(respuesta)
          setErrorTerminos('')
        }
      })
      .catch((error) => {
        if (vigente && !controlador.signal.aborted) setErrorTerminos(obtenerMensajeError(error))
      })
    return () => {
      vigente = false
      controlador.abort()
    }
  }, [reintentosTerminos])

  const onSubmit = async ({ fechaDevolucion, motivo, docenteNombre, docenteCorreo, docenteTelefono }) => {
    setErrorServidor('')
    try {
      const respuesta = await solicitarPrestamo({
        recursoId: recurso._id,
        fechaDevolucion: fechaDevolucionISO(fechaDevolucion),
        motivo: motivo.trim() || undefined,
        aceptaTerminos: true,
        docenteReferencia: {
          nombre: docenteNombre.trim(),
          correo: docenteCorreo.trim(),
          telefono: docenteTelefono.trim(),
        },
      })
      navigate('/solicitudes', { state: { mensaje: respuesta.msg } })
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" aria-labelledby="titulo-solicitar">
      <div>
        <h2 id="titulo-solicitar" className="text-lg font-bold text-epn-900 dark:text-white">
          Solicitar préstamo
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Elige hasta cuándo lo necesitas (máximo {DIAS_MAX_PRESTAMO} días). La asociación revisará tu solicitud.
        </p>
      </div>
      <Alerta>{errorServidor}</Alerta>

      <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="font-semibold text-epn-900 dark:text-white">Docente de referencia</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La asociación podrá contactarlo si se presenta algún inconveniente con la devolución del recurso.
        </p>
        <Field id="docenteNombre" label="Nombre completo" icon="cap" error={errors.docenteNombre?.message}>
          <input
            id="docenteNombre"
            type="text"
            maxLength={100}
            autoComplete="name"
            aria-invalid={!!errors.docenteNombre}
            aria-describedby={errors.docenteNombre ? 'docenteNombre-error' : undefined}
            className={inputClass(errors.docenteNombre)}
            {...register('docenteNombre', {
              validate: regla((valor = '') => {
                const nombre = valor.trim()
                if (!nombre) return 'El nombre del docente es obligatorio.'
                if (nombre.length < 3 || nombre.length > 100) return 'El nombre debe tener entre 3 y 100 caracteres.'
                return ''
              }),
            })}
          />
        </Field>
        <Field id="docenteCorreo" label="Correo electrónico" icon="mail" error={errors.docenteCorreo?.message}>
          <input
            id="docenteCorreo"
            type="email"
            maxLength={100}
            autoComplete="email"
            aria-invalid={!!errors.docenteCorreo}
            aria-describedby={errors.docenteCorreo ? 'docenteCorreo-error' : undefined}
            className={inputClass(errors.docenteCorreo)}
            {...register('docenteCorreo', {
              validate: regla((valor = '') => {
                const correo = valor.trim()
                if (!correo) return 'El correo del docente es obligatorio.'
                if (correo.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'Ingresa un correo válido.'
                return ''
              }),
            })}
          />
        </Field>
        <Field id="docenteTelefono" label="Teléfono" icon="phone" error={errors.docenteTelefono?.message} hint="Opcional. Ingresa entre 7 y 15 dígitos, espacios, + o -">
          <input
            id="docenteTelefono"
            type="tel"
            maxLength={15}
            autoComplete="tel"
            aria-invalid={!!errors.docenteTelefono}
            aria-describedby={errors.docenteTelefono ? 'docenteTelefono-error' : undefined}
            className={inputClass(errors.docenteTelefono)}
            {...register('docenteTelefono', {
              validate: regla((valor = '') => {
                const telefono = valor.trim()
                if (telefono && !/^[\d+\- ]{7,15}$/.test(telefono)) return 'El teléfono del docente no es válido.'
                return ''
              }),
            })}
          />
        </Field>
      </div>

      <Field id="fechaDevolucion" label="Fecha de devolución" icon="calendar" error={errors.fechaDevolucion?.message}>
        <input
          id="fechaDevolucion"
          type="date"
          min={aValorInput(sumarDias(hoy, 1))}
          max={aValorInput(sumarDias(hoy, DIAS_MAX_PRESTAMO))}
          aria-invalid={!!errors.fechaDevolucion}
          aria-describedby={errors.fechaDevolucion ? 'fechaDevolucion-error' : undefined}
          className={inputClass(errors.fechaDevolucion)}
          {...register('fechaDevolucion', { validate: regla((v) => validarFechaDevolucion(v, hoy)) })}
        />
      </Field>

      <div>
        <label htmlFor="motivo" className="mb-1.5 block text-sm font-semibold text-epn-900 dark:text-slate-200">
          Motivo <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="motivo"
          rows={3}
          maxLength={MOTIVO_MAX}
          placeholder="¿Para qué proyecto o actividad lo necesitas?"
          aria-invalid={!!errors.motivo}
          className={`${inputClass(errors.motivo, false)} resize-y`}
          {...register('motivo', { validate: regla(validarMotivo) })}
        />
        <p className="mt-1 flex justify-between text-xs">
          <span className="text-red-600 dark:text-red-400">{errors.motivo?.message}</span>
          <span className="text-slate-400">
            {motivo.length}/{MOTIVO_MAX}
          </span>
        </p>
      </div>

      <section aria-labelledby="titulo-terminos" className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 id="titulo-terminos" className="font-semibold text-epn-900 dark:text-white">Términos y condiciones</h3>
        {errorTerminos ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-red-600 dark:text-red-400">{errorTerminos}</p>
            <button type="button" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400" onClick={() => setReintentosTerminos((actual) => actual + 1)}>
              Reintentar carga
            </button>
          </div>
        ) : !terminos ? (
          <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Cargando términos y condiciones…</p>
        ) : (
          <>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {terminos.condiciones.map((condicion) => <li key={condicion}>{condicion}</li>)}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Horario de entrega y devolución: {terminos.horario.inicio}–{terminos.horario.fin} (hora de Ecuador).
            </p>
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                aria-invalid={!!errors.aceptaTerminos}
                aria-describedby={errors.aceptaTerminos ? 'aceptaTerminos-error' : undefined}
                className="mt-1 accent-brand-500"
                {...register('aceptaTerminos', { required: 'Debes aceptar los términos y condiciones.' })}
              />
              <span>Acepto los términos y condiciones del préstamo.</span>
            </label>
            {errors.aceptaTerminos && <p id="aceptaTerminos-error" className="text-xs font-medium text-red-600 dark:text-red-400">{errors.aceptaTerminos.message}</p>}
          </>
        )}
      </section>

      <button type="submit" className={btnPrimary} disabled={isSubmitting || !terminos}>
        {isSubmitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
