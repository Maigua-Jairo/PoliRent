import Penalizacion from '../models/Penalizacion.js'
import {textoTerminos} from '../helpers/politicasHelper.js'
import {resumenPenalizaciones, sumar, formatoDolares} from '../helpers/penalizacionHelper.js'
import {notificar, notificarAdministradores} from '../helpers/notificacionHelper.js'
import {rangoFechas} from '../helpers/reporteHelper.js'
import {MSG_CONFLICTO, esConflictoVersion} from '../helpers/responseHelper.js'
import {cloudinaryConfigurado, subirImagen, eliminarImagen} from '../config/cloudinary.js'

const CAMPOS_USUARIO = 'nombres apellidos cedula correo'
const MSG_SIN_CLOUDINARY = 'La subida de imagenes no esta disponible: falta configurar Cloudinary'
const MSG_NO_ENCONTRADA = 'Penalizacion no encontrada'

// comprobante que se envia al cliente (nunca el publicId de cloudinary)
const datosComprobante = (c) => c?.url
    ? {url: c.url, subidoEn: c.subidoEn ?? null, referencia: c.referencia ?? '', observaciones: c.observaciones ?? ''}
    : null

const datosPenalizacion = (p) => ({
    _id: p._id,
    tipo: p.tipo,
    monto: p.monto,
    dias: p.dias,
    descripcion: p.descripcion,
    estado: p.estado,
    fechaPago: p.fechaPago,
    motivoAnulacion: p.motivoAnulacion,
    comprobante: datosComprobante(p.comprobante),
    motivoRechazoComprobante: p.motivoRechazoComprobante ?? '',
    fechaRevision: p.fechaRevision ?? null,
    usuario: p.usuario,
    recurso: p.recurso,
    prestamo: p.prestamo,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
})

const nombreRecurso = (p) => p.recurso?.nombre ?? 'el recurso'

// terminos y condiciones con las tarifas y el horario vigentes (publico)
const verTerminos = (req, res) => {
    res.status(200).json(textoTerminos())
}

// el estudiante consulta sus penalizaciones (?estado opcional), lo que adeuda y el atraso que acumula
const misPenalizaciones = async (req, res) => {
    const {estado} = req.query
    try{
        const filtro = {usuario: req.usuarioHeader._id}
        if(estado) filtro.estado = estado
        const [penalizaciones, resumen] = await Promise.all([
            Penalizacion.find(filtro).populate('recurso', 'nombre').populate('prestamo', '_id').sort({createdAt: -1}),
            resumenPenalizaciones(req.usuarioHeader._id)
        ])
        res.status(200).json({
            total: penalizaciones.length,
            // pendientes + en revision: siguen siendo deuda hasta que el administrador confirme el pago
            totalAdeudado: resumen.totalAdeudado,
            totalEnRevision: resumen.totalEnRevision,
            totalAtrasoEnCurso: resumen.totalAtrasoEnCurso,
            atrasoEnCurso: resumen.atrasoEnCurso,
            penalizaciones: penalizaciones.map(datosPenalizacion)
        })
    }catch(error){
        res.status(500).json({msg: `Error al consultar tus penalizaciones - ${error}`})
    }
}

// el administrador consulta las penalizaciones (?estado ?usuario ?desde ?hasta); ?estado=en_revision es la cola de revision
const listarPenalizaciones = async (req, res) => {
    const {estado, usuario, desde, hasta} = req.query
    try{
        const filtro = {}
        if(estado) filtro.estado = estado
        if(usuario) filtro.usuario = usuario
        const rango = rangoFechas(desde, hasta)
        if(rango) filtro.createdAt = rango
        const penalizaciones = await Penalizacion.find(filtro)
            .populate('usuario', CAMPOS_USUARIO)
            .populate('recurso', 'nombre categoria precio')
            .populate('prestamo', 'estado fechaDevolucion fechaDevolucionReal docenteReferencia')
            .sort({createdAt: -1})
        res.status(200).json({
            total: penalizaciones.length,
            totalPendiente: sumar(penalizaciones.filter(p => p.estado === 'pendiente'), 'monto'),
            totalEnRevision: sumar(penalizaciones.filter(p => p.estado === 'en_revision'), 'monto'),
            penalizaciones: penalizaciones.map(datosPenalizacion)
        })
    }catch(error){
        res.status(500).json({msg: `Error al listar las penalizaciones - ${error}`})
    }
}

// busca la penalizacion y comprueba que este en uno de los estados permitidos; responde 404 / 400 si no
const buscarEnEstado = async (req, res, estados, msgEstado) => {
    const penalizacion = await Penalizacion.findById(req.params.id).populate('recurso', 'nombre')
    if(!penalizacion){
        res.status(404).json({msg: MSG_NO_ENCONTRADA})
        return null
    }
    if(!estados.includes(penalizacion.estado)){
        res.status(400).json({msg: msgEstado})
        return null
    }
    return penalizacion
}

// 400 si otra peticion modifico la penalizacion a la vez; si no, 500 con el patron de siempre
const responderError = (res, error, texto) => esConflictoVersion(error)
    ? res.status(400).json({msg: MSG_CONFLICTO})
    : res.status(500).json({msg: `${texto} - ${error}`})

