import axiosClient from '../api/axiosCliente.js'

export const conversarConAsistente = async ({ mensaje, historial = [] }, { signal } = {}) => {
  const { data } = await axiosClient.post('/api/asistente', { mensaje, historial }, { signal, timeout: 45000 })
  return data
}
