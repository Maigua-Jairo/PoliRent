import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {PREGUNTAS_FRECUENTES, buscarPreguntaFrecuente, responderSolicitudesActivas} from '../src/helpers/asistenteHelper.js'
import {reglasNegocio} from '../src/helpers/geminiHelper.js'
import {consulta} from './ayudantes.js'

// Revision de la tesis, etapa C: el asistente y Gemini conocen las reglas nuevas
// (maximo de solicitudes activas, pedir para hoy con hora, recordatorios, cancelar solo pendiente). Sin red ni base de datos.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f61001', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const preguntaDe = (mensaje) => buscarPreguntaFrecuente(mensaje)?.pregunta.id
const respuestaDe = (id) => PREGUNTAS_FRECUENTES.find(p => p.id === id).respuesta
const preguntar = (mensaje, conSesion = true) => {
    const req = request(app).post('/api/asistente')
    if (conSesion) req.set('Authorization', `Bearer ${crearTokenJWT(ESTUDIANTE._id, 'estudiante')}`)
    return req.send({mensaje})
}

const fetchOriginal = global.fetch
beforeEach(() => {
    delete process.env.GEMINI_API_KEY
    jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
    jest.spyOn(Recurso, 'find').mockReturnValue({lean: () => Promise.resolve([])})
    jest.spyOn(Prestamo, 'findOne').mockReturnValue(consulta(null))
    jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
    jest.restoreAllMocks()
    global.fetch = fetchOriginal
    for (const v of ['MAX_SOLICITUDES_ACTIVAS', 'RECORDATORIO_HORAS_ANTES', 'HORARIO_INICIO', 'GEMINI_API_KEY']) delete process.env[v]
})

describe('C1. Cuantas solicitudes puedo hacer', () => {
    test.each([
        [0, 'Tienes 0 de 5 solicitudes activas; puedes pedir 5 recurso(s) mas'],
        [4, 'Tienes 4 de 5 solicitudes activas; puedes pedir 1 recurso(s) mas'],
        [5, 'Tienes 5 de 5 solicitudes activas; puedes pedir 0 recurso(s) mas']
    ])('con %i activas responde con su cuenta real', async (activas, texto) => {
        const contar = jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(activas)
        const res = await preguntar('cuantas solicitudes puedo hacer?')
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({tipo: 'ayuda', motor: 'local', recomendaciones: []})
        expect(res.body.respuesta.startsWith(texto)).toBe(true)
        expect(contar).toHaveBeenCalledWith({usuario: ESTUDIANTE._id, estado: {$in: ['pendiente', 'aprobado', 'entregado']}})
    })

    test('con 5 activas explica que llego al maximo', () => {
        expect(responderSolicitudesActivas('cuantas solicitudes puedo tener', 5).respuesta).toMatch(/Llegaste al máximo/)
    })

    test('"puedo pedir 4 recursos para hoy y otro para manana" responde con lo que le queda', async () => {
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        const res = await preguntar('puedo pedir 4 recursos para hoy y otro para mañana?')
        expect(res.body.respuesta).toMatch(/^Tienes 0 de 5 solicitudes activas; puedes pedir 5 recurso\(s\) mas/)
        expect(res.body.respuesta).toMatch(/para hoy o para otro día/)
    })

    test('sin sesion responde la regla general', async () => {
        const contar = jest.spyOn(Prestamo, 'countDocuments')
        const res = await preguntar('cuantos recursos puedo pedir a la vez', false)
        expect(res.body.respuesta).toMatch(/como máximo 5 solicitudes activas/)
        expect(res.body.enlaces).toEqual([{texto: 'Iniciar sesión', ruta: '/login'}])
        expect(contar).not.toHaveBeenCalled()
    })

    test('el maximo sale de MAX_SOLICITUDES_ACTIVAS', () => {
        process.env.MAX_SOLICITUDES_ACTIVAS = '3'
        expect(responderSolicitudesActivas('cuantas solicitudes puedo tener', 1).respuesta).toMatch(/^Tienes 1 de 3 solicitudes activas; puedes pedir 2 recurso\(s\) mas/)
        expect(respuestaDe('maximo_solicitudes')).toMatch(/como máximo 3 solicitudes/)
    })

    test('"como reservo un recurso" sigue siendo la pregunta de reservar', () => {
        expect(responderSolicitudesActivas('como puedo pedir un recurso', 0)).toBeNull()
        expect(preguntaDe('como reservo un recurso')).toBe('reservar')
    })
})

