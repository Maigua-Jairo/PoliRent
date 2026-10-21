import axiosClient from '../api/axiosCliente.js'

export const iniciarSesion = async ({ correo, password }) => {
  const { data } = await axiosClient.post('/api/login', { correo, password })
  return data
}

export const registrarUsuario = async (usuario) => {
  const { data } = await axiosClient.post('/api/registro', usuario)
  return data
}

export const obtenerMensajeError = (error) => {
  if (error.response) {
    return error.response.data?.msg || error.response.data?.message || 'No se pudo completar la solicitud.'
  }
  if (error.request) {
    return 'No se pudo conectar con el servidor. Inténtalo nuevamente.'
  }
  return 'Ocurrió un error inesperado. Inténtalo nuevamente.'
}
