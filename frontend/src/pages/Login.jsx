import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout, { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, inputClass } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import { DOMINIO_INSTITUCIONAL, validarCorreoEPN } from '../utils/validaciones.js'
import { iniciarSesion, obtenerMensajeError } from '../services/authService.js'
import { useAuthStore } from '../store/authStore.js'

const validar = {
  correo: validarCorreoEPN,
  contrasena: (v) => (v ? '' : 'La contraseña es obligatoria.'),
}

export default function Login() {
  const navigate = useNavigate()
  const setToken = useAuthStore((state) => state.setToken)
  const [form, setForm] = useState({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrorServidor('')
    if (errores[name]) setErrores((er) => ({ ...er, [name]: validar[name](value) }))
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrores((er) => ({ ...er, [name]: validar[name](value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nuevos = Object.fromEntries(Object.keys(validar).map((k) => [k, validar[k](form[k])]))
    setErrores(nuevos)
    if (Object.values(nuevos).some(Boolean)) return

    setCargando(true)
    setErrorServidor('')
    try {
      const respuesta = await iniciarSesion({ correo: form.correo.trim(), password: form.contrasena })
      if (!respuesta.token) {
        setErrorServidor('El servidor no devolvió un token de sesión. Inténtalo nuevamente.')
        return
      }
      setToken(respuesta.token)
      navigate('/', { replace: true })
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    } finally {
      setCargando(false)
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
      <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800">
        {errorServidor && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">
            {errorServidor}
          </div>
        )}

        <Field id="correo" label="Correo institucional" icon="mail" error={errores.correo}>
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            placeholder={`usuario${DOMINIO_INSTITUCIONAL}`}
            value={form.correo}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errores.correo}
            aria-describedby={errores.correo ? 'correo-error' : undefined}
            className={inputClass(errores.correo)}
          />
        </Field>

        <Field id="contrasena" label="Contraseña" icon="lock" error={errores.contrasena}>
          <PasswordInput
            id="contrasena"
            name="contrasena"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.contrasena}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errores.contrasena}
          />
        </Field>

        <button type="submit" className={btnPrimary} disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  )
}
