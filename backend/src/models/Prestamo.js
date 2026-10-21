import { Schema, model } from "mongoose"

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
    fechaDevolucionReal: Date
},{
    timestamps: true
})

export {ESTADOS_PRESTAMO}
export default model('Prestamo', PrestamoSchema)