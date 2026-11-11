import {
    dentroDeHorario, minutosDelDia, mensajeHorario, horarioActivo, normalizarFechaDevolucion, limiteMaximoDevolucion,
    calcularAtraso, calcularPenalizaciones, textoTerminos, tarifas
} from '../src/helpers/politicasHelper.js'

// politicas de prestamo: horario, fechas, penalizaciones y terminos (funciones puras)

const ecuador = (texto) => new Date(`${texto}-05:00`)
const DIA = 864e5

describe('Horario de entrega y devolucion (07:00-18:00 Ecuador)', () => {
    test.each([
        ['2026-11-10T07:00:00', true],
        ['2026-11-10T18:00:00', true],
        ['2026-11-10T12:30:00', true],
        ['2026-11-10T06:59:00', false],
        ['2026-11-10T18:01:00', false],
        ['2026-11-10T00:00:00', false]
    ])('%s -> %s', (texto, esperado) => {
        expect(dentroDeHorario(ecuador(texto))).toBe(esperado)
    })

    test('los minutos se cuentan en hora de Ecuador', () => {
        expect(minutosDelDia(new Date('2026-11-10T12:00:00Z'))).toBe(7 * 60)
        expect(minutosDelDia(ecuador('2026-11-10T00:00:00'))).toBe(0)
    })

    test('respeta HORARIO_INICIO y HORARIO_FIN', () => {
        process.env.HORARIO_INICIO = '08:00'
        process.env.HORARIO_FIN = '17:00'
        try{
            expect(dentroDeHorario(ecuador('2026-11-10T07:30:00'))).toBe(false)
            expect(mensajeHorario()).toBe('La entrega y la devolucion solo se registran entre las 08:00 y las 17:00 (hora de Ecuador)')
        }finally{
            delete process.env.HORARIO_INICIO
            delete process.env.HORARIO_FIN
        }
    })

    test('VALIDAR_HORARIO=false desactiva la validacion', () => {
        const anterior = process.env.VALIDAR_HORARIO
        process.env.VALIDAR_HORARIO = 'false'
        expect(horarioActivo()).toBe(false)
        process.env.VALIDAR_HORARIO = 'true'
        expect(horarioActivo()).toBe(true)
        if(anterior === undefined) delete process.env.VALIDAR_HORARIO
        else process.env.VALIDAR_HORARIO = anterior
    })
})

describe('Fecha de devolucion', () => {
    test('solo fecha -> ese dia a las 18:00 de Ecuador', () => {
        expect(normalizarFechaDevolucion('2026-11-20').toISOString()).toBe('2026-11-20T23:00:00.000Z')
    })

    test('con hora se respeta la hora enviada', () => {
        expect(normalizarFechaDevolucion('2026-11-20T10:00:00-05:00').toISOString()).toBe('2026-11-20T15:00:00.000Z')
    })

    test.each(['no-es-fecha', '2026-02-31', '', 15])('%p no es valida', (valor) => {
        expect(normalizarFechaDevolucion(valor)).toBeNull()
    })

    test('el limite de 30 dias se cuenta por dias calendario (hasta el final del dia)', () => {
        const ahora = ecuador('2026-11-10T10:00:00')
        const limite = limiteMaximoDevolucion(30, ahora)
        expect(limite.toISOString()).toBe('2026-12-11T04:59:59.999Z')
        expect(normalizarFechaDevolucion('2026-12-10') <= limite).toBe(true)
        expect(normalizarFechaDevolucion('2026-12-11') <= limite).toBe(false)
    })

    test('a las 23:30 de Ecuador el dia de hoy sigue siendo el de Ecuador', () => {
        const limite = limiteMaximoDevolucion(1, ecuador('2026-11-10T23:30:00'))
        expect(limite.toISOString()).toBe('2026-11-12T04:59:59.999Z')
    })
})

describe('Atraso', () => {
    const prevista = ecuador('2026-11-10T18:00:00')

    test('sin atraso no hay monto', () => {
        expect(calcularAtraso(prevista, ecuador('2026-11-10T17:00:00'), 100)).toEqual({dias: 0, monto: 0})
    })

    test('una hora de atraso cuenta como un dia', () => {
        expect(calcularAtraso(prevista, new Date(prevista.getTime() + 36e5), 100)).toEqual({dias: 1, monto: 5})
    })

    test('tres dias de atraso', () => {
        expect(calcularAtraso(prevista, new Date(prevista.getTime() + 3 * DIA), 45)).toEqual({dias: 3, monto: 6.75})
    })

    test('el atraso nunca supera el precio', () => {
        expect(calcularAtraso(prevista, new Date(prevista.getTime() + 40 * DIA), 80)).toEqual({dias: 40, monto: 80})
    })
})

