import {Router} from 'express'
import {crearRecurso, listarRecursos, detalleRecurso, actualizarRecurso, eliminarRecurso} from '../controllers/recursoController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarRecurso, validarActualizarRecurso, validarIdRecurso} from '../middlewares/validationMiddleware.js'
const router = Router()

// solo el administrador gestiona los recursos
router.use('/recursos', verificarTokenJWT, permitirRoles('administrador'))

router.post('/recursos', validarRecurso, crearRecurso)
router.get('/recursos', listarRecursos)
router.get('/recursos/:id', validarIdRecurso, detalleRecurso)
router.put('/recursos/:id', validarIdRecurso, validarActualizarRecurso, actualizarRecurso)
router.delete('/recursos/:id', validarIdRecurso, eliminarRecurso)

export default router