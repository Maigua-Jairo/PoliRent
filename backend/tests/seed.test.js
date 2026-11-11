import RECURSOS_SEED from '../src/seed/recursosSeed.js'
import {CATEGORIAS} from '../src/models/Recurso.js'
import PRECIOS_RECURSOS from '../src/seed/preciosRecursos.js'
import {normalizarNombre, planificarPrecios} from '../src/seed/preciosLogica.js'

// los recursos de ejemplo deben respetar las mismas reglas que el formulario del administrador
describe('Recursos de ejemplo (seed)', () => {
    test('tienen nombres unicos', () => {
        const nombres = RECURSOS_SEED.map(r => r.nombre.toLowerCase())
        expect(new Set(nombres).size).toBe(nombres.length)
    })

    test.each(RECURSOS_SEED)('$nombre cumple los limites y el formato de etiquetas', (r) => {
        expect(r.nombre.length).toBeGreaterThanOrEqual(3)
        expect(r.nombre.length).toBeLessThanOrEqual(100)
        expect(r.descripcion.length).toBeLessThanOrEqual(500)
        expect(CATEGORIAS).toContain(r.categoria)
        expect(r.etiquetas).toHaveLength(3)
        for(const e of r.etiquetas) expect(e).toMatch(/^[a-z0-9]+$/)
    })
})

describe('Precios de reposicion', () => {
    test('todos los valores de PRECIOS_RECURSOS son numeros mayores que 0', () => {
        for(const [nombre, precio] of Object.entries(PRECIOS_RECURSOS)){
            expect([nombre, typeof precio, precio > 0]).toEqual([nombre, 'number', true])
        }
    })

    test('todo recurso de la semilla tiene precio mayor que 0', () => {
        const sinPrecio = RECURSOS_SEED.filter(r => !(typeof r.precio === 'number' && r.precio > 0)).map(r => r.nombre)
        expect(sinPrecio).toEqual([])
    })

    test('el nombre se compara sin tildes ni mayusculas', () => {
        expect(normalizarNombre('  Cámara RÉFLEX ')).toBe('camara reflex')
        const plan = planificarPrecios([{_id: 1, nombre: 'IMPRESORA 3d', precio: 0}], {'Impresora 3D': 280})
        expect(plan.actualizar).toEqual([{_id: 1, nombre: 'IMPRESORA 3d', precio: 280, anterior: 0}])
    })

    test('no toca recursos que ya tienen precio salvo con --forzar', () => {
        const recursos = [
            {_id: 1, nombre: 'Naipes', precio: 10},
            {_id: 2, nombre: 'Kit de pingpong'},
            {_id: 3, nombre: 'Recurso desconocido', precio: 0}
        ]
        const precios = {'Naipes': 4, 'Kit de pingpong': 25}
        const normal = planificarPrecios(recursos, precios)
        expect(normal.actualizar.map(r => r.nombre)).toEqual(['Kit de pingpong'])
        expect(normal.conPrecio).toEqual(['Naipes'])
        expect(normal.sinTabla).toEqual(['Recurso desconocido'])
        const forzado = planificarPrecios(recursos, precios, {forzar: true})
        expect(forzado.actualizar.map(r => [r.nombre, r.precio])).toEqual([['Naipes', 4], ['Kit de pingpong', 25]])
    })
})
