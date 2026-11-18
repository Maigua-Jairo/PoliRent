import multer from 'multer'

// responde 404 para las rutas que no existen
const rutaNoEncontrada = (req, res) => {
    res.status(404).json({msg: 'Ruta no encontrada'})
}

// captura los errores no controlados sin exponer detalles internos al cliente
// eslint-disable-next-line no-unused-vars
// errores de un multipart/form-data mal armado (los lanza busboy sin codigo)
const MULTIPART_INVALIDO = /^(Multipart:|Unexpected end of form|Malformed part header)/

const manejarErrores = (error, req, res, next) => {
    // el tipo de archivo lo rechaza fileFilter (uploadMiddleware.js)
    if(error?.code === 'TIPO_IMAGEN'){
        return res.status(400).json({msg: 'La imagen debe ser JPG, PNG o WEBP'})
    }
    if(error instanceof multer.MulterError){
        const msg = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no debe superar los 2 MB'
            : error.code === 'LIMIT_UNEXPECTED_FILE'
                ? `No se esperaba un archivo en el campo "${String(error.field ?? '').slice(0, 30)}"`
                : 'Los datos del formulario no son validos'
        return res.status(400).json({msg})
    }
    if(error.type === 'entity.parse.failed'){
        return res.status(400).json({msg: 'El cuerpo de la solicitud no es un JSON valido'})
    }
    // un dato del cliente nunca debe terminar en 500
    if(error.type === 'entity.too.large'){
        return res.status(400).json({msg: 'El cuerpo de la solicitud es demasiado grande'})
    }
    if(typeof error.message === 'string' && MULTIPART_INVALIDO.test(error.message)){
        return res.status(400).json({msg: 'El formulario (multipart/form-data) no es valido'})
    }
    // otros errores de lectura del cuerpo (charset o codificacion no soportados, peticion abortada...)
    if(error.expose && error.status >= 400 && error.status < 500){
        return res.status(400).json({msg: 'El cuerpo de la solicitud no es valido'})
    }
    console.error(error)
    res.status(500).json({msg: 'Error interno del servidor'})
}

export {rutaNoEncontrada, manejarErrores}
