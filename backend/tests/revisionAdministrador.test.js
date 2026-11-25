import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {formatearFechaHora} from '../src/helpers/politicasHelper.js'
import {recaudado, porcentajes} from '../src/helpers/metricasHelper.js'
import {consulta, documento} from './ayudantes.js'

// Revision de la tesis, etapa A (administrador): sin facultad, validaciones de recursos, nombre unico al actualizar,
// eliminar solo disponibles, rechazo con motivo, entrega programada, cancelar solo pendiente y recaudo. Sin base de datos.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const DIA = 864e5
const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60e01', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora', facultad: 'Ingeniería Civil'}
const ADMIN = {_id: '64b7f0f2a1b2c3d4e5f60e02', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz'}
const ID = '64b7f0f2a1b2c3d4e5f60e03'
const ID_OTRO = '64b7f0f2a1b2c3d4e5f60e04'
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([])})
})
afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.MOTIVO_RECHAZO_MIN
    delete process.env.ENTREGA_TOLERANCIA_MIN
})

describe('A1. Administrador sin facultad', () => {
    test('la facultad es obligatoria solo para estudiantes', () => {
        const admin = new Usuario({nombres: 'Luis', apellidos: 'Paz', cedula: '1710034065', correo: 'admin@asociacion.org', telefono: '0991234567', password: 'x', rol: 'administrador'})
        expect(admin.validateSync()?.errors?.facultad).toBeUndefined()
        const estudiante = new Usuario({nombres: 'Ana', apellidos: 'Mora', cedula: '1710034065', correo: 'ana@epn.edu.ec', telefono: '0991234567', password: 'x'})
        expect(estudiante.validateSync().errors.facultad).toBeDefined()
    })

    test('el perfil del administrador no incluye facultad; el del estudiante si', async () => {
        sesion({...ADMIN, facultad: 'Ingeniería Civil'})
        const admin = await request(app).get('/api/perfil').set('Authorization', token(ADMIN))
        expect(admin.status).toBe(200)
        expect(admin.body.usuario).not.toHaveProperty('facultad')
        sesion(ESTUDIANTE)
        const estudiante = await request(app).get('/api/perfil').set('Authorization', token(ESTUDIANTE))
        expect(estudiante.body.usuario.facultad).toBe('Ingeniería Civil')
    })

    test('el administrador no puede guardar una facultad en su perfil', async () => {
        sesion(ADMIN)
        const res = await request(app).put('/api/perfil').set('Authorization', token(ADMIN)).send({facultad: 'Ingeniería Civil'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('El administrador no tiene facultad')
    })
})

describe('A2. Crear recursos con validaciones completas', () => {
    beforeEach(() => {
        sesion(ADMIN)
        jest.spyOn(Recurso, 'findOne').mockReturnValue(consulta(null))
        jest.spyOn(Recurso, 'create').mockImplementation(async (datos) => ({_id: ID, ...datos}))
    })
    const valido = {nombre: 'Balon de voley', categoria: 'recreativo', descripcion: 'Balon oficial de voleibol', precio: 25.5}
    const crear = (cambios) => request(app).post('/api/recursos').set('Authorization', token(ADMIN)).send({...valido, ...cambios})

    test.each([
        ['sin nombre', {nombre: undefined}, 'El nombre del recurso es obligatorio'],
        ['con nombre vacio', {nombre: ''}, 'El nombre del recurso es obligatorio'],
        ['con nombre de solo espacios', {nombre: '     '}, 'El nombre del recurso es obligatorio'],
        ['con categoria vacia', {categoria: ''}, 'La categoria del recurso es obligatoria'],
        ['con nombre como objeto (operador NoSQL)', {nombre: {$ne: null}}, 'El nombre del recurso debe ser texto'],
        ['con nombre corto', {nombre: '  ab  '}, 'El nombre del recurso debe tener entre 3 y 80 caracteres'],
        ['con nombre largo', {nombre: 'a'.repeat(81)}, 'El nombre del recurso debe tener entre 3 y 80 caracteres'],
        ['sin categoria', {categoria: undefined}, 'La categoria del recurso es obligatoria'],
        ['con categoria fuera del enum', {categoria: 'medicina'}, 'La categoria del recurso debe ser: tecnico, academico, recreativo'],
        ['con categoria como arreglo', {categoria: ['tecnico']}, 'La categoria del recurso debe ser: tecnico, academico, recreativo'],
        ['con descripcion corta', {descripcion: 'corta'}, 'La descripcion del recurso debe tener entre 10 y 500 caracteres (o dejarse vacia)'],
        ['con descripcion larga', {descripcion: 'a'.repeat(501)}, 'La descripcion del recurso debe tener entre 10 y 500 caracteres (o dejarse vacia)'],
        ['con descripcion como objeto', {descripcion: {$gt: ''}}, 'La descripcion del recurso debe ser texto'],
        ['con precio 0', {precio: 0}, 'El precio del recurso debe ser un numero mayor que 0 y de maximo 100000, con hasta 2 decimales'],
        ['con precio negativo', {precio: -5}, 'El precio del recurso debe ser un numero mayor que 0 y de maximo 100000, con hasta 2 decimales'],
        ['con precio de 3 decimales', {precio: 10.123}, 'El precio del recurso debe ser un numero mayor que 0 y de maximo 100000, con hasta 2 decimales'],
        ['con precio sobre el tope', {precio: 100001}, 'El precio del recurso debe ser un numero mayor que 0 y de maximo 100000, con hasta 2 decimales'],
        ['con precio en texto no numerico', {precio: 'diez'}, 'El precio del recurso debe ser un numero mayor que 0 y de maximo 100000, con hasta 2 decimales'],
        ['con estado fuera del enum', {estado: 'perdido'}, 'El estado del recurso debe ser: disponible, prestado, mantenimiento'],
        ['con un campo del sistema', {_id: ID_OTRO}, 'El campo _id no se puede enviar'],
        ['con imagenId', {imagenId: 'polirent/recursos/x'}, 'El campo imagenId no se puede enviar']
    ])('rechaza la creacion %s (400)', async (_, cambios, msg) => {
        const res = await crear(cambios)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
        expect(Recurso.create).not.toHaveBeenCalled()
    })

    test('crea un recurso valido sin espacios sobrantes en el nombre', async () => {
        const res = await crear({nombre: '  Balon   de  voley ', etiquetas: 'voley, deporte'})
        expect(res.status).toBe(201)
        expect(Recurso.create).toHaveBeenCalledWith(expect.objectContaining({nombre: 'Balon de voley', precio: 25.5, etiquetas: ['voley', 'deporte']}))
    })

    test('acepta el precio como texto con 2 decimales (multipart)', async () => {
        const res = await request(app).post('/api/recursos').set('Authorization', token(ADMIN))
            .field('nombre', 'Balon de voley').field('categoria', 'recreativo').field('precio', '25.50')
        expect(res.status).toBe(201)
        expect(Recurso.create).toHaveBeenCalledWith(expect.objectContaining({precio: 25.5}))
    })

    test('un nombre repetido se compara sin mayusculas ni tildes en cualquier categoria', async () => {
        Recurso.findOne.mockReturnValue(consulta({_id: ID_OTRO, nombre: 'Balón de Vóley'}))
        const res = await crear({nombre: 'balon de voley', categoria: 'tecnico'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Ya existe un recurso con ese nombre')
        expect(Recurso.findOne).toHaveBeenCalledWith({nombre: 'balon de voley'})
    })

    test('la busqueda del nombre usa collation es / strength 1', async () => {
        const collation = jest.fn(() => Promise.resolve(null))
        Recurso.findOne.mockReturnValue({collation})
        await crear({})
        expect(collation).toHaveBeenCalledWith({locale: 'es', strength: 1})
    })
})

describe('A2. Nombre unico al actualizar', () => {
    let recurso
    beforeEach(() => {
        sesion(ADMIN)
        recurso = documento({_id: ID, nombre: 'Diego', categoria: 'academico', estado: 'disponible'})
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recurso)
    })
    const actualizar = (cuerpo) => request(app).put(`/api/recursos/${ID}`).set('Authorization', token(ADMIN)).send(cuerpo)

    test('me llamo Diego y quiero llamarme Jairo, pero Jairo ya existe: 400', async () => {
        jest.spyOn(Recurso, 'findOne').mockReturnValue(consulta({_id: ID_OTRO, nombre: 'Jairo'}))
        const res = await actualizar({nombre: 'JAIRO'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Ya existe un recurso con ese nombre')
        expect(Recurso.findOne).toHaveBeenCalledWith({nombre: 'JAIRO', _id: {$ne: ID}})
        expect(recurso.nombre).toBe('Diego')
    })

    test('puede guardarse con su mismo nombre (se excluye al propio recurso)', async () => {
        jest.spyOn(Recurso, 'findOne').mockReturnValue(consulta(null))
        const res = await actualizar({nombre: 'Diego', precio: 12})
        expect(res.status).toBe(200)
        expect(recurso).toMatchObject({nombre: 'Diego', precio: 12})
    })

    test('al actualizar tambien valida los campos con su nombre', async () => {
        const res = await actualizar({descripcion: 'corta'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/descripcion del recurso/)
    })
})

describe('A2. Eliminar solo recursos disponibles', () => {
    beforeEach(() => sesion(ADMIN))
    const eliminar = () => request(app).delete(`/api/recursos/${ID}`).set('Authorization', token(ADMIN))

    test.each(['prestado', 'mantenimiento'])('un recurso %s no se elimina (400)', async (estado) => {
        const recurso = documento({_id: ID, nombre: 'Proyector', estado, deleteOne: jest.fn()})
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recurso)
        const res = await eliminar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Solo se puede eliminar un recurso disponible')
        expect(recurso.deleteOne).not.toHaveBeenCalled()
    })

    test('un recurso disponible con solicitudes activas no se elimina (400)', async () => {
        const recurso = documento({_id: ID, nombre: 'Proyector', estado: 'disponible', deleteOne: jest.fn()})
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recurso)
        jest.spyOn(Prestamo, 'exists').mockResolvedValue({_id: 'p1'})
        const res = await eliminar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/solicitudes activas/)
        expect(Prestamo.exists).toHaveBeenCalledWith({recurso: ID, estado: {$in: ['pendiente', 'aprobado', 'entregado']}})
        expect(recurso.deleteOne).not.toHaveBeenCalled()
    })

    test('un recurso disponible sin solicitudes activas se elimina', async () => {
        const recurso = documento({_id: ID, nombre: 'Proyector', estado: 'disponible', imagenId: null, deleteOne: jest.fn()})
        jest.spyOn(Recurso, 'findById').mockResolvedValue(recurso)
        jest.spyOn(Prestamo, 'exists').mockResolvedValue(null)
        const res = await eliminar()
        expect(res.status).toBe(200)
        expect(recurso.deleteOne).toHaveBeenCalled()
    })
})

describe('A3. Rechazar con motivo de 30 a 200 caracteres', () => {
    let prestamo
    beforeEach(() => {
        sesion(ADMIN)
        prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, recurso: ID_OTRO, estado: 'pendiente'})
        jest.spyOn(Prestamo, 'findById').mockResolvedValue(prestamo)
        jest.spyOn(Recurso, 'findById').mockReturnValue(consulta({nombre: 'Proyector'}))
    })
    const rechazar = (cuerpo) => request(app).put(`/api/prestamos/${ID}/rechazar`).set('Authorization', token(ADMIN)).send(cuerpo)
    const MOTIVO = 'El recurso esta reservado para un evento de la asociacion'

    test.each([
        ['sin motivo', {}, 'El motivo de rechazo es obligatorio'],
        ['con motivo vacio', {motivoRechazo: ''}, 'El motivo de rechazo es obligatorio'],
        ['con motivo de solo espacios', {motivoRechazo: '     '}, 'El motivo de rechazo es obligatorio'],
        ['con motivo de 29 caracteres', {motivoRechazo: 'a'.repeat(29)}, 'El motivo de rechazo debe tener entre 30 y 200 caracteres'],
        ['con motivo de 201 caracteres', {motivoRechazo: 'a'.repeat(201)}, 'El motivo de rechazo debe tener entre 30 y 200 caracteres'],
        ['con motivo que no es texto', {motivoRechazo: ['x']}, 'El motivo de rechazo debe ser texto']
    ])('rechaza la peticion %s (400)', async (_, cuerpo, msg) => {
        const res = await rechazar(cuerpo)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
        expect(prestamo.estado).toBe('pendiente')
    })

    test('con 30 caracteres rechaza la solicitud y guarda el motivo sin espacios sobrantes', async () => {
        const res = await rechazar({motivoRechazo: `  ${'a'.repeat(30)}  `})
        expect(res.status).toBe(200)
        expect(prestamo).toMatchObject({estado: 'rechazado', motivoRechazo: 'a'.repeat(30)})
    })

    test('acepta motivoRechazo y explica que el campo viejo motivo cambio de nombre', async () => {
        const viejo = await rechazar({motivo: MOTIVO})
        expect(viejo.status).toBe(400)
        expect(viejo.body.msg).toBe('El campo motivo ahora se llama motivoRechazo')
        const res = await rechazar({motivoRechazo: MOTIVO})
        expect(res.status).toBe(200)
        expect(prestamo.motivoRechazo).toBe(MOTIVO)
    })

    test('los limites salen de MOTIVO_RECHAZO_MIN', async () => {
        process.env.MOTIVO_RECHAZO_MIN = '10'
        const res = await rechazar({motivoRechazo: 'corto'})
        expect(res.body.msg).toBe('El motivo de rechazo debe tener entre 10 y 200 caracteres')
    })
})

describe('A3. Entrega: solo desde aprobado y no antes de la hora programada', () => {
    let prestamo
    let recurso
    beforeEach(() => {
        sesion(ADMIN)
        recurso = documento({_id: ID_OTRO, nombre: 'Proyector', estado: 'disponible', precio: 100})
        jest.spyOn(Prestamo, 'findById').mockImplementation(() => consulta(prestamo))
        jest.spyOn(Prestamo, 'findOne').mockImplementation(() => consulta(prestamo))
        jest.spyOn(Recurso, 'findById').mockImplementation(() => consulta(recurso))
    })
    const nuevo = (cambios) => documento({_id: ID, usuario: ESTUDIANTE._id, recurso: ID_OTRO, estado: 'aprobado', fechaDevolucion: new Date(Date.now() + 3 * DIA), ...cambios})
    const entregar = () => request(app).put(`/api/prestamos/${ID}/entregar`).set('Authorization', token(ADMIN)).send({})

    test('reservada para manana no se puede entregar hoy (400 con la fecha programada)', async () => {
        const programada = new Date(Date.now() + DIA)
        prestamo = nuevo({fechaEntregaProgramada: programada})
        const res = await entregar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(`Esta solicitud esta programada para el ${formatearFechaHora(programada)}, no se puede entregar antes`)
        expect(res.body.msg).toMatch(/el \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}, no se puede/)
        expect(prestamo.estado).toBe('aprobado')
    })

    test('dentro de la tolerancia (30 min antes) si se entrega', async () => {
        prestamo = nuevo({fechaEntregaProgramada: new Date(Date.now() + 20 * 60 * 1000)})
        const res = await entregar()
        expect(res.status).toBe(200)
        expect(prestamo.estado).toBe('entregado')
    })

    test('la tolerancia sale de ENTREGA_TOLERANCIA_MIN', async () => {
        process.env.ENTREGA_TOLERANCIA_MIN = '10'
        prestamo = nuevo({fechaEntregaProgramada: new Date(Date.now() + 20 * 60 * 1000)})
        expect((await entregar()).status).toBe(400)
    })

    test('una solicitud antigua sin fechaEntregaProgramada no se valida', async () => {
        prestamo = nuevo({})
        expect((await entregar()).status).toBe(200)
    })

    test('no se entrega dos veces', async () => {
        prestamo = nuevo({estado: 'entregado'})
        const res = await entregar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/entrega de una solicitud aprobada/)
    })

    test('por QR tampoco se entrega antes de la hora programada', async () => {
        prestamo = nuevo({fechaEntregaProgramada: new Date(Date.now() + DIA), codigoQR: 'a'.repeat(32)})
        const res = await request(app).post('/api/prestamos/escanear').set('Authorization', token(ADMIN)).send({codigo: 'a'.repeat(32)})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/^Esta solicitud esta programada para el/)
    })

    test('la notificacion de devolucion nombra a quien recibio el recurso', async () => {
        prestamo = nuevo({estado: 'entregado'})
        recurso = documento({_id: ID_OTRO, nombre: 'Proyector', estado: 'prestado', precio: 100})
        jest.spyOn(Penalizacion, 'insertMany').mockResolvedValue([])
        const res = await request(app).put(`/api/prestamos/${ID}/devolver`).set('Authorization', token(ADMIN)).send({responsable: 'Maria Lopez'})
        expect(res.status).toBe(200)
        expect(res.body.prestamo.devolucion.recibidoPor).toBe('Maria Lopez')
        expect(Notificacion.create).toHaveBeenCalledWith(expect.objectContaining({tipo: 'devuelto', mensaje: expect.stringContaining('Lo recibio Maria Lopez')}))
    })
})

