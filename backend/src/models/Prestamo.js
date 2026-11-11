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
    fechaEntrega: Date,
    fechaDevolucionReal: Date,
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
        evidencia: {url: String, publicId: String}
    },
    // quien recibio el recurso, en que condicion volvio y la evidencia
    devolucion:{
        responsable: {type: Schema.Types.ObjectId, ref: 'Usuario'},
        responsableNombre: String,
        observaciones: String,
        condicion: {type: String, enum: CONDICIONES},
        evidencia: {url: String, publicId: String}
    }
},{
    timestamps: true
})

// un estudiante solo puede tener un prestamo en uno de estos estados a la vez
const ESTADOS_ACTIVOS = ['pendiente', 'aprobado', 'entregado']

// mensaje para el estudiante que intenta solicitar otro recurso teniendo un prestamo activo
const mensajePrestamoActivo = (estado, nombreRecurso) => {
    const recurso = nombreRecurso ? ` (${nombreRecurso})` : ''
    return estado === 'pendiente'
        ? `Ya tienes una solicitud en revision${recurso}. Cancelala o espera la respuesta antes de solicitar otro recurso`
        : `Ya tienes un prestamo en curso${recurso}. Devuelvelo antes de solicitar otro recurso`
}

export {ESTADOS_PRESTAMO, ESTADOS_ACTIVOS, CONDICIONES, mensajePrestamoActivo}
export default model('Prestamo', PrestamoSchema)