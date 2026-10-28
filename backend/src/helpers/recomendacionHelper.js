// Motor de recomendacion de recursos (HU-009)
// Filtrado por contenido: TF-IDF + similitud de coseno entre el contexto del proyecto del estudiante
// (y los recursos que ya selecciono) y el nombre, la categoria, las etiquetas y la descripcion de cada recurso.
// Se complementa con un pequeño lexico de terminos relacionados para sugerir recursos complementarios
// y con filtrado colaborativo a partir del historial de prestamos (70% contenido + 30% historial).

const PESO_NOMBRE = 3
const PESO_ETIQUETA = 3
const PESO_CATEGORIA = 1
const PESO_DESCRIPCION = 1
const PESO_SELECCIONADO = 0.5
const PESO_RELACIONADO = 0.4
// peso del historial de prestamos frente al parecido por texto
const PESO_COLABORATIVO = 0.3

const ETIQUETA_CATEGORIA = { tecnico: 'tecnico', academico: 'academico', recreativo: 'recreativo' }

const STOPWORDS = new Set([
    'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e', 'a', 'en', 'con', 'sin', 'por', 'para', 'que', 'se', 'su', 'sus',
    'al', 'del', 'lo', 'es', 'son', 'mi', 'mis', 'tu', 'tus', 'como', 'mas', 'muy', 'ya', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'hacer',
    'proyecto', 'necesito', 'quiero', 'tengo', 'usar', 'uso', 'sobre', 'entre', 'desde', 'hasta', 'ser', 'hay', 'cual', 'cuales'
])

