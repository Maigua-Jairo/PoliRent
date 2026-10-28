import { useCallback, useEffect, useState } from 'react'
import { listarPrestamos } from '../services/prestamoService.js'
import { listarRecursos } from '../services/recursoService.js'
import { obtenerMensajeError } from '../services/authService.js'

/* Todas las solicitudes y todos los recursos (HU-003); `ahora` se fija al recibir los datos */
export default function useDashboardAdmin() {
  const [version, setVersion] = useState(0)
  const [datos, setDatos] = useState({ cargando: true, error: '', prestamos: [], recursos: [], ahora: 0 })

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador
    Promise.all([listarPrestamos({}, { signal }), listarRecursos({}, { signal })])
      .then(([{ prestamos = [] }, { recursos = [] }]) => setDatos({ cargando: false, error: '', prestamos, recursos, ahora: Date.now() }))
      .catch((error) => {
        if (!signal.aborted) setDatos((d) => ({ ...d, cargando: false, error: obtenerMensajeError(error), ahora: Date.now() }))
      })
    return () => controlador.abort()
  }, [version])

  // al recargar se mantienen los datos anteriores mientras llega la respuesta
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...datos, recargar }
}
