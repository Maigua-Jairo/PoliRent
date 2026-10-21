import {Router} from 'express'
import {registro, login, logout, perfil, actualizarPerfil, recuperarClave, restablecerClave} from '../controllers/authController.js'
import {verificarTokenJWT} from '../middlewares/authMiddleware.js'
import {validarRegistro, validarLogin, validarActualizarPerfil, validarRecuperarClave, validarRestablecerClave} from '../middlewares/validationMiddleware.js'
const router = Router()

router.post('/registro', validarRegistro, registro)
router.post('/login', validarLogin, login)
router.post('/logout', verificarTokenJWT, logout)
router.get('/perfil', verificarTokenJWT, perfil)
router.put('/perfil', verificarTokenJWT, validarActualizarPerfil, actualizarPerfil)
router.post('/recuperar-clave', validarRecuperarClave, recuperarClave)
router.post('/recuperar-clave/:token', validarRestablecerClave, restablecerClave)

export default router
