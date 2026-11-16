import { useEffect, useState } from 'react'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { tarjeta } from '../../components/dashboard/comunes.jsx'
import { buscarEstado, CATEGORIAS } from '../../utils/recursos.jsx'
import { obtenerMensajeError } from '../../services/authService.js'
import {
  consultarReportePenalizaciones,
  consultarReportePrestamos,
  consultarReporteRecursos,
} from '../../services/reporteService.js'
import { descargarArchivo } from '../../utils/reporte.js'

const coloresCategoria = {
  tecnico: '#3b82f6',
  academico: '#8b5cf6',
  recreativo: '#10b981',
  sin_categoria: '#f59e0b',
}
const estadosAprobados = new Set(['aprobado', 'entregado', 'devuelto'])
const formatearNumero = (valor) => valor === '—' ? valor : new Intl.NumberFormat('es-EC').format(Number(valor ?? 0))
const formatearMoneda = (valor) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(valor ?? 0))
const etiquetasRazon = {
  perdido: 'Pérdida',
  danos_frecuentes: 'Daños frecuentes',
  alta_demanda: 'Alta demanda',
  en_mantenimiento: 'En mantenimiento',
}

const fechaISO = (fecha) => {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const obtenerRangoFechas = (periodo, fechaActual) => {
  const hoy = new Date(fechaActual)
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - Number(periodo) + 1)
  return { desde: fechaISO(desde), hasta: fechaISO(hoy) }
}

