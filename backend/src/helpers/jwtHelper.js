import jwt from 'jsonwebtoken' 
// crea un token fimrado con el id, el rol y la version de sesion del usuario 
const crearTokenJWT = (id, rol, version = 0)=>{
    return jwt.sign({id,rol,v:version}, process.env.JWT_SECRET,{ 
      expiresIn: process.env.JWT_EXPIRES_IN || '8H'
    })
}
export {crearTokenJWT}
