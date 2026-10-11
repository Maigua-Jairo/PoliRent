const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const textoValido = (v) => typeof v === 'string' && v.trim().length > 0

// valida los datos recibidos al registrarse
const validarRegistro = (req, res, next) => {
    const {nombre, correo, password} = req.body
    if(!textoValido(nombre) || !textoValido(correo) || !textoValido(password)){
        return res.status(400).json({msg: 'Todos los campos son obligatorios'})
    }
    if(nombre.trim().length < 3){
        return res.status(400).json({msg: 'El nombre debe tener al menos 3 caracteres'})
    }
    if(!REGEX_CORREO.test(correo.trim())){
        return res.status(400).json({msg: 'El correo no tiene un formato valido'})
    }
    if(password.length < 8){
        return res.status(400).json({msg: 'La contraseña debe tener al menos 8 caracteres'})
    }
    next()
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
const validarActualizarPerfil = (req, res, next) => {
    const {nombre, password, passwordActual} = req.body
    if(nombre === undefined && password === undefined){
        return res.status(400).json({msg: 'Envia el nombre o la nueva contraseña a modificar'})
    }
    if(nombre !== undefined && (!textoValido(nombre) || nombre.trim().length < 3)){
        return res.status(400).json({msg: 'El nombre debe tener al menos 3 caracteres'})
    }
    if(password !== undefined){
        if(!textoValido(passwordActual)){
            return res.status(400).json({msg: 'Debes enviar la contraseña actual'})
        }
        if(typeof password !== 'string' || password.length < 8){
            return res.status(400).json({msg: 'La contraseña debe tener al menos 8 caracteres'})
        }
    }
    next()
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
    if(password.length < 8){
        return res.status(400).json({msg: 'La contraseña debe tener al menos 8 caracteres'})
    }
    if(password !== confirmarPassword){
        return res.status(400).json({msg: 'Las contraseñas no coinciden'})
    }
    next()
}
export {validarRegistro, validarLogin, validarActualizarPerfil, validarRecuperarClave, validarRestablecerClave}
