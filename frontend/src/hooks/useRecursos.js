import { useCallback, useEffect, useState } from 'react'
import { listarRecursos } from '../services/recursoService.js'
import { obtenerMensajeError } from '../services/authService.js'

/* Carga el catálogo con los filtros dados; cancela la petición anterior si los filtros cambian */
export default function useRecursos({ categoria = '', estado = '', buscar = '' } = {}) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState({ clave: null, error: '', recursos: [] })
  // "cargando" se deriva: la última respuesta corresponde a otros filtros (o aún no llega)
  const clave = JSON.stringify([categoria, estado, buscar, version])

  useEffect(() => {
    const controlador = new AbortController()
    listarRecursos({ categoria, estado, buscar }, { signal: controlador.signal })
      .then(({ recursos }) => setResultado({ clave, error: '', recursos }))
      .catch((error) => {
        if (!controlador.signal.aborted) setResultado({ clave, error: obtenerMensajeError(error), recursos: [] })
      })
    return () => controlador.abort()
  }, [categoria, estado, buscar, clave])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { cargando: resultado.clave !== clave, error: resultado.error, recursos: resultado.recursos, recargar }
}
