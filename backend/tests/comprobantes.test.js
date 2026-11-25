import {jest} from '@jest/globals'
import request from 'supertest'
import mongoose from 'mongoose'
import {v2 as cloudinary} from 'cloudinary'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {responderDeuda} from '../src/helpers/asistenteHelper.js'
import {consulta, documento} from './ayudantes.js'

// Comprobante de pago de penalizaciones: pendiente -> en_revision -> pagada (o rechazo -> pendiente).
// Sin base de datos ni Cloudinary real: los modelos y el uploader se simulan.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const ID = '64b7f0f2a1b2c3d4e5f60a01'
const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60a02', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const OTRO = {_id: '64b7f0f2a1b2c3d4e5f60a04', rol: 'estudiante', versionSesion: 0, nombres: 'Juan', apellidos: 'Vera'}
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60a03', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})
const IMAGEN = Buffer.from('imagen')

let penalizacion
let subidas
const nuevaPenalizacion = (campos = {}) => documento({
    _id: ID, usuario: ESTUDIANTE._id, prestamo: 'pr1', tipo: 'danio', monto: 20, estado: 'pendiente',
    descripcion: 'Recurso devuelto danado', recurso: {nombre: 'Proyector'}, ...campos
})

const enviar = (u = ESTUDIANTE) => request(app).put(`/api/penalizaciones/${ID}/comprobante`).set('Authorization', token(u))
const conArchivo = (req) => req.attach('comprobante', IMAGEN, {filename: 'pago.png', contentType: 'image/png'})

beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'nube'
    process.env.CLOUDINARY_API_KEY = 'clave'
    process.env.CLOUDINARY_API_SECRET = 'secreto'
    subidas = 0
    jest.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation((opciones, cb) => ({
        end: () => {
            subidas += 1
            cb(null, {secure_url: `https://res.cloudinary.com/nube/${opciones.folder}/c${subidas}.png`, public_id: `${opciones.folder}/c${subidas}`})
        }
    }))
    jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({result: 'ok'})
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([{_id: ADMIN._id}])})
    penalizacion = nuevaPenalizacion()
    // findOne({_id, usuario}): solo encuentra la penalizacion si es del estudiante que consulta
    jest.spyOn(Penalizacion, 'findOne').mockImplementation((filtro) =>
        consulta(() => penalizacion && String(filtro.usuario) === String(penalizacion.usuario) ? penalizacion : null))
    jest.spyOn(Penalizacion, 'findById').mockImplementation(() => consulta(() => penalizacion))
})
afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.CLOUDINARY_CLOUD_NAME
    delete process.env.CLOUDINARY_API_KEY
    delete process.env.CLOUDINARY_API_SECRET
})

describe('Rutas nuevas protegidas', () => {
    const rutas = [
        ['put', `/api/penalizaciones/${ID}/comprobante`, 'estudiante'],
        ['put', `/api/penalizaciones/${ID}/rechazar-comprobante`, 'administrador']
    ]
    test.each(rutas)('%s %s sin token responde 401', async (metodo, ruta) => {
        const res = await request(app)[metodo](ruta)
        expect(res.status).toBe(401)
    })

    test.each(rutas)('%s %s con otro rol responde 403', async (metodo, ruta, rol) => {
        const otro = rol === 'estudiante' ? ADMIN : ESTUDIANTE
        sesion(otro)
        const res = await request(app)[metodo](ruta).set('Authorization', token(otro))
        expect(res.status).toBe(403)
    })

    test('sin token el archivo no se procesa ni se sube', async () => {
        const res = await conArchivo(request(app).put(`/api/penalizaciones/${ID}/comprobante`))
        expect(res.status).toBe(401)
        expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled()
    })
})

