// Carga los recursos de ejemplo (src/seed/recursosSeed.js) en la base de datos de MONGODB_URI.
// Uso: npm run seed            -> inserta los que faltan (compara por nombre, sin distinguir mayusculas)
//      npm run seed -- --dry   -> solo muestra lo que insertaria
import 'dotenv/config'
import mongoose from 'mongoose'
import conectarBaseDatos from '../config/database.js'
import Recurso from '../models/Recurso.js'
import RECURSOS_SEED from './recursosSeed.js'

const simulacion = process.argv.includes('--dry')

const sembrar = async () => {
    await conectarBaseDatos()
    const existentes = await Recurso.find().select('nombre').lean()
    const nombres = new Set(existentes.map(r => r.nombre.trim().toLowerCase()))
    const nuevos = RECURSOS_SEED.filter(r => !nombres.has(r.nombre.trim().toLowerCase()))

    console.log(`Recursos en la base: ${existentes.length}. Nuevos por cargar: ${nuevos.length} (de ${RECURSOS_SEED.length}).`)
    if(simulacion){
        nuevos.forEach(r => console.log(`  [${r.categoria}] ${r.nombre} -> ${r.etiquetas.join(', ')}`))
        console.log('Simulacion: no se inserto nada.')
    }else if(nuevos.length){
        await Recurso.insertMany(nuevos.map(r => ({...r, estado: 'disponible'})))
        console.log(`Se insertaron ${nuevos.length} recursos.`)
    }
    await mongoose.disconnect()
}

sembrar().catch(async (error) => {
    console.log(`Error al cargar los recursos: ${error}`)
    await mongoose.disconnect()
    process.exit(1)
})
