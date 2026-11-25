import {FACULTADES} from '../models/Usuario.js'
import {ESTADOS_PRESTAMO} from '../models/Prestamo.js'
import {ESTADOS_PENALIZACION} from '../models/Penalizacion.js'
import {CATEGORIAS, ESTADOS} from '../models/Recurso.js'
import {CONDICIONES, DIAS_MAX_PRESTAMO, normalizarFechaDevolucion, limiteMaximoDevolucion, horarioActivo, dentroDeHorario, horario,
    limitesMotivoRechazo, reservaMaxDiasAnticipacion, fechaEcuador, esFechaISO, esHora, combinarFechaHora, diaSiguiente} from '../helpers/politicasHelper.js'

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(\s[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/
const textoValido = (v) => typeof v === 'string' && v.trim().length > 0

// --- reglas compartidas (las mismas que aplica el frontend en utils/validaciones.js) ---

const errorNombre = (valor, campo) => {
    if(!textoValido(valor)) return `${campo} es obligatorio`
    const texto = valor.trim()
    if(texto.length < 2) return `${campo} es demasiado corto`
    if(!SOLO_LETRAS.test(texto)) return `${campo} solo puede contener letras`
    return ''
}

// cedula ecuatoriana: 10 digitos, provincia 01-24 (o 30), tercer digito < 6 y digito verificador (modulo 10)
const errorCedula = (cedula) => {
    if(typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) return 'La cedula debe tener 10 digitos'
    const provincia = Number(cedula.slice(0, 2))
    if(!((provincia >= 1 && provincia <= 24) || provincia === 30) || Number(cedula[2]) >= 6){
        return 'La cedula no es valida'
    }
    const suma = cedula.slice(0, 9).split('').reduce((acc, d, i) => {
        let n = Number(d) * (i % 2 === 0 ? 2 : 1)
        if(n > 9) n -= 9
        return acc + n
    }, 0)
    return (10 - (suma % 10)) % 10 === Number(cedula[9]) ? '' : 'La cedula no es valida'
}

// solo "usuario@epn.edu.ec" exacto (sin distinguir mayusculas): rechaza a@epn.edu.ec.com, a@xepn.edu.ec, a@b@epn.edu.ec y espacios internos
const dominioInstitucional = () => (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'epn.edu.ec').trim().toLowerCase()
const errorCorreoInstitucional = (correo) => {
    if(!textoValido(correo)) return 'El campo correo es obligatorio'
    const dominio = dominioInstitucional()
    const texto = correo.trim().toLowerCase()
    const partes = texto.split('@')
    if(partes.length !== 2 || partes[1] !== dominio || !/^[a-z0-9._%+-]+$/.test(partes[0])) return `Usa tu correo institucional @${dominio}`
    return ''
}

const errorTelefono = (telefono) =>
    typeof telefono === 'string' && /^09\d{8}$/.test(telefono) ? '' : 'El telefono debe tener el formato 09XXXXXXXX'

const errorFacultad = (facultad) =>
    FACULTADES.includes(facultad) ? '' : `La facultad debe ser: ${FACULTADES.join(', ')}`

const errorPassword = (password) => {
    if(!textoValido(password)) return 'La contraseña es obligatoria'
    if(password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    if(!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)){
        return 'La contraseña debe incluir mayusculas, minusculas y numeros'
    }
    return ''
}

// nombres de campos que se cambiaron por otros mas claros: si llega el viejo (y no el nuevo) se explica el cambio
const errorCampoRenombrado = (cuerpo, viejo, nuevo) =>
    cuerpo?.[viejo] !== undefined && cuerpo?.[nuevo] === undefined ? `El campo ${viejo} ahora se llama ${nuevo}` : ''

// devuelve el primer error encontrado o continua
const responderPrimerError = (errores, res, next) => {
    const error = errores.find(Boolean)
    if(error) return res.status(400).json({msg: error})
    next()
}

// campo de texto obligatorio: ausente o solo espacios, objeto o arreglo (operadores NoSQL) y longitud maxima.
// `nombre` es el que ve el usuario en el mensaje ("El campo contrasena es obligatorio")
const errorCampoObligatorio = (valor, nombre, max) => {
    if(valor === undefined || valor === null) return `El campo ${nombre} es obligatorio`
    if(typeof valor !== 'string') return `El campo ${nombre} debe ser texto`
    if(!valor.trim()) return `El campo ${nombre} es obligatorio`
    if(max && valor.trim().length > max) return `El campo ${nombre} debe tener maximo ${max} caracteres`
    return ''
}

// [campo del cuerpo, nombre en el mensaje, longitud maxima]
const CAMPOS_REGISTRO = [
    ['nombres', 'nombres', 50], ['apellidos', 'apellidos', 50], ['cedula', 'cedula', 10], ['correo', 'correo', 100],
    ['telefono', 'telefono', 10], ['facultad', 'facultad', 100], ['password', 'contrasena', 72]
]
const CAMPOS_LOGIN = [['correo', 'correo', 100], ['password', 'contrasena', 72]]

// valida los datos recibidos al registrarse
const validarRegistro = (req, res, next) => {
    const cuerpo = req.body ?? {}
    const faltante = CAMPOS_REGISTRO.map(([campo, nombre, max]) => errorCampoObligatorio(cuerpo[campo], nombre, max)).find(Boolean)
    if(faltante){
        return res.status(400).json({msg: faltante})
    }
    const {nombres, apellidos, cedula, correo, telefono, facultad, password} = cuerpo
    responderPrimerError([
        errorNombre(nombres, 'El nombre'),
        errorNombre(apellidos, 'El apellido'),
        errorCedula(cedula),
        errorCorreoInstitucional(correo),
        errorTelefono(telefono),
        errorFacultad(facultad),
        errorPassword(password)
    ], res, next)
}

// valida los datos recibidos al iniciar sesion (no exige el dominio institucional: el administrador puede tener otro)
const validarLogin = (req, res, next) => {
    const cuerpo = req.body ?? {}
    const error = CAMPOS_LOGIN.map(([campo, nombre, max]) => errorCampoObligatorio(cuerpo[campo], nombre, max)).find(Boolean)
    if(error){
        return res.status(400).json({msg: error})
    }
    next()
}

// valida los datos recibidos al modificar el perfil
// la cedula y el correo no se pueden modificar
const validarActualizarPerfil = (req, res, next) => {
    const {nombres, apellidos, telefono, facultad, password, passwordActual} = req.body
    if([nombres, apellidos, telefono, facultad, password].every(v => v === undefined)){
        return res.status(400).json({msg: 'Envia al menos un campo a modificar'})
    }
    if(password !== undefined && !textoValido(passwordActual)){
        return res.status(400).json({msg: 'Debes enviar la contraseña actual'})
    }
    if(facultad !== undefined && req.usuarioHeader?.rol === 'administrador'){
        return res.status(400).json({msg: 'El administrador no tiene facultad'})
    }
    responderPrimerError([
        nombres !== undefined && errorNombre(nombres, 'El nombre'),
        apellidos !== undefined && errorNombre(apellidos, 'El apellido'),
        telefono !== undefined && errorTelefono(telefono),
        facultad !== undefined && errorFacultad(facultad),
        password !== undefined && errorPassword(password)
    ], res, next)
}

// valida el correo al solicitar la recuperacion de clave
const validarRecuperarClave = (req, res, next) => {
    const {correo} = req.body
    if(!textoValido(correo) || !REGEX_CORREO.test(correo.trim())){
        return res.status(400).json({msg: 'Debes enviar un correo valido'})
    }
    next()
}

// valida la nueva clave al restablecerla
const validarRestablecerClave = (req, res, next) => {
    const {password, confirmarPassword} = req.body
    if(!textoValido(password) || !textoValido(confirmarPassword)){
        return res.status(400).json({msg: 'Todos los campos son obligatorios'})
    }
    const error = errorPassword(password)
    if(error){
        return res.status(400).json({msg: error})
    }
    if(password !== confirmarPassword){
        return res.status(400).json({msg: 'Las contraseñas no coinciden'})
    }
    next()
}
// hu002 recursos (CATEGORIAS y ESTADOS salen del modelo Recurso)
const RECURSO_NOMBRE = {min: 3, max: 80}
const RECURSO_DESCRIPCION = {min: 10, max: 500}
const PRECIO_MAXIMO = 100000
const ETIQUETAS_MAX = 15
const ETIQUETA_LARGO = {min: 2, max: 30}
// campos que maneja el sistema: el cliente no puede enviarlos
const CAMPOS_SISTEMA_RECURSO = ['_id', 'imagenId', 'createdAt', 'updatedAt', '__v']

const sinTildes = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
// quita los espacios de los extremos y deja un solo espacio entre palabras
const limpiarTexto = (texto) => texto.trim().replace(/\s+/g, ' ')

const errorNombreRecurso = (nombre) => {
    if(nombre === undefined || nombre === null || nombre === '') return 'El nombre del recurso es obligatorio'
    if(typeof nombre !== 'string') return 'El nombre del recurso debe ser texto'
    if(!nombre.trim()) return 'El nombre del recurso es obligatorio'
    const largo = limpiarTexto(nombre).length
    if(largo < RECURSO_NOMBRE.min || largo > RECURSO_NOMBRE.max){
        return `El nombre del recurso debe tener entre ${RECURSO_NOMBRE.min} y ${RECURSO_NOMBRE.max} caracteres`
    }
    return ''
}

const errorCategoriaRecurso = (categoria) => {
    if(categoria === undefined || categoria === null || categoria === '') return 'La categoria del recurso es obligatoria'
    return CATEGORIAS.includes(categoria) ? '' : `La categoria del recurso debe ser: ${CATEGORIAS.join(', ')}`
}

const errorEstadoRecurso = (estado) =>
    ESTADOS.includes(estado) ? '' : `El estado del recurso debe ser: ${ESTADOS.join(', ')}`

// descripcion opcional: vacia, o de RECURSO_DESCRIPCION.min a .max caracteres
const errorDescripcionRecurso = (descripcion) => {
    if(typeof descripcion !== 'string') return 'La descripcion del recurso debe ser texto'
    const largo = descripcion.trim().length
    if(largo > 0 && (largo < RECURSO_DESCRIPCION.min || largo > RECURSO_DESCRIPCION.max)){
        return `La descripcion del recurso debe tener entre ${RECURSO_DESCRIPCION.min} y ${RECURSO_DESCRIPCION.max} caracteres (o dejarse vacia)`
    }
    return ''
}

// precio de reposicion: numero (o texto numerico, porque en multipart/form-data llega como string) mayor que 0, hasta 100000 y con 2 decimales como maximo
const MSG_PRECIO = `El precio del recurso debe ser un numero mayor que 0 y de maximo ${PRECIO_MAXIMO}, con hasta 2 decimales`
const errorPrecioRecurso = (precio) => {
    let numero
    if(typeof precio === 'number') numero = precio
    else if(typeof precio === 'string' && /^\d+(\.\d+)?$/.test(precio.trim())) numero = Number(precio.trim())
    else return MSG_PRECIO
    if(!Number.isFinite(numero) || numero <= 0 || numero > PRECIO_MAXIMO) return MSG_PRECIO
    if(Math.abs(numero * 100 - Math.round(numero * 100)) > 1e-9) return MSG_PRECIO
    return ''
}

// etiquetas: arreglo de textos (JSON) o texto separado por comas (multipart); maximo 15, de 2 a 30 caracteres y sin repetir
const errorEtiquetasRecurso = (valor) => {
    const lista = typeof valor === 'string' ? valor.split(',') : valor
    if(!Array.isArray(lista) || !lista.every(e => typeof e === 'string')){
        return 'Las etiquetas del recurso deben ser una lista de textos o un texto separado por comas'
    }
    const limpias = lista.map(limpiarTexto).filter(Boolean)
    if(limpias.length > ETIQUETAS_MAX) return `El recurso puede tener maximo ${ETIQUETAS_MAX} etiquetas`
    if(!limpias.every(e => e.length >= ETIQUETA_LARGO.min && e.length <= ETIQUETA_LARGO.max)){
        return `Cada etiqueta del recurso debe tener entre ${ETIQUETA_LARGO.min} y ${ETIQUETA_LARGO.max} caracteres`
    }
    if(new Set(limpias.map(sinTildes)).size !== limpias.length) return 'Las etiquetas del recurso no pueden repetirse'
    return ''
}

// imagen como texto: vacia (quitar la imagen) o una URL http(s) de hasta 500 caracteres
const imagenTextoValida = (imagen) => typeof imagen === 'string'
    && (imagen.trim() === '' || (imagen.trim().length <= 500 && /^https?:\/\/\S+$/i.test(imagen.trim())))
const MSG_IMAGEN = 'La imagen debe ser una URL http(s) valida o un archivo'

// errores de los campos enviados (solo los presentes); `creando` exige nombre y categoria
const erroresRecurso = (cuerpo, creando) => {
    const {nombre, descripcion, categoria, estado, imagen, precio, etiquetas} = cuerpo
    const sistema = CAMPOS_SISTEMA_RECURSO.find(c => cuerpo[c] !== undefined)
    return [
        sistema && `El campo ${sistema} no se puede enviar`,
        (creando || nombre !== undefined) && errorNombreRecurso(nombre),
        (creando || categoria !== undefined) && errorCategoriaRecurso(categoria),
        descripcion !== undefined && errorDescripcionRecurso(descripcion),
        precio !== undefined && errorPrecioRecurso(precio),
        etiquetas !== undefined && errorEtiquetasRecurso(etiquetas),
        estado !== undefined && errorEstadoRecurso(estado),
        imagen !== undefined && !imagenTextoValida(imagen) && MSG_IMAGEN
    ].find(Boolean)
}

// deja el nombre sin espacios sobrantes para guardarlo y compararlo
const normalizarNombreRecurso = (req) => {
    if(typeof req.body.nombre === 'string') req.body.nombre = limpiarTexto(req.body.nombre)
}

// valida los datos recibidos al registrar un recurso
const validarRecurso = (req, res, next) => {
    const error = erroresRecurso(req.body ?? {}, true)
    if(error){
        return res.status(400).json({msg: error})
    }
    normalizarNombreRecurso(req)
    next()
}

// valida los datos recibidos al actualizar un recurso (solo los enviados)
const validarActualizarRecurso = (req, res, next) => {
    const cuerpo = req.body ?? {}
    const {nombre, descripcion, categoria, estado, imagen, precio, etiquetas} = cuerpo
    if([nombre, descripcion, categoria, estado, imagen, precio, etiquetas].every(v => v === undefined) && !req.file){
        return res.status(400).json({msg: 'Envia al menos un campo a modificar'})
    }
    const error = erroresRecurso(cuerpo, false)
    if(error){
        return res.status(400).json({msg: error})
    }
    normalizarNombreRecurso(req)
    next()
}

// valida que el id de la ruta sea un ObjectId de MongoDB
const validarIdRecurso = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id del recurso no es valido'})
    }
    next()
}

