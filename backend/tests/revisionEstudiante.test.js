import {jest} from '@jest/globals'
import request from 'supertest'
import app from '../src/server.js'
import Usuario from '../src/models/Usuario.js'
import Recurso from '../src/models/Recurso.js'
import Prestamo from '../src/models/Prestamo.js'
import Penalizacion from '../src/models/Penalizacion.js'
import Notificacion from '../src/models/Notificacion.js'
import {crearTokenJWT} from '../src/helpers/jwtHelper.js'
import {fechaEcuador, combinarFechaHora, formatearFechaHora} from '../src/helpers/politicasHelper.js'
import {enviarRecordatorios, ejecutarSiCorresponde, reiniciarRecordatorios} from '../src/helpers/recordatorioHelper.js'
import {consulta} from './ayudantes.js'

// Revision de la tesis, etapa B (estudiante): registro y login, hora de entrega y devolucion,
// recordatorios automaticos y consulta de solicitudes. Sin base de datos.

process.env.JWT_SECRET ??= 'secreto-de-prueba'

const DIA = 864e5
const HORA = 36e5
const ESTUDIANTE = {_id: '64b7f0f2a1b2c3d4e5f60f01', rol: 'estudiante', versionSesion: 0, nombres: 'Ana', apellidos: 'Mora'}
const ID_RECURSO = '64b7f0f2a1b2c3d4e5f60f03'
const token = (u) => `Bearer ${crearTokenJWT(u._id, u.rol)}`
const sesion = (u) => jest.spyOn(Usuario, 'findById').mockReturnValue({select: () => Promise.resolve(u)})
// dia "AAAA-MM-DD" de Ecuador dentro de `dias` dias
const diaEcuador = (dias) => fechaEcuador(new Date(Date.now() + dias * DIA))

beforeAll(() => {
    process.env.VALIDAR_HORARIO = 'false'
})
beforeEach(() => {
    jest.spyOn(Notificacion, 'create').mockResolvedValue({})
    jest.spyOn(Usuario, 'find').mockReturnValue({select: () => Promise.resolve([])})
    jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
    jest.restoreAllMocks()
    process.env.VALIDAR_HORARIO = 'false'
    for (const v of ['INSTITUTIONAL_EMAIL_DOMAIN', 'RESERVA_MAX_DIAS_ANTICIPACION', 'RECORDATORIO_HORAS_ANTES']) delete process.env[v]
})

describe('B1. Registro: solo correo institucional exacto y campos con su nombre', () => {
    const valido = {nombres: 'Juan Carlos', apellidos: 'Perez Lopez', cedula: '1712345675', correo: 'juan.perez@epn.edu.ec', telefono: '0991234567', facultad: 'Ingeniería en Sistemas', password: 'Clave1234'}
    const registrar = (cambios) => request(app).post('/api/registro').send({...valido, ...cambios})

    test.each(['juan@gmail.com', 'a@epn.edu.ec.com', 'a@xepn.edu.ec', 'a@b@epn.edu.ec', 'juan perez@epn.edu.ec', 'juan@epn .edu.ec', 'juan.epn.edu.ec'])('rechaza "%s"', async (correo) => {
        const res = await registrar({correo})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Usa tu correo institucional @epn.edu.ec')
    })

    test('acepta el dominio sin distinguir mayusculas', async () => {
        jest.spyOn(Usuario, 'exists').mockResolvedValue(null)
        jest.spyOn(Usuario.prototype, 'save').mockImplementation(async function () { return this })
        const res = await registrar({correo: 'Juan.Perez@EPN.EDU.EC'})
        expect(res.status).toBe(201)
        expect(res.body.usuario.correo).toBe('juan.perez@epn.edu.ec')
    })

    test('el dominio sale de INSTITUTIONAL_EMAIL_DOMAIN', async () => {
        process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'otra.edu.ec'
        const res = await registrar({})
        expect(res.body.msg).toBe('Usa tu correo institucional @otra.edu.ec')
    })

    test.each([
        ['password', undefined, 'El campo contrasena es obligatorio'],
        ['password', '   ', 'El campo contrasena es obligatorio'],
        ['correo', '', 'El campo correo es obligatorio'],
        ['nombres', '  ', 'El campo nombres es obligatorio'],
        ['facultad', undefined, 'El campo facultad es obligatorio'],
        ['telefono', 991234567, 'El campo telefono debe ser texto'],
        ['apellidos', ['Mora'], 'El campo apellidos debe ser texto'],
        ['nombres', 'a'.repeat(51), 'El campo nombres debe tener maximo 50 caracteres']
    ])('%s = %j -> "%s"', async (campo, valor, msg) => {
        const res = await registrar({[campo]: valor})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
    })
})

