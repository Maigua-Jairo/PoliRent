import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {minutosDelDia} from '../src/helpers/politicasHelper.js'
import {consulta, documento} from './ayudantes.js'

// HU-003 / HU-007: solicitud con terminos y docente de referencia, entrega y devolucion con penalizaciones (sin base de datos)

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const DIA = 864e5
const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60801', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60802', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const ID_RECURSO = '64b7f0f2a1b2c3d4e5f60803'
const ID_PRESTAMO = '64b7f0f2a1b2c3d4e5f60804'
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})
const enDias = (dias) => new Date(Date.now() + dias * DIA).toISOString().slice(0, 10)

// hora (HH:00) que esta 12 horas lejos de la hora actual de Ecuador: deja "ahora" fuera del horario
const horaLejana = () => `${String((Math.floor(minutosDelDia(new Date()) / 60) + 12) % 24).padStart(2, '0')}:00`
const fueraDeHorario = () => {
    process.env.VALIDAR_HORARIO = 'true'
    process.env.HORARIO_INICIO = horaLejana()
    process.env.HORARIO_FIN = horaLejana()
}

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([])})
})
afterEach(() => {
    jest.restoreAllMocks()
    process.env.VALIDAR_HORARIO = 'false'
    delete process.env.HORARIO_INICIO
    delete process.env.HORARIO_FIN
})

