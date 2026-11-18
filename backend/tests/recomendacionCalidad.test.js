import {recomendarRecursos, tokenizar} from '../src/helpers/recomendacionHelper.js'
import {CATALOGO, CASOS, contiene} from './casosCalidad.js'

// Banco de calidad del recomendador (HU-009): cada consulta debe traer los recursos esperados entre los 5 primeros.
// Medicion al crear el banco: 53 de 58 consultas pasaban; despues de ampliar el vocabulario y separar el parecido
// directo del relacionado pasan las 58.

const top5 = (consulta) => recomendarRecursos(CATALOGO, {contexto: consulta, limite: 5}).map(r => r.recurso.nombre)

describe('Banco de calidad de recomendaciones', () => {
    test('tiene al menos 40 consultas sobre el catalogo real', () => {
        expect(CASOS.length).toBeGreaterThanOrEqual(40)
        const nombres = CATALOGO.map(r => r.nombre)
        for (const [, esperados] of CASOS) for (const e of esperados) expect(contiene(nombres, e)).toBe(true)
    })

    test.each(CASOS)('"%s" incluye %j entre los 5 primeros', (consulta, esperados) => {
        const nombres = top5(consulta)
        expect(esperados.filter(e => !contiene(nombres, e))).toEqual([])
    })
})

describe('Puntaje: las coincidencias directas pesan mas que los terminos relacionados', () => {
    test('para un robot, el primer resultado comparte palabras con la consulta (no solo vocabulario relacionado)', () => {
        const [primero] = recomendarRecursos(CATALOGO, {contexto: 'quiero hacer un robot que mida distancia', limite: 5})
        expect(primero.terminosCoincidentes.length).toBeGreaterThan(0)
        expect(top5('quiero hacer un robot que mida distancia')).not.toContain('Medidor de pH digital')
    })

    test('los juegos de mesa ya no quedan detras de los balones', () => {
        const nombres = top5('noche de juegos de mesa')
        expect(nombres.slice(0, 3)).toEqual(expect.arrayContaining(['Naipes']))
        expect(nombres).not.toContain('Balon de basquet')
    })

    test('un proyecto de IA no trae los conos de entrenamiento', () => {
        expect(top5('proyecto de inteligencia artificial')).not.toContain('Conos de entrenamiento')
    })
})

describe('Vocabulario: variantes explicitas', () => {
    test.each([
        ['levantamiento topografico', ['levantamiento', 'topografia']],
        ['circuitos electronicos', ['circuito', 'electronica']],
        ['instalacion electrica', ['instalacion', 'electrica']],
        ['practica de quimico', ['practica', 'quimica']],
        ['muestras biologicas', ['muestra', 'biologia']],
        ['taller mecanico', ['taller', 'mecanica']],
        ['sesion fotografica', ['sesion', 'fotografia']],
        ['fotos', ['fotografia']],
        ['graficar funciones', ['graficadora', 'funcion']],
        ['red inalambrica', ['red', 'inalambrico']],
        ['parlantes portatiles', ['parlant', 'portatil']],
        ['soldar', ['soldador']],
        ['medir', ['medicion']],
        ['imprimir en 3d', ['impresion', '3d']],
        ['grabar video', ['grabacion', 'video']],
        ['robot', ['robotica']],
        ['torneo interfacultades', ['torneo', 'interfacultad']],
        ['evento cultural', ['evento', 'cultura']]
    ])('"%s" -> %j', (texto, esperado) => {
        expect(tokenizar(texto)).toEqual(esperado)
    })

    test('"red" y "redes" coinciden, pero no con "redaccion"', () => {
        expect(tokenizar('redes')).toEqual(['red'])
        expect(tokenizar('red')).toEqual(['red'])
        expect(tokenizar('redaccion')).toEqual(['redaccion'])
        const nombres = top5('redaccion de un ensayo')
        expect(nombres).not.toEqual(expect.arrayContaining(['Router Cisco']))
        expect(nombres).not.toContain('Cable de red UTP')
    })

    test('las variantes no unen palabras parecidas que no tienen relacion', () => {
        expect(tokenizar('medalla')).toEqual(['medalla'])
        expect(tokenizar('fotocopia')).toEqual(['fotocopia'])
        expect(tokenizar('mecanografia')).toEqual(['mecanografia'])
        expect(tokenizar('robo')).toEqual(['robo'])
    })

    test('una consulta sin relacion con el catalogo no recomienda nada', () => {
        expect(recomendarRecursos(CATALOGO, {contexto: 'xyzzy plumbus', limite: 5})).toEqual([])
    })
})
