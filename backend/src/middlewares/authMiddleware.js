import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js'
const verificarTokenJWT = async (req, res, next) => {
    const {authorization} = req.headers
    if(!authorization?.startsWith('Bearer ')){
        return res.status(401).json({msg: 'Acceso denegado: token no proporcionado'})
    }
    let datos
    try{
        datos = jwt.verify(authorization.slice(7), process.env.JWT_SECRET)
    }catch(error){
        return res.status(401).json({msg: 'Token invalido o expirado'})
    }
    try{
        const {id, v} = datos
        const usuarioBDD = await Usuario.findById(id).select('-password -tokenRecuperacion -tokenRecuperacionExpira')
        if(!usuarioBDD){
            return res.status(401).json({ msg : 'Usuario no encontrado'})
        }
        // rechaza tokens emitidos antes de cerrar sesion o cambiar la clave
        if((v ?? 0) !== usuarioBDD.versionSesion){
            return res.status(401).json({msg: 'Sesion cerrada: inicia sesion nuevamente'})
        }
        req.usuarioHeader = usuarioBDD
    }catch(error){
        // un fallo de la base de datos no es una sesion invalida: con 401 el frontend cerraria la sesion
        if(error?.name === 'CastError') return res.status(401).json({msg: 'Token invalido o expirado'})
        console.error(`No se pudo verificar la sesion: ${error.message}`)
        return res.status(500).json({msg: 'No se pudo verificar la sesion, intenta mas tarde'})
    }
    next()
}
// sesion opcional: sin encabezado Authorization sigue como invitado; con el encabezado lo valida igual que verificarTokenJWT
const verificarTokenOpcional = (req, res, next) => {
    if(!req.headers.authorization) return next()
    return verificarTokenJWT(req, res, next)
}
export {verificarTokenJWT, verificarTokenOpcional}
