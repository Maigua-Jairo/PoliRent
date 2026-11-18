import { Schema, model } from "mongoose"

const TIPOS_PENALIZACION = ['atraso', 'danio', 'perdida']
// pendiente -> en_revision (el estudiante subio el comprobante) -> pagada (el administrador lo aprobo).
// Desde en_revision el administrador puede rechazar el comprobante y vuelve a pendiente
const ESTADOS_PENALIZACION = ['pendiente', 'en_revision', 'pagada', 'anulada']
// estados que siguen contando como deuda (bloquean nuevas solicitudes)
const ESTADOS_DEUDA = ['pendiente', 'en_revision']

// foto del comprobante de pago que sube el estudiante (publicId solo para reemplazarla o borrarla en cloudinary)
const ComprobanteSchema = new Schema({
    url: String,
    publicId: String,
    subidoEn: Date,
    referencia: {type: String, trim: true},
    observaciones: {type: String, trim: true}
},{_id: false})

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
    },
    comprobante: ComprobanteSchema,
    // motivo por el que el administrador rechazo el ultimo comprobante
    motivoRechazoComprobante:{
        type: String,
        trim: true
    },
    // administrador que aprobo o rechazo el comprobante (o registro el pago)
    revisadaPor:{
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    fechaRevision: Date
},{
    timestamps: true,
    // save() falla con VersionError si otra peticion modifico la penalizacion al mismo tiempo (p. ej. dos pagos)
    optimisticConcurrency: true
})

export {TIPOS_PENALIZACION, ESTADOS_PENALIZACION, ESTADOS_DEUDA}
export default model('Penalizacion', PenalizacionSchema)
