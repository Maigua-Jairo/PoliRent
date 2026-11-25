import Recurso from '../models/Recurso.js'
import Prestamo, {ESTADOS_ACTIVOS} from '../models/Prestamo.js'
import {recomendarRecursos} from '../helpers/recomendacionHelper.js'
import {responderLocal, responderDeuda, esPreguntaDeuda, esPreguntaSolicitudes, responderSolicitudesActivas, PREGUNTAS_FRECUENTES} from '../helpers/asistenteHelper.js'
import {maxSolicitudesActivas} from '../helpers/politicasHelper.js'
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

// solicitud activa mas reciente del estudiante (se sigue enviando en `prestamoActivo`)
const buscarPrestamoActivo = async (usuario) => {
    if (usuario?.rol !== 'estudiante') return null
    const activo = await Prestamo.findOne({usuario: usuario._id, estado: {$in: ESTADOS_ACTIVOS}}).populate('recurso', 'nombre').lean()
    return activo ? {_id: activo._id, estado: activo.estado, recurso: {_id: activo.recurso?._id, nombre: activo.recurso?.nombre}} : null
}

// cuantas solicitudes pendientes, aprobadas o entregadas tiene el estudiante (null si no es estudiante)
const contarSolicitudesActivas = async (usuario) => usuario?.rol === 'estudiante'
    ? Prestamo.countDocuments({usuario: usuario._id, estado: {$in: ESTADOS_ACTIVOS}})
    : null

// solo se agrega a una recomendacion cuando el estudiante ya llego al maximo de solicitudes activas
const notaMaximoSolicitudes = (activas, maximo) => ` Recuerda que ya tienes ${activas} solicitudes activas, el máximo permitido (${maximo}): `
    + 'cancela una solicitud pendiente, espera la respuesta o devuelve un recurso antes de reservar otro.'

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

        // "¿cuantas solicitudes puedo hacer?": con sesion de estudiante se responde con su cuenta real
        if (esPreguntaSolicitudes(mensaje)) {
            const [activas, prestamoActivo] = await Promise.all([contarSolicitudesActivas(req.usuarioHeader), buscarPrestamoActivo(req.usuarioHeader)])
            const r = responderSolicitudesActivas(mensaje, activas)
            return res.status(200).json({tipo: r.tipo, respuesta: r.respuesta, enlaces: r.enlaces, recomendaciones: [], prestamoActivo, motor: 'local'})
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
        const maximo = maxSolicitudesActivas()
        // sin solicitud activa no hace falta contar; el conteo solo se usa con Gemini o si hay recomendaciones que avisar
        const necesitaConteo = prestamoActivo && (usarGemini || (local.tipo === 'recomendacion' && local.recomendaciones.length))
        const activas = necesitaConteo ? await contarSolicitudesActivas(req.usuarioHeader) : (esEstudiante ? 0 : null)
        const contextoUsuario = [
            activas !== null
                ? `Tiene ${activas} de ${maximo} solicitudes activas, asi que puede pedir ${Math.max(0, maximo - activas)} recurso(s) mas.`
                    + (prestamoActivo ? ` La mas reciente es de "${prestamoActivo.recurso.nombre}" (${prestamoActivo.estado}).` : '')
                : '',
            resumen?.totalAdeudado > 0
                ? `Tiene penalizaciones pendientes por $${resumen.totalAdeudado.toFixed(2)}, asi que no puede solicitar recursos hasta regularizarlas con la asociacion.`
                    + (resumen.totalEnRevision > 0 ? ` De ese monto, $${resumen.totalEnRevision.toFixed(2)} estan en revision: el administrador esta verificando su comprobante de pago.` : '')
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
        const respuesta = local.tipo === 'recomendacion' && local.recomendaciones.length && activas !== null && activas >= maximo
            ? local.respuesta + notaMaximoSolicitudes(activas, maximo)
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
