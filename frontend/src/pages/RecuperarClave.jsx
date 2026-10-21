import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import AuthLayout, { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, inputClass } from '../components/auth/authStyles.jsx'
import Alerta from '../components/Alerta.jsx'
import { DOMINIO_INSTITUCIONAL, regla, validarCorreoEPN } from '../utils/validaciones.js'
import { obtenerMensajeError, solicitarRecuperacion } from '../services/authService.js'

/* Paso 1 de la recuperación: solicitar el enlace con el correo institucional */
export default function RecuperarClave() {
  const [errorServidor, setErrorServidor] = useState('')
  const [respuesta, setRespuesta] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { correo: '' } })

  const onSubmit = async ({ correo }) => {
    setErrorServidor('')
    setRespuesta(null)
    try {
      setRespuesta(await solicitarRecuperacion(correo.trim()))
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo institucional y te indicaremos cómo restablecer tu contraseña."
      footer={
        <>
          ¿La recordaste?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        <Alerta>{errorServidor}</Alerta>
        <Alerta tipo="exito">{respuesta?.msg}</Alerta>

        {/* Sin servicio de correo, el backend en desarrollo devuelve el token para poder probar el flujo */}
        {respuesta?.token && (
          <Link
            to={`/recuperar-clave/${respuesta.token}`}
            className="block rounded-lg border border-dashed border-brand-500 px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-400"
          >
            Modo desarrollo: continuar al restablecimiento
          </Link>
        )}

        <Field id="correo" label="Correo institucional" icon="mail" error={errors.correo?.message}>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            placeholder={`usuario${DOMINIO_INSTITUCIONAL}`}
            aria-invalid={!!errors.correo}
            aria-describedby={errors.correo ? 'correo-error' : undefined}
            className={inputClass(errors.correo)}
            {...register('correo', { validate: regla(validarCorreoEPN) })}
          />
        </Field>

        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Solicitar recuperación'}
        </button>
      </form>
    </AuthLayout>
  )
}