describe('A3. Cancelar solo una solicitud pendiente', () => {
    let prestamo
    beforeEach(() => {
        sesion(ESTUDIANTE)
        jest.spyOn(Prestamo, 'findById').mockImplementation(() => Promise.resolve(prestamo))
        jest.spyOn(Recurso, 'findById').mockReturnValue(consulta({_id: ID_OTRO, nombre: 'Proyector Epson'}))
    })
    const cancelar = () => request(app).put(`/api/prestamos/${ID}/cancelar`).set('Authorization', token(ESTUDIANTE))

    test.each(['aprobado', 'entregado', 'devuelto', 'rechazado', 'cancelado'])('una solicitud %s no se cancela (400)', async (estado) => {
        prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, recurso: ID_OTRO, estado})
        const res = await cancelar()
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Solo se puede cancelar una solicitud pendiente')
        expect(prestamo.estado).toBe(estado)
    })

    test('una pendiente se cancela; la respuesta trae el nombre del recurso y ningun dato de devolucion', async () => {
        prestamo = documento({_id: ID, usuario: ESTUDIANTE._id, recurso: ID_OTRO, estado: 'pendiente', fechaDevolucion: new Date(Date.now() + 3 * DIA)})
        const res = await cancelar()
        expect(res.status).toBe(200)
        expect(res.body.prestamo).toMatchObject({estado: 'cancelado', recurso: {_id: ID_OTRO, nombre: 'Proyector Epson'}})
        expect(res.body.prestamo).not.toHaveProperty('fechaDevolucionProgramada')
        expect(res.body.prestamo).not.toHaveProperty('fechaDevolucionReal')
        expect(res.body.prestamo).not.toHaveProperty('devolucion')
    })

    test('la solicitud de otro estudiante sigue respondiendo 404', async () => {
        prestamo = documento({_id: ID, usuario: ADMIN._id, recurso: ID_OTRO, estado: 'pendiente'})
        expect((await cancelar()).status).toBe(404)
    })
})

