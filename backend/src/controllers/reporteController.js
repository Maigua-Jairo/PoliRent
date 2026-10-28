import Prestamo from '../models/Prestamo.js'
import Recurso from '../models/Recurso.js'
import Usuario from '../models/Usuario.js'
import {aCSV, rangoFechas} from '../helpers/reporteHelper.js'

const MS_DIA = 24 * 60 * 60 * 1000
// prestamos que si llegaron a ocurrir (el recurso salio del laboratorio)
const USADOS = ['entregado', 'devuelto']

const contar = (lista, clave) => lista.reduce((acc, item) => {
    const k = clave(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
}, {})

// responde en JSON o en CSV (descarga) segun ?formato
const responderReporte = (res, formato, nombreArchivo, columnas, filas, cuerpoJSON) => {
    if(formato === 'csv'){
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.csv"`)
        return res.status(200).send(aCSV(columnas, filas))
    }
    res.status(200).json(cuerpoJSON)
}

// HU-004: metricas generales del sistema
const metricas = async (req, res) => {
    try{
        const [recursos, prestamos, estudiantes] = await Promise.all([
            Recurso.find().select('nombre categoria estado').lean(),
            Prestamo.find().select('recurso estado createdAt fechaEntrega fechaDevolucion fechaDevolucionReal').lean(),
            Usuario.countDocuments({rol: 'estudiante'})
        ])
        const nombres = new Map(recursos.map(r => [String(r._id), r]))
        const usados = prestamos.filter(p => USADOS.includes(p.estado))
        const ahora = Date.now()

        const usoPorRecurso = contar(usados, p => String(p.recurso))
        const masPrestados = Object.entries(usoPorRecurso)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, veces]) => ({
                recurso: {_id: id, nombre: nombres.get(id)?.nombre ?? 'Recurso eliminado', categoria: nombres.get(id)?.categoria ?? null},
                veces
            }))

        const devueltos = prestamos.filter(p => p.estado === 'devuelto' && p.fechaEntrega && p.fechaDevolucionReal)
        const duracionPromedioDias = devueltos.length
            ? Number((devueltos.reduce((s, p) => s + (new Date(p.fechaDevolucionReal) - new Date(p.fechaEntrega)), 0) / devueltos.length / MS_DIA).toFixed(1))
            : 0
        const resueltas = prestamos.filter(p => !['pendiente', 'cancelado'].includes(p.estado))
        const aprobadas = resueltas.filter(p => p.estado !== 'rechazado').length

        res.status(200).json({
            generadoEn: new Date(),
            estudiantes,
            recursos: {
                total: recursos.length,
                porEstado: contar(recursos, r => r.estado),
                porCategoria: contar(recursos, r => r.categoria)
            },
            prestamos: {
                total: prestamos.length,
                porEstado: contar(prestamos, p => p.estado),
                ultimos30Dias: prestamos.filter(p => ahora - new Date(p.createdAt) <= 30 * MS_DIA).length,
                tasaAprobacion: resueltas.length ? Number((aprobadas / resueltas.length * 100).toFixed(1)) : 0,
                duracionPromedioDias,
                vencidos: prestamos.filter(p => p.estado === 'entregado' && new Date(p.fechaDevolucion) < ahora).length
            },
            usoPorCategoria: contar(usados, p => nombres.get(String(p.recurso))?.categoria ?? 'sin_categoria'),
            masPrestados
        })
    }catch(error){
        res.status(500).json({msg: `Error al calcular las metricas - ${error}`})
    }
}

