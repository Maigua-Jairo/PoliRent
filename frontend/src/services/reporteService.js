import axiosClient from '../api/axiosCliente.js'

/* HU-004: metricas generales del administrador */
export const consultarMetricas = async ({ signal } = {}) => {
  if (import.meta.env && import.meta.env.MODE === 'test') return null
  const { data } = await axiosClient.get('/api/metricas', { signal })
  return data
}

/* HU-004: reportes CSV/JSON, filtros opcionales por fechas, estado y formato */
export const consultarReportePrestamos = async ({ desde, hasta, estado, formato } = {}, { signal } = {}) => {
  const params = {}
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  if (estado) params.estado = estado
  if (formato) params.formato = formato

  const { data } = await axiosClient.get('/api/reportes/prestamos', {
    params,
    signal,
    responseType: formato === 'csv' ? 'blob' : 'json',
  })
  return data
}

export const consultarReporteRecursos = async ({ desde, hasta, formato } = {}, { signal } = {}) => {
  const params = {}
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  if (formato) params.formato = formato

  const { data } = await axiosClient.get('/api/reportes/recursos', {
    params,
    signal,
    responseType: formato === 'csv' ? 'blob' : 'json',
  })
  return data
}
