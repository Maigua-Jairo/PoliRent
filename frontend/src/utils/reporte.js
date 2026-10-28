import { buscarCategoria, buscarEstado } from './recursos.jsx'
import { buscarEstadoPrestamo } from './prestamos.js'

// Escapa un valor para CSV (comillas dobles y separador ;, que Excel en español abre directamente)
const celda = (valor) => {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

const fila = (valores) => valores.map(celda).join(';')
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '')

/* Reporte con dos bloques: solicitudes de préstamo e inventario de recursos */
export const generarReporteCSV = (prestamos, recursos) => {
  const lineas = [
    'SOLICITUDES DE PRÉSTAMO',
    fila(['ID', 'Usuario', 'Correo', 'Recurso', 'Categoría', 'Estado', 'Fecha de solicitud', 'Fecha de devolución', 'Motivo']),
    ...prestamos.map((p) =>
      fila([
        codigoSolicitud(p),
        [p.usuario?.nombres, p.usuario?.apellidos].filter(Boolean).join(' '),
        p.usuario?.correo,
        p.recurso?.nombre ?? 'Recurso eliminado',
        p.recurso ? buscarCategoria(p.recurso.categoria).etiqueta : '',
        buscarEstadoPrestamo(p.estado).etiqueta,
        fecha(p.createdAt),
        fecha(p.fechaDevolucion),
        p.motivo,
      ]),
    ),
    '',
    'INVENTARIO DE RECURSOS',
    fila(['Recurso', 'Categoría', 'Estado', 'Registrado']),
    ...recursos.map((r) => fila([r.nombre, buscarCategoria(r.categoria).etiqueta, buscarEstado(r.estado).etiqueta, fecha(r.createdAt)])),
  ]
  // BOM para que Excel reconozca UTF-8 (tildes y ñ)
  return `﻿${lineas.join('\r\n')}`
}

export const descargarArchivo = (contenido, nombre, tipo = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

// El backend no expone un código legible: se usan los últimos caracteres del id
export const codigoSolicitud = (prestamo) => `#SR-${String(prestamo._id).slice(-4).toUpperCase()}`
