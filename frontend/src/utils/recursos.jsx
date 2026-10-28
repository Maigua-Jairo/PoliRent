// Deben coincidir con CATEGORIAS y ESTADOS en backend/src/models/Recurso.js
export const CATEGORIAS = [
  {
    valor: 'tecnico',
    etiqueta: 'Técnico',
    plural: 'Técnicos',
    descripcion: 'Herramientas, equipos electrónicos y kits de laboratorio para tus prácticas y proyectos.',
    tono: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    acento: 'from-blue-500/25',
    // color de la categoría en gráficos (paleta validada para claro y oscuro)
    grafico: 'text-brand-500',
    icono: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  },
  {
    valor: 'academico',
    etiqueta: 'Académico',
    plural: 'Académicos',
    descripcion: 'Material bibliográfico y recursos de apoyo para tus asignaturas e investigaciones.',
    tono: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    acento: 'from-emerald-500/25',
    grafico: 'text-emerald-500 dark:text-emerald-600',
    icono: (
      <>
        <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
        <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
      </>
    ),
  },
  {
    valor: 'recreativo',
    etiqueta: 'Recreativo',
    plural: 'Recreativos',
    descripcion: 'Implementos deportivos y de ocio para actividades extracurriculares.',
    tono: 'bg-orange-100 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
    acento: 'from-orange-500/25',
    grafico: 'text-orange-500 dark:text-orange-600',
    icono: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a14 14 0 0 1 0 18M3 12h18M5.6 5.6c3.5 2.8 9.3 2.8 12.8 0M5.6 18.4c3.5-2.8 9.3-2.8 12.8 0" />
      </>
    ),
  },
]

export const ESTADOS = [
  { valor: 'disponible', etiqueta: 'Disponible', tono: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300', punto: 'bg-emerald-500' },
  { valor: 'prestado', etiqueta: 'Prestado', tono: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300', punto: 'bg-amber-500' },
  { valor: 'mantenimiento', etiqueta: 'Mantenimiento', tono: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/15 dark:text-slate-300', punto: 'bg-slate-400' },
]

export const buscarCategoria = (valor) => CATEGORIAS.find((c) => c.valor === valor) ?? CATEGORIAS[0]
export const buscarEstado = (valor) => ESTADOS.find((e) => e.valor === valor) ?? ESTADOS[0]

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANO_MAXIMO_IMAGEN = 2 * 1024 * 1024

/* Validadores del formulario de recursos (mismas reglas que validarRecurso en el backend) */
export const validarNombreRecurso = (valor = '') => {
  const texto = valor.trim()
  if (!texto) return 'El nombre es obligatorio.'
  if (texto.length < 3) return 'El nombre debe tener al menos 3 caracteres.'
  if (texto.length > 100) return 'El nombre no debe superar los 100 caracteres.'
  return ''
}

export const validarImagen = (archivo) => {
  if (!archivo) return ''
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'La imagen debe ser JPG, PNG o WEBP.'
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) return 'La imagen no debe superar los 2 MB.'
  return ''
}
