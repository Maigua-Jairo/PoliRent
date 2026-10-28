import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, btnSecondary, icons, inputClass, pestana } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
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

const SECCIONES = [
  { valor: 'perfil', etiqueta: 'Perfil' },
  { valor: 'seguridad', etiqueta: 'Seguridad' },
  { valor: 'notificaciones', etiqueta: 'Notificaciones' },
]

/* ---------- Configuración de cuenta: ver y modificar perfil (HU-002) ---------- */
export default function Perfil() {
  const usuario = useAuthStore((state) => state.usuario)
  const actualizarUsuario = useAuthStore((state) => state.actualizarUsuario)
  const [errorCarga, setErrorCarga] = useState('')
  const [params, setParams] = useSearchParams()
  const seccion = SECCIONES.some((s) => s.valor === params.get('seccion')) ? params.get('seccion') : 'perfil'

  // Refresca los datos desde el backend al entrar (pueden haber cambiado en otro dispositivo)
  useEffect(() => {
    obtenerPerfil()
      .then(({ usuario }) => actualizarUsuario(usuario))
      .catch((error) => setErrorCarga(obtenerMensajeError(error)))
  }, [actualizarUsuario])

  return (
    <div className="mx-auto max-w-4xl space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Configuración de cuenta</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Gestiona tu información personal y preferencias.</p>
      </div>

      <Alerta>{errorCarga}</Alerta>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Secciones de la cuenta">
        {SECCIONES.map((s) => (
          <button
            key={s.valor}
            type="button"
            role="tab"
            id={`pestana-${s.valor}`}
            aria-selected={seccion === s.valor}
            aria-controls="panel-cuenta"
            onClick={() => setParams(s.valor === 'perfil' ? {} : { seccion: s.valor }, { replace: true })}
            className={pestana(seccion === s.valor)}
          >
            {s.etiqueta}
          </button>
        ))}
      </div>

      <div id="panel-cuenta" role="tabpanel" aria-labelledby={`pestana-${seccion}`}>
        {seccion === 'perfil' && <FormularioDatos usuario={usuario} onActualizado={actualizarUsuario} />}
        {seccion === 'seguridad' && <FormularioClave />}
        {seccion === 'notificaciones' && <PreferenciasNotificaciones />}
      </div>
    </div>
  )
}

function FormularioDatos({ usuario, onActualizado }) {
  const [errorServidor, setErrorServidor] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const {
    register,
    handleSubmit,
    reset,
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
        Información personal
      </h2>
      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          <Alerta className="sm:col-span-2">{errorServidor}</Alerta>
          <Alerta tipo="exito" className="sm:col-span-2">{mensajeExito}</Alerta>

          <Field id="nombres" label="Nombres" icon="user" error={errors.nombres?.message}>
            <input {...campo('nombres', (v) => validarNombre(v, 'El nombre'))} type="text" autoComplete="given-name" />
          </Field>
          <Field id="apellidos" label="Apellidos" icon="user" error={errors.apellidos?.message}>
            <input {...campo('apellidos', (v) => validarNombre(v, 'El apellido'))} type="text" autoComplete="family-name" />
          </Field>
          <div className="sm:col-span-2">
            <Field id="correo" label="Correo electrónico" icon="mail" hint="El correo institucional no se puede modificar.">
              <input
                id="correo"
                type="email"
                value={usuario?.correo ?? ''}
                readOnly
                className={`${inputClass(false)} cursor-not-allowed bg-slate-50! text-slate-500! dark:bg-slate-800/60! dark:text-slate-400!`}
              />
            </Field>
          </div>
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

        <aside className="order-first flex flex-col items-center gap-4 md:order-none">
          <div className="grid h-36 w-36 place-items-center rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <Avatar usuario={usuario} tamano="xl" />
          </div>
          {/* Provisional: el backend aún no guarda la foto de perfil */}
          <button type="button" disabled title="Disponible próximamente" className={`${btnSecondary} cursor-not-allowed opacity-60`}>
            Cambiar foto
          </button>
          <dl className="w-full space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
            {[
              ['Cédula', usuario?.cedula],
              ['Rol', esAdministrador(usuario) ? 'Administrador' : 'Estudiante'],
            ].map(([titulo, valor]) => (
              <div key={titulo}>
                <dt className="text-xs text-slate-500 dark:text-slate-400">{titulo}</dt>
                <dd className="font-semibold break-all text-slate-800 dark:text-slate-100">{valor || '—'}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
        <button type="button" onClick={() => reset()} disabled={isSubmitting || !isDirty} className={`${btnSecondary} disabled:opacity-50`}>
          Cancelar
        </button>
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

/* ---------- Preferencias de notificaciones (provisional: aún no existen en el backend) ---------- */
function PreferenciasNotificaciones() {
  const opciones = [
    'Avisarme por correo cuando cambie el estado de una solicitud.',
    'Recordarme un día antes de la fecha de devolución.',
  ]
  return (
    <section className={tarjeta} aria-labelledby="titulo-notificaciones">
      <h2 id="titulo-notificaciones" className="text-lg font-bold text-epn-900 dark:text-white">
        Notificaciones
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Estas preferencias estarán disponibles próximamente.</p>
      <ul className="mt-5 space-y-3">
        {opciones.map((opcion) => (
          <li key={opcion}>
            <label className="flex cursor-not-allowed items-start gap-3 text-sm text-slate-500 dark:text-slate-400">
              <input type="checkbox" disabled defaultChecked className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-500" />
              {opcion}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
