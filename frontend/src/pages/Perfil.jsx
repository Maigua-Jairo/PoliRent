import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, icons, inputClass } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import {
  FACULTADES,
  regla,
  validarConfirmacion,
  validarContrasena,
  validarFacultad,
  validarNombre,
  validarTelefono,
} from '../utils/validaciones.js'
import { actualizarPerfil, obtenerMensajeError, obtenerPerfil } from '../services/authService.js'
import { esAdministrador, useAuthStore } from '../store/authStore.js'

const tarjeta = 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800'
const btnGuardar = btnPrimary.replace('w-full', 'w-full sm:w-auto')

const datosEditables = (u) => ({
  nombres: u?.nombres ?? '',
  apellidos: u?.apellidos ?? '',
  telefono: u?.telefono ?? '',
  facultad: u?.facultad ?? '',
})

/* ---------- Ver y modificar perfil (HU-002) ---------- */
export default function Perfil() {
  const usuario = useAuthStore((state) => state.usuario)
  const actualizarUsuario = useAuthStore((state) => state.actualizarUsuario)
  const [errorCarga, setErrorCarga] = useState('')

  // Refresca los datos desde el backend al entrar (pueden haber cambiado en otro dispositivo)
  useEffect(() => {
    obtenerPerfil()
      .then(({ usuario }) => actualizarUsuario(usuario))
      .catch((error) => setErrorCarga(obtenerMensajeError(error)))
  }, [actualizarUsuario])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Consulta y actualiza la información de tu cuenta.</p>
      </div>

      <Alerta>{errorCarga}</Alerta>

      <section className={tarjeta} aria-labelledby="titulo-cuenta">
        <h2 id="titulo-cuenta" className="text-lg font-bold text-epn-900 dark:text-white">
          Datos de la cuenta
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          {[
            ['Correo institucional', usuario?.correo],
            ['Cédula', usuario?.cedula],
            ['Rol', esAdministrador(usuario) ? 'Administrador' : 'Estudiante'],
          ].map(([titulo, valor]) => (
            <div key={titulo}>
              <dt className="text-slate-500 dark:text-slate-400">{titulo}</dt>
              <dd className="mt-1 font-semibold break-all text-slate-800 dark:text-slate-100">{valor || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <FormularioDatos usuario={usuario} onActualizado={actualizarUsuario} />
      <FormularioClave />
    </div>
  )
}

function FormularioDatos({ usuario, onActualizado }) {
  const [errorServidor, setErrorServidor] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ mode: 'onTouched', values: datosEditables(usuario) })
  // `values` sincroniza el formulario cuando el usuario del store cambia (carga inicial o guardado)

  const onSubmit = async (form) => {
    setErrorServidor('')
    setMensajeExito('')
    try {
      const respuesta = await actualizarPerfil({ ...form, nombres: form.nombres.trim(), apellidos: form.apellidos.trim() })
      onActualizado(respuesta.usuario)
      setMensajeExito(respuesta.msg)
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  const campo = (name, validador) => ({
    id: name,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    className: inputClass(errors[name]),
    ...register(name, { validate: regla(validador) }),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={tarjeta} aria-labelledby="titulo-datos">
      <h2 id="titulo-datos" className="text-lg font-bold text-epn-900 dark:text-white">
        Datos personales
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Alerta className="sm:col-span-2">{errorServidor}</Alerta>
        <Alerta tipo="exito" className="sm:col-span-2">{mensajeExito}</Alerta>

        <Field id="nombres" label="Nombres" icon="user" error={errors.nombres?.message}>
          <input {...campo('nombres', (v) => validarNombre(v, 'El nombre'))} type="text" autoComplete="given-name" />
        </Field>
        <Field id="apellidos" label="Apellidos" icon="user" error={errors.apellidos?.message}>
          <input {...campo('apellidos', (v) => validarNombre(v, 'El apellido'))} type="text" autoComplete="family-name" />
        </Field>
        <Field id="telefono" label="Teléfono" icon="phone" error={errors.telefono?.message}>
          <input {...campo('telefono', validarTelefono)} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel" />
        </Field>
        <Field id="facultad" label="Facultad" icon="cap" error={errors.facultad?.message}>
          <select {...campo('facultad', validarFacultad)} className={inputClass(errors.facultad, true, true)}>
            <option value="" disabled>
              Selecciona tu facultad
            </option>
            {FACULTADES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Icon size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400">
            {icons.chevron}
          </Icon>
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <button type="submit" className={btnGuardar} disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function FormularioClave() {
  const setToken = useAuthStore((state) => state.setToken)
  const [errorServidor, setErrorServidor] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: { passwordActual: '', password: '', confirmarPassword: '' } })

  const password = register('password', { validate: regla(validarContrasena) })
  const onChangePassword = async (e) => {
    await password.onChange(e)
    if (getValues('confirmarPassword')) trigger('confirmarPassword')
  }

  const onSubmit = async ({ passwordActual, password }) => {
    setErrorServidor('')
    setMensajeExito('')
    try {
      const respuesta = await actualizarPerfil({ passwordActual, password })
      // el backend cierra las demás sesiones y entrega un token nuevo para esta
      if (respuesta.token) setToken(respuesta.token)
      reset()
      setMensajeExito('Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.')
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={tarjeta} aria-labelledby="titulo-clave">
      <h2 id="titulo-clave" className="text-lg font-bold text-epn-900 dark:text-white">
        Cambiar contraseña
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Alerta className="sm:col-span-2">{errorServidor}</Alerta>
        <Alerta tipo="exito" className="sm:col-span-2">{mensajeExito}</Alerta>

        <div className="sm:col-span-2">
          <Field id="passwordActual" label="Contraseña actual" icon="lock" error={errors.passwordActual?.message}>
            <PasswordInput
              id="passwordActual"
              autoComplete="current-password"
              error={errors.passwordActual?.message}
              {...register('passwordActual', { required: 'Ingresa tu contraseña actual.' })}
            />
          </Field>
        </div>
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
            error={errors.password?.message}
            {...password}
            onChange={onChangePassword}
          />
        </Field>
        <Field id="confirmarPassword" label="Confirmar contraseña" icon="lock" error={errors.confirmarPassword?.message}>
          <PasswordInput
            id="confirmarPassword"
            autoComplete="new-password"
            error={errors.confirmarPassword?.message}
            {...register('confirmarPassword', { validate: regla(validarConfirmacion('password')) })}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <button type="submit" className={btnGuardar} disabled={isSubmitting}>
          {isSubmitting ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  )
}