describe('A4. Recaudo por recurso y por tipo', () => {
    const nombres = new Map([['r1', {nombre: 'Balon de voley'}], ['r2', {nombre: 'Proyector'}]])

    test('de $100 recaudados, $25 fueron por el balon de voley (solo pagadas, de mayor a menor)', () => {
        const r = recaudado([
            {recurso: 'r1', tipo: 'danio', estado: 'pagada', monto: 25},
            {recurso: 'r2', tipo: 'perdida', estado: 'pagada', monto: 60},
            {recurso: 'r2', tipo: 'atraso', estado: 'pagada', monto: 15},
            {recurso: 'r1', tipo: 'atraso', estado: 'pendiente', monto: 500},
            {recurso: 'r1', tipo: 'atraso', estado: 'anulada', monto: 300}
        ], nombres)
        expect(r.total).toBe(100)
        expect(r.porRecurso).toEqual([
            {recurso: 'r2', nombre: 'Proyector', cantidad: 2, monto: 75, porcentaje: 75},
            {recurso: 'r1', nombre: 'Balon de voley', cantidad: 1, monto: 25, porcentaje: 25}
        ])
        expect(r.porTipo.map(t => [t.tipo, t.monto, t.porcentaje])).toEqual([['perdida', 60, 60], ['danio', 25, 25], ['atraso', 15, 15]])
    })

    test('los porcentajes suman 100 aunque no sean exactos', () => {
        const pct = porcentajes([1, 1, 1])
        expect(pct.reduce((s, x) => s + x, 0)).toBeCloseTo(100, 10)
        expect(pct).toEqual([33.4, 33.3, 33.3])
    })

    test('sin penalizaciones pagadas: total 0 y listas vacias', () => {
        expect(recaudado([{recurso: 'r1', tipo: 'atraso', estado: 'pendiente', monto: 5}], nombres)).toEqual({total: 0, porRecurso: [], porTipo: []})
    })

    test('GET /api/metricas incluye penalizaciones.recaudado', async () => {
        sesion(ADMIN)
        jest.spyOn(Recurso, 'find').mockReturnValue(consulta([{_id: 'r1', nombre: 'Balon de voley', categoria: 'recreativo', estado: 'disponible'}]))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Usuario, 'countDocuments').mockResolvedValue(1)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{recurso: 'r1', tipo: 'danio', estado: 'pagada', monto: 20}, {recurso: 'rX', tipo: 'atraso', estado: 'pagada', monto: 5}]))
        const res = await request(app).get('/api/metricas').set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones.recaudado).toEqual({
            total: 25,
            porRecurso: [
                {recurso: 'r1', nombre: 'Balon de voley', cantidad: 1, monto: 20, porcentaje: 80},
                {recurso: 'rX', nombre: 'Recurso eliminado', cantidad: 1, monto: 5, porcentaje: 20}
            ],
            porTipo: [{tipo: 'danio', cantidad: 1, monto: 20, porcentaje: 80}, {tipo: 'atraso', cantidad: 1, monto: 5, porcentaje: 20}]
        })
    })
})

