import { buscarEstado } from '../../utils/recursos.jsx'

/* ---------- Píldora con el estado del recurso ---------- */
export default function EtiquetaEstado({ estado, className = '' }) {
  const { etiqueta, tono, punto } = buscarEstado(estado)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tono} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${punto}`} aria-hidden="true" />
      {etiqueta}
    </span>
  )
}
