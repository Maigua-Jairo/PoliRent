import {jest} from '@jest/globals'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/server.js'
import especificacion from '../src/docs/openapi.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {consulta, documento} from './ayudantes.js'

// Auditoria de validaciones y endpoints: un test por cada hallazgo corregido y regresiones de seguridad
// (operadores NoSQL, asignacion masiva, propiedad). Sin base de datos.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60d01', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60d02', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const ID = '64b7f0f2a1b2c3d4e5f60d03'
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})
const versionError = () => new mongoose.Error.VersionError({_doc: {_id: ID}}, 0, [])

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('server.js y manejo de errores', () => {
    test('no envia el encabezado x-powered-by', async () => {
        const res = await request(app).get('/')
        expect(res.headers['x-powered-by']).toBeUndefined()
    })

    test('un JSON de mas de 100 KB responde 400 (antes 500)', async () => {
        const res = await request(app).post('/api/login').set('Content-Type', 'application/json').send(`{"correo":"${'a'.repeat(200000)}"}`)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El cuerpo de la solicitud es demasiado grande')
    })

    test('un charset no soportado responde 400 (antes 500)', async () => {
        const res = await request(app).post('/api/login').set('Content-Type', 'application/json; charset=latin9').send('{}')
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El cuerpo de la solicitud no es valido')
    })

    test('un multipart sin boundary responde 400 (antes 500)', async () => {
        sesion(ADMIN)
        const res = await request(app).post('/api/recursos').set('Authorization', token(ADMIN)).set('Content-Type', 'multipart/form-data').send('xx')
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El formulario (multipart/form-data) no es valido')
    })

    test('un archivo en un campo que no corresponde se explica (no dice que el formato es incorrecto)', async () => {
        sesion(ESTUDIANTE)
        const res = await request(app).put(`/api/penalizaciones/${ID}/comprobante`).set('Authorization', token(ESTUDIANTE))
            .attach('imagen', Buffer.from('x'), {filename: 'pago.png', contentType: 'image/png'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('No se esperaba un archivo en el campo "imagen"')
    })

    test('solo se acepta un archivo por peticion', async () => {
        sesion(ADMIN)
        const res = await request(app).put(`/api/prestamos/${ID}/devolver`).set('Authorization', token(ADMIN))
            .attach('evidencia', Buffer.from('a'), {filename: 'a.png', contentType: 'image/png'})
            .attach('evidencia', Buffer.from('b'), {filename: 'b.png', contentType: 'image/png'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Los datos del formulario no son validos')
    })

    test('una ruta inexistente responde 404 con {msg}', async () => {
        const res = await request(app).get('/api/no-existe')
        expect(res.status).toBe(404)
        expect(res.body).toEqual({msg: 'Ruta no encontrada'})
    })
})

describe('Autenticacion: 401 solo por sesion invalida', () => {
    test('si la base de datos falla al verificar la sesion responde 500, no 401 (el frontend cerraria la sesion)', async () => {
        jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.reject(new Error('base caida'))})
        const res = await request(app).get('/api/perfil').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(500)
        expect(res.body.msg).toBe('No se pudo verificar la sesion, intenta mas tarde')
    })

    test('un token mal firmado sigue respondiendo 401', async () => {
        const res = await request(app).get('/api/perfil').set('Authorization', 'Bearer abc.def.ghi')
        expect(res.status).toBe(401)
    })

    test('un token valido de un usuario eliminado sigue respondiendo 401', async () => {
        sesion(null)
        const res = await request(app).get('/api/perfil').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(401)
    })
})

describe('Datos sensibles', () => {
    const recursoConImagen = () => new Recurso({nombre: 'Proyector', categoria: 'academico', imagen: 'https://res.cloudinary.com/x.png', imagenId: 'polirent/recursos/secreto'})

    test('GET /api/recursos no expone imagenId (publicId de Cloudinary)', async () => {
        jest.spyOn(Recurso, 'find').mockReturnValue({sort: () => Promise.resolve([recursoConImagen()])})
        const res = await request(app).get('/api/recursos')
        expect(res.status).toBe(200)
        expect(res.body.recursos[0].imagen).toBe('https://res.cloudinary.com/x.png')
        expect(JSON.stringify(res.body)).not.toContain('imagenId')
        expect(JSON.stringify(res.body)).not.toContain('secreto')
    })

    test('GET /api/recursos/:id no expone imagenId', async () => {
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recursoConImagen())
        const res = await request(app).get(`/api/recursos/${ID}`)
        expect(res.status).toBe(200)
        expect(res.body.imagenId).toBeUndefined()
    })

    test('GET /api/usuarios no expone contrasenas, tokens ni versionSesion', async () => {
        sesion(ADMIN)
        jest.spyOn(Usuario, 'find').mockReturnValue({select: () => ({sort: () => Promise.resolve([{_id: 'u1', nombres: 'Ana', password: 'hash', tokenRecuperacion: 't', versionSesion: 3, rol: 'estudiante'}])})})
        const res = await request(app).get('/api/usuarios').set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(Object.keys(res.body.usuarios[0])).not.toEqual(expect.arrayContaining(['password']))
        expect(JSON.stringify(res.body)).not.toMatch(/hash|tokenRecuperacion|versionSesion/)
    })
})

describe('Recursos: etiquetas e imagen como texto', () => {
    beforeEach(() => sesion(ADMIN))
    const crear = (cuerpo) => request(app).post('/api/recursos').set('Authorization', token(ADMIN)).send({nombre: 'Proyector', categoria: 'academico', ...cuerpo})

    // limites nuevos (revision de la tesis): maximo 15 etiquetas, de 2 a 30 caracteres y sin repetir; cada error nombra el problema
    test.each([
        [{etiquetas: {$ne: null}}, 'Las etiquetas del recurso deben ser una lista de textos o un texto separado por comas'],
        [{etiquetas: [{a: 1}]}, 'Las etiquetas del recurso deben ser una lista de textos o un texto separado por comas'],
        [{etiquetas: Array.from({length: 16}, (_, i) => `etiqueta${i}`)}, 'El recurso puede tener maximo 15 etiquetas'],
        [{etiquetas: ['x']}, 'Cada etiqueta del recurso debe tener entre 2 y 30 caracteres'],
        [{etiquetas: ['a'.repeat(31)]}, 'Cada etiqueta del recurso debe tener entre 2 y 30 caracteres'],
        [{etiquetas: ['Robotica', 'robótica']}, 'Las etiquetas del recurso no pueden repetirse']
    ])('rechaza etiquetas invalidas %j (400)', async (cuerpo, msg) => {
        const res = await crear(cuerpo)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
    })

    test('acepta etiquetas validas como texto separado por comas (multipart)', async () => {
        jest.spyOn(Recurso, 'findOne').mockReturnValue(consulta(null))
        jest.spyOn(Recurso, 'create').mockImplementation(async (datos) => datos)
        const res = await request(app).post('/api/recursos').set('Authorization', token(ADMIN))
            .field('nombre', 'Proyector').field('categoria', 'academico').field('etiquetas', 'proyector, presentacion')
        expect(res.status).toBe(201)
        expect(Recurso.create).toHaveBeenCalledWith(expect.objectContaining({etiquetas: ['proyector', 'presentacion']}))
    })

    test.each(['javascript:alert(1)', 'imagen.png', `https://${'a'.repeat(500)}.png`])('rechaza la imagen en texto "%s"', async (imagen) => {
        const res = await crear({imagen: imagen.slice(0, 600)})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La imagen debe ser una URL http(s) valida o un archivo')
    })

    test('al actualizar acepta imagen vacia (quitar la imagen) y solo etiquetas', async () => {
        const recurso = documento({_id: ID, nombre: 'Proyector', categoria: 'academico', imagen: 'https://x/y.png', imagenId: null})
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recurso)
        const sinImagen = await request(app).put(`/api/recursos/${ID}`).set('Authorization', token(ADMIN)).send({imagen: ''})
        expect(sinImagen.status).toBe(200)
        expect(recurso.imagen).toBe('')
        const soloEtiquetas = await request(app).put(`/api/recursos/${ID}`).set('Authorization', token(ADMIN)).send({etiquetas: ['proyector']})
        expect(soloEtiquetas.status).toBe(200)
        expect(recurso.etiquetas).toEqual(['proyector'])
    })
})

