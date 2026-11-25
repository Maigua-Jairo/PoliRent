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
        expect(especificacion.components.schemas.Movimiento.properties.condicion.enum).toContain('bueno')
        expect(especificacion.paths['/api/prestamos/{id}/entregar'].put.requestBody.content['application/json'].schema.properties.condicion).toBeDefined()
    })
})

describe('Swagger: ids, campos y reglas de la revision', () => {
    test('todos los parametros {id} usan un componente con pattern, longitud 24 y de donde se obtiene', () => {
        const parametros = Object.values(especificacion.paths).flatMap(ops => Object.values(ops).flatMap(op => op.parameters ?? []))
        const deRuta = parametros.filter(p => p.$ref || p.in === 'path' && p.name === 'id')
        expect(deRuta.length).toBeGreaterThan(15)
        for (const p of deRuta) expect(p.$ref).toMatch(/^#\/components\/parameters\/Id/)
        for (const p of Object.values(especificacion.components.parameters)) {
            expect(p.schema).toMatchObject({pattern: '^[a-fA-F0-9]{24}$', minLength: 24, maxLength: 24})
            expect(p.schema.example).toMatch(/^[a-fA-F0-9]{24}$/)
            expect(p.description).toMatch(/GET \/api\//)
        }
        expect(especificacion.components.schemas.IdMongo.pattern).toBe('^[a-fA-F0-9]{24}$')
    })

    test('documenta los campos nuevos', () => {
        const solicitud = especificacion.paths['/api/prestamos'].post.requestBody.content['application/json'].schema.properties
        expect(Object.keys(solicitud)).toEqual(expect.arrayContaining(['fechaEntrega', 'horaEntrega', 'horaDevolucion']))
        expect(solicitud.recursoId.description).toMatch(/GET \/api\/recursos/)
        expect(especificacion.components.schemas.Prestamo.properties.fechaEntregaProgramada).toBeDefined()
        expect(especificacion.components.schemas.Penalizacion.properties.fechaRegistro).toBeDefined()
        expect(especificacion.components.schemas.Terminos.properties.maxSolicitudesActivas).toBeDefined()
        const metricas = especificacion.paths['/api/metricas'].get.responses[200].content['application/json'].schema
        expect(metricas.properties.penalizaciones.properties.recaudado.properties).toHaveProperty('porRecurso')
        const rechazo = especificacion.paths['/api/prestamos/{id}/rechazar'].put.requestBody
        expect(rechazo.required).toBe(true)
        expect(rechazo.content['application/json'].schema.properties.motivoRechazo).toMatchObject({minLength: 30, maxLength: 200})
        const prestamo = especificacion.components.schemas.Prestamo.properties
        expect(Object.keys(prestamo)).toEqual(expect.arrayContaining(['motivoPrestamo', 'fechaDevolucionProgramada', 'fechaEntregaReal']))
        expect(prestamo).not.toHaveProperty('motivo')
        expect(Object.keys(especificacion.components.schemas.Movimiento.properties)).toEqual(expect.arrayContaining(['entregadoPor', 'recibidoPor']))
        expect(especificacion.components.schemas.Penalizacion.properties).toHaveProperty('diasAtraso')
    })
})