describe('A4. Fechas de registro y de pago en las penalizaciones', () => {
    const REGISTRO = new Date('2026-11-02T15:00:00.000Z')
    const PAGO = new Date('2026-11-10T15:00:00.000Z')
    const lista = [
        {_id: 'pen1', tipo: 'atraso', monto: 5, estado: 'pendiente', createdAt: REGISTRO},
        {_id: 'pen2', tipo: 'danio', monto: 20, estado: 'pagada', createdAt: REGISTRO, fechaPago: PAGO}
    ]

    test('GET /api/penalizaciones/mis trae fechaRegistro y fechaPago (null si no esta pagada)', async () => {
        sesion(ESTUDIANTE)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta(lista))
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        const res = await request(app).get('/api/penalizaciones/mis').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones[0]).toMatchObject({fechaRegistro: REGISTRO.toISOString(), fechaPago: null})
        expect(res.body.penalizaciones[1]).toMatchObject({fechaRegistro: REGISTRO.toISOString(), fechaPago: PAGO.toISOString()})
    })

    test('GET /api/penalizaciones (administrador) tambien las trae', async () => {
        sesion(ADMIN)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta(lista))
        const res = await request(app).get('/api/penalizaciones').set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones.map(p => [p.fechaRegistro, p.fechaPago])).toEqual([[REGISTRO.toISOString(), null], [REGISTRO.toISOString(), PAGO.toISOString()]])
    })

    test('el reporte JSON de penalizaciones trae fechaRegistro y fechaPago', async () => {
        sesion(ADMIN)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta(lista))
        const res = await request(app).get('/api/reportes/penalizaciones').set('Authorization', token(ADMIN))
        expect(res.status).toBe(200)
        expect(res.body.penalizaciones[1]).toMatchObject({fechaRegistro: REGISTRO.toISOString(), fechaPago: PAGO.toISOString()})
    })
})

