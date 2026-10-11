import 'dotenv/config'
import app from './server.js'
import conectarBaseDatos from './config/database.js'  

const PORT = process.env.PORT || 4000

const iniciar = async () => {
    await conectarBaseDatos()
    app.listen(PORT, ()=>{
        console.log(`Servidor Poli Rent corriendo en el puerto ${PORT}`)
    })
}

iniciar()