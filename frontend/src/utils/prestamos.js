// Deben coincidir con ESTADOS_PRESTAMO en backend/src/models/Prestamo.js
// movimiento: título que se muestra en "Últimos movimientos"; tono: color del icono de ese movimiento
export const ESTADOS_PRESTAMO = [
  { valor: 'pendiente', etiqueta: 'En revisión', movimiento: 'Solicitud en revisión', tono: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  { valor: 'aprobado', etiqueta: 'Aprobada', movimiento: 'Solicitud aprobada', tono: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  { valor: 'entregado', etiqueta: 'En préstamo', movimiento: 'Préstamo entregado', tono: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  { valor: 'devuelto', etiqueta: 'Devuelto', movimiento: 'Devolución registrada', tono: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  { valor: 'rechazado', etiqueta: 'Rechazada', movimiento: 'Solicitud rechazada', tono: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  { valor: 'cancelado', etiqueta: 'Cancelada', movimiento: 'Solicitud cancelada', tono: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400' },
]

export const buscarEstadoPrestamo = (valor) => ESTADOS_PRESTAMO.find((e) => e.valor === valor) ?? ESTADOS_PRESTAMO[0]

export const ESTADOS_ACTIVOS = ['pendiente', 'aprobado', 'entregado']
// Mismas reglas que cancelarPrestamo en backend/src/controllers/prestamoController.js
export const ESTADOS_CANCELABLES = ['pendiente', 'aprobado']
export const puedeCancelar = (prestamo) => ESTADOS_CANCELABLES.includes(prestamo?.estado)
// Aprobada (por retirar) o en préstamo (por devolver)
export const enCurso = (prestamo) => ['aprobado', 'entregado'].includes(prestamo?.estado)

// Pestañas de "Mis solicitudes"
export const PESTANAS_SOLICITUDES = [
  { valor: 'todas', etiqueta: 'Todas', estados: null },
  { valor: 'revision', etiqueta: 'En revisión', estados: ['pendiente'] },
  { valor: 'aprobadas', etiqueta: 'Aprobadas', estados: ['aprobado'] },
  { valor: 'prestamo', etiqueta: 'En préstamo', estados: ['entregado'] },
  { valor: 'devueltas', etiqueta: 'Devueltas', estados: ['devuelto'] },
  { valor: 'rechazadas', etiqueta: 'Rechazadas', estados: ['rechazado', 'cancelado'] },
]

export const filtrarPorPestana = (prestamos, pestana) => {
  const { estados } = PESTANAS_SOLICITUDES.find((p) => p.valor === pestana) ?? PESTANAS_SOLICITUDES[0]
  return estados ? prestamos.filter((p) => estados.includes(p.estado)) : prestamos
}

// Provisional: el backend aún no guarda dónde ni en qué horario se entrega el recurso
export const INFO_ENTREGA = {
  ubicacion: 'ESFOT - Laboratorio 2',
  horario: 'Lun - Vie: 07:00 - 16:00',
  responsable: 'Directiva de la asociación estudiantil',
}

export const INSTRUCCIONES_RETIRO = [
  'Acércate al punto de retiro dentro del horario de atención.',
  'Presenta tu carné estudiantil al responsable.',
  'Revisa el estado del recurso antes de llevártelo.',
]

export const INSTRUCCIONES_DEVOLUCION = [
  'Devuelve el recurso en el mismo punto, dentro del horario de atención.',
  'Entrégalo limpio y con todos sus accesorios.',
  'Hazlo antes de la fecha de devolución para que otros estudiantes puedan usarlo.',
]

const DIA = 24 * 60 * 60 * 1000

// Mismas reglas que validarSolicitudPrestamo en backend/src/middlewares/validationMiddleware.js
export const DIAS_MAX_PRESTAMO = 30
export const MOTIVO_MAX = 300

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

/* 'YYYY-MM-DD' (valor de <input type="date">) en hora local */
const desdeInput = (valor) => {
  const [anio, mes, dia] = valor.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export const aValorInput = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

export const sumarDias = (fecha, dias) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias)

export const validarFechaDevolucion = (valor, hoy) => {
  if (!valor) return 'Elige la fecha de devolución.'
  const fecha = desdeInput(valor)
  if (Number.isNaN(fecha.getTime())) return 'La fecha de devolución no es válida.'
  if (fecha <= inicioDelDia(hoy)) return 'La fecha de devolución debe ser posterior a hoy.'
  if (fecha > sumarDias(hoy, DIAS_MAX_PRESTAMO)) return `El préstamo no puede superar los ${DIAS_MAX_PRESTAMO} días.`
  return ''
}

export const validarMotivo = (valor = '') =>
  valor.length > MOTIVO_MAX ? `El motivo no debe superar los ${MOTIVO_MAX} caracteres.` : ''

/* El día elegido con la hora actual: así el día 30 cae justo en el límite que acepta el backend */
export const fechaDevolucionISO = (valor, ahora = new Date()) => {
  const fecha = desdeInput(valor)
  fecha.setHours(ahora.getHours(), ahora.getMinutes(), ahora.getSeconds(), 0)
  return fecha.toISOString()
}

/* Préstamos en curso que deben devolverse en los próximos `dias` días (o ya vencidos) */
export const devolucionesProximas = (prestamos, ahora, dias = 3) =>
  prestamos.filter((p) => p.estado === 'entregado' && new Date(p.fechaDevolucion) - ahora <= dias * DIA)

/* Días que faltan para la devolución (negativo si ya venció) */
export const diasRestantes = (fecha, ahora) => Math.ceil((new Date(fecha) - ahora) / DIA)

export const formatearFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const formatearFechaHora = (fecha) =>
  fecha
    ? `${formatearFecha(fecha)} · ${new Date(fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}`
    : '—'

// Provisional: el recurso no tiene un código de inventario; se arma con la categoría y el final del id
export const codigoRecurso = (recurso) =>
  recurso?._id ? `${(recurso.categoria ?? 'rec').slice(0, 3).toUpperCase()}-${String(recurso._id).slice(-4).toUpperCase()}` : ''