describe('Nombres de campos mas claros en la API', () => {
    test('el prestamo responde motivoPrestamo, fechaDevolucionProgramada, fechaEntregaReal, entregadoPor y recibidoPor', async () => {
        sesion(ESTUDIANTE)
        jest.spyOn(Prestamo, 'findById').mockReturnValue(consulta({
            _id: ID, usuario: ESTUDIANTE._id, estado: 'devuelto', motivo: 'Feria de ciencias', recurso: {nombre: 'Proyector'},
            fechaDevolucion: new Date('2026-11-20T23:00:00.000Z'), fechaEntrega: new Date('2026-11-18T15:00:00.000Z'),
            entrega: {responsable: ADMIN._id, responsableNombre: 'Luis Paz'}, devolucion: {responsable: ADMIN._id, responsableNombre: 'Maria Lopez', condicion: 'bueno'}
        }))
        const res = await request(app).get(`/api/prestamos/${ID}`).set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(res.body.prestamo).toMatchObject({
            motivoPrestamo: 'Feria de ciencias',
            fechaDevolucionProgramada: '2026-11-20T23:00:00.000Z',
            fechaEntregaReal: '2026-11-18T15:00:00.000Z',
            entrega: {entregadoPor: 'Luis Paz', registradoPor: ADMIN._id},
            devolucion: {recibidoPor: 'Maria Lopez', registradoPor: ADMIN._id}
        })
        for (const viejo of ['motivo', 'fechaDevolucion', 'fechaEntrega']) expect(res.body.prestamo).not.toHaveProperty(viejo)
        expect(res.body.prestamo.devolucion).not.toHaveProperty('responsableNombre')
    })

    test('la penalizacion responde diasAtraso en lugar de dias', async () => {
        sesion(ADMIN)
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([{_id: 'pen1', tipo: 'atraso', monto: 5, dias: 2, estado: 'pendiente'}]))
        const res = await request(app).get('/api/penalizaciones').set('Authorization', token(ADMIN))
        expect(res.body.penalizaciones[0].diasAtraso).toBe(2)
        expect(res.body.penalizaciones[0]).not.toHaveProperty('dias')
    })

    test.each([
        ['post', '/api/prestamos', ESTUDIANTE, 'El campo motivo ahora se llama motivoPrestamo'],
        ['put', `/api/penalizaciones/${ID}/anular`, ADMIN, 'El campo motivo ahora se llama motivoAnulacion'],
        ['put', `/api/penalizaciones/${ID}/rechazar-comprobante`, ADMIN, 'El campo motivo ahora se llama motivoRechazoComprobante']
    ])('%s %s con el campo viejo "motivo" explica el nombre nuevo (400)', async (metodo, ruta, usuario, msg) => {
        sesion(usuario)
        const res = await request(app)[metodo](ruta).set('Authorization', token(usuario)).send({motivo: 'Un motivo cualquiera de prueba'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
    })
})
