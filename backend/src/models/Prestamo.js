import { Schema, model } from "mongoose"
import {CONDICIONES} from '../helpers/politicasHelper.js'

const ESTADOS_PRESTAMO = ['pendiente', 'aprobado', 'rechazado', 'cancelado', 'entregado', 'devuelto']

const PrestamoSchema = new Schema({
    usuario:{
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    recurso:{
        type: Schema.Types.ObjectId,
        ref: 'Recurso',
        required: true
    },
    estado:{
        type: String,
        enum: ESTADOS_PRESTAMO,
        default: 'pendiente'
    },
    motivo:{
        type: String,
        trim: true,
        default: ''
    },
    // fecha en la que el estudiante se compromete a devolver el recurso
    fechaDevolucion:{
        type: Date,
        required: true
    },
    motivoRechazo:{
        type: String,
        trim: true,
        default: ''
    },
    // codigo secreto que se codifica en el QR existe solo mientras la solicitud esta aprobada o entregada
    codigoQR:{
        type: String,
        unique: true,
        sparse: true
    },
    aprobadoPor:{
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    // fecha y hora (Ecuador) en que el estudiante pidio recibir el recurso; las solicitudes antiguas no la tienen
    fechaEntregaProgramada: Date,
    // momento real de la entrega y de la devolucion
    fechaEntrega: Date,
    fechaDevolucionReal: Date,
    // horas antes de la devolucion que ya se avisaron con un recordatorio (evita enviarlos dos veces)
    recordatoriosEnviados:{
        type: [Number],
        default: undefined
    },
    // version de los terminos y condiciones que el estudiante acepto al solicitar
    terminos:{
        version: String,
        aceptadoEn: Date
    },
    // docente al que la asociacion contacta si el estudiante no devuelve el recurso (solo lo ve el administrador)
    docenteReferencia:{
        nombre: {type: String, trim: true},
        correo: {type: String, trim: true},
        telefono: {type: String, trim: true}
    },
    // quien entrego el recurso y la evidencia opcional
    entrega:{
        responsable: {type: Schema.Types.ObjectId, ref: 'Usuario'},
        responsableNombre: String,
        observaciones: String,
        condicion: {type: String, enum: CONDICIONES},
        evidencia: {url: String, publicId: String}
    },
    // devolucion: responsableNombre es quien RECIBE el recurso de vuelta (no quien lo trae), en que condicion volvio y la evidencia
    devolucion:{
        responsable: {type: Schema.Types.ObjectId, ref: 'Usuario'},
        responsableNombre: String,
        observaciones: String,
        condicion: {type: String, enum: CONDICIONES},
        evidencia: {url: String, publicId: String}
    }
},{
    timestamps: true,
    // save() falla con VersionError si otra peticion cambio la solicitud al mismo tiempo
    // (dos aprobaciones, aprobar y cancelar, dos devoluciones...): evita aplicar dos veces la misma transicion
    optimisticConcurrency: true
})

// solicitudes activas: cuentan para el maximo de MAX_SOLICITUDES_ACTIVAS (politicasHelper) por estudiante
const ESTADOS_ACTIVOS = ['pendiente', 'aprobado', 'entregado']

// mensaje para el estudiante que ya llego al maximo de solicitudes activas
const mensajeMaximoSolicitudes = (maximo) =>
    `Alcanzaste el maximo de ${maximo} solicitudes activas; cancela una o espera la respuesta antes de solicitar otro recurso`

export {ESTADOS_PRESTAMO, ESTADOS_ACTIVOS, CONDICIONES, mensajeMaximoSolicitudes}
export default model('Prestamo', PrestamoSchema)