// Recordatorios automaticos de devolucion (sin dependencias nuevas).
// Busca prestamos entregados cuya devolucion vence dentro de las proximas RECORDATORIO_HORAS_ANTES horas
// (por defecto 24 y 1) y avisa al estudiante con una notificacion de tipo "recordatorio".
// Sin duplicados: cada prestamo guarda en recordatoriosEnviados las horas ya avisadas y se marca con una
// actualizacion condicional ANTES de notificar (si dos ejecuciones coinciden, solo una gana).
import Prestamo from '../models/Prestamo.js'
import {notificar} from './notificacionHelper.js'
import {horasRecordatorio, intervaloRecordatorioMin, formatearFechaHora} from './politicasHelper.js'

const MS_HORA = 60 * 60 * 1000

/**
 * Envia los recordatorios que correspondan en este momento.
 * @param {Date} ahora
 * @returns {Promise<number>} cantidad de recordatorios enviados
 */
const enviarRecordatorios = async (ahora = new Date()) => {
    const horas = horasRecordatorio()
    const instante = new Date(ahora).getTime()
    const prestamos = await Prestamo.find({
        estado: 'entregado',
        fechaDevolucion: {$gt: new Date(instante), $lte: new Date(instante + Math.max(...horas) * MS_HORA)}
    }).populate('recurso', 'nombre').lean()

    let enviados = 0
    for(const prestamo of prestamos){
        const faltan = (new Date(prestamo.fechaDevolucion).getTime() - instante) / MS_HORA
        const yaEnviadas = prestamo.recordatoriosEnviados ?? []
        // umbrales alcanzados (p. ej. faltan 0.5 h: 24 y 1). Se envia un solo aviso y se marcan todos
        const alcanzadas = horas.filter(h => faltan <= h)
        const pendientes = alcanzadas.filter(h => !yaEnviadas.includes(h))
        if(!pendientes.length) continue
        const menor = Math.min(...pendientes)
        const marcado = await Prestamo.updateOne(
            {_id: prestamo._id, estado: 'entregado', recordatoriosEnviados: {$ne: menor}},
            {$addToSet: {recordatoriosEnviados: {$each: alcanzadas}}}
        )
        if(!marcado?.modifiedCount) continue
        const [dia, hora] = formatearFechaHora(prestamo.fechaDevolucion).split(' ')
        await notificar(prestamo.usuario, 'recordatorio', `Recuerda devolver ${prestamo.recurso?.nombre ?? 'el recurso'} el ${dia} a las ${hora}`, prestamo._id)
        enviados += 1
    }
    return enviados
}

let ultimaEjecucion = 0
let enCurso = false

// ejecuta enviarRecordatorios como mucho una vez por intervalo; un fallo nunca se propaga
const ejecutarSiCorresponde = async (ahora = new Date()) => {
    const instante = new Date(ahora).getTime()
    if(enCurso || instante - ultimaEjecucion < intervaloRecordatorioMin() * 60 * 1000) return 0
    enCurso = true
    ultimaEjecucion = instante
    try{
        return await enviarRecordatorios(ahora)
    }catch(error){
        console.error(`No se pudieron enviar los recordatorios: ${error.message}`)
        return 0
    }finally{
        enCurso = false
    }
}

// al iniciar el servidor: una ejecucion inmediata y luego cada RECORDATORIO_INTERVALO_MIN minutos
const iniciarRecordatorios = () => {
    if(process.env.NODE_ENV === 'test') return null
    ejecutarSiCorresponde()
    const temporizador = setInterval(() => {
        ejecutarSiCorresponde()
    }, intervaloRecordatorioMin() * 60 * 1000)
    temporizador.unref()
    return temporizador
}

// Render duerme el servicio del plan gratuito y el setInterval se detiene: cada peticion entrante
// dispara una revision (como mucho una por intervalo) sin esperar el resultado ni bloquear la respuesta
const recordatoriosOportunistas = (req, res, next) => {
    if(process.env.NODE_ENV !== 'test') ejecutarSiCorresponde().catch(() => {})
    next()
}

// solo para pruebas: olvida la ultima ejecucion
const reiniciarRecordatorios = () => {
    ultimaEjecucion = 0
    enCurso = false
}

export {enviarRecordatorios, ejecutarSiCorresponde, iniciarRecordatorios, recordatoriosOportunistas, reiniciarRecordatorios}
