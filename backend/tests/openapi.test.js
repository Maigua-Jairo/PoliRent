import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'
import especificacion from '../src/docs/openapi.js'

// la especificacion de Swagger debe documentar todas las rutas de los routers (y solo esas)

const carpetaRouters = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'routers')
const METODOS = ['get', 'post', 'put', 'delete']

// "router.put('/prestamos/:id/devolver'" -> "put /api/prestamos/{id}/devolver"
const rutasDeRouters = () => fs.readdirSync(carpetaRouters)
    .filter(archivo => archivo.endsWith('.js'))
    .flatMap(archivo => {
        const codigo = fs.readFileSync(path.join(carpetaRouters, archivo), 'utf8')
        return [...codigo.matchAll(/router\.(get|post|put|delete)\(\s*['"`]([^'"`]+)['"`]/g)]
            .map(([, metodo, ruta]) => `${metodo} /api${ruta.replace(/:(\w+)/g, '{$1}')}`)
    })

const operacionesDocumentadas = () => Object.entries(especificacion.paths)
    .flatMap(([ruta, operaciones]) => Object.keys(operaciones).filter(m => METODOS.includes(m)).map(m => `${m} ${ruta}`))

describe('Cobertura de la especificacion OpenAPI', () => {
    test('se encontraron rutas en los routers', () => {
        expect(rutasDeRouters().length).toBeGreaterThan(30)
    })

    test('cada ruta de los routers esta documentada', () => {
        const documentadas = new Set(operacionesDocumentadas())
        const faltan = rutasDeRouters().filter(r => !documentadas.has(r))
        if(faltan.length) throw new Error(`Rutas sin documentar en src/docs/openapi.js:\n  ${faltan.join('\n  ')}`)
    })

    test('cada operacion documentada existe en un router', () => {
        const reales = new Set(rutasDeRouters())
        const sobran = operacionesDocumentadas().filter(o => o !== 'get /' && !reales.has(o))
        if(sobran.length) throw new Error(`Operaciones documentadas que no existen en src/routers/:\n  ${sobran.join('\n  ')}`)
    })

    test('documenta los esquemas y la etiqueta nuevos', () => {
        expect(Object.keys(especificacion.components.schemas)).toEqual(expect.arrayContaining(['Penalizacion', 'Terminos']))
        expect(especificacion.tags.map(t => t.name)).toContain('Penalizaciones')
        expect(especificacion.components.schemas.Notificacion.properties.tipo.enum).toContain('penalizacion')
        expect(especificacion.components.schemas.Recurso.properties.precio).toBeDefined()
        expect(Object.keys(especificacion.components.schemas.Prestamo.properties)).toEqual(expect.arrayContaining(['terminos', 'docenteReferencia', 'entrega', 'devolucion']))
    })
})
