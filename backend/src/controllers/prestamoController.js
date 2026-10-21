import Prestamo, {ESTADOS_PRESTAMO} from '../models/Prestamo.js'
import Recurso from '../models/Recurso.js'
import {generarCodigoQR, generarImagenQR} from '../helpers/qrHelper.js'

const CAMPOS_USUARIO = 'nombres apellidos cedula correo facultad'
const CAMPOS_RECURSO = 'nombre categoria estado imagen'

// datos del prestamo que se envian al cliente (nunca se expone el codigo del QR)
const datosPrestamo = (p) => ({
    _id: p._id,
    estado: p.estado,
    motivo: p.motivo,
    fechaDevolucion: p.fechaDevolucion,
    fechaEntrega: p.fechaEntrega,
    fechaDevolucionReal: p.fechaDevolucionReal,
    motivoRechazo: p.motivoRechazo,
    usuario: p.usuario,
    recurso: p.recurso,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
})

const esDelUsuario = (prestamo, usuario) => String(prestamo.usuario?._id ?? prestamo.usuario) === String(usuario._id)

// HU-007: solicitar un prestamo
const solicitarPrestamo = async (req, res) => {
    const {recursoId, fechaDevolucion, motivo} = req.body
    try{
        const recurso = await Recurso.findById(recursoId)
        if(!recurso){
            return res.status(404).json({msg: 'Recurso no encontrado'})
        }
        if(recurso.estado !== 'disponible'){
            return res.status(400).json({msg: 'El recurso no esta disponible'})
        }
        const activa = await Prestamo.findOne({
            usuario: req.usuarioHeader._id,
            recurso: recurso._id,
            estado: {$in: ['pendiente', 'aprobado', 'entregado']}
        })
        if(activa){
            return res.status(400).json({msg: 'Ya tienes una solicitud activa para este recurso'})
        }
        const prestamo = await Prestamo.create({
            usuario: req.usuarioHeader._id,
            recurso: recurso._id,
            fechaDevolucion: new Date(fechaDevolucion),
            motivo: motivo?.trim()
        })
        res.status(201).json({msg: 'Solicitud de prestamo enviada correctamente', prestamo: datosPrestamo(prestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al solicitar el prestamo - ${error}`})
    }
}

// HU-007: consultar las solicitudes del estudiante
const misPrestamos = async (req, res) => {
    const {estado} = req.query
    try{
        const filtro = {usuario: req.usuarioHeader._id}
        if(estado !== undefined){
            if(typeof estado !== 'string' || !ESTADOS_PRESTAMO.includes(estado)){
                return res.status(400).json({msg: 'Estado no valido'})
            }
            filtro.estado = estado
        }
        const prestamos = await Prestamo.find(filtro).populate('recurso', CAMPOS_RECURSO).sort({createdAt: -1})
        res.status(200).json({total: prestamos.length, prestamos: prestamos.map(datosPrestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al consultar tus solicitudes - ${error}`})
    }
}

// HU-007: cancelar una solicitud pendiente o aprobada
const cancelarPrestamo = async (req, res) => {
    try{
        const prestamo = await Prestamo.findById(req.params.id)
        if(!prestamo || !esDelUsuario(prestamo, req.usuarioHeader)){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        if(!['pendiente', 'aprobado'].includes(prestamo.estado)){
            return res.status(400).json({msg: `No se puede cancelar una solicitud ${prestamo.estado}`})
        }
        prestamo.estado = 'cancelado'
        prestamo.codigoQR = undefined
        await prestamo.save()
        res.status(200).json({msg: 'Solicitud cancelada correctamente', prestamo: datosPrestamo(prestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al cancelar la solicitud - ${error}`})
    }
}

// HU-003: el administrador consulta las solicitudes (por defecto todas; filtro opcional ?estado=pendiente)
const listarPrestamos = async (req, res) => {
    const {estado} = req.query
    try{
        const filtro = {}
        if(estado !== undefined){
            if(typeof estado !== 'string' || !ESTADOS_PRESTAMO.includes(estado)){
                return res.status(400).json({msg: 'Estado no valido'})
            }
            filtro.estado = estado
        }
        const prestamos = await Prestamo.find(filtro)
            .populate('usuario', CAMPOS_USUARIO)
            .populate('recurso', CAMPOS_RECURSO)
            .sort({createdAt: -1})
        res.status(200).json({total: prestamos.length, prestamos: prestamos.map(datosPrestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al listar las solicitudes - ${error}`})
    }
}

// HU-003: aprobar una solicitud y generar su QR
const aprobarPrestamo = async (req, res) => {
    try{
        const prestamo = await Prestamo.findById(req.params.id)
        if(!prestamo){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        if(prestamo.estado !== 'pendiente'){
            return res.status(400).json({msg: `No se puede aprobar una solicitud ${prestamo.estado}`})
        }
        const recurso = await Recurso.findById(prestamo.recurso)
        if(!recurso || recurso.estado !== 'disponible'){
            return res.status(400).json({msg: 'El recurso ya no esta disponible'})
        }
        const ocupado = await Prestamo.exists({recurso: prestamo.recurso, estado: {$in: ['aprobado', 'entregado']}})
        if(ocupado){
            return res.status(400).json({msg: 'El recurso ya tiene otra solicitud aprobada'})
        }
        prestamo.estado = 'aprobado'
        prestamo.codigoQR = generarCodigoQR()
        prestamo.aprobadoPor = req.usuarioHeader._id
        await prestamo.save()
        const qr = await generarImagenQR(prestamo.codigoQR)
        res.status(200).json({msg: 'Solicitud aprobada correctamente', prestamo: datosPrestamo(prestamo), qr})
    }catch(error){
        res.status(500).json({msg: `Error al aprobar la solicitud - ${error}`})
    }
}

// HU-003: rechazar una solicitud
const rechazarPrestamo = async (req, res) => {
    const {motivo} = req.body
    try{
        const prestamo = await Prestamo.findById(req.params.id)
        if(!prestamo){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        if(prestamo.estado !== 'pendiente'){
            return res.status(400).json({msg: `No se puede rechazar una solicitud ${prestamo.estado}`})
        }
        prestamo.estado = 'rechazado'
        prestamo.motivoRechazo = motivo?.trim() ?? ''
        await prestamo.save()
        res.status(200).json({msg: 'Solicitud rechazada correctamente', prestamo: datosPrestamo(prestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al rechazar la solicitud - ${error}`})
    }
}

// QR de una solicitud aprobada o entregada (lo ve el estudiante dueño o el administrador)
const verQR = async (req, res) => {
    try{
        const prestamo = await Prestamo.findById(req.params.id)
        const esAdmin = req.usuarioHeader.rol === 'administrador'
        if(!prestamo || (!esAdmin && !esDelUsuario(prestamo, req.usuarioHeader))){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        if(!['aprobado', 'entregado'].includes(prestamo.estado) || !prestamo.codigoQR){
            return res.status(400).json({msg: 'La solicitud no tiene un QR disponible'})
        }
        const qr = await generarImagenQR(prestamo.codigoQR)
        res.status(200).json({estado: prestamo.estado, qr})
    }catch(error){
        res.status(500).json({msg: `Error al generar el QR - ${error}`})
    }
}

// HU-003: escanear el QR. Aprobado -> entrega (recurso prestado); entregado -> devolucion (recurso disponible)
const escanearQR = async (req, res) => {
    const {codigo} = req.body
    try{
        const prestamo = await Prestamo.findOne({codigoQR: codigo.toLowerCase()})
        if(!prestamo){
            return res.status(404).json({msg: 'Codigo QR no valido'})
        }
        const recurso = await Recurso.findById(prestamo.recurso)
        if(!recurso){
            return res.status(404).json({msg: 'El recurso de esta solicitud ya no existe'})
        }
        let accion
        if(prestamo.estado === 'aprobado'){
            if(recurso.estado !== 'disponible'){
                return res.status(400).json({msg: 'El recurso no esta disponible para la entrega'})
            }
            prestamo.estado = 'entregado'
            prestamo.fechaEntrega = new Date()
            recurso.estado = 'prestado'
            accion = 'entrega'
        }else if(prestamo.estado === 'entregado'){
            prestamo.estado = 'devuelto'
            prestamo.fechaDevolucionReal = new Date()
            prestamo.codigoQR = undefined
            recurso.estado = 'disponible'
            accion = 'devolucion'
        }else{
            return res.status(400).json({msg: `La solicitud esta ${prestamo.estado}`})
        }
        await prestamo.save()
        await recurso.save()
        res.status(200).json({
            msg: accion === 'entrega' ? 'Entrega registrada correctamente' : 'Devolucion registrada correctamente',
            accion,
            prestamo: datosPrestamo(prestamo),
            recurso: {_id: recurso._id, nombre: recurso.nombre, estado: recurso.estado}
        })
    }catch(error){
        res.status(500).json({msg: `Error al procesar el QR - ${error}`})
    }
}

export {solicitarPrestamo, misPrestamos, cancelarPrestamo, listarPrestamos, aprobarPrestamo, rechazarPrestamo, verQR, escanearQR}