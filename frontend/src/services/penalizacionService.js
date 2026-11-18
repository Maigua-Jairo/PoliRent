import axiosClient from '../api/axiosCliente.js'

/* El estudiante consulta sus penalizaciones y el resumen de deuda */
export const consultarMisPenalizaciones = async ({ estado } = {}, { signal } = {}) => {
  const params = estado ? { estado } : {}
  const { data } = await axiosClient.get('/api/penalizaciones/mis', { params, signal })
  return data
}

/* HU-004: el administrador consulta todas las penalizaciones */
export const listarPenalizaciones = async ({ estado, usuario, desde, hasta } = {}, { signal } = {}) => {
  const params = {}
  if (estado) params.estado = estado
  if (usuario) params.usuario = usuario
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta

  const { data } = await axiosClient.get('/api/penalizaciones', { params, signal })
  return data
}

export const pagarPenalizacion = async (id) => {
  const { data } = await axiosClient.put(`/api/penalizaciones/${id}/pagar`)
  return data
}

export const anularPenalizacion = async (id, motivo) => {
  const { data } = await axiosClient.put(`/api/penalizaciones/${id}/anular`, { motivo })
  return data
}
