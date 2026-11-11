import { Schema, model } from "mongoose"

const TIPOS_PENALIZACION = ['atraso', 'danio', 'perdida']
const ESTADOS_PENALIZACION = ['pendiente', 'pagada', 'anulada']

// penalizacion generada al registrar la devolucion de un prestamo (monto en dolares)
const PenalizacionSchema = new Schema({
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
    recurso:{
        type: Schema.Types.ObjectId,
        ref: 'Recurso'
    },
    tipo:{
        type: String,
        enum: TIPOS_PENALIZACION,
        required: true
    },
    monto:{
        type: Number,
        min: 0,
        required: true
    },
    // solo para el atraso: dias o fraccion de dia
    dias: Number,
    descripcion:{
        type: String,
        trim: true,
        default: ''
    },
    estado:{
        type: String,
        enum: ESTADOS_PENALIZACION,
        default: 'pendiente',
        index: true
    },
    fechaPago: Date,
    // por ejemplo: el estudiante repuso el articulo
    motivoAnulacion:{
        type: String,
        trim: true
    },
    registradaPor:{
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    }
},{
    timestamps: true
})

export {TIPOS_PENALIZACION, ESTADOS_PENALIZACION}
export default model('Penalizacion', PenalizacionSchema)