// hu009 recomendaciones
// valida el contexto del proyecto y los datos opcionales de la recomendacion
const validarRecomendacion = (req, res, next) => {
    const {contexto, recursosSeleccionados, limite} = req.body
    if(!textoValido(contexto)){
        return res.status(400).json({msg: 'Describe el contexto de tu proyecto'})
    }
    if(contexto.trim().length < 5 || contexto.trim().length > 500){
        return res.status(400).json({msg: 'El contexto debe tener entre 5 y 500 caracteres'})
    }
    if(recursosSeleccionados !== undefined){
        if(!Array.isArray(recursosSeleccionados) || recursosSeleccionados.length > 10
            || !recursosSeleccionados.every(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))){
            return res.status(400).json({msg: 'recursosSeleccionados debe ser una lista de maximo 10 ids validos'})
        }
    }
    if(limite !== undefined && (!Number.isInteger(limite) || limite < 1 || limite > 10)){
        return res.status(400).json({msg: 'El limite debe ser un numero entero entre 1 y 10'})
    }
    next()
}

// asistente: mensaje del usuario y, opcionalmente, los ultimos mensajes de la conversacion
const MENSAJE_ASISTENTE_MAX = 500
const HISTORIAL_ASISTENTE_MAX = 10
const validarMensajeAsistente = (req, res, next) => {
    const {mensaje, historial} = req.body ?? {}
    if(!textoValido(mensaje)){
        return res.status(400).json({msg: 'Escribe tu pregunta'})
    }
    if(mensaje.trim().length < 2 || mensaje.trim().length > MENSAJE_ASISTENTE_MAX){
        return res.status(400).json({msg: `El mensaje debe tener entre 2 y ${MENSAJE_ASISTENTE_MAX} caracteres`})
    }
    if(historial !== undefined){
        const valido = Array.isArray(historial) && historial.length <= HISTORIAL_ASISTENTE_MAX && historial.every(h =>
            h && ['usuario', 'asistente'].includes(h.rol) && textoValido(h.texto) && h.texto.length <= 2000)
        if(!valido){
            return res.status(400).json({msg: `historial debe ser una lista de maximo ${HISTORIAL_ASISTENTE_MAX} mensajes {rol: usuario|asistente, texto}`})
        }
    }
    next()
}