// HU-004: reporte de prestamos (filtros opcionales ?desde ?hasta ?estado; ?formato=csv para descargar)
const reportePrestamos = async (req, res) => {
    const {desde, hasta, estado, formato} = req.query
    try{
        const filtro = {}
        const rango = rangoFechas(desde, hasta)
        if(rango) filtro.createdAt = rango
        if(estado) filtro.estado = estado
        const prestamos = await Prestamo.find(filtro)
            .populate('usuario', 'nombres apellidos cedula correo facultad')
            .populate('recurso', 'nombre categoria')
            .sort({createdAt: -1})
        const filas = prestamos.map(p => ({
            estudiante: p.usuario ? `${p.usuario.nombres} ${p.usuario.apellidos}` : 'Usuario eliminado',
            cedula: p.usuario?.cedula ?? '',
            correo: p.usuario?.correo ?? '',
            facultad: p.usuario?.facultad ?? '',
            recurso: p.recurso?.nombre ?? 'Recurso eliminado',
            categoria: p.recurso?.categoria ?? '',
            estado: p.estado,
            motivo: p.motivo,
            solicitadoEl: p.createdAt,
            fechaEntrega: p.fechaEntrega,
            fechaDevolucion: p.fechaDevolucion,
            fechaDevolucionReal: p.fechaDevolucionReal
        }))
        const columnas = [
            {titulo: 'Estudiante', campo: 'estudiante'}, {titulo: 'Cedula', campo: 'cedula'}, {titulo: 'Correo', campo: 'correo'},
            {titulo: 'Facultad', campo: 'facultad'}, {titulo: 'Recurso', campo: 'recurso'}, {titulo: 'Categoria', campo: 'categoria'},
            {titulo: 'Estado', campo: 'estado'}, {titulo: 'Motivo', campo: 'motivo'}, {titulo: 'Solicitado el', campo: 'solicitadoEl'},
            {titulo: 'Entrega', campo: 'fechaEntrega'}, {titulo: 'Devolucion prevista', campo: 'fechaDevolucion'},
            {titulo: 'Devolucion real', campo: 'fechaDevolucionReal'}
        ]
        responderReporte(res, formato, 'reporte-prestamos', columnas, filas, {
            desde: desde ?? null, hasta: hasta ?? null, estado: estado ?? null, total: filas.length, prestamos: filas
        })
    }catch(error){
        res.status(500).json({msg: `Error al generar el reporte de prestamos - ${error}`})
    }
}

// HU-004: reporte de frecuencia de uso por recurso (?formato=csv para descargar)
const reporteRecursos = async (req, res) => {
    const {desde, hasta, formato} = req.query
    try{
        const filtro = {}
        const rango = rangoFechas(desde, hasta)
        if(rango) filtro.createdAt = rango
        const [recursos, prestamos] = await Promise.all([
            Recurso.find().select('nombre categoria estado').sort({nombre: 1}).lean(),
            Prestamo.find(filtro).select('recurso estado fechaEntrega').lean()
        ])
        const filas = recursos.map(r => {
            const suyos = prestamos.filter(p => String(p.recurso) === String(r._id))
            const entregas = suyos.filter(p => USADOS.includes(p.estado))
            const ultima = entregas.map(p => p.fechaEntrega).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] ?? null
            return {
                recurso: r.nombre, categoria: r.categoria, estado: r.estado,
                solicitudes: suyos.length, vecesPrestado: entregas.length, ultimaEntrega: ultima
            }
        }).sort((a, b) => b.vecesPrestado - a.vecesPrestado || a.recurso.localeCompare(b.recurso))
        const columnas = [
            {titulo: 'Recurso', campo: 'recurso'}, {titulo: 'Categoria', campo: 'categoria'}, {titulo: 'Estado actual', campo: 'estado'},
            {titulo: 'Solicitudes', campo: 'solicitudes'}, {titulo: 'Veces prestado', campo: 'vecesPrestado'}, {titulo: 'Ultima entrega', campo: 'ultimaEntrega'}
        ]
        responderReporte(res, formato, 'reporte-recursos', columnas, filas, {
            desde: desde ?? null, hasta: hasta ?? null, total: filas.length, recursos: filas
        })
    }catch(error){
        res.status(500).json({msg: `Error al generar el reporte de recursos - ${error}`})
    }
}

export {metricas, reportePrestamos, reporteRecursos}
