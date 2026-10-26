import mongoose from 'mongoose'
// conexiones a la bdd
const conectarBaseDatos = async () =>{
    if(!process.env.MONGODB_URI){
        console.log('Falta la variable MONGODB_URI: crea backend/.env a partir de backend/.env.example')
        process.exit(1)
    }
    try{
    const conexion = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`Base de datos conectada en ${conexion.connection.host}`)
    }catch(error){
    console.log(`Error al conectar en la Base de datos: ${error}`)
    process.exit(1)
    }
}
export default conectarBaseDatos