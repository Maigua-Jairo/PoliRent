// Especificacion OpenAPI 3 de la API de PoliRent. Se publica con Swagger UI en /api-docs (ver server.js)
import {FACULTADES} from '../models/Usuario.js'
import {CATEGORIAS, ESTADOS} from '../models/Recurso.js'
import {ESTADOS_PRESTAMO, CONDICIONES} from '../models/Prestamo.js'
import {TIPOS_NOTIFICACION} from '../models/Notificacion.js'
import {TIPOS_PENALIZACION, ESTADOS_PENALIZACION} from '../models/Penalizacion.js'

const ID_EJEMPLO = '64b7f0f2a1b2c3d4e5f60718'
const PATRON_ID = '^[a-fA-F0-9]{24}$'
// id de MongoDB: 24 caracteres hexadecimales; `origen` explica de donde se obtiene
const idMongo = (origen, example = ID_EJEMPLO) => ({type: 'string', pattern: PATRON_ID, minLength: 24, maxLength: 24, example,
    description: `Id de MongoDB (24 caracteres hexadecimales). ${origen}`})
// de donde sale cada id (se repite en parametros de ruta, cuerpos y respuestas)
const ORIGEN = {
    recurso: 'Es el `_id` de un recurso de la respuesta de `GET /api/recursos` (o de `POST /api/recursos`).',
    prestamo: 'Es el `_id` del prestamo en `GET /api/prestamos/mis` (estudiante), en `GET /api/prestamos` (administrador) o en la respuesta de `POST /api/prestamos`.',
    penalizacion: 'Es el `_id` de la penalizacion en `GET /api/penalizaciones/mis` (estudiante) o `GET /api/penalizaciones` (administrador).',
    notificacion: 'Es el `_id` de la notificacion en `GET /api/notificaciones`.',
    usuario: 'Es el `id` del usuario en `GET /api/usuarios` (o el `usuario._id` de una solicitud o penalizacion).'
}
const ID_SCHEMA = {$ref: '#/components/schemas/IdMongo'}

const ref = (nombre) => ({$ref: `#/components/schemas/${nombre}`})
const json = (schema, example) => ({'application/json': {schema, ...(example && {example})}})
const ok = (description, schema, example) => ({description, content: json(schema, example)})
const error = (description, msg) => ({description, content: json(ref('Error'), {msg})})
const conToken = [{bearerAuth: []}]

// parametro {id} reutilizable de components.parameters (IdRecurso, IdPrestamo, IdPenalizacion, IdNotificacion, IdUsuario)
const idRuta = (nombre) => ({$ref: `#/components/parameters/${nombre}`})
const parametroId = (tipo, texto) => ({name: 'id', in: 'path', required: true, description: `${texto}. ${ORIGEN[tipo]}`, schema: idMongo(ORIGEN[tipo])})
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
        responsable: {type: 'string', minLength: 3, maxLength: 100, description: 'Nombre de la persona de la asociacion que atiende. En la entrega: quien entrega el recurso al estudiante. En la devolucion: quien RECIBE el recurso de vuelta (no el estudiante que lo trae). Por defecto, nombres y apellidos del administrador autenticado. Se responde como `entrega.entregadoPor` o `devolucion.recibidoPor`', example: 'Maria Lopez'},
        observaciones: {type: 'string', maxLength: 300, description: 'Notas sobre el estado del recurso o lo que se entrega con el (opcional, maximo 300 caracteres)', example: 'Se entrega con cable HDMI y control remoto'},
        ...(conCondicion ? {condicion: {type: 'string', enum: CONDICIONES, default: 'bueno', description: 'Condicion al entregar o recibir el recurso. En devoluciones, `danado` e `incompleto` exigen la foto de evidencia'}} : {})
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