// hu003 / hu007 prestamos (DIAS_MAX_PRESTAMO vive en politicasHelper)

const mensajeHoraFuera = (campo) => {
    const {inicio, fin} = horario()
    return `La hora de ${campo} debe estar entre las ${inicio} y las ${fin} (hora de Ecuador)`
}

// fecha y hora programadas de la entrega ({fecha} o {error}):
// - con horaEntrega: ese dia (por defecto hoy) a esa hora
// - otro dia sin hora: a la hora de apertura
// - hoy sin hora: el momento actual (antes de abrir, la apertura). Si ya cerro y el cliente no envio fechaEntrega
//   (frontend anterior), se toma la apertura del dia siguiente; si la pidio para hoy, error
const programarEntrega = (fechaEntrega, horaEntrega, ahora) => {
    const hoy = fechaEcuador(ahora)
    const {inicio, fin} = horario()
    if(horaEntrega !== undefined) return {fecha: combinarFechaHora(fechaEntrega ?? hoy, horaEntrega)}
    if(fechaEntrega !== undefined && fechaEntrega !== hoy) return {fecha: combinarFechaHora(fechaEntrega, inicio)}
    if(!horarioActivo()) return {fecha: ahora}
    if(ahora < combinarFechaHora(hoy, inicio)) return {fecha: combinarFechaHora(hoy, inicio)}
    if(ahora <= combinarFechaHora(hoy, fin)) return {fecha: ahora}
    if(fechaEntrega === undefined) return {fecha: combinarFechaHora(diaSiguiente(hoy), inicio)}
    return {error: `Hoy ya no hay atencion (de ${inicio} a ${fin}, hora de Ecuador): elige una fecha de entrega a partir de manana`}
}

