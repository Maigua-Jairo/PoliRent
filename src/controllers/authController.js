import crypto from 'crypto'
import Usuario from '../models/Usuario.js'
import {crearTokenJWT} from '../helpers/jwtHelper.js'

const datosUsuario = (u) => ({ id: u._id, nombre: u.nombre, correo: u.correo, rol: u.rol })

// registrarse
const registro = async (req, res) => {
    const {nombre, password, rol, claveAdmin} = req.body
    const correo = req.body.correo.trim().toLowerCase()
    try{
        const esAdmin = rol === 'administrador'
        if(rol !== undefined && rol !== 'estudiante' && !esAdmin){
            return res.status(400).json({msg: 'Rol no valido'})
        }
        if(esAdmin){
            // solo se crea un administrador con la clave secreta del sistema
            if(!process.env.ADMIN_REGISTRATION_KEY || claveAdmin !== process.env.ADMIN_REGISTRATION_KEY){
                return res.status(403).json({msg: 'Clave de administrador incorrecta'})
            }
        }else{
            // los estudiantes se registran con el correo de la institucion
            const dominio = process.env.INSTITUTIONAL_EMAIL_DOMAIN
            if(dominio && !correo.endsWith(`@${dominio.toLowerCase()}`)){
                return res.status(400).json({msg: `Debes usar el correo institucional @${dominio}`})
            }
        }
        const existe = await Usuario.findOne({correo})
        if(existe){
            return res.status(400).json({msg: 'El correo ya esta registrado'})
        }
        const nuevoUsuario = new Usuario({
            nombre: nombre.trim(),
            correo,
            rol: esAdmin ? 'administrador' : 'estudiante'
        })
        nuevoUsuario.password = await nuevoUsuario.encryptPassword(password)
        await nuevoUsuario.save()
        const token = crearTokenJWT(nuevoUsuario._id, nuevoUsuario.rol, nuevoUsuario.versionSesion)
        res.status(201).json({
            msg: 'Usuario registrado correctamente',
            token,
            usuario: datosUsuario(nuevoUsuario)
        })
    }catch(error){
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

// modificar perfil (nombre y/o contraseña)
const actualizarPerfil = async (req, res) => {
    const {nombre, password, passwordActual} = req.body
    try{
        const usuarioBDD = await Usuario.findById(req.usuarioHeader._id)
        if(nombre !== undefined){
            usuarioBDD.nombre = nombre.trim()
        }
        if(password !== undefined){
            if(!(await usuarioBDD.matchPassword(passwordActual))){
                return res.status(401).json({msg: 'La contraseña actual es incorrecta'})
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
        // sin servicio de correo: en desarrollo el token se devuelve en la respuesta
        const enDesarrollo = process.env.NODE_ENV !== 'production'
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
