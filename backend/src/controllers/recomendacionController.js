import Recurso from '../models/Recurso.js'
import Prestamo from '../models/Prestamo.js'
import {recomendarRecursos, puntajesColaborativos} from '../helpers/recomendacionHelper.js'

const datosRecurso = (r) => ({
    _id: r._id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    categoria: r.categoria,
    etiquetas: r.etiquetas ?? [],
    estado: r.estado,
    imagen: r.imagen
})

// HU-009: recomendar recursos segun el contexto del proyecto, los recursos ya seleccionados y el historial de prestamos
const recomendar = async (req, res) => {
    const {contexto, recursosSeleccionados = [], limite = 5} = req.body
    try{
        const [disponibles, seleccionados, prestamos] = await Promise.all([
            Recurso.find({estado: 'disponible'}).lean(),
            recursosSeleccionados.length ? Recurso.find({_id: {$in: recursosSeleccionados}}).lean() : [],
            Prestamo.find({estado: {$in: ['entregado', 'devuelto']}}).select('usuario recurso').lean()
        ])
        // recursos base: los que eligio ahora y los que ya pidio antes
        const propios = prestamos.filter(p => String(p.usuario) === String(req.usuarioHeader._id)).map(p => String(p.recurso))
        const baseIds = new Set([...seleccionados.map(s => String(s._id)), ...propios])
        const colaborativo = puntajesColaborativos(prestamos, baseIds, req.usuarioHeader._id)

        // nombres de los recursos base que explican la recomendacion por historial
        const idsNombres = [...new Set([...colaborativo.values()].flatMap(v => [...v.via]))]
        const base = idsNombres.length ? await Recurso.find({_id: {$in: idsNombres}}).select('nombre').lean() : []
        const nombresBase = new Map(base.map(r => [String(r._id), r.nombre]))

        const resultado = recomendarRecursos(disponibles, {contexto, seleccionados, limite, colaborativo, nombresBase})
        const recomendaciones = resultado.map(({recurso, relevancia, terminosCoincidentes, terminosRelacionados, porHistorial, razon}) => ({
            recurso: datosRecurso(recurso),
            relevancia,
            terminosCoincidentes,
            terminosRelacionados,
            porHistorial,
            razon
        }))
        res.status(200).json({
            msg: recomendaciones.length ? 'Recomendaciones generadas correctamente' : 'No se encontraron recursos disponibles relacionados con tu proyecto',
            total: recomendaciones.length,
            recomendaciones
        })
    }catch(error){
        res.status(500).json({msg: `Error al generar las recomendaciones - ${error}`})
    }
}

export {recomendar}