import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import {consulta} from './ayudantes.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {recomendarRecursos} from '../src/helpers/recomendacionHelper.js'
import {responderLocal, responderDeuda} from '../src/helpers/asistenteHelper.js'
import {validarRespuestaGemini} from '../src/helpers/geminiHelper.js'

// Asistente (chat): ayuda sobre PoliRent + recomendacion de recursos. Sin base de datos ni internet:
// los modelos se simulan y Gemini se reemplaza por un fetch falso.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const recurso = (id, nombre, categoria, descripcion, etiquetas) => ({_id: `64b7f0f2a1b2c3d4e5f607${id}`, nombre, categoria, descripcion, etiquetas, estado: 'disponible', imagen: ''})
const CATALOGO = [
    recurso('01', 'Proyector Epson', 'academico', 'Proyector HD con HDMI para exposiciones', ['presentacion', 'exposicion', 'proyector']),
    recurso('02', 'Clicker inalambrico', 'academico', 'Control para pasar diapositivas en exposiciones', ['clicker', 'diapositiva', 'exposicion']),
    recurso('03', 'Kit Arduino Uno', 'tecnico', 'Placa Arduino con cables y protoboard', ['arduino', 'robotica', 'microcontrolador']),
    recurso('04', 'Balon de voley', 'recreativo', 'Balon oficial de voleibol', ['voley', 'deporte', 'torneo'])
]
const local = (mensaje) => responderLocal(mensaje, recomendarRecursos(CATALOGO, {contexto: mensaje, limite: 5}))

const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60799', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const preguntar = (cuerpo, token) => {
    const req = request(app).post('/api/asistente')
    if (token) req.set('Authorization', `Bearer ${token}`)
    return req.send(cuerpo)
}
const simularActivo = (prestamo) => jest.spyOn(Prestamo, 'findOne').mockReturnValue({populate: () => ({lean: () => Promise.resolve(prestamo)})})
const respuestaGemini = (json) => ({ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: JSON.stringify(json)}]}}]})})

const fetchOriginal = global.fetch
beforeEach(() => {
    delete process.env.GEMINI_API_KEY
    jest.spyOn(Recurso, 'find').mockReturnValue({lean: () => Promise.resolve(CATALOGO)})
    jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
    jest.restoreAllMocks()
    global.fetch = fetchOriginal
})

describe('Asistente: motor local', () => {
    test.each([
        ['como cierro sesion', 'cerrar_sesion'],
        ['como me logueo', 'iniciar_sesion'],
        ['como me registro', 'registro'],
        ['olvide mi contraseña', 'olvide_clave'],
        ['como cancelo mi solicitud', 'cancelar'],
        ['por que no puedo pedir otro recurso', 'prestamo_unico'],
        ['¿Qué es PoliRent?', 'que_es']
    ])('"%s" es ayuda (%s)', (mensaje, id) => {
        const r = local(mensaje)
        expect(r.tipo).toBe('ayuda')
        expect(r.preguntaFrecuente).toBe(id)
    })

    test('recomienda recursos del catalogo para una exposicion', () => {
        const r = local('que me recomiendas si tengo que realizar una exposicion')
        expect(r.tipo).toBe('recomendacion')
        expect(r.recomendaciones.map(x => x.recurso.nombre)).toEqual(expect.arrayContaining(['Proyector Epson', 'Clicker inalambrico']))
        expect(r.recomendaciones.map(x => x.recurso.nombre)).not.toContain('Balon de voley')
    })

    test('una pregunta de uso que nombra un recurso es ayuda y adjunta ese recurso', () => {
        const r = local('como reservo un proyector')
        expect(r.tipo).toBe('ayuda')
        expect(r.preguntaFrecuente).toBe('reservar')
        expect(r.recomendaciones[0].recurso.nombre).toBe('Proyector Epson')
    })

    test.each(['cuentame un chiste', 'quien gano el mundial', 'resuelveme la ecuacion x+2=5'])('"%s" es fuera de tema', (mensaje) => {
        const r = local(mensaje)
        expect(r.tipo).toBe('fuera_de_tema')
        expect(r.recomendaciones).toEqual([])
    })

    test('un saludo presenta al asistente', () => {
        expect(local('hola').respuesta).toMatch(/asistente de PoliRent/)
    })
})

