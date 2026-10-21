import { Schema, model } from "mongoose"

const CATEGORIAS = ['tecnico', 'academico', 'recreativo']
const ESTADOS = ['disponible', 'prestado', 'mantenimiento']

const RecursoSchema = new Schema({
    nombre:{
        type: String,
        required: true,
        trim: true
    },
    descripcion:{
        type: String,
        trim: true,
        default: ''
    },
    categoria:{
        type: String,
        required: true,
        enum: CATEGORIAS
    },
    estado:{
        type: String,
        enum: ESTADOS,
        default: 'disponible'
    },
    imagen:{
        type: String,
        trim: true,
        default: ''
    }
},{
    timestamps: true
})

export {CATEGORIAS, ESTADOS}
export default model('Recurso', RecursoSchema)