// agrega un ejemplo al cuerpo JSON de una peticion
const conEjemplo = (cuerpo, example) => ({...cuerpo, content: {...cuerpo.content, 'application/json': {...cuerpo.content['application/json'], example}}})

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
    '- Se guarda quien entrega o recibe (`responsable`, por defecto el administrador), la condicion, `observaciones` y la foto opcional `evidencia` (obligatoria al devolver `danado` o `incompleto`). La condicion de entrega por defecto es `bueno`.',
    '- **Entrega**: solo desde `aprobado` (no dos veces); pasa a `entregado` y el recurso a `prestado`. Si la solicitud tiene `fechaEntregaProgramada` no se entrega antes de esa hora menos `ENTREGA_TOLERANCIA_MIN` (30 min por defecto): 400 `Esta solicitud esta programada para el dd/MM/yyyy HH:mm, no se puede entregar antes`. Las solicitudes antiguas sin ese campo no se validan.',
    '- **Devolucion**: `entregado` pasa a `devuelto` y el codigo QR se elimina. `devolucion.recibidoPor` es quien recibe el recurso. El recurso vuelve a `disponible` si la condicion es `bueno` y queda en `mantenimiento` en cualquier otro caso.',
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
            '**Convenciones:** los errores responden `{ "msg": "..." }`. Un `401` significa que la sesion no es valida; los errores de datos usan `400`.',
            'Un cuerpo JSON de mas de 100 KB, un JSON o un `multipart/form-data` mal formados responden `400`. En multipart se acepta un solo archivo (JPG, PNG o WEBP, maximo 2 MB) en el campo indicado por cada ruta.',
            'Si la base de datos no responde al verificar la sesion se devuelve `500` (no `401`), para que el cliente no cierre la sesion por un fallo del servidor.',
            'Las acciones que cambian el estado de una solicitud o de una penalizacion devuelven `400` si otra peticion la modifico al mismo tiempo.'
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
        parameters: {
            IdRecurso: parametroId('recurso', 'Id del recurso'),
            IdPrestamo: parametroId('prestamo', 'Id de la solicitud de prestamo'),
            IdPenalizacion: parametroId('penalizacion', 'Id de la penalizacion'),
            IdNotificacion: parametroId('notificacion', 'Id de la notificacion'),
            IdUsuario: parametroId('usuario', 'Id del usuario')
        },
        schemas: {
            Error: {type: 'object', properties: {msg: {type: 'string', description: 'Mensaje en espanol para mostrar al usuario'}}, required: ['msg']},
            IdMongo: idMongo('Identificador que devuelve la API en el campo `_id` (o `id` en usuarios).'),
            Usuario: {
                type: 'object',
                properties: {
                    id: ID_SCHEMA,
                    nombres: {type: 'string', example: 'Ana'},
                    apellidos: {type: 'string', example: 'Lopez'},
                    cedula: {type: 'string', example: '1712345678'},
                    correo: {type: 'string', example: 'ana.lopez@epn.edu.ec'},
                    telefono: {type: 'string', example: '0991234567'},
                    facultad: {type: 'string', enum: FACULTADES, description: 'Solo estudiantes: el administrador (unico, asignado en la base de datos) no tiene facultad y el campo no se incluye'},
                    rol: {type: 'string', enum: ['estudiante', 'administrador']}
                }
            },
            Recurso: {
                type: 'object',
                properties: {
                    _id: ID_SCHEMA,
                    nombre: {type: 'string', minLength: 3, maxLength: 80, description: 'Nombre unico del recurso (sin distinguir mayusculas ni tildes)', example: 'Sensores ultrasonicos'},
                    descripcion: {type: 'string', description: 'Para que sirve y que incluye (vacia o de 10 a 500 caracteres)', example: 'Paquete de 4 sensores HC-SR04'},
                    categoria: {type: 'string', enum: CATEGORIAS},
                    etiquetas: {type: 'array', items: {type: 'string'}, description: 'Palabras clave que usa el recomendador', example: ['sensores', 'distancia', 'robotica']},
                    estado: {type: 'string', enum: ESTADOS, description: 'Solo un recurso `disponible` se puede solicitar o eliminar'},
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
                    nombre: {type: 'string', minLength: 3, maxLength: 100, description: 'Nombres y apellidos del docente que conoce al estudiante (por ejemplo, el de la materia del proyecto)', example: 'Carlos Ruiz'},
                    correo: {type: 'string', format: 'email', maxLength: 100, description: 'Correo del docente (cualquier dominio)', example: 'carlos.ruiz@epn.edu.ec'},
                    telefono: {type: 'string', pattern: '^[0-9+\\- ]{7,15}$', description: 'Opcional: 7 a 15 digitos, espacios, + o -', example: '0991234567'}
                }
            },
            Movimiento: {
                type: 'object',
                nullable: true,
                description: 'Entrega o devolucion registrada (null si aun no ocurre). `entrega` trae `entregadoPor` y `devolucion` trae `recibidoPor`',
                properties: {
                    registradoPor: idMongo('Administrador autenticado que registro la entrega o la devolucion (su `id` en `GET /api/usuarios`).'),
                    entregadoPor: {type: 'string', description: 'Solo en `entrega`: persona de la asociacion que entrego el recurso al estudiante', example: 'Luis Paz'},
                    recibidoPor: {type: 'string', description: 'Solo en `devolucion`: persona de la asociacion que RECIBIO el recurso de vuelta (no el estudiante que lo trae)', example: 'Maria Lopez'},
                    observaciones: {type: 'string', description: 'Notas registradas por el responsable'},
                    condicion: {type: 'string', enum: CONDICIONES, description: 'Condicion del recurso en la entrega o devolucion'},
                    evidencia: {type: 'object', nullable: true, properties: {url: {type: 'string', example: 'https://res.cloudinary.com/.../evidencia.jpg'}}}
                }
            },
            Penalizacion: {
                type: 'object',
                properties: {
                    _id: ID_SCHEMA,
                    tipo: {type: 'string', enum: TIPOS_PENALIZACION},
                    monto: {type: 'number', description: 'En dolares, con 2 decimales', example: 9},
                    diasAtraso: {type: 'integer', nullable: true, description: 'Solo en el tipo atraso: dias (o fraccion de dia) de atraso en la devolucion; null en los demas', example: 2},
                    descripcion: {type: 'string', example: 'Atraso de 2 dia(s) en la devolucion'},
                    estado: {type: 'string', enum: ESTADOS_PENALIZACION},
                    fechaRegistro: {type: 'string', format: 'date-time', description: 'Cuando se registro la penalizacion (igual a `createdAt`)', example: '2026-11-02T15:00:00.000Z'},
                    fechaPago: {type: 'string', format: 'date-time', nullable: true, description: 'Cuando se registro el pago; null si aun no esta pagada', example: '2026-11-10T15:00:00.000Z'},
                    motivoAnulacion: {type: 'string', example: 'El estudiante repuso el articulo'},
                    comprobante: {type: 'object', nullable: true, description: 'Comprobante de pago subido por el estudiante (sin el publicId de Cloudinary). Se conserva al pagar y se borra al rechazarlo', properties: {
                        url: {type: 'string', example: 'https://res.cloudinary.com/.../comprobante.jpg'},
                        subidoEn: {type: 'string', format: 'date-time'},
                        referencia: {type: 'string', maxLength: 50, example: 'TRX-004512'},
                        observaciones: {type: 'string', maxLength: 200, example: 'Deposito en Banco Pichincha'}
                    }},
                    motivoRechazoComprobante: {type: 'string', description: 'Motivo del ultimo comprobante rechazado (vacio si no hay)', example: 'La foto no se lee'},
                    fechaRevision: {type: 'string', format: 'date-time', nullable: true, description: 'Cuando el administrador aprobo (pago) o rechazo el comprobante'},
                    usuario: {description: 'Id del estudiante, o sus datos cuando lo consulta el administrador', oneOf: [ID_SCHEMA, ref('Usuario')]},
                    recurso: {description: 'Id o datos basicos del recurso', oneOf: [ID_SCHEMA, ref('Recurso')]},
                    prestamo: {description: 'Id del prestamo, o sus datos basicos (`estado`, `fechaDevolucionProgramada`, `fechaDevolucionReal` y el docente) cuando lo consulta el administrador', oneOf: [ID_SCHEMA, {type: 'object'}]},
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
                    maxSolicitudesActivas: {type: 'integer', minimum: 1, description: 'Maximo de solicitudes pendientes, aprobadas o entregadas que un estudiante puede tener a la vez (`MAX_SOLICITUDES_ACTIVAS`)', example: 5},
                    condiciones: {type: 'array', items: {type: 'string'}, example: ['Si el recurso se devuelve danado o incompleto, pagaras el 20 % de su precio.']}
                }
            },
            Prestamo: {
                type: 'object',
                description: 'El codigo del QR nunca se incluye aqui; solo viaja dentro de la imagen QR.',
                properties: {
                    _id: ID_SCHEMA,
                    estado: {type: 'string', enum: ESTADOS_PRESTAMO},
                    motivoPrestamo: {type: 'string', description: 'Motivo del prestamo: para que actividad o proyecto academico usara el recurso', example: 'Proyecto de robotica'},
                    fechaEntregaProgramada: {type: 'string', format: 'date-time', nullable: true, description: 'Fecha y hora (Ecuador) en que el estudiante pidio recibir el recurso; no se entrega antes. null en solicitudes antiguas', example: '2026-12-01T15:00:00.000Z'},
                    fechaDevolucionProgramada: {type: 'string', format: 'date-time', description: 'Fecha y hora en que el estudiante se compromete a devolver (no aparece en la respuesta de cancelar)'},
                    fechaEntregaReal: {type: 'string', format: 'date-time', description: 'Momento real en que se entrego el recurso'},
                    fechaDevolucionReal: {type: 'string', format: 'date-time', description: 'Momento real de la devolucion'},
                    motivoRechazo: {type: 'string', description: 'Motivo por el que el administrador rechazo la solicitud (vacio si no fue rechazada)'},
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
                    tipo: {type: 'string', enum: TIPOS_NOTIFICACION, description: '`recordatorio`: aviso automatico antes de la devolucion (RECORDATORIO_HORAS_ANTES)'},
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
                description: 'Siempre crea un usuario con rol `estudiante` (el campo `rol` se ignora: ningun endpoint crea administradores; el sistema trabaja con un unico administrador asignado en la base de datos).\n\nReglas: cada campo es obligatorio y de texto (`El campo contrasena es obligatorio`, `El campo correo debe ser texto`...); cedula ecuatoriana valida de 10 digitos; correo exactamente `usuario@epn.edu.ec` (`INSTITUTIONAL_EMAIL_DOMAIN`, sin distinguir mayusculas; se rechazan `a@epn.edu.ec.com`, `a@xepn.edu.ec`, `a@b@epn.edu.ec` y espacios: `Usa tu correo institucional @epn.edu.ec`); telefono `09XXXXXXXX`; contraseña de 8 a 72 caracteres con mayusculas, minusculas y numeros.',
                requestBody: {required: true, content: json({
                    type: 'object',
                    required: ['nombres', 'apellidos', 'cedula', 'correo', 'telefono', 'facultad', 'password'],
                    properties: {
                        nombres: {type: 'string', minLength: 2, maxLength: 50, description: 'Nombres (solo letras y espacios)', example: 'Ana'},
                        apellidos: {type: 'string', minLength: 2, maxLength: 50, description: 'Apellidos (solo letras y espacios)', example: 'Lopez'},
                        cedula: {type: 'string', pattern: '^\\d{10}$', description: 'Cedula ecuatoriana con digito verificador valido y no registrada', example: '1710034065'},
                        correo: {type: 'string', maxLength: 100, description: 'Correo institucional exacto @epn.edu.ec', example: 'ana.lopez@epn.edu.ec'},
                        telefono: {type: 'string', pattern: '^09\\d{8}$', description: 'Celular ecuatoriano 09XXXXXXXX', example: '0991234567'},
                        facultad: {type: 'string', enum: FACULTADES, description: 'Facultad del estudiante'},
                        password: {type: 'string', format: 'password', minLength: 8, maxLength: 72, description: 'Contraseña con mayusculas, minusculas y numeros', example: 'Clave1234'}
                    }
                })},
                responses: {
                    201: ok('Usuario registrado', {type: 'object', properties: {msg: {type: 'string'}, usuario: ref('Usuario')}}),
                    400: error('Campo vacio o de otro tipo, correo de otro dominio, datos invalidos o correo/cedula ya registrados', 'Usa tu correo institucional @epn.edu.ec')
                }
            }
        },
        '/api/login': {
            post: {
                tags: ['Cuenta (HU-001)'], summary: 'Iniciar sesion', operationId: 'login',
                description: 'No exige el dominio institucional (el administrador puede usar otro correo). Los mensajes distinguen `Correo no registrado` de `Contrasena incorrecta` por pedido del revisor; esto permite saber que correos estan registrados.',
                requestBody: {required: true, content: json({
                    type: 'object', required: ['correo', 'password'],
                    properties: {
                        correo: {type: 'string', maxLength: 100, description: 'Correo con el que se registro la cuenta', example: 'ana.lopez@epn.edu.ec'},
                        password: {type: 'string', format: 'password', maxLength: 72, description: 'Contraseña de la cuenta', example: 'Clave1234'}
                    }
                })},
                responses: {
                    200: ok('Sesion iniciada', {type: 'object', properties: {msg: {type: 'string'}, token: {type: 'string', description: 'JWT para usar como Bearer'}, usuario: ref('Usuario')}}),
                    400: error('Campo vacio, solo espacios o de otro tipo (con su nombre)', 'El campo contrasena es obligatorio'),
                    401: {description: 'Correo no registrado o contraseña incorrecta (codigo de siempre del login)', content: {'application/json': {schema: ref('Error'), examples: {
                        correoNoRegistrado: {summary: 'El correo no existe', value: {msg: 'Correo no registrado'}},
                        contrasenaIncorrecta: {summary: 'Correo correcto, contraseña mala', value: {msg: 'Contrasena incorrecta'}}
                    }}}}
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
                        nombres: {type: 'string', minLength: 2, maxLength: 50, example: 'Ana Maria'}, apellidos: {type: 'string', minLength: 2, maxLength: 50, example: 'Lopez Mora'},
                        telefono: {type: 'string', example: '0987654321'},
                        facultad: {type: 'string', enum: FACULTADES, description: 'Solo estudiantes (el administrador no tiene facultad)', example: 'Ingeniería en Sistemas'},
                        password: {type: 'string', format: 'password', description: 'Nueva contraseña (8 o mas caracteres con mayusculas, minusculas y numeros)', example: 'NuevaClave123'},
                        passwordActual: {type: 'string', format: 'password', description: 'Obligatoria si se envia password', example: 'Clave1234'}
                    }
                })},
                responses: {
                    200: ok('Perfil actualizado', {type: 'object', properties: {msg: {type: 'string'}, token: {type: 'string', description: 'Solo si se cambio la contraseña'}, usuario: ref('Usuario')}}),
                    400: error('Datos invalidos, contraseña actual incorrecta o el administrador envio una facultad', 'El administrador no tiene facultad'),
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
                description: 'Acepta JSON o `multipart/form-data`. Para subir una imagen usa multipart con el campo `imagen` (JPG, PNG o WEBP, maximo 2 MB). En multipart las `etiquetas` se envian separadas por comas (`robotica,arduino`).\n\nCada error nombra el campo (`El nombre del recurso debe tener entre 3 y 80 caracteres`). Objetos o arreglos donde se espera texto responden 400, y los campos del sistema (`_id`, `imagenId`, `createdAt`, `updatedAt`, `__v`) no se pueden enviar. El nombre es unico: se compara sin distinguir mayusculas ni tildes en todas las categorias (`Ya existe un recurso con ese nombre`).',
                requestBody: {required: true, content: {
                    'application/json': {schema: {
                        type: 'object', required: ['nombre', 'categoria'],
                        properties: {
                            nombre: {type: 'string', minLength: 3, maxLength: 80, description: 'Nombre del recurso; se guardan sin espacios sobrantes', example: 'Sensores ultrasonicos'},
                            descripcion: {type: 'string', maxLength: 500, description: 'Vacia o de 10 a 500 caracteres: para que sirve y que incluye', example: 'Paquete de 4 sensores HC-SR04'},
                            categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'array', maxItems: 15, uniqueItems: true, items: {type: 'string', minLength: 2, maxLength: 30}, example: ['sensores', 'distancia', 'robotica']},
                            estado: {type: 'string', enum: ESTADOS, default: 'disponible'},
                            imagen: {type: 'string', maxLength: 500, pattern: '^https?://', description: 'URL http(s) de una imagen ya publicada (alternativa a subir archivo)', example: 'https://res.cloudinary.com/demo/image/upload/sensores-ultrasonicos.jpg'},
                            precio: {type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 100000, multipleOf: 0.01, description: 'Precio de reposicion en dolares, mayor que 0, con hasta 2 decimales (base de las penalizaciones). Opcional: sin precio no se generan penalizaciones', example: 45.5}
                        }
                    }},
                    'multipart/form-data': {schema: {
                        type: 'object', required: ['nombre', 'categoria'],
                        properties: {
                            nombre: {type: 'string', minLength: 3, maxLength: 80, example: 'Sensores ultrasonicos'},
                            descripcion: {type: 'string', maxLength: 500, description: 'Vacia o de 10 a 500 caracteres', example: 'Paquete de 4 sensores HC-SR04 para medir distancia'},
                            categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'string', description: 'Separadas por comas: maximo 15, de 2 a 30 caracteres cada una y sin repetir', example: 'robotica,arduino'},
                            estado: {type: 'string', enum: ESTADOS},
                            precio: {type: 'string', description: 'Numero mayor que 0 y de maximo 100000, con hasta 2 decimales', example: '45.50'},
                            imagen: {type: 'string', format: 'binary'}
                        }
                    }}
                }},
                responses: {
                    201: ok('Recurso creado', {type: 'object', properties: {msg: {type: 'string'}, recurso: ref('Recurso')}}),
                    400: error('Campo invalido (el mensaje nombra el campo), campo del sistema enviado o nombre repetido', 'Ya existe un recurso con ese nombre'),
                    401: r401, 403: r403,
                    503: error('Cloudinary no configurado', 'La subida de imagenes no esta disponible: falta configurar Cloudinary')
                }
            }
        },
        '/api/recursos/{id}': {
            get: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Ver un recurso (publico)', operationId: 'detalleRecurso',
                parameters: [idRuta('IdRecurso')],
                responses: {200: ok('Detalle del recurso', ref('Recurso')), 400: error('Id invalido', 'El id del recurso no es valido'), 404: error('No existe', 'Recurso no encontrado')}
            },
            put: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Actualizar un recurso (administrador)', operationId: 'actualizarRecurso', security: conToken,
                description: 'Envia solo los campos que cambian, con las mismas reglas que al crear. Una imagen subida reemplaza a la anterior. El nombre no puede quedar igual al de **otro** recurso (sin distinguir mayusculas ni tildes); se puede guardar con su mismo nombre.',
                parameters: [idRuta('IdRecurso')],
                requestBody: {required: true, content: {
                    'application/json': {schema: {
                        type: 'object',
                        properties: {
                            nombre: {type: 'string', minLength: 3, maxLength: 80, description: 'Nuevo nombre (unico)'}, descripcion: {type: 'string', maxLength: 500, description: 'Vacia o de 10 a 500 caracteres'}, categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'array', maxItems: 15, uniqueItems: true, items: {type: 'string', minLength: 2, maxLength: 30}, example: ['arduino', 'robotica']},
                            estado: {type: 'string', enum: ESTADOS},
                            imagen: {type: 'string', maxLength: 500, description: 'URL http(s) de una imagen, o texto vacio para quitar la imagen actual'},
                            precio: {type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 100000, multipleOf: 0.01, description: 'Mayor que 0, con hasta 2 decimales', example: 45}
                        }
                    },
                    // ejemplo completo con valores validos (se puede enviar solo lo que cambia)
                    example: {nombre: 'Balon de voley profesional', descripcion: 'Balon oficial de voleibol para torneos internos de la asociacion',
                        categoria: 'recreativo', etiquetas: ['voley', 'deporte', 'torneo'], estado: 'disponible',
                        imagen: 'https://res.cloudinary.com/demo/image/upload/balon-voley.jpg', precio: 30}},
                    'multipart/form-data': {schema: {
                        type: 'object',
                        properties: {
                            nombre: {type: 'string', minLength: 3, maxLength: 80, example: 'Kit Arduino Uno'},
                            descripcion: {type: 'string', maxLength: 500, description: 'Vacia o de 10 a 500 caracteres', example: 'Placa Arduino Uno con cables y protoboard'},
                            categoria: {type: 'string', enum: CATEGORIAS},
                            etiquetas: {type: 'string', description: 'Separadas por comas: maximo 15, de 2 a 30 caracteres cada una y sin repetir', example: 'arduino,robotica'}, estado: {type: 'string', enum: ESTADOS},
                            precio: {type: 'string', example: '45'},
                            imagen: {type: 'string', format: 'binary'}
                        }
                    }}
                }},
                responses: {
                    200: ok('Recurso actualizado', {type: 'object', properties: {msg: {type: 'string'}, recurso: ref('Recurso')}}),
                    400: error('Sin cambios, campo invalido o el nombre ya lo usa otro recurso', 'Ya existe un recurso con ese nombre'),
                    401: r401, 403: r403, 404: error('No existe', 'Recurso no encontrado')
                }
            },
            delete: {
                tags: ['Recursos (HU-002, HU-005, HU-006)'], summary: 'Eliminar un recurso (administrador)', operationId: 'eliminarRecurso', security: conToken,
                description: 'Solo se elimina un recurso en estado `disponible` (en `prestado` o `mantenimiento` responde 400) y sin solicitudes activas (`pendiente`, `aprobado` o `entregado`).',
                parameters: [idRuta('IdRecurso')],
                responses: {
                    200: ok('Recurso eliminado', {type: 'object', properties: {msg: {type: 'string'}}}),
                    400: error('No esta disponible o tiene solicitudes activas', 'Solo se puede eliminar un recurso disponible'),
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
                        recursosSeleccionados: {type: 'array', maxItems: 10, items: idMongo(ORIGEN.recurso), description: 'Ids de recursos que el estudiante ya eligio (no se vuelven a recomendar)'},
                        limite: {type: 'integer', minimum: 1, maximum: 10, default: 5, example: 5}
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
                    '- **ayuda**: dudas sobre el uso de PoliRent (registro, inicio y cierre de sesion, contraseña, reservas, pedir para hoy con hora de entrega y devolucion, maximo de solicitudes activas, recordatorios, plazo, cancelar, retiro y devolucion, horario, penalizaciones, pago y comprobante, perdida o dano, docente de referencia, evidencia, historial y notificaciones...). Trae `enlaces` a las pantallas del frontend. A un estudiante que pregunta \"¿cuanto debo?\" le responde con sus penalizaciones pendientes y su atraso en curso (sin consultar a Gemini).',
                    '- **recomendacion**: el usuario describe su proyecto o actividad y recibe recursos **disponibles** del catalogo en `recomendaciones` (mismo formato que `POST /api/recomendaciones`).',
                    '- **fuera_de_tema**: cualquier otra pregunta; responde que solo ayuda con PoliRent y recursos.',
                    '',
                    '**Motor hibrido** (`motor`): con `GEMINI_API_KEY` las preguntas que el motor local no reconoce con seguridad las redacta Google Gemini, que solo puede elegir recursos de la lista enviada (los ids inventados se descartan). Las dudas claras se responden al instante con el motor local, y si Gemini falla, tarda o no hay clave tambien responde el motor local (preguntas frecuentes + TF-IDF). El nivel gratuito de Gemini puede tardar 10-20 s.',
                    '',
                    'Con token de estudiante, `prestamoActivo` es su solicitud activa mas reciente (o null). Puede tener como maximo `MAX_SOLICITUDES_ACTIVAS` (5) solicitudes activas: a \"¿cuantas solicitudes puedo hacer?\" responde con su cuenta real (`Tienes X de 5 solicitudes activas; puedes pedir N recurso(s) mas`). Un token invalido responde 401.'
                ].join('\n'),
                requestBody: {required: true, content: json({
                    type: 'object', required: ['mensaje'],
                    properties: {
                        mensaje: {type: 'string', minLength: 2, maxLength: 500, example: 'que me recomiendas si tengo que realizar una exposicion'},
                        historial: {type: 'array', maxItems: 10, description: 'Mensajes anteriores de la conversacion (opcional; solo los usa Gemini para entender continuaciones)',
                            items: {type: 'object', required: ['rol', 'texto'], properties: {rol: {type: 'string', enum: ['usuario', 'asistente']}, texto: {type: 'string', maxLength: 2000, example: 'Vamos a presentar nuestro proyecto en la feria de ciencias'}}}}
                    }
                })},
                responses: {
                    200: ok('Respuesta del asistente', {type: 'object', properties: {
                        tipo: {type: 'string', enum: ['ayuda', 'recomendacion', 'fuera_de_tema']},
                        respuesta: {type: 'string', description: 'Texto para mostrar en el chat'},
                        enlaces: {type: 'array', items: {type: 'object', properties: {texto: {type: 'string'}, ruta: {type: 'string', example: '/solicitudes'}}}},
                        recomendaciones: {type: 'array', items: {type: 'object', properties: {
                            recurso: ref('Recurso'), relevancia: {type: 'integer', nullable: true, minimum: 1, maximum: 100}, razon: {type: 'string'}}}},
                        prestamoActivo: {type: 'object', nullable: true, description: 'Solicitud activa mas reciente del estudiante (null si no tiene o sin sesion)', properties: {_id: {type: 'string'}, estado: {type: 'string', enum: ['pendiente', 'aprobado', 'entregado']}, recurso: {type: 'object', properties: {_id: {type: 'string'}, nombre: {type: 'string'}}}}},
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
                    'El recurso debe estar `disponible` y el estudiante puede tener como maximo **5 solicitudes activas** (`pendiente`, `aprobado` o `entregado`; `MAX_SOLICITUDES_ACTIVAS`). Al llegar al tope: 400 `Alcanzaste el maximo de 5 solicitudes activas; cancela una o espera la respuesta antes de solicitar otro recurso`. Dos solicitudes simultaneas no pueden superar el tope (la sobrante se borra y responde el mismo 400). Se notifica a los administradores.',
                    '',
                    '**Entrega (opcional, para pedir \"hoy para hoy\")**',
                    '- `fechaEntrega` (`AAAA-MM-DD`, por defecto hoy en Ecuador) y `horaEntrega` (`HH:mm`; por defecto, hoy: el momento actual, u otro dia: la apertura 07:00). Se guarda `fechaEntregaProgramada`.',
                    '- Sin `fechaEntrega` ni `horaEntrega` y fuera del horario (por ejemplo a las 20:00) se toma la proxima apertura (manana 07:00), para no romper a los clientes que no envian la entrega.',
                    '- La entrega no puede ser anterior a ahora (`La fecha y hora de entrega no pueden ser anteriores a ahora`) ni estar a mas de `RESERVA_MAX_DIAS_ANTICIPACION` (30) dias.',
                    '',
                    '**Devolucion**',
                    '- `fechaDevolucion`: `AAAA-MM-DD` (con `horaDevolucion` `HH:mm` o, por defecto, a las 18:00 de Ecuador) o fecha con hora (ISO 8601). Si trae hora y tambien llega `horaDevolucion`: 400 `Envia la hora de devolucion en un solo campo`.',
                    '- Debe ser **estrictamente posterior a la entrega** (`La hora de devolucion debe ser posterior a la hora de entrega`; se permite el mismo dia) y como maximo 30 dias calendario despues del dia de la entrega.',
                    '- El horario (07:00 a 18:00, `VALIDAR_HORARIO`) se valida sobre las horas **programadas** de entrega y devolucion, no sobre la hora de envio: se puede pedir a las 20:00 para manana a las 10:00.',
                    '',
                    '- `aceptaTerminos` debe ser `true` (ver `GET /api/terminos`). Se guarda la version aceptada.',
                    '- `docenteReferencia` es obligatorio. Solo lo ve el administrador para contactarlo si el estudiante no devuelve el recurso.',
                    '- Un estudiante con **penalizaciones pendientes** no puede solicitar (400 con el monto).'
                ].join('\n'),
                requestBody: {required: true, content: json({
                    type: 'object', required: ['recursoId', 'fechaDevolucion', 'aceptaTerminos', 'docenteReferencia'],
                    properties: {
                        recursoId: idMongo(`Recurso que se solicita (debe estar disponible). ${ORIGEN.recurso}`),
                        fechaEntrega: {type: 'string', format: 'date', description: 'Opcional. Dia en que el estudiante recibe el recurso (AAAA-MM-DD, hora de Ecuador). Por defecto hoy; maximo 30 dias de anticipacion', example: '2026-12-01'},
                        horaEntrega: {type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Opcional. Hora de entrega HH:mm (24 h, Ecuador) entre la apertura y el cierre (07:00-18:00). Por defecto: hoy, el momento actual; otro dia, la apertura', example: '10:00'},
                        fechaDevolucion: {type: 'string', description: 'Dia de devolucion AAAA-MM-DD (a las 18:00 o a `horaDevolucion`) o fecha con hora ISO 8601. Posterior a la entrega y como maximo 30 dias calendario despues', example: '2026-12-03'},
                        horaDevolucion: {type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: 'Opcional. Hora de devolucion HH:mm (Ecuador) dentro del horario; solo si `fechaDevolucion` es un dia sin hora. Por defecto 18:00', example: '16:30'},
                        motivoPrestamo: {type: 'string', maxLength: 300, description: 'Motivo del prestamo: para que actividad o proyecto academico usara el recurso (opcional, maximo 300 caracteres)', example: 'Proyecto de robotica'},
                        aceptaTerminos: {type: 'boolean', enum: [true], description: 'El estudiante acepta los terminos de `GET /api/terminos`. Tambien se acepta el texto "true"', example: true},
                        docenteReferencia: {...ref('DocenteReferencia')}
                    }
                }, {
                    recursoId: ID_EJEMPLO, fechaEntrega: '2026-12-01', horaEntrega: '10:00', fechaDevolucion: '2026-12-03', horaDevolucion: '16:30', motivoPrestamo: 'Proyecto de robotica', aceptaTerminos: true,
                    docenteReferencia: {nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@epn.edu.ec', telefono: '0991234567'}
                })},
                responses: {
                    201: ok('Solicitud creada en estado pendiente', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: {description: 'Datos invalidos, terminos sin aceptar, sin docente, horas fuera de horario o en orden incorrecto, recurso no disponible, maximo de solicitudes o penalizaciones pendientes', content: {'application/json': {schema: ref('Error'), examples: {
                        maximo: {value: {msg: 'Alcanzaste el maximo de 5 solicitudes activas; cancela una o espera la respuesta antes de solicitar otro recurso'}},
                        orden: {value: {msg: 'La hora de devolucion debe ser posterior a la hora de entrega'}},
                        pasado: {value: {msg: 'La fecha y hora de entrega no pueden ser anteriores a ahora'}},
                        dosCampos: {value: {msg: 'Envia la hora de devolucion en un solo campo'}},
                        horario: {value: {msg: 'La hora de entrega debe estar entre las 07:00 y las 18:00 (hora de Ecuador)'}},
                        anticipacion: {value: {msg: 'La entrega no se puede programar con mas de 30 dias de anticipacion'}},
                        deuda: {value: {msg: 'Tienes penalizaciones pendientes por $9.00. Regularizalas con la asociacion antes de solicitar otro recurso'}}
                    }}}},
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
                description: 'Solo una solicitud `pendiente` (400 `Solo se puede cancelar una solicitud pendiente`); una ajena o inexistente responde 404. La respuesta trae `recurso` con su `nombre` y **no** incluye datos de devolucion (`fechaDevolucionProgramada`, `fechaDevolucionReal`, `devolucion`).',
                parameters: [idRuta('IdPrestamo')],
                responses: {
                    200: ok('Solicitud cancelada', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: error('La solicitud no esta pendiente', 'Solo se puede cancelar una solicitud pendiente'),
                    401: r401, 403: r403, 404: error('No existe o no es tuya', 'Solicitud no encontrada')
                }
            }
        },
        '/api/prestamos/{id}': {
            get: {
                tags: ['Prestamos - Estudiante (HU-007, HU-008)'], summary: 'Ver un prestamo (dueño o administrador)', operationId: 'detallePrestamo', security: conToken,
                description: 'Sirve para consultar el prestamo durante la entrega o la devolucion. El estudiante solo ve los suyos; el administrador recibe ademas los datos del estudiante. `recurso` incluye `precio`.',
                parameters: [idRuta('IdPrestamo')],
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
                parameters: [idRuta('IdPrestamo')],
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
                parameters: [idRuta('IdPrestamo')],
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
                description: 'Solo desde `pendiente`. El motivo es obligatorio, de `MOTIVO_RECHAZO_MIN` a `MOTIVO_RECHAZO_MAX` caracteres (30 a 200) sin espacios sobrantes; se notifica al estudiante con el motivo.',
                parameters: [idRuta('IdPrestamo')],
                requestBody: {required: true, content: json({type: 'object', required: ['motivoRechazo'], properties: {
                    motivoRechazo: {type: 'string', minLength: 30, maxLength: 200, description: 'Motivo por el que el administrador rechaza la solicitud (30 a 200 caracteres). Antes se llamaba `motivo`', example: 'El recurso esta reservado para un evento de la asociacion esa semana'}
                }}, {motivoRechazo: 'El recurso esta reservado para un evento de la asociacion esa semana'})},
                responses: {
                    200: ok('Solicitud rechazada', {type: 'object', properties: {msg: {type: 'string'}, prestamo: ref('Prestamo')}}),
                    400: {description: 'Motivo vacio o fuera de rango, o la solicitud no esta pendiente', content: {'application/json': {schema: ref('Error'), examples: {
                        vacio: {value: {msg: 'El motivo de rechazo es obligatorio'}},
                        nombreViejo: {value: {msg: 'El campo motivo ahora se llama motivoRechazo'}},
                        rango: {value: {msg: 'El motivo de rechazo debe tener entre 30 y 200 caracteres'}},
                        estado: {value: {msg: 'No se puede rechazar una solicitud aprobado'}}
                    }}}},
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
                parameters: [idRuta('IdPrestamo')],
                requestBody: camposMovimiento(true),
                responses: {
                    200: ok('Entrega registrada', respuestaMovimiento),
                    400: error('Id o datos invalidos, prestamo no aprobado, antes de la hora programada o fuera de horario', 'Esta solicitud esta programada para el 01/12/2026 10:00, no se puede entregar antes'),
                    401: r401, 403: r403, 404: error('No existe', 'Solicitud no encontrada'),
                    503: r503Cloudinary
                }
            }
        },
        '/api/prestamos/{id}/devolver': {
            put: {
                tags: ['Prestamos - Administrador (HU-003)'], summary: 'Registrar la devolucion de un prestamo entregado (administrador)', operationId: 'devolverPrestamo', security: conToken,
                description: `Alternativa al escaneo del QR. El prestamo debe estar \`entregado\`. JSON o \`multipart/form-data\`.\n\n${reglasMovimiento}`,
                parameters: [idRuta('IdPrestamo')],
                requestBody: conEjemplo(camposMovimiento(true), {responsable: 'Maria Lopez', observaciones: 'Se recibe completo y limpio, con su funda', condicion: 'bueno'}),
                responses: {
                    200: ok('Devolucion registrada', respuestaMovimiento, {
                        msg: 'Devolucion registrada correctamente', accion: 'devolucion',
                        recurso: {_id: ID_EJEMPLO, nombre: 'Kit Arduino Uno', estado: 'disponible'},
                        penalizaciones: [{_id: ID_EJEMPLO, tipo: 'atraso', monto: 4.5, diasAtraso: 2, descripcion: 'Atraso de 2 dia(s) en la devolucion', estado: 'pendiente'}],
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
                                enRevision: {type: 'object', description: 'Con comprobante subido, a la espera de revision', properties: {cantidad: {type: 'integer'}, monto: {type: 'number'}}},
                                pagadas: {type: 'object', properties: {cantidad: {type: 'integer'}, monto: {type: 'number'}}},
                                anuladas: {type: 'object', properties: {cantidad: {type: 'integer'}}},
                                montoPorTipo: {type: 'object', description: 'Monto no anulado por tipo', properties: {atraso: {type: 'number'}, danio: {type: 'number'}, perdida: {type: 'number'}}},
                                recaudado: {type: 'object', description: 'Dinero recaudado: solo penalizaciones `pagada`, ordenado de mayor a menor monto; porcentajes con 1 decimal que suman 100. Ej.: de $100 recaudados, $25 (25 %) fueron por el balon de voley. Sin datos: total 0 y listas vacias', properties: {
                                    total: {type: 'number', example: 100},
                                    porRecurso: {type: 'array', items: {type: 'object', properties: {
                                        recurso: {...idMongo(ORIGEN.recurso), nullable: true}, nombre: {type: 'string', description: '`Recurso eliminado` si ya no existe', example: 'Balon de voley'},
                                        cantidad: {type: 'integer', example: 2}, monto: {type: 'number', example: 25}, porcentaje: {type: 'number', example: 25}
                                    }}},
                                    porTipo: {type: 'array', items: {type: 'object', properties: {
                                        tipo: {type: 'string', enum: TIPOS_PENALIZACION}, cantidad: {type: 'integer'}, monto: {type: 'number'}, porcentaje: {type: 'number'}
                                    }}}
                                }}
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
                description: 'Una fila por penalizacion: estudiante, cedula, correo, recurso, tipo, monto, dias, estado, fecha de registro (`Registrada el`, `fechaRegistro`), fecha de pago (`Pagada el`, `fechaPago`), motivo de anulacion, URL del comprobante, referencia y fecha de revision. Con `formato=csv` se descarga.',
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
                    400: error('Filtro invalido', 'El estado debe ser: pendiente, en_revision, pagada, anulada'), 401: r401, 403: r403
                }
            }
        },

        // ---------------- Penalizaciones ----------------
        '/api/terminos': {
            get: {
                tags: ['Penalizaciones'], summary: 'Terminos y condiciones (publico)', operationId: 'verTerminos',
                description: 'Tarifas (porcentajes del precio del recurso), horario de entrega y devolucion, `maxSolicitudesActivas` y las condiciones que el estudiante acepta al solicitar (`aceptaTerminos`). Los valores salen de las variables `PENALIZACION_*`, `HORARIO_*` y `MAX_SOLICITUDES_ACTIVAS`.',
                responses: {200: ok('Terminos vigentes', ref('Terminos'))}
            }
        },
        '/api/penalizaciones/mis': {
            get: {
                tags: ['Penalizaciones'], summary: 'Ver mis penalizaciones (estudiante)', operationId: 'misPenalizaciones', security: conToken,
                description: '`totalAdeudado` suma las `pendiente` y las `en_revision` (siguen siendo deuda y bloquean nuevas solicitudes hasta que el administrador confirme el pago); `totalEnRevision` es la parte con comprobante enviado. `atrasoEnCurso` lista los prestamos entregados con la fecha vencida y lo que acumulan hasta ahora; se calcula al vuelo y se cobra al registrar la devolucion. Cada penalizacion trae su `comprobante` y `motivoRechazoComprobante`.',
                parameters: [query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PENALIZACION})],
                responses: {
                    200: ok('Mis penalizaciones', {type: 'object', properties: {
                        total: {type: 'integer'},
                        totalAdeudado: {type: 'number', description: 'Pendientes + en revision', example: 9},
                        totalEnRevision: {type: 'number', example: 0},
                        totalAtrasoEnCurso: {type: 'number', example: 4.5},
                        atrasoEnCurso: {type: 'array', items: {type: 'object', properties: {
                            prestamo: ID_SCHEMA, recurso: {type: 'object', properties: {_id: ID_SCHEMA, nombre: {type: 'string'}}},
                            diasAtraso: {type: 'integer'}, montoAcumulado: {type: 'number'}
                        }}},
                        penalizaciones: {type: 'array', items: ref('Penalizacion')}
                    }}),
                    400: error('Filtro invalido', 'El estado debe ser: pendiente, en_revision, pagada, anulada'), 401: r401, 403: r403
                }
            }
        },
        '/api/penalizaciones/{id}/comprobante': {
            put: {
                tags: ['Penalizaciones'], summary: 'Enviar el comprobante de pago (estudiante)', operationId: 'enviarComprobante', security: conToken,
                description: [
                    'El estudiante sube la foto del comprobante de pago de **su** penalizacion en `multipart/form-data` (campo `comprobante`, JPG, PNG o WEBP, maximo 2 MB).',
                    '',
                    '- Solo desde `pendiente` o `en_revision`. La penalizacion pasa a `en_revision` y sigue contando como deuda hasta que el administrador la marque como pagada.',
                    '- En `en_revision` el comprobante nuevo reemplaza al anterior (la imagen anterior se borra de Cloudinary).',
                    '- Se notifica a todos los administradores. Si el administrador rechaza el comprobante, la penalizacion vuelve a `pendiente` con `motivoRechazoComprobante` y se puede enviar otro.',
                    '- Una penalizacion inexistente o de otro estudiante responde 404 con el mismo mensaje.'
                ].join('\n'),
                parameters: [idRuta('IdPenalizacion')],
                requestBody: {required: true, content: {'multipart/form-data': {schema: {
                    type: 'object', required: ['comprobante'],
                    properties: {
                        comprobante: {type: 'string', format: 'binary', description: 'Foto del comprobante (JPG, PNG o WEBP, maximo 2 MB)'},
                        referencia: {type: 'string', minLength: 3, maxLength: 50, description: 'Opcional: numero de la transferencia o del deposito', example: 'TRX-004512'},
                        observaciones: {type: 'string', maxLength: 200, description: 'Opcional', example: 'Deposito en Banco Pichincha'}
                    }
                }}}},
                responses: {
                    200: ok('Comprobante enviado', {type: 'object', properties: {msg: {type: 'string', example: 'Comprobante enviado, el administrador lo revisara'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Id o datos invalidos, falta el archivo, archivo que no es imagen o mayor a 2 MB, o la penalizacion no esta pendiente ni en revision', 'Adjunta el comprobante de pago'),
                    401: r401, 403: r403,
                    404: error('No existe o no es tuya', 'Penalizacion no encontrada'),
                    503: error('Cloudinary no configurado', 'La subida de imagenes no esta disponible: falta configurar Cloudinary')
                }
            }
        },
        '/api/penalizaciones': {
            get: {
                tags: ['Penalizaciones'], summary: 'Listar penalizaciones (administrador)', operationId: 'listarPenalizaciones', security: conToken,
                description: 'Con los datos del estudiante (nombres, apellidos, cedula, correo), del recurso y del prestamo (incluido el docente de referencia). `?estado=en_revision` devuelve la cola de comprobantes por revisar; cada penalizacion trae `comprobante.url`.',
                parameters: [
                    query('estado', 'Filtra por estado', {type: 'string', enum: ESTADOS_PENALIZACION}, 'pendiente'),
                    query('usuario', `Id del estudiante. ${ORIGEN.usuario}`, idMongo(ORIGEN.usuario)),
                    query('desde', 'Fecha inicial (AAAA-MM-DD) de registro', {type: 'string', format: 'date'}, '2026-10-01'),
                    query('hasta', 'Fecha final (AAAA-MM-DD), incluye todo ese dia', {type: 'string', format: 'date'}, '2026-10-31')
                ],
                responses: {
                    200: ok('Penalizaciones', {type: 'object', properties: {
                        total: {type: 'integer'}, totalPendiente: {type: 'number', description: 'Suma de las pendientes del listado'},
                        totalEnRevision: {type: 'number', description: 'Suma de las en revision del listado'}, penalizaciones: {type: 'array', items: ref('Penalizacion')}
                    }}),
                    400: error('Filtro invalido', 'El id del usuario no es valido'), 401: r401, 403: r403
                }
            }
        },
        '/api/penalizaciones/{id}/pagar': {
            put: {
                tags: ['Penalizaciones'], summary: 'Aceptar el comprobante o registrar el pago (administrador)', operationId: 'pagarPenalizacion', security: conToken,
                description: '**Es la ruta para aceptar el comprobante de pago.** Desde `en_revision` (el administrador reviso el comprobante y es correcto) o desde `pendiente` (pago en efectivo sin comprobante). Guarda `fechaPago` y la revision, conserva el comprobante como respaldo y notifica al estudiante.',
                parameters: [idRuta('IdPenalizacion')],
                responses: {
                    200: ok('Pago registrado', {type: 'object', properties: {msg: {type: 'string'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Id invalido o la penalizacion no esta pendiente ni en revision', 'Solo se pueden pagar penalizaciones pendientes o en revision'),
                    401: r401, 403: r403, 404: error('No existe', 'Penalizacion no encontrada')
                }
            }
        },
        '/api/penalizaciones/{id}/rechazar-comprobante': {
            put: {
                tags: ['Penalizaciones'], summary: 'Rechazar el comprobante de pago (administrador)', operationId: 'rechazarComprobante', security: conToken,
                description: 'Solo desde `en_revision`. La penalizacion vuelve a `pendiente`, se guarda `motivoRechazoComprobante`, se borra la imagen de Cloudinary y se notifica al estudiante con el motivo (puede enviar otro comprobante).',
                parameters: [idRuta('IdPenalizacion')],
                requestBody: {required: true, content: json({type: 'object', required: ['motivoRechazoComprobante'], properties: {motivoRechazoComprobante: {type: 'string', minLength: 3, maxLength: 200, description: 'Por que el administrador rechaza el comprobante de pago (3 a 200 caracteres); el estudiante lo ve. Antes se llamaba `motivo`', example: 'La foto no se lee'}}})},
                responses: {
                    200: ok('Comprobante rechazado', {type: 'object', properties: {msg: {type: 'string'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Sin motivo (o enviado como `motivo`), id invalido o la penalizacion no esta en revision', 'Solo se puede rechazar el comprobante de una penalizacion en revision'),
                    401: r401, 403: r403, 404: error('No existe', 'Penalizacion no encontrada')
                }
            }
        },
        '/api/penalizaciones/{id}/anular': {
            put: {
                tags: ['Penalizaciones'], summary: 'Anular una penalizacion (administrador)', operationId: 'anularPenalizacion', security: conToken,
                description: 'Solo sobre penalizaciones `pendiente` o `en_revision`, por ejemplo cuando el estudiante repone el articulo perdido. Notifica al estudiante.',
                parameters: [idRuta('IdPenalizacion')],
                requestBody: {required: true, content: json({type: 'object', required: ['motivoAnulacion'], properties: {motivoAnulacion: {type: 'string', minLength: 3, maxLength: 200, description: 'Por que se anula la penalizacion (3 a 200 caracteres). Antes se llamaba `motivo`', example: 'El estudiante repuso el articulo'}}})},
                responses: {
                    200: ok('Penalizacion anulada', {type: 'object', properties: {msg: {type: 'string'}, penalizacion: ref('Penalizacion')}}),
                    400: error('Sin motivo, id invalido o la penalizacion no esta pendiente ni en revision', 'El motivo de la anulacion debe tener entre 3 y 200 caracteres'),
                    401: r401, 403: r403, 404: error('No existe', 'Penalizacion no encontrada')
                }
            }
        },

        // ---------------- Notificaciones ----------------
        '/api/notificaciones': {
            get: {
                tags: ['Notificaciones (HU-010)'], summary: 'Consultar mis notificaciones', operationId: 'misNotificaciones', security: conToken,
                description: 'Disponible para estudiantes y administradores. Al consultar, el sistema genera los avisos de devolucion: `recordatorio` cuando faltan 2 dias o menos y `vencido` cuando la fecha ya paso (una sola vez por prestamo; recuerda que cada dia de atraso genera una penalizacion). Ademas el servidor envia recordatorios automaticos (`recordatorio`, `Recuerda devolver <recurso> el dd/MM/yyyy a las HH:mm`) `RECORDATORIO_HORAS_ANTES` horas antes de la devolucion (24 y 1 por defecto), sin duplicados. El tipo `penalizacion` avisa de penalizaciones registradas, pagadas o anuladas. Si el SMTP esta configurado, las notificaciones tambien llegan al correo institucional.',
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
                parameters: [idRuta('IdNotificacion')],
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
                parameters: [idRuta('IdUsuario')],
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
