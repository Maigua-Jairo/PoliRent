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
        // palabras clave que la IA usa para recomendar el recurso (ej. robotica, arduino, sensores)
    etiquetas:{
        type: [String],
        default: []
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
    },
    // identificador de la imagen en cloudinary, necesario para reemplazarla o eliminarla
    imagenId:{
        type: String,
        default: null
    },
    // precio de reposicion en dolares: base para calcular las penalizaciones por atraso, dano o perdida
    precio:{
        type: Number,
        min: 0,
        default: 0
    }
},{
    timestamps: true
})

export {CATEGORIAS, ESTADOS}
export default model('Recurso', RecursoSchema)