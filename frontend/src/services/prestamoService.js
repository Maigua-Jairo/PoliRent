import axiosClient from '../api/axiosCliente.js'

/* Solicitudes del estudiante autenticado (filtro opcional por estado) */
export const listarMisPrestamos = async ({ estado } = {}, { signal } = {}) => {
  const params = estado ? { estado } : {}
  const { data } = await axiosClient.get('/api/prestamos/mis', { params, signal })
  return data
}

/* HU-008: historial del estudiante con filtros opcionales por estado y rango de fechas */
export const listarHistorialPrestamos = async ({ estado, desde, hasta } = {}, { signal } = {}) => {
  const params = {}
  if (estado) params.estado = estado
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  const { data } = await axiosClient.get('/api/historial', { params, signal })
  return data
}

export const obtenerTerminosPrestamo = async ({ signal } = {}) => {
  const { data } = await axiosClient.get('/api/terminos', { signal })
  return data
}

/* HU-008: docente de referencia y aceptación de términos son obligatorios */
export const solicitarPrestamo = async ({ recursoId, fechaDevolucion, motivo, aceptaTerminos, docenteReferencia }) => {
  const { data } = await axiosClient.post('/api/prestamos', {
    recursoId,
    fechaDevolucion,
    motivo,
    aceptaTerminos,
    docenteReferencia,
  })
  return data
}

/* El multipart explícito evita que axios serialice la evidencia como JSON */
export const registrarEntrega = async (id, { responsable, observaciones, condicion, evidencia }) => {
  const datos = new FormData()
  if (responsable) datos.append('responsable', responsable)
  if (observaciones) datos.append('observaciones', observaciones)
  if (condicion) datos.append('condicion', condicion)
  if (evidencia) datos.append('evidencia', evidencia)
  const { data } = await axiosClient.put(`/api/prestamos/${id}/entregar`, datos, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const registrarDevolucion = async (id, { responsable, observaciones, condicion, evidencia }) => {
  const datos = new FormData()
  if (responsable) datos.append('responsable', responsable)
  if (observaciones) datos.append('observaciones', observaciones)
  if (condicion) datos.append('condicion', condicion)
  if (evidencia) datos.append('evidencia', evidencia)
  const { data } = await axiosClient.put(`/api/prestamos/${id}/devolver`, datos, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/* Solo se pueden cancelar solicitudes pendientes o aprobadas */
export const cancelarPrestamo = async (id) => {
  const { data } = await axiosClient.put(`/api/prestamos/${id}/cancelar`)
  return data
}

/* HU-003: el administrador consulta todas las solicitudes (filtro opcional por estado) */
export const listarPrestamos = async ({ estado } = {}, { signal } = {}) => {
  const params = estado ? { estado } : {}
  const { data } = await axiosClient.get('/api/prestamos', { params, signal })
  return data
}

export const aprobarPrestamo = async (id) => {
  const { data } = await axiosClient.put(`/api/prestamos/${id}/aprobar`)
  return data
}

/* motivo opcional (≤ 200) */
export const rechazarPrestamo = async (id, motivo) => {
  const { data } = await axiosClient.put(`/api/prestamos/${id}/rechazar`, { motivo })
  return data
}
