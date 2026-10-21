import request from 'supertest'
import app from '../src/server.js'

// pruebas que no requieren base de datos: rutas base, validaciones y protecciones de acceso

const registroValido = {
    nombres: 'Juan Carlos',
    apellidos: 'Pérez López',
    cedula: '1712345675',
    correo: 'juan.perez@epn.edu.ec',
    telefono: '0991234567',
    facultad: 'Ingeniería en Sistemas',
    password: 'Clave1234'
}

describe('Servidor', () => {
    test('GET / responde que la API esta activa', async () => {
        const res = await request(app).get('/')
        expect(res.status).toBe(200)
        expect(res.body.mensaje).toMatch(/activa/)
    })

    test('una ruta inexistente responde 404 en JSON', async () => {
        const res = await request(app).get('/api/no-existe')
        expect(res.status).toBe(404)
        expect(res.body.msg).toBe('Ruta no encontrada')
    })

    test('un JSON malformado responde 400', async () => {
        const res = await request(app).post('/api/login').set('Content-Type', 'application/json').send('{"correo":')
        expect(res.status).toBe(400)
    })

    test('permite peticiones de otros origenes (CORS)', async () => {
        const res = await request(app).get('/').set('Origin', 'http://localhost:5173')
        expect(res.headers['access-control-allow-origin']).toBeDefined()
    })
})

describe('Validacion del registro', () => {
    const registrar = (cambios) => request(app).post('/api/registro').send({...registroValido, ...cambios})

    test('exige todos los campos', async () => {
        const res = await registrar({cedula: undefined})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('Todos los campos son obligatorios')
    })

    test('rechaza una cedula con digito verificador incorrecto', async () => {
        const res = await registrar({cedula: '1712345670'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toBe('La cedula no es valida')
    })

    test('rechaza un correo que no es institucional', async () => {
        const res = await registrar({correo: 'juan@gmail.com'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/correo institucional/)
    })

    test('rechaza un telefono con formato incorrecto', async () => {
        const res = await registrar({telefono: '0221234567'})
        expect(res.status).toBe(400)
    })

    test('rechaza una facultad fuera de la lista', async () => {
        const res = await registrar({facultad: 'Medicina'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/facultad/)
    })

    test('rechaza una contraseña sin mayusculas ni numeros', async () => {
        const res = await registrar({password: 'clavesegura'})
        expect(res.status).toBe(400)
        expect(res.body.msg).toMatch(/mayusculas/)
    })
})

describe('Rutas protegidas', () => {
    test('el perfil exige token', async () => {
        const res = await request(app).get('/api/perfil')
        expect(res.status).toBe(401)
    })

    test('el perfil rechaza un token sin el esquema Bearer', async () => {
        const res = await request(app).get('/api/perfil').set('Authorization', 'abc.def.ghi')
        expect(res.status).toBe(401)
    })

    test('el perfil rechaza un token invalido', async () => {
        const res = await request(app).get('/api/perfil').set('Authorization', 'Bearer token-falso')
        expect(res.status).toBe(401)
        expect(res.body.msg).toBe('Token invalido o expirado')
    })

    test('crear un recurso exige ser administrador', async () => {
        const res = await request(app).post('/api/recursos').send({nombre: 'Laptop', categoria: 'tecnico'})
        expect(res.status).toBe(401)
    })

    test('el detalle publico de un recurso valida el id', async () => {
        const res = await request(app).get('/api/recursos/abc')
        expect(res.status).toBe(400)
    })
})
