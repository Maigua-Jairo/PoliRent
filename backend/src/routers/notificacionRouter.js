import {Router} from 'express'
import {misNotificaciones, marcarLeida, marcarTodasLeidas} from '../controllers/notificacionController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {validarFiltroNotificaciones, validarIdNotificacion} from '../middlewares/validationMiddleware.js'
const router = Router()

// HU-010: cada usuario (estudiante o administrador) consulta sus propias notificaciones
router.get('/notificaciones', verificarTokenJWT, validarFiltroNotificaciones, misNotificaciones)
router.put('/notificaciones/leidas', verificarTokenJWT, marcarTodasLeidas)
router.put('/notificaciones/:id/leida', verificarTokenJWT, validarIdNotificacion, marcarLeida)

export default router
