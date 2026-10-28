import { Schema, model } from "mongoose"

const TIPOS_NOTIFICACION = ['solicitud_nueva', 'aprobado', 'rechazado', 'entregado', 'devuelto', 'recordatorio', 'vencido']

const NotificacionSchema = new Schema({
    // a quien se le muestra la notificacion (estudiante o administrador)
    usuario:{
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        index: true
    },
    prestamo:{
        type: Schema.Types.ObjectId,
        ref: 'Prestamo'
    },
    tipo:{
        type: String,
        enum: TIPOS_NOTIFICACION,
        required: true
    },
    mensaje:{
        type: String,
        required: true,
        trim: true
    },
    leida:{
        type: Boolean,
        default: false
    }
},{
    timestamps: true
})

export {TIPOS_NOTIFICACION}
export default model('Notificacion', NotificacionSchema)