// fecha de devolucion: "AAAA-MM-DD" (con horaDevolucion o, por defecto, a la hora de cierre) o fecha con hora
const programarDevolucion = (fechaDevolucion, horaDevolucion) => {
    if(typeof fechaDevolucion !== 'string') return {error: 'La fecha de devolucion no es valida'}
    const texto = fechaDevolucion.trim()
    const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(texto)
    if(soloDia ? !esFechaISO(texto) : !normalizarFechaDevolucion(texto)) return {error: 'La fecha de devolucion no es valida'}
    if(horaDevolucion !== undefined){
        if(!soloDia) return {error: 'Envia la hora de devolucion en un solo campo'}
        if(!esHora(horaDevolucion)) return {error: 'La hora de devolucion debe tener el formato HH:mm (por ejemplo 16:30)'}
        return {fecha: combinarFechaHora(texto, horaDevolucion)}
    }
    return {fecha: normalizarFechaDevolucion(texto)}
}

// valida la solicitud de un prestamo. El horario se valida sobre las horas PROGRAMADAS de entrega y devolucion,
// no sobre el momento en que se envia la solicitud (se puede pedir a las 20:00 para manana a las 10:00)
const validarSolicitudPrestamo = (req, res, next) => {
    const {recursoId, fechaDevolucion, fechaEntrega, horaEntrega, horaDevolucion, motivoPrestamo, aceptaTerminos, docenteReferencia} = req.body
    const renombrado = errorCampoRenombrado(req.body, 'motivo', 'motivoPrestamo')
    if(renombrado){
        return res.status(400).json({msg: renombrado})
    }
    if(typeof recursoId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(recursoId)){
        return res.status(400).json({msg: 'El id del recurso no es valido'})
    }
    const devolucion = programarDevolucion(fechaDevolucion, horaDevolucion)
    if(devolucion.error){
        return res.status(400).json({msg: devolucion.error})
    }
    if(fechaEntrega !== undefined && !esFechaISO(fechaEntrega)){
        return res.status(400).json({msg: 'La fecha de entrega debe tener el formato AAAA-MM-DD y ser una fecha real'})
    }
    if(horaEntrega !== undefined && !esHora(horaEntrega)){
        return res.status(400).json({msg: 'La hora de entrega debe tener el formato HH:mm (por ejemplo 10:00)'})
    }
    const ahora = new Date()
    const entrega = programarEntrega(fechaEntrega, horaEntrega, ahora)
    if(entrega.error){
        return res.status(400).json({msg: entrega.error})
    }
    // se compara con el inicio del minuto actual: "10:15" enviado a las 10:15:40 no es pasado
    if(entrega.fecha.getTime() < ahora.getTime() - (ahora.getTime() % 60000)){
        return res.status(400).json({msg: 'La fecha y hora de entrega no pueden ser anteriores a ahora'})
    }
    const anticipacion = reservaMaxDiasAnticipacion()
    if(entrega.fecha > limiteMaximoDevolucion(anticipacion, ahora)){
        return res.status(400).json({msg: `La entrega no se puede programar con mas de ${anticipacion} dias de anticipacion`})
    }
    if(devolucion.fecha <= ahora){
        return res.status(400).json({msg: 'La fecha de devolucion debe ser posterior a hoy'})
    }
    // estrictamente posterior: se permite el mismo dia, pero no a la misma hora ni antes
    if(devolucion.fecha <= entrega.fecha){
        return res.status(400).json({msg: 'La hora de devolucion debe ser posterior a la hora de entrega'})
    }
    // el limite se cuenta por dias calendario desde el dia de la entrega (hasta el final del dia "entrega + 30")
    if(devolucion.fecha > limiteMaximoDevolucion(DIAS_MAX_PRESTAMO, entrega.fecha)){
        return res.status(400).json({msg: `El prestamo no puede superar los ${DIAS_MAX_PRESTAMO} dias`})
    }
    if(horarioActivo() && !dentroDeHorario(entrega.fecha)){
        return res.status(400).json({msg: mensajeHoraFuera('entrega')})
    }
    if(horarioActivo() && !dentroDeHorario(devolucion.fecha)){
        return res.status(400).json({msg: mensajeHoraFuera('devolucion')})
    }
    if(motivoPrestamo !== undefined && (typeof motivoPrestamo !== 'string' || motivoPrestamo.length > 300)){
        return res.status(400).json({msg: 'El motivo del prestamo debe ser texto de maximo 300 caracteres'})
    }
    if(aceptaTerminos !== true && aceptaTerminos !== 'true'){
        return res.status(400).json({msg: 'Debes aceptar los terminos y condiciones'})
    }
    const error = errorDocenteReferencia(docenteReferencia)
    if(error){
        return res.status(400).json({msg: error})
    }
    req.body.fechaDevolucion = devolucion.fecha
    req.body.fechaEntregaProgramada = entrega.fecha
    next()
}

