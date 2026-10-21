import crypto from 'crypto'
import Usuario from '../models/Usuario.js'
import {crearTokenJWT} from '../helpers/jwtHelper.js'

const datosUsuario = (u) => ({
    id: u._id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    cedula: u.cedula,
    correo: u.correo,
    telefono: u.telefono,
    facultad: u.facultad,
    rol: u.rol
})

// registrarse (siempre como estudiante; el rol administrador se asigna en la base de datos)
const registro = async (req, res) => {
    const {nombres, apellidos, cedula, telefono, facultad, password} = req.body
    const correo = req.body.correo.trim().toLowerCase()
    try{
        if(await Usuario.exists({correo})){
            return res.status(400).json({msg: 'El correo ya esta registrado'})
        }
        if(await Usuario.exists({cedula})){
            return res.status(400).json({msg: 'La cedula ya esta registrada'})
        }
        const nuevoUsuario = new Usuario({
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            cedula,
            correo,
            telefono,
            facultad
        })
        nuevoUsuario.password = await nuevoUsuario.encryptPassword(password)
        await nuevoUsuario.save()
        // tras registrarse el usuario inicia sesion desde la pantalla de login
        res.status(201).json({
            msg: 'Usuario registrado correctamente, ya puedes iniciar sesion',
            usuario: datosUsuario(nuevoUsuario)
        })
    }catch(error){
        // dos registros simultaneos con el mismo correo o cedula chocan con el indice unico
        if(error.code === 11000){
            return res.status(400).json({msg: 'El correo o la cedula ya estan registrados'})
        }
        res.status(500).json({msg: `Error al registrar usuario - ${error}`})
    }
}

//  iniciar sesion
const login = async (req, res) => {
    const {password} = req.body
    const correo = req.body.correo.trim().toLowerCase()
    try{
        const usuarioBDD = await Usuario.findOne({correo})
        if(!usuarioBDD || !(await usuarioBDD.matchPassword(password))){
            return res.status(401).json({msg: 'Usuario o Contraseña incorrecta'})
        }
        const token = crearTokenJWT(usuarioBDD._id, usuarioBDD.rol, usuarioBDD.versionSesion)
        res.status(200).json({
            msg: 'Inicio de sesion exitoso',
            token,
            usuario: datosUsuario(usuarioBDD)
        })
    }catch(error){
        res.status(500).json({msg: `Error al iniciar sesion - ${error}`})
    }
}

// cerrar sesion (los tokens emitidos hasta ahora dejan de ser validos)
const logout = async (req, res) => {
    try{
        await Usuario.findByIdAndUpdate(req.usuarioHeader._id, {$inc: {versionSesion: 1}})
        res.status(200).json({msg: 'Sesion cerrada correctamente'})
    }catch(error){
        res.status(500).json({msg: `Error al cerrar sesion - ${error}`})
    }
}

// ver perfil
const perfil = async (req, res) => {
    const u = req.usuarioHeader
    res.status(200).json({usuario: {...datosUsuario(u), createdAt: u.createdAt, updatedAt: u.updatedAt}})
}

// modificar perfil (datos personales y/o contraseña; la cedula y el correo no cambian)
const actualizarPerfil = async (req, res) => {
    const {nombres, apellidos, telefono, facultad, password, passwordActual} = req.body
    try{
        const usuarioBDD = await Usuario.findById(req.usuarioHeader._id)
        if(nombres !== undefined) usuarioBDD.nombres = nombres.trim()
        if(apellidos !== undefined) usuarioBDD.apellidos = apellidos.trim()
        if(telefono !== undefined) usuarioBDD.telefono = telefono
        if(facultad !== undefined) usuarioBDD.facultad = facultad
        if(password !== undefined){
            if(!(await usuarioBDD.matchPassword(passwordActual))){
                // 400 y no 401: la sesion sigue siendo valida, solo el dato enviado es incorrecto
                return res.status(400).json({msg: 'La contraseña actual es incorrecta'})
            }
            usuarioBDD.password = await usuarioBDD.encryptPassword(password)
            // al cambiar la clave se cierran las demas sesiones y se entrega un token nuevo
            usuarioBDD.versionSesion += 1
        }
        await usuarioBDD.save()
        const token = password !== undefined ? crearTokenJWT(usuarioBDD._id, usuarioBDD.rol, usuarioBDD.versionSesion) : null
        res.status(200).json({
            msg: 'Perfil actualizado correctamente',
            ...(token && {token}),
            usuario: datosUsuario(usuarioBDD)
        })
    }catch(error){
        res.status(500).json({msg: `Error al actualizar el perfil - ${error}`})
    }
}

// recuperar clave (paso 1: solicitar)
const recuperarClave = async (req, res) => {
    const correo = req.body.correo.trim().toLowerCase()
    const mensaje = 'Si el correo esta registrado, se genero un enlace de recuperacion valido por 15 minutos'
    try{
        const usuarioBDD = await Usuario.findOne({correo})
        if(!usuarioBDD){
            return res.status(200).json({msg: mensaje})
        }
        const token = usuarioBDD.crearTokenRecuperacion()
        await usuarioBDD.save()
        // sin servicio de correo: solo en desarrollo el token se devuelve en la respuesta
        const enDesarrollo = process.env.NODE_ENV === 'development'
        res.status(200).json({msg: mensaje, ...(enDesarrollo && {token})})
    }catch(error){
        res.status(500).json({msg: `Error al solicitar la recuperacion de clave - ${error}`})
    }
}

// recuperar clave (paso 2: establecer la nueva clave)
const restablecerClave = async (req, res) => {
    const {token} = req.params
    const {password} = req.body
    try{
        const hash = crypto.createHash('sha256').update(token).digest('hex')
        const usuarioBDD = await Usuario.findOne({
            tokenRecuperacion: hash,
            tokenRecuperacionExpira: {$gt: new Date()}
        })
        if(!usuarioBDD){
            return res.status(400).json({msg: 'Token de recuperacion invalido o expirado'})
        }
        usuarioBDD.password = await usuarioBDD.encryptPassword(password)
        usuarioBDD.tokenRecuperacion = null
        usuarioBDD.tokenRecuperacionExpira = null
        usuarioBDD.versionSesion += 1
        await usuarioBDD.save()
        res.status(200).json({msg: 'Contraseña restablecida correctamente'})
    }catch(error){
        res.status(500).json({msg: `Error al restablecer la contraseña - ${error}`})
    }
}

export {registro, login, logout, perfil, actualizarPerfil, recuperarClave, restablecerClave}
