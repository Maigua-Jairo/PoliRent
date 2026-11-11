// Especificacion OpenAPI 3 de la API de PoliRent. Se publica con Swagger UI en /api-docs (ver server.js)
import {FACULTADES} from '../models/Usuario.js'
import {CATEGORIAS, ESTADOS} from '../models/Recurso.js'
import {ESTADOS_PRESTAMO, CONDICIONES} from '../models/Prestamo.js'
import {TIPOS_NOTIFICACION} from '../models/Notificacion.js'
import {TIPOS_PENALIZACION, ESTADOS_PENALIZACION} from '../models/Penalizacion.js'

const ID_EJEMPLO = '64b7f0f2a1b2c3d4e5f60718'
const ID_SCHEMA = {type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: ID_EJEMPLO}

const ref = (nombre) => ({$ref: `#/components/schemas/${nombre}`})
const json = (schema, example) => ({'application/json': {schema, ...(example && {example})}})
const ok = (description, schema, example) => ({description, content: json(schema, example)})
const error = (description, msg) => ({description, content: json(ref('Error'), {msg})})
const conToken = [{bearerAuth: []}]

const idRuta = (descripcion) => ({name: 'id', in: 'path', required: true, description: descripcion, schema: ID_SCHEMA})
const query = (name, description, schema, example) => ({name, in: 'query', required: false, description, schema, ...(example !== undefined && {example})})

// respuestas de seguridad que se repiten
const r401 = error('Sin token, token invalido o sesion cerrada', 'Acceso denegado: token no proporcionado')
const r403 = error('El rol del usuario no tiene permiso para esta accion', 'Acceso denegado: no tienes permisos para esta accion')

const formato = query('formato', 'json (por defecto) o csv', {type: 'string', enum: ['json', 'csv'], default: 'json'})
const MSG_HORARIO = 'La entrega y la devolucion solo se registran entre las 07:00 y las 18:00 (hora de Ecuador)'
const r503Cloudinary = error('Se envio una evidencia y Cloudinary no esta configurado', 'La subida de imagenes no esta disponible: falta configurar Cloudinary')

// campos de la entrega / devolucion (JSON o multipart/form-data con la foto en "evidencia")
const camposMovimiento = (conCondicion, conCodigo = false) => {
    const propiedades = {
        ...(conCodigo ? {codigo: {type: 'string', pattern: '^[0-9a-fA-F]{32}$', description: 'Texto de 32 caracteres leido del QR', example: '9f86d081884c7d659a2feaa0c55ad015'}} : {}),
        responsable: {type: 'string', minLength: 3, maxLength: 100, description: 'Quien entrega o recibe fisicamente el recurso. Por defecto, nombres y apellidos del administrador autenticado', example: 'Maria Lopez'},
        observaciones: {type: 'string', maxLength: 300, example: 'Se entrega con cable HDMI y control remoto'},
        ...(conCondicion ? {condicion: {type: 'string', enum: CONDICIONES, default: 'bueno', description: 'Solo en la devolucion. `danado` e `incompleto` exigen la foto de evidencia'}} : {})
    }
    const requeridos = conCodigo ? ['codigo'] : []
    return {required: conCodigo, content: {
        'application/json': {schema: {type: 'object', required: requeridos, properties: propiedades}},
        'multipart/form-data': {schema: {type: 'object', required: requeridos, properties: {
            ...propiedades,
            evidencia: {type: 'string', format: 'binary', description: 'Foto de evidencia (JPG, PNG o WEBP, maximo 2 MB)'}
        }}}
    }}
}

// respuesta de la entrega (como siempre) o de la devolucion (con penalizaciones)
const respuestaMovimiento = {type: 'object', properties: {
    msg: {type: 'string'}, accion: {type: 'string', enum: ['entrega', 'devolucion']}, prestamo: ref('Prestamo'),
    recurso: {type: 'object', properties: {_id: ID_SCHEMA, nombre: {type: 'string'}, estado: {type: 'string', enum: ESTADOS}}},
    penalizaciones: {type: 'array', items: ref('Penalizacion'), description: 'Solo en la devolucion'},
    totalPenalizado: {type: 'number', description: 'Solo en la devolucion', example: 10},
    advertencias: {type: 'array', items: {type: 'string'}, description: 'Solo en la devolucion', example: ['El recurso no tiene precio registrado: no se generaron penalizaciones']}
}}

const reglasMovimiento = [
    '- Solo entre las **07:00 y las 18:00 (hora de Ecuador)** (`HORARIO_INICIO`, `HORARIO_FIN`; `VALIDAR_HORARIO=false` lo desactiva). Declarar una perdida (`condicion: perdido`) no valida el horario.',
    '- Se guarda quien entrega o recibe (`responsable`, por defecto el administrador), `observaciones` y la foto opcional `evidencia` (obligatoria al devolver `danado` o `incompleto`).',
    '- **Entrega**: `aprobado` pasa a `entregado` y el recurso a `prestado`.',
    '- **Devolucion**: `entregado` pasa a `devuelto` y el codigo QR se elimina. El recurso vuelve a `disponible` si la condicion es `bueno` y queda en `mantenimiento` en cualquier otro caso.',
    '  Se crean las penalizaciones segun el precio del recurso (valores por defecto, ver GET /api/terminos): atraso 5 % por dia o fraccion, dano/incompleto 20 %, perdida 100 % (sin sumar atraso), con un tope del 100 % del precio por prestamo. Se notifica al estudiante.'
].join('\n')

const filtrosFechas = [
    query('desde', 'Fecha inicial (AAAA-MM-DD), se compara con la fecha de la solicitud', {type: 'string', format: 'date'}, '2026-10-01'),
    query('hasta', 'Fecha final (AAAA-MM-DD), incluye todo ese dia', {type: 'string', format: 'date'}, '2026-10-31')
]

