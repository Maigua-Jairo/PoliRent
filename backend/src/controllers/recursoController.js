import Recurso from '../models/Recurso.js'
import {cloudinaryConfigurado, subirImagen, eliminarImagen} from '../config/cloudinary.js'

const MSG_SIN_CLOUDINARY = 'La subida de imagenes no esta disponible: falta configurar Cloudinary'

//  registrar un recurso
const crearRecurso = async (req, res) => {
    const {nombre, descripcion, categoria, estado, imagen} = req.body
    try{
        const existe = await Recurso.findOne({nombre: nombre.trim(), categoria})
        if(existe){
            return res.status(400).json({msg: 'Ya existe un recurso con ese nombre en la categoria'})
        }
        let imagenSubida = null
        if(req.file){
            if(!cloudinaryConfigurado()){
                return res.status(503).json({msg: MSG_SIN_CLOUDINARY})
            }
            imagenSubida = await subirImagen(req.file.buffer)
        }
        const recurso = await Recurso.create({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim(),
            categoria,
            estado,
            imagen: imagenSubida ? imagenSubida.url : imagen?.trim(),
            imagenId: imagenSubida?.publicId ?? null
        })
        res.status(201).json({msg: 'Recurso registrado correctamente', recurso})
    }catch(error){
        res.status(500).json({msg: `Error al registrar el recurso - ${error}`})
    }
}

//  consultar los recursos y su estado (filtros opcionales: categoria, estado)
const listarRecursos = async (req, res) => {
    const {categoria, estado} = req.query
    try{
        const filtro = {}
        if(categoria !== undefined){
            if(typeof categoria !== 'string' || !['tecnico', 'academico', 'recreativo'].includes(categoria)){
                return res.status(400).json({msg: 'Categoria no valida'})
            }
            filtro.categoria = categoria
        }
        if(estado !== undefined){
            if(typeof estado !== 'string' || !['disponible', 'prestado', 'mantenimiento'].includes(estado)){
                return res.status(400).json({msg: 'Estado no valido'})
            }
            filtro.estado = estado
        }
        const recursos = await Recurso.find(filtro).sort({createdAt: -1})
        res.status(200).json({total: recursos.length, recursos})
    }catch(error){
        res.status(500).json({msg: `Error al listar los recursos - ${error}`})
    }
}

// consultar un recurso
const detalleRecurso = async (req, res) => {
    try{
        const recurso = await Recurso.findById(req.params.id)
        if(!recurso){
            return res.status(404).json({msg: 'Recurso no encontrado'})
        }
        res.status(200).json(recurso)
    }catch(error){
        res.status(500).json({msg: `Error al consultar el recurso - ${error}`})
    }
}

// actualizar un recurso
const actualizarRecurso = async (req, res) => {
    const {nombre, descripcion, categoria, estado, imagen} = req.body
    try{
        const recurso = await Recurso.findById(req.params.id)
        if(!recurso){
            return res.status(404).json({msg: 'Recurso no encontrado'})
        }
        const nuevoNombre = nombre !== undefined ? nombre.trim() : recurso.nombre
        const nuevaCategoria = categoria !== undefined ? categoria : recurso.categoria
        if(nuevoNombre !== recurso.nombre || nuevaCategoria !== recurso.categoria){
            const repetido = await Recurso.findOne({nombre: nuevoNombre, categoria: nuevaCategoria, _id: {$ne: recurso._id}})
            if(repetido){
                return res.status(400).json({msg: 'Ya existe un recurso con ese nombre en la categoria'})
            }
        }
        recurso.nombre = nuevoNombre
        recurso.categoria = nuevaCategoria
        if(descripcion !== undefined) recurso.descripcion = descripcion.trim()
        if(estado !== undefined) recurso.estado = estado
        // una imagen subida reemplaza a la anterior; una URL en texto solo se usa si no hay archivo
        let imagenAnteriorId = null
        if(req.file){
            if(!cloudinaryConfigurado()){
                return res.status(503).json({msg: MSG_SIN_CLOUDINARY})
            }
            const imagenSubida = await subirImagen(req.file.buffer)
            imagenAnteriorId = recurso.imagenId
            recurso.imagen = imagenSubida.url
            recurso.imagenId = imagenSubida.publicId
        }else if(imagen !== undefined){
            imagenAnteriorId = recurso.imagenId
            recurso.imagen = imagen.trim()
            recurso.imagenId = null
        }
        await recurso.save()
        await eliminarImagen(imagenAnteriorId)
        res.status(200).json({msg: 'Recurso actualizado correctamente', recurso})
    }catch(error){
        res.status(500).json({msg: `Error al actualizar el recurso - ${error}`})
    }
}

// eliminar un recurso (no se elimina si esta prestado)
const eliminarRecurso = async (req, res) => {
    try{
        const recurso = await Recurso.findById(req.params.id)
        if(!recurso){
            return res.status(404).json({msg: 'Recurso no encontrado'})
        }
        if(recurso.estado === 'prestado'){
            return res.status(400).json({msg: 'No se puede eliminar un recurso que esta prestado'})
        }
        await recurso.deleteOne()
        await eliminarImagen(recurso.imagenId)
        res.status(200).json({msg: 'Recurso eliminado correctamente'})
    }catch(error){
        res.status(500).json({msg: `Error al eliminar el recurso - ${error}`})
    }
}

export {crearRecurso, listarRecursos, detalleRecurso, actualizarRecurso, eliminarRecurso}