describe('Operadores NoSQL y tipos inesperados responden 400 sin llegar a Mongoose', () => {
    const casos = [
        ['post', '/api/login', null, {correo: {$gt: ''}, password: 'Clave1234'}],
        ['post', '/api/login', null, {correo: 'ana@epn.edu.ec', password: {$ne: null}}],
        ['post', '/api/registro', null, {nombres: 'Ana', apellidos: 'Mora', cedula: '1712345678', correo: {$ne: null}, telefono: '0991234567', facultad: 'Ingeniería Civil', password: 'Clave1234'}],
        ['post', '/api/recuperar-clave', null, {correo: {$ne: null}}],
        ['post', '/api/recuperar-clave/abc', null, {password: {$ne: null}, confirmarPassword: 'x'}],
        ['get', '/api/recursos?estado[$ne]=x', null, undefined],
        ['get', '/api/recursos?categoria[$ne]=x', null, undefined],
        ['get', '/api/recursos?buscar[$regex]=.*', null, undefined],
        ['get', '/api/prestamos?estado[$ne]=x', ADMIN, undefined],
        ['get', '/api/prestamos/mis?estado[$ne]=x', ESTUDIANTE, undefined],
        ['get', '/api/historial?estado[$ne]=x', ESTUDIANTE, undefined],
        ['get', '/api/historial?desde[$gt]=2026-01-01', ESTUDIANTE, undefined],
        ['get', '/api/penalizaciones?usuario[$ne]=x', ADMIN, undefined],
        ['get', '/api/penalizaciones?estado[$in][]=pendiente', ADMIN, undefined],
        ['get', '/api/penalizaciones/mis?estado[$ne]=pagada', ESTUDIANTE, undefined],
        ['get', '/api/reportes/prestamos?formato[$ne]=json', ADMIN, undefined],
        ['get', '/api/notificaciones?leida[$ne]=true', ESTUDIANTE, undefined],
        ['get', '/api/usuarios?rol[$ne]=x', ADMIN, undefined],
        ['delete', '/api/perfil', ESTUDIANTE, {password: {$ne: null}}],
        ['put', '/api/perfil', ESTUDIANTE, {telefono: {$ne: null}}],
        ['post', '/api/prestamos/escanear', ADMIN, {codigo: {$ne: null}}],
        ['post', '/api/prestamos', ESTUDIANTE, {recursoId: {$ne: null}}],
        ['put', `/api/prestamos/${ID}/rechazar`, ADMIN, {motivo: {$ne: null}}],
        ['put', `/api/prestamos/${ID}/entregar`, ADMIN, {responsable: {$ne: null}}],
        ['put', `/api/penalizaciones/${ID}/anular`, ADMIN, {motivo: {$ne: null}}],
        ['post', '/api/asistente', null, {mensaje: {$ne: null}}],
        ['post', '/api/asistente', null, {mensaje: 'hola', historial: [{rol: 'usuario', texto: {$ne: null}}]}],
        ['post', '/api/recomendaciones', ESTUDIANTE, {contexto: {$ne: null}}],
        ['post', '/api/recomendaciones', ESTUDIANTE, {contexto: 'robot con sensores', recursosSeleccionados: [{$ne: null}]}],
        ['post', '/api/recomendaciones', ESTUDIANTE, {contexto: 'robot con sensores', limite: '5'}],
        ['put', `/api/notificaciones/${'a'.repeat(23)}z/leida`, ESTUDIANTE, undefined],
        ['get', '/api/prestamos/no-es-un-id', ESTUDIANTE, undefined]
    ]
    // cada fila tiene 4 elementos: con menos, Jest pasaria su callback `done` como cuerpo
    test.each(casos)('%s %s', async (metodo, ruta, usuario, cuerpo) => {
        if (usuario) sesion(usuario)
        const noDebeLlamarse = () => { throw new Error('no debe consultar la base de datos') }
        for (const modelo of [Recurso, Prestamo, Penalizacion, Notificacion]) {
            for (const m of ['find', 'findOne', 'exists', 'updateMany', 'countDocuments']) jest.spyOn(modelo, m).mockImplementation(noDebeLlamarse)
        }
        jest.spyOn(Usuario, 'findOne').mockImplementation(noDebeLlamarse)
        jest.spyOn(Usuario, 'exists').mockImplementation(noDebeLlamarse)
        let req = request(app)[metodo](ruta)
        if (usuario) req = req.set('Authorization', token(usuario))
        const res = await (cuerpo ? req.send(cuerpo) : req)
        expect(res.status).toBe(400)
        expect(typeof res.body.msg).toBe('string')
    })
})

