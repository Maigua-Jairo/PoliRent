import { v2 as cloudinary } from 'cloudinary'

// configura cloudinary con las variables de entorno (se llama una vez al iniciar)
const configurarCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    })
}

// indica si las tres variables de cloudinary estan definidas
const cloudinaryConfigurado = () => Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
)

// sube un archivo en memoria (buffer de multer) a la carpeta indicada
const subirImagen = (buffer, carpeta = 'polirent/recursos') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({folder: carpeta, resource_type: 'image'}, (error, resultado) => {
            if(error) return reject(error)
            resolve({url: resultado.secure_url, publicId: resultado.public_id})
        })
        stream.end(buffer)
    })
}

// elimina una imagen de cloudinary; si falla no interrumpe la operacion principal
const eliminarImagen = async (publicId) => {
    if(!publicId || !cloudinaryConfigurado()) return
    try{
        await cloudinary.uploader.destroy(publicId)
    }catch(error){
        console.log(`No se pudo eliminar la imagen ${publicId}: ${error.message}`)
    }
}

export {configurarCloudinary, cloudinaryConfigurado, subirImagen, eliminarImagen}
