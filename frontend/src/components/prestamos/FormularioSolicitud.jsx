import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import Alerta from '../Alerta.jsx'
import { Field } from '../auth/AuthLayout.jsx'
import { btnPrimary, inputClass } from '../auth/authStyles.jsx'
import { solicitarPrestamo } from '../../services/prestamoService.js'
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
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { fechaDevolucion: '', motivo: '' } })
  const motivo = useWatch({ control, name: 'motivo' }) ?? ''

  const onSubmit = async ({ fechaDevolucion, motivo }) => {
    setErrorServidor('')
    try {
      const respuesta = await solicitarPrestamo({
        recursoId: recurso._id,
        fechaDevolucion: fechaDevolucionISO(fechaDevolucion),
        motivo: motivo.trim() || undefined,
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

      <button type="submit" className={btnPrimary} disabled={isSubmitting}>
        {isSubmitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