describe('Penalizaciones de una devolucion', () => {
    const fechaDevolucion = ecuador('2026-11-10T18:00:00')
    const aTiempo = ecuador('2026-11-10T12:00:00')
    const tarde = (dias) => new Date(fechaDevolucion.getTime() + dias * DIA)
    const calcular = (condicion, fechaDevolucionReal, precio = 100) => calcularPenalizaciones({precio, fechaDevolucion, fechaDevolucionReal, condicion})

    test('bueno y a tiempo: sin penalizaciones', () => {
        expect(calcular('bueno', aTiempo)).toEqual({penalizaciones: [], total: 0, sinPrecio: false})
    })

    test('bueno con atraso: solo atraso', () => {
        const r = calcular('bueno', tarde(2))
        expect(r.penalizaciones).toEqual([{tipo: 'atraso', monto: 10, dias: 2, descripcion: expect.any(String)}])
        expect(r.total).toBe(10)
    })

    test('danado sin atraso: 20 %', () => {
        const r = calcular('danado', aTiempo)
        expect(r.penalizaciones).toEqual([{tipo: 'danio', monto: 20, descripcion: 'Recurso devuelto danado'}])
    })

    test('danado con atraso: dano + atraso', () => {
        const r = calcular('danado', tarde(3))
        expect(r.penalizaciones.map(p => [p.tipo, p.monto])).toEqual([['danio', 20], ['atraso', 15]])
        expect(r.total).toBe(35)
    })

    test('danado con mucho atraso: el total se recorta al precio', () => {
        const r = calcular('danado', tarde(25))
        expect(r.penalizaciones.map(p => [p.tipo, p.monto])).toEqual([['danio', 20], ['atraso', 80]])
        expect(r.total).toBe(100)
    })

    test('incompleto: 20 %', () => {
        const r = calcular('incompleto', aTiempo, 45)
        expect(r.penalizaciones).toEqual([{tipo: 'danio', monto: 9, descripcion: 'Recurso devuelto incompleto'}])
    })

    test('perdido: 100 % y no se suma atraso', () => {
        const r = calcular('perdido', tarde(5), 250)
        expect(r.penalizaciones).toEqual([{tipo: 'perdida', monto: 250, descripcion: 'Recurso perdido'}])
        expect(r.total).toBe(250)
    })

    test('sin precio no genera penalizaciones', () => {
        expect(calcular('perdido', tarde(5), 0)).toEqual({penalizaciones: [], total: 0, sinPrecio: true})
        expect(calcularPenalizaciones({fechaDevolucion, fechaDevolucionReal: tarde(5), condicion: 'bueno'}).sinPrecio).toBe(true)
    })

    test('respeta las tarifas configuradas', () => {
        process.env.PENALIZACION_DANIO = '30'
        try{
            expect(tarifas().danio).toBe(30)
            expect(calcular('danado', aTiempo).total).toBe(30)
        }finally{
            delete process.env.PENALIZACION_DANIO
        }
    })
})

describe('Terminos y condiciones', () => {
    test('incluyen version, tarifas, horario y las frases con los valores configurados', () => {
        const t = textoTerminos()
        expect(t).toMatchObject({version: '1.0', tarifas: {atrasoPorDia: 5, danio: 20, perdida: 100, tope: 100}, horario: {inicio: '07:00', fin: '18:00', zona: 'America/Guayaquil'}})
        expect(t.condiciones).toEqual(expect.arrayContaining([
            'Si el recurso se devuelve danado o incompleto, pagaras el 20 % de su precio.',
            'Si pierdes el recurso, debes reponerlo completo o pagar el 100 % de su precio.',
            'La entrega y la devolucion solo se realizan entre las 07:00 y las 18:00 (hora de Ecuador).',
            'Mientras tengas penalizaciones pendientes no podras solicitar nuevos recursos.'
        ]))
        expect(t.condiciones).toHaveLength(6)
    })
})
