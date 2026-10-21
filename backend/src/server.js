import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import authRouter from './routers/authRouter.js'
import recursoRouter from './routers/recursoRouter.js'
import recomendacionRouter from './routers/recomendacionRouter.js'
import prestamoRouter from './routers/prestamoRouter.js'
import {rutaNoEncontrada, manejarErrores} from './middlewares/errorHandler.js'

const app = express()

// FRONTEND_URL admite varios origenes separados por coma; sin definir se permite cualquiera (desarrollo)
const origenes = process.env.FRONTEND_URL?.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
app.use(cors({origin: origenes?.length ? origenes : true}))
if(process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
app.use(express.json())

app.get('/',(req, res)=>{
    res.json({
        mensaje: 'API de Poli Rent activa :3.'
    })
})
app.use('/api', authRouter)
app.use('/api', recursoRouter)
app.use('/api', recomendacionRouter)
app.use('/api', prestamoRouter)

app.use(rutaNoEncontrada)
app.use(manejarErrores)
export default app