// docente de referencia: nombre (3-100) y correo obligatorios; telefono opcional
const errorDocenteReferencia = (docente) => {
    if(!docente || typeof docente !== 'object' || Array.isArray(docente) || !textoValido(docente.nombre) || !textoValido(docente.correo)){
        return 'El docente de referencia es obligatorio (nombre y correo)'
    }
    const nombre = docente.nombre.trim()
    if(nombre.length < 3 || nombre.length > 100) return 'El nombre del docente debe tener entre 3 y 100 caracteres'
    if(docente.correo.trim().length > 100 || !REGEX_CORREO.test(docente.correo.trim())) return 'El correo del docente no es valido'
    if(docente.telefono !== undefined && docente.telefono !== null && docente.telefono !== ''){
        if(typeof docente.telefono !== 'string' || !/^[\d+\- ]{7,15}$/.test(docente.telefono.trim())) return 'El telefono del docente no es valido'
    }
    return ''
}

// valida que el id de la ruta sea un ObjectId de MongoDB
const validarIdPrestamo = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id de la solicitud no es valido'})
    }
    next()
}

// motivoRechazo obligatorio al rechazar una solicitud (MOTIVO_RECHAZO_MIN a MOTIVO_RECHAZO_MAX caracteres, por defecto 30 a 200)
const validarRechazo = (req, res, next) => {
    const cuerpo = req.body ?? {}
    const renombrado = errorCampoRenombrado(cuerpo, 'motivo', 'motivoRechazo')
    if(renombrado){
        return res.status(400).json({msg: renombrado})
    }
    const motivo = cuerpo.motivoRechazo
    if(motivo !== undefined && motivo !== null && typeof motivo !== 'string'){
        return res.status(400).json({msg: 'El motivo de rechazo debe ser texto'})
    }
    if(!textoValido(motivo)){
        return res.status(400).json({msg: 'El motivo de rechazo es obligatorio'})
    }
    const {min, max} = limitesMotivoRechazo()
    const texto = motivo.trim().replace(/\s+/g, ' ')
    if(texto.length < min || texto.length > max){
        return res.status(400).json({msg: `El motivo de rechazo debe tener entre ${min} y ${max} caracteres`})
    }
    req.body.motivoRechazo = texto
    next()
}

