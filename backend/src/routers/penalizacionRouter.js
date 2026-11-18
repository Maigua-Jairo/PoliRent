import {Router} from 'express'
import {verTerminos, misPenalizaciones, listarPenalizaciones, enviarComprobante, pagarPenalizacion, rechazarComprobante, anularPenalizacion} from '../controllers/penalizacionController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {subirComprobante} from '../middlewares/uploadMiddleware.js'
import {validarIdPenalizacion, validarFiltrosPenalizaciones, validarAnulacion, validarComprobante, validarRechazoComprobante} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloEstudiante = [verificarTokenJWT, permitirRoles('estudiante')]
const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// terminos y condiciones (publico: se muestran antes de solicitar)
router.get('/terminos', verTerminos)

// el estudiante consulta lo que debe
router.get('/penalizaciones/mis', soloEstudiante, validarFiltrosPenalizaciones, misPenalizaciones)
// el estudiante sube la foto del comprobante de pago (multipart/form-data, campo "comprobante").
// Orden: sesion y rol, luego multer y luego los validadores (sin token nunca se procesa el archivo)
router.put('/penalizaciones/:id/comprobante', soloEstudiante, subirComprobante, validarIdPenalizacion, validarComprobante, enviarComprobante)

// el administrador consulta, cobra o anula penalizaciones
router.get('/penalizaciones', soloAdministrador, validarFiltrosPenalizaciones, listarPenalizaciones)
router.put('/penalizaciones/:id/pagar', soloAdministrador, validarIdPenalizacion, pagarPenalizacion)
router.put('/penalizaciones/:id/rechazar-comprobante', soloAdministrador, validarIdPenalizacion, validarRechazoComprobante, rechazarComprobante)
router.put('/penalizaciones/:id/anular', soloAdministrador, validarIdPenalizacion, validarAnulacion, anularPenalizacion)

export default router
