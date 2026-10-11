// permite el acceso solo a los roles indicados (se usa despues de verificarTokenJWT)
const permitirRoles = (...roles) => {
    return (req, res, next) => {
        if(!req.usuarioHeader || !roles.includes(req.usuarioHeader.rol)){
            return res.status(403).json({msg: 'Acceso denegado: no tienes permisos para esta accion'})
        }
        next()
    }
}
export {permitirRoles}
