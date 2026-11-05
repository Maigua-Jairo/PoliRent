import RECURSOS_SEED from '../src/seed/recursosSeed.js'
import {CATEGORIAS} from '../src/models/Recurso.js'

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
