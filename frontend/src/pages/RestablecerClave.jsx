import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AuthLayout, { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Alerta from '../components/Alerta.jsx'
import { regla, validarConfirmacion, validarContrasena } from '../utils/validaciones.js'
import { obtenerMensajeError, restablecerClave } from '../services/authService.js'

/* Paso 2 de la recuperación: definir la nueva contraseña con el token del enlace */
export default function RestablecerClave() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [errorServidor, setErrorServidor] = useState('')
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { password: '', confirmarPassword: '' } })

  // Revalida la confirmación cuando cambia la contraseña principal
  const password = register('password', { validate: regla(validarContrasena) })
  const onChangePassword = async (e) => {
    await password.onChange(e)
    if (getValues('confirmarPassword')) trigger('confirmarPassword')
  }

  const onSubmit = async (form) => {
    setErrorServidor('')
    try {
      const respuesta = await restablecerClave(token, form)
      navigate('/login', { replace: true, state: { mensaje: respuesta.msg || 'Contraseña restablecida correctamente.' } })
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="Define una nueva contraseña para tu cuenta. El enlace es válido por 15 minutos."
      footer={
        <Link to="/recuperar-clave" className="font-semibold text-brand-600 hover:underline">
          Solicitar un nuevo enlace
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        <Alerta>{errorServidor}</Alerta>

        <Field
          id="password"
          label="Nueva contraseña"
          icon="lock"
          error={errors.password?.message}
          hint="Mín. 8 caracteres, con mayúscula, minúscula y número."
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...password}
            onChange={onChangePassword}
          />
        </Field>

        <Field id="confirmarPassword" label="Confirmar contraseña" icon="lock" error={errors.confirmarPassword?.message}>
          <PasswordInput
            id="confirmarPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmarPassword?.message}
            {...register('confirmarPassword', { validate: regla(validarConfirmacion('password')) })}
          />
        </Field>

        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
