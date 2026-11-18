import {jest} from '@jest/globals'
import {buscarPreguntaFrecuente, responderLocal, PREGUNTAS_FRECUENTES} from '../src/helpers/asistenteHelper.js'
import {consultarGemini, reglasNegocio} from '../src/helpers/geminiHelper.js'

// Base de conocimiento del asistente (preguntas frecuentes nuevas) y reglas del negocio que recibe Gemini.
// Sin red: fetch se reemplaza por un simulador.

const fetchOriginal = global.fetch
const preguntaDe = (mensaje) => buscarPreguntaFrecuente(mensaje)?.pregunta.id

afterEach(() => {
    jest.restoreAllMocks()
    global.fetch = fetchOriginal
    for (const v of ['PENALIZACION_DANIO', 'PENALIZACION_PERDIDA', 'PENALIZACION_ATRASO_DIA', 'HORARIO_INICIO', 'HORARIO_FIN', 'GEMINI_API_KEY']) delete process.env[v]
})

describe('Preguntas frecuentes nuevas', () => {
    test.each([
        ['como pago una penalizacion', 'pagar_penalizacion'],
        ['donde subo el comprobante de pago', 'pagar_penalizacion'],
        ['me rechazaron el comprobante, que hago', 'pagar_penalizacion'],
        ['pague por transferencia, como lo registro', 'pagar_penalizacion'],
        ['que pasa si pierdo o daño un recurso', 'perdida_dano'],
        ['que hago si pierdo el kit', 'perdida_dano'],
        ['puedo reponer el articulo en vez de pagar', 'perdida_dano'],
        ['para que sirve el docente de referencia', 'docente_referencia'],
        ['tengo que poner a un profesor?', 'docente_referencia'],
        ['donde veo mi historial', 'historial_notificaciones'],
        ['donde veo mis notificaciones', 'historial_notificaciones'],
        ['para que sirve la evidencia en la entrega', 'evidencia'],
        ['por que me toman una foto en la devolucion', 'evidencia'],
        // las que ya existian se siguen reconociendo (no se duplican)
        ['como cancelo una solicitud', 'cancelar'],
        ['cuantos dias puedo quedarme con un recurso', 'plazo'],
        ['por que solo puedo tener un prestamo a la vez', 'prestamo_unico']
    ])('"%s" -> %s', (mensaje, id) => {
        expect(preguntaDe(mensaje)).toBe(id)
        const r = responderLocal(mensaje, [])
        expect(r.tipo).toBe('ayuda')
        expect(r.preguntaFrecuente).toBe(id)
    })

    test('no hay ids repetidos y todas tienen respuesta y enlaces', () => {
        const ids = PREGUNTAS_FRECUENTES.map(p => p.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const p of PREGUNTAS_FRECUENTES) {
            expect(typeof p.respuesta).toBe('string')
            expect(p.respuesta.length).toBeGreaterThan(20)
            expect(Array.isArray(p.enlaces)).toBe(true)
        }
    })

    test('el pago explica el flujo pendiente -> en revision -> pagada y el rechazo', () => {
        const {respuesta} = PREGUNTAS_FRECUENTES.find(p => p.id === 'pagar_penalizacion')
        expect(respuesta).toMatch(/"Pendiente" a "En revisión"/)
        expect(respuesta).toMatch(/queda "Pagada"/)
        expect(respuesta).toMatch(/Si lo rechaza, vuelve a "Pendiente" con el motivo/)
    })

    test('los montos de perdida y dano salen de las tarifas vigentes', () => {
        process.env.PENALIZACION_DANIO = '30'
        process.env.PENALIZACION_PERDIDA = '90'
        const {respuesta} = PREGUNTAS_FRECUENTES.find(p => p.id === 'perdida_dano')
        expect(respuesta).toMatch(/del 30 % del precio/)
        expect(respuesta).toMatch(/del 90 % si lo pierdes/)
    })

    test('el plazo usa el maximo de dias, el horario y la tarifa de atraso vigentes', () => {
        process.env.PENALIZACION_ATRASO_DIA = '7'
        process.env.HORARIO_FIN = '17:00'
        const {respuesta} = PREGUNTAS_FRECUENTES.find(p => p.id === 'plazo')
        expect(respuesta).toMatch(/30 días calendario/)
        expect(respuesta).toMatch(/a las 17:00/)
        expect(respuesta).toMatch(/7 % de su precio/)
    })

    test('"tomar fotos del evento" sigue siendo una recomendacion, no la pregunta de evidencia', () => {
        expect(preguntaDe('tomar fotos del evento')).not.toBe('evidencia')
    })
})

describe('Reglas del negocio para Gemini', () => {
    test('incluyen tarifas, horario, un prestamo a la vez, 30 dias y el flujo del comprobante', () => {
        const reglas = reglasNegocio()
        expect(reglas).toContain('un prestamo a la vez')
        expect(reglas).toContain('30 dias calendario')
        expect(reglas).toContain('entre las 07:00 y las 18:00')
        expect(reglas).toContain('5 % por cada dia o fraccion de atraso, 20 % si se devuelve danado o incompleto, 100 % si se pierde')
        expect(reglas).toMatch(/pendiente a en revision .* a pagada/)
    })

    test('cambian con las variables de entorno', () => {
        process.env.PENALIZACION_DANIO = '25'
        process.env.HORARIO_INICIO = '08:00'
        expect(reglasNegocio()).toContain('25 % si se devuelve danado')
        expect(reglasNegocio()).toContain('entre las 08:00')
    })

    test('se envian en la instruccion del sistema, sin precios de los recursos', async () => {
        process.env.GEMINI_API_KEY = 'clave-de-prueba'
        const fetch = jest.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: JSON.stringify({tipo: 'ayuda', respuesta: 'Hola'})}]}}]})})
        global.fetch = fetch
        jest.spyOn(console, 'log').mockImplementation(() => {})
        const recursos = [{_id: '64b7f0f2a1b2c3d4e5f60b01', nombre: 'Proyector Epson', categoria: 'academico', descripcion: 'Proyector HD', etiquetas: ['proyector'], precio: 450}]
        const r = await consultarGemini({mensaje: 'como pago mi multa', recursos})
        expect(r).toMatchObject({tipo: 'ayuda', respuesta: 'Hola'})
        const sistema = JSON.parse(fetch.mock.calls[0][1].body).systemInstruction.parts[0].text
        expect(sistema).toContain('REGLAS DEL SISTEMA')
        expect(sistema).toContain('No inventes precios')
        expect(sistema).toContain('[pagar_penalizacion]')
        expect(sistema).not.toContain('450')
    })
})
