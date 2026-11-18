// Banco de pruebas de calidad del recomendador: consultas en espanol natural (como las escribe un estudiante)
// contra el catalogo real. Lo usa tests/recomendacionCalidad.test.js.
import RECURSOS_SEED from '../src/seed/recursosSeed.js'
import PRECIOS_RECURSOS from '../src/seed/preciosRecursos.js'

// Recursos que ya estan cargados en la base pero no en la semilla (aparecen solo en preciosRecursos.js).
// Su descripcion y etiquetas reales no estan en el repositorio: se aproximan con el formato de la semilla
// (3 etiquetas del vocabulario de GRUPOS_RELACIONADOS) a partir del nombre.
const CARGADOS = [
    ['Cable de red UTP', 'tecnico', 'Cable UTP categoria 6 para redes', ['cable', 'ethernet', 'redes']],
    ['Kit Arduino Uno', 'tecnico', 'Placa Arduino con cables y protoboard', ['arduino', 'robotica', 'microcontrolador']],
    ['Multimetro digital', 'tecnico', 'Multimetro para voltaje, corriente y resistencia', ['multimetro', 'electronica', 'medicion']],
    ['Raspberry Pi 4', 'tecnico', 'Mini computadora para proyectos IoT', ['raspberry', 'iot', 'programacion']],
    ['Router Cisco', 'tecnico', 'Router para practicas de redes', ['router', 'cisco', 'redes']],
    ['Soldador de estano', 'tecnico', 'Cautin de 60 W con estano', ['soldador', 'cautin', 'electronica']],
    ['Switch de 24 puertos', 'tecnico', 'Switch administrable para laboratorio de redes', ['switch', 'ethernet', 'redes']],
    ['Calculadora cientifica', 'academico', 'Calculadora para calculo y estadistica', ['calculadora', 'cientifica', 'matematica']],
    ['Camara reflex', 'academico', 'Camara DSLR con lente 18-55 mm', ['camara', 'fotografia', 'video']],
    ['Kit de iluminacion LED', 'academico', 'Panel LED para grabaciones', ['iluminacion', 'led', 'video']],
    ['Laptop Dell', 'academico', 'Laptop para programacion y presentaciones', ['laptop', 'programacion', 'presentacion']],
    ['Libro de Calculo', 'academico', 'Texto de calculo diferencial e integral', ['calculo', 'libro', 'matematica']],
    ['Microfono inalambrico', 'academico', 'Microfono de solapa inalambrico', ['microfono', 'audio', 'conferencia']],
    ['Monitor externo 24 pulgadas', 'academico', 'Monitor Full HD con HDMI', ['monitor', 'hdmi', 'programacion']],
    ['Proyector Epson', 'academico', 'Proyector HD con HDMI para exposiciones', ['proyector', 'presentacion', 'exposicion']],
    ['Puntero laser', 'academico', 'Puntero laser para presentaciones', ['puntero', 'presentacion', 'exposicion']],
    ['Puntero laser 2', 'academico', 'Puntero laser para presentaciones', ['puntero', 'presentacion', 'exposicion']],
    ['Tripode profesional', 'academico', 'Tripode para camara y celular', ['tripode', 'camara', 'video']],
    ['Ajedrez', 'recreativo', 'Tablero de ajedrez con piezas', ['ajedrez', 'juego', 'mesa']],
    ['Balon de futbol', 'recreativo', 'Balon numero 5 de futbol', ['futbol', 'deporte', 'torneo']],
    ['Domino', 'recreativo', 'Juego de domino', ['domino', 'juego', 'mesa']]
]

const nombresSemilla = new Set(RECURSOS_SEED.map(r => r.nombre))
const CATALOGO = [
    ...RECURSOS_SEED,
    ...CARGADOS.filter(([nombre]) => !nombresSemilla.has(nombre))
        .map(([nombre, categoria, descripcion, etiquetas]) => ({nombre, categoria, descripcion, etiquetas, precio: PRECIOS_RECURSOS[nombre]}))
].map((r, i) => ({...r, _id: `64b7f0f2a1b2c3d4e5f6${String(i).padStart(4, '0')}`, estado: 'disponible', imagen: ''}))

