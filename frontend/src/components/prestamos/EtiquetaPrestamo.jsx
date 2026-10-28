import { buscarEstadoPrestamo } from '../../utils/prestamos.js'

/* ---------- Píldora con el estado de una solicitud de préstamo ---------- */
export default function EtiquetaPrestamo({ estado, className = '' }) {
  const { etiqueta, tono } = buscarEstadoPrestamo(estado)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tono} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {etiqueta}
    </span>
  )
}
