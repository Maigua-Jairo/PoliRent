import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {ocupacion, recursosParaReponer, resumenPenalizaciones} from '../src/helpers/metricasHelper.js'
import {consulta} from './ayudantes.js'

// HU-004: metricas de reposicion y reportes con penalizaciones (sin base de datos)

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const DIA = 864e5
const AHORA = new Date('2026-11-10T15:00:00Z')
const hace = (dias) => new Date(AHORA.getTime() - dias * DIA)
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60a01', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const token = `Bearer ${crearTokenJWT(ADMIN._id, ADMIN.rol)}`

afterEach(() => jest.restoreAllMocks())

describe('Ocupacion de los ultimos 30 dias', () => {
    test('sin prestamos es 0', () => {
        expect(ocupacion([], AHORA)).toBe(0)
    })

    test('cuenta los dias entregado, incluido un prestamo que sigue en curso', () => {
        const prestamos = [
            {estado: 'devuelto', fechaEntrega: hace(20), fechaDevolucionReal: hace(14)},
            {estado: 'entregado', fechaEntrega: hace(3)}
        ]
        expect(ocupacion(prestamos, AHORA)).toBe(30)
    })

    test('recorta lo anterior a la ventana y no cuenta dos veces los solapes', () => {
        const prestamos = [
            {estado: 'devuelto', fechaEntrega: hace(40), fechaDevolucionReal: hace(15)},
            {estado: 'devuelto', fechaEntrega: hace(20), fechaDevolucionReal: hace(10)},
            {estado: 'cancelado', fechaEntrega: hace(9)}
        ]
        expect(ocupacion(prestamos, AHORA)).toBe(66.7)
    })
})

describe('Recursos para reponer', () => {
    const recursos = [
        {_id: 'r1', nombre: 'Proyector', categoria: 'academico', estado: 'disponible'},
        {_id: 'r2', nombre: 'Laptop', categoria: 'academico', estado: 'prestado'},
        {_id: 'r3', nombre: 'Balon', categoria: 'recreativo', estado: 'disponible'},
        {_id: 'r4', nombre: 'Dron', categoria: 'tecnico', estado: 'mantenimiento'},
        {_id: 'r5', nombre: 'Naipes', categoria: 'recreativo', estado: 'disponible'}
    ]
    const prestamos = [
        {recurso: 'r1', estado: 'devuelto', fechaEntrega: hace(10), fechaDevolucionReal: hace(9), devolucion: {condicion: 'danado'}},
        {recurso: 'r2', estado: 'devuelto', fechaEntrega: hace(28), fechaDevolucionReal: hace(5), devolucion: {condicion: 'bueno'}},
        {recurso: 'r2', estado: 'entregado', fechaEntrega: hace(4)},
        {recurso: 'r4', estado: 'devuelto', fechaEntrega: hace(8), fechaDevolucionReal: hace(7), devolucion: {condicion: 'perdido'}},
        {recurso: 'r5', estado: 'devuelto', fechaEntrega: hace(3), fechaDevolucionReal: hace(2), devolucion: {condicion: 'bueno'}}
    ]

    test('incluye solo los que tienen alguna razon, ordenados por urgencia', () => {
        const lista = recursosParaReponer(recursos, prestamos, AHORA)
        expect(lista.map(r => [r.recurso.nombre, r.razones])).toEqual([
            ['Dron', ['perdido', 'en_mantenimiento']],
            ['Proyector', ['danos_frecuentes']],
            ['Laptop', ['alta_demanda']]
        ])
    })

    test('calcula veces prestado, ocupacion e incidentes', () => {
        const laptop = recursosParaReponer(recursos, prestamos, AHORA).find(r => r.recurso.nombre === 'Laptop')
        expect(laptop).toMatchObject({vecesPrestado: 2, incidentes: 0, recurso: {_id: 'r2', categoria: 'academico', estado: 'prestado'}})
        expect(laptop.ocupacion30Dias).toBeGreaterThanOrEqual(60)
        const dron = recursosParaReponer(recursos, prestamos, AHORA)[0]
        expect(dron.incidentes).toBe(1)
    })

    test('devuelve como maximo el limite indicado', () => {
        expect(recursosParaReponer(recursos, prestamos, AHORA, 1)).toHaveLength(1)
    })
})

describe('Resumen de penalizaciones', () => {
    test('cuenta por estado y suma por tipo sin las anuladas', () => {
        const r = resumenPenalizaciones([
            {tipo: 'atraso', estado: 'pendiente', monto: 5},
            {tipo: 'danio', estado: 'pagada', monto: 20},
            {tipo: 'perdida', estado: 'anulada', monto: 100},
            {tipo: 'atraso', estado: 'pagada', monto: 2.5}
        ])
        expect(r).toEqual({
            pendientes: {cantidad: 1, monto: 5},
            pagadas: {cantidad: 2, monto: 22.5},
            anuladas: {cantidad: 1},
            montoPorTipo: {atraso: 7.5, danio: 20, perdida: 0}
        })
    })
})

describe('Endpoints de metricas y reportes', () => {
    beforeEach(() => {
        jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(ADMIN)})
    })

    test('GET /api/metricas incluye penalizaciones y recursosParaReponer', async () => {
        jest.spyOn(Recurso, 'find').mockReturnValue(consulta([{_id: 'r4', nombre: 'Dron', categoria: 'tecnico', estado: 'mantenimiento'}]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Usuario, 'countDocuments').mockResolvedValue(3)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{tipo: 'danio', estado: 'pendiente', monto: 20}]))
        const res = await request(app).get('/api/metricas').set('Authorization', token)
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones.pendientes).toEqual({cantidad: 1, monto: 20})
        expect(res.body.recursosParaReponer).toEqual([expect.objectContaining({recurso: expect.objectContaining({nombre: 'Dron'}), razones: ['en_mantenimiento']})])
        expect(res.body.estudiantes).toBe(3)
    })

    test('GET /api/reportes/penalizaciones en CSV tiene las columnas y neutraliza formulas', async () => {
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{
            usuario: {nombres: '=HYPERLINK("x")', apellidos: 'Mora', cedula: '1712345675', correo: 'ana@epn.edu.ec'},
            recurso: {nombre: 'Proyector'}, tipo: 'atraso', monto: 10, dias: 2, estado: 'pendiente', createdAt: AHORA
        }]))
        const res = await request(app).get('/api/reportes/penalizaciones?formato=csv&estado=pendiente').set('Authorization', token)
        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toMatch(/text\/csv/)
        const [encabezado, fila] = res.text.replace('\ufeff', '').split('\r\n')
        expect(encabezado).toBe('Estudiante,Cedula,Correo,Recurso,Tipo,Monto,Dias,Estado,Registrada el,Fecha de pago,Motivo de anulacion')
        expect(fila.startsWith('"\'=HYPERLINK')).toBe(true)
        expect(fila).toContain('Atraso,10,2,pendiente')
        expect(res.text.startsWith('\ufeff')).toBe(true)
    })

    test('GET /api/reportes/penalizaciones valida los filtros', async () => {
        const res = await request(app).get('/api/reportes/penalizaciones?estado=entregado').set('Authorization', token)
        expect(res.status).toBe(400)
    })

    test('GET /api/reportes/prestamos suma las penalizaciones no anuladas por prestamo con una sola consulta', async () => {
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([{
            _id: 'p1', estado: 'devuelto', usuario: {nombres: 'Ana', apellidos: 'Mora'}, recurso: {nombre: 'Proyector'},
            docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'c@epn.edu.ec'},
            entrega: {responsableNombre: 'Luis Paz', evidencia: {url: 'https://img/e.png'}},
            devolucion: {responsableNombre: 'Maria Lopez', condicion: 'danado', evidencia: {url: 'https://img/d.png'}}
        }]))
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([
            {prestamo: 'p1', monto: 20, estado: 'pendiente'}, {prestamo: 'p1', monto: 5, estado: 'pagada'}, {prestamo: 'p1', monto: 50, estado: 'anulada'}
        ]))
        const res = await request(app).get('/api/reportes/prestamos').set('Authorization', token)
        expect(res.status).toBe(200)
        expect(res.body.prestamos[0]).toMatchObject({
            docente: 'Carlos Ruiz', entregadoPor: 'Luis Paz', recibidoPor: 'Maria Lopez', condicion: 'danado',
            evidenciaEntrega: 'https://img/e.png', evidenciaDevolucion: 'https://img/d.png', penalizacionTotal: 25
        })
        expect(Penalizacion.find).toHaveBeenCalledTimes(1)
        expect(Penalizacion.find).toHaveBeenCalledWith({prestamo: {$in: ['p1']}})
    })

    test('GET /api/reportes/recursos agrega precio, incidentes y monto penalizado', async () => {
        jest.spyOn(Recurso, 'find').mockReturnValue(consulta([{_id: 'r1', nombre: 'Proyector', categoria: 'academico', estado: 'mantenimiento', precio: 300}]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([
            {_id: 'p1', recurso: 'r1', estado: 'devuelto', fechaEntrega: hace(3), devolucion: {condicion: 'incompleto'}},
            {_id: 'p2', recurso: 'r1', estado: 'devuelto', fechaEntrega: hace(9), devolucion: {condicion: 'bueno'}}
        ]))
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{recurso: 'r1', monto: 60}]))
        const res = await request(app).get('/api/reportes/recursos?formato=csv').set('Authorization', token)
        expect(res.status).toBe(200)
        const [encabezado, fila] = res.text.replace('\ufeff', '').split('\r\n')
        expect(encabezado).toBe('Recurso,Categoria,Estado actual,Precio,Solicitudes,Veces prestado,Ultima entrega,Devoluciones con incidente,Penalizado')
        expect(fila).toMatch(/^Proyector,academico,mantenimiento,300,2,2,.+,1,60$/)
    })
})
