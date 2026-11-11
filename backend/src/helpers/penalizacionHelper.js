import Penalizacion from '../models/Penalizacion.js'
import Prestamo from '../models/Prestamo.js'
import {calcularAtraso} from './politicasHelper.js'

const redondear = (x) => Math.round(x * 100) / 100
const sumar = (lista, campo) => redondear(lista.reduce((s, item) => s + (Number(item[campo]) || 0), 0))
const formatoDolares = (monto) => `$${(Number(monto) || 0).toFixed(2)}`

// suma de las penalizaciones pendientes del estudiante (bloquean nuevas solicitudes)
const totalPendiente = async (usuarioId) => {
    const pendientes = await Penalizacion.find({usuario: usuarioId, estado: 'pendiente'}).select('monto').lean()
    return sumar(pendientes, 'monto')
}

// prestamos entregados con la fecha de devolucion vencida: el atraso se calcula al vuelo (no se guarda)
const atrasosEnCurso = async (usuarioId, ahora = new Date()) => {
    const vencidos = await Prestamo.find({usuario: usuarioId, estado: 'entregado', fechaDevolucion: {$lt: ahora}})
        .populate('recurso', 'nombre precio')
        .lean()
    return vencidos.map(p => {
        const {dias, monto} = calcularAtraso(p.fechaDevolucion, ahora, p.recurso?.precio)
        return {
            prestamo: p._id,
            recurso: {_id: p.recurso?._id ?? null, nombre: p.recurso?.nombre ?? 'Recurso eliminado'},
            diasAtraso: dias,
            montoAcumulado: monto
        }
    })
}

// resumen de lo que debe el estudiante (lo usan GET /api/penalizaciones/mis y el asistente)
const resumenPenalizaciones = async (usuarioId, ahora = new Date()) => {
    const [totalAdeudado, atrasoEnCurso] = await Promise.all([totalPendiente(usuarioId), atrasosEnCurso(usuarioId, ahora)])
    return {totalAdeudado, totalAtrasoEnCurso: sumar(atrasoEnCurso, 'montoAcumulado'), atrasoEnCurso}
}

export {redondear, sumar, formatoDolares, totalPendiente, atrasosEnCurso, resumenPenalizaciones}
