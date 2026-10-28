import { CATEGORIAS } from './recursos.jsx'
import { codigoSolicitud } from './reporte.js'

const DIA = 24 * 60 * 60 * 1000
const inicioDelDia = (ms) => new Date(new Date(ms).setHours(0, 0, 0, 0))

/* Por categoría: total, disponibles, en uso (prestados) y en mantenimiento */
export const inventarioPorCategoria = (recursos) =>
  CATEGORIAS.map((categoria) => {
    const propios = recursos.filter((r) => r.categoria === categoria.valor)
    const contar = (estado) => propios.filter((r) => r.estado === estado).length
    return {
      categoria,
      total: propios.length,
      disponibles: contar('disponible'),
      enUso: contar('prestado'),
      mantenimiento: contar('mantenimiento'),
    }
  })

/* Solicitudes creadas por día en los últimos `dias` días (incluido hoy) */
export const solicitudesPorDia = (prestamos, dias, ahora) => {
  const hoy = inicioDelDia(ahora)
  return Array.from({ length: dias }, (_, i) => {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1 - i))
    const siguiente = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)
    const total = prestamos.filter((p) => {
      const creada = new Date(p.createdAt)
      return creada >= dia && creada < siguiente
    }).length
    return { dia, total }
  })
}

const ACTIVIDAD_PRESTAMO = {
  pendiente: { tipo: 'nueva', texto: (c) => `Nueva solicitud ${c}` },
  aprobado: { tipo: 'aprobada', texto: (c) => `Se aprobó la solicitud ${c}` },
  entregado: { tipo: 'entrega', texto: (c) => `Se entregó el recurso de la solicitud ${c}` },
  devuelto: { tipo: 'devolucion', texto: () => 'Se completó la devolución de un recurso' },
  rechazado: { tipo: 'rechazada', texto: (c) => `Se rechazó la solicitud ${c}` },
  cancelado: { tipo: 'cancelada', texto: (c) => `El estudiante canceló la solicitud ${c}` },
}

const nombreUsuario = (u) => [u?.nombres?.split(' ')[0], u?.apellidos?.split(' ')[0]].filter(Boolean).join(' ')

/* Últimos cambios: estado actual de cada solicitud y recursos registrados */
export const ultimasActividades = (prestamos, recursos, limite = 5) =>
  [
    ...prestamos.map((p) => {
      const { tipo, texto } = ACTIVIDAD_PRESTAMO[p.estado] ?? ACTIVIDAD_PRESTAMO.pendiente
      return {
        id: `p-${p._id}`,
        tipo,
        titulo: texto(codigoSolicitud(p)),
        detalle: [p.recurso?.nombre ?? 'Recurso eliminado', nombreUsuario(p.usuario)].filter(Boolean).join(' – '),
        fecha: p.updatedAt ?? p.createdAt,
      }
    }),
    ...recursos.map((r) => ({
      id: `r-${r._id}`,
      tipo: 'recurso',
      titulo: 'Se registró un nuevo recurso',
      detalle: r.nombre,
      fecha: r.createdAt,
    })),
  ]
    .filter((a) => a.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, limite)

export const haceCuanto = (fecha, ahora) => {
  const minutos = Math.max(0, Math.round((ahora - new Date(fecha)) / 60000))
  if (minutos < 1) return 'Hace un momento'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.round((ahora - new Date(fecha)) / DIA)
  return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`
}
