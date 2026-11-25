// Politicas de prestamo: penalizaciones, horario de entrega/devolucion y terminos y condiciones.
// Funciones puras (sin base de datos). Leen process.env al llamarse para poder cambiarlas en las pruebas.

const ZONA_HORARIA = 'America/Guayaquil'
// Ecuador no tiene horario de verano: siempre UTC-5
const DESFASE_ECUADOR = '-05:00'
const TOPE_PORCENTAJE = 100
const TERMINOS_VERSION = '1.0'
const CONDICIONES = ['bueno', 'danado', 'incompleto', 'perdido']
const MS_DIA = 24 * 60 * 60 * 1000
// plazo maximo de un prestamo en dias calendario (lo valida validarSolicitudPrestamo y lo explica el asistente)
const DIAS_MAX_PRESTAMO = 30

const numeroEntorno = (nombre, defecto) => {
    const valor = Number(process.env[nombre])
    return process.env[nombre] !== undefined && process.env[nombre] !== '' && Number.isFinite(valor) && valor >= 0 ? valor : defecto
}
const horaEntorno = (nombre, defecto) => {
    const valor = process.env[nombre]?.trim()
    return valor && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor) ? valor : defecto
}
const aMinutos = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
}
const redondear = (x) => Math.round(x * 100) / 100

// entero >= minimo leido de una variable de entorno (si no es valido, el valor por defecto)
const enteroEntorno = (nombre, defecto, minimo = 0) => {
    const valor = numeroEntorno(nombre, defecto)
    return Number.isInteger(valor) && valor >= minimo ? valor : defecto
}

// maximo de solicitudes activas (pendiente, aprobado o entregado) que un estudiante puede tener a la vez
const maxSolicitudesActivas = () => enteroEntorno('MAX_SOLICITUDES_ACTIVAS', 5, 1)

// longitud permitida del motivo con el que el administrador rechaza una solicitud
const limitesMotivoRechazo = () => {
    const min = enteroEntorno('MOTIVO_RECHAZO_MIN', 30, 1)
    const max = enteroEntorno('MOTIVO_RECHAZO_MAX', 200, 1)
    return max >= min ? {min, max} : {min: 30, max: 200}
}

// minutos antes de la hora programada en los que ya se puede registrar la entrega
const toleranciaEntregaMin = () => enteroEntorno('ENTREGA_TOLERANCIA_MIN', 30)

// dias maximos de anticipacion con los que se puede programar la entrega
const reservaMaxDiasAnticipacion = () => enteroEntorno('RESERVA_MAX_DIAS_ANTICIPACION', 30)

// horas antes de la devolucion en las que se envia un recordatorio (de mayor a menor, sin repetidas)
const horasRecordatorio = () => {
    const texto = process.env.RECORDATORIO_HORAS_ANTES
    const lista = typeof texto === 'string' && texto.trim()
        ? texto.split(',').map(h => Number(h.trim())).filter(h => Number.isFinite(h) && h > 0)
        : []
    return [...new Set(lista.length ? lista : [24, 1])].sort((a, b) => b - a)
}

// cada cuantos minutos se revisan los recordatorios de devolucion
const intervaloRecordatorioMin = () => enteroEntorno('RECORDATORIO_INTERVALO_MIN', 15, 1)

// tarifas en porcentaje del precio del recurso
const tarifas = () => ({
    atrasoPorDia: numeroEntorno('PENALIZACION_ATRASO_DIA', 5),
    danio: numeroEntorno('PENALIZACION_DANIO', 20),
    perdida: numeroEntorno('PENALIZACION_PERDIDA', 100),
    tope: TOPE_PORCENTAJE
})

// horario permitido para entregar y devolver (hora de Ecuador)
const horario = () => ({
    inicio: horaEntorno('HORARIO_INICIO', '07:00'),
    fin: horaEntorno('HORARIO_FIN', '18:00'),
    zona: ZONA_HORARIA
})