describe('POST /api/prestamos (solicitud)', () => {
    const valida = () => ({
        recursoId: ID_RECURSO,
        fechaDevolucion: enDias(3),
        motivo: 'Exposicion',
        aceptaTerminos: true,
        docenteReferencia: {nombre: '  Carlos Ruiz ', correo: 'Carlos.Ruiz@epn.edu.ec', telefono: '0991234567'}
    })
    const solicitar = (cuerpo) => request(app).post('/api/prestamos').set('Authorization', token(ESTUDIANTE)).send(cuerpo)

    beforeEach(() => {
        sesion(ESTUDIANTE)
        jest.spyOn(Recurso, 'findById').mockResolvedValue({_id: ID_RECURSO, nombre: 'Proyector Epson', estado: 'disponible'})
        jest.spyOn(Prestamo, 'findOne').mockReturnValue(consulta(null))
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Prestamo, 'create').mockImplementation(async (datos) => ({_id: 'nuevo', estado: 'pendiente', ...datos}))
    })

    test.each([
        ['sin aceptar los terminos', {aceptaTerminos: undefined}, 'Debes aceptar los terminos y condiciones'],
        ['con aceptaTerminos false', {aceptaTerminos: false}, 'Debes aceptar los terminos y condiciones'],
        ['sin docente de referencia', {docenteReferencia: undefined}, 'El docente de referencia es obligatorio (nombre y correo)'],
        ['con docente sin correo', {docenteReferencia: {nombre: 'Carlos Ruiz'}}, 'El docente de referencia es obligatorio (nombre y correo)'],
        ['con nombre de docente corto', {docenteReferencia: {nombre: 'Al', correo: 'a@epn.edu.ec'}}, 'El nombre del docente debe tener entre 3 y 100 caracteres'],
        ['con correo de docente invalido', {docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos@'}}, 'El correo del docente no es valido'],
        ['con telefono de docente invalido', {docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'c@epn.edu.ec', telefono: 'abc'}}, 'El telefono del docente no es valido'],
        ['con una fecha invalida', {fechaDevolucion: '2026-02-31'}, 'La fecha de devolucion no es valida'],
        ['con una fecha pasada', {fechaDevolucion: enDias(-2)}, 'La fecha de devolucion debe ser posterior a hoy'],
        ['con mas de 30 dias', {fechaDevolucion: enDias(32)}, 'El prestamo no puede superar los 30 dias']
    ])('rechaza la solicitud %s (400)', async (_, cambios, msg) => {
        const res = await solicitar({...valida(), ...cambios})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('rechaza una hora de devolucion fuera del horario', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar({...valida(), fechaDevolucion: `${enDias(3)}T20:00:00-05:00`})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La entrega y la devolucion solo se registran entre las 07:00 y las 18:00 (hora de Ecuador)')
    })

    test('con el horario activo acepta solo la fecha (se toma a las 18:00)', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar(valida())
        expect(res.status).toBe(201)
    })

    test('bloquea al estudiante con penalizaciones pendientes y muestra el monto', async () => {
        Penalizacion.find.mockReturnValue(consulta([{monto: 10}, {monto: 2.5}]))
        const res = await solicitar(valida())
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Tienes penalizaciones pendientes por $12.50. Regularizalas con la asociacion antes de solicitar otro recurso')
        expect(Penalizacion.find).toHaveBeenCalledWith({usuario: ESTUDIANTE._id, estado: 'pendiente'})
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('una solicitud correcta guarda los terminos, el docente y la fecha normalizada', async () => {
        const cuerpo = valida()
        const res = await solicitar(cuerpo)
        expect(res.status).toBe(201)
        const datos = Prestamo.create.mock.calls[0][0]
        expect(datos.terminos).toEqual({version: '1.0', aceptadoEn: expect.any(Date)})
        expect(datos.docenteReferencia).toEqual({nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec', telefono: '0991234567'})
        expect(datos.fechaDevolucion.toISOString()).toBe(`${cuerpo.fechaDevolucion}T23:00:00.000Z`)
        expect(res.body.prestamo).toMatchObject({docenteReferencia: {nombre: 'Carlos Ruiz'}, terminos: {version: '1.0'}})
        expect(res.body.prestamo.codigoQR).toBeUndefined()
    })

    test('acepta aceptaTerminos como texto "true"', async () => {
        const res = await solicitar({...valida(), aceptaTerminos: 'true'})
        expect(res.status).toBe(201)
    })
})

describe('Entrega y devolucion', () => {
    let prestamo
    let recurso
    const nuevoPrestamo = (cambios = {}) => documento({
        _id: ID_PRESTAMO, usuario: ESTUDIANTE._id, recurso: ID_RECURSO, estado: 'entregado',
        fechaDevolucion: new Date(Date.now() + DIA), codigoQR: 'a'.repeat(32), ...cambios
    })
    const devolver = (cuerpo = {}) => request(app).put(`/api/prestamos/${ID_PRESTAMO}/devolver`).set('Authorization', token(ADMIN)).send(cuerpo)
    const entregar = (cuerpo = {}) => request(app).put(`/api/prestamos/${ID_PRESTAMO}/entregar`).set('Authorization', token(ADMIN)).send(cuerpo)

    beforeEach(() => {
        sesion(ADMIN)
        prestamo = nuevoPrestamo()
        recurso = documento({_id: ID_RECURSO, nombre: 'Proyector Epson', estado: 'prestado', precio: 100})
        jest.spyOn(Prestamo, 'findById').mockImplementation(() => consulta(prestamo))
        jest.spyOn(Prestamo, 'findOne').mockImplementation(() => consulta(prestamo))
        jest.spyOn(Recurso, 'findById').mockImplementation(() => consulta(recurso))
        jest.spyOn(Penalizacion, 'insertMany').mockImplementation(async (lista) => lista.map((p, i) => ({_id: `pen${i}`, estado: 'pendiente', ...p})))
    })

    test('devolucion en buen estado y a tiempo: recurso disponible y sin penalizaciones', async () => {
        const res = await devolver()
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({accion: 'devolucion', recurso: {estado: 'disponible'}, penalizaciones: [], totalPenalizado: 0, advertencias: []})
        expect(res.body.prestamo.devolucion).toMatchObject({responsableNombre: 'Luis Paz', condicion: 'bueno', evidencia: null})
        expect(prestamo.codigoQR).toBeUndefined()
        expect(Penalizacion.insertMany).not.toHaveBeenCalled()
    })

    test('devolucion con atraso: crea la penalizacion de atraso y notifica', async () => {
        prestamo = nuevoPrestamo({fechaDevolucion: new Date(Date.now() - 2 * DIA + 60000)})
        const res = await devolver({responsable: 'Maria Lopez', observaciones: 'Llego tarde'})
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones).toEqual([expect.objectContaining({tipo: 'atraso', monto: 10, dias: 2, usuario: ESTUDIANTE._id, registradaPor: ADMIN._id})])
        expect(res.body.totalPenalizado).toBe(10)
        expect(res.body.prestamo.devolucion).toMatchObject({responsableNombre: 'Maria Lopez', observaciones: 'Llego tarde'})
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({tipo: 'penalizacion', mensaje: expect.stringContaining('$10.00')}))
    })

    test('devolver danado sin evidencia responde 400', async () => {
        const res = await devolver({condicion: 'danado'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Adjunta una foto de evidencia del estado del recurso')
    })

    test('devolver incompleto con evidencia sin Cloudinary responde 503', async () => {
        const res = await request(app).put(`/api/prestamos/${ID_PRESTAMO}/devolver`).set('Authorization', token(ADMIN))
            .field('condicion', 'incompleto')
            .attach('evidencia', Buffer.from('imagen'), {filename: 'foto.png', contentType: 'image/png'})
        expect(res.status).toBe(503)
        expect(res.body.msg).toMatch(/Cloudinary/)
    })

    test('la evidencia debe ser una imagen', async () => {
        const res = await request(app).put(`/api/prestamos/${ID_PRESTAMO}/devolver`).set('Authorization', token(ADMIN))
            .attach('evidencia', Buffer.from('texto'), {filename: 'nota.txt', contentType: 'text/plain'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La imagen debe ser JPG, PNG o WEBP')
    })

    test('una condicion desconocida responde 400', async () => {
        const res = await devolver({condicion: 'roto'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La condicion debe ser: bueno, danado, incompleto, perdido')
    })

    test('perdido: penalizacion del 100 % y recurso en mantenimiento', async () => {
        prestamo = nuevoPrestamo({fechaDevolucion: new Date(Date.now() - 5 * DIA)})
        const res = await devolver({condicion: 'perdido'})
        expect(res.status).toBe(200)
        expect(res.body.recurso.estado).toBe('mantenimiento')
        expect(res.body.penalizaciones).toEqual([expect.objectContaining({tipo: 'perdida', monto: 100})])
        expect(res.body.totalPenalizado).toBe(100)
    })

    test('fuera del horario no se registra la devolucion', async () => {
        fueraDeHorario()
        const res = await devolver()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/solo se registran entre las/)
    })

    test('fuera del horario si se puede declarar una perdida', async () => {
        fueraDeHorario()
        const res = await devolver({condicion: 'perdido'})
        expect(res.status).toBe(200)
    })

    test('un recurso sin precio no genera penalizaciones y avisa', async () => {
        recurso = documento({_id: ID_RECURSO, nombre: 'Naipes', estado: 'prestado', precio: 0})
        prestamo = nuevoPrestamo({fechaDevolucion: new Date(Date.now() - 3 * DIA)})
        const res = await devolver()
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones).toEqual([])
        expect(res.body.advertencias).toEqual(['El recurso no tiene precio registrado: no se generaron penalizaciones'])
    })

    test('devolver un prestamo que no esta entregado responde 400', async () => {
        prestamo = nuevoPrestamo({estado: 'aprobado'})
        const res = await devolver()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/devolucion de un prestamo entregado/)
    })

    test('entregar un prestamo que no esta aprobado responde 400', async () => {
        prestamo = nuevoPrestamo({estado: 'pendiente'})
        const res = await entregar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/entrega de una solicitud aprobada/)
    })

    test('entregar un prestamo aprobado registra al responsable', async () => {
        prestamo = nuevoPrestamo({estado: 'aprobado'})
        recurso = documento({_id: ID_RECURSO, nombre: 'Proyector Epson', estado: 'disponible', precio: 100})
        const res = await entregar({observaciones: 'Con cable HDMI'})
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({accion: 'entrega', recurso: {estado: 'prestado'}})
        expect(res.body.prestamo.entrega).toMatchObject({responsableNombre: 'Luis Paz', observaciones: 'Con cable HDMI', evidencia: null})
        expect(res.body.penalizaciones).toBeUndefined()
    })

    test('el escaneo del QR sigue funcionando con JSON y usa la misma logica', async () => {
        const res = await request(app).post('/api/prestamos/escanear').set('Authorization', token(ADMIN)).send({codigo: 'a'.repeat(32), condicion: 'perdido'})
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({accion: 'devolucion', recurso: {estado: 'mantenimiento'}, totalPenalizado: 100})
    })

    test('las rutas de entrega y devolucion validan el id', async () => {
        const res = await request(app).put('/api/prestamos/abc/devolver').set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
    })

    test('un estudiante no puede registrar devoluciones (403)', async () => {
        Usuario.findById.mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
        const res = await request(app).put(`/api/prestamos/${ID_PRESTAMO}/devolver`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(403)
    })
})

describe('GET /api/prestamos/:id', () => {
    const PRESTAMO = {
        _id: ID_PRESTAMO, usuario: ESTUDIANTE._id, recurso: {_id: ID_RECURSO, nombre: 'Proyector Epson', precio: 100}, estado: 'entregado',
        codigoQR: 'b'.repeat(32), entrega: {responsableNombre: 'Luis Paz', evidencia: {url: 'https://img/1.png', publicId: 'secreto'}}
    }
    beforeEach(() => jest.spyOn(Prestamo, 'findById').mockReturnValue(consulta(PRESTAMO)))

    test('el dueño ve su prestamo sin el codigo QR ni el publicId de la evidencia', async () => {
        sesion(ESTUDIANTE)
        const res = await request(app).get(`/api/prestamos/${ID_PRESTAMO}`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body.prestamo).toMatchObject({recurso: {precio: 100}, entrega: {evidencia: {url: 'https://img/1.png'}}})
        expect(JSON.stringify(res.body)).not.toMatch(/secreto|bbbb/)
    })

    test('otro estudiante recibe 404', async () => {
        sesion({...ESTUDIANTE, _id: '64b7f0f2a1b2c3d4e5f60899'})
        const res = await request(app).get(`/api/prestamos/${ID_PRESTAMO}`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(404)
    })

    test('no captura la ruta /prestamos/mis', async () => {
        sesion(ESTUDIANTE)
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await request(app).get('/api/prestamos/mis').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body.total).toBe(0)
    })
})