// el estudiante sube la foto del comprobante de pago (multipart, campo "comprobante"): pendiente/en_revision -> en_revision
const enviarComprobante = async (req, res) => {
    const estudiante = req.usuarioHeader
    let subido = null
    try{
        // la penalizacion debe ser suya: si es de otro estudiante responde igual que si no existiera
        const penalizacion = await Penalizacion.findOne({_id: req.params.id, usuario: estudiante._id}).populate('recurso', 'nombre')
        if(!penalizacion){
            return res.status(404).json({msg: MSG_NO_ENCONTRADA})
        }
        if(!['pendiente', 'en_revision'].includes(penalizacion.estado)){
            return res.status(400).json({msg: 'Solo se puede enviar comprobante de penalizaciones pendientes'})
        }
        if(!req.file){
            return res.status(400).json({msg: 'Adjunta el comprobante de pago'})
        }
        if(!cloudinaryConfigurado()){
            return res.status(503).json({msg: MSG_SIN_CLOUDINARY})
        }
        subido = await subirImagen(req.file.buffer, 'polirent/comprobantes')
        // en revision, el comprobante nuevo reemplaza al anterior
        const anteriorId = penalizacion.comprobante?.publicId
        const texto = (v) => typeof v === 'string' ? v.trim() : ''
        penalizacion.estado = 'en_revision'
        penalizacion.comprobante = {
            url: subido.url,
            publicId: subido.publicId,
            subidoEn: new Date(),
            referencia: texto(req.body.referencia),
            observaciones: texto(req.body.observaciones)
        }
        penalizacion.motivoRechazoComprobante = undefined
        await penalizacion.save()
        await eliminarImagen(anteriorId)
        await notificarAdministradores('penalizacion',
            `${estudiante.nombres} ${estudiante.apellidos} envio el comprobante de pago de ${formatoDolares(penalizacion.monto)} (${nombreRecurso(penalizacion)}).`,
            penalizacion.prestamo)
        res.status(200).json({msg: 'Comprobante enviado, el administrador lo revisara', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        // si algo falla despues de subir la imagen, se elimina para no dejar archivos huerfanos
        if(subido) await eliminarImagen(subido.publicId)
        responderError(res, error, 'Error al enviar el comprobante')
    }
}

// el administrador registra el pago: con el comprobante revisado (en_revision) o en efectivo (pendiente)
const pagarPenalizacion = async (req, res) => {
    try{
        const penalizacion = await buscarEnEstado(req, res, ['pendiente', 'en_revision'], 'Solo se pueden pagar penalizaciones pendientes o en revision')
        if(!penalizacion) return
        const ahora = new Date()
        penalizacion.estado = 'pagada'
        penalizacion.fechaPago = ahora
        penalizacion.revisadaPor = req.usuarioHeader._id
        penalizacion.fechaRevision = ahora
        // el comprobante se conserva como respaldo del pago
        await penalizacion.save()
        await notificar(penalizacion.usuario, 'penalizacion', `Se registro el pago de ${formatoDolares(penalizacion.monto)} por "${nombreRecurso(penalizacion)}" (${penalizacion.descripcion}).`, penalizacion.prestamo)
        res.status(200).json({msg: 'Pago registrado correctamente', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        responderError(res, error, 'Error al registrar el pago')
    }
}

// el administrador rechaza el comprobante (en_revision -> pendiente); el estudiante puede subir otro
const rechazarComprobante = async (req, res) => {
    try{
        const penalizacion = await buscarEnEstado(req, res, ['en_revision'], 'Solo se puede rechazar el comprobante de una penalizacion en revision')
        if(!penalizacion) return
        const anteriorId = penalizacion.comprobante?.publicId
        penalizacion.estado = 'pendiente'
        penalizacion.motivoRechazoComprobante = req.body.motivo.trim()
        penalizacion.comprobante = undefined
        penalizacion.revisadaPor = req.usuarioHeader._id
        penalizacion.fechaRevision = new Date()
        await penalizacion.save()
        await eliminarImagen(anteriorId)
        await notificar(penalizacion.usuario, 'penalizacion', `Se rechazo tu comprobante de pago de ${formatoDolares(penalizacion.monto)} por "${nombreRecurso(penalizacion)}". `
            + `Motivo: ${penalizacion.motivoRechazoComprobante}. Puedes enviar un nuevo comprobante.`, penalizacion.prestamo)
        res.status(200).json({msg: 'Comprobante rechazado correctamente', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        responderError(res, error, 'Error al rechazar el comprobante')
    }
}

// el administrador anula una penalizacion (por ejemplo, el estudiante repuso el articulo)
const anularPenalizacion = async (req, res) => {
    try{
        const penalizacion = await buscarEnEstado(req, res, ['pendiente', 'en_revision'], 'Solo se pueden anular penalizaciones pendientes o en revision')
        if(!penalizacion) return
        penalizacion.estado = 'anulada'
        penalizacion.motivoAnulacion = req.body.motivo.trim()
        await penalizacion.save()
        await notificar(penalizacion.usuario, 'penalizacion', `Se anulo la penalizacion de ${formatoDolares(penalizacion.monto)} por "${nombreRecurso(penalizacion)}". Motivo: ${penalizacion.motivoAnulacion}`, penalizacion.prestamo)
        res.status(200).json({msg: 'Penalizacion anulada correctamente', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        responderError(res, error, 'Error al anular la penalizacion')
    }
}

export {verTerminos, misPenalizaciones, listarPenalizaciones, enviarComprobante, pagarPenalizacion, rechazarComprobante, anularPenalizacion, datosPenalizacion}
