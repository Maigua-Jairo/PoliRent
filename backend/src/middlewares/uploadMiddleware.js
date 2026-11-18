import multer from 'multer'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO = 2 * 1024 * 1024

// guarda la imagen en memoria para enviarla directo a cloudinary (no se escribe en disco).
// Un solo archivo y pocos campos de texto cortos: el formulario mas grande (recurso) tiene 8 campos
const subidaImagen = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: TAMANO_MAXIMO, files: 1, fields: 20, fieldSize: 20 * 1024, parts: 25},
    fileFilter: (req, file, cb) => {
        if(!TIPOS_IMAGEN.includes(file.mimetype)){
            // codigo propio: LIMIT_UNEXPECTED_FILE queda para un archivo enviado en un campo que no corresponde
            return cb(Object.assign(new Error('Tipo de imagen no permitido'), {code: 'TIPO_IMAGEN'}))
        }
        cb(null, true)
    }
})

const subirImagenRecurso = subidaImagen.single('imagen')
// foto de evidencia de la entrega o la devolucion de un prestamo (campo "evidencia")
const subirEvidenciaPrestamo = subidaImagen.single('evidencia')
// foto del comprobante de pago de una penalizacion (campo "comprobante")
const subirComprobante = subidaImagen.single('comprobante')

export {subirImagenRecurso, subirEvidenciaPrestamo, subirComprobante}
