import Penalizacion from '../models/Penalizacion.js'
import {textoTerminos} from '../helpers/politicasHelper.js'
import {resumenPenalizaciones, sumar, formatoDolares} from '../helpers/penalizacionHelper.js'
import {notificar} from '../helpers/notificacionHelper.js'
import {rangoFechas} from '../helpers/reporteHelper.js'

const CAMPOS_USUARIO = 'nombres apellidos cedula correo'

const datosPenalizacion = (p) => ({
    _id: p._id,
    tipo: p.tipo,
    monto: p.monto,
    dias: p.dias,
    descripcion: p.descripcion,
    estado: p.estado,
    fechaPago: p.fechaPago,
    motivoAnulacion: p.motivoAnulacion,
    usuario: p.usuario,
    recurso: p.recurso,
    prestamo: p.prestamo,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
})

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
            totalAdeudado: resumen.totalAdeudado,
            totalAtrasoEnCurso: resumen.totalAtrasoEnCurso,
            atrasoEnCurso: resumen.atrasoEnCurso,
            penalizaciones: penalizaciones.map(datosPenalizacion)
        })
    }catch(error){
        res.status(500).json({msg: `Error al consultar tus penalizaciones - ${error}`})
    }
}

// el administrador consulta las penalizaciones (?estado ?usuario ?desde ?hasta)
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
            penalizaciones: penalizaciones.map(datosPenalizacion)
        })
    }catch(error){
        res.status(500).json({msg: `Error al listar las penalizaciones - ${error}`})
    }
}

// busca una penalizacion pendiente; responde 404 / 400 si no existe o ya no se puede modificar
const buscarPendiente = async (req, res) => {
    const penalizacion = await Penalizacion.findById(req.params.id).populate('recurso', 'nombre')
    if(!penalizacion){
        res.status(404).json({msg: 'Penalizacion no encontrada'})
        return null
    }
    if(penalizacion.estado !== 'pendiente'){
        res.status(400).json({msg: 'Solo se pueden modificar penalizaciones pendientes'})
        return null
    }
    return penalizacion
}

// el administrador registra el pago de una penalizacion
const pagarPenalizacion = async (req, res) => {
    try{
        const penalizacion = await buscarPendiente(req, res)
        if(!penalizacion) return
        penalizacion.estado = 'pagada'
        penalizacion.fechaPago = new Date()
        await penalizacion.save()
        notificar(penalizacion.usuario, 'penalizacion', `Se registro el pago de ${formatoDolares(penalizacion.monto)} por "${penalizacion.recurso?.nombre ?? 'el recurso'}" (${penalizacion.descripcion}).`, penalizacion.prestamo)
        res.status(200).json({msg: 'Pago registrado correctamente', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        res.status(500).json({msg: `Error al registrar el pago - ${error}`})
    }
}

// el administrador anula una penalizacion (por ejemplo, el estudiante repuso el articulo)
const anularPenalizacion = async (req, res) => {
    try{
        const penalizacion = await buscarPendiente(req, res)
        if(!penalizacion) return
        penalizacion.estado = 'anulada'
        penalizacion.motivoAnulacion = req.body.motivo.trim()
        await penalizacion.save()
        notificar(penalizacion.usuario, 'penalizacion', `Se anulo la penalizacion de ${formatoDolares(penalizacion.monto)} por "${penalizacion.recurso?.nombre ?? 'el recurso'}". Motivo: ${penalizacion.motivoAnulacion}`, penalizacion.prestamo)
        res.status(200).json({msg: 'Penalizacion anulada correctamente', penalizacion: datosPenalizacion(penalizacion)})
    }catch(error){
        res.status(500).json({msg: `Error al anular la penalizacion - ${error}`})
    }
}

export {verTerminos, misPenalizaciones, listarPenalizaciones, pagarPenalizacion, anularPenalizacion, datosPenalizacion}
