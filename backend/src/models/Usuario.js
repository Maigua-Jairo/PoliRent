import { Schema, model } from "mongoose"
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const FACULTADES = [
    'Escuela de Formación de Tecnólogos',
    'Ingeniería Civil',
    'Ingeniería Mecánica',
    'Ingeniería en Sistemas',
    'Ingeniería Química',
    'Ingeniería Eléctrica y Electrónica',
    'Ingeniería Ambiental'
]

const UsuarioSchema = new Schema({
    nombres:{
        type: String,
        required: true,
        trim: true
    },
    apellidos:{
        type: String,
        required: true,
        trim: true
    },
    cedula:{
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    correo:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    telefono:{
        type: String,
        required: true,
        trim: true
    },
    facultad:{
        type: String,
        required: true,
        enum: FACULTADES
    },
    password:{
        type: String,
        required: true,
    },
    // los administradores se asignan directamente en la base de datos
    rol:{
        type: String,
        enum: ['estudiante', 'administrador'],
        default: 'estudiante'
    },
    // hash del token de recuperacion de clave y su fecha de caducidad
    tokenRecuperacion:{
        type: String,
        default: null
    },
    tokenRecuperacionExpira:{
        type: Date,
        default: null
    },
    // version de sesion: al cerrar sesion o cambiar la clave aumenta y los tokens anteriores dejan de ser validos
    versionSesion:{
        type: Number,
        default: 0
    }
},{timestamps:true})
//cifra la contraseña antes de guardarla
UsuarioSchema.methods.encryptPassword = async function(password){
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password,salt)
}
// compara el password ingresado contra el cifrado guardado
UsuarioSchema.methods.matchPassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}
// genera un token de recuperacion, guarda solo su hash y devuelve el token original
UsuarioSchema.methods.crearTokenRecuperacion = function(){
    const token = crypto.randomBytes(32).toString('hex')
    this.tokenRecuperacion = crypto.createHash('sha256').update(token).digest('hex')
    this.tokenRecuperacionExpira = new Date(Date.now() + 15 * 60 * 1000)
    return token
}
export {FACULTADES}
export default model('Usuario',UsuarioSchema)
