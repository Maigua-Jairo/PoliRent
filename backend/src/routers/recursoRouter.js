import {Router} from 'express'
import {crearRecurso, listarRecursos, detalleRecurso, actualizarRecurso, eliminarRecurso} from '../controllers/recursoController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {subirImagenRecurso} from '../middlewares/uploadMiddleware.js'
import {validarRecurso, validarActualizarRecurso, validarIdRecurso} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// consulta publica del catalogo (invitados, estudiantes y administradores)
router.get('/recursos', listarRecursos)
router.get('/recursos/:id', validarIdRecurso, detalleRecurso)

// solo el administrador gestiona los recursos (la imagen llega como multipart/form-data en el campo "imagen")
router.post('/recursos', soloAdministrador, subirImagenRecurso, validarRecurso, crearRecurso)
router.put('/recursos/:id', soloAdministrador, validarIdRecurso, subirImagenRecurso, validarActualizarRecurso, actualizarRecurso)
router.delete('/recursos/:id', soloAdministrador, validarIdRecurso, eliminarRecurso)

export default router
