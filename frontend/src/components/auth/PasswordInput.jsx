import { useState } from 'react'
import { Icon } from './AuthLayout.jsx'
import { icons, inputClass } from './authStyles.jsx'

export default function PasswordInput({ error, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={`${inputClass(error)} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-brand-600"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icon size={18}>{visible ? icons.eyeOff : icons.eye}</Icon>
      </button>
    </>
  )
}
