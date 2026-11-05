import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo, {mensajePrestamoActivo} from '../src/models/Prestamo.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'

// HU-007: un estudiante solo puede tener un prestamo activo a la vez (sin base de datos: los modelos se simulan)

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60701', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const RECURSO = {_id: '64b7f0f2a1b2c3d4e5f60702', nombre: 'Proyector Epson', estado: 'disponible'}
const solicitud = {recursoId: RECURSO._id, fechaDevolucion: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), motivo: 'Exposicion'}

const simularActivo = (prestamo) => jest.spyOn(Prestamo, 'findOne').mockReturnValue({populate: () => Promise.resolve(prestamo)})
const solicitar = () => request(app)
    .post('/api/prestamos')
    .set('Authorization', `Bearer ${crearTokenJWT(ESTUDIANTE._id, 'estudiante')}`)
    .send(solicitud)

beforeEach(() => {
    jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
    jest.spyOn(Recurso, 'findById').mockResolvedValue(RECURSO)
    jest.spyOn(Prestamo, 'create').mockResolvedValue({_id: 'nuevo'})
})
afterEach(() => jest.restoreAllMocks())

describe('Prestamo unico por estudiante', () => {
    test.each([
        ['pendiente', /solicitud en revision \(Camara reflex\)/],
        ['aprobado', /prestamo en curso \(Camara reflex\)/],
        ['entregado', /prestamo en curso \(Camara reflex\)/]
    ])('con un prestamo %s no puede solicitar otro recurso (400)', async (estado, mensaje) => {
        simularActivo({estado, recurso: {nombre: 'Camara reflex'}})
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(mensaje)
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('busca prestamos activos de cualquier recurso, no solo del solicitado', async () => {
        const findOne = simularActivo({estado: 'entregado', recurso: {nombre: 'Laptop Dell'}})
        await solicitar()
        expect(findOne).toHaveBeenCalledWith({usuario: ESTUDIANTE._id, estado: {$in: ['pendiente', 'aprobado', 'entregado']}})
    })

    test('sin prestamo activo pasa a validar la disponibilidad del recurso', async () => {
        simularActivo(null)
        Recurso.findById.mockResolvedValue({...RECURSO, estado: 'prestado'})
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El recurso no esta disponible')
    })

    test('el mensaje funciona aunque el recurso ya no exista', () => {
        expect(mensajePrestamoActivo('aprobado')).toBe('Ya tienes un prestamo en curso. Devuelvelo antes de solicitar otro recurso')
    })
})
