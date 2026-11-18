import { useCallback, useEffect, useState } from 'react'
import PenalizacionesAdmin from '../../components/admin/PenalizacionesAdmin.jsx'
import { obtenerMensajeError } from '../../services/authService.js'
import { listarPenalizaciones } from '../../services/penalizacionService.js'

export default function AdminPenalizaciones() {
  const [version, setVersion] = useState(0)
  const [datos, setDatos] = useState({
    cargando: true,
    error: '',
    penalizaciones: [],
    total: 0,
    totalPendiente: 0,
  })

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador

    listarPenalizaciones({}, { signal })
      .then((respuesta) => {
        if (!signal.aborted) {
          setDatos({
            cargando: false,
            error: '',
            penalizaciones: respuesta.penalizaciones ?? [],
            total: respuesta.total ?? respuesta.penalizaciones?.length ?? 0,
            totalPendiente: respuesta.totalPendiente ?? 0,
          })
        }
      })
      .catch((error) => {
        if (!signal.aborted) {
          setDatos((actuales) => ({
            ...actuales,
            cargando: false,
            error: obtenerMensajeError(error),
          }))
        }
      })

    return () => controlador.abort()
  }, [version])

  const recargar = useCallback(() => {
    setDatos((actuales) => ({ ...actuales, cargando: true, error: '' }))
    setVersion((actual) => actual + 1)
  }, [])

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Gestión de penalizaciones</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Consulta, filtra y administra las penalizaciones registradas.
        </p>
      </header>

      <PenalizacionesAdmin {...datos} onActualizar={recargar} />
    </div>
  )
}