describe('PUT /api/penalizaciones/:id/comprobante (estudiante)', () => {
    beforeEach(() => sesion(ESTUDIANTE))

    test('sube el comprobante, pasa a en_revision y notifica a los administradores', async () => {
        const res = await conArchivo(enviar()).field('referencia', ' TRX-004512 ').field('observaciones', 'Deposito en Banco Pichincha')
        expect(res.status).toBe(200)
        expect(res.body.msg).toBe('Comprobante enviado, el administrador lo revisara')
        expect(res.body.penalizacion).toMatchObject({
            estado: 'en_revision',
            motivoRechazoComprobante: '',
            comprobante: {url: expect.stringContaining('polirent/comprobantes'), referencia: 'TRX-004512', observaciones: 'Deposito en Banco Pichincha', subidoEn: expect.any(String)}
        })
        expect(JSON.stringify(res.body)).not.toContain('publicId')
        expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(expect.objectContaining({folder: 'polirent/comprobantes'}), expect.any(Function))
        expect(Penalizacion.findOne).toHaveBeenCalledWith({_id: ID, usuario: ESTUDIANTE._id})
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({
            usuario: ADMIN._id, tipo: 'penalizacion', mensaje: 'Ana Mora envio el comprobante de pago de $20.00 (Proyector).'
        }))
    })

    test('no puede subir el comprobante de la penalizacion de otro estudiante (404)', async () => {
        sesion(OTRO)
        const res = await conArchivo(enviar(OTRO))
        expect(res.status).toBe(404)
        expect(res.body.msg).toBe('Penalizacion no encontrada')
        expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled()
    })

    test('una penalizacion inexistente responde el mismo 404', async () => {
        penalizacion = null
        const res = await conArchivo(enviar())
        expect(res.status).toBe(404)
        expect(res.body.msg).toBe('Penalizacion no encontrada')
    })

    test('sin archivo responde 400', async () => {
        const res = await enviar().field('referencia', 'TRX-1')
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Adjunta el comprobante de pago')
    })

    test('un archivo que no es imagen responde 400', async () => {
        const res = await enviar().attach('comprobante', Buffer.from('texto'), {filename: 'pago.txt', contentType: 'text/plain'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La imagen debe ser JPG, PNG o WEBP')
    })

    test.each(['pagada', 'anulada'])('una penalizacion %s rechaza el envio (400)', async (estado) => {
        penalizacion.estado = estado
        const res = await conArchivo(enviar())
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Solo se puede enviar comprobante de penalizaciones pendientes')
        expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled()
    })

    test.each([
        ['referencia', 'ab', 'La referencia debe tener entre 3 y 50 caracteres'],
        ['referencia', 'x'.repeat(51), 'La referencia debe tener entre 3 y 50 caracteres'],
        ['observaciones', 'x'.repeat(201), 'Las observaciones deben ser texto de maximo 200 caracteres']
    ])('valida %s (400)', async (campo, valor, msg) => {
        const res = await conArchivo(enviar()).field(campo, valor)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
    })

    test('un campo repetido (arreglo) responde 400', async () => {
        const res = await conArchivo(enviar()).field('referencia', 'TRX-1').field('referencia', 'TRX-2')
        expect(res.status).toBe(400)
    })

    test('un id invalido responde 400', async () => {
        const res = await conArchivo(request(app).put('/api/penalizaciones/abc/comprobante').set('Authorization', token(ESTUDIANTE)))
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El id de la penalizacion no es valido')
    })

    test('sin Cloudinary configurado responde 503', async () => {
        delete process.env.CLOUDINARY_API_SECRET
        const res = await conArchivo(enviar())
        expect(res.status).toBe(503)
        expect(res.body.msg).toBe('La subida de imagenes no esta disponible: falta configurar Cloudinary')
    })

    test('en revision, el comprobante nuevo reemplaza al anterior y borra la imagen anterior', async () => {
        penalizacion = nuevaPenalizacion({estado: 'en_revision', comprobante: {url: 'https://res.cloudinary.com/viejo.png', publicId: 'polirent/comprobantes/viejo'}})
        const res = await conArchivo(enviar())
        expect(res.status).toBe(200)
        expect(res.body.penalizacion.comprobante.url).toMatch(/c1\.png$/)
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('polirent/comprobantes/viejo')
    })

    test('si falla el guardado despues de subir, se borra la imagen subida', async () => {
        penalizacion.save = async () => { throw new Error('fallo de base de datos') }
        jest.spyOn(console, 'error').mockImplementation(() => {})
        const res = await conArchivo(enviar())
        expect(res.status).toBe(500)
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('polirent/comprobantes/c1')
    })

    test('limpia el motivo del rechazo anterior', async () => {
        penalizacion.motivoRechazoComprobante = 'La foto no se lee'
        const res = await conArchivo(enviar())
        expect(res.body.penalizacion.motivoRechazoComprobante).toBe('')
    })
})

describe('Revision del administrador', () => {
    beforeEach(() => sesion(ADMIN))

    test('flujo pendiente -> en_revision -> pagada y notifica al estudiante', async () => {
        sesion(ESTUDIANTE)
        const subida = await conArchivo(enviar())
        expect(subida.body.penalizacion.estado).toBe('en_revision')

        sesion(ADMIN)
        Notificacion.create.mockClear()
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizacion).toMatchObject({estado: 'pagada', fechaPago: expect.any(String), fechaRevision: expect.any(String)})
        // el comprobante se conserva como respaldo
        expect(res.body.penalizacion.comprobante.url).toMatch(/comprobantes/)
        expect(penalizacion.revisadaPor).toBe(ADMIN._id)
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({usuario: ESTUDIANTE._id, tipo: 'penalizacion', mensaje: expect.stringContaining('Se registro el pago de $20.00')}))
    })

    test('pagar desde en_revision funciona', async () => {
        penalizacion.estado = 'en_revision'
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizacion.estado).toBe('pagada')
    })

    test('el rechazo exige un motivo', async () => {
        penalizacion.estado = 'en_revision'
        const res = await request(app).put(`/api/penalizaciones/${ID}/rechazar-comprobante`).set('Authorization', token(ADMIN)).send({})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El motivo del rechazo del comprobante debe tener entre 3 y 200 caracteres')
    })

    test.each([[{motivoRechazoComprobante: 'ok'}], [{motivoRechazoComprobante: {$ne: null}}], [{motivoRechazoComprobante: ['La foto no se lee']}], [{motivo: 'La foto no se lee'}]])('el rechazo valida el motivo (%j)', async (cuerpo) => {
        penalizacion.estado = 'en_revision'
        const res = await request(app).put(`/api/penalizaciones/${ID}/rechazar-comprobante`).set('Authorization', token(ADMIN)).send(cuerpo)
        expect(res.status).toBe(400)
    })

    test('no se puede rechazar el comprobante de una pendiente', async () => {
        const res = await request(app).put(`/api/penalizaciones/${ID}/rechazar-comprobante`).set('Authorization', token(ADMIN)).send({motivoRechazoComprobante: 'La foto no se lee'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Solo se puede rechazar el comprobante de una penalizacion en revision')
    })

    test('el rechazo devuelve a pendiente, borra la imagen y notifica el motivo', async () => {
        penalizacion = nuevaPenalizacion({estado: 'en_revision', comprobante: {url: 'https://res.cloudinary.com/c.png', publicId: 'polirent/comprobantes/c9'}})
        const res = await request(app).put(`/api/penalizaciones/${ID}/rechazar-comprobante`).set('Authorization', token(ADMIN)).send({motivoRechazoComprobante: ' La foto no se lee '})
        expect(res.status).toBe(200)
        expect(res.body.penalizacion).toMatchObject({estado: 'pendiente', comprobante: null, motivoRechazoComprobante: 'La foto no se lee', fechaRevision: expect.any(String)})
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('polirent/comprobantes/c9')
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({usuario: ESTUDIANTE._id, tipo: 'penalizacion', mensaje: expect.stringContaining('Motivo: La foto no se lee')}))
    })

    test('despues de un rechazo el estudiante puede volver a subir otro comprobante', async () => {
        penalizacion = nuevaPenalizacion({estado: 'en_revision', comprobante: {url: 'u', publicId: 'p'}})
        await request(app).put(`/api/penalizaciones/${ID}/rechazar-comprobante`).set('Authorization', token(ADMIN)).send({motivoRechazoComprobante: 'Monto incorrecto'})
        sesion(ESTUDIANTE)
        const res = await conArchivo(enviar())
        expect(res.status).toBe(200)
        expect(res.body.penalizacion.estado).toBe('en_revision')
    })

    test('anular desde en_revision funciona', async () => {
        penalizacion.estado = 'en_revision'
        const res = await request(app).put(`/api/penalizaciones/${ID}/anular`).set('Authorization', token(ADMIN)).send({motivoAnulacion: 'El estudiante repuso el articulo'})
        expect(res.status).toBe(200)
        expect(res.body.penalizacion.estado).toBe('anulada')
    })

    test.each([['pagar', {}, 'Solo se pueden pagar penalizaciones pendientes o en revision'], ['anular', {motivoAnulacion: 'Otra vez'}, 'Solo se pueden anular penalizaciones pendientes o en revision']])(
        'no se puede %s dos veces', async (accion, cuerpo, msg) => {
            penalizacion.estado = accion === 'pagar' ? 'pagada' : 'anulada'
            const res = await request(app).put(`/api/penalizaciones/${ID}/${accion}`).set('Authorization', token(ADMIN)).send(cuerpo)
            expect(res.status).toBe(400)
            expect(res.body.msg).toBe(msg)
        })

    test('dos pagos simultaneos: el segundo choca con la version y responde 400, no 500', async () => {
        penalizacion.save = async () => { throw new mongoose.Error.VersionError({_doc: {_id: ID}}, 0, []) }
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/al mismo tiempo/)
    })

    test('GET /api/penalizaciones?estado=en_revision es la cola de revision con el comprobante', async () => {
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([
            {_id: 'a', monto: 20, estado: 'en_revision', comprobante: {url: 'https://res.cloudinary.com/c.png', publicId: 'secreto/c', referencia: 'TRX-1'}},
            {_id: 'b', monto: 5, estado: 'en_revision', comprobante: {url: 'https://res.cloudinary.com/d.png', publicId: 'secreto/d'}}
        ]))
        const res = await request(app).get('/api/penalizaciones?estado=en_revision').set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({total: 2, totalEnRevision: 25, totalPendiente: 0})
        expect(res.body.penalizaciones[0].comprobante).toMatchObject({url: 'https://res.cloudinary.com/c.png', referencia: 'TRX-1'})
        expect(JSON.stringify(res.body)).not.toContain('secreto/')
        expect(Penalizacion.find).toHaveBeenCalledWith({estado: 'en_revision'})
    })
})

