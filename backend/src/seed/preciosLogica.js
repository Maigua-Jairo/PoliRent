// Logica pura del script `npm run precios` (sin base de datos, para probarla)

// nombre comparable: sin espacios a los lados, en minusculas y sin tildes
const normalizarNombre = (nombre) => String(nombre ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// tabla {nombre: precio} -> Map(nombre normalizado -> precio)
const tablaNormalizada = (precios) => new Map(Object.entries(precios).map(([nombre, precio]) => [normalizarNombre(nombre), precio]))

const tienePrecio = (recurso) => Number(recurso.precio) > 0

/**
 * Decide que recursos actualizar.
 * @param {Array<{_id, nombre, precio}>} recursos  recursos de la base
 * @param {Object} precios  PRECIOS_RECURSOS
 * @param {{forzar?: boolean}} opciones  forzar: tambien sobrescribe los que ya tienen precio
 * @returns {{actualizar: Array<{_id, nombre, precio, anterior}>, conPrecio: string[], sinTabla: string[]}}
 */
const planificarPrecios = (recursos, precios, {forzar = false} = {}) => {
    const tabla = tablaNormalizada(precios)
    const plan = {actualizar: [], conPrecio: [], sinTabla: []}
    for(const recurso of recursos){
        const precio = tabla.get(normalizarNombre(recurso.nombre))
        if(precio === undefined){
            plan.sinTabla.push(recurso.nombre)
        }else if(tienePrecio(recurso) && (!forzar || Number(recurso.precio) === precio)){
            plan.conPrecio.push(recurso.nombre)
        }else{
            plan.actualizar.push({_id: recurso._id, nombre: recurso.nombre, precio, anterior: recurso.precio ?? 0})
        }
    }
    return plan
}

export {normalizarNombre, tablaNormalizada, planificarPrecios}
