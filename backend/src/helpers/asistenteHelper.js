// Asistente de PoliRent: motor local (sin servicios externos)
// Clasifica el mensaje del usuario en uno de tres tipos:
//   - ayuda:          dudas sobre el uso del sistema (preguntas frecuentes de abajo)
//   - recomendacion:  recursos del catalogo para un proyecto o actividad (motor TF-IDF de recomendacionHelper)
//   - fuera_de_tema:  cualquier otra cosa; el asistente no responde temas genericos
// Si hay GEMINI_API_KEY, geminiHelper redacta la respuesta con esta misma base de conocimiento
// y este motor queda como respaldo.

import {tarifas, horario} from './politicasHelper.js'

const TIPOS_RESPUESTA = ['ayuda', 'recomendacion', 'fuera_de_tema']

const RESPUESTA_FUERA_DE_TEMA = 'Solo puedo ayudarte con el uso de PoliRent y a encontrar recursos para tus proyectos o actividades. '
    + 'Prueba, por ejemplo, con "¿Cómo reservo un recurso?" o "¿Qué me recomiendas para una exposición?".'

const RESPUESTA_SALUDO = '¡Hola! Soy el asistente de PoliRent. Puedo resolver tus dudas sobre el sistema (registro, inicio de sesión, reservas, '
    + 'cancelaciones…) y recomendarte recursos para tus proyectos o actividades. Cuéntame qué necesitas.'