describe('La penalizacion en revision sigue siendo deuda', () => {
    test('GET /api/penalizaciones/mis suma pendientes + en revision y trae el comprobante sin publicId', async () => {
        sesion(ESTUDIANTE)
        const lista = [
            {_id: 'p1', monto: 20, estado: 'pendiente', motivoRechazoComprobante: 'La foto no se lee'},
            {_id: 'p2', monto: 7.5, estado: 'en_revision', comprobante: {url: 'https://res.cloudinary.com/c.png', publicId: 'secreto/c', subidoEn: new Date()}},
            {_id: 'p3', monto: 3, estado: 'pagada'}
        ]
        jest.spyOn(Penalizacion, 'find').mockImplementation((filtro) => consulta(filtro.estado?.$in ? lista.filter(p => filtro.estado.$in.includes(p.estado)) : lista))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await request(app).get('/api/penalizaciones/mis').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({totalAdeudado: 27.5, totalEnRevision: 7.5})
        expect(res.body.penalizaciones[0].motivoRechazoComprobante).toBe('La foto no se lee')
        expect(res.body.penalizaciones[1].comprobante).toEqual({url: 'https://res.cloudinary.com/c.png', subidoEn: expect.any(String), referencia: '', observaciones: ''})
        expect(JSON.stringify(res.body)).not.toContain('secreto/')
    })

    test('GET /api/penalizaciones/mis acepta ?estado=en_revision', async () => {
        sesion(ESTUDIANTE)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await request(app).get('/api/penalizaciones/mis?estado=en_revision').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
    })

    test('el bloqueo de solicitudes sigue activo con penalizaciones en revision', async () => {
        process.env.VALIDAR_HORARIO = 'false'
        sesion(ESTUDIANTE)
        jest.spyOn(Recurso, 'findById').mockResolvedValue({_id: 'r1', nombre: 'Proyector', estado: 'disponible'})
        // regla de maximo de solicitudes activas: 0 activas
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Prestamo, 'create').mockResolvedValue({})
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{monto: 12.5, estado: 'en_revision'}]))
        const res = await request(app).post('/api/prestamos').set('Authorization', token(ESTUDIANTE)).send({
            recursoId: '64b7f0f2a1b2c3d4e5f60a09',
            fechaDevolucion: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
            aceptaTerminos: true,
            docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec'}
        })
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Tienes penalizaciones pendientes por $12.50, de las cuales $12.50 estan en revision. Podras solicitar otro recurso cuando el administrador confirme el pago')
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('el asistente dice cuanto esta en revision', () => {
        const solo = responderDeuda('cuanto debo?', {totalAdeudado: 7.5, totalEnRevision: 7.5, totalAtrasoEnCurso: 0})
        expect(solo.respuesta).toMatch(/^Tienes \$7\.50 en revisión: el administrador está verificando tu comprobante/)
        const mixto = responderDeuda('cuanto debo?', {totalAdeudado: 27.5, totalEnRevision: 7.5, totalAtrasoEnCurso: 0})
        expect(mixto.respuesta).toMatch(/^Tienes \$20\.00 en penalizaciones pendientes\. Tienes \$7\.50 en revisión/)
        expect(mixto.enlaces).toContainEqual({texto: 'Mis penalizaciones', ruta: '/penalizaciones'})
    })
})

describe('Swagger del comprobante', () => {
    test('documenta las rutas nuevas, el multipart y el estado en_revision', async () => {
        const {default: especificacion} = await import('../src/docs/openapi.js')
        const subida = especificacion.paths['/api/penalizaciones/{id}/comprobante'].put
        expect(subida.requestBody.content['multipart/form-data'].schema.properties.comprobante).toMatchObject({type: 'string', format: 'binary'})
        expect(Object.keys(subida.responses)).toEqual(expect.arrayContaining(['200', '400', '401', '403', '404', '503']))
        // el campo se renombro de motivo a motivoRechazoComprobante
        expect(especificacion.paths['/api/penalizaciones/{id}/rechazar-comprobante'].put.requestBody.content['application/json'].schema.required).toEqual(['motivoRechazoComprobante'])
        expect(especificacion.components.schemas.Penalizacion.properties.estado.enum).toContain('en_revision')
        expect(especificacion.components.schemas.Penalizacion.properties.comprobante.properties.publicId).toBeUndefined()
    })
})