// valida el codigo leido del QR
const validarEscaneo = (req, res, next) => {
    const {codigo} = req.body
    if(typeof codigo !== 'string' || !/^[0-9a-fA-F]{32}$/.test(codigo.trim())){
        return res.status(400).json({msg: 'El codigo QR no es valido'})
    }
    req.body.codigo = codigo.trim()
    next()
}

// datos opcionales de la entrega o la devolucion (JSON o multipart/form-data)
const validarMovimiento = (req, res, next) => {
    const {responsable, observaciones, condicion} = req.body ?? {}
    if(responsable !== undefined && responsable !== ''
        && (typeof responsable !== 'string' || responsable.trim().length < 3 || responsable.trim().length > 100)){
        return res.status(400).json({msg: 'El responsable debe tener entre 3 y 100 caracteres'})
    }
    if(observaciones !== undefined && (typeof observaciones !== 'string' || observaciones.length > 300)){
        return res.status(400).json({msg: 'Las observaciones deben ser texto de maximo 300 caracteres'})
    }
    if(condicion !== undefined && condicion !== '' && !CONDICIONES.includes(condicion)){
        return res.status(400).json({msg: `La condicion debe ser: ${CONDICIONES.join(', ')}`})
    }
    next()
}

// hu004 / hu008 / hu010 reportes, historial y notificaciones
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
const fechaReal = (texto) => typeof texto === 'string' && FECHA_ISO.test(texto) && !Number.isNaN(Date.parse(texto))
    && new Date(texto).toISOString().startsWith(texto)

// valida ?estado ?desde ?hasta (AAAA-MM-DD) y ?formato=json|csv
const validarFiltrosReporte = (req, res, next) => {
    const {estado, desde, hasta, formato} = req.query
    if(estado !== undefined && (typeof estado !== 'string' || !ESTADOS_PRESTAMO.includes(estado))){
        return res.status(400).json({msg: 'Estado no valido'})
    }
    if(desde !== undefined && !fechaReal(desde)){
        return res.status(400).json({msg: 'La fecha "desde" debe tener el formato AAAA-MM-DD'})
    }
    if(hasta !== undefined && !fechaReal(hasta)){
        return res.status(400).json({msg: 'La fecha "hasta" debe tener el formato AAAA-MM-DD'})
    }
    if(desde !== undefined && hasta !== undefined && desde > hasta){
        return res.status(400).json({msg: 'La fecha "desde" no puede ser posterior a "hasta"'})
    }
    if(formato !== undefined && !['json', 'csv'].includes(formato)){
        return res.status(400).json({msg: 'El formato debe ser json o csv'})
    }
    next()
}

// penalizaciones: ?estado ?usuario (ObjectId) ?desde ?hasta (AAAA-MM-DD) y ?formato=json|csv
const validarFiltrosPenalizaciones = (req, res, next) => {
    const {estado, usuario, desde, hasta, formato} = req.query
    if(estado !== undefined && (typeof estado !== 'string' || !ESTADOS_PENALIZACION.includes(estado))){
        return res.status(400).json({msg: `El estado debe ser: ${ESTADOS_PENALIZACION.join(', ')}`})
    }
    if(usuario !== undefined && (typeof usuario !== 'string' || !/^[0-9a-fA-F]{24}$/.test(usuario))){
        return res.status(400).json({msg: 'El id del usuario no es valido'})
    }
    if(desde !== undefined && !fechaReal(desde)){
        return res.status(400).json({msg: 'La fecha "desde" debe tener el formato AAAA-MM-DD'})
    }
    if(hasta !== undefined && !fechaReal(hasta)){
        return res.status(400).json({msg: 'La fecha "hasta" debe tener el formato AAAA-MM-DD'})
    }
    if(desde !== undefined && hasta !== undefined && desde > hasta){
        return res.status(400).json({msg: 'La fecha "desde" no puede ser posterior a "hasta"'})
    }
    if(formato !== undefined && !['json', 'csv'].includes(formato)){
        return res.status(400).json({msg: 'El formato debe ser json o csv'})
    }
    next()
}

