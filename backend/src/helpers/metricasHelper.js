// Metricas de reposicion e inventario (funciones puras, sin base de datos)
import {MS_DIA} from './politicasHelper.js'

const USADOS = ['entregado', 'devuelto']
const DIAS_OCUPACION = 30
const UMBRAL_ALTA_DEMANDA = 60
const CONDICIONES_DANO = ['danado', 'incompleto']
// peso de cada razon para ordenar de mas a menos urgente
const PESO_RAZON = {perdido: 4, danos_frecuentes: 3, alta_demanda: 2, en_mantenimiento: 1}
const redondear1 = (x) => Math.round(x * 10) / 10
const redondear2 = (x) => Math.round(x * 100) / 100

// porcentaje (0-100, 1 decimal) de los ultimos `dias` en que el recurso estuvo entregado
const ocupacion = (prestamos, ahora = new Date(), dias = DIAS_OCUPACION) => {
    const fin = new Date(ahora).getTime()
    const inicio = fin - dias * MS_DIA
    const intervalos = prestamos
        .filter(p => USADOS.includes(p.estado) && p.fechaEntrega)
        .map(p => [
            Math.max(new Date(p.fechaEntrega).getTime(), inicio),
            Math.min(p.fechaDevolucionReal ? new Date(p.fechaDevolucionReal).getTime() : fin, fin)
        ])
        .filter(([a, b]) => b > a)
        .sort((x, y) => x[0] - y[0])
    // une los intervalos que se solapan para no contar dos veces el mismo tiempo
    let ocupado = 0
    let actual = null
    for(const [a, b] of intervalos){
        if(actual && a <= actual[1]){
            actual[1] = Math.max(actual[1], b)
        }else{
            if(actual) ocupado += actual[1] - actual[0]
            actual = [a, b]
        }
    }
    if(actual) ocupado += actual[1] - actual[0]
    return Math.min(100, redondear1(ocupado / (fin - inicio) * 100))
}

const condicionDe = (p) => p.devolucion?.condicion

// recursos que necesitan reposicion o ampliar inventario, de mas a menos urgente
const recursosParaReponer = (recursos, prestamos, ahora = new Date(), limite = 10) => {
    const porRecurso = new Map()
    for(const p of prestamos){
        const id = String(p.recurso?._id ?? p.recurso)
        if(!porRecurso.has(id)) porRecurso.set(id, [])
        porRecurso.get(id).push(p)
    }
    return recursos
        .map(r => {
            const suyos = porRecurso.get(String(r._id)) ?? []
            const devueltos = suyos.filter(p => p.estado === 'devuelto')
            const danos = devueltos.filter(p => CONDICIONES_DANO.includes(condicionDe(p))).length
            const perdidas = devueltos.filter(p => condicionDe(p) === 'perdido').length
            const ocupacion30Dias = ocupacion(suyos, ahora)
            const razones = []
            if(perdidas > 0) razones.push('perdido')
            if(danos > 0) razones.push('danos_frecuentes')
            if(ocupacion30Dias >= UMBRAL_ALTA_DEMANDA) razones.push('alta_demanda')
            if(r.estado === 'mantenimiento') razones.push('en_mantenimiento')
            return {
                recurso: {_id: r._id, nombre: r.nombre, categoria: r.categoria, estado: r.estado},
                vecesPrestado: suyos.filter(p => USADOS.includes(p.estado)).length,
                ocupacion30Dias,
                incidentes: devueltos.filter(p => condicionDe(p) && condicionDe(p) !== 'bueno').length,
                razones,
                urgencia: razones.reduce((s, razon) => s + PESO_RAZON[razon], 0)
            }
        })
        .filter(r => r.razones.length)
        .sort((a, b) => b.urgencia - a.urgencia || b.incidentes - a.incidentes || b.ocupacion30Dias - a.ocupacion30Dias
            || b.vecesPrestado - a.vecesPrestado || a.recurso.nombre.localeCompare(b.recurso.nombre))
        .slice(0, limite)
        .map(({urgencia, ...resto}) => resto)
}

