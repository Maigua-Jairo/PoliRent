import express from 'express'
import authRouter from './routers/authRouter.js'

const app = express()
app.use(express.json())
app.get('/',(req, res)=>{
    res.json({
        mensaje: 'API de Poli Rent activa :3.'
    })
})
app.use('/api', authRouter)
export default app 