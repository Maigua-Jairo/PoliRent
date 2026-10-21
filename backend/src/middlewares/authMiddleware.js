import jwt from 'jsonwebtoken'
import Usuario from '../models/Usuario.js'
const verificarTokenJWT = async (req, res, next) => {
    const {authorization} = req.headers
    if(!authorization){
        return res.status(401).json({msg: 'Acceso denegado: token no proporcionado'})
    }
    try{
        const token = authorization.split(' ')[1]
        const {id, v} = jwt.verify(token, process.env.JWT_SECRET)

        const usuarioBDD = await Usuario.findById(id).select('-password -tokenRecuperacion -tokenRecuperacionExpira')
        if(!usuarioBDD){
            return res.status(401).json({ msg : 'Usuario no encontrado'})
        }
        // rechaza tokens emitidos antes de cerrar sesion o cambiar la clave
        if((v ?? 0) !== usuarioBDD.versionSesion){
            return res.status(401).json({msg: 'Sesion cerrada: inicia sesion nuevamente'})
        }
        req.usuarioHeader = usuarioBDD
        next()
    }catch(error){
        return res.status(401).json({msg: `Token invalido o expirado - ${error}`})
    }
}
export {verificarTokenJWT}
