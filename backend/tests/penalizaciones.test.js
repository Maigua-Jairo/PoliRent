import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {consulta, documento} from './ayudantes.js'

// penalizaciones y terminos (sin base de datos: los modelos se simulan)

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const DIA = 864e5
const ID = '64b7f0f2a1b2c3d4e5f60901'
const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60902', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60903', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
})
afterEach(() => jest.restoreAllMocks())

describe('Rutas de penalizaciones protegidas', () => {
    const rutas = [
        ['get', '/api/penalizaciones/mis', 'estudiante'],
        ['get', '/api/penalizaciones', 'administrador'],
        ['put', `/api/penalizaciones/${ID}/pagar`, 'administrador'],
        ['put', `/api/penalizaciones/${ID}/anular`, 'administrador']
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
})

describe('GET /api/terminos', () => {
    test('es publico y devuelve las tarifas y las condiciones', async () => {
        const res = await request(app).get('/api/terminos')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({version: '1.0', tarifas: {atrasoPorDia: 5, danio: 20, perdida: 100}, horario: {inicio: '07:00', fin: '18:00'}})
        expect(res.body.condiciones.length).toBeGreaterThan(0)
    })
})

describe('GET /api/penalizaciones/mis', () => {
    beforeEach(() => sesion(ESTUDIANTE))

    test('calcula lo adeudado y el atraso en curso', async () => {
        const lista = [
            {_id: 'p1', tipo: 'danio', monto: 20, estado: 'pendiente', recurso: {nombre: 'Proyector'}},
            {_id: 'p2', tipo: 'atraso', monto: 5.5, dias: 1, estado: 'pendiente', recurso: {nombre: 'Proyector'}},
            {_id: 'p3', tipo: 'atraso', monto: 3, estado: 'pagada', recurso: {nombre: 'Naipes'}}
        ]
        jest.spyOn(Penalizacion, 'find').mockImplementation((filtro) => consulta(filtro.estado === 'pendiente' ? lista.filter(p => p.estado === 'pendiente') : lista))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([
            {_id: 'v1', fechaDevolucion: new Date(Date.now() - 2 * DIA + 60000), recurso: {_id: 'r1', nombre: 'Laptop', precio: 400}}
        ]))
        const res = await request(app).get('/api/penalizaciones/mis').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({total: 3, totalAdeudado: 25.5, totalAtrasoEnCurso: 40})
        expect(res.body.atrasoEnCurso).toEqual([{prestamo: 'v1', recurso: {_id: 'r1', nombre: 'Laptop'}, diasAtraso: 2, montoAcumulado: 40}])
        expect(Prestamo.find).toHaveBeenCalledWith(expect.objectContaining({usuario: ESTUDIANTE._id, estado: 'entregado'}))
    })

    test('valida el filtro de estado', async () => {
        const res = await request(app).get('/api/penalizaciones/mis?estado=perdonada').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(400)
    })
})

describe('Administrador: listar, pagar y anular', () => {
    let penalizacion
    beforeEach(() => {
        sesion(ADMIN)
        penalizacion = documento({_id: ID, usuario: ESTUDIANTE._id, prestamo: 'pr1', tipo: 'danio', monto: 20, estado: 'pendiente', descripcion: 'Recurso devuelto danado', recurso: {nombre: 'Proyector'}})
        jest.spyOn(Penalizacion, 'findById').mockImplementation(() => consulta(penalizacion))
    })

    test('lista con el total pendiente', async () => {
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{monto: 20, estado: 'pendiente'}, {monto: 7.25, estado: 'pendiente'}, {monto: 3, estado: 'pagada'}]))
        const res = await request(app).get(`/api/penalizaciones?estado=pendiente&usuario=${ESTUDIANTE._id}&desde=2026-01-01`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({total: 3, totalPendiente: 27.25})
        expect(Penalizacion.find).toHaveBeenCalledWith(expect.objectContaining({estado: 'pendiente', usuario: ESTUDIANTE._id}))
    })

    test.each([['usuario=abc'], ['desde=2026-13-01'], ['estado=perdonada']])('valida los filtros (%s)', async (query) => {
        const res = await request(app).get(`/api/penalizaciones?${query}`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
    })

    test('pagar una pendiente la marca como pagada y notifica', async () => {
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizacion).toMatchObject({estado: 'pagada', fechaPago: expect.any(String)})
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({tipo: 'penalizacion', usuario: ESTUDIANTE._id}))
    })

    test('no se puede pagar una penalizacion ya pagada', async () => {
        penalizacion.estado = 'pagada'
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Solo se pueden modificar penalizaciones pendientes')
    })

    test('una penalizacion inexistente responde 404', async () => {
        penalizacion = null
        const res = await request(app).put(`/api/penalizaciones/${ID}/pagar`).set('Authorization', token(ADMIN))
        expect(res.status).toBe(404)
    })

    test('anular exige un motivo', async () => {
        const res = await request(app).put(`/api/penalizaciones/${ID}/anular`).set('Authorization', token(ADMIN)).send({})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/motivo/)
    })

    test('anular una pendiente guarda el motivo', async () => {
        const res = await request(app).put(`/api/penalizaciones/${ID}/anular`).set('Authorization', token(ADMIN)).send({motivo: 'El estudiante repuso el articulo'})
        expect(res.status).toBe(200)
        expect(res.body.penalizacion).toMatchObject({estado: 'anulada', motivoAnulacion: 'El estudiante repuso el articulo'})
    })

    test('no se puede anular una penalizacion anulada', async () => {
        penalizacion.estado = 'anulada'
        const res = await request(app).put(`/api/penalizaciones/${ID}/anular`).set('Authorization', token(ADMIN)).send({motivo: 'Otra vez'})
        expect(res.status).toBe(400)
    })

    test('valida el id', async () => {
        const res = await request(app).put('/api/penalizaciones/abc/pagar').set('Authorization', token(ADMIN))
        expect(res.status).toBe(400)
    })
})