describe('POST /api/asistente', () => {
    test.each([
        [{}, 'Escribe tu pregunta'],
        [{mensaje: 'a'}, /entre 2 y 500/],
        [{mensaje: 'x'.repeat(501)}, /entre 2 y 500/],
        [{mensaje: 'hola', historial: 'no'}, /historial/],
        [{mensaje: 'hola', historial: [{rol: 'sistema', texto: 'x'}]}, /historial/]
    ])('valida el cuerpo %#', async (cuerpo, msg) => {
        const res = await preguntar(cuerpo)
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(msg)
    })

    test('es publico: un invitado recibe ayuda del motor local', async () => {
        const res = await preguntar({mensaje: 'como me registro'})
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({tipo: 'ayuda', motor: 'local', prestamoActivo: null, enlaces: [{ruta: '/registro'}]})
    })

    test('las recomendaciones tienen el mismo formato que /api/recomendaciones', async () => {
        const res = await preguntar({mensaje: 'vamos a armar un robot con arduino'})
        expect(res.body.tipo).toBe('recomendacion')
        expect(res.body.recomendaciones[0]).toMatchObject({recurso: {nombre: 'Kit Arduino Uno', categoria: 'tecnico'}, relevancia: 100, razon: expect.any(String)})
    })

    test('a un estudiante con un prestamo activo le recuerda la regla de un prestamo a la vez', async () => {
        jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
        simularActivo({_id: 'p1', estado: 'entregado', recurso: {_id: 'r1', nombre: 'Laptop Dell'}})
        const res = await preguntar({mensaje: 'necesito algo para una exposicion'}, crearTokenJWT(ESTUDIANTE._id, 'estudiante'))
        expect(res.body.tipo).toBe('recomendacion')
        expect(res.body.prestamoActivo).toMatchObject({estado: 'entregado', recurso: {nombre: 'Laptop Dell'}})
        expect(res.body.respuesta).toMatch(/préstamo en curso \(Laptop Dell\)/)
    })

    test('un token invalido responde 401 como el resto de rutas', async () => {
        const res = await preguntar({mensaje: 'hola'}, 'token-falso')
        expect(res.status).toBe(401)
    })
})

describe('POST /api/asistente con Gemini', () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'clave-de-prueba'
    })

    test('usa la respuesta de Gemini y descarta recursos que no existen', async () => {
        global.fetch = jest.fn().mockResolvedValue(respuestaGemini({
            tipo: 'recomendacion',
            respuesta: 'Para tu exposicion te sirven el proyector y el clicker.',
            recursos: [CATALOGO[0]._id, 'id-inventado', CATALOGO[1]._id]
        }))
        const res = await preguntar({mensaje: 'tengo que exponer mi tesis', historial: [{rol: 'usuario', texto: 'hola'}, {rol: 'asistente', texto: 'Hola, ¿en qué te ayudo?'}]})
        expect(res.body.motor).toBe('gemini')
        expect(res.body.recomendaciones.map(r => r.recurso.nombre)).toEqual(['Proyector Epson', 'Clicker inalambrico'])

        const [url, opciones] = global.fetch.mock.calls[0]
        expect(url).toMatch(/generativelanguage\.googleapis\.com/)
        expect(opciones.headers['x-goog-api-key']).toBe('clave-de-prueba')
        const cuerpo = JSON.parse(opciones.body)
        expect(cuerpo.contents.map(c => c.role)).toEqual(['user', 'model', 'user'])
        expect(cuerpo.systemInstruction.parts[0].text).toContain('Proyector Epson')
    })

    test('las dudas claras se responden al instante sin llamar a Gemini', async () => {
        global.fetch = jest.fn()
        const res = await preguntar({mensaje: 'como cierro sesion'})
        expect(res.body).toMatchObject({tipo: 'ayuda', motor: 'local'})
        expect(global.fetch).not.toHaveBeenCalled()
    })

    test.each([
        ['un error de red', () => Promise.reject(new TypeError('fetch failed'))],
        ['una cuota agotada (429)', () => Promise.resolve({ok: false, status: 429})],
        ['un JSON invalido', () => Promise.resolve({ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: 'no es json'}]}}]})})]
    ])('si Gemini falla por %s responde el motor local', async (_, fallo) => {
        global.fetch = jest.fn().mockImplementation(fallo)
        const res = await preguntar({mensaje: 'necesito algo para una exposicion'})
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({tipo: 'recomendacion', motor: 'local'})
    })

    test('validarRespuestaGemini rechaza tipos desconocidos y respuestas vacias', () => {
        expect(validarRespuestaGemini({tipo: 'chiste', respuesta: 'x'}, CATALOGO)).toBeNull()
        expect(validarRespuestaGemini({tipo: 'ayuda', respuesta: '  '}, CATALOGO)).toBeNull()
        expect(validarRespuestaGemini({tipo: 'ayuda', respuesta: 'ok', recursos: [CATALOGO[0]._id], temas: ['registro', 'inventado']}, CATALOGO))
            .toEqual({tipo: 'ayuda', respuesta: 'ok', recursos: [], temas: ['registro']})
    })
})