describe('Asignacion masiva', () => {
    test('el registro ignora rol, versionSesion y tokens enviados por el cliente', async () => {
        jest.spyOn(Usuario, 'exists').mockResolvedValue(null)
        jest.spyOn(Usuario.prototype, 'save').mockImplementation(async function () { return this })
        const res = await request(app).post('/api/registro').send({
            nombres: 'Ana', apellidos: 'Mora', cedula: '1710034065', correo: 'ana.mora@epn.edu.ec', telefono: '0991234567',
            facultad: 'Ingeniería Civil', password: 'Clave1234', rol: 'administrador', versionSesion: 99, tokenRecuperacion: 'x'
        })
        expect(res.status).toBe(201)
        expect(res.body.usuario.rol).toBe('estudiante')
        const guardado = Usuario.prototype.save.mock.contexts[0]
        expect(guardado.rol).toBe('estudiante')
        expect(guardado.versionSesion).toBe(0)
        expect(guardado.tokenRecuperacion).toBeNull()
    })

    test('el perfil ignora rol, correo, cedula y versionSesion', async () => {
        const usuario = documento({...ESTUDIANTE, correo: 'ana@epn.edu.ec', cedula: '1710034065'})
        jest.spyOn(Usuario, 'findById').mockImplementation(() => consulta(usuario))
        const res = await request(app).put('/api/perfil').set('Authorization', token(ESTUDIANTE))
            .send({nombres: 'Ana Maria', rol: 'administrador', correo: 'otro@epn.edu.ec', cedula: '1700000001', versionSesion: 7})
        expect(res.status).toBe(200)
        expect(usuario).toMatchObject({nombres: 'Ana Maria', rol: 'estudiante', correo: 'ana@epn.edu.ec', cedula: '1710034065', versionSesion: 0})
    })

    test('la solicitud de prestamo ignora usuario, estado y codigoQR del cuerpo', async () => {
        sesion(ESTUDIANTE)
        jest.spyOn(Recurso, 'findById').mockResolvedValue({_id: ID, nombre: 'Proyector', estado: 'disponible'})
        // regla de maximo de solicitudes activas: 0 activas
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([])})
        jest.spyOn(Prestamo, 'create').mockImplementation(async (datos) => ({_id: 'p1', ...datos}))
        const res = await request(app).post('/api/prestamos').set('Authorization', token(ESTUDIANTE)).send({
            recursoId: ID, fechaDevolucion: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), aceptaTerminos: true,
            docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec'},
            usuario: ADMIN._id, estado: 'aprobado', codigoQR: 'a'.repeat(32), aprobadoPor: ADMIN._id
        })
        expect(res.status).toBe(201)
        const datos = Prestamo.create.mock.calls[0][0]
        expect(datos.usuario).toBe(ESTUDIANTE._id)
        expect(datos).not.toHaveProperty('estado')
        expect(datos).not.toHaveProperty('codigoQR')
        expect(datos).not.toHaveProperty('aprobadoPor')
    })
})