// resumen de penalizaciones por estado y monto por tipo (las anuladas no suman monto por tipo)
const resumenPenalizaciones = (penalizaciones) => {
    const deEstado = (estado) => penalizaciones.filter(p => p.estado === estado)
    const monto = (lista) => redondear2(lista.reduce((s, p) => s + (Number(p.monto) || 0), 0))
    const vigentes = penalizaciones.filter(p => p.estado !== 'anulada')
    return {
        pendientes: {cantidad: deEstado('pendiente').length, monto: monto(deEstado('pendiente'))},
        // comprobante subido, a la espera de que el administrador lo revise
        enRevision: {cantidad: deEstado('en_revision').length, monto: monto(deEstado('en_revision'))},
        pagadas: {cantidad: deEstado('pagada').length, monto: monto(deEstado('pagada'))},
        anuladas: {cantidad: deEstado('anulada').length},
        montoPorTipo: {
            atraso: monto(vigentes.filter(p => p.tipo === 'atraso')),
            danio: monto(vigentes.filter(p => p.tipo === 'danio')),
            perdida: monto(vigentes.filter(p => p.tipo === 'perdida'))
        }
    }
}

// porcentajes con 1 decimal que suman exactamente 100 (metodo del mayor residuo)
const porcentajes = (montos) => {
    const total = montos.reduce((s, m) => s + m, 0)
    if(total <= 0) return montos.map(() => 0)
    const decimas = montos.map(m => m / total * 1000)
    const base = decimas.map(Math.floor)
    let faltan = 1000 - base.reduce((s, d) => s + d, 0)
    const orden = decimas.map((d, i) => [d - base[i], i]).sort((a, b) => b[0] - a[0])
    for(const [, i] of orden){
        if(faltan <= 0) break
        base[i] += 1
        faltan -= 1
    }
    return base.map(d => d / 10)
}

// agrupa las pagadas por `clave`, ordena de mayor a menor monto y agrega el porcentaje del total recaudado
const agruparRecaudo = (pagadas, clave, describir) => {
    const grupos = new Map()
    for(const p of pagadas){
        const k = clave(p)
        const g = grupos.get(k) ?? {cantidad: 0, monto: 0}
        g.cantidad += 1
        g.monto = redondear2(g.monto + (Number(p.monto) || 0))
        grupos.set(k, g)
    }
    const lista = [...grupos.entries()]
        .map(([k, g]) => ({...describir(k), cantidad: g.cantidad, monto: g.monto}))
        .sort((a, b) => b.monto - a.monto || b.cantidad - a.cantidad)
    const pct = porcentajes(lista.map(g => g.monto))
    return lista.map((g, i) => ({...g, porcentaje: pct[i]}))
}

// dinero recaudado (solo penalizaciones pagadas) en total, por recurso y por tipo.
// `recursos`: Map id -> {nombre}. Ej.: de $100 recaudados, $25 (25 %) fueron por el balon de voley
const recaudado = (penalizaciones, recursos = new Map()) => {
    const pagadas = penalizaciones.filter(p => p.estado === 'pagada')
    return {
        total: redondear2(pagadas.reduce((s, p) => s + (Number(p.monto) || 0), 0)),
        porRecurso: agruparRecaudo(pagadas, p => String(p.recurso?._id ?? p.recurso ?? ''), (id) => ({
            recurso: id || null,
            nombre: recursos.get(id)?.nombre ?? 'Recurso eliminado'
        })),
        porTipo: agruparRecaudo(pagadas, p => p.tipo, (tipo) => ({tipo}))
    }
}

export {ocupacion, recursosParaReponer, resumenPenalizaciones, recaudado, porcentajes, UMBRAL_ALTA_DEMANDA, DIAS_OCUPACION}