describe('B1. Login con mensajes distintos', () => {
    const login = (cuerpo) => request(app).post('/api/login').send(cuerpo)

    test('correo no registrado', async () => {
        jest.spyOn(Usuario, 'findOne').mockResolvedValue(null)
        const res = await login({correo: 'nadie@epn.edu.ec', password: 'Clave1234'})
        expect(res.status).toBe(401)
        expect(res.body.msg).toBe('Correo no registrado')
    })

    test('correo correcto y contrasena mala', async () => {
        jest.spyOn(Usuario, 'findOne').mockResolvedValue({matchPassword: async () => false})
        const res = await login({correo: 'ana@epn.edu.ec', password: 'Otra1234'})
        expect(res.status).toBe(401)
        expect(res.body.msg).toBe('Contrasena incorrecta')
    })

    test.each([
        [{correo: 'ana@epn.edu.ec'}, 'El campo contrasena es obligatorio'],
        [{correo: '  ', password: 'Clave1234'}, 'El campo correo es obligatorio'],
        [{correo: {$gt: ''}, password: 'Clave1234'}, 'El campo correo debe ser texto']
    ])('campos vacios o invalidos %j (400)', async (cuerpo, msg) => {
        const res = await login(cuerpo)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
    })

    test('el login no exige el dominio institucional (administrador)', async () => {
        jest.spyOn(Usuario, 'findOne').mockResolvedValue({_id: 'a1', rol: 'administrador', versionSesion: 0, nombres: 'Luis', apellidos: 'Paz', matchPassword: async () => true})
        const res = await login({correo: 'directiva@gmail.com', password: 'Clave1234'})
        expect(res.status).toBe(200)
        expect(res.body.usuario).not.toHaveProperty('facultad')
    })
})

