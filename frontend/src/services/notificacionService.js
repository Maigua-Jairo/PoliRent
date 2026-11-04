import axiosClient from '../api/axiosCliente.js'

export const listarNotificaciones = async ({ leida } = {}, { signal } = {}) => {
  const params = {}
  if (leida !== undefined) params.leida = leida
  const { data } = await axiosClient.get('/api/notificaciones', { params, signal })
  return data
}

export const marcarNotificacionLeida = async (id) => {
  const { data } = await axiosClient.put(`/api/notificaciones/${id}/leida`)
  return data
}

export const marcarTodasNotificacionesLeidas = async () => {
  const { data } = await axiosClient.put('/api/notificaciones/leidas')
  return data
}