describe('C2-C4. Preguntas frecuentes nuevas y corregidas', () => {
    test.each([
        ['puedo pedir un proyector para hoy', 'pedir_hoy'],
        ['como indico la hora de entrega y de devolucion', 'pedir_hoy'],
        ['me avisan antes de que venza mi prestamo', 'recordatorios'],
        ['envian recordatorios de devolucion', 'recordatorios'],
        ['como cancelo una solicitud', 'cancelar'],
        ['cuantas solicitudes puedo tener a la vez', 'maximo_solicitudes']
    ])('"%s" -> %s', (mensaje, id) => {
        expect(preguntaDe(mensaje)).toBe(id)
    })

    test('pedir para hoy explica el horario y que la devolucion es posterior a la entrega (desde horario())', () => {
        process.env.HORARIO_INICIO = '08:00'
        const texto = respuestaDe('pedir_hoy')
        expect(texto).toMatch(/entre las 08:00 y las 18:00/)
        expect(texto).toMatch(/la devolución debe ser posterior a la entrega/)
    })

    test('los recordatorios usan las horas configuradas', () => {
        expect(respuestaDe('recordatorios')).toMatch(/24 y 1 horas antes/)
        process.env.RECORDATORIO_HORAS_ANTES = '48,6,2'
        expect(respuestaDe('recordatorios')).toMatch(/48, 6 y 2 horas antes/)
    })

    test('cancelar dice que solo se cancela una solicitud pendiente', () => {
        expect(respuestaDe('cancelar')).toMatch(/Solo se puede cancelar una solicitud pendiente/)
    })

    test('ninguna respuesta dice "un prestamo a la vez"', () => {
        const todo = PREGUNTAS_FRECUENTES.map(p => p.respuesta).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        expect(todo).not.toMatch(/un prestamo a la vez|solo puedes tener un prestamo/)
    })
})

describe('C6. Gemini conoce las reglas nuevas (sin red)', () => {
    test('reglasNegocio incluye maximo, horas de entrega y devolucion, cancelar y recordatorios', () => {
        const reglas = reglasNegocio()
        expect(reglas).toContain('como maximo 5 solicitudes activas')
        expect(reglas).toContain('fecha y hora de entrega')
        expect(reglas).toContain('La devolucion debe ser posterior a la entrega')
        expect(reglas).toContain('solo puede cancelar una solicitud pendiente')
        expect(reglas).toContain('recordatorios automaticos 24 y 1 hora(s) antes')
    })

    test('el contexto del usuario lleva sus solicitudes activas', async () => {
        process.env.GEMINI_API_KEY = 'clave-de-prueba'
        const fetch = jest.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: JSON.stringify({tipo: 'ayuda', respuesta: 'Hola'})}]}}]})})
        global.fetch = fetch
        Prestamo.findOne.mockReturnValue(consulta({_id: 'p1', estado: 'pendiente', recurso: {_id: 'r1', nombre: 'Laptop Dell'}}))
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(2)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await preguntar('tengo una duda sobre algo raro del sistema')
        expect(res.body.motor).toBe('gemini')
        const sistema = JSON.parse(fetch.mock.calls[0][1].body).systemInstruction.parts[0].text
        expect(sistema).toContain('Tiene 2 de 5 solicitudes activas, asi que puede pedir 3 recurso(s) mas.')
        expect(sistema).not.toContain('un prestamo a la vez')
    })
})
