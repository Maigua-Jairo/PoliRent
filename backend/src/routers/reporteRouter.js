import {Router} from 'express'
import {metricas, reportePrestamos, reporteRecursos} from '../controllers/reporteController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarFiltrosReporte} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// HU-004: el administrador consulta metricas y genera reportes (solo lectura)
router.get('/metricas', soloAdministrador, metricas)
router.get('/reportes/prestamos', soloAdministrador, validarFiltrosReporte, reportePrestamos)
router.get('/reportes/recursos', soloAdministrador, validarFiltrosReporte, reporteRecursos)

export default router
