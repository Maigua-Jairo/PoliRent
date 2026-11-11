import Prestamo, {ESTADOS_PRESTAMO, ESTADOS_ACTIVOS, mensajePrestamoActivo} from '../models/Prestamo.js'
import Recurso from '../models/Recurso.js'
import Penalizacion from '../models/Penalizacion.js'
import {generarCodigoQR, generarImagenQR} from '../helpers/qrHelper.js'
import {notificar, notificarAdministradores, formatearFecha} from '../helpers/notificacionHelper.js'
import {rangoFechas} from '../helpers/reporteHelper.js'
import {TERMINOS_VERSION, horarioActivo, dentroDeHorario, mensajeHorario, calcularPenalizaciones} from '../helpers/politicasHelper.js'
import {totalPendiente, formatoDolares} from '../helpers/penalizacionHelper.js'
import {cloudinaryConfigurado, subirImagen, eliminarImagen} from '../config/cloudinary.js'

const CAMPOS_USUARIO = 'nombres apellidos cedula correo facultad'
const CAMPOS_RECURSO = 'nombre categoria estado imagen precio'
const MSG_SIN_CLOUDINARY = 'La subida de imagenes no esta disponible: falta configurar Cloudinary'
const CONDICIONES_CON_EVIDENCIA = ['danado', 'incompleto']

// entrega o devolucion registrada (sin el publicId de la evidencia en cloudinary)
const datosMovimiento = (m) => {
    if(!m?.responsableNombre) return null
    return {
        responsable: m.responsable,
        responsableNombre: m.responsableNombre,
        observaciones: m.observaciones ?? '',
        ...(m.condicion ? {condicion: m.condicion} : {}),
        evidencia: m.evidencia?.url ? {url: m.evidencia.url} : null
    }
}

// datos del prestamo que se envian al cliente (nunca se expone el codigo del QR)
const datosPrestamo = (p) => ({
    _id: p._id,
    estado: p.estado,
    motivo: p.motivo,
    fechaDevolucion: p.fechaDevolucion,
    fechaEntrega: p.fechaEntrega,
    fechaDevolucionReal: p.fechaDevolucionReal,
    motivoRechazo: p.motivoRechazo,
    terminos: p.terminos?.version ? {version: p.terminos.version, aceptadoEn: p.terminos.aceptadoEn} : null,
    docenteReferencia: p.docenteReferencia?.nombre
        ? {nombre: p.docenteReferencia.nombre, correo: p.docenteReferencia.correo, telefono: p.docenteReferencia.telefono ?? ''}
        : null,
    entrega: datosMovimiento(p.entrega),
    devolucion: datosMovimiento(p.devolucion),
    usuario: p.usuario,
    recurso: p.recurso,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
})

const esDelUsuario = (prestamo, usuario) => String(prestamo.usuario?._id ?? prestamo.usuario) === String(usuario._id)

