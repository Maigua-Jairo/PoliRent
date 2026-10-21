import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout, { Field } from '../components/auth/AuthLayout.jsx'
import { btnPrimary, icons, inputClass } from '../components/auth/authStyles.jsx'
import PasswordInput from '../components/auth/PasswordInput.jsx'
import Alerta from '../components/Alerta.jsx'
import Icon from '../components/Icon.jsx'
import {
  DOMINIO_INSTITUCIONAL,
  FACULTADES,
  regla,
  validarCedula,
  validarConfirmacion,
  validarContrasena,
  validarCorreoEPN,
  validarFacultad,
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

const REGLAS = {
  nombres: { validate: regla((v) => validarNombre(v, 'El nombre')) },
  apellidos: { validate: regla((v) => validarNombre(v, 'El apellido')) },
  cedula: { validate: regla(validarCedula) },
  correo: { validate: regla(validarCorreoEPN) },
  telefono: { validate: regla(validarTelefono) },
  facultad: { validate: regla(validarFacultad) },
  contrasena: { validate: regla(validarContrasena) },
  confirmarContrasena: { validate: regla(validarConfirmacion('contrasena')) },
}

export default function Register() {
  const navigate = useNavigate()
  const [errorServidor, setErrorServidor] = useState('')
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: INICIAL })

  const onSubmit = async (form) => {
    setErrorServidor('')
    try {
      const respuesta = await registrarUsuario({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        cedula: form.cedula,
        correo: form.correo.trim(),
        telefono: form.telefono,
        facultad: form.facultad,
        password: form.contrasena,
      })
      navigate('/login', {
        replace: true,
        state: { mensaje: respuesta.msg || 'Tu cuenta fue creada correctamente. Ya puedes iniciar sesión.' },
      })
    } catch (error) {
      setErrorServidor(obtenerMensajeError(error))
    }
  }

  // Props comunes: registro en el formulario + accesibilidad + estilo según error
  const campo = (name) => ({
    id: name,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    className: inputClass(errors[name]),
    ...register(name, REGLAS[name]),
  })

  // Cédula y teléfono solo aceptan 10 dígitos
  const campoNumerico = (name) => {
    const props = campo(name)
    return {
      ...props,
      inputMode: 'numeric',
      maxLength: 10,
      onChange: (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)
        return props.onChange(e)
      },
    }
  }

  // Revalida la confirmación cuando cambia la contraseña principal
  const contrasena = register('contrasena', REGLAS.contrasena)
  const onChangeContrasena = async (e) => {
    await contrasena.onChange(e)
    if (getValues('confirmarContrasena')) trigger('confirmarContrasena')
  }

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
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        <Alerta className="sm:col-span-2">{errorServidor}</Alerta>

        <Field id="nombres" label="Nombres" icon="user" error={errors.nombres?.message}>
          <input {...campo('nombres')} type="text" autoComplete="given-name" placeholder="Juan Carlos" />
        </Field>

        <Field id="apellidos" label="Apellidos" icon="user" error={errors.apellidos?.message}>
          <input {...campo('apellidos')} type="text" autoComplete="family-name" placeholder="Pérez López" />
        </Field>

        <Field id="cedula" label="Cédula" icon="id" error={errors.cedula?.message}>
          <input {...campoNumerico('cedula')} type="text" placeholder="1712345678" />
        </Field>

        <Field id="telefono" label="Teléfono" icon="phone" error={errors.telefono?.message}>
          <input {...campoNumerico('telefono')} type="tel" autoComplete="tel" placeholder="0991234567" />
        </Field>

        <div className="sm:col-span-2">
          <Field
            id="correo"
            label="Correo institucional"
            icon="mail"
            error={errors.correo?.message}
            hint={`Solo se aceptan correos ${DOMINIO_INSTITUCIONAL}`}
          >
            <input {...campo('correo')} type="email" autoComplete="email" placeholder={`usuario${DOMINIO_INSTITUCIONAL}`} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field id="facultad" label="Facultad" icon="cap" error={errors.facultad?.message}>
            <select {...campo('facultad')} className={inputClass(errors.facultad, true, true)}>
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

        <Field
          id="contrasena"
          label="Contraseña"
          icon="lock"
          error={errors.contrasena?.message}
          hint="Mín. 8 caracteres, con mayúscula, minúscula y número."
        >
          <PasswordInput
            id="contrasena"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.contrasena?.message}
            {...contrasena}
            onChange={onChangeContrasena}
          />
        </Field>

        <Field id="confirmarContrasena" label="Confirmar contraseña" icon="lock" error={errors.confirmarContrasena?.message}>
          <PasswordInput
            id="confirmarContrasena"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmarContrasena?.message}
            {...register('confirmarContrasena', REGLAS.confirmarContrasena)}
          />
        </Field>

        <button type="submit" className={`${btnPrimary} mt-2 sm:col-span-2`} disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthLayout>
  )
}