// grupos de terminos que suelen usarse juntos en un mismo proyecto (ya normalizados y sin plural)
const GRUPOS_RELACIONADOS = [
    // robotica y electronica
    ['robot', 'robotica', 'arduino', 'sensor', 'servo', 'motor', 'microcontrolador', 'raspberry', 'electronica', 'circuito', 'protoboard', 'multimetro', 'soldador', 'led',
        'esp32', 'jumper', 'resistencia', 'transistor', 'capacitor', 'relay', 'rele', 'driver', 'pcb', 'estaño', 'cautin', 'seguidor', 'minisumo', 'sumo', 'automatizacion', 'iot', 'domotica'],
    // programacion y computo
    ['programacion', 'programar', 'software', 'codigo', 'desarrollo', 'laptop', 'portatil', 'computadora', 'monitor', 'teclado', 'mouse', 'raton',
        'python', 'java', 'javascript', 'app', 'aplicacion', 'web', 'hackathon', 'servidor', 'tablet', 'disco', 'usb', 'pendrive', 'cargador'],
    // ciencia de datos e inteligencia artificial
    ['datos', 'inteligencia', 'artificial', 'ia', 'machine', 'learning', 'modelo', 'entrenamiento', 'gpu', 'servidor', 'nube', 'python', 'estadistica', 'analisis'],
    // presentaciones y eventos academicos
    ['presentacion', 'presentar', 'exposicion', 'exponer', 'sustentacion', 'sustentar', 'tesis', 'auditorio', 'conferencia', 'charla', 'diapositiva', 'proyector', 'pantalla', 'hdmi', 'puntero', 'microfono', 'parlante', 'altavoz',
        'adaptador', 'clicker', 'atril', 'congreso', 'seminario', 'ponencia', 'webinar', 'taller', 'capacitacion'],
    // audio y sonido
    ['audio', 'sonido', 'microfono', 'parlante', 'altavoz', 'bocina', 'amplificador', 'mezclador', 'consola', 'audifono', 'auricular', 'musica', 'dj', 'megafono', 'podcast'],
    // redes y conectividad
    ['red', 'router', 'switch', 'ethernet', 'cable', 'wifi', 'internet', 'conectividad', 'cisco', 'rj45', 'ponchadora', 'servidor', 'ciberseguridad'],
    // fotografia, video y transmision
    ['video', 'fotografia', 'foto', 'camara', 'filmar', 'grabacion', 'tripode', 'iluminacion', 'microfono', 'edicion',
        'lente', 'flash', 'estabilizador', 'gimbal', 'softbox', 'croma', 'streaming', 'transmision', 'webcam', 'memoria', 'sd', 'cortometraje', 'documental'],
    // estudio y ciencias basicas
    ['calculadora', 'matematica', 'fisica', 'quimica', 'calculo', 'formula', 'ejercicio', 'cientifica', 'libro', 'texto', 'estudio',
        'algebra', 'estadistica', 'ecuacion', 'graficadora', 'tutoria', 'examen', 'deber', 'investigacion', 'diccionario', 'enciclopedia'],
    // laboratorio quimico y biologico
    ['laboratorio', 'microscopio', 'balanza', 'probeta', 'matraz', 'pipeta', 'reactivo', 'quimica', 'biologia', 'bata', 'guante', 'experimento', 'ph', 'termometro'],
    // electrica y energia
    ['electrica', 'energia', 'fuente', 'bateria', 'voltaje', 'corriente', 'osciloscopio', 'generador', 'inversor', 'solar', 'transformador', 'multimetro', 'extension', 'regleta'],
    // taller mecanico y herramientas
    ['mecanica', 'herramienta', 'taladro', 'destornillador', 'alicate', 'sierra', 'martillo', 'calibrador', 'flexometro', 'lija', 'torno', 'llave', 'pegamento', 'silicona', 'taller'],
    // fabricacion digital y prototipado
    ['impresora', 'impresion', '3d', 'filamento', 'prototipo', 'maqueta', 'diseño',
        'cnc', 'laser', 'corte', 'modelado', 'escaner', 'cad', 'autocad', 'solidworks', 'resina', 'pla'],
    // ingenieria civil y topografia
    ['civil', 'topografia', 'teodolito', 'gps', 'plano', 'construccion', 'estructura', 'hormigon', 'flexometro', 'autocad', 'casco', 'chaleco'],
    // salidas de campo (geologia, ambiental)
    ['campo', 'salida', 'excursion', 'geologia', 'ambiental', 'brujula', 'gps', 'mochila', 'linterna', 'carpa', 'casco', 'botiquin'],
    // drones y aeromodelismo
    ['dron', 'drone', 'aeromodelismo', 'vuelo', 'helice', 'bateria', 'aerea', 'mapeo', 'camara'],
    // videojuegos y realidad virtual
    ['videojuego', 'gaming', 'gamer', 'esport', 'consola', 'mando', 'joystick', 'vr', 'virtual', 'realidad', 'oculus', 'simulador', 'pantalla'],
    // juegos de mesa y deportes
    ['juego', 'ajedrez', 'domino', 'carta', 'mesa', 'recreacion', 'balon', 'futbol', 'deporte', 'cancha', 'torneo', 'evento',
        'voley', 'voleibol', 'basquet', 'baloncesto', 'pingpong', 'tenis', 'raqueta', 'cronometro', 'silbato', 'cono', 'chaleco', 'uniforme', 'campeonato', 'olimpiada'],
    // logistica de eventos de la asociacion
    ['evento', 'feria', 'stand', 'carpa', 'toldo', 'silla', 'mesa', 'banner', 'letrero', 'decoracion', 'casa', 'abierta', 'bienvenida', 'integracion', 'inscripcion', 'extension'],
    // emprendimiento y gestion
    ['emprendimiento', 'negocio', 'startup', 'pitch', 'marketing', 'publicidad', 'feria', 'stand', 'concurso', 'innovacion'],
    // talleres y trabajo en grupo
    ['pizarra', 'marcador', 'papelografo', 'rotafolio', 'borrador', 'tiza', 'taller', 'curso', 'capacitacion', 'reunion']
]

const normalizar = (texto) => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// quita plurales sencillos para que "sensores" y "sensor" coincidan
const raiz = (palabra) => {
    if (palabra.length > 4 && palabra.endsWith('es')) palabra = palabra.slice(0, -2)
    else if (palabra.length > 3 && palabra.endsWith('s')) palabra = palabra.slice(0, -1)
    if (palabra.length > 3 && palabra.endsWith('e')) palabra = palabra.slice(0, -1)
    return palabra
}
const tokenizar = (texto) => normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(p => p.length > 1 && !STOPWORDS.has(p))
    .map(raiz)

