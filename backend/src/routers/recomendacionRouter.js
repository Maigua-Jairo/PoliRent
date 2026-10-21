import {Router} from 'express'
import {recomendar} from '../controllers/recomendacionController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarRecomendacion} from '../middlewares/validationMiddleware.js'
const router = Router()

// HU009: el estudiante recibe recomendaciones segun el contexto de su proyecto
router.post('/recomendaciones', verificarTokenJWT, permitirRoles('estudiante'), validarRecomendacion, recomendar)

export default router