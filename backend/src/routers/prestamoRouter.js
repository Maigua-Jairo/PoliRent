import {Router} from 'express'
import {solicitarPrestamo, misPrestamos, detallePrestamo, historialPrestamos, cancelarPrestamo, listarPrestamos, aprobarPrestamo, rechazarPrestamo,
    verQR, escanearQR, entregarPrestamo, devolverPrestamo} from '../controllers/prestamoController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {subirEvidenciaPrestamo} from '../middlewares/uploadMiddleware.js'
import {validarSolicitudPrestamo, validarIdPrestamo, validarRechazo, validarEscaneo, validarMovimiento, validarFiltrosReporte} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloEstudiante = [verificarTokenJWT, permitirRoles('estudiante')]
const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// HU007: el estudiante gestiona sus solicitudes
router.post('/prestamos', soloEstudiante, validarSolicitudPrestamo, solicitarPrestamo)
router.get('/prestamos/mis', soloEstudiante, misPrestamos)
// HU-008: historial con filtros por estado y fechas
router.get('/historial', soloEstudiante, validarFiltrosReporte, historialPrestamos)
router.put('/prestamos/:id/cancelar', soloEstudiante, validarIdPrestamo, cancelarPrestamo)

// QR de una solicitud aprobada lo ve su dueño o el administrador
router.get('/prestamos/:id/qr', verificarTokenJWT, validarIdPrestamo, verQR)
// detalle de un prestamo (despues de /prestamos/mis y /prestamos/:id/qr para no capturar esas rutas)
router.get('/prestamos/:id', verificarTokenJWT, validarIdPrestamo, detallePrestamo)

// HU003el administrador gestiona las solicitudes y escanea el QR
router.get('/prestamos', soloAdministrador, listarPrestamos)
router.put('/prestamos/:id/aprobar', soloAdministrador, validarIdPrestamo, aprobarPrestamo)
router.put('/prestamos/:id/rechazar', soloAdministrador, validarIdPrestamo, validarRechazo, rechazarPrestamo)
// entrega y devolucion: JSON o multipart/form-data con la foto opcional en el campo "evidencia"
router.post('/prestamos/escanear', soloAdministrador, subirEvidenciaPrestamo, validarEscaneo, validarMovimiento, escanearQR)
router.put('/prestamos/:id/entregar', soloAdministrador, validarIdPrestamo, subirEvidenciaPrestamo, validarMovimiento, entregarPrestamo)
router.put('/prestamos/:id/devolver', soloAdministrador, validarIdPrestamo, subirEvidenciaPrestamo, validarMovimiento, devolverPrestamo)

export default router
