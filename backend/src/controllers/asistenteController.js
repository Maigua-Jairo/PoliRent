import Recurso from '../models/Recurso.js'
import Prestamo, {ESTADOS_ACTIVOS} from '../models/Prestamo.js'
import {recomendarRecursos} from '../helpers/recomendacionHelper.js'
import {responderLocal, responderDeuda, esPreguntaDeuda, PREGUNTAS_FRECUENTES} from '../helpers/asistenteHelper.js'
import {resumenPenalizaciones} from '../helpers/penalizacionHelper.js'
import {consultarGemini} from '../helpers/geminiHelper.js'
import {datosRecurso} from './recomendacionController.js'

const MAX_RECOMENDACIONES = 5
// con catalogos grandes, a Gemini solo se le envian los mejores candidatos del motor local
const MAX_RECURSOS_GEMINI = 150
const CANDIDATOS_GEMINI = 40
const RAZON_GEMINI = 'Sugerido por el asistente para tu proyecto'

const formatoRecomendacion = ({recurso, relevancia = null, razon}) => ({recurso: datosRecurso(recurso), relevancia, razon})

const enlacesDeTemas = (temas) => {
    const vistos = new Set()
    return PREGUNTAS_FRECUENTES
        .filter(p => temas.includes(p.id))
        .flatMap(p => p.enlaces)
        .filter(e => !vistos.has(e.ruta) && vistos.add(e.ruta))
        .slice(0, 3)
}

// prestamo activo del estudiante: limita lo que puede reservar (un prestamo a la vez)
const buscarPrestamoActivo = async (usuario) => {
    if (usuario?.rol !== 'estudiante') return null
    const activo = await Prestamo.findOne({usuario: usuario._id, estado: {$in: ESTADOS_ACTIVOS}}).populate('recurso', 'nombre').lean()
    return activo ? {_id: activo._id, estado: activo.estado, recurso: {_id: activo.recurso?._id, nombre: activo.recurso?.nombre}} : null
}

const notaPrestamoActivo = (activo) => ` Recuerda que ya tienes ${activo.estado === 'pendiente' ? 'una solicitud en revisión' : 'un préstamo en curso'}`
    + `${activo.recurso?.nombre ? ` (${activo.recurso.nombre})` : ''}: solo puedes tener uno a la vez, así que primero debes `
    + `${activo.estado === 'pendiente' ? 'cancelarla o esperar la respuesta' : 'devolverlo'}.`

// Asistente: ayuda sobre PoliRent + recomendacion de recursos; publico, con sesion opcional
const conversar = async (req, res) => {
    const mensaje = req.body.mensaje.trim()
    const historial = req.body.historial ?? []
    const esEstudiante = req.usuarioHeader?.rol === 'estudiante'
    try {
        // "¿cuanto debo?": se responde con los datos reales del estudiante, sin el motor local ni Gemini
        if (esPreguntaDeuda(mensaje)) {
            const [resumen, prestamoActivo] = await Promise.all([
                esEstudiante ? resumenPenalizaciones(req.usuarioHeader._id) : null,
                buscarPrestamoActivo(req.usuarioHeader)
            ])
            const deuda = responderDeuda(mensaje, resumen)
            return res.status(200).json({
                tipo: deuda.tipo,
                respuesta: deuda.respuesta,
                enlaces: deuda.enlaces,
                recomendaciones: [],
                prestamoActivo,
                motor: 'local'
            })
        }

        const [disponibles, prestamoActivo] = await Promise.all([
            Recurso.find({estado: 'disponible'}).lean(),
            buscarPrestamoActivo(req.usuarioHeader)
        ])
        // todos los recursos con algun parecido, de mas a menos relevante
        const puntuados = recomendarRecursos(disponibles, {contexto: mensaje, limite: disponibles.length})

        const local = responderLocal(mensaje, puntuados.slice(0, MAX_RECOMENDACIONES))

        // 1) Gemini, si esta configurado y el motor local no esta seguro (las dudas claras se responden al instante)
        const candidatos = disponibles.length <= MAX_RECURSOS_GEMINI ? disponibles : puntuados.slice(0, CANDIDATOS_GEMINI).map(p => p.recurso)
        const usarGemini = !local.seguro && Boolean(process.env.GEMINI_API_KEY)
        // la deuda solo se consulta si se va a preguntar a Gemini (el motor local no la necesita)
        const resumen = usarGemini && esEstudiante ? await resumenPenalizaciones(req.usuarioHeader._id) : null
        const contextoUsuario = [
            prestamoActivo
                ? `Tiene ${prestamoActivo.estado === 'pendiente' ? 'una solicitud en revision' : 'un prestamo en curso'} de "${prestamoActivo.recurso.nombre}", asi que no puede reservar otro recurso hasta ${prestamoActivo.estado === 'pendiente' ? 'cancelarla o que la rechacen' : 'devolverlo'}.`
                : '',
            resumen?.totalAdeudado > 0
                ? `Tiene penalizaciones pendientes por $${resumen.totalAdeudado.toFixed(2)}, asi que no puede solicitar recursos hasta regularizarlas con la asociacion.`
                : ''
        ].filter(Boolean).join(' ')
        const gemini = usarGemini ? await consultarGemini({mensaje, historial, recursos: candidatos, contextoUsuario}) : null
        if (gemini) {
            const porId = new Map(candidatos.map(r => [String(r._id), r]))
            const locales = new Map(puntuados.map(p => [String(p.recurso._id), p]))
            return res.status(200).json({
                tipo: gemini.tipo,
                respuesta: gemini.respuesta,
                enlaces: enlacesDeTemas(gemini.temas),
                recomendaciones: gemini.recursos.map(id => {
                    const local = locales.get(id)
                    return formatoRecomendacion({recurso: porId.get(id), relevancia: local?.relevancia ?? null, razon: local?.razon || RAZON_GEMINI})
                }),
                prestamoActivo,
                motor: 'gemini'
            })
        }

        // 2) motor local (respuesta segura, sin clave de Gemini o si fallo)
        const respuesta = local.tipo === 'recomendacion' && local.recomendaciones.length && prestamoActivo
            ? local.respuesta + notaPrestamoActivo(prestamoActivo)
            : local.respuesta
        res.status(200).json({
            tipo: local.tipo,
            respuesta,
            enlaces: local.enlaces,
            recomendaciones: local.recomendaciones.map(formatoRecomendacion),
            prestamoActivo,
            motor: 'local'
        })
    } catch (error) {
        res.status(500).json({msg: `Error en el asistente - ${error}`})
    }
}

export {conversar}
