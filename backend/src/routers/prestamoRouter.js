import {Router} from 'express'
import {solicitarPrestamo, misPrestamos, cancelarPrestamo, listarPrestamos, aprobarPrestamo, rechazarPrestamo, verQR, escanearQR} from '../controllers/prestamoController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarSolicitudPrestamo, validarIdPrestamo, validarRechazo, validarEscaneo} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloEstudiante = [verificarTokenJWT, permitirRoles('estudiante')]
const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// HU007: el estudiante gestiona sus solicitudes
router.post('/prestamos', soloEstudiante, validarSolicitudPrestamo, solicitarPrestamo)
router.get('/prestamos/mis', soloEstudiante, misPrestamos)
router.put('/prestamos/:id/cancelar', soloEstudiante, validarIdPrestamo, cancelarPrestamo)

// QR de una solicitud aprobada lo ve su dueño o el administrador
router.get('/prestamos/:id/qr', verificarTokenJWT, validarIdPrestamo, verQR)

// HU003el administrador gestiona las solicitudes y escanea el QR
router.get('/prestamos', soloAdministrador, listarPrestamos)
router.put('/prestamos/:id/aprobar', soloAdministrador, validarIdPrestamo, aprobarPrestamo)
router.put('/prestamos/:id/rechazar', soloAdministrador, validarIdPrestamo, validarRechazo, rechazarPrestamo)
router.post('/prestamos/escanear', soloAdministrador, validarEscaneo, escanearQR)

export default router