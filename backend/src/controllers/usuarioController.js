import Usuario from '../models/Usuario.js'
import Prestamo from '../models/Prestamo.js'
import Notificacion from '../models/Notificacion.js'

const CAMPOS_PUBLICOS = '-password -tokenRecuperacion -tokenRecuperacionExpira -versionSesion'

const datosUsuario = (u) => ({
    id: u._id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    cedula: u.cedula,
    correo: u.correo,
    telefono: u.telefono,
    facultad: u.facultad,
    rol: u.rol,
    createdAt: u.createdAt
})

// borra al usuario junto con su historial de prestamos y sus notificaciones; no se permite si tiene recursos sin devolver
const borrarUsuarioConPrestamos = async (usuario) => {
    const sinDevolver = await Prestamo.exists({usuario: usuario._id, estado: 'entregado'})
    if(sinDevolver) return false
    await Prestamo.deleteMany({usuario: usuario._id})
    await Notificacion.deleteMany({usuario: usuario._id})
    await usuario.deleteOne()
    return true
}

// el administrador consulta los usuarios (filtro opcional ?rol=estudiante)
const listarUsuarios = async (req, res) => {
    const {rol} = req.query
    try{
        const filtro = {}
        if(rol !== undefined){
            if(typeof rol !== 'string' || !['estudiante', 'administrador'].includes(rol)){
                return res.status(400).json({msg: 'Rol no valido'})
            }
            filtro.rol = rol
        }
        const usuarios = await Usuario.find(filtro).select(CAMPOS_PUBLICOS).sort({createdAt: -1})
        res.status(200).json({total: usuarios.length, usuarios: usuarios.map(datosUsuario)})
    }catch(error){
        res.status(500).json({msg: `Error al listar los usuarios - ${error}`})
    }
}

// el administrador elimina a un alumno
const eliminarUsuario = async (req, res) => {
    try{
        const usuario = await Usuario.findById(req.params.id)
        if(!usuario){
            return res.status(404).json({msg: 'Usuario no encontrado'})
        }
        if(usuario.rol !== 'estudiante'){
            return res.status(403).json({msg: 'No se puede eliminar a un administrador'})
        }
        if(!(await borrarUsuarioConPrestamos(usuario))){
            return res.status(400).json({msg: 'El alumno tiene recursos entregados sin devolver'})
        }
        res.status(200).json({msg: 'Alumno eliminado correctamente'})
    }catch(error){
        res.status(500).json({msg: `Error al eliminar el alumno - ${error}`})
    }
}

// el alumno elimina su propia cuenta confirmando su contraseña
const eliminarMiCuenta = async (req, res) => {
    const {password} = req.body
    try{
        const usuario = await Usuario.findById(req.usuarioHeader._id)
        // 400 y no 401: la sesion sigue siendo valida, solo el dato enviado es incorrecto
        if(!usuario || !(await usuario.matchPassword(password))){
            return res.status(400).json({msg: 'La contraseña es incorrecta'})
        }
        if(!(await borrarUsuarioConPrestamos(usuario))){
            return res.status(400).json({msg: 'Tienes recursos entregados sin devolver: devuelvelos antes de eliminar tu cuenta'})
        }
        res.status(200).json({msg: 'Cuenta eliminada correctamente'})
    }catch(error){
        res.status(500).json({msg: `Error al eliminar la cuenta - ${error}`})
    }
}

export {listarUsuarios, eliminarUsuario, eliminarMiCuenta}
