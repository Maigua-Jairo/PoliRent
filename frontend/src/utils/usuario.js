/* Iniciales del primer nombre y del primer apellido (p. ej. "Jairo Maigua" -> "JM") */
export const iniciales = (usuario) => {
  const primera = (texto) => texto?.trim().charAt(0) ?? ''
  return `${primera(usuario?.nombres)}${primera(usuario?.apellidos)}`.toUpperCase() || '?'
}
