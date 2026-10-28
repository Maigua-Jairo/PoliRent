import { useCallback, useEffect, useState } from 'react'
import { listarMisPrestamos } from '../services/prestamoService.js'
import { obtenerMensajeError } from '../services/authService.js'

/* Solicitudes del estudiante; `ahora` se fija al recibir la respuesta para calcular plazos */
export default function useMisPrestamos() {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState({ version: -1, error: '', prestamos: [], ahora: 0 })

  useEffect(() => {
    const controlador = new AbortController()
    listarMisPrestamos({}, { signal: controlador.signal })
      .then(({ prestamos = [] }) => setResultado({ version, error: '', prestamos, ahora: Date.now() }))
      .catch((error) => {
        if (!controlador.signal.aborted) setResultado({ version, error: obtenerMensajeError(error), prestamos: [], ahora: Date.now() })
      })
    return () => controlador.abort()
  }, [version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  // solo se muestra el esqueleto en la primera carga; al recargar se mantienen los datos anteriores
  return { cargando: resultado.version === -1, ...resultado, recargar }
}
