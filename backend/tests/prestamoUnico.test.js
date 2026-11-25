import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo, {mensajeMaximoSolicitudes} from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {consulta} from './ayudantes.js'

// HU-007: un estudiante puede tener como maximo MAX_SOLICITUDES_ACTIVAS (por defecto 5) solicitudes activas.
// Antes este archivo probaba la regla "un prestamo a la vez", reemplazada por pedido del revisor. Sin base de datos.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60701', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const RECURSO = {_id: '64b7f0f2a1b2c3d4e5f60702', nombre: 'Proyector Epson', estado: 'disponible'}
const solicitud = {
    recursoId: RECURSO._id,
    fechaDevolucion: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
    motivoPrestamo: 'Exposicion',
    aceptaTerminos: true,
    docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec'}
}
const MSG_MAXIMO = 'Alcanzaste el maximo de 5 solicitudes activas; cancela una o espera la respuesta antes de solicitar otro recurso'

const solicitar = () => request(app)
    .post('/api/prestamos')
    .set('Authorization', `Bearer ${crearTokenJWT(ESTUDIANTE._id, 'estudiante')}`)
    .send(solicitud)

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
    jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
    jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([])})
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(Recurso, 'findById').mockResolvedValue(RECURSO)
    jest.spyOn(Prestamo, 'create').mockImplementation(async (datos) => ({_id: 'nuevo', ...datos}))
    jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
    jest.spyOn(Prestamo, 'deleteOne').mockResolvedValue({})
})
afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.MAX_SOLICITUDES_ACTIVAS
})

describe('Maximo de solicitudes activas por estudiante', () => {
    test.each([0, 1, 4])('con %i solicitudes activas puede solicitar otra (201)', async (activas) => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(activas)
        const res = await solicitar()
        expect(res.status).toBe(201)
        expect(Prestamo.create).toHaveBeenCalled()
    })

    test.each([5, 6])('con %i solicitudes activas responde 400 y no crea', async (activas) => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(activas)
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(MSG_MAXIMO)
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('cuenta las solicitudes pendientes, aprobadas y entregadas de cualquier recurso', async () => {
        const contar = jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        await solicitar()
        expect(contar).toHaveBeenCalledWith({usuario: ESTUDIANTE._id, estado: {$in: ['pendiente', 'aprobado', 'entregado']}})
    })

    test('el maximo sale de MAX_SOLICITUDES_ACTIVAS', async () => {
        process.env.MAX_SOLICITUDES_ACTIVAS = '2'
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(2)
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(mensajeMaximoSolicitudes(2))
    })

    test('carrera: si al volver a contar la nueva queda por encima del maximo, se borra y responde 400', async () => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(4)
        // otra peticion simultanea ya creo la quinta: la nueva quedo sexta
        Prestamo.find.mockReturnValue(consulta([{_id: 'a'}, {_id: 'b'}, {_id: 'c'}, {_id: 'd'}, {_id: 'otra'}, {_id: 'nuevo'}]))
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(MSG_MAXIMO)
        expect(Prestamo.deleteOne).toHaveBeenCalledWith({_id: 'nuevo'})
    })

    test('carrera: la quinta (dentro del maximo) se conserva', async () => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(4)
        Prestamo.find.mockReturnValue(consulta([{_id: 'a'}, {_id: 'b'}, {_id: 'c'}, {_id: 'd'}, {_id: 'nuevo'}, {_id: 'otra'}]))
        const res = await solicitar()
        expect(res.status).toBe(201)
        expect(Prestamo.deleteOne).not.toHaveBeenCalled()
    })

    test('el bloqueo por penalizaciones pendientes sigue igual', async () => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        Penalizacion.find.mockReturnValue(consulta([{monto: 3, estado: 'pendiente'}]))
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/penalizaciones pendientes por \$3\.00/)
    })

    test('sin cupo agotado pasa a validar la disponibilidad del recurso', async () => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        Recurso.findById.mockResolvedValue({...RECURSO, estado: 'prestado'})
        const res = await solicitar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El recurso no esta disponible')
    })

    test('GET /api/terminos informa maxSolicitudesActivas', async () => {
        const res = await request(app).get('/api/terminos')
        expect(res.status).toBe(200)
        expect(res.body.maxSolicitudesActivas).toBe(5)
    })
})