describe('Asistente: penalizaciones, horario y deuda', () => {
    test.each([
        ['que pasa si devuelvo tarde un recurso', 'penalizaciones'],
        ['cuanto es la multa si lo pierdo', 'penalizaciones'],
        ['y si se me daña el proyector', 'penalizaciones'],
        ['hasta que hora puedo devolver', 'horario'],
        ['en que horario se entregan los recursos', 'horario']
    ])('"%s" es ayuda (%s)', (mensaje, id) => {
        const r = local(mensaje)
        expect(r.tipo).toBe('ayuda')
        expect(r.preguntaFrecuente).toBe(id)
    })

    test('"buenas tardes" sigue siendo un saludo', () => {
        expect(local('buenas tardes').respuesta).toMatch(/asistente de PoliRent/)
    })

    test('las respuestas usan las tarifas y el horario configurados', () => {
        process.env.PENALIZACION_DANIO = '25'
        process.env.HORARIO_FIN = '17:30'
        try {
            expect(local('que multa hay si lo devuelvo dañado').respuesta).toMatch(/25 % si lo devuelves dañado/)
            expect(local('hasta que hora atienden').respuesta).toMatch(/y las 17:30/)
        } finally {
            delete process.env.PENALIZACION_DANIO
            delete process.env.HORARIO_FIN
        }
    })

    test('responderDeuda con deuda y atraso en curso', () => {
        const r = responderDeuda('cuanto debo?', {totalAdeudado: 12.5, totalAtrasoEnCurso: 3})
        expect(r).toMatchObject({tipo: 'ayuda', preguntaFrecuente: 'deuda', seguro: true, recomendaciones: []})
        expect(r.respuesta).toMatch(/^Tienes \$12\.50 en penalizaciones pendientes; además, tu atraso actual acumula \$3\.00/)
    })

    test('responderDeuda sin deuda', () => {
        expect(responderDeuda('tengo multas?', {totalAdeudado: 0, totalAtrasoEnCurso: 0}).respuesta).toBe('No tienes penalizaciones pendientes.')
    })

    test('responderDeuda sin sesion pide iniciar sesion', () => {
        const r = responderDeuda('cual es mi saldo', null)
        expect(r.respuesta).toMatch(/inicia sesión/)
        expect(r.enlaces).toEqual([{texto: 'Iniciar sesión', ruta: '/login'}])
    })

    test('responderDeuda ignora mensajes que no preguntan por la deuda', () => {
        expect(responderDeuda('como reservo un proyector', {totalAdeudado: 5, totalAtrasoEnCurso: 0})).toBeNull()
    })

    test('POST /api/asistente responde la deuda real del estudiante sin llamar a Gemini', async () => {
        process.env.GEMINI_API_KEY = 'clave-de-prueba'
        global.fetch = jest.fn()
        jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
        simularActivo(null)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{monto: 20}, {monto: 5}]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await preguntar({mensaje: '¿Cuánto debo?'}, crearTokenJWT(ESTUDIANTE._id, 'estudiante'))
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({tipo: 'ayuda', motor: 'local', recomendaciones: [], prestamoActivo: null})
        expect(res.body.respuesta).toMatch(/Tienes \$25\.00 en penalizaciones pendientes/)
        expect(global.fetch).not.toHaveBeenCalled()
    })

    test('a un invitado que pregunta su deuda le pide iniciar sesion', async () => {
        const res = await preguntar({mensaje: 'tengo penalizaciones?'})
        expect(res.status).toBe(200)
        expect(res.body.enlaces).toEqual([{texto: 'Iniciar sesión', ruta: '/login'}])
    })

    test('con Gemini, la deuda pendiente se agrega al contexto del usuario', async () => {
        process.env.GEMINI_API_KEY = 'clave-de-prueba'
        global.fetch = jest.fn().mockResolvedValue(respuestaGemini({tipo: 'recomendacion', respuesta: 'Te sirve el proyector.', recursos: [CATALOGO[0]._id]}))
        jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ESTUDIANTE)})
        simularActivo(null)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{monto: 9}]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await preguntar({mensaje: 'tengo que exponer mi tesis'}, crearTokenJWT(ESTUDIANTE._id, 'estudiante'))
        expect(res.body.motor).toBe('gemini')
        const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body)
        expect(cuerpo.systemInstruction.parts[0].text).toContain('penalizaciones pendientes por $9.00')
    })
})
