// Asigna el precio de reposicion (preciosRecursos.js) a los recursos ya cargados en la base de MONGODB_URI.
// Uso: npm run precios               -> pone precio solo a los recursos sin precio (0 o sin definir)
//      npm run precios -- --forzar   -> tambien sobrescribe los que ya tienen precio
//      npm run precios -- --dry      -> solo muestra "nombre -> precio", sin escribir
// El nombre se compara sin tildes ni mayusculas. Solo se modifica el campo precio.
import 'dotenv/config'
import mongoose from 'mongoose'
import conectarBaseDatos from '../config/database.js'
import Recurso from '../models/Recurso.js'
import PRECIOS_RECURSOS from './preciosRecursos.js'
import {planificarPrecios} from './preciosLogica.js'

const simulacion = process.argv.includes('--dry')
const forzar = process.argv.includes('--forzar')

const asignarPrecios = async () => {
    await conectarBaseDatos()
    const recursos = await Recurso.find().select('nombre precio').lean()
    const plan = planificarPrecios(recursos, PRECIOS_RECURSOS, {forzar})

    console.log(`Recursos en la base: ${recursos.length}.`)
    plan.actualizar.forEach(r => console.log(`  ${r.nombre} -> ${r.precio}${r.anterior ? ` (antes ${r.anterior})` : ''}`))
    if(simulacion){
        console.log(`Simulacion: se actualizarian ${plan.actualizar.length} recursos; no se escribio nada.`)
    }else if(plan.actualizar.length){
        // solo se modifica el campo precio
        await Recurso.bulkWrite(plan.actualizar.map(r => ({
            updateOne: {filter: {_id: r._id}, update: {$set: {precio: r.precio}}}
        })))
        console.log(`Se actualizaron ${plan.actualizar.length} recursos.`)
    }else{
        console.log('No hay precios por actualizar.')
    }
    console.log(`Ya tenian precio: ${plan.conPrecio.length}.`)
    if(plan.sinTabla.length){
        console.log(`No estan en la tabla de precios (quedan sin precio): ${plan.sinTabla.length}`)
        plan.sinTabla.forEach(nombre => console.log(`  - ${nombre}`))
    }
    await mongoose.disconnect()
}

asignarPrecios().catch(async (error) => {
    console.log(`Error al asignar los precios: ${error}`)
    await mongoose.disconnect()
    process.exit(1)
})
