import Prestamo from '../models/Prestamo.js'
import Recurso from '../models/Recurso.js'
import Usuario from '../models/Usuario.js'
import Penalizacion from '../models/Penalizacion.js'
import {aCSV, rangoFechas} from '../helpers/reporteHelper.js'
import {recursosParaReponer, resumenPenalizaciones} from '../helpers/metricasHelper.js'

const redondear = (x) => Math.round(x * 100) / 100
// suma de las penalizaciones agrupadas por la clave indicada (prestamo o recurso)
const sumarPor = (penalizaciones, clave) => penalizaciones.reduce((acc, p) => {
    const k = String(p[clave])
    acc.set(k, redondear((acc.get(k) ?? 0) + (Number(p.monto) || 0)))
    return acc
}, new Map())

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
        const [recursos, prestamos, estudiantes, penalizaciones] = await Promise.all([
            Recurso.find().select('nombre categoria estado').lean(),
            Prestamo.find().select('recurso estado createdAt fechaEntrega fechaDevolucion fechaDevolucionReal devolucion.condicion').lean(),
            Usuario.countDocuments({rol: 'estudiante'}),
            Penalizacion.find().select('tipo estado monto').lean()
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
            masPrestados,
            penalizaciones: resumenPenalizaciones(penalizaciones),
            // recursos con alta demanda, danos, perdidas o en mantenimiento: candidatos a reponer o ampliar inventario
            recursosParaReponer: recursosParaReponer(recursos, prestamos, new Date(ahora))
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
        // una sola consulta para las penalizaciones de todos los prestamos del reporte
        const penalizaciones = prestamos.length
            ? await Penalizacion.find({prestamo: {$in: prestamos.map(p => p._id)}}).select('prestamo monto estado').lean()
            : []
        const penalizadoPorPrestamo = sumarPor(penalizaciones.filter(p => p.estado !== 'anulada'), 'prestamo')
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
            fechaDevolucionReal: p.fechaDevolucionReal,
            docente: p.docenteReferencia?.nombre ?? '',
            correoDocente: p.docenteReferencia?.correo ?? '',
            telefonoDocente: p.docenteReferencia?.telefono ?? '',
            entregadoPor: p.entrega?.responsableNombre ?? '',
            recibidoPor: p.devolucion?.responsableNombre ?? '',
            condicion: p.devolucion?.condicion ?? '',
            evidenciaEntrega: p.entrega?.evidencia?.url ?? '',
            evidenciaDevolucion: p.devolucion?.evidencia?.url ?? '',
            penalizacionTotal: penalizadoPorPrestamo.get(String(p._id)) ?? 0
        }))
        const columnas = [
            {titulo: 'Estudiante', campo: 'estudiante'}, {titulo: 'Cedula', campo: 'cedula'}, {titulo: 'Correo', campo: 'correo'},
            {titulo: 'Facultad', campo: 'facultad'}, {titulo: 'Recurso', campo: 'recurso'}, {titulo: 'Categoria', campo: 'categoria'},
            {titulo: 'Estado', campo: 'estado'}, {titulo: 'Motivo', campo: 'motivo'}, {titulo: 'Solicitado el', campo: 'solicitadoEl'},
            {titulo: 'Entrega', campo: 'fechaEntrega'}, {titulo: 'Devolucion prevista', campo: 'fechaDevolucion'},
            {titulo: 'Devolucion real', campo: 'fechaDevolucionReal'},
            {titulo: 'Docente de referencia', campo: 'docente'}, {titulo: 'Correo del docente', campo: 'correoDocente'},
            {titulo: 'Telefono del docente', campo: 'telefonoDocente'}, {titulo: 'Entregado por', campo: 'entregadoPor'},
            {titulo: 'Recibido por', campo: 'recibidoPor'}, {titulo: 'Condicion al devolver', campo: 'condicion'},
            {titulo: 'Evidencia de entrega', campo: 'evidenciaEntrega'}, {titulo: 'Evidencia de devolucion', campo: 'evidenciaDevolucion'},
            {titulo: 'Penalizacion total', campo: 'penalizacionTotal'}
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
            Recurso.find().select('nombre categoria estado precio').sort({nombre: 1}).lean(),
            Prestamo.find(filtro).select('recurso estado fechaEntrega devolucion.condicion').lean()
        ])
        const penalizaciones = prestamos.length
            ? await Penalizacion.find({prestamo: {$in: prestamos.map(p => p._id)}, estado: {$ne: 'anulada'}}).select('recurso monto').lean()
            : []
        const penalizadoPorRecurso = sumarPor(penalizaciones, 'recurso')
        const filas = recursos.map(r => {
            const suyos = prestamos.filter(p => String(p.recurso) === String(r._id))
            const entregas = suyos.filter(p => USADOS.includes(p.estado))
            const ultima = entregas.map(p => p.fechaEntrega).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] ?? null
            return {
                recurso: r.nombre, categoria: r.categoria, estado: r.estado, precio: r.precio ?? 0,
                solicitudes: suyos.length, vecesPrestado: entregas.length, ultimaEntrega: ultima,
                incidentes: suyos.filter(p => p.estado === 'devuelto' && p.devolucion?.condicion && p.devolucion.condicion !== 'bueno').length,
                penalizado: penalizadoPorRecurso.get(String(r._id)) ?? 0
            }
        }).sort((a, b) => b.vecesPrestado - a.vecesPrestado || a.recurso.localeCompare(b.recurso))
        const columnas = [
            {titulo: 'Recurso', campo: 'recurso'}, {titulo: 'Categoria', campo: 'categoria'}, {titulo: 'Estado actual', campo: 'estado'},
            {titulo: 'Precio', campo: 'precio'}, {titulo: 'Solicitudes', campo: 'solicitudes'}, {titulo: 'Veces prestado', campo: 'vecesPrestado'},
            {titulo: 'Ultima entrega', campo: 'ultimaEntrega'}, {titulo: 'Devoluciones con incidente', campo: 'incidentes'},
            {titulo: 'Penalizado', campo: 'penalizado'}
        ]
        responderReporte(res, formato, 'reporte-recursos', columnas, filas, {
            desde: desde ?? null, hasta: hasta ?? null, total: filas.length, recursos: filas
        })
    }catch(error){
        res.status(500).json({msg: `Error al generar el reporte de recursos - ${error}`})
    }
}

