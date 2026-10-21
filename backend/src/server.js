import express from 'express'
import authRouter from './routers/authRouter.js'
import recursoRouter from './routers/recursoRouter.js'

const app = express()
app.use(express.json())
app.get('/',(req, res)=>{
    res.json({
        mensaje: 'API de Poli Rent activa :3.'
    })
})
app.use('/api', authRouter)
app.use('/api', recursoRouter)
export default app 