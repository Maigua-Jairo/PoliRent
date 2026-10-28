import request from 'supertest'
import app from '../src/server.js'
import {aCSV, rangoFechas} from '../src/helpers/reporteHelper.js'

// HU-004, HU-008 y HU-010: pruebas que no requieren base de datos (protecciones de acceso y utilidades de reportes)

const ID = '64b7f0f2a1b2c3d4e5f60718'

describe('Rutas protegidas (sin token responden 401)', () => {
    const rutas = [
        ['get', '/api/historial'],
        ['get', '/api/notificaciones'],
        ['put', '/api/notificaciones/leidas'],
        ['put', `/api/notificaciones/${ID}/leida`],
        ['get', '/api/metricas'],
        ['get', '/api/reportes/prestamos'],
        ['get', '/api/reportes/recursos'],
        ['get', '/api/usuarios'],
        ['delete', `/api/usuarios/${ID}`],
        ['delete', '/api/perfil']
    ]
    test.each(rutas)('%s %s', async (metodo, ruta) => {
        const res = await request(app)[metodo](ruta)
        expect(res.status).toBe(401)
    })
})

describe('Reportes: CSV y rango de fechas', () => {
    test('el CSV escapa comillas y comas', () => {
        const csv = aCSV([{titulo: 'Motivo', campo: 'motivo'}], [{motivo: 'dice "hola", ok'}])
        expect(csv).toBe('﻿Motivo\r\n"dice ""hola"", ok"')
    })

    test('el CSV neutraliza formulas de Excel', () => {
        const csv = aCSV([{titulo: 'Motivo', campo: 'motivo'}], [{motivo: '=SUMA(1)'}])
        expect(csv).toContain("'=SUMA(1)")
    })

    test('el rango incluye todo el dia "hasta"', () => {
        const rango = rangoFechas('2026-10-01', '2026-10-31')
        expect(rango.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z')
        expect(rango.$lte.toISOString()).toBe('2026-10-31T23:59:59.999Z')
    })

    test('sin fechas no hay filtro', () => {
        expect(rangoFechas(undefined, undefined)).toBeNull()
    })
})
