import { iniciales } from '../utils/usuario.js'

const tamanos = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-28 w-28 text-4xl',
}

/* ---------- Avatar del usuario con sus iniciales (aún no hay foto de perfil) ---------- */
export default function Avatar({ usuario, tamano = 'md', className = '' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-500 to-epn-800 font-bold tracking-wide text-white ring-2 ring-white dark:ring-slate-800 ${tamanos[tamano]} ${className}`}
      aria-hidden="true"
    >
      {iniciales(usuario)}
    </span>
  )
}
