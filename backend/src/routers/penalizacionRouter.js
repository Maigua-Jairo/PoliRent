import {Router} from 'express'
import {verTerminos, misPenalizaciones, listarPenalizaciones, pagarPenalizacion, anularPenalizacion} from '../controllers/penalizacionController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarIdPenalizacion, validarFiltrosPenalizaciones, validarAnulacion} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloEstudiante = [verificarTokenJWT, permitirRoles('estudiante')]
const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// terminos y condiciones (publico: se muestran antes de solicitar)
router.get('/terminos', verTerminos)

// el estudiante consulta lo que debe
router.get('/penalizaciones/mis', soloEstudiante, validarFiltrosPenalizaciones, misPenalizaciones)

// el administrador consulta, cobra o anula penalizaciones
router.get('/penalizaciones', soloAdministrador, validarFiltrosPenalizaciones, listarPenalizaciones)
router.put('/penalizaciones/:id/pagar', soloAdministrador, validarIdPenalizacion, pagarPenalizacion)
router.put('/penalizaciones/:id/anular', soloAdministrador, validarIdPenalizacion, validarAnulacion, anularPenalizacion)

export default router
