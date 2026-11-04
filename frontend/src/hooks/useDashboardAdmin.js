import { useCallback, useEffect, useState } from 'react'
import { listarPrestamos } from '../services/prestamoService.js'
import { listarRecursos } from '../services/recursoService.js'
import { consultarMetricas } from '../services/reporteService.js'
import { obtenerMensajeError } from '../services/authService.js'

/* Todas las solicitudes, recursos y métricas del administrador (HU-003, HU-004); `ahora` se fija al recibir los datos */
export default function useDashboardAdmin() {
  const [version, setVersion] = useState(0)
  const [datos, setDatos] = useState({ cargando: true, error: '', prestamos: [], recursos: [], metricas: null, ahora: 0 })

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador
    Promise.allSettled([
      listarPrestamos({}, { signal }),
      listarRecursos({}, { signal }),
      consultarMetricas({ signal }),
    ])
      .then(([prestamosResult, recursosResult, metricasResult]) => {
        const prestamos = prestamosResult.status === 'fulfilled' ? (prestamosResult.value?.prestamos ?? []) : []
        const recursos = recursosResult.status === 'fulfilled' ? (recursosResult.value?.recursos ?? []) : []
        const metricas = metricasResult.status === 'fulfilled' ? metricasResult.value : null
        const error = [prestamosResult, recursosResult].find((r) => r.status === 'rejected')
        if (!signal.aborted) {
          setDatos({
            cargando: false,
            error: error ? obtenerMensajeError(error.reason) : '',
            prestamos,
            recursos,
            metricas,
            ahora: Date.now(),
          })
        }
      })
      .catch((error) => {
        if (!signal.aborted) setDatos((d) => ({ ...d, cargando: false, error: obtenerMensajeError(error), ahora: Date.now() }))
      })
    return () => controlador.abort()
  }, [version])

  // al recargar se mantienen los datos anteriores mientras llega la respuesta
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...datos, recargar }
}
