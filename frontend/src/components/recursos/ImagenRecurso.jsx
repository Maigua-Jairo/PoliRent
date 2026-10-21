import Icon from '../Icon.jsx'
import { buscarCategoria } from '../../utils/recursos.jsx'

/* ---------- Foto del recurso o, si no tiene, ilustración con el icono de su categoría ---------- */
export default function ImagenRecurso({ recurso, className = '', tamanoIcono = 44 }) {
  const categoria = buscarCategoria(recurso.categoria)

  if (recurso.imagen) {
    return <img src={recurso.imagen} alt={recurso.nombre} loading="lazy" className={`object-cover ${className}`} />
  }
  return (
    <div
      className={`relative grid place-items-center overflow-hidden bg-linear-to-br ${categoria.acento} to-transparent bg-slate-100 dark:bg-slate-800 ${className}`}
      aria-hidden="true"
    >
      {/* silueta de montaña, el mismo motivo de la landing */}
      <svg className="absolute right-0 bottom-0 h-1/2 w-full text-slate-900/5 dark:text-white/5" viewBox="0 0 320 100" preserveAspectRatio="none" fill="currentColor">
        <path d="M0 100 70 60l30 12 60-50 25 15 20-12 55 40 60 15v20z" />
      </svg>
      <span className={`relative grid place-items-center rounded-2xl p-3 ${categoria.tono}`}>
        <Icon size={tamanoIcono} stroke={1.6}>{categoria.icono}</Icon>
      </span>
    </div>
  )
}