// con VALIDAR_HORARIO=false no se valida el horario (desarrollo y pruebas)
const horarioActivo = () => process.env.VALIDAR_HORARIO !== 'false'

// minutos desde la medianoche en hora de Ecuador
const minutosDelDia = (fecha) => {
    const partes = new Intl.DateTimeFormat('en-GB', {timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})
        .formatToParts(new Date(fecha))
    const hora = Number(partes.find(p => p.type === 'hour').value) % 24
    const minuto = Number(partes.find(p => p.type === 'minute').value)
    return hora * 60 + minuto
}

// inicio y fin inclusive
const dentroDeHorario = (fecha = new Date()) => {
    const {inicio, fin} = horario()
    const minutos = minutosDelDia(fecha)
    return minutos >= aMinutos(inicio) && minutos <= aMinutos(fin)
}

const mensajeHorario = () => {
    const {inicio, fin} = horario()
    return `La entrega y la devolucion solo se registran entre las ${inicio} y las ${fin} (hora de Ecuador)`
}

// fecha AAAA-MM-DD de un instante en hora de Ecuador
const fechaEcuador = (fecha) => new Intl.DateTimeFormat('en-CA', {timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit'})
    .format(new Date(fecha))

// "AAAA-MM-DD" de un dia que existe (descarta 2026-02-31)
const esFechaISO = (texto) => typeof texto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(texto)
    && !Number.isNaN(Date.parse(texto)) && new Date(texto).toISOString().slice(0, 10) === texto
// "HH:mm" de 00:00 a 23:59
const esHora = (texto) => typeof texto === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto)
// dia "AAAA-MM-DD" a la hora "HH:mm" de Ecuador
const combinarFechaHora = (fecha, hora) => new Date(`${fecha}T${hora}:00${DESFASE_ECUADOR}`)
// "AAAA-MM-DD" del dia siguiente a `fecha` en Ecuador
const diaSiguiente = (fecha) => fechaEcuador(new Date(combinarFechaHora(fecha, '12:00').getTime() + MS_DIA))

// "dd/MM/yyyy HH:mm" en hora de Ecuador (para mensajes y notificaciones)
const formatearFechaHora = (fecha) => {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(fecha)).map(p => [p.type, p.value]))
    return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`
}

// "AAAA-MM-DD" -> ese dia a la hora de fin del horario en Ecuador; con hora -> new Date(valor); invalida -> null
const normalizarFechaDevolucion = (valor) => {
    if(typeof valor !== 'string' && !(valor instanceof Date)) return null
    if(typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())){
        const texto = valor.trim()
        // descarta fechas imposibles como 2026-02-31
        if(Number.isNaN(Date.parse(texto)) || new Date(texto).toISOString().slice(0, 10) !== texto) return null
        return new Date(`${texto}T${horario().fin}:00${DESFASE_ECUADOR}`)
    }
    const fecha = new Date(valor)
    return Number.isNaN(fecha.getTime()) ? null : fecha
}

// ultimo instante (23:59:59.999 hora de Ecuador) del dia "hoy + dias": el limite se cuenta por dias calendario
const limiteMaximoDevolucion = (dias, ahora = new Date()) => {
    const hoy = new Date(`${fechaEcuador(ahora)}T00:00:00${DESFASE_ECUADOR}`)
    const destino = fechaEcuador(new Date(hoy.getTime() + dias * MS_DIA + 12 * 60 * 60 * 1000))
    return new Date(`${destino}T23:59:59.999${DESFASE_ECUADOR}`)
}

// atraso: cada dia o fraccion de dia cobra atrasoPorDia % del precio, hasta el precio completo
const calcularAtraso = (fechaDevolucion, fechaReal, precio) => {
    const diferencia = new Date(fechaReal) - new Date(fechaDevolucion)
    const dias = diferencia > 0 ? Math.ceil(diferencia / MS_DIA) : 0
    const base = Number(precio) || 0
    const monto = redondear(Math.min(base * tarifas().atrasoPorDia / 100 * dias, base))
    return {dias, monto}
}

const DESCRIPCIONES = {
    danado: 'Recurso devuelto danado',
    incompleto: 'Recurso devuelto incompleto'
}

// penalizaciones de una devolucion; el total de un mismo prestamo nunca supera el precio del recurso
const calcularPenalizaciones = ({precio, fechaDevolucion, fechaDevolucionReal, condicion = 'bueno'}) => {
    const base = Number(precio) || 0
    if(base <= 0) return {penalizaciones: [], total: 0, sinPrecio: true}
    const t = tarifas()
    const tope = base * t.tope / 100
    const penalizaciones = []

    if(condicion === 'perdido'){
        penalizaciones.push({tipo: 'perdida', monto: redondear(Math.min(base * t.perdida / 100, tope)), descripcion: 'Recurso perdido'})
    }else{
        if(['danado', 'incompleto'].includes(condicion)){
            penalizaciones.push({tipo: 'danio', monto: redondear(Math.min(base * t.danio / 100, tope)), descripcion: DESCRIPCIONES[condicion]})
        }
        const atraso = calcularAtraso(fechaDevolucion, fechaDevolucionReal, base)
        if(atraso.dias > 0){
            const acumulado = penalizaciones.reduce((s, p) => s + p.monto, 0)
            const monto = redondear(Math.max(0, Math.min(atraso.monto, tope - acumulado)))
            penalizaciones.push({tipo: 'atraso', monto, dias: atraso.dias, descripcion: `Atraso de ${atraso.dias} dia(s) en la devolucion`})
        }
    }
    const validas = penalizaciones.filter(p => p.monto > 0)
    return {penalizaciones: validas, total: redondear(validas.reduce((s, p) => s + p.monto, 0)), sinPrecio: false}
}

// terminos y condiciones que el estudiante acepta al solicitar
const textoTerminos = () => {
    const t = tarifas()
    const h = horario()
    const maximo = maxSolicitudesActivas()
    return {
        version: TERMINOS_VERSION,
        tarifas: t,
        horario: h,
        maxSolicitudesActivas: maximo,
        condiciones: [
            `Si el recurso se devuelve danado o incompleto, pagaras el ${t.danio} % de su precio.`,
            `Si pierdes el recurso, debes reponerlo completo o pagar el ${t.perdida} % de su precio.`,
            `Por cada dia o fraccion de atraso en la devolucion pagaras el ${t.atrasoPorDia} % del precio del recurso, hasta un maximo del ${t.tope} %.`,
            `La entrega y la devolucion solo se realizan entre las ${h.inicio} y las ${h.fin} (hora de Ecuador).`,
            'Si no devuelves el recurso, la asociacion contactara a tu docente de referencia.',
            'Mientras tengas penalizaciones pendientes no podras solicitar nuevos recursos.',
            `Puedes tener como maximo ${maximo} solicitudes activas (pendientes, aprobadas o entregadas) al mismo tiempo.`
        ]
    }
}

export {
    ZONA_HORARIA, TOPE_PORCENTAJE, TERMINOS_VERSION, CONDICIONES, MS_DIA, DIAS_MAX_PRESTAMO,
    tarifas, horario, horarioActivo, minutosDelDia, dentroDeHorario, mensajeHorario,
    normalizarFechaDevolucion, limiteMaximoDevolucion, calcularAtraso, calcularPenalizaciones, textoTerminos,
    maxSolicitudesActivas, limitesMotivoRechazo, toleranciaEntregaMin, reservaMaxDiasAnticipacion, horasRecordatorio, intervaloRecordatorioMin,
    fechaEcuador, esFechaISO, esHora, combinarFechaHora, diaSiguiente, formatearFechaHora
}
