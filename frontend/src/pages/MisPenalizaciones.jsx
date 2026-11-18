import { useCallback, useEffect, useState } from 'react'
import Alerta from '../components/Alerta.jsx'
import { TarjetaResumen } from '../components/dashboard/Resumen.jsx'
import { Esqueleto, tarjeta } from '../components/dashboard/comunes.jsx'
import { iconos } from '../components/layout/iconos.jsx'
import { obtenerMensajeError } from '../services/authService.js'
import { consultarMisPenalizaciones } from '../services/penalizacionService.js'

const ETIQUETAS_TIPO = {
  atraso: 'Atraso',
  danio: 'Daño',
  perdida: 'Pérdida',
}

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

const formatearMoneda = (monto) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(monto) || 0)

const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' }).format(valor)
}

export default function MisPenalizaciones() {
  const [version, setVersion] = useState(0)
  const [datos, setDatos] = useState({
    cargando: true,
    error: '',
    total: 0,
    totalAdeudado: 0,
    totalAtrasoEnCurso: 0,
    atrasoEnCurso: [],
    penalizaciones: [],
  })

  useEffect(() => {
    const controlador = new AbortController()
    const { signal } = controlador

    consultarMisPenalizaciones({}, { signal })
      .then((respuesta) => {
        if (!signal.aborted) {
          setDatos({
            cargando: false,
            error: '',
            total: respuesta.total ?? respuesta.penalizaciones?.length ?? 0,
            totalAdeudado: respuesta.totalAdeudado ?? 0,
            totalAtrasoEnCurso: respuesta.totalAtrasoEnCurso ?? 0,
            atrasoEnCurso: respuesta.atrasoEnCurso ?? [],
            penalizaciones: respuesta.penalizaciones ?? [],
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

  const reintentar = useCallback(() => {
    setDatos((actuales) => ({ ...actuales, cargando: true, error: '' }))
    setVersion((actual) => actual + 1)
  }, [])

  const metricas = [
    {
      titulo: 'Total adeudado',
      valor: formatearMoneda(datos.totalAdeudado),
      detalle: 'penalizaciones pendientes',
      icono: iconos.bolsa,
      tono: 'bg-red-500 shadow-red-500/30',
    },
    {
      titulo: 'Atraso en curso',
      valor: formatearMoneda(datos.totalAtrasoEnCurso),
      detalle: `${datos.atrasoEnCurso.length} ${datos.atrasoEnCurso.length === 1 ? 'préstamo vencido' : 'préstamos vencidos'}`,
      icono: iconos.reloj,
      tono: 'bg-amber-500 shadow-amber-500/30',
    },
    {
      titulo: 'Penalizaciones registradas',
      valor: datos.total,
      detalle: 'en tu historial',
      icono: iconos.historial,
      tono: 'bg-brand-500 shadow-brand-500/30',
    },
  ]

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Mis penalizaciones</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Revisa tus saldos pendientes, atrasos en curso y el historial de penalizaciones.
        </p>
      </header>

      {datos.error ? (
        <div className="space-y-3">
          <Alerta>{datos.error}</Alerta>
          <button
            type="button"
            onClick={reintentar}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Resumen de penalizaciones" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricas.map((metrica) => (
              <TarjetaResumen key={metrica.titulo} {...metrica} cargando={datos.cargando} />
            ))}
          </section>

          <section aria-labelledby="titulo-atrasos-en-curso" className={`${tarjeta} overflow-hidden`}>
            <div className="p-5">
              <h2 id="titulo-atrasos-en-curso" className="text-lg font-bold text-epn-900 dark:text-white">
                Atrasos en curso
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Montos calculados al día de hoy para préstamos que aún no se han devuelto.
              </p>
            </div>

            {datos.cargando ? (
              <div className="space-y-2 px-5 pb-5" role="status" aria-label="Cargando atrasos">
                {[0, 1].map((fila) => <Esqueleto key={fila} className="h-12" />)}
              </div>
            ) : !datos.atrasoEnCurso.length ? (
              <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">No tienes atrasos en curso.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">Préstamos con atraso y monto acumulado</caption>
                  <thead className="bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      {['Recurso', 'Días de atraso', 'Monto acumulado'].map((columna) => (
                        <th key={columna} scope="col" className="px-5 py-3">{columna}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {datos.atrasoEnCurso.map((atraso) => (
                      <tr key={atraso.prestamo} className="text-slate-700 dark:text-slate-300">
                        <td className="px-5 py-3 font-medium text-epn-900 dark:text-white">
                          {atraso.recurso?.nombre ?? 'Recurso eliminado'}
                        </td>
                        <td className="px-5 py-3">{atraso.diasAtraso}</td>
                        <td className="px-5 py-3 font-semibold">{formatearMoneda(atraso.montoAcumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="titulo-historial-penalizaciones" className={`${tarjeta} overflow-hidden`}>
            <div className="p-5">
              <h2 id="titulo-historial-penalizaciones" className="text-lg font-bold text-epn-900 dark:text-white">
                Historial de penalizaciones
              </h2>
            </div>

            {datos.cargando ? (
              <div className="space-y-2 px-5 pb-5" role="status" aria-label="Cargando penalizaciones">
                {[0, 1, 2].map((fila) => <Esqueleto key={fila} className="h-12" />)}
              </div>
            ) : !datos.penalizaciones.length ? (
              <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">Aún no tienes penalizaciones registradas.</p>
            ) : (
              <div className="max-h-[36rem] overflow-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <caption className="sr-only">Historial de penalizaciones del estudiante</caption>
                  <thead className="sticky top-0 bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      {['ID', 'Fecha', 'Recurso', 'Tipo', 'Días', 'Descripción', 'Monto', 'Estado', 'Fecha de pago', 'Motivo de anulación'].map((columna) => (
                        <th key={columna} scope="col" className="px-4 py-3">{columna}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {datos.penalizaciones.map((penalizacion, indice) => (
                      <tr key={penalizacion._id} className="align-top text-slate-700 dark:text-slate-300">
                        <td className="px-4 py-3">{indice + 1}</td>
                        <td className="whitespace-nowrap px-4 py-3">{formatearFecha(penalizacion.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-epn-900 dark:text-white">
                          {penalizacion.recurso?.nombre ?? 'Recurso eliminado'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{ETIQUETAS_TIPO[penalizacion.tipo] ?? penalizacion.tipo}</td>
                        <td className="px-4 py-3">{penalizacion.dias ?? '—'}</td>
                        <td className="max-w-64 whitespace-normal px-4 py-3">{penalizacion.descripcion || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatearMoneda(penalizacion.monto)}</td>
                        <td className="px-4 py-3">
                          {ETIQUETAS_ESTADO[penalizacion.estado] ?? penalizacion.estado}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{formatearFecha(penalizacion.fechaPago)}</td>
                        <td className="max-w-56 whitespace-normal px-4 py-3">{penalizacion.motivoAnulacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