const GRUPOS = GRUPOS_RELACIONADOS.map(g => new Set(g.map(t => raiz(normalizar(t)))))

// suma "peso" veces cada termino al mapa de frecuencias
const acumular = (mapa, tokens, peso) => {
    for (const t of tokens) mapa.set(t, (mapa.get(t) ?? 0) + peso)
}

const textoRecurso = (r) => ({
    nombre: tokenizar(r.nombre),
    categoria: tokenizar(ETIQUETA_CATEGORIA[r.categoria] ?? r.categoria),
    descripcion: tokenizar(r.descripcion),
    etiquetas: (r.etiquetas ?? []).flatMap(e => tokenizar(e))
})

const frecuenciasRecurso = (r) => {
    const t = textoRecurso(r)
    const f = new Map()
    acumular(f, t.nombre, PESO_NOMBRE)
    acumular(f, t.categoria, PESO_CATEGORIA)
    acumular(f, t.descripcion, PESO_DESCRIPCION)
    acumular(f, t.etiquetas, PESO_ETIQUETA)
    return f
}

const norma = (vec) => Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0))

/**
 * Filtrado colaborativo sencillo a partir del historial de prestamos.
 * Si otros estudiantes que pidieron los recursos "base" (los que el alumno eligio o ya pidio)
 * tambien pidieron otro recurso, ese recurso suma puntaje.
 * @param {Array}  prestamos  [{usuario, recurso}] (prestamos entregados o devueltos)
 * @param {Set}    baseIds    ids (texto) de los recursos base del estudiante
 * @param {*}      usuarioId  estudiante que consulta (su historial no cuenta como "otros")
 * @returns {Map} id del recurso -> {puntaje (0-1), via: Set de ids base que lo relacionan}
 */
const puntajesColaborativos = (prestamos, baseIds, usuarioId) => {
    const resultado = new Map()
    if (!baseIds.size) return resultado
    const porUsuario = new Map()
    for (const p of prestamos) {
        const u = String(p.usuario)
        if (u === String(usuarioId)) continue
        if (!porUsuario.has(u)) porUsuario.set(u, new Set())
        porUsuario.get(u).add(String(p.recurso))
    }
    for (const recursosUsuario of porUsuario.values()) {
        const comunes = [...recursosUsuario].filter(r => baseIds.has(r))
        if (!comunes.length) continue
        for (const r of recursosUsuario) {
            if (baseIds.has(r)) continue
            const actual = resultado.get(r) ?? { puntaje: 0, via: new Set() }
            actual.puntaje += comunes.length / recursosUsuario.size
            comunes.forEach(c => actual.via.add(c))
            resultado.set(r, actual)
        }
    }
    const maximo = Math.max(0, ...[...resultado.values()].map(v => v.puntaje))
    if (maximo > 0) for (const v of resultado.values()) v.puntaje /= maximo
    return resultado
}

/**
 * Recomienda recursos para el proyecto de un estudiante.
 * @param {Array}  recursos      recursos candidatos (objetos con _id, nombre, descripcion, categoria, etiquetas, ...)
 * @param {Object} opciones
 * @param {string} opciones.contexto       descripcion del proyecto del estudiante
 * @param {Array}  opciones.seleccionados  recursos que el estudiante ya selecciono (se excluyen del resultado)
 * @param {number} opciones.limite         maximo de recomendaciones
 * @param {Map}    opciones.colaborativo   resultado de puntajesColaborativos (opcional)
 * @param {Map}    opciones.nombresBase    id -> nombre de los recursos base, para explicar la razon (opcional)
 * @returns {Array} [{recurso, relevancia (0-100, relativa al mejor resultado), terminosCoincidentes, terminosRelacionados, porHistorial, razon}]
 */