// HU-007: solicitar un prestamo (la fecha ya llega normalizada por validarSolicitudPrestamo)
const solicitarPrestamo = async (req, res) => {
    const {recursoId, fechaDevolucion, motivo, docenteReferencia} = req.body
    try{
        const recurso = await Recurso.findById(recursoId)
        if(!recurso){
            return res.status(404).json({msg: 'Recurso no encontrado'})
        }
        // un solo prestamo a la vez: cualquier solicitud pendiente, aprobada o entregada bloquea otra nueva
        const activa = await Prestamo.findOne({
            usuario: req.usuarioHeader._id,
            estado: {$in: ESTADOS_ACTIVOS}
        }).populate('recurso', 'nombre')
        if(activa){
            return res.status(400).json({msg: mensajePrestamoActivo(activa.estado, activa.recurso?.nombre)})
        }
        // con penalizaciones pendientes no puede solicitar otro recurso
        const deuda = await totalPendiente(req.usuarioHeader._id)
        if(deuda > 0){
            return res.status(400).json({msg: `Tienes penalizaciones pendientes por ${formatoDolares(deuda)}. Regularizalas con la asociacion antes de solicitar otro recurso`})
        }
        if(recurso.estado !== 'disponible'){
            return res.status(400).json({msg: 'El recurso no esta disponible'})
        }
        const prestamo = await Prestamo.create({
            usuario: req.usuarioHeader._id,
            recurso: recurso._id,
            fechaDevolucion: new Date(fechaDevolucion),
            motivo: motivo?.trim(),
            terminos: {version: TERMINOS_VERSION, aceptadoEn: new Date()},
            docenteReferencia: {
                nombre: docenteReferencia.nombre.trim(),
                correo: docenteReferencia.correo.trim().toLowerCase(),
                telefono: typeof docenteReferencia.telefono === 'string' ? docenteReferencia.telefono.trim() : ''
            }
        })
        // HU-010: se avisa a los administradores que hay una solicitud pendiente de revision
        notificarAdministradores('solicitud_nueva', `${req.usuarioHeader.nombres} ${req.usuarioHeader.apellidos} solicito "${recurso.nombre}".`, prestamo._id)
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

// detalle de un prestamo (lo ve su dueño o el administrador; solo el administrador recibe los datos del estudiante)
const detallePrestamo = async (req, res) => {
    try{
        const esAdmin = req.usuarioHeader.rol === 'administrador'
        let consulta = Prestamo.findById(req.params.id).populate('recurso', CAMPOS_RECURSO)
        if(esAdmin) consulta = consulta.populate('usuario', CAMPOS_USUARIO)
        const prestamo = await consulta
        if(!prestamo || (!esAdmin && !esDelUsuario(prestamo, req.usuarioHeader))){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        res.status(200).json({prestamo: datosPrestamo(prestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al consultar la solicitud - ${error}`})
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

// HU-008: historial de solicitudes del estudiante (filtros opcionales ?estado ?desde ?hasta) con un resumen por estado
const historialPrestamos = async (req, res) => {
    const {estado, desde, hasta} = req.query
    try{
        const filtro = {usuario: req.usuarioHeader._id}
        if(estado) filtro.estado = estado
        const rango = rangoFechas(desde, hasta)
        if(rango) filtro.createdAt = rango
        const prestamos = await Prestamo.find(filtro).populate('recurso', CAMPOS_RECURSO).sort({createdAt: -1})
        const resumen = Object.fromEntries(ESTADOS_PRESTAMO.map(e => [e, prestamos.filter(p => p.estado === e).length]))
        res.status(200).json({total: prestamos.length, resumen, prestamos: prestamos.map(datosPrestamo)})
    }catch(error){
        res.status(500).json({msg: `Error al consultar tu historial - ${error}`})
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
        notificar(prestamo.usuario, 'aprobado', `Tu solicitud de "${recurso.nombre}" fue aprobada. Coordina el retiro del recurso con la asociacion estudiantil.`, prestamo._id)
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
        const recurso = await Recurso.findById(prestamo.recurso).select('nombre')
        notificar(prestamo.usuario, 'rechazado', `Tu solicitud de "${recurso?.nombre ?? 'el recurso'}" fue rechazada.${prestamo.motivoRechazo ? ` Motivo: ${prestamo.motivoRechazo}` : ''}`, prestamo._id)
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

const MSG_ESTADO_ESPERADO = {
    entrega: (estado) => `Solo se puede registrar la entrega de una solicitud aprobada (la solicitud esta ${estado})`,
    devolucion: (estado) => `Solo se puede registrar la devolucion de un prestamo entregado (la solicitud esta ${estado})`
}

// HU-003: registra la entrega (aprobado -> entregado) o la devolucion (entregado -> devuelto) de un prestamo.
// La comparten el escaneo del QR y las rutas por id. `esperada` es 'entrega', 'devolucion' o null (QR: segun el estado)
const registrarMovimiento = async (req, res, prestamo, esperada = null) => {
    const accion = prestamo.estado === 'aprobado' ? 'entrega' : prestamo.estado === 'entregado' ? 'devolucion' : null
    if(esperada && accion !== esperada){
        return res.status(400).json({msg: MSG_ESTADO_ESPERADO[esperada](prestamo.estado)})
    }
    if(!accion){
        return res.status(400).json({msg: `La solicitud esta ${prestamo.estado}`})
    }
    const condicion = accion === 'devolucion' ? (req.body.condicion || 'bueno') : null
    if(CONDICIONES_CON_EVIDENCIA.includes(condicion) && !req.file){
        return res.status(400).json({msg: 'Adjunta una foto de evidencia del estado del recurso'})
    }
    // declarar una perdida no es una entrega fisica: no se valida el horario
    if(horarioActivo() && condicion !== 'perdido' && !dentroDeHorario(new Date())){
        return res.status(400).json({msg: mensajeHorario()})
    }
    const recurso = await Recurso.findById(prestamo.recurso)
    if(!recurso){
        return res.status(404).json({msg: 'El recurso de esta solicitud ya no existe'})
    }
    if(accion === 'entrega' && recurso.estado !== 'disponible'){
        return res.status(400).json({msg: 'El recurso no esta disponible para la entrega'})
    }
    if(req.file && !cloudinaryConfigurado()){
        return res.status(503).json({msg: MSG_SIN_CLOUDINARY})
    }

    let evidencia = null
    try{
        if(req.file) evidencia = await subirImagen(req.file.buffer, 'polirent/evidencias')
        const admin = req.usuarioHeader
        const responsable = typeof req.body.responsable === 'string' ? req.body.responsable.trim() : ''
        const movimiento = {
            responsable: admin._id,
            responsableNombre: responsable || `${admin.nombres} ${admin.apellidos}`,
            observaciones: typeof req.body.observaciones === 'string' ? req.body.observaciones.trim() : '',
            ...(evidencia ? {evidencia} : {})
        }

        if(accion === 'entrega'){
            prestamo.estado = 'entregado'
            prestamo.fechaEntrega = new Date()
            prestamo.entrega = movimiento
            recurso.estado = 'prestado'
            await prestamo.save()
            await recurso.save()
            notificar(prestamo.usuario, 'entregado', `Se registro la entrega de "${recurso.nombre}". Devuelvelo antes del ${formatearFecha(prestamo.fechaDevolucion)}.`, prestamo._id)
            return res.status(200).json({
                msg: 'Entrega registrada correctamente',
                accion,
                prestamo: datosPrestamo(prestamo),
                recurso: {_id: recurso._id, nombre: recurso.nombre, estado: recurso.estado}
            })
        }

        prestamo.estado = 'devuelto'
        prestamo.fechaDevolucionReal = new Date()
        prestamo.codigoQR = undefined
        prestamo.devolucion = {...movimiento, condicion}
        // un recurso danado, incompleto o perdido queda en mantenimiento hasta que la asociacion lo revise o reponga
        recurso.estado = condicion === 'bueno' ? 'disponible' : 'mantenimiento'
        await prestamo.save()
        await recurso.save()

        const calculo = calcularPenalizaciones({
            precio: recurso.precio,
            fechaDevolucion: prestamo.fechaDevolucion,
            fechaDevolucionReal: prestamo.fechaDevolucionReal,
            condicion
        })
        const penalizaciones = calculo.penalizaciones.length
            ? await Penalizacion.insertMany(calculo.penalizaciones.map(p => ({
                ...p,
                usuario: prestamo.usuario,
                prestamo: prestamo._id,
                recurso: recurso._id,
                registradaPor: admin._id
            })))
            : []
        const advertencias = calculo.sinPrecio ? ['El recurso no tiene precio registrado: no se generaron penalizaciones'] : []

        notificar(prestamo.usuario, 'devuelto', condicion === 'perdido'
            ? `Se registro la perdida de "${recurso.nombre}".`
            : `Se registro la devolucion de "${recurso.nombre}". Gracias por devolverlo.`, prestamo._id)
        if(calculo.penalizaciones.length){
            const detalle = calculo.penalizaciones.map(p => `${p.descripcion}: ${formatoDolares(p.monto)}`).join('; ')
            notificar(prestamo.usuario, 'penalizacion', `Se registraron penalizaciones por "${recurso.nombre}": ${detalle}. Total: ${formatoDolares(calculo.total)}. `
                + 'Regularizalas con la asociacion para poder solicitar otro recurso.', prestamo._id)
        }
        res.status(200).json({
            msg: 'Devolucion registrada correctamente',
            accion,
            prestamo: datosPrestamo(prestamo),
            recurso: {_id: recurso._id, nombre: recurso.nombre, estado: recurso.estado},
            penalizaciones,
            totalPenalizado: calculo.total,
            advertencias
        })
    }catch(error){
        // si algo falla despues de subir la evidencia, se elimina para no dejar archivos huerfanos
        if(evidencia) await eliminarImagen(evidencia.publicId)
        throw error
    }
}

// HU-003: escanear el QR. Aprobado -> entrega (recurso prestado); entregado -> devolucion
const escanearQR = async (req, res) => {
    const {codigo} = req.body
    try{
        const prestamo = await Prestamo.findOne({codigoQR: codigo.toLowerCase()})
        if(!prestamo){
            return res.status(404).json({msg: 'Codigo QR no valido'})
        }
        await registrarMovimiento(req, res, prestamo)
    }catch(error){
        res.status(500).json({msg: `Error al procesar el QR - ${error}`})
    }
}

// HU-003: registrar la entrega o la devolucion por id (sin lector de QR)
const movimientoPorId = (esperada) => async (req, res) => {
    try{
        const prestamo = await Prestamo.findById(req.params.id)
        if(!prestamo){
            return res.status(404).json({msg: 'Solicitud no encontrada'})
        }
        await registrarMovimiento(req, res, prestamo, esperada)
    }catch(error){
        res.status(500).json({msg: `Error al registrar la ${esperada} - ${error}`})
    }
}
const entregarPrestamo = movimientoPorId('entrega')
const devolverPrestamo = movimientoPorId('devolucion')

export {solicitarPrestamo, misPrestamos, detallePrestamo, historialPrestamos, cancelarPrestamo, listarPrestamos, aprobarPrestamo, rechazarPrestamo,
    verQR, escanearQR, entregarPrestamo, devolverPrestamo, datosPrestamo}
