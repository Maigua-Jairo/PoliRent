export const DOMINIO_INSTITUCIONAL = '@epn.edu.ec'

// Deben coincidir con FACULTADES en backend/src/models/Usuario.js
export const FACULTADES = [
  'Escuela de Formación de Tecnólogos',
  'Ingeniería Civil',
  'Ingeniería Mecánica',
  'Ingeniería en Sistemas',
  'Ingeniería Química',
  'Ingeniería Eléctrica y Electrónica',
  'Ingeniería Ambiental',
]

const CORREO_EPN = /^[a-zA-Z0-9._%+-]+@epn\.edu\.ec$/i
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(\s[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/

/* Cada validador devuelve '' si el valor es válido o el mensaje de error */

export const validarCorreoEPN = (correo = '') => {
  const valor = correo.trim()
  if (!valor) return 'El correo es obligatorio.'
  if (!CORREO_EPN.test(valor)) return `Solo se permiten correos institucionales (${DOMINIO_INSTITUCIONAL}).`
  return ''
}

export const validarNombre = (valor = '', campo) => {
  const texto = valor.trim()
  if (!texto) return `${campo} es obligatorio.`
  if (texto.length < 2) return `${campo} es demasiado corto.`
  if (!SOLO_LETRAS.test(texto)) return `${campo} solo puede contener letras.`
  return ''
}

/* Cédula ecuatoriana: 10 dígitos, provincia 01-24 (o 30), tercer dígito < 6 y dígito verificador (módulo 10) */
export const validarCedula = (cedula = '') => {
  if (!cedula) return 'La cédula es obligatoria.'
  if (!/^\d{10}$/.test(cedula)) return 'La cédula debe tener 10 dígitos.'

  const provincia = Number(cedula.slice(0, 2))
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return 'La cédula no es válida.'
  if (Number(cedula[2]) >= 6) return 'La cédula no es válida.'

  const suma = cedula
    .slice(0, 9)
    .split('')
    .reduce((acc, d, i) => {
      let n = Number(d) * (i % 2 === 0 ? 2 : 1)
      if (n > 9) n -= 9
      return acc + n
    }, 0)
  const verificador = (10 - (suma % 10)) % 10
  if (verificador !== Number(cedula[9])) return 'La cédula no es válida.'
  return ''
}

export const validarTelefono = (telefono = '') => {
  if (!telefono) return 'El teléfono es obligatorio.'
  if (!/^09\d{8}$/.test(telefono)) return 'Ingresa un celular válido de 10 dígitos (09XXXXXXXX).'
  return ''
}

export const validarFacultad = (facultad = '') => (FACULTADES.includes(facultad) ? '' : 'Selecciona tu facultad.')

export const validarContrasena = (contrasena = '') => {
  if (!contrasena) return 'La contraseña es obligatoria.'
  if (contrasena.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(contrasena)) return 'Debe incluir al menos una letra mayúscula.'
  if (!/[a-z]/.test(contrasena)) return 'Debe incluir al menos una letra minúscula.'
  if (!/\d/.test(contrasena)) return 'Debe incluir al menos un número.'
  return ''
}

export const validarConfirmacion = (campoOriginal) => (valor, form) => {
  if (!valor) return 'Confirma tu contraseña.'
  if (valor !== form[campoOriginal]) return 'Las contraseñas no coinciden.'
  return ''
}

/* Adapta un validador al formato de react-hook-form (true si es válido, mensaje si no) */
export const regla = (validador) => (valor, form) => validador(valor, form) || true
