import axiosClient from '../api/axiosCliente.js'

/* Solicitudes del estudiante autenticado (filtro opcional por estado) */
export const listarMisPrestamos = async ({ estado } = {}, { signal } = {}) => {
  const params = estado ? { estado } : {}
  const { data } = await axiosClient.get('/api/prestamos/mis', { params, signal })
  return data
}

/* HU-008: fechaDevolucion en ISO; motivo opcional (≤ 300) */
export const solicitarPrestamo = async ({ recursoId, fechaDevolucion, motivo }) => {
  const { data } = await axiosClient.post('/api/prestamos', { recursoId, fechaDevolucion, motivo })
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