function Tendencia({ prestamos, periodo, fechaActual }) {
  const hoy = new Date(fechaActual)
  const inicio = new Date(hoy)
  inicio.setDate(inicio.getDate() - Number(periodo) + 1)
  inicio.setHours(0, 0, 0, 0)
  const dias = Number(periodo)
  const series = [
    { key: 'solicitadas', label: 'Solicitudes', color: '#3b82f6', incluir: () => true },
    { key: 'aprobadas', label: 'Aprobadas', color: '#8b5cf6', incluir: (p) => estadosAprobados.has(p.estado) },
    { key: 'canceladas', label: 'Canceladas', color: '#f59e0b', incluir: (p) => p.estado === 'cancelado' },
  ].map((serie) => ({
    ...serie,
    valores: Array.from({ length: dias }, (_, indice) => {
      const fecha = new Date(inicio)
      fecha.setDate(inicio.getDate() + indice)
      const clave = fechaISO(fecha)
      return prestamos.filter((prestamo) =>
        prestamo.solicitadoEl?.slice(0, 10) === clave && serie.incluir(prestamo),
      ).length
    }),
  }))
  const maximo = Math.max(...series.flatMap((serie) => serie.valores), 1)
  const etiquetas = [0, 0.25, 0.5, 0.75, 1].map((fraccion) => {
    const fecha = new Date(inicio)
    fecha.setDate(inicio.getDate() + Math.round((dias - 1) * fraccion))
    return { dia: Math.round((dias - 1) * fraccion), texto: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }) }
  })

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-epn-900 dark:text-white">Tendencia de Préstamos</h2>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-300">
          {series.map((serie) => (
            <span key={serie.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.color }} />
              {serie.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="h-52 w-full" role="img" aria-label="Solicitudes por día dentro del período seleccionado">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" x2="600" y1={30 + i * 42} y2={30 + i * 42} stroke="#cbd5e1" strokeDasharray="5 8" />
        ))}
        {series.map(({ key, valores, color }) => {
          const points = valores
            .map((valor, indice) => `${(indice / Math.max(dias - 1, 1)) * 600},${190 - (valor / maximo) * 150}`)
            .join(' ')
          return <polyline key={key} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        {etiquetas.map((etiqueta) => <span key={etiqueta.dia}>{etiqueta.texto}</span>)}
      </div>
    </div>
  )
}

function DonutChart({ items }) {
  const total = items.reduce((acc, item) => acc + item.value, 0)
  const gradient = items.reduce(
    (resultado, item) => {
      const inicio = resultado.offset
      const fin = inicio + (total ? (item.value / total) * 100 : 0)
      return {
        offset: fin,
        stops: [...resultado.stops, `${item.color} ${inicio}% ${fin}%`],
      }
    },
    { offset: 0, stops: [] },
  ).stops.join(', ')

  if (!items.length) {
    return <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No hay préstamos registrados en este período.</p>
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
      <div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="absolute inset-[16%] rounded-full bg-white dark:bg-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-epn-900 dark:text-white">{formatearNumero(total)}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Préstamos</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
            <span className="font-bold text-epn-900 dark:text-white">{item.porcentaje}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminMetricas() {
  const { cargando, error, errorMetricas, metricas } = useDashboardAdmin()
  const [periodo, setPeriodo] = useState('30')
  const [fechaActual, setFechaActual] = useState(() => new Date())
  const [tipoReporte, setTipoReporte] = useState('prestamos')
  const [reportes, setReportes] = useState({
    periodo: '30',
    cargando: true,
    error: '',
    prestamos: [],
    recursos: [],
    totalPenalizaciones: 0,
    totalMontoPenalizaciones: 0,
  })
  const [generando, setGenerando] = useState(false)
  const [errorGeneracion, setErrorGeneracion] = useState('')
  const rango = obtenerRangoFechas(periodo, fechaActual)
  const cargandoReportes = reportes.cargando || reportes.periodo !== periodo

  useEffect(() => {
    const controlador = new AbortController()
    const rangoConsulta = obtenerRangoFechas(periodo, fechaActual)
    Promise.all([
      consultarReportePrestamos(rangoConsulta),
      consultarReporteRecursos(rangoConsulta),
      consultarReportePenalizaciones(rangoConsulta),
    ])
      .then(([respuestaPrestamos, respuestaRecursos, respuestaPenalizaciones]) => {
        if (controlador.signal.aborted) return
        setReportes({
          periodo,
          cargando: false,
          error: '',
          prestamos: respuestaPrestamos.prestamos ?? [],
          recursos: respuestaRecursos.recursos ?? [],
          totalPenalizaciones: respuestaPenalizaciones.total ?? 0,
          totalMontoPenalizaciones: respuestaPenalizaciones.totalMonto ?? 0,
        })
      })
      .catch((e) => {
        if (!controlador.signal.aborted) {
          setReportes((actual) => ({ ...actual, periodo, cargando: false, error: obtenerMensajeError(e) }))
        }
      })

    return () => controlador.abort()
  }, [periodo, fechaActual])

  const generarReporte = async () => {
    setGenerando(true)
    setErrorGeneracion('')
    try {
      const consultarCSV = {
        prestamos: consultarReportePrestamos,
        recursos: consultarReporteRecursos,
        penalizaciones: consultarReportePenalizaciones,
      }[tipoReporte]
      const archivo = await consultarCSV({ ...rango, formato: 'csv' })
      const tipo = tipoReporte
      descargarArchivo(archivo, `reporte-polirent-${tipo}-${rango.hasta}.csv`)
    } catch (e) {
      setErrorGeneracion(obtenerMensajeError(e))
    } finally {
      setGenerando(false)
    }
  }

  const prestamos = reportes.prestamos
  const aprobadas = prestamos.filter((prestamo) => estadosAprobados.has(prestamo.estado)).length
  const usuariosActivos = new Set(prestamos.map((prestamo) => prestamo.correo).filter(Boolean)).size
  const totalUsos = reportes.recursos.reduce((total, recurso) => total + recurso.vecesPrestado, 0)
  const usoPorCategoria = reportes.recursos.reduce((uso, recurso) => {
    if (recurso.vecesPrestado > 0) uso[recurso.categoria] = (uso[recurso.categoria] ?? 0) + recurso.vecesPrestado
    return uso
  }, {})
  const categoriaItems = Object.entries(usoPorCategoria).map(([valor, total]) => ({
    label: CATEGORIAS.find((categoria) => categoria.valor === valor)?.etiqueta ?? valor,
    value: total,
    porcentaje: totalUsos ? Math.round((total / totalUsos) * 100) : 0,
    color: coloresCategoria[valor] ?? '#3b82f6',
  }))
  const resumen = [
    { label: 'Total de Recursos', valor: metricas ? metricas.recursos?.total ?? 0 : '—', color: '#3b82f6' },
    { label: 'Solicitudes Totales', valor: prestamos.length, color: '#8b5cf6' },
    { label: 'Solicitudes Aprobadas', valor: aprobadas, color: '#10b981' },
    { label: 'Usuarios Activos', valor: usuariosActivos, color: '#f59e0b' },
  ]
  const recursosMasSolicitados = [...reportes.recursos]
    .sort((a, b) => b.vecesPrestado - a.vecesPrestado)
    .slice(0, 5)

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-epn-900 dark:text-white">Métricas y Reportes</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Visualiza el rendimiento del sistema y genera reportes detallados.</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 dark:border-brand-700/50 dark:bg-brand-500/10 dark:text-brand-300">
          <span>Período</span>
          <select
            aria-label="Período de métricas"
            value={periodo}
            onChange={(e) => {
              setPeriodo(e.target.value)
              setFechaActual(new Date())
            }}
            className="bg-transparent font-semibold focus:outline-none dark:text-brand-200"
          >
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </label>
      </div>

      {(cargando || cargandoReportes) && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando métricas…</p>}
      {!cargando && error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!cargando && errorMetricas && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorMetricas}</p>}
      {!cargandoReportes && reportes.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{reportes.error}</p>}
      {errorGeneracion && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorGeneracion}</p>}

      {!cargando && !error && !cargandoReportes && !reportes.error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {resumen.map((item) => (
              <div key={item.label} className={`${tarjeta} p-4`}>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-2 text-4xl font-extrabold text-epn-900 dark:text-white">{formatearNumero(item.valor)}</p>
                <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: item.color }} />
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="titulo-penalizaciones-resumen" className={`${tarjeta} p-5`}>
              <div className="mb-5">
                <h2 id="titulo-penalizaciones-resumen" className="text-lg font-bold text-epn-900 dark:text-white">Penalizaciones</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resumen por estado y monto vigente por tipo.</p>
              </div>
              {metricas?.penalizaciones ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { etiqueta: 'Pendientes', cantidad: metricas.penalizaciones.pendientes?.cantidad, monto: metricas.penalizaciones.pendientes?.monto },
                      { etiqueta: 'Pagadas', cantidad: metricas.penalizaciones.pagadas?.cantidad, monto: metricas.penalizaciones.pagadas?.monto },
                      { etiqueta: 'Anuladas', cantidad: metricas.penalizaciones.anuladas?.cantidad, monto: null },
                    ].map((item) => (
                      <div key={item.etiqueta} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.etiqueta}</p>
                        <p className="mt-1 text-2xl font-extrabold text-epn-900 dark:text-white">{formatearNumero(item.cantidad)}</p>
                        {item.monto !== null && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatearMoneda(item.monto)}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
                    {[
                      ['Atraso', metricas.penalizaciones.montoPorTipo?.atraso],
                      ['Daño o incompleto', metricas.penalizaciones.montoPorTipo?.danio],
                      ['Pérdida', metricas.penalizaciones.montoPorTipo?.perdida],
                    ].map(([etiqueta, monto]) => (
                      <p key={etiqueta} className="text-slate-600 dark:text-slate-300">
                        {etiqueta}: <span className="font-semibold text-epn-900 dark:text-white">{formatearMoneda(monto)}</span>
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Resumen de penalizaciones no disponible.</p>
              )}
            </section>

            <section aria-labelledby="titulo-reposicion" className={`${tarjeta} p-5`}>
              <div className="mb-5">
                <h2 id="titulo-reposicion" className="text-lg font-bold text-epn-900 dark:text-white">Recursos por reponer o ampliar</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prioridad según pérdidas, incidentes, demanda y mantenimiento.</p>
              </div>
              {Array.isArray(metricas?.recursosParaReponer) ? (
                metricas.recursosParaReponer.length ? (
                  <ul className="space-y-3">
                    {metricas.recursosParaReponer.map((item) => (
                      <li key={item.recurso?._id ?? item.recurso?.nombre} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-epn-900 dark:text-white">{item.recurso?.nombre ?? 'Recurso sin nombre'}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {buscarEstado(item.recurso?.estado).etiqueta} · {formatearNumero(item.vecesPrestado)} préstamos · {formatearNumero(item.incidentes)} incidentes
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            {formatearNumero(item.ocupacion30Dias)} % de ocupación
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(item.razones ?? []).map((razon) => (
                            <span key={razon} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                              {etiquetasRazon[razon] ?? razon}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay recursos que requieran reposición o ampliación.</p>
                )
              ) : (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Datos de reposición no disponibles.</p>
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <section className={`${tarjeta} p-4`}>
              <Tendencia prestamos={prestamos} periodo={periodo} fechaActual={fechaActual} />
            </section>
            <section className={`${tarjeta} p-4`}>
              <h2 className="mb-4 text-lg font-bold text-epn-900 dark:text-white">Distribución por Categoría</h2>
              <DonutChart items={categoriaItems} />
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className={`${tarjeta} p-4`}>
              <h2 className="mb-4 text-lg font-bold text-epn-900 dark:text-white">Recursos Más Solicitados</h2>
              {recursosMasSolicitados.length ? (
                <div className="space-y-4">
                  {recursosMasSolicitados.map((recurso, indice) => {
                    const maximo = Math.max(...recursosMasSolicitados.map((item) => item.vecesPrestado), 1)
                    return (
                      <div key={recurso.recurso} className="flex items-center gap-3">
                        <span className="w-7 text-sm font-bold text-slate-500 dark:text-slate-400">{indice + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-epn-900 dark:text-white">{recurso.recurso}</p>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">{recurso.vecesPrestado} préstamos</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" style={{ width: `${(recurso.vecesPrestado / maximo) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No hay préstamos registrados en este período.</p>
              )}
            </section>

            <section className={`${tarjeta} p-4`}>
              <h2 className="mb-4 text-lg font-bold text-epn-900 dark:text-white">Reporte Rápido</h2>
              <div className="space-y-3">
                {[
                  { id: 'prestamos', etiqueta: 'Reporte de préstamos', icono: '📊' },
                  { id: 'recursos', etiqueta: 'Reporte de recursos', icono: '📦' },
                  { id: 'penalizaciones', etiqueta: 'Reporte de penalizaciones', icono: '⚠️' },
                ].map((reporte) => (
                  <button
                    key={reporte.id}
                    type="button"
                    aria-pressed={tipoReporte === reporte.id}
                    onClick={() => setTipoReporte(reporte.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                      tipoReporte === reporte.id
                        ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{reporte.icono}</span>
                    {reporte.etiqueta}
                  </button>
                ))}
              </div>
              {tipoReporte === 'penalizaciones' && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {formatearNumero(reportes.totalPenalizaciones)} registros · {formatearMoneda(reportes.totalMontoPenalizaciones)} no anulados en el período.
                </p>
              )}
              <button
                type="button"
                onClick={generarReporte}
                disabled={generando || cargandoReportes}
                className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generando ? 'Generando…' : 'Generar Reporte CSV'}
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Se aplicará el período seleccionado: últimos {periodo} días.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
