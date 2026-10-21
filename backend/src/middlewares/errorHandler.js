import multer from 'multer'

// responde 404 para las rutas que no existen
const rutaNoEncontrada = (req, res) => {
    res.status(404).json({msg: 'Ruta no encontrada'})
}

// captura los errores no controlados sin exponer detalles internos al cliente
// eslint-disable-next-line no-unused-vars
const manejarErrores = (error, req, res, next) => {
    if(error instanceof multer.MulterError){
        const msg = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no debe superar los 2 MB'
            : 'La imagen debe ser JPG, PNG o WEBP'
        return res.status(400).json({msg})
    }
    if(error.type === 'entity.parse.failed'){
        return res.status(400).json({msg: 'El cuerpo de la solicitud no es un JSON valido'})
    }
    console.error(error)
    res.status(500).json({msg: 'Error interno del servidor'})
}

export {rutaNoEncontrada, manejarErrores}
