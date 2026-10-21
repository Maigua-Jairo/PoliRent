import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout, { Field, Icon } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, icons, inputClass } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import {
  DOMINIO_INSTITUCIONAL,
  validarCedula,
  validarContrasena,
  validarCorreoEPN,
  validarNombre,
  validarTelefono,
} from '../utils/validaciones.js'
import { obtenerMensajeError, registrarUsuario } from '../services/authService.js'

const INICIAL = {
  nombres: '',
  apellidos: '',
  cedula: '',
  correo: '',
  telefono: '',
  facultad: '',
  contrasena: '',
  confirmarContrasena: '',
}

const validar = {
  nombres: (v) => validarNombre(v, 'El nombre'),
  apellidos: (v) => validarNombre(v, 'El apellido'),
  cedula: validarCedula,
  correo: validarCorreoEPN,
  telefono: validarTelefono,
  facultad: (v) => (v ? '' : 'Selecciona tu facultad.'),
  contrasena: validarContrasena,
  confirmarContrasena: (v, form) => {
    if (!v) return 'Confirma tu contraseña.'
    if (v !== form.contrasena) return 'Las contraseñas no coinciden.'
    return ''
  },
}

// Campos que solo aceptan dígitos
const NUMERICOS = { cedula: 10, telefono: 10 }

export default function Register() {
  const [form, setForm] = useState(INICIAL)
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleChange = (e) => {
    const { name } = e.target
    let { value } = e.target
    if (NUMERICOS[name]) value = value.replace(/\D/g, '').slice(0, NUMERICOS[name])

    const siguiente = { ...form, [name]: value }
    setForm(siguiente)
    setErrorServidor('')
    setMensajeExito('')
    setErrores((er) => {
      const nuevos = { ...er }
      if (er[name]) nuevos[name] = validar[name](value, siguiente)
      // Revalida la confirmación si cambia la contraseña principal
      if (name === 'contrasena' && er.confirmarContrasena !== undefined && siguiente.confirmarContrasena) {
        nuevos.confirmarContrasena = validar.confirmarContrasena(siguiente.confirmarContrasena, siguiente)
      }
      return nuevos
    })
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setErrores((er) => ({ ...er, [name]: validar[name](value, form) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nuevos = Object.fromEntries(Object.keys(validar).map((k) => [k, validar[k](form[k], form)]))
    setErrores(nuevos)
    if (Object.values(nuevos).some(Boolean)) return

    setCargando(true)
    setErrorServidor('')
    setMensajeExito('')
    try {
      const respuesta = await registrarUsuario({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        cedula: form.cedula,
        correo: form.correo.trim(),
        telefono: form.telefono,
        facultad: form.facultad.trim(),
        password: form.contrasena,
      })
      setMensajeExito(respuesta.msg || respuesta.message || 'Tu cuenta fue creada correctamente.')
      setForm(INICIAL)
      setErrores({})
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    } finally {
      setCargando(false)
    }
  }

  // Props comunes para inputs de texto
  const campo = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': !!errores[name],
    'aria-describedby': errores[name] ? `${name}-error` : undefined,
    className: inputClass(errores[name]),
  })

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Regístrate con tu correo institucional para empezar a solicitar recursos."
      footer={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        {errorServidor && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200 sm:col-span-2 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30">
            {errorServidor}
          </div>
        )}

        {mensajeExito && (
          <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 sm:col-span-2 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
            <Icon size={18}>{icons.check}</Icon> {mensajeExito}
          </div>
        )}

        <Field id="nombres" label="Nombres" icon="user" error={errores.nombres}>
          <input {...campo('nombres')} type="text" autoComplete="given-name" placeholder="Juan Carlos" />
        </Field>

        <Field id="apellidos" label="Apellidos" icon="user" error={errores.apellidos}>
          <input {...campo('apellidos')} type="text" autoComplete="family-name" placeholder="Pérez López" />
        </Field>

        <Field id="cedula" label="Cédula" icon="id" error={errores.cedula}>
          <input {...campo('cedula')} type="text" inputMode="numeric" placeholder="1712345678" />
        </Field>

        <Field id="telefono" label="Teléfono" icon="phone" error={errores.telefono}>
          <input {...campo('telefono')} type="tel" inputMode="numeric" autoComplete="tel" placeholder="0991234567" />
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="correo"
            label="Correo institucional"
            icon="mail"
            error={errores.correo}
            hint={`Solo se aceptan correos ${DOMINIO_INSTITUCIONAL}`}
          >
            <input {...campo('correo')} type="email" autoComplete="email" placeholder={`usuario${DOMINIO_INSTITUCIONAL}`} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field id="facultad" label="Facultad" icon="cap" error={errores.facultad}>
            <input {...campo('facultad')} type="text" autoComplete="organization-title" placeholder="Nombre de tu facultad" />
          </Field>
        </div>

        <Field
          id="contrasena"
          label="Contraseña"
          icon="lock"
          error={errores.contrasena}
          hint="Mín. 8 caracteres, con mayúscula, minúscula y número."
        >
          <PasswordInput
            id="contrasena"
            name="contrasena"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.contrasena}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errores.contrasena}
          />
        </Field>

        <Field id="confirmarContrasena" label="Confirmar contraseña" icon="lock" error={errores.confirmarContrasena}>
          <PasswordInput
            id="confirmarContrasena"
            name="confirmarContrasena"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirmarContrasena}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errores.confirmarContrasena}
          />
        </Field>

        <button type="submit" className={`${btnPrimary} mt-2 sm:col-span-2`} disabled={cargando}>
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthLayout>
  )
}
