import axiosClient from '../api/axiosCliente.js'

export const iniciarSesion = async ({ correo, password }) => {
  const { data } = await axiosClient.post('/api/login', { correo, password })
  return data
}

export const registrarUsuario = async (usuario) => {
  const { data } = await axiosClient.post('/api/registro', usuario)
  return data
}

export const cerrarSesion = async () => {
  const { data } = await axiosClient.post('/api/logout')
  return data
}

export const obtenerPerfil = async () => {
  const { data } = await axiosClient.get('/api/perfil')
  return data
}

export const actualizarPerfil = async (cambios) => {
  const { data } = await axiosClient.put('/api/perfil', cambios)
  return data
}

export const solicitarRecuperacion = async (correo) => {
  const { data } = await axiosClient.post('/api/recuperar-clave', { correo })
  return data
}

export const restablecerClave = async (token, { password, confirmarPassword }) => {
  const { data } = await axiosClient.post(`/api/recuperar-clave/${encodeURIComponent(token)}`, {
    password,
    confirmarPassword,
  })
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