describe('B3. Hora de entrega y de devolucion', () => {
    const base = () => ({recursoId: ID_RECURSO, motivoPrestamo: 'Exposicion', aceptaTerminos: true, docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec'}})
    const solicitar = (cuerpo) => request(app).post('/api/prestamos').set('Authorization', token(ESTUDIANTE)).send({...base(), ...cuerpo})
    const MANANA = diaEcuador(1)

    beforeEach(() => {
        sesion(ESTUDIANTE)
        jest.spyOn(Recurso, 'findById').mockResolvedValue({_id: ID_RECURSO, nombre: 'Proyector Epson', estado: 'disponible'})
        jest.spyOn(Prestamo, 'countDocuments').mockResolvedValue(0)
        jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Penalizacion, 'find').mockReturnValue(consulta([]))
        jest.spyOn(Prestamo, 'create').mockImplementation(async (datos) => ({_id: 'nuevo', estado: 'pendiente', ...datos}))
    })

    test('manana de 10:00 a 16:30: guarda la entrega programada y la devolucion en hora de Ecuador', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar({fechaEntrega: MANANA, horaEntrega: '10:00', fechaDevolucion: MANANA, horaDevolucion: '16:30'})
        expect(res.status).toBe(201)
        const datos = Prestamo.create.mock.calls[0][0]
        expect(datos.fechaEntregaProgramada.toISOString()).toBe(combinarFechaHora(MANANA, '10:00').toISOString())
        expect(datos.fechaDevolucion.toISOString()).toBe(combinarFechaHora(MANANA, '16:30').toISOString())
        expect(res.body.prestamo.fechaEntregaProgramada).toBe(combinarFechaHora(MANANA, '10:00').toISOString())
    })

    test.each([['05:00'], ['07:00']])('entrega 07:00 y devolucion %s el mismo dia -> 400', async (horaDevolucion) => {
        const res = await solicitar({fechaEntrega: MANANA, horaEntrega: '07:00', fechaDevolucion: MANANA, horaDevolucion})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La hora de devolucion debe ser posterior a la hora de entrega')
    })

    test('la devolucion por defecto es a las 18:00 y la entrega de otro dia, a la apertura', async () => {
        const res = await solicitar({fechaEntrega: MANANA, fechaDevolucion: diaEcuador(3)})
        expect(res.status).toBe(201)
        const datos = Prestamo.create.mock.calls[0][0]
        expect(datos.fechaEntregaProgramada.toISOString()).toBe(combinarFechaHora(MANANA, '07:00').toISOString())
        expect(datos.fechaDevolucion.toISOString()).toBe(combinarFechaHora(diaEcuador(3), '18:00').toISOString())
    })

    test('pedir hoy para hoy: sin fecha ni hora de entrega se programa para ahora', async () => {
        const antes = Date.now()
        const res = await solicitar({fechaDevolucion: new Date(Date.now() + 2 * HORA).toISOString()})
        expect(res.status).toBe(201)
        const programada = Prestamo.create.mock.calls[0][0].fechaEntregaProgramada.getTime()
        expect(programada).toBeGreaterThanOrEqual(antes)
        expect(programada).toBeLessThanOrEqual(Date.now())
    })

    test.each([
        ['horaDevolucion junto a fechaDevolucion con hora', {fechaDevolucion: `${diaEcuador(3)}T10:00:00-05:00`, horaDevolucion: '11:00'}, 'Envia la hora de devolucion en un solo campo'],
        ['entrega en el pasado', {fechaEntrega: diaEcuador(-1), horaEntrega: '10:00', fechaDevolucion: diaEcuador(2)}, 'La fecha y hora de entrega no pueden ser anteriores a ahora'],
        ['fecha de entrega imposible', {fechaEntrega: '2026-02-31', fechaDevolucion: diaEcuador(2)}, 'La fecha de entrega debe tener el formato AAAA-MM-DD y ser una fecha real'],
        ['hora de entrega mal escrita', {fechaEntrega: MANANA, horaEntrega: '25:00', fechaDevolucion: diaEcuador(2)}, 'La hora de entrega debe tener el formato HH:mm (por ejemplo 10:00)'],
        ['hora de devolucion como objeto', {fechaDevolucion: diaEcuador(2), horaDevolucion: {$gt: ''}}, 'La hora de devolucion debe tener el formato HH:mm (por ejemplo 16:30)'],
        ['entrega con mas de 30 dias de anticipacion', {fechaEntrega: diaEcuador(32), fechaDevolucion: diaEcuador(33)}, 'La entrega no se puede programar con mas de 30 dias de anticipacion'],
        ['mas de 30 dias entre entrega y devolucion', {fechaEntrega: diaEcuador(5), fechaDevolucion: diaEcuador(36)}, 'El prestamo no puede superar los 30 dias']
    ])('rechaza %s (400)', async (_, cuerpo, msg) => {
        const res = await solicitar(cuerpo)
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe(msg)
        expect(Prestamo.create).not.toHaveBeenCalled()
    })

    test('30 dias contados desde la entrega (no desde hoy) se aceptan', async () => {
        const res = await solicitar({fechaEntrega: diaEcuador(10), fechaDevolucion: diaEcuador(40)})
        expect(res.status).toBe(201)
    })

    test('el horario se valida sobre la hora programada de entrega', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar({fechaEntrega: MANANA, horaEntrega: '06:30', fechaDevolucion: diaEcuador(2)})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La hora de entrega debe estar entre las 07:00 y las 18:00 (hora de Ecuador)')
    })

    test('y sobre la hora programada de devolucion', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar({fechaEntrega: MANANA, horaEntrega: '10:00', fechaDevolucion: diaEcuador(2), horaDevolucion: '19:00'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La hora de devolucion debe estar entre las 07:00 y las 18:00 (hora de Ecuador)')
    })

    test('la hora de envio no importa: un cliente sin fecha de entrega recibe la proxima apertura dentro del horario', async () => {
        process.env.VALIDAR_HORARIO = 'true'
        const res = await solicitar({fechaDevolucion: diaEcuador(3)})
        expect(res.status).toBe(201)
        const programada = Prestamo.create.mock.calls[0][0].fechaEntregaProgramada
        const minutos = Number(formatearFechaHora(programada).slice(11, 13)) * 60 + Number(formatearFechaHora(programada).slice(14, 16))
        expect(minutos).toBeGreaterThanOrEqual(7 * 60)
        expect(minutos).toBeLessThanOrEqual(18 * 60)
    })
})