const recomendarRecursos = (recursos, { contexto = '', seleccionados = [], limite = 5, colaborativo = new Map(), nombresBase = new Map() } = {}) => {
    const idsSeleccionados = new Set(seleccionados.map(s => String(s._id)))
    const candidatos = recursos.filter(r => !idsSeleccionados.has(String(r._id)))
    if (candidatos.length === 0) return []

    // IDF suavizado sobre los candidatos: los terminos poco frecuentes pesan mas
    const frecuencias = candidatos.map(frecuenciasRecurso)
    const df = new Map()
    for (const f of frecuencias) for (const t of f.keys()) df.set(t, (df.get(t) ?? 0) + 1)
    const N = candidatos.length
    const idf = (t) => Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1

    // consulta: contexto del proyecto + recursos ya seleccionados + terminos relacionados
    const consulta = new Map()
    const tokensContexto = tokenizar(contexto)
    acumular(consulta, tokensContexto, 1)
    for (const s of seleccionados) {
        const t = textoRecurso(s)
        acumular(consulta, [...t.nombre, ...t.descripcion, ...t.etiquetas], PESO_SELECCIONADO)
    }
    const directos = new Set(consulta.keys())
    const relacionados = new Set()
    for (const termino of directos) {
        for (const grupo of GRUPOS) {
            if (!grupo.has(termino)) continue
            for (const otro of grupo) {
                if (!directos.has(otro)) {
                    consulta.set(otro, (consulta.get(otro) ?? 0) + PESO_RELACIONADO)
                    relacionados.add(otro)
                }
            }
        }
    }

    const vectorConsulta = new Map([...consulta].map(([t, f]) => [t, f * idf(t)]))
    const normaConsulta = norma(vectorConsulta)
    const hayHistorial = colaborativo.size > 0
    if (normaConsulta === 0 && !hayHistorial) return []

    const calculados = candidatos.map((recurso, i) => {
        const vectorRecurso = new Map([...frecuencias[i]].map(([t, f]) => [t, f * idf(t)]))
        let producto = 0
        const coincidentes = []
        const relacionadosEncontrados = []
        for (const [t, v] of vectorRecurso) {
            if (!vectorConsulta.has(t)) continue
            producto += v * vectorConsulta.get(t)
            if (directos.has(t)) coincidentes.push(t)
            else relacionadosEncontrados.push(t)
        }
        const normaRecurso = norma(vectorRecurso)
        const coseno = normaRecurso && normaConsulta ? producto / (normaRecurso * normaConsulta) : 0
        return { recurso, coseno, coincidentes, relacionadosEncontrados }
    })

    // el parecido por texto se normaliza respecto al mejor candidato y se mezcla con el historial
    const maxCoseno = Math.max(0, ...calculados.map(c => c.coseno))
    const resultados = calculados.map(c => {
        const historial = colaborativo.get(String(c.recurso._id))
        const contenido = maxCoseno ? c.coseno / maxCoseno : 0
        const puntaje = hayHistorial ? (1 - PESO_COLABORATIVO) * contenido + PESO_COLABORATIVO * (historial?.puntaje ?? 0) : contenido
        return { ...c, historial, puntaje }
    })
        .filter(r => r.puntaje > 0)
        .sort((a, b) => b.puntaje - a.puntaje || String(a.recurso.nombre).localeCompare(String(b.recurso.nombre)))
        .slice(0, limite)

    // la relevancia se expresa respecto al mejor resultado (el mas parecido vale 100)
    const mejor = resultados.length ? resultados[0].puntaje : 1
    return resultados.map(({ recurso, puntaje, coincidentes, relacionadosEncontrados, historial }) => {
        const razones = []
        if (coincidentes.length) razones.push(`Coincide con tu proyecto en: ${coincidentes.join(', ')}`)
        else if (relacionadosEncontrados.length) razones.push(`Complementa tu proyecto (relacionado con: ${relacionadosEncontrados.join(', ')})`)
        if (historial) {
            const nombres = [...historial.via].map(id => nombresBase.get(id) ?? 'un recurso similar').join(', ')
            razones.push(`Otros estudiantes que pidieron ${nombres} tambien pidieron este recurso`)
        }
        return {
            recurso,
            relevancia: Math.max(1, Math.round((puntaje / mejor) * 100)),
            terminosCoincidentes: coincidentes,
            terminosRelacionados: relacionadosEncontrados,
            porHistorial: Boolean(historial),
            razon: razones.join(' | ')
        }
    })
}

export { recomendarRecursos, puntajesColaborativos, tokenizar }