import axiosClient from '../api/axiosCliente.js'

/* HU-009: recursos recomendados según el contexto del proyecto (5–500 caracteres) */
export const obtenerRecomendaciones = async ({ contexto, recursosSeleccionados, limite }, { signal } = {}) => {
  const { data } = await axiosClient.post('/api/recomendaciones', { contexto, recursosSeleccionados, limite }, { signal })
  return data
}