describe('B4. Recordatorios automaticos de devolucion', () => {
    const AHORA = new Date('2026-11-20T15:00:00.000Z')
    let prestamos
    let actualizar

    beforeEach(() => {
        reiniciarRecordatorios()
        jest.spyOn(Prestamo, 'find').mockImplementation((filtro) => consulta(() => prestamos.filter(p =>
            p.estado === filtro.estado && p.fechaDevolucion > filtro.fechaDevolucion.$gt && p.fechaDevolucion <= filtro.fechaDevolucion.$lte)))
        // actualizacion condicional: solo modifica si la hora aun no estaba marcada
        actualizar = jest.spyOn(Prestamo, 'updateOne').mockImplementation(async (filtro, cambio) => {
            const p = prestamos.find(x => x._id === filtro._id)
            if(!p || p.estado !== filtro.estado || (p.recordatoriosEnviados ?? []).includes(filtro.recordatoriosEnviados.$ne)) return {modifiedCount: 0}
            p.recordatoriosEnviados = [...new Set([...(p.recordatoriosEnviados ?? []), ...cambio.$addToSet.recordatoriosEnviados.$each])]
            return {modifiedCount: 1}
        })
    })
    const nuevo = (id, horas, cambios = {}) => ({_id: id, usuario: ESTUDIANTE._id, estado: 'entregado', recurso: {nombre: 'Proyector Epson'},
        fechaDevolucion: new Date(AHORA.getTime() + horas * HORA), ...cambios})

    test('envia el recordatorio dentro de la ventana con el recurso y la fecha y hora', async () => {
        prestamos = [nuevo('p1', 20)]
        expect(await enviarRecordatorios(AHORA)).toBe(1)
        expect(Notificacion.create).toHaveBeenCalledWith({usuario: ESTUDIANTE._id, prestamo: 'p1', tipo: 'recordatorio',
            mensaje: 'Recuerda devolver Proyector Epson el 21/11/2026 a las 06:00'})
        expect(actualizar).toHaveBeenCalledWith({_id: 'p1', estado: 'entregado', recordatoriosEnviados: {$ne: 24}}, {$addToSet: {recordatoriosEnviados: {$each: [24]}}})
    })

    test('no envia fuera de la ventana', async () => {
        prestamos = [nuevo('p1', 30), nuevo('p2', -2)]
        expect(await enviarRecordatorios(AHORA)).toBe(0)
        expect(Notificacion.create).not.toHaveBeenCalled()
    })

    test('no lo duplica en una segunda ejecucion, pero si envia el de 1 hora despues', async () => {
        prestamos = [nuevo('p1', 20)]
        await enviarRecordatorios(AHORA)
        expect(await enviarRecordatorios(new Date(AHORA.getTime() + HORA))).toBe(0)
        expect(await enviarRecordatorios(new Date(AHORA.getTime() + 19.5 * HORA))).toBe(1)
        expect(await enviarRecordatorios(new Date(AHORA.getTime() + 19.7 * HORA))).toBe(0)
        expect(Notificacion.create).toHaveBeenCalledTimes(2)
        expect(prestamos[0].recordatoriosEnviados).toEqual([24, 1])
    })

    test('a menos de 1 hora envia un solo aviso y marca 24 y 1', async () => {
        prestamos = [nuevo('p1', 0.5)]
        expect(await enviarRecordatorios(AHORA)).toBe(1)
        expect(prestamos[0].recordatoriosEnviados).toEqual([24, 1])
    })

    test('ignora prestamos que no estan entregados', async () => {
        prestamos = [nuevo('p1', 5, {estado: 'aprobado'}), nuevo('p2', 5, {estado: 'devuelto'})]
        expect(await enviarRecordatorios(AHORA)).toBe(0)
    })

    test('las horas salen de RECORDATORIO_HORAS_ANTES', async () => {
        process.env.RECORDATORIO_HORAS_ANTES = '48'
        prestamos = [nuevo('p1', 40)]
        expect(await enviarRecordatorios(AHORA)).toBe(1)
    })

    test('ejecutarSiCorresponde corre como mucho una vez por intervalo y nunca lanza', async () => {
        prestamos = []
        Prestamo.find.mockImplementation(() => { throw new Error('base caida') })
        await expect(ejecutarSiCorresponde(AHORA)).resolves.toBe(0)
        expect(Prestamo.find).toHaveBeenCalledTimes(1)
        await ejecutarSiCorresponde(new Date(AHORA.getTime() + 5 * 60 * 1000))
        expect(Prestamo.find).toHaveBeenCalledTimes(1)
        await ejecutarSiCorresponde(new Date(AHORA.getTime() + 16 * 60 * 1000))
        expect(Prestamo.find).toHaveBeenCalledTimes(2)
    })

    test('el tipo recordatorio existe en el modelo de notificaciones', async () => {
        const {TIPOS_NOTIFICACION} = await import('../src/models/Notificacion.js')
        expect(TIPOS_NOTIFICACION).toContain('recordatorio')
    })
})

