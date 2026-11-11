import multer from 'multer'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 2 * 1024 * 1024

// guarda la imagen en memoria para enviarla directo a cloudinary (no se escribe en disco)
const subidaImagen = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: TAMANO_MAXIMO},
    fileFilter: (req, file, cb) => {
        if(!TIPOS_IMAGEN.includes(file.mimetype)){
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
        }
        cb(null, true)
    }
})

const subirImagenRecurso = subidaImagen.single('imagen')
// foto de evidencia de la entrega o la devolucion de un prestamo (campo "evidencia")
const subirEvidenciaPrestamo = subidaImagen.single('evidencia')

export {subirImagenRecurso, subirEvidenciaPrestamo}
