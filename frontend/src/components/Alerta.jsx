import Icon from './Icon.jsx'
import { icons } from './auth/authStyles.jsx'

const ESTILOS = {
  error: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
  exito: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
}

/* ---------- Mensaje de respuesta del backend (error o éxito) ---------- */
export default function Alerta({ tipo = 'error', children, className = '' }) {
  if (!children) return null
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium ring-1 ${ESTILOS[tipo]} ${className}`}
    >
      {tipo === 'exito' && <Icon size={18} className="mt-px shrink-0">{icons.check}</Icon>}
      <span>{children}</span>
    </div>
  )
}
