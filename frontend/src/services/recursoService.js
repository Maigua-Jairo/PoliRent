import axiosClient from '../api/axiosCliente.js'

// Sin este encabezado axios convierte el FormData a JSON (el cliente usa application/json por defecto)
// y la imagen se pierde; en el navegador axios lo reemplaza por el boundary correcto.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

const aFormData = ({ imagen, ...campos }) => {
  const datos = new FormData()
  Object.entries(campos).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null) datos.append(clave, valor)
  })
  if (imagen instanceof File) datos.append('imagen', imagen)
  // cadena vacía = quitar la imagen actual (llega al backend como campo de texto)
  else if (imagen === '') datos.append('imagen', '')
  return datos
}

/* Filtros opcionales: categoria, estado, buscar */
export const listarRecursos = async (filtros = {}, { signal } = {}) => {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
  const { data } = await axiosClient.get('/api/recursos', { params, signal })
  return data
}

export const obtenerRecurso = async (id) => {
  const { data } = await axiosClient.get(`/api/recursos/${id}`)
  return data
}

export const crearRecurso = async (recurso) => {
  const { data } = await axiosClient.post('/api/recursos', aFormData(recurso), MULTIPART)
  return data
}

export const actualizarRecurso = async (id, recurso) => {
  const { data } = await axiosClient.put(`/api/recursos/${id}`, aFormData(recurso), MULTIPART)
  return data
}

export const eliminarRecurso = async (id) => {
  const { data } = await axiosClient.delete(`/api/recursos/${id}`)
  return data
}
