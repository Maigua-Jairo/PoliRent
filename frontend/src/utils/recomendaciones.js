// Mismas reglas que validarRecomendacion en backend/src/middlewares/validationMiddleware.js
export const CONTEXTO_MIN = 5
export const CONTEXTO_MAX = 500
// El backend acepta 1–10; se piden todos para poder filtrar por categoría en el cliente
export const LIMITE_RECOMENDACIONES = 10

export const validarContexto = (valor = '') => {
  const texto = valor.trim()
  if (!texto) return 'Describe tu proyecto o lo que necesitas.'
  if (texto.length < CONTEXTO_MIN) return `Escribe al menos ${CONTEXTO_MIN} caracteres.`
  if (texto.length > CONTEXTO_MAX) return `La consulta no debe superar los ${CONTEXTO_MAX} caracteres.`
  return ''
}

export const EJEMPLOS_CONSULTA = [
  'Estoy desarrollando una web en React y necesito herramientas de desarrollo.',
  'Quiero trabajar con bases de datos para mi aplicación.',
  'Necesito un equipo de medición para un proyecto de electrónica.',
]

export const CONSEJOS_CONSULTA = [
  'Sé específico con tu proyecto.',
  'Menciona las herramientas que ya usas.',
  'Indica el tipo de recurso que necesitas (técnico, académico o recreativo).',
]

export const horaActual = () => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