const validarIdPenalizacion = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id de la penalizacion no es valido'})
    }
    next()
}

// motivoAnulacion obligatorio al anular una penalizacion (por ejemplo: el estudiante repuso el articulo)
const validarAnulacion = (req, res, next) => {
    const renombrado = errorCampoRenombrado(req.body, 'motivo', 'motivoAnulacion')
    if(renombrado){
        return res.status(400).json({msg: renombrado})
    }
    const motivo = req.body?.motivoAnulacion
    if(!textoValido(motivo) || motivo.trim().length < 3 || motivo.trim().length > 200){
        return res.status(400).json({msg: 'El motivo de la anulacion debe tener entre 3 y 200 caracteres'})
    }
    next()
}

// datos opcionales del comprobante de pago (multipart): referencia de la transferencia (3-50) y observaciones (<= 200)
const validarComprobante = (req, res, next) => {
    const {referencia, observaciones} = req.body ?? {}
    if(referencia !== undefined && referencia !== ''
        && (typeof referencia !== 'string' || referencia.trim().length < 3 || referencia.trim().length > 50)){
        return res.status(400).json({msg: 'La referencia debe tener entre 3 y 50 caracteres'})
    }
    if(observaciones !== undefined && (typeof observaciones !== 'string' || observaciones.length > 200)){
        return res.status(400).json({msg: 'Las observaciones deben ser texto de maximo 200 caracteres'})
    }
    next()
}

// motivoRechazoComprobante obligatorio al rechazar el comprobante de pago
const validarRechazoComprobante = (req, res, next) => {
    const renombrado = errorCampoRenombrado(req.body, 'motivo', 'motivoRechazoComprobante')
    if(renombrado){
        return res.status(400).json({msg: renombrado})
    }
    const motivo = req.body?.motivoRechazoComprobante
    if(!textoValido(motivo) || motivo.trim().length < 3 || motivo.trim().length > 200){
        return res.status(400).json({msg: 'El motivo del rechazo del comprobante debe tener entre 3 y 200 caracteres'})
    }
    next()
}

const validarFiltroNotificaciones = (req, res, next) => {
    const {leida} = req.query
    if(leida !== undefined && !['true', 'false'].includes(leida)){
        return res.status(400).json({msg: 'El filtro leida debe ser true o false'})
    }
    next()
}

const validarIdNotificacion = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id de la notificacion no es valido'})
    }
    next()
}

// usuarios: eliminar alumnos
const validarIdUsuario = (req, res, next) => {
    if(!/^[0-9a-fA-F]{24}$/.test(req.params.id)){
        return res.status(400).json({msg: 'El id del usuario no es valido'})
    }
    next()
}

// valida que el alumno envie su contraseña para eliminar su cuenta
const validarEliminarCuenta = (req, res, next) => {
    if(!textoValido(req.body?.password)){
        return res.status(400).json({msg: 'Debes enviar tu contraseña para eliminar la cuenta'})
    }
    next()
}

export {validarRegistro, validarLogin, validarActualizarPerfil, validarRecuperarClave, validarRestablecerClave, validarRecurso, validarActualizarRecurso, validarIdRecurso, validarRecomendacion, validarMensajeAsistente,
        validarSolicitudPrestamo, validarIdPrestamo, validarRechazo, validarEscaneo, validarMovimiento,
        validarFiltrosReporte, validarFiltrosPenalizaciones, validarIdPenalizacion, validarAnulacion, validarComprobante, validarRechazoComprobante,
        validarFiltroNotificaciones, validarIdNotificacion, validarIdUsuario, validarEliminarCuenta}