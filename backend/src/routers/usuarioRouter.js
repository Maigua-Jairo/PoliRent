import {Router} from 'express'
import {listarUsuarios, eliminarUsuario, eliminarMiCuenta} from '../controllers/usuarioController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {permitirRoles} from '../middlewares/roleMiddleware.js'
import {validarIdUsuario, validarEliminarCuenta} from '../middlewares/validationMiddleware.js'
const router = Router()

const soloEstudiante = [verificarTokenJWT, permitirRoles('estudiante')]
const soloAdministrador = [verificarTokenJWT, permitirRoles('administrador')]

// el administrador consulta y elimina alumnos
router.get('/usuarios', soloAdministrador, listarUsuarios)
router.delete('/usuarios/:id', soloAdministrador, validarIdUsuario, eliminarUsuario)

// el alumno elimina su propia cuenta
router.delete('/perfil', soloEstudiante, validarEliminarCuenta, eliminarMiCuenta)

export default router