export default {
    openapi: '3.0.3',
    info: {
        title: 'API de PoliRent',
        version: '1.0.0',
        description: [
            'Backend de **PoliRent**: gestion y recomendacion inteligente de recursos para las asociaciones de estudiantes de la EPN.',
            '',
            '**Como probar desde esta pagina**',
            '1. Ejecuta `POST /api/login` y copia el valor de `token` de la respuesta.',
            '2. Pulsa el boton **Authorize**, pega el token (sin la palabra Bearer) y confirma.',
            '3. Ya puedes probar las rutas con candado. Las rutas de administrador requieren un usuario con rol `administrador`.',
            '',
            '**Convenciones:** los errores responden `{ "msg": "..." }`. Un `401` significa que la sesion no es valida; los errores de datos usan `400`.'
        ].join('\n')
    },
    servers: [{url: '/', description: 'Servidor actual'}],
    tags: [
        {name: 'Sistema', description: 'Estado del servicio'},
        {name: 'Cuenta (HU-001)', description: 'Registro, inicio de sesion, perfil y recuperacion de clave'},
        {name: 'Recursos (HU-002, HU-005, HU-006)', description: 'Catalogo publico y gestion de recursos por el administrador'},
        {name: 'Recomendaciones con IA (HU-009)', description: 'Recomendacion de recursos por contexto del proyecto y por historial de prestamos'},
        {name: 'Asistente (chat)', description: 'Chat publico: dudas sobre PoliRent y recomendacion de recursos para proyectos o actividades'},
        {name: 'Prestamos - Estudiante (HU-007, HU-008)', description: 'Solicitar, cancelar, ver el QR y consultar el historial'},
        {name: 'Prestamos - Administrador (HU-003)', description: 'Revisar, aprobar, rechazar y escanear el QR de entrega y devolucion'},
        {name: 'Metricas y reportes (HU-004)', description: 'Consultas de solo lectura para el administrador'},
        {name: 'Notificaciones (HU-010)', description: 'Avisos sobre el estado de los prestamos'},
        {name: 'Penalizaciones', description: 'Terminos y condiciones, penalizaciones por atraso, dano o perdida, pago y anulacion'},
        {name: 'Usuarios', description: 'Consulta y eliminacion de usuarios'}
    ],
    components: {
        securitySchemes: {
            bearerAuth: {type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token devuelto por POST /api/login'}
        },
        schemas: {
            Error: {type: 'object', properties: {msg: {type: 'string'}}, required: ['msg']},
            Usuario: {
                type: 'object',
                properties: {
                    id: ID_SCHEMA,
                    nombres: {type: 'string', example: 'Ana'},
                    apellidos: {type: 'string', example: 'Lopez'},
                    cedula: {type: 'string', example: '1712345678'},
                    correo: {type: 'string', example: 'ana.lopez@epn.edu.ec'},
                    telefono: {type: 'string', example: '0991234567'},
                    facultad: {type: 'string', enum: FACULTADES},
                    rol: {type: 'string', enum: ['estudiante', 'administrador']}
                }
            },
            Recurso: {
                type: 'object',
                properties: {
                    _id: ID_SCHEMA,
                    nombre: {type: 'string', example: 'Sensores ultrasonicos'},
                    descripcion: {type: 'string', example: 'Paquete de 4 sensores HC-SR04'},
                    categoria: {type: 'string', enum: CATEGORIAS},
                    etiquetas: {type: 'array', items: {type: 'string'}, example: ['sensores', 'distancia', 'robotica']},
                    estado: {type: 'string', enum: ESTADOS},
                    imagen: {type: 'string', example: 'https://res.cloudinary.com/.../recurso.jpg'},
                    precio: {type: 'number', minimum: 0, maximum: 100000, default: 0, description: 'Precio de reposicion en dolares: base de las penalizaciones', example: 45},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'}
                }
            },
            DocenteReferencia: {
                type: 'object',
                description: 'Docente al que la asociacion contacta si el estudiante no devuelve el recurso (no se le envia correo)',
                required: ['nombre', 'correo'],
                properties: {
                    nombre: {type: 'string', minLength: 3, maxLength: 100, example: 'Carlos Ruiz'},
                    correo: {type: 'string', format: 'email', example: 'carlos.ruiz@epn.edu.ec'},
                    telefono: {type: 'string', pattern: '^[0-9+\\- ]{7,15}$', description: 'Opcional', example: '0991234567'}
                }
            },
            Movimiento: {
                type: 'object',
                nullable: true,
                description: 'Entrega o devolucion registrada (null si aun no ocurre)',
                properties: {
                    responsable: {...ID_SCHEMA, description: 'Id del administrador que la registro'},
                    responsableNombre: {type: 'string', example: 'Maria Lopez'},
                    observaciones: {type: 'string'},
                    condicion: {type: 'string', enum: CONDICIONES, description: 'Solo en la devolucion'},
                    evidencia: {type: 'object', nullable: true, properties: {url: {type: 'string', example: 'https://res.cloudinary.com/.../evidencia.jpg'}}}
                }
            },
            Penalizacion: {
                type: 'object',
                properties: {
                    _id: ID_SCHEMA,
                    tipo: {type: 'string', enum: TIPOS_PENALIZACION},
                    monto: {type: 'number', description: 'En dolares, con 2 decimales', example: 9},
                    dias: {type: 'integer', description: 'Solo en el atraso: dias o fraccion de dia', example: 2},
                    descripcion: {type: 'string', example: 'Atraso de 2 dia(s) en la devolucion'},
                    estado: {type: 'string', enum: ESTADOS_PENALIZACION},
                    fechaPago: {type: 'string', format: 'date-time', nullable: true},
                    motivoAnulacion: {type: 'string', example: 'El estudiante repuso el articulo'},
                    usuario: {description: 'Id del estudiante, o sus datos cuando lo consulta el administrador', oneOf: [ID_SCHEMA, ref('Usuario')]},
                    recurso: {description: 'Id o datos basicos del recurso', oneOf: [ID_SCHEMA, ref('Recurso')]},
                    prestamo: {description: 'Id o datos basicos del prestamo', oneOf: [ID_SCHEMA, {type: 'object'}]},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'}
                }
            },
            Terminos: {
                type: 'object',
                properties: {
                    version: {type: 'string', example: '1.0'},
                    tarifas: {type: 'object', description: 'Porcentajes del precio del recurso', properties: {
                        atrasoPorDia: {type: 'number', example: 5}, danio: {type: 'number', example: 20}, perdida: {type: 'number', example: 100}, tope: {type: 'number', example: 100}
                    }},
                    horario: {type: 'object', properties: {inicio: {type: 'string', example: '07:00'}, fin: {type: 'string', example: '18:00'}, zona: {type: 'string', example: 'America/Guayaquil'}}},
                    condiciones: {type: 'array', items: {type: 'string'}, example: ['Si el recurso se devuelve danado o incompleto, pagaras el 20 % de su precio.']}
                }
            },
            Prestamo: {
                type: 'object',
                description: 'El codigo del QR nunca se incluye aqui; solo viaja dentro de la imagen QR.',
                properties: {
                    _id: ID_SCHEMA,
                    estado: {type: 'string', enum: ESTADOS_PRESTAMO},
                    motivo: {type: 'string', example: 'Proyecto de robotica'},
                    fechaDevolucion: {type: 'string', format: 'date-time', description: 'Fecha en que el estudiante se compromete a devolver'},
                    fechaEntrega: {type: 'string', format: 'date-time'},
                    fechaDevolucionReal: {type: 'string', format: 'date-time'},
                    motivoRechazo: {type: 'string'},
                    terminos: {type: 'object', nullable: true, description: 'Terminos aceptados al solicitar', properties: {version: {type: 'string', example: '1.0'}, aceptadoEn: {type: 'string', format: 'date-time'}}},
                    docenteReferencia: {...ref('DocenteReferencia'), nullable: true},
                    entrega: ref('Movimiento'),
                    devolucion: ref('Movimiento'),
                    usuario: {description: 'Id del estudiante, o sus datos cuando lo consulta el administrador', oneOf: [ID_SCHEMA, ref('Usuario')]},
                    recurso: {description: 'Id del recurso, o sus datos basicos cuando se consulta una lista', oneOf: [ID_SCHEMA, ref('Recurso')]},
                    createdAt: {type: 'string', format: 'date-time'},
                    updatedAt: {type: 'string', format: 'date-time'}
                }
            },
            Notificacion: {
                type: 'object',
                properties: {
                    _id: ID_SCHEMA,
                    tipo: {type: 'string', enum: TIPOS_NOTIFICACION},
                    mensaje: {type: 'string', example: 'Tu solicitud de "Kit Arduino" fue aprobada. Coordina el retiro del recurso con la asociacion estudiantil.'},
                    leida: {type: 'boolean'},
                    prestamo: ID_SCHEMA,
                    createdAt: {type: 'string', format: 'date-time'}
                }
            },
            ResumenPorEstado: {
                type: 'object',
                description: 'Cantidad de prestamos por cada estado',
                properties: Object.fromEntries(ESTADOS_PRESTAMO.map(e => [e, {type: 'integer'}]))
            },
            Recomendacion: {
                type: 'object',
                properties: {
                    recurso: ref('Recurso'),
                    relevancia: {type: 'integer', minimum: 1, maximum: 100, description: 'Relativa al mejor resultado (el mas parecido vale 100)', example: 100},
                    terminosCoincidentes: {type: 'array', items: {type: 'string'}, example: ['sensor', 'distancia']},
                    terminosRelacionados: {type: 'array', items: {type: 'string'}},
                    porHistorial: {type: 'boolean', description: 'true si influyo el historial de prestamos de otros estudiantes'},
                    razon: {type: 'string', example: 'Coincide con tu proyecto en: sensor, distancia'}
                }
            }
        }
    },
    paths: {
        '/': {
            get: {
                tags: ['Sistema'], summary: 'Estado de la API', operationId: 'estadoApi',
                responses: {200: ok('La API esta activa', {type: 'object', properties: {mensaje: {type: 'string'}}}, {mensaje: 'API de Poli Rent activa :3.'})}
            }
        },

        // ---------------- Cuenta (HU-001) ----------------
        '/api/registro': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Registrar un estudiante', operationId: 'registro',
                description: 'Siempre crea un usuario con rol `estudiante`. El rol `administrador` se asigna directamente en la base de datos.\n\nReglas: cedula ecuatoriana valida de 10 digitos, correo institucional `@epn.edu.ec`, telefono `09XXXXXXXX`, contraseña de minimo 8 caracteres con mayusculas, minusculas y numeros.',
                requestBody: {required: true, content: json({
                    type: 'object',
                    required: ['nombres', 'apellidos', 'cedula', 'correo', 'telefono', 'facultad', 'password'],
                    properties: {
                        nombres: {type: 'string', example: 'Ana'},
                        apellidos: {type: 'string', example: 'Lopez'},
                        cedula: {type: 'string', example: '1712345678'},
                        correo: {type: 'string', example: 'ana.lopez@epn.edu.ec'},
                        telefono: {type: 'string', example: '0991234567'},
                        facultad: {type: 'string', enum: FACULTADES},
                        password: {type: 'string', format: 'password', example: 'Clave1234'}
                    }
                })},
                responses: {
                    201: ok('Usuario registrado', {type: 'object', properties: {msg: {type: 'string'}, usuario: ref('Usuario')}}),
                    400: error('Datos invalidos o correo/cedula ya registrados', 'El correo ya esta registrado')
                }
            }
        },
        '/api/login': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Iniciar sesion', operationId: 'login',
                requestBody: {required: true, content: json({
                    type: 'object', required: ['correo', 'password'],
                    properties: {correo: {type: 'string', example: 'ana.lopez@epn.edu.ec'}, password: {type: 'string', format: 'password', example: 'Clave1234'}}
                })},
                responses: {
                    200: ok('Sesion iniciada', {type: 'object', properties: {msg: {type: 'string'}, token: {type: 'string', description: 'JWT para usar como Bearer'}, usuario: ref('Usuario')}}),
                    400: error('Faltan datos o el formato es invalido', 'Todos los campos son obligatorios'),
                    401: error('Correo o contraseña incorrectos', 'Usuario o Contraseña incorrecta')
                }
            }
        },
        '/api/logout': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Cerrar sesion', operationId: 'logout', security: conToken,
                description: 'Invalida todos los tokens emitidos hasta ahora para este usuario.',
                responses: {200: ok('Sesion cerrada', {type: 'object', properties: {msg: {type: 'string'}}}), 401: r401}
            }
        },
        '/api/perfil': {
            get: {
                tags: ['Cuenta (HU-001)'], summary: 'Ver mi perfil', operationId: 'verPerfil', security: conToken,
                responses: {200: ok('Datos del usuario autenticado', {type: 'object', properties: {usuario: ref('Usuario')}}), 401: r401}
            },
            put: {
                tags: ['Cuenta (HU-001)'], summary: 'Actualizar mi perfil', operationId: 'actualizarPerfil', security: conToken,
                description: 'Envia solo los campos que cambian. La cedula y el correo no se modifican. Para cambiar la contraseña hay que enviar tambien `passwordActual`; en ese caso se devuelve un token nuevo y las demas sesiones se cierran.',
                requestBody: {required: true, content: json({
                    type: 'object',
                    properties: {
                        nombres: {type: 'string'}, apellidos: {type: 'string'},
                        telefono: {type: 'string', example: '0987654321'},
                        facultad: {type: 'string', enum: FACULTADES},
                        password: {type: 'string', format: 'password', description: 'Nueva contraseña'},
                        passwordActual: {type: 'string', format: 'password', description: 'Obligatoria si se envia password'}
                    }
                })},
                responses: {
                    200: ok('Perfil actualizado', {type: 'object', properties: {msg: {type: 'string'}, token: {type: 'string', description: 'Solo si se cambio la contraseña'}, usuario: ref('Usuario')}}),
                    400: error('Datos invalidos o contraseña actual incorrecta', 'La contraseña actual es incorrecta'),
                    401: r401
                }
            },
            delete: {
                tags: ['Usuarios'], summary: 'Eliminar mi propia cuenta (estudiante)', operationId: 'eliminarMiCuenta', security: conToken,
                description: 'El estudiante confirma con su contraseña. Se eliminan tambien sus prestamos y notificaciones. No se permite si tiene recursos entregados sin devolver.',
                requestBody: {required: true, content: json({type: 'object', required: ['password'], properties: {password: {type: 'string', format: 'password', example: 'Clave1234'}}})},
                responses: {
                    200: ok('Cuenta eliminada', {type: 'object', properties: {msg: {type: 'string'}}}, {msg: 'Cuenta eliminada correctamente'}),
                    400: error('Contraseña incorrecta o recursos sin devolver', 'Tienes recursos entregados sin devolver: devuelvelos antes de eliminar tu cuenta'),
                    401: r401, 403: r403
                }
            }
        },
        '/api/recuperar-clave': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Solicitar enlace de recuperacion de clave', operationId: 'recuperarClave',
                description: 'Responde siempre lo mismo exista o no el correo, para no revelar que cuentas estan registradas. El enlace dura 15 minutos. En desarrollo la respuesta incluye el `token` para probar sin correo.',
                requestBody: {required: true, content: json({type: 'object', required: ['correo'], properties: {correo: {type: 'string', example: 'ana.lopez@epn.edu.ec'}}})},
                responses: {
                    200: ok('Solicitud procesada', {type: 'object', properties: {msg: {type: 'string'}, token: {type: 'string', description: 'Solo en NODE_ENV=development'}}}),
                    400: error('Correo invalido', 'Debes enviar un correo valido'),
                    502: error('No se pudo enviar el correo', 'No se pudo enviar el correo de recuperacion, intenta mas tarde'),
                    503: error('Servicio de correo no configurado', 'El servicio de correo no esta disponible, intenta mas tarde')
                }
            }
        },
        '/api/recuperar-clave/{token}': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Establecer la nueva clave', operationId: 'restablecerClave',
                parameters: [{name: 'token', in: 'path', required: true, description: 'Token recibido en el enlace del correo', schema: {type: 'string'}}],
                requestBody: {required: true, content: json({
                    type: 'object', required: ['password', 'confirmarPassword'],
                    properties: {password: {type: 'string', format: 'password', example: 'NuevaClave123'}, confirmarPassword: {type: 'string', format: 'password', example: 'NuevaClave123'}}
                })},
                responses: {
                    200: ok('Contraseña restablecida', {type: 'object', properties: {msg: {type: 'string'}}}),
                    400: error('Token invalido o expirado, o contraseñas que no coinciden', 'Token de recuperacion invalido o expirado')
                }
            }
        },

        // ---------------- Recursos ----------------
        '/api/recursos': {
            get: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Listar recursos (publico)', operationId: 'listarRecursos',
                description: 'Catalogo visible para invitados, estudiantes y administradores. Ordenado del mas reciente al mas antiguo.',
                parameters: [
                    query('categoria', 'Filtra por categoria (HU-006)', {type: 'string', enum: CATEGORIAS}),
                    query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS}),
                    query('buscar', 'Busca texto en nombre, descripcion y etiquetas', {type: 'string', maxLength: 100}, 'distancia')
                ],
                responses: {
                    200: ok('Lista de recursos', {type: 'object', properties: {total: {type: 'integer'}, recursos: {type: 'array', items: ref('Recurso')}}}),
                    400: error('Filtro invalido', 'Categoria no valida')
                }
            },
            post: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Registrar un recurso (administrador)', operationId: 'crearRecurso', security: conToken,
                description: 'Acepta JSON o `multipart/form-data`. Para subir una imagen usa multipart con el campo `imagen` (JPG, PNG o WEBP, maximo 2 MB). En multipart las `etiquetas` se envian separadas por comas (`robotica,arduino`).',
                requestBody: {required: true, content: {
                    'application/json': {schema: {
                        type: 'object', required: ['nombre', 'categoria'],
                        properties: {
                            nombre: {type: 'string', minLength: 3, maxLength: 100, example: 'Sensores ultrasonicos'},
                            descripcion: {type: 'string', maxLength: 500, example: 'Paquete de 4 sensores HC-SR04'},
                            categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'array', maxItems: 10, items: {type: 'string', minLength: 2, maxLength: 30}, example: ['sensores', 'distancia', 'robotica']},
                            estado: {type: 'string', enum: ESTADOS, default: 'disponible'},
                            imagen: {type: 'string', description: 'URL de una imagen ya publicada (alternativa a subir archivo)'},
                            precio: {type: 'number', minimum: 0, maximum: 100000, description: 'Precio de reposicion en dolares (base de las penalizaciones)', example: 45}
                        }
                    }},
                    'multipart/form-data': {schema: {
                        type: 'object', required: ['nombre', 'categoria'],
                        properties: {
                            nombre: {type: 'string'}, descripcion: {type: 'string'},
                            categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'string', description: 'Separadas por comas', example: 'robotica,arduino'},
                            estado: {type: 'string', enum: ESTADOS},
                            precio: {type: 'string', description: 'Numero entre 0 y 100000', example: '45'},
                            imagen: {type: 'string', format: 'binary'}
                        }
                    }}
                }},
                responses: {
                    201: ok('Recurso creado', {type: 'object', properties: {msg: {type: 'string'}, recurso: ref('Recurso')}}),
                    400: error('Datos invalidos (incluido un precio fuera de 0-100000) o recurso repetido', 'Ya existe un recurso con ese nombre en la categoria'),
                    401: r401, 403: r403,
                    503: error('Cloudinary no configurado', 'La subida de imagenes no esta disponible: falta configurar Cloudinary')
                }
            }
        },
        '/api/recursos/{id}': {
            get: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Ver un recurso (publico)', operationId: 'detalleRecurso',
                parameters: [idRuta('Id del recurso')],
                responses: {200: ok('Detalle del recurso', ref('Recurso')), 400: error('Id invalido', 'El id del recurso no es valido'), 404: error('No existe', 'Recurso no encontrado')}
            },
            put: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Actualizar un recurso (administrador)', operationId: 'actualizarRecurso', security: conToken,
                description: 'Envia solo los campos que cambian. Una imagen subida reemplaza a la anterior.',
                parameters: [idRuta('Id del recurso')],
                requestBody: {required: true, content: {
                    'application/json': {schema: {
                        type: 'object',
                        properties: {
                            nombre: {type: 'string'}, descripcion: {type: 'string'}, categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'array', items: {type: 'string'}, example: ['arduino', 'robotica']},
                            estado: {type: 'string', enum: ESTADOS}, imagen: {type: 'string'},
                            precio: {type: 'number', minimum: 0, maximum: 100000, example: 45}
                        }
                    }},
                    'multipart/form-data': {schema: {
                        type: 'object',
                        properties: {
                            nombre: {type: 'string'}, descripcion: {type: 'string'}, categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'string', example: 'arduino,robotica'}, estado: {type: 'string', enum: ESTADOS},
                            precio: {type: 'string', example: '45'},
                            imagen: {type: 'string', format: 'binary'}
                        }
                    }}
                }},
                responses: {
                    200: ok('Recurso actualizado', {type: 'object', properties: {msg: {type: 'string'}, recurso: ref('Recurso')}}),
                    400: error('Datos invalidos', 'Envia al menos un campo a modificar'),
                    401: r401, 403: r403, 404: error('No existe', 'Recurso no encontrado')
                }
            },
            delete: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Eliminar un recurso (administrador)', operationId: 'eliminarRecurso', security: conToken,
                parameters: [idRuta('Id del recurso')],
                responses: {
                    200: ok('Recurso eliminado', {type: 'object', properties: {msg: {type: 'string'}}}),
                    400: error('Esta prestado', 'No se puede eliminar un recurso que esta prestado'),
                    401: r401, 403: r403, 404: error('No existe', 'Recurso no encontrado')
                }
            }
        },

        // ---------------- IA ----------------
        '/api/recomendaciones': {
            post: {
                tags: ['Recomendaciones con IA (HU-009)'], summary: 'Recibir recomendaciones de recursos (estudiante)', operationId: 'recomendar', security: conToken,
                description: [
                    'Recomienda recursos **disponibles** a partir del contexto del proyecto del estudiante.',
                    '',
                    '- **Contenido:** TF-IDF y similitud de coseno entre el contexto y el nombre, etiquetas, categoria y descripcion de cada recurso, mas un lexico de terminos relacionados.',
                    '- **Historial:** si otros estudiantes que pidieron los recursos base tambien pidieron otro, ese recurso suma puntaje (70 % contenido + 30 % historial). Sin historial el resultado es solo por contenido.',
                    '- Cada resultado trae `razon`, `terminosCoincidentes` y `porHistorial` para explicar por que se recomienda.'
                ].join('\n'),
                requestBody: {required: true, content: json({
                    type: 'object', required: ['contexto'],
                    properties: {
                        contexto: {type: 'string', minLength: 5, maxLength: 500, example: 'quiero hacer un robot que mida distancia'},
                        recursosSeleccionados: {type: 'array', maxItems: 10, items: ID_SCHEMA, description: 'Recursos que el estudiante ya eligio (no se vuelven a recomendar)'},
                        limite: {type: 'integer', minimum: 1, maximum: 10, default: 5}
                    }
                })},
                responses: {
                    200: ok('Recomendaciones (puede venir vacia si nada coincide)', {type: 'object', properties: {msg: {type: 'string'}, total: {type: 'integer'}, recomendaciones: {type: 'array', items: ref('Recomendacion')}}}),
                    400: error('Datos invalidos', 'El contexto debe tener entre 5 y 500 caracteres'),
                    401: r401, 403: r403
                }
            }
        },

        // ---------------- Asistente (chat) ----------------
        '/api/asistente': {
            post: {
                tags: ['Asistente (chat)'], summary: 'Conversar con el asistente de PoliRent (publico, sesion opcional)', operationId: 'conversarAsistente',
                security: [{}, {bearerAuth: []}],
                description: [
                    'Un solo chat que atiende dos temas y rechaza el resto:',
                    '',
                    '- **ayuda**: dudas sobre el uso de PoliRent (registro, inicio y cierre de sesion, contraseña, reservas, plazo, prestamo unico, cancelar, retiro y devolucion, horario, penalizaciones...). Trae `enlaces` a las pantallas del frontend. A un estudiante que pregunta \"¿cuanto debo?\" le responde con sus penalizaciones pendientes y su atraso en curso (sin consultar a Gemini).',
                    '- **recomendacion**: el usuario describe su proyecto o actividad y recibe recursos **disponibles** del catalogo en `recomendaciones` (mismo formato que `POST /api/recomendaciones`).',
                    '- **fuera_de_tema**: cualquier otra pregunta; responde que solo ayuda con PoliRent y recursos.',
                    '',
                    '**Motor hibrido** (`motor`): con `GEMINI_API_KEY` las preguntas que el motor local no reconoce con seguridad las redacta Google Gemini, que solo puede elegir recursos de la lista enviada (los ids inventados se descartan). Las dudas claras se responden al instante con el motor local, y si Gemini falla, tarda o no hay clave tambien responde el motor local (preguntas frecuentes + TF-IDF). El nivel gratuito de Gemini puede tardar 10-20 s.',
                    '',
                    'Con token de estudiante, `prestamoActivo` indica si ya tiene un prestamo activo (solo se permite uno a la vez). Un token invalido responde 401.'
                ].join('\n'),
                requestBody: {required: true, content: json({
                    type: 'object', required: ['mensaje'],
                    properties: {
                        mensaje: {type: 'string', minLength: 2, maxLength: 500, example: 'que me recomiendas si tengo que realizar una exposicion'},
                        historial: {type: 'array', maxItems: 10, description: 'Mensajes anteriores de la conversacion (opcional; solo los usa Gemini para entender continuaciones)',
                            items: {type: 'object', required: ['rol', 'texto'], properties: {rol: {type: 'string', enum: ['usuario', 'asistente']}, texto: {type: 'string', maxLength: 2000}}}}
                    }
                })},
                responses: {
                    200: ok('Respuesta del asistente', {type: 'object', properties: {
                        tipo: {type: 'string', enum: ['ayuda', 'recomendacion', 'fuera_de_tema']},
                        respuesta: {type: 'string', description: 'Texto para mostrar en el chat'},
                        enlaces: {type: 'array', items: {type: 'object', properties: {texto: {type: 'string'}, ruta: {type: 'string', example: '/solicitudes'}}}},
                        recomendaciones: {type: 'array', items: {type: 'object', properties: {
                            recurso: ref('Recurso'), relevancia: {type: 'integer', nullable: true, minimum: 1, maximum: 100}, razon: {type: 'string'}}}},
                        prestamoActivo: {type: 'object', nullable: true, properties: {_id: {type: 'string'}, estado: {type: 'string', enum: ['pendiente', 'aprobado', 'entregado']}, recurso: {type: 'object', properties: {_id: {type: 'string'}, nombre: {type: 'string'}}}}},
                        motor: {type: 'string', enum: ['gemini', 'local']}
                    }}, {
                        tipo: 'recomendacion',
                        respuesta: 'Te pueden servir estos recursos disponibles: Proyector Epson, Clicker inalambrico y Pantalla de proyeccion. Abre cualquiera para ver su ficha y reservarlo.',
                        enlaces: [],
                        recomendaciones: [{recurso: {_id: '64b7f0f2a1b2c3d4e5f60701', nombre: 'Proyector Epson', categoria: 'academico', estado: 'disponible'}, relevancia: 100, razon: 'Coincide con tu proyecto en: exposicion'}],
                        prestamoActivo: null,
                        motor: 'local'
                    }),
                    400: error('Mensaje o historial invalidos', 'El mensaje debe tener entre 2 y 500 caracteres'),
                    401: r401
                }
            }
        },

        // ---------------- Prestamos: estudiante ----------------
        '/api/prestamos': {
            post: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Solicitar un prestamo (estudiante)', operationId: 'solicitarPrestamo', security: conToken,
                description: [
                    'El recurso debe estar `disponible` y el estudiante no puede tener ningun otro prestamo activo (`pendiente`, `aprobado` o `entregado`): solo se permite uno a la vez. Se notifica a los administradores.',
                    '',
                    '- `fechaDevolucion`: `AAAA-MM-DD` (se toma a las 18:00 de Ecuador, el fin del horario) o fecha con hora. Debe ser futura, no superar el final del dia `hoy + 30` (dias calendario) y su hora debe caer entre las 07:00 y las 18:00 (hora de Ecuador).',
                    '- `aceptaTerminos` debe ser `true` (ver `GET /api/terminos`). Se guarda la version aceptada.',
                    '- `docenteReferencia` es obligatorio. Solo lo ve el administrador para contactarlo si el estudiante no devuelve el recurso.',
                    '- Un estudiante con **penalizaciones pendientes** no puede solicitar (400 con el monto).'
                ].join('\n'),
                requestBody: {required: true, content: json({
                    type: 'object', required: ['recursoId', 'fechaDevolucion', 'aceptaTerminos', 'docenteReferencia'],
                    properties: {
                        recursoId: ID_SCHEMA,
                        fechaDevolucion: {type: 'string', description: 'AAAA-MM-DD o fecha con hora (ISO 8601)', example: '2026-11-20'},
                        motivo: {type: 'string', maxLength: 300, example: 'Proyecto de robotica'},
                        aceptaTerminos: {type: 'boolean', enum: [true], description: 'Tambien se acepta el texto "true"', example: true},
                        docenteReferencia: ref('DocenteReferencia')
                    }
                }, {
                    recursoId: ID_EJEMPLO, fechaDevolucion: '2026-11-20', motivo: 'Proyecto de robotica', aceptaTerminos: true,
                    docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec', telefono: '0991234567'}
                })},
                responses: {
                    201: ok('Solicitud creada en estado pendiente', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: error('Datos invalidos, terminos sin aceptar, sin docente, fuera de horario, recurso no disponible, prestamo activo o penalizaciones pendientes', 'Tienes penalizaciones pendientes por $9.00. Regularizalas con la asociacion antes de solicitar otro recurso'),
                    401: r401, 403: r403, 404: error('Recurso inexistente', 'Recurso no encontrado')
                }
            },
            get: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Listar todas las solicitudes (administrador)', operationId: 'listarPrestamos', security: conToken,
                parameters: [query('estado', 'Filtra por estado, por ejemplo pendiente', {type: 'string', enum: ESTADOS_PRESTAMO}, 'pendiente')],
                responses: {
                    200: ok('Solicitudes con datos del estudiante y del recurso', {type: 'object', properties: {total: {type: 'integer'}, prestamos: {type: 'array', items: ref('Prestamo')}}}),
                    400: error('Estado invalido', 'Estado no valido'), 401: r401, 403: r403
                }
            }
        },
        '/api/prestamos/mis': {
            get: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Ver mis solicitudes (estudiante)', operationId: 'misPrestamos', security: conToken,
                parameters: [query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PRESTAMO})],
                responses: {
                    200: ok('Mis solicitudes', {type: 'object', properties: {total: {type: 'integer'}, prestamos: {type: 'array', items: ref('Prestamo')}}}),
                    400: error('Estado invalido', 'Estado no valido'), 401: r401, 403: r403
                }
            }
        },
        '/api/historial': {
            get: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Consultar mi historial de prestamos (estudiante)', operationId: 'historialPrestamos', security: conToken,
                description: 'Historial completo del estudiante con un resumen de cuantas solicitudes hay en cada estado. Filtros opcionales por estado y por rango de fechas.',
                parameters: [query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PRESTAMO}), ...filtrosFechas],
                responses: {
                    200: ok('Historial', {type: 'object', properties: {total: {type: 'integer'}, resumen: ref('ResumenPorEstado'), prestamos: {type: 'array', items: ref('Prestamo')}}}),
                    400: error('Filtro invalido', 'La fecha "desde" debe tener el formato AAAA-MM-DD'), 401: r401, 403: r403
                }
            }
        },
        '/api/prestamos/{id}/cancelar': {
            put: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Cancelar mi solicitud (estudiante)', operationId: 'cancelarPrestamo', security: conToken,
                description: 'Solo si esta `pendiente` o `aprobada`. Al cancelar una aprobada, su QR deja de servir.',
                parameters: [idRuta('Id del prestamo')],
                responses: {
                    200: ok('Solicitud cancelada', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: error('Estado que no permite cancelar', 'No se puede cancelar una solicitud entregado'),
                    401: r401, 403: r403, 404: error('No existe o no es tuya', 'Solicitud no encontrada')
                }
            }
        },
        '/api/prestamos/{id}': {
            get: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Ver un prestamo (dueño o administrador)', operationId: 'detallePrestamo', security: conToken,
                description: 'Sirve para consultar el prestamo durante la entrega o la devolucion. El estudiante solo ve los suyos; el administrador recibe ademas los datos del estudiante. `recurso` incluye `precio`.',
                parameters: [idRuta('Id del prestamo')],
                responses: {
                    200: ok('Detalle del prestamo', {type: 'object', properties: {prestamo: ref('Prestamo')}}),
                    400: error('Id invalido', 'El id de la solicitud no es valido'),
                    401: r401, 404: error('No existe o no te pertenece', 'Solicitud no encontrada')
                }
            }
        },
        '/api/prestamos/{id}/qr': {
            get: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Ver el QR de un prestamo aprobado', operationId: 'verQR', security: conToken,
                description: 'Lo ve el estudiante dueño del prestamo o un administrador. Solo existe mientras el prestamo esta `aprobado` o `entregado`. El valor `qr` es una imagen PNG en base64 (data URL) que se puede mostrar en un `<img src>`.',
                parameters: [idRuta('Id del prestamo')],
                responses: {
                    200: ok('Imagen del QR', {type: 'object', properties: {estado: {type: 'string', enum: ['aprobado', 'entregado']}, qr: {type: 'string', example: 'data:image/png;base64,iVBORw0KGgo...'}}}),
                    400: error('No tiene QR disponible', 'La solicitud no tiene un QR disponible'),
                    401: r401, 404: error('No existe o no te pertenece', 'Solicitud no encontrada')
                }
            }
        },

        // ---------------- Prestamos: administrador ----------------
        '/api/prestamos/{id}/aprobar': {
            put: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Aprobar una solicitud y generar su QR (administrador)', operationId: 'aprobarPrestamo', security: conToken,
                description: 'Genera un codigo aleatorio de 32 caracteres y su imagen QR, y notifica al estudiante. El recurso debe seguir disponible y sin otra solicitud aprobada.',
                parameters: [idRuta('Id del prestamo')],
                responses: {
                    200: ok('Solicitud aprobada', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo'), qr: {type: 'string', example: 'data:image/png;base64,iVBORw0KGgo...'}}}),
                    400: error('No se puede aprobar', 'No se puede aprobar una solicitud aprobado'),
                    401: r401, 403: r403, 404: error('No existe', 'Solicitud no encontrada')
                }
            }
        },
        '/api/prestamos/{id}/rechazar': {
            put: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Rechazar una solicitud (administrador)', operationId: 'rechazarPrestamo', security: conToken,
                parameters: [idRuta('Id del prestamo')],
                requestBody: {required: false, content: json({type: 'object', properties: {motivo: {type: 'string', maxLength: 200, example: 'Sin stock para esa fecha'}}})},
                responses: {
                    200: ok('Solicitud rechazada', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: error('No se puede rechazar', 'No se puede rechazar una solicitud aprobado'),
                    401: r401, 403: r403, 404: error('No existe', 'Solicitud no encontrada')
                }
            }
        },
        '/api/prestamos/escanear': {
            post: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Escanear el QR: registra entrega o devolucion (administrador)', operationId: 'escanearQR', security: conToken,
                description: `El estado del prestamo decide la accion (un QR usado ya no sirve). Acepta JSON o \`multipart/form-data\` (para adjuntar la foto en \`evidencia\`). Misma logica que \`PUT /api/prestamos/{id}/entregar\` y \`/devolver\`:\n\n${reglasMovimiento}`,
                requestBody: camposMovimiento(true, true),
                responses: {
                    200: ok('Entrega o devolucion registrada', respuestaMovimiento),
                    400: error('Codigo o datos invalidos, estado que no permite escanear, falta la evidencia o fuera de horario', MSG_HORARIO),
                    401: r401, 403: r403, 404: error('Codigo inexistente o ya usado', 'Codigo QR no valido'),
                    503: r503Cloudinary
                }
            }
        },
        '/api/prestamos/{id}/entregar': {
            put: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Registrar la entrega de un prestamo aprobado (administrador)', operationId: 'entregarPrestamo', security: conToken,
                description: `Alternativa al escaneo del QR. El prestamo debe estar \`aprobado\` y el recurso \`disponible\`. JSON o \`multipart/form-data\`.\n\n${reglasMovimiento}`,
                parameters: [idRuta('Id del prestamo')],
                requestBody: camposMovimiento(false),
                responses: {
                    200: ok('Entrega registrada', respuestaMovimiento),
                    400: error('Id o datos invalidos, prestamo no aprobado o fuera de horario', 'Solo se puede registrar la entrega de una solicitud aprobada (la solicitud esta pendiente)'),
                    401: r401, 403: r403, 404: error('No existe', 'Solicitud no encontrada'),
                    503: r503Cloudinary
                }
            }
        },
        '/api/prestamos/{id}/devolver': {
            put: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Registrar la devolucion de un prestamo entregado (administrador)', operationId: 'devolverPrestamo', security: conToken,
                description: `Alternativa al escaneo del QR. El prestamo debe estar \`entregado\`. JSON o \`multipart/form-data\`.\n\n${reglasMovimiento}`,
                parameters: [idRuta('Id del prestamo')],
                requestBody: camposMovimiento(true),
                responses: {
                    200: ok('Devolucion registrada', respuestaMovimiento, {
                        msg: 'Devolucion registrada correctamente', accion: 'devolucion',
                        recurso: {_id: ID_EJEMPLO, nombre: 'Kit Arduino Uno', estado: 'disponible'},
                        penalizaciones: [{_id: ID_EJEMPLO, tipo: 'atraso', monto: 4.5, dias: 2, descripcion: 'Atraso de 2 dia(s) en la devolucion', estado: 'pendiente'}],
                        totalPenalizado: 4.5, advertencias: []
                    }),
                    400: error('Id o datos invalidos, prestamo no entregado, falta la evidencia o fuera de horario', 'Adjunta una foto de evidencia del estado del recurso'),
                    401: r401, 403: r403, 404: error('No existe', 'Solicitud no encontrada'),
                    503: r503Cloudinary
                }
            }
        },

        // ---------------- Metricas y reportes ----------------
        '/api/metricas': {
            get: {
                tags: ['Metricas y reportes (HU-004)'], summary: 'Metricas generales (administrador)', operationId: 'metricas', security: conToken,
                responses: {
                    200: ok('Metricas del sistema', {
                        type: 'object',
                        properties: {
                            generadoEn: {type: 'string', format: 'date-time'},
                            estudiantes: {type: 'integer'},
                            recursos: {type: 'object', properties: {total: {type: 'integer'}, porEstado: {type: 'object', additionalProperties: {type: 'integer'}}, porCategoria: {type: 'object', additionalProperties: {type: 'integer'}}}},
                            prestamos: {type: 'object', properties: {
                                total: {type: 'integer'}, porEstado: ref('ResumenPorEstado'), ultimos30Dias: {type: 'integer'},
                                tasaAprobacion: {type: 'number', description: 'Porcentaje de solicitudes resueltas que fueron aprobadas'},
                                duracionPromedioDias: {type: 'number'}, vencidos: {type: 'integer', description: 'Entregados cuya fecha de devolucion ya paso'}
                            }},
                            usoPorCategoria: {type: 'object', additionalProperties: {type: 'integer'}},
                            masPrestados: {type: 'array', items: {type: 'object', properties: {
                                recurso: {type: 'object', properties: {_id: ID_SCHEMA, nombre: {type: 'string'}, categoria: {type: 'string'}}}, veces: {type: 'integer'}
                            }}},
                            penalizaciones: {type: 'object', properties: {
                                pendientes: {type: 'object', properties: {cantidad: {type: 'integer'}, monto: {type: 'number'}}},
                                pagadas: {type: 'object', properties: {cantidad: {type: 'integer'}, monto: {type: 'number'}}},
                                anuladas: {type: 'object', properties: {cantidad: {type: 'integer'}}},
                                montoPorTipo: {type: 'object', description: 'Monto no anulado por tipo', properties: {atraso: {type: 'number'}, danio: {type: 'number'}, perdida: {type: 'number'}}}
                            }},
                            recursosParaReponer: {type: 'array', maxItems: 10, description: 'Recursos que necesitan reposicion o ampliar inventario, de mas a menos urgente', items: {type: 'object', properties: {
                                recurso: {type: 'object', properties: {_id: ID_SCHEMA, nombre: {type: 'string'}, categoria: {type: 'string', enum: CATEGORIAS}, estado: {type: 'string', enum: ESTADOS}}},
                                vecesPrestado: {type: 'integer'},
                                ocupacion30Dias: {type: 'number', description: 'Porcentaje (0-100) de los ultimos 30 dias que estuvo entregado', example: 72.5},
                                incidentes: {type: 'integer', description: 'Devoluciones en condicion distinta de bueno'},
                                razones: {type: 'array', items: {type: 'string', enum: ['perdido', 'danos_frecuentes', 'alta_demanda', 'en_mantenimiento']},
                                    description: 'alta_demanda: ocupacion >= 60 %; danos_frecuentes: al menos una devolucion danado/incompleto; perdido: al menos una perdida; en_mantenimiento: estado actual'}
                            }}}
                        }
                    }),
                    401: r401, 403: r403
                }
            }
        },
        '/api/reportes/prestamos': {
            get: {
                tags: ['Metricas y reportes (HU-004)'], summary: 'Reporte de prestamos (administrador)', operationId: 'reportePrestamos', security: conToken,
                description: 'Lista de prestamos con datos del estudiante y del recurso, el docente de referencia, quien entrego y recibio, la condicion al devolver, las URL de las evidencias y la suma de penalizaciones no anuladas (`penalizacionTotal`). Con `formato=csv` se descarga un archivo que abre en Excel.',
                parameters: [
                    ...filtrosFechas,
                    query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PRESTAMO}),
                    query('formato', 'json (por defecto) o csv', {type: 'string', enum: ['json', 'csv'], default: 'json'})
                ],
                responses: {
                    200: {description: 'Reporte en JSON o CSV', content: {
                        'application/json': {schema: {type: 'object', properties: {desde: {type: 'string', nullable: true}, hasta: {type: 'string', nullable: true}, estado: {type: 'string', nullable: true}, total: {type: 'integer'}, prestamos: {type: 'array', items: {type: 'object'}}}}},
                        'text/csv': {schema: {type: 'string'}}
                    }},
                    400: error('Filtro invalido', 'El formato debe ser json o csv'), 401: r401, 403: r403
                }
            }
        },
        '/api/reportes/recursos': {
            get: {
                tags: ['Metricas y reportes (HU-004)'], summary: 'Reporte de frecuencia de uso por recurso (administrador)', operationId: 'reporteRecursos', security: conToken,
                description: 'Cuantas veces se solicito y se presto cada recurso, su precio, las devoluciones con incidente y el monto penalizado (no anulado), ordenado del mas al menos usado.',
                parameters: [
                    ...filtrosFechas,
                    query('formato', 'json (por defecto) o csv', {type: 'string', enum: ['json', 'csv'], default: 'json'})
                ],
                responses: {
                    200: {description: 'Reporte en JSON o CSV', content: {
                        'application/json': {schema: {type: 'object', properties: {desde: {type: 'string', nullable: true}, hasta: {type: 'string', nullable: true}, total: {type: 'integer'}, recursos: {type: 'array', items: {type: 'object', properties: {
                            recurso: {type: 'string'}, categoria: {type: 'string'}, estado: {type: 'string'}, precio: {type: 'number'}, solicitudes: {type: 'integer'}, vecesPrestado: {type: 'integer'},
                            ultimaEntrega: {type: 'string', format: 'date-time', nullable: true}, incidentes: {type: 'integer'}, penalizado: {type: 'number'}
                        }}}}}},
                        'text/csv': {schema: {type: 'string'}}
                    }},
                    400: error('Filtro invalido', 'El formato debe ser json o csv'), 401: r401, 403: r403
                }
            }
        },

        '/api/reportes/penalizaciones': {
            get: {
                tags: ['Metricas y reportes (HU-004)'], summary: 'Reporte de penalizaciones (administrador)', operationId: 'reportePenalizaciones', security: conToken,
                description: 'Una fila por penalizacion: estudiante, cedula, correo, recurso, tipo, monto, dias, estado, fecha de registro, fecha de pago y motivo de anulacion. Con `formato=csv` se descarga.',
                parameters: [
                    ...filtrosFechas,
                    query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PENALIZACION}),
                    formato
                ],
                responses: {
                    200: {description: 'Reporte en JSON o CSV', content: {
                        'application/json': {schema: {type: 'object', properties: {
                            desde: {type: 'string', nullable: true}, hasta: {type: 'string', nullable: true}, estado: {type: 'string', nullable: true},
                            total: {type: 'integer'}, totalMonto: {type: 'number', description: 'Suma de las no anuladas'}, penalizaciones: {type: 'array', items: {type: 'object'}}
                        }}},
                        'text/csv': {schema: {type: 'string'}}
                    }},
                    400: error('Filtro invalido', 'El estado debe ser: pendiente, pagada, anulada'), 401: r401, 403: r403
                }
            }
        },

        // ---------------- Penalizaciones ----------------
        '/api/terminos': {
            get: {
                tags: ['Penalizaciones'], summary: 'Terminos y condiciones (publico)', operationId: 'verTerminos',
                description: 'Tarifas (porcentajes del precio del recurso), horario de entrega y devolucion y las condiciones que el estudiante acepta al solicitar (`aceptaTerminos`). Los valores salen de las variables `PENALIZACION_*` y `HORARIO_*`.',
                responses: {200: ok('Terminos vigentes', ref('Terminos'))}
            }
        },
        '/api/penalizaciones/mis': {
            get: {
                tags: ['Penalizaciones'], summary: 'Ver mis penalizaciones (estudiante)', operationId: 'misPenalizaciones', security: conToken,
                description: '`totalAdeudado` suma las pendientes (bloquean nuevas solicitudes). `atrasoEnCurso` lista los prestamos entregados con la fecha vencida y lo que acumulan hasta ahora; se calcula al vuelo y se cobra al registrar la devolucion.',
                parameters: [query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PENALIZACION})],
                responses: {
                    200: ok('Mis penalizaciones', {type: 'object', properties: {
                        total: {type: 'integer'},
                        totalAdeudado: {type: 'number', example: 9},
                        totalAtrasoEnCurso: {type: 'number', example: 4.5},
                        atrasoEnCurso: {type: 'array', items: {type: 'object', properties: {
                            prestamo: ID_SCHEMA, recurso: {type: 'object', properties: {_id: ID_SCHEMA, nombre: {type: 'string'}}},
                            diasAtraso: {type: 'integer'}, montoAcumulado: {type: 'number'}
                        }}},
                        penalizaciones: {type: 'array', items: ref('Penalizacion')}
                    }}),
                    400: error('Filtro invalido', 'El estado debe ser: pendiente, pagada, anulada'), 401: r401, 403: r403
                }
            }
        },
        '/api/penalizaciones': {
            get: {
                tags: ['Penalizaciones'], summary: 'Listar penalizaciones (administrador)', operationId: 'listarPenalizaciones', security: conToken,
                description: 'Con los datos del estudiante (nombres, apellidos, cedula, correo), del recurso y del prestamo (incluido el docente de referencia).',
                parameters: [
                    query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PENALIZACION}, 'pendiente'),
                    query('usuario', 'Id del estudiante', ID_SCHEMA),
                    query('desde', 'Fecha inicial (AAAA-MM-DD) de registro', {type: 'string', format: 'date'}, '2026-10-01'),
                    query('hasta', 'Fecha final (AAAA-MM-DD), incluye todo ese dia', {type: 'string', format: 'date'}, '2026-10-31')
                ],
                responses: {
                    200: ok('Penalizaciones', {type: 'object', properties: {total: {type: 'integer'}, totalPendiente: {type: 'number'}, penalizaciones: {type: 'array', items: ref('Penalizacion')}}}),
                    400: error('Filtro invalido', 'El id del usuario no es valido'), 401: r401, 403: r403
                }
            }
        },
        '/api/penalizaciones/{id}/pagar': {
            put: {
                tags: ['Penalizaciones'], summary: 'Registrar el pago de una penalizacion (administrador)', operationId: 'pagarPenalizacion', security: conToken,
                description: 'Solo sobre penalizaciones `pendiente`. Guarda `fechaPago` y notifica al estudiante.',
                parameters: [idRuta('Id de la penalizacion')],
                responses: {
                    200: ok('Pago registrado', {type: 'object', properties: {msg: {type: 'string'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Id invalido o la penalizacion no esta pendiente', 'Solo se pueden modificar penalizaciones pendientes'),
                    401: r401, 403: r403, 404: error('No existe', 'Penalizacion no encontrada')
                }
            }
        },
        '/api/penalizaciones/{id}/anular': {
            put: {
                tags: ['Penalizaciones'], summary: 'Anular una penalizacion (administrador)', operationId: 'anularPenalizacion', security: conToken,
                description: 'Solo sobre penalizaciones `pendiente`, por ejemplo cuando el estudiante repone el articulo perdido. Notifica al estudiante.',
                parameters: [idRuta('Id de la penalizacion')],
                requestBody: {required: true, content: json({type: 'object', required: ['motivo'], properties: {motivo: {type: 'string', minLength: 3, maxLength: 200, example: 'El estudiante repuso el articulo'}}})},
                responses: {
                    200: ok('Penalizacion anulada', {type: 'object', properties: {msg: {type: 'string'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Sin motivo, id invalido o la penalizacion no esta pendiente', 'El motivo de la anulacion debe tener entre 3 y 200 caracteres'),
                    401: r401, 403: r403, 404: error('No existe', 'Penalizacion no encontrada')
                }
            }
        },

        // ---------------- Notificaciones ----------------
        '/api/notificaciones': {
            get: {
                tags: ['Notificaciones (HU-010)'], summary: 'Consultar mis notificaciones', operationId: 'misNotificaciones', security: conToken,
                description: 'Disponible para estudiantes y administradores. Al consultar, el sistema genera los avisos de devolucion: `recordatorio` cuando faltan 2 dias o menos y `vencido` cuando la fecha ya paso (una sola vez por prestamo; recuerda que cada dia de atraso genera una penalizacion). El tipo `penalizacion` avisa de penalizaciones registradas, pagadas o anuladas. Si el SMTP esta configurado, las notificaciones tambien llegan al correo institucional.',
                parameters: [query('leida', 'Filtra por leidas (true) o no leidas (false)', {type: 'string', enum: ['true', 'false']}, 'false')],
                responses: {
                    200: ok('Notificaciones (maximo 100, las mas recientes primero)', {type: 'object', properties: {total: {type: 'integer'}, noLeidas: {type: 'integer'}, notificaciones: {type: 'array', items: ref('Notificacion')}}}),
                    400: error('Filtro invalido', 'El filtro leida debe ser true o false'), 401: r401
                }
            }
        },
        '/api/notificaciones/leidas': {
            put: {
                tags: ['Notificaciones (HU-010)'], summary: 'Marcar todas mis notificaciones como leidas', operationId: 'marcarTodasLeidas', security: conToken,
                responses: {200: ok('Notificaciones actualizadas', {type: 'object', properties: {msg: {type: 'string'}, modificadas: {type: 'integer'}}}), 401: r401}
            }
        },
        '/api/notificaciones/{id}/leida': {
            put: {
                tags: ['Notificaciones (HU-010)'], summary: 'Marcar una notificacion como leida', operationId: 'marcarLeida', security: conToken,
                parameters: [idRuta('Id de la notificacion')],
                responses: {
                    200: ok('Notificacion actualizada', {type: 'object', properties: {msg: {type: 'string'}, notificacion: ref('Notificacion')}}),
                    400: error('Id invalido', 'El id de la notificacion no es valido'), 401: r401,
                    404: error('No existe o no es tuya', 'Notificacion no encontrada')
                }
            }
        },

        // ---------------- Usuarios ----------------
        '/api/usuarios': {
            get: {
                tags: ['Usuarios'], summary: 'Listar usuarios (administrador)', operationId: 'listarUsuarios', security: conToken,
                parameters: [query('rol', 'Filtra por rol', {type: 'string', enum: ['estudiante', 'administrador']}, 'estudiante')],
                responses: {
                    200: ok('Usuarios (sin contraseñas ni tokens)', {type: 'object', properties: {total: {type: 'integer'}, usuarios: {type: 'array', items: ref('Usuario')}}}),
                    400: error('Rol invalido', 'Rol no valido'), 401: r401, 403: r403
                }
            }
        },
        '/api/usuarios/{id}': {
            delete: {
                tags: ['Usuarios'], summary: 'Eliminar a un estudiante (administrador)', operationId: 'eliminarUsuario', security: conToken,
                description: 'Elimina al estudiante junto con sus prestamos y notificaciones. No se puede eliminar a un administrador ni a un estudiante con recursos entregados sin devolver.',
                parameters: [idRuta('Id del usuario')],
                responses: {
                    200: ok('Estudiante eliminado', {type: 'object', properties: {msg: {type: 'string'}}}, {msg: 'Alumno eliminado correctamente'}),
                    400: error('Tiene recursos sin devolver', 'El alumno tiene recursos entregados sin devolver'),
                    401: r401, 403: error('Es un administrador o falta el permiso', 'No se puede eliminar a un administrador'),
                    404: error('No existe', 'Usuario no encontrado')
                }
            }
        }
    }
}
