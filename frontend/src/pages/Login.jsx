import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout, { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, inputClass } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Alerta from '../components/Alerta.jsx'
import { DOMINIO_INSTITUCIONAL, regla, validarCorreoEPN } from '../utils/validaciones.js'
import { iniciarSesion, obtenerMensajeError } from '../services/authService.js'
import { useAuthStore } from '../store/authStore.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const guardarSesion = useAuthStore((state) => state.iniciarSesion)
  const [errorServidor, setErrorServidor] = useState('')
  // Mensaje que llega desde el registro o el restablecimiento de clave
  const mensajeExito = location.state?.mensaje

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { correo: '', contrasena: '' } })

  const onSubmit = async ({ correo, contrasena }) => {
    setErrorServidor('')
    try {
      const respuesta = await iniciarSesion({ correo: correo.trim(), password: contrasena })
      if (!respuesta.token) {
        setErrorServidor('El servidor no devolvió un token de sesión. Inténtalo nuevamente.')
        return
      }
      guardarSesion({ token: respuesta.token, usuario: respuesta.usuario })
      navigate(location.state?.desde || '/', { replace: true })
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresa con tu cuenta institucional para gestionar tus préstamos."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-600 hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        {!errorServidor && <Alerta tipo="exito">{mensajeExito}</Alerta>}
        <Alerta>{errorServidor}</Alerta>

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

        <Field id="contrasena" label="Contraseña" icon="lock" error={errors.contrasena?.message}>
          <PasswordInput
            id="contrasena"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.contrasena?.message}
            {...register('contrasena', { required: 'La contraseña es obligatoria.' })}
          />
        </Field>

        <div className="-mt-2 text-right">
          <Link to="/recuperar-clave" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  )
}
