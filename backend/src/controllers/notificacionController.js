import Notificacion from '../models/Notificacion.js'
import Prestamo from '../models/Prestamo.js'
import {notificar, formatearFecha} from '../helpers/notificacionHelper.js'

const DIAS_AVISO = 2
const MS_DIA = 24 * 60 * 60 * 1000

const datosNotificacion = (n) => ({
    _id: n._id,
    tipo: n.tipo,
    mensaje: n.mensaje,
    leida: n.leida,
    prestamo: n.prestamo,
    createdAt: n.createdAt
})

// HU-010: avisos de fecha de devolucion. Se generan al consultar las notificaciones (una sola vez por prestamo y tipo):
// "recordatorio" cuando faltan DIAS_AVISO dias o menos y "vencido" cuando la fecha ya paso
const generarAvisosDevolucion = async (usuarioId) => {
    const entregados = await Prestamo.find({usuario: usuarioId, estado: 'entregado'}).populate('recurso', 'nombre')
    const ahora = Date.now()
    for(const prestamo of entregados){
        const diasRestantes = Math.ceil((new Date(prestamo.fechaDevolucion).getTime() - ahora) / MS_DIA)
        const tipo = diasRestantes < 0 ? 'vencido' : diasRestantes <= DIAS_AVISO ? 'recordatorio' : null
        if(!tipo) continue
        const yaAvisado = await Notificacion.exists({usuario: usuarioId, prestamo: prestamo._id, tipo})
        if(yaAvisado) continue
        const nombre = prestamo.recurso?.nombre ?? 'el recurso'
        const fecha = formatearFecha(prestamo.fechaDevolucion)
        const mensaje = tipo === 'vencido'
            ? `El plazo de devolucion de "${nombre}" vencio el ${fecha}. Devuelvelo lo antes posible.`
            : `Recuerda devolver "${nombre}" el ${fecha} (${diasRestantes <= 0 ? 'es hoy' : `faltan ${diasRestantes} dia(s)`}).`
        await notificar(usuarioId, tipo, mensaje, prestamo._id)
    }
}

// HU-010: consultar mis notificaciones (filtro opcional ?leida=false)
const misNotificaciones = async (req, res) => {
    const {leida} = req.query
    try{
        await generarAvisosDevolucion(req.usuarioHeader._id)
        const filtro = {usuario: req.usuarioHeader._id}
        if(leida !== undefined) filtro.leida = leida === 'true'
        const [notificaciones, noLeidas] = await Promise.all([
            Notificacion.find(filtro).sort({createdAt: -1}).limit(100),
            Notificacion.countDocuments({usuario: req.usuarioHeader._id, leida: false})
        ])
        res.status(200).json({total: notificaciones.length, noLeidas, notificaciones: notificaciones.map(datosNotificacion)})
    }catch(error){
        res.status(500).json({msg: `Error al consultar las notificaciones - ${error}`})
    }
}

// HU-010: marcar una notificacion como leida
const marcarLeida = async (req, res) => {
    try{
        const notificacion = await Notificacion.findOne({_id: req.params.id, usuario: req.usuarioHeader._id})
        if(!notificacion){
            return res.status(404).json({msg: 'Notificacion no encontrada'})
        }
        notificacion.leida = true
        await notificacion.save()
        res.status(200).json({msg: 'Notificacion marcada como leida', notificacion: datosNotificacion(notificacion)})
    }catch(error){
        res.status(500).json({msg: `Error al actualizar la notificacion - ${error}`})
    }
}

// HU-010: marcar todas mis notificaciones como leidas
const marcarTodasLeidas = async (req, res) => {
    try{
        const resultado = await Notificacion.updateMany({usuario: req.usuarioHeader._id, leida: false}, {leida: true})
        res.status(200).json({msg: 'Notificaciones marcadas como leidas', modificadas: resultado.modifiedCount})
    }catch(error){
        res.status(500).json({msg: `Error al actualizar las notificaciones - ${error}`})
    }
}

export {misNotificaciones, marcarLeida, marcarTodasLeidas}
