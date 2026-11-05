import {Router} from 'express'
import {conversar} from '../controllers/asistenteController.js'
import {verificarTokenOpcional} from '../middlewares/authMiddleware.js'
import {validarMensajeAsistente} from '../middlewares/validationMiddleware.js'
const router = Router()

// asistente (chat): ayuda sobre PoliRent y recomendacion de recursos; publico, la sesion es opcional
router.post('/asistente', verificarTokenOpcional, validarMensajeAsistente, conversar)

export default router
