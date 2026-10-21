import {FACULTADES} from '../models/Usuario.js'

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(\s[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/
const textoValido = (v) => typeof v === 'string' && v.trim().length > 0

// --- reglas compartidas (las mismas que aplica el frontend en utils/validaciones.js) ---

const errorNombre = (valor, campo) => {
    if(!textoValido(valor)) return `${campo} es obligatorio`
    const texto = valor.trim()
    if(texto.length < 2) return `${campo} es demasiado corto`
    if(!SOLO_LETRAS.test(texto)) return `${campo} solo puede contener letras`
    return ''
}

// cedula ecuatoriana: 10 digitos, provincia 01-24 (o 30), tercer digito < 6 y digito verificador (modulo 10)
const errorCedula = (cedula) => {
    if(typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) return 'La cedula debe tener 10 digitos'
    const provincia = Number(cedula.slice(0, 2))
    if(!((provincia >= 1 && provincia <= 24) || provincia === 30) || Number(cedula[2]) >= 6){
        return 'La cedula no es valida'
    }
    const suma = cedula.slice(0, 9).split('').reduce((acc, d, i) => {
        let n = Number(d) * (i % 2 === 0 ? 2 : 1)
        if(n > 9) n -= 9
        return acc + n
    }, 0)
    return (10 - (suma % 10)) % 10 === Number(cedula[9]) ? '' : 'La cedula no es valida'
}

const errorCorreoInstitucional = (correo) => {
    if(!textoValido(correo) || !REGEX_CORREO.test(correo.trim())) return 'El correo no tiene un formato valido'
    const dominio = (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'epn.edu.ec').toLowerCase()
    if(!correo.trim().toLowerCase().endsWith(`@${dominio}`)) return `Debes usar el correo institucional @${dominio}`
    return ''
}

const errorTelefono = (telefono) =>
    typeof telefono === 'string' && /^09\d{8}$/.test(telefono) ? '' : 'El telefono debe tener el formato 09XXXXXXXX'

const errorFacultad = (facultad) =>
    FACULTADES.includes(facultad) ? '' : `La facultad debe ser: ${FACULTADES.join(', ')}`

const errorPassword = (password) => {
    if(!textoValido(password)) return 'La contraseña es obligatoria'
    if(password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if(!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)){
        return 'La contraseña debe incluir mayusculas, minusculas y numeros'
    }
    return ''
}

// devuelve el primer error encontrado o continua
const responderPrimerError = (errores, res, next) => {
    const error = errores.find(Boolean)
    if(error) return res.status(400).json({msg: error})
    next()
}

// valida los datos recibidos al registrarse
const validarRegistro = (req, res, next) => {
    const {nombres, apellidos, cedula, correo, telefono, facultad, password} = req.body
    if(![nombres, apellidos, cedula, correo, telefono, facultad, password].every(textoValido)){
        return res.status(400).json({msg: 'Todos los campos son obligatorios'})
    }
    responderPrimerError([
        errorNombre(nombres, 'El nombre'),
        errorNombre(apellidos, 'El apellido'),
        errorCedula(cedula),
        errorCorreoInstitucional(correo),
        errorTelefono(telefono),
        errorFacultad(facultad),
        errorPassword(password)
    ], res, next)
}

// valida los datos recibidos al iniciar sesion
const validarLogin = (req, res, next) => {
    const {correo, password} = req.body
    if(!textoValido(correo) || !textoValido(password)){
        return res.status(400).json({msg: 'Todos los campos son obligatorios'})
    }
    next()
}

// valida los datos recibidos al modificar el perfil
// la cedula y el correo no se pueden modificar
const validarActualizarPerfil = (req, res, next) => {
    const {nombres, apellidos, telefono, facultad, password, passwordActual} = req.body
    if([nombres, apellidos, telefono, facultad, password].every(v => v === undefined)){
        return res.status(400).json({msg: 'Envia al menos un campo a modificar'})
    }
    if(password !== undefined && !textoValido(passwordActual)){
        return res.status(400).json({msg: 'Debes enviar la contraseña actual'})
    }
    responderPrimerError([
        nombres !== undefined && errorNombre(nombres, 'El nombre'),
        apellidos !== undefined && errorNombre(apellidos, 'El apellido'),
        telefono !== undefined && errorTelefono(telefono),
        facultad !== undefined && errorFacultad(facultad),
        password !== undefined && errorPassword(password)
    ], res, next)
}

// valida el correo al solicitar la recuperacion de clave
const validarRecuperarClave = (req, res, next) => {
    const {correo} = req.body
    if(!textoValido(correo) || !REGEX_CORREO.test(correo.trim())){
        return res.status(400).json({msg: 'Debes enviar un correo valido'})
    }
    next()
}

// valida la nueva clave al restablecerla
const validarRestablecerClave = (req, res, next) => {
    const {password, confirmarPassword} = req.body
    if(!textoValido(password) || !textoValido(confirmarPassword)){
        return res.status(400).json({msg: 'Todos los campos son obligatorios'})
    }
    const error = errorPassword(password)
    if(error){
        return res.status(400).json({msg: error})
    }
    if(password !== confirmarPassword){
        return res.status(400).json({msg: 'Las contraseñas no coinciden'})
    }
    next()
}
// hu002 recursos
const CATEGORIAS_RECURSO = ['tecnico', 'academico', 'recreativo']
const ESTADOS_RECURSO = ['disponible', 'prestado', 'mantenimiento']

// valida los datos recibidos al registrar un recurso
const validarRecurso = (req, res, next) => {
    const {nombre, descripcion, categoria, estado, imagen} = req.body
    if(!textoValido(nombre) || !textoValido(categoria)){
        return res.status(400).json({msg: 'El nombre y la categoria son obligatorios'})
    }
    if(nombre.trim().length < 3){
        return res.status(400).json({msg: 'El nombre debe tener al menos 3 caracteres'})
    }
    if(!CATEGORIAS_RECURSO.includes(categoria)){
        return res.status(400).json({msg: `La categoria debe ser: ${CATEGORIAS_RECURSO.join(', ')}`})
    }
    if(estado !== undefined && !ESTADOS_RECURSO.includes(estado)){
        return res.status(400).json({msg: `El estado debe ser: ${ESTADOS_RECURSO.join(', ')}`})
    }
    if(descripcion !== undefined && typeof descripcion !== 'string'){
        return res.status(400).json({msg: 'La descripcion debe ser texto'})
    }
    if(imagen !== undefined && typeof imagen !== 'string'){
        return res.status(400).json({msg: 'La imagen debe ser una URL en texto'})
    }
    next()
}

// valida los datos recibidos al actualizar un recurso (solo los enviados)
const validarActualizarRecurso = (req, res, next) => {
    const {nombre, descripcion, categoria, estado, imagen} = req.body
    if([nombre, descripcion, categoria, estado, imagen].every(v => v === undefined) && !req.file){
        return res.status(400).json({msg: 'Envia al menos un campo a modificar'})
    }
    if(nombre !== undefined && (!textoValido(nombre) || nombre.trim().length < 3)){
        return res.status(400).json({msg: 'El nombre debe tener al menos 3 caracteres'})
    }
    if(categoria !== undefined && !CATEGORIAS_RECURSO.includes(categoria)){
        return res.status(400).json({msg: `La categoria debe ser: ${CATEGORIAS_RECURSO.join(', ')}`})
    }
    if(estado !== undefined && !ESTADOS_RECURSO.includes(estado)){
        return res.status(400).json({msg: `El estado debe ser: ${ESTADOS_RECURSO.join(', ')}`})
    }
    if(descripcion !== undefined && typeof descripcion !== 'string'){
        return res.status(400).json({msg: 'La descripcion debe ser texto'})
    }
    if(imagen !== undefined && typeof imagen !== 'string'){
        return res.status(400).json({msg: 'La imagen debe ser una URL en texto'})
    }
    next()
}

// valida que el id de la ruta sea un ObjectId de MongoDB
const validarIdRecurso = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id del recurso no es valido'})
    }
    next()
}

export {validarRegistro, validarLogin, validarActualizarPerfil, validarRecuperarClave, validarRestablecerClave, validarRecurso, validarActualizarRecurso, validarIdRecurso}