const TIPOS_TEXTO = {atraso: 'Atraso', danio: 'Dano o incompleto', perdida: 'Perdida'}

// reporte de penalizaciones (filtros opcionales ?desde ?hasta ?estado; ?formato=csv para descargar)
const reportePenalizaciones = async (req, res) => {
    const {desde, hasta, estado, formato} = req.query
    try{
        const filtro = {}
        const rango = rangoFechas(desde, hasta)
        if(rango) filtro.createdAt = rango
        if(estado) filtro.estado = estado
        const penalizaciones = await Penalizacion.find(filtro)
            .populate('usuario', 'nombres apellidos cedula correo')
            .populate('recurso', 'nombre')
            .sort({createdAt: -1})
            .lean()
        const filas = penalizaciones.map(p => ({
            estudiante: p.usuario ? `${p.usuario.nombres} ${p.usuario.apellidos}` : 'Usuario eliminado',
            cedula: p.usuario?.cedula ?? '',
            correo: p.usuario?.correo ?? '',
            recurso: p.recurso?.nombre ?? 'Recurso eliminado',
            tipo: TIPOS_TEXTO[p.tipo] ?? p.tipo,
            monto: p.monto,
            dias: p.dias ?? '',
            estado: p.estado,
            registradaEl: p.createdAt,
            fechaPago: p.fechaPago,
            motivoAnulacion: p.motivoAnulacion ?? ''
        }))
        const columnas = [
            {titulo: 'Estudiante', campo: 'estudiante'}, {titulo: 'Cedula', campo: 'cedula'}, {titulo: 'Correo', campo: 'correo'},
            {titulo: 'Recurso', campo: 'recurso'}, {titulo: 'Tipo', campo: 'tipo'}, {titulo: 'Monto', campo: 'monto'},
            {titulo: 'Dias', campo: 'dias'}, {titulo: 'Estado', campo: 'estado'}, {titulo: 'Registrada el', campo: 'registradaEl'},
            {titulo: 'Fecha de pago', campo: 'fechaPago'}, {titulo: 'Motivo de anulacion', campo: 'motivoAnulacion'}
        ]
        responderReporte(res, formato, 'reporte-penalizaciones', columnas, filas, {
            desde: desde ?? null, hasta: hasta ?? null, estado: estado ?? null, total: filas.length,
            totalMonto: redondear(penalizaciones.filter(p => p.estado !== 'anulada').reduce((s, p) => s + (Number(p.monto) || 0), 0)),
            penalizaciones: filas
        })
    }catch(error){
        res.status(500).json({msg: `Error al generar el reporte de penalizaciones - ${error}`})
    }
}

export {metricas, reportePrestamos, reporteRecursos, reportePenalizaciones}
