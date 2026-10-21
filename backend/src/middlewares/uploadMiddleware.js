import multer from 'multer'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 2 * 1024 * 1024

// guarda la imagen en memoria para enviarla directo a cloudinary (no se escribe en disco)
const subirImagenRecurso = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: TAMANO_MAXIMO},
    fileFilter: (req, file, cb) => {
        if(!TIPOS_IMAGEN.includes(file.mimetype)){
            return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'imagen'))
        }
        cb(null, true)
    }
}).single('imagen')

export {subirImagenRecurso}