describe('B5. Mis solicitudes', () => {
    test('el estudiante ve fechaEntregaProgramada, el nombre del recurso y el estado, sin publicId ni datos de otros', async () => {
        sesion(ESTUDIANTE)
        const programada = new Date('2026-11-21T15:00:00.000Z')
        const buscar = jest.spyOn(Prestamo, 'find').mockReturnValue(consulta([{
            _id: 'p1', usuario: ESTUDIANTE._id, estado: 'entregado', fechaEntregaProgramada: programada, codigoQR: 'c'.repeat(32),
            recurso: {_id: ID_RECURSO, nombre: 'Proyector Epson'}, entrega: {responsableNombre: 'Luis Paz', evidencia: {url: 'https://img/1.png', publicId: 'secreto'}}
        }]))
        const res = await request(app).get('/api/prestamos/mis').set('Authorization', token(ESTUDIANTE))
        expect(res.status).toBe(200)
        expect(buscar).toHaveBeenCalledWith({usuario: ESTUDIANTE._id})
        expect(res.body.prestamos[0]).toMatchObject({estado: 'entregado', fechaEntregaProgramada: programada.toISOString(), recurso: {nombre: 'Proyector Epson'}})
        expect(JSON.stringify(res.body)).not.toMatch(/publicId|secreto|cccc|docenteReferencia":\{/)
    })
})