// Base de conocimiento. `claves`: cada clave es una o varias palabras; cada palabra se compara como prefijo de las
// palabras del mensaje (sin tildes ni mayusculas) y la clave cuenta solo si aparecen todas.
// Una palabra terminada en $ debe coincidir completa (o en plural).
// El puntaje de una pregunta es la suma de las palabras de sus claves encontradas, multiplicada por `peso`.
const PREGUNTAS_FRECUENTES = [
    {
        id: 'que_es',
        titulo: '¿Qué es PoliRent?',
        // solo palabras del sistema: "que es un osciloscopio" no debe responder esto
        claves: ['polirent', 'sistema', 'plataforma', 'pagina', 'aplicac', 'quien pued us'],
        peso: 0.5,
        respuesta: 'PoliRent es el sistema de préstamo de recursos de las asociaciones de estudiantes de la Escuela Politécnica Nacional. '
            + 'Puedes explorar el catálogo (recursos técnicos, académicos y recreativos), reservar lo que necesitas, seguir el estado de tus '
            + 'solicitudes y recibir recomendaciones de recursos según tu proyecto. Para reservar necesitas una cuenta de estudiante con tu correo @epn.edu.ec.',
        enlaces: [{texto: 'Ver recursos', ruta: '/#recursos'}, {texto: 'Crear cuenta', ruta: '/registro'}]
    },
    {
        id: 'registro',
        titulo: '¿Cómo me registro?',
        claves: ['registr', 'crea cuent', 'cre cuent', 'cuenta nuev', 'nueva cuent', 'inscrib', 'abrir cuent'],
        respuesta: 'Pulsa "Registrarse" y completa el formulario con tus nombres, apellidos, cédula ecuatoriana, correo institucional (@epn.edu.ec), '
            + 'teléfono (09XXXXXXXX), facultad y una contraseña de al menos 8 caracteres con mayúscula, minúscula y número. '
            + 'Después inicia sesión con tu correo y contraseña. Todas las cuentas nuevas son de estudiante.',
        enlaces: [{texto: 'Registrarse', ruta: '/registro'}]
    },
    {
        id: 'iniciar_sesion',
        titulo: '¿Cómo inicio sesión?',
        claves: ['inici sesion', 'iniciar', 'ingres', 'login', 'logue', 'loge', 'entrar', 'acced', 'acceso'],
        respuesta: 'Pulsa "Iniciar sesión" y escribe tu correo institucional (@epn.edu.ec) y tu contraseña. '
            + 'Al entrar llegas a tu panel, donde ves tus solicitudes y recomendaciones. Si aún no tienes cuenta, primero regístrate.',
        enlaces: [{texto: 'Iniciar sesión', ruta: '/login'}]
    },
    {
        id: 'cerrar_sesion',
        titulo: '¿Cómo cierro sesión?',
        claves: ['cerr sesion', 'cierr sesion', 'cerrar', 'cierro', 'salir', 'logout', 'deslogue', 'desconect'],
        respuesta: 'Abre el menú de tu usuario (tu avatar, arriba a la derecha) y elige "Cerrar sesión". '
            + 'Por seguridad, la sesión también se cierra sola cuando expira o si cambias tu contraseña.',
        enlaces: []
    },
    {
        id: 'olvide_clave',
        titulo: 'Olvidé mi contraseña',
        claves: ['olvid', 'recuper', 'restablec', 'no recuerd', 'perdi contrasen', 'perdi clave'],
        respuesta: 'En la pantalla de inicio de sesión pulsa "¿Olvidaste tu contraseña?" y escribe tu correo institucional. '
            + 'Te llegará un enlace para crear una contraseña nueva; ábrelo antes de que expire.',
        enlaces: [{texto: 'Recuperar contraseña', ruta: '/recuperar-clave'}]
    },
    {
        id: 'cambiar_clave',
        titulo: '¿Cómo cambio mi contraseña?',
        claves: ['cambi contrasen', 'cambi clave', 'nueva contrasen', 'actualiz contrasen', 'modific contrasen', 'segurid'],
        respuesta: 'Con tu sesión iniciada entra a "Mi cuenta", pestaña "Seguridad", y escribe tu contraseña actual y la nueva. '
            + 'Al cambiarla se cierran tus otras sesiones.',
        enlaces: [{texto: 'Seguridad de la cuenta', ruta: '/perfil?seccion=seguridad'}]
    },
    {
        id: 'perfil',
        titulo: '¿Cómo actualizo mis datos?',
        claves: ['perfil', 'mis dato', 'actualiz dato', 'cambi dato', 'edit dato', 'telefono', 'mi cuent', 'facultad'],
        respuesta: 'Entra a "Mi cuenta" desde el menú de tu usuario. En la pestaña "Perfil" puedes actualizar tus datos personales.',
        enlaces: [{texto: 'Mi cuenta', ruta: '/perfil?seccion=perfil'}]
    },
    {
        id: 'eliminar_cuenta',
        titulo: '¿Cómo elimino mi cuenta?',
        claves: ['elimin cuent', 'borr cuent', 'dar de baj', 'eliminar mi'],
        respuesta: 'Puedes eliminar tu cuenta desde "Mi cuenta" confirmando tu contraseña. '
            + 'No es posible si tienes recursos entregados sin devolver: devuélvelos primero.',
        enlaces: [{texto: 'Mi cuenta', ruta: '/perfil'}]
    },
    {
        id: 'reservar',
        titulo: '¿Cómo reservo un recurso?',
        claves: ['reserv', 'solicit', 'pedir', 'pido', 'prest', 'alquil', 'rent', 'apart'],
        // verbos muy generales: en un empate gana la pregunta mas especifica (p. ej. "cancelo mi solicitud")
        peso: 0.9,
        respuesta: 'Inicia sesión con tu cuenta de estudiante, busca el recurso en la sección Recursos y abre su ficha. '
            + 'Si está disponible, elige la fecha de devolución (máximo 30 días), escribe opcionalmente el motivo, indica un docente de referencia '
            + '(nombre y correo), acepta los términos y condiciones y envía la solicitud. '
            + 'Quedará "En revisión" hasta que la asociación la apruebe o la rechace.',
        enlaces: [{texto: 'Ver recursos', ruta: '/#recursos'}]
    },
    {
        id: 'plazo',
        titulo: '¿Por cuánto tiempo me prestan un recurso?',
        claves: ['cuant dia', 'cuanto tiempo', 'plazo', 'fecha devoluc', 'maxim', 'durac', 'hasta cuand'],
        respuesta: 'Al reservar eliges la fecha de devolución: debe ser posterior a hoy y como máximo 30 días después. '
            + 'Devuelve el recurso a tiempo para que otros estudiantes también puedan usarlo.',
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'prestamo_unico',
        titulo: '¿Puedo pedir varios recursos a la vez?',
        claves: ['otro recurs', 'mas de un', 'varios', 'dos recurs', 'a la vez', 'al mismo tiempo', 'no pued solicit', 'no pued reserv', 'no me dej'],
        respuesta: 'Solo puedes tener un préstamo a la vez. Mientras tengas una solicitud en revisión, aprobada o un recurso en préstamo, '
            + 'no puedes solicitar otro: cancela la solicitud o devuelve el recurso y luego podrás reservar uno nuevo. '
            + 'Tampoco puedes solicitar recursos mientras tengas penalizaciones pendientes.',
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'cancelar',
        titulo: '¿Cómo cancelo una solicitud?',
        claves: ['cancel', 'anul', 'ya no necesit', 'desist'],
        respuesta: 'Entra a "Mis solicitudes", abre la solicitud y pulsa "Cancelar". Solo se pueden cancelar las solicitudes en revisión o aprobadas; '
            + 'un recurso que ya te entregaron se devuelve en el punto de retiro.',
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'estado_solicitud',
        titulo: '¿Cómo veo el estado de mis solicitudes?',
        claves: ['mis solicitud', 'estado', 'seguimient', 'aprob', 'rechaz', 'historial', 'notific', 'respuest'],
        respuesta: 'En "Mis solicitudes" ves cada solicitud con su estado: En revisión, Aprobada, En préstamo, Devuelta, Rechazada o Cancelada. '
            + 'Cuando la asociación aprueba o rechaza tu solicitud recibes una notificación (la campana de la barra superior).',
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'retiro_devolucion',
        titulo: '¿Dónde retiro y devuelvo los recursos?',
        claves: ['retir', 'recog', 'devolv', 'devuelv', 'devoluc', 'entreg', 'ubicac', 'carn'],
        get respuesta() {
            const {inicio, fin} = horario()
            return `Con la solicitud aprobada acércate al punto de retiro de la asociación entre las ${inicio} y las ${fin} (hora de Ecuador) y presenta tu carné estudiantil; `
                + 'el detalle de tu solicitud indica el lugar. La devolución se hace en el mismo punto y horario, con el recurso limpio y completo. '
                + 'El responsable registra la entrega y la devolución en el sistema, con una foto de evidencia si hace falta.'
        },
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'horario',
        titulo: '¿En qué horario se entregan y devuelven los recursos?',
        claves: ['horario', 'que hora', 'hasta que hora', 'desde que hora', 'a partir de que hora', '7 am', '6 pm', 'entreg', 'devoluc'],
        get respuesta() {
            const {inicio, fin} = horario()
            return `La entrega y la devolución de los recursos solo se realizan entre las ${inicio} y las ${fin} (hora de Ecuador). `
                + `Por eso la fecha de devolución que eliges al reservar se fija a las ${fin} de ese día. `
                + 'Fuera de ese horario el responsable no puede registrar la entrega ni la devolución.'
        },
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'penalizaciones',
        titulo: '¿Qué pasa si devuelvo tarde, dañado o pierdo un recurso?',
        claves: ['penaliz', 'multa', 'sancion', 'dano', 'dana', 'danad', 'dane', 'devuelv tard', 'devolv tard', 'entreg tard', 'rompi', 'perdi', 'pierd', 'atras', 'retras', 'cuanto cuest perd', 'termin condicion'],
        get respuesta() {
            const t = tarifas()
            return `Las penalizaciones son un porcentaje del precio del recurso: ${t.atrasoPorDia} % por cada día o fracción de atraso, `
                + `${t.danio} % si lo devuelves dañado o incompleto y ${t.perdida} % si lo pierdes (o puedes reponerlo completo y la asociación anula la penalización). `
                + `Se acumulan hasta un máximo del ${t.tope} % del precio por préstamo. Mientras tengas penalizaciones pendientes no podrás solicitar otro recurso; `
                + 'las aceptas en los términos y condiciones al reservar.'
        },
        enlaces: [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    },
    {
        id: 'recomendaciones',
        titulo: '¿Qué puede hacer el asistente?',
        claves: ['que pued hac', 'que sab', 'en que me ayud', 'como me ayud', 'como funcion recomend', 'quien eres', 'que eres'],
        respuesta: 'Puedo responder tus dudas sobre PoliRent y recomendarte recursos del catálogo. Para recomendaciones, cuéntame tu proyecto '
            + 'o actividad, por ejemplo: "vamos a armar un robot seguidor de línea" o "organizamos un torneo de vóley". '
            + 'Solo te sugiero recursos que están disponibles en este momento.',
        enlaces: [{texto: 'Ver recursos', ruta: '/#recursos'}]
    },
    {
        id: 'administrador',
        titulo: '¿Quién administra los recursos?',
        claves: ['administr', 'admin', 'directiv', 'quien aprueb', 'responsabl'],
        respuesta: 'Los recursos los administra la directiva de la asociación estudiantil: registra el inventario, revisa y aprueba o rechaza las solicitudes '
            + 'y registra la entrega y la devolución. Los administradores los asigna la asociación; no hay registro público de administradores.',
        enlaces: []
    }
]

// palabras que indican que el usuario busca recursos para algo
const SENALES_RECOMENDACION = ['recomend', 'recomiend', 'necesit', 'sugier', 'sugeri', 'sirv', 'ocup', 'requier', 'proyecto$', 'actividad',
    'organiz', 'arm', 'constru', 'hacer un', 'hacer una', 'voy a', 'vamos a', 'tengo que', 'tenemos que', 'quiero', 'que llev', 'que us', 'para mi', 'para una', 'para un']

// pedidos genericos que el asistente no atiende aunque mencionen algo parecido a un recurso
const SENALES_FUERA_DE_TEMA = ['chiste', 'resuelv', 'resolv', 'traduc', 'redact', 'cuanto es', 'quien gan', 'clima', 'noticia', 'receta',
    'poema', 'cancion', 'deber de', 'tarea de', 'hazme', 'escribem', 'opinas']

const SALUDOS = ['hola', 'buen', 'hey', 'saludo', 'gracias', 'ok', 'vale', 'que tal']

const normalizarTexto = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const palabras = (texto) => normalizarTexto(texto).split(/[^a-z0-9]+/).filter(Boolean)

// una parte terminada en $ debe ser la palabra completa (o su plural): "proyecto$" no coincide con "proyector"
const coincideParte = (parte, palabra) => parte.endsWith('$')
    ? [parte.slice(0, -1), `${parte.slice(0, -1)}s`].includes(palabra)
    : palabra.startsWith(parte)
// la clave cuenta si cada una de sus palabras coincide con alguna palabra del mensaje
const coincide = (clave, palabrasMensaje) => clave.split(' ').every(parte => palabrasMensaje.some(p => coincideParte(parte, p)))
const contarCoincidencias = (claves, palabrasMensaje) => claves
    .filter(clave => coincide(clave, palabrasMensaje))
    .reduce((total, clave) => total + clave.split(' ').length, 0)

/** Pregunta frecuente que mejor coincide con el mensaje: {pregunta, puntaje} o null */
const buscarPreguntaFrecuente = (mensaje) => {
    const p = palabras(mensaje)
    let mejor = null
    for (const pregunta of PREGUNTAS_FRECUENTES) {
        const puntaje = contarCoincidencias(pregunta.claves, p) * (pregunta.peso ?? 1)
        if (puntaje > 0 && (!mejor || puntaje > mejor.puntaje)) mejor = {pregunta, puntaje}
    }
    return mejor
}

const tieneSenal = (senales, mensaje) => contarCoincidencias(senales, palabras(mensaje)) > 0
const esSaludo = (mensaje) => {
    const p = palabras(mensaje)
    return p.length > 0 && p.length <= 4 && contarCoincidencias(SALUDOS, p) > 0
}

const listarNombres = (nombres) => nombres.length <= 1 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`

// seguro: el motor local esta seguro de la respuesta (el controlador no consulta a Gemini)
const fueraDeTema = (seguro = false) => ({tipo: 'fuera_de_tema', respuesta: RESPUESTA_FUERA_DE_TEMA, enlaces: [], recomendaciones: [], preguntaFrecuente: null, seguro})

/**
 * Respuesta local del asistente.
 * @param {string} mensaje
 * @param {Array}  recomendaciones  resultado de recomendarRecursos para el mensaje (solo recursos disponibles)
 * @returns {{tipo, respuesta, enlaces, recomendaciones, preguntaFrecuente, seguro}}
 */
const responderLocal = (mensaje, recomendaciones = []) => {
    const frecuente = buscarPreguntaFrecuente(mensaje)
    // "directas": recursos que comparten alguna palabra con el mensaje (no solo por terminos relacionados)
    const directas = recomendaciones.filter(r => r.terminosCoincidentes?.length)
    const senal = tieneSenal(SENALES_RECOMENDACION, mensaje)

    const ayuda = (pregunta, extras = [], seguro = false) => ({
        tipo: 'ayuda',
        respuesta: pregunta.respuesta,
        enlaces: pregunta.enlaces,
        recomendaciones: extras,
        preguntaFrecuente: pregunta.id,
        seguro
    })

    // una coincidencia fuerte con la base de conocimiento gana (p. ej. "como cierro sesion")
    if (frecuente && frecuente.puntaje >= 2) return ayuda(frecuente.pregunta, directas.slice(0, 3), true)

    if (!senal && tieneSenal(SENALES_FUERA_DE_TEMA, mensaje)) return fueraDeTema(true)

    if (recomendaciones.length && (senal || !frecuente)) {
        const nombres = recomendaciones.slice(0, 3).map(r => r.recurso.nombre)
        return {
            tipo: 'recomendacion',
            respuesta: `Te pueden servir estos recursos disponibles: ${listarNombres(nombres)}${recomendaciones.length > 3 ? ', entre otros' : ''}. `
                + 'Abre cualquiera para ver su ficha y reservarlo.',
            enlaces: [],
            recomendaciones,
            preguntaFrecuente: null,
            seguro: false
        }
    }
    // pregunta de uso que menciona un recurso (p. ej. "como reservo un proyector"): ayuda + el recurso mencionado
    if (frecuente) return ayuda(frecuente.pregunta, directas.slice(0, 3))

    if (esSaludo(mensaje)) {
        return {tipo: 'ayuda', respuesta: RESPUESTA_SALUDO, enlaces: [{texto: 'Ver recursos', ruta: '/#recursos'}], recomendaciones: [], preguntaFrecuente: null, seguro: true}
    }
    if (senal) {
        return {
            tipo: 'recomendacion',
            respuesta: 'No encontré recursos disponibles relacionados con lo que describes. Cuéntame un poco más de tu proyecto o actividad '
                + '(por ejemplo, qué vas a construir, presentar u organizar) o revisa el catálogo completo.',
            enlaces: [{texto: 'Ver recursos', ruta: '/#recursos'}],
            recomendaciones: [],
            preguntaFrecuente: null,
            seguro: false
        }
    }
    return fueraDeTema()
}

// el usuario pregunta cuanto debe en penalizaciones
const SENALES_DEUDA = ['cuanto debo', 'cuanto adeudo', 'deuda', 'debo algo', 'tengo penaliz', 'tengo multa', 'tengo sancion',
    'mis penaliz', 'mis multa', 'cuanto tengo que pag', 'cuanto me toca pag', 'saldo', 'debo dinero', 'debo plata']

const esPreguntaDeuda = (mensaje) => tieneSenal(SENALES_DEUDA, mensaje)
const dolares = (monto) => `$${(Number(monto) || 0).toFixed(2)}`

/**
 * Respuesta a "¿cuánto debo?".
 * @param {string} mensaje
 * @param {{totalAdeudado, totalAtrasoEnCurso} | null} resumen  null si no hay sesion de estudiante
 * @returns {{tipo, respuesta, enlaces, recomendaciones, preguntaFrecuente, seguro} | null}  null si el mensaje no pregunta por la deuda
 */
const responderDeuda = (mensaje, resumen) => {
    if (!esPreguntaDeuda(mensaje)) return null
    const respuesta = (texto, enlaces) => ({tipo: 'ayuda', respuesta: texto, enlaces, recomendaciones: [], preguntaFrecuente: 'deuda', seguro: true})
    if (!resumen) {
        return respuesta('Para consultar tus penalizaciones inicia sesión con tu cuenta de estudiante. '
            + 'Las penalizaciones se generan por atraso, daño o pérdida de un recurso.', [{texto: 'Iniciar sesión', ruta: '/login'}])
    }
    const deuda = Number(resumen.totalAdeudado) || 0
    const atraso = Number(resumen.totalAtrasoEnCurso) || 0
    const enlaces = [{texto: 'Mis solicitudes', ruta: '/solicitudes'}]
    if (deuda > 0) {
        return respuesta(`Tienes ${dolares(deuda)} en penalizaciones pendientes`
            + (atraso > 0 ? `; además, tu atraso actual acumula ${dolares(atraso)}` : '')
            + '. Regularízalas con la asociación: mientras tengas penalizaciones pendientes no podrás solicitar otro recurso.', enlaces)
    }
    return respuesta('No tienes penalizaciones pendientes'
        + (atraso > 0 ? `, pero tu atraso actual acumula ${dolares(atraso)}: devuelve el recurso cuanto antes para que no siga aumentando.` : '.'), enlaces)
}

export {TIPOS_RESPUESTA, PREGUNTAS_FRECUENTES, RESPUESTA_FUERA_DE_TEMA, buscarPreguntaFrecuente, responderLocal, esPreguntaDeuda, responderDeuda}