// [consulta, recursos que deben aparecer entre los 5 primeros]. "Puntero laser*" acepta cualquier nombre que empiece asi.
const CASOS = [
    // obligatorios
    ['levantamiento topografico en campo', ['Teodolito electronico', 'GPS de mano']],
    ['voy a exponer mi tesis en el auditorio', ['Proyector Epson', 'Puntero laser*', 'Clicker inalambrico']],
    ['quiero hacer un robot que mida distancia', ['Kit de sensores Arduino']],
    ['grabar un cortometraje', ['Camara reflex']],
    ['practica de laboratorio de quimica', ['Balanza analitica', 'Kit de cristaleria de laboratorio']],
    ['armar una red de computadoras', ['Switch de 24 puertos', 'Cable de red UTP']],
    ['proyecto de inteligencia artificial', ['Laptop con GPU']],
    ['feria de emprendimiento con stand', ['Carpa plegable 3x3', 'Mesas plegables']],
    ['torneo de futbol', ['Balon de futbol']],
    ['necesito soldar un circuito', ['Soldador de estano']],
    ['imprimir una pieza en 3d', ['Impresora 3D']],
    ['clase de estadistica', ['Libro de Estadistica']],
    ['transmitir una clase en vivo', ['Webcam Full HD']],
    ['salida de campo de geologia', ['GPS de mano']],
    // electronica, robotica y redes
    ['necesito medir el voltaje de un circuito', ['Multimetro digital']],
    ['robot seguidor de linea para el concurso', ['Chasis de robot seguidor de linea']],
    ['brazo robotico con servos', ['Kit de servomotores']],
    ['proyecto de domotica con wifi', ['Placa ESP32']],
    ['proyecto iot con raspberry', ['Raspberry Pi 4']],
    ['aprender a programar arduino', ['Kit Arduino Uno']],
    ['practica de electronica con osciloscopio', ['Osciloscopio digital']],
    ['fuente de alimentacion para el laboratorio de electrica', ['Fuente de voltaje regulable']],
    ['practica de redes con cisco', ['Router Cisco']],
    ['ponchar cables de red', ['Ponchadora RJ45']],
    ['configurar una red inalambrica', ['Router inalambrico WiFi']],
    // software y computo
    ['desarrollo de software para la materia', ['Laptop Dell']],
    ['hacer una app para la feria de proyectos', ['Laptop Dell']],
    ['respaldar los datos del proyecto', ['Disco duro externo 1 TB']],
    ['conectar mi laptop al proyector', ['Adaptador HDMI multipuerto']],
    ['tomar apuntes digitales en clase', ['Tablet con lapiz digital']],
    // presentaciones, audio y video
    ['pasar diapositivas en la sustentacion', ['Clicker inalambrico']],
    ['grabar un podcast', ['Microfono de condensador USB']],
    ['sonido para una conferencia en el auditorio', ['Microfono inalambrico']],
    ['grabar video con el celular sin que tiemble', ['Estabilizador gimbal']],
    ['sesion de fotografia con iluminacion de estudio', ['Softbox de iluminacion']],
    ['tomar fotos del evento de bienvenida', ['Camara reflex']],
    ['mapeo aereo con dron', ['Dron con camara']],
    // laboratorio y ciencias
    ['ver celulas en el microscopio para biologia', ['Microscopio optico']],
    ['medir el ph de una solucion', ['Medidor de pH digital']],
    ['estudiar fisica para el examen', ['Libro de Fisica General']],
    ['necesito una calculadora para el examen de calculo', ['Calculadora cientifica']],
    // taller y prototipado
    ['medir piezas en el taller mecanico', ['Calibrador vernier digital']],
    ['construir una maqueta para la casa abierta', ['Pistola de silicona']],
    ['arreglar una mesa con herramientas', ['Caja de herramientas']],
    ['proyecto de energia solar', ['Kit de energia solar']],
    ['necesito una extension electrica para el stand', ['Extension electrica de 10 metros']],
    // eventos, deportes y recreacion
    ['vamos a organizar una casa abierta', ['Carpa plegable 3x3']],
    ['torneo de voley interfacultades', ['Balon de voley']],
    ['campeonato de basquet', ['Balon de basquet']],
    ['entrenamiento de futbol con conos', ['Conos de entrenamiento']],
    ['necesito chalecos para dividir los equipos', ['Juego de chalecos deportivos']],
    ['partido de pingpong', ['Kit de pingpong']],
    ['torneo de videojuegos', ['Consola de videojuegos']],
    ['experiencia de realidad virtual para la casa abierta', ['Gafas de realidad virtual']],
    ['noche de juegos de mesa', ['Naipes', 'Ajedrez']],
    ['evento cultural con musica en vivo', ['Guitarra acustica', 'Amplificador con microfono']],
    ['reunion de planificacion con lluvia de ideas', ['Rotafolio']],
    ['taller de capacitacion para estudiantes', ['Pizarra acrilica movil']]
]

// true si el recurso esperado (o uno que empiece igual, con "*") esta en la lista de nombres
const contiene = (nombres, esperado) => esperado.endsWith('*')
    ? nombres.some(n => n.startsWith(esperado.slice(0, -1)))
    : nombres.includes(esperado)

export {CATALOGO, CASOS, contiene}