describe('Propiedad (IDOR): mismo 404 para "no existe" y "no es tuyo"', () => {
    beforeEach(() => sesion(ESTUDIANTE))
    const ajeno = () => documento({_id: ID, usuario: ADMIN._id, estado: 'pendiente', recurso: {nombre: 'Proyector'}})

    test.each([['get', `/api/prestamos/${ID}`], ['get', `/api/prestamos/${ID}/qr`], ['put', `/api/prestamos/${ID}/cancelar`]])('%s %s de otro estudiante -> 404', async (metodo, ruta) => {
        jest.spyOn(Prestamo, 'findById').mockImplementation(() => consulta(ajeno()))
        const res = await request(app)[metodo](ruta).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(404)
        expect(res.body.msg).toBe('Solicitud no encontrada')
    })

    test('una notificacion se busca siempre junto con su dueno', async () => {
        jest.spyOn(Notificacion, 'findOne').mockResolvedValue(null)
        const res = await request(app).put(`/api/notificaciones/${ID}/leida`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(404)
        expect(Notificacion.findOne).toHaveBeenCalledWith({_id: ID, usuario: ESTUDIANTE._id})
    })
})

describe('Estados y concurrencia en prestamos', () => {
    beforeEach(() => sesion(ADMIN))

    test('dos aprobaciones simultaneas: la segunda choca con la version y responde 400, no 500', async () => {
        const prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, recurso: 'r1', estado: 'pendiente'})
        prestamo.save = async () => { throw versionError() }
        jest.spyOn(Prestamo, 'findById').mockResolvedValue(prestamo)
        jest.spyOn(Recurso, 'findById').mockResolvedValue({_id: 'r1', nombre: 'Proyector', estado: 'disponible'})
        jest.spyOn(Prestamo, 'exists').mockResolvedValue(null)
        const res = await request(app).put(`/api/prestamos/${ID}/aprobar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/al mismo tiempo/)
    })

    test('dos devoluciones simultaneas: la segunda no genera penalizaciones duplicadas', async () => {
        const prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, recurso: 'r1', estado: 'entregado', fechaDevolucion: new Date(Date.now() - 3 * 864e5)})
        prestamo.save = async () => { throw versionError() }
        jest.spyOn(Prestamo, 'findById').mockResolvedValue(prestamo)
        jest.spyOn(Recurso, 'findById').mockResolvedValue(documento({_id: 'r1', nombre: 'Proyector', estado: 'prestado', precio: 100}))
        jest.spyOn(Penalizacion, 'insertMany').mockResolvedValue([])
        const res = await request(app).put(`/api/prestamos/${ID}/devolver`).set('Authorization', token(ADMIN)).send({condicion: 'bueno'})
        expect(res.status).toBe(400)
        expect(Penalizacion.insertMany).not.toHaveBeenCalled()
    })

    test('cancelar mientras el administrador aprueba: el conflicto responde 400', async () => {
        sesion(ESTUDIANTE)
        const prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, estado: 'pendiente'})
        prestamo.save = async () => { throw versionError() }
        jest.spyOn(Prestamo, 'findById').mockResolvedValue(prestamo)
        const res = await request(app).put(`/api/prestamos/${ID}/cancelar`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(400)
    })

    test('los esquemas de prestamo y penalizacion usan control de version optimista', () => {
        expect(Prestamo.schema.options.optimisticConcurrency).toBe(true)
        expect(Penalizacion.schema.options.optimisticConcurrency).toBe(true)
    })
})

describe('Swagger al dia', () => {
    // recorre la especificacion y devuelve [ruta, valor] de cada ejemplo con forma de fecha AAAA-MM-DD
    const fechasDeEjemplo = (nodo, ruta = '') => {
        if (typeof nodo === 'string') return /^\d{4}-\d{2}-\d{2}/.test(nodo) ? [[ruta, nodo]] : []
        if (!nodo || typeof nodo !== 'object') return []
        return Object.entries(nodo).flatMap(([k, v]) => fechasDeEjemplo(v, `${ruta}/${k}`))
    }

    test('todas las fechas de ejemplo existen (nada de 2026-11-31)', () => {
        const fechas = fechasDeEjemplo(especificacion)
        expect(fechas.length).toBeGreaterThan(0)
        for (const [ruta, valor] of fechas) {
            const dia = valor.slice(0, 10)
            const real = !Number.isNaN(Date.parse(dia)) && new Date(dia).toISOString().startsWith(dia)
            if (!real) throw new Error(`Fecha de ejemplo invalida en ${ruta}: ${valor}`)
        }
    })

    test('las restricciones de etiquetas e imagen coinciden con la validacion', () => {
        const put = especificacion.paths['/api/recursos/{id}'].put.requestBody.content['application/json'].schema.properties
        expect(put.etiquetas).toMatchObject({maxItems: 15, uniqueItems: true, items: {minLength: 2, maxLength: 30}})
        expect(put.imagen.maxLength).toBe(500)
        expect(especificacion.components.schemas.Recurso.properties.imagenId).toBeUndefined()
    })
})
