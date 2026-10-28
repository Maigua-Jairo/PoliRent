import { useEffect, useState } from 'react'
import { listarMisPrestamos } from '../services/prestamoService.js'
import { obtenerRecomendaciones } from '../services/recomendacionService.js'
import { obtenerMensajeError } from '../services/authService.js'

const LIMITE_RECOMENDACIONES = 4

// Sin una consulta del estudiante, el contexto se arma con su facultad y los recursos que ya pidió
const contextoPorDefecto = (facultad, prestamos) =>
  [facultad || 'Proyecto universitario', ...new Set(prestamos.map((p) => p.recurso?.nombre).filter(Boolean))]
    .join(' ')
    .slice(0, 500)

/* Carga las solicitudes del estudiante y, con ellas, sus recomendaciones (HU-007 / HU-009) */
export default function useDashboard(facultad) {
  const [prestamos, setPrestamos] = useState({ cargando: true, error: '', lista: [], ahora: 0 })
  const [recomendaciones, setRecomendaciones] = useState({ cargando: true, error: '', lista: [] })

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador
    const cancelado = () => signal.aborted

    listarMisPrestamos({}, { signal })
      .then(({ prestamos: lista = [] }) => {
        setPrestamos({ cargando: false, error: '', lista, ahora: Date.now() })
        return obtenerRecomendaciones(
          { contexto: contextoPorDefecto(facultad, lista), limite: LIMITE_RECOMENDACIONES },
          { signal },
        )
          .then(({ recomendaciones: sugeridas = [] }) => setRecomendaciones({ cargando: false, error: '', lista: sugeridas }))
          .catch((error) => {
            if (!cancelado()) setRecomendaciones({ cargando: false, error: obtenerMensajeError(error), lista: [] })
          })
      })
      .catch((error) => {
        if (cancelado()) return
        setPrestamos({ cargando: false, error: obtenerMensajeError(error), lista: [], ahora: Date.now() })
        setRecomendaciones({ cargando: false, error: '', lista: [] })
      })

    return () => controlador.abort()
  }, [facultad])

  return { prestamos, recomendaciones }
}
