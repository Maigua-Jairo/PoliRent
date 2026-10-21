import 'dotenv/config'
import app from './server.js'
import conectarBaseDatos from './config/database.js'
import {configurarCloudinary, cloudinaryConfigurado} from './config/cloudinary.js'

const PORT = process.env.PORT || 4000

const iniciar = async () => {
    await conectarBaseDatos()
    configurarCloudinary()
    if(!cloudinaryConfigurado()){
        console.log('Cloudinary sin configurar: la subida de imagenes estara deshabilitada')
    }
    app.listen(PORT, ()=>{
        console.log(`Servidor Poli Rent corriendo en el puerto ${PORT}`)
    })
}

iniciar()
