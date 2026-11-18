import Penalizacion, {ESTADOS_DEUDA} from '../models/Penalizacion.js'
import Prestamo from '../models/Prestamo.js'
import {calcularAtraso} from './politicasHelper.js'

const redondear = (x) => Math.round(x * 100) / 100
const sumar = (lista, campo) => redondear(lista.reduce((s, item) => s + (Number(item[campo]) || 0), 0))
const formatoDolares = (monto) => `$${(Number(monto) || 0).toFixed(2)}`

// deuda del estudiante: penalizaciones pendientes y en revision (el comprobante aun no se confirma).
// total = las dos juntas (bloquean nuevas solicitudes); enRevision = la parte que el administrador esta verificando
const deudaPenalizaciones = async (usuarioId) => {
    const deudas = await Penalizacion.find({usuario: usuarioId, estado: {$in: ESTADOS_DEUDA}}).select('monto estado').lean()
    return {total: sumar(deudas, 'monto'), enRevision: sumar(deudas.filter(p => p.estado === 'en_revision'), 'monto')}
}

// suma de lo que el estudiante adeuda (pendientes + en revision)
const totalPendiente = async (usuarioId) => (await deudaPenalizaciones(usuarioId)).total

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
    const [deuda, atrasoEnCurso] = await Promise.all([deudaPenalizaciones(usuarioId), atrasosEnCurso(usuarioId, ahora)])
    return {totalAdeudado: deuda.total, totalEnRevision: deuda.enRevision, totalAtrasoEnCurso: sumar(atrasoEnCurso, 'montoAcumulado'), atrasoEnCurso}
}

export {redondear, sumar, formatoDolares, deudaPenalizaciones, totalPendiente, atrasosEnCurso, resumenPenalizaciones}
