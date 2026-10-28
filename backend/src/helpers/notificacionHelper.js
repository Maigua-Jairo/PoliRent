import Notificacion from '../models/Notificacion.js'
import Usuario from '../models/Usuario.js'
import {correoConfigurado, enviarCorreoNotificacion} from '../config/mailer.js'

const ASUNTOS = {
    solicitud_nueva: 'Nueva solicitud de prestamo',
    aprobado: 'Solicitud aprobada',
    rechazado: 'Solicitud rechazada',
    entregado: 'Recurso entregado',
    devuelto: 'Recurso devuelto',
    recordatorio: 'Recordatorio de devolucion',
    vencido: 'Devolucion vencida'
}

const formatearFecha = (fecha) => new Date(fecha).toLocaleDateString('es-EC', {timeZone: 'America/Guayaquil'})

// guarda la notificacion y, si el SMTP esta configurado, tambien la envia al correo institucional.
// Nunca lanza error: un fallo de notificacion no debe romper la accion principal (aprobar, entregar, etc.)
const notificar = async (usuarioId, tipo, mensaje, prestamoId) => {
    try{
        const notificacion = await Notificacion.create({usuario: usuarioId, prestamo: prestamoId, tipo, mensaje})
        if(correoConfigurado() && process.env.NODE_ENV !== 'test'){
            const usuario = await Usuario.findById(usuarioId).select('correo nombres')
            if(usuario) await enviarCorreoNotificacion(usuario, ASUNTOS[tipo], mensaje)
        }
        return notificacion
    }catch(error){
        console.error(`No se pudo generar la notificacion (${tipo}): ${error.message}`)
        return null
    }
}

// avisa a todos los administradores (por ejemplo, cuando llega una solicitud nueva)
const notificarAdministradores = async (tipo, mensaje, prestamoId) => {
    try{
        const administradores = await Usuario.find({rol: 'administrador'}).select('_id')
        await Promise.all(administradores.map(a => notificar(a._id, tipo, mensaje, prestamoId)))
    }catch(error){
        console.error(`No se pudo notificar a los administradores: ${error.message}`)
    }
}

export {notificar, notificarAdministradores, formatearFecha}
