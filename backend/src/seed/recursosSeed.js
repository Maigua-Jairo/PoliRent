// Recursos de ejemplo para alimentar el catalogo y el motor de recomendaciones (HU-009).
// Mismo formato que los recursos ya cargados: 3 etiquetas en minuscula, singular y sin tildes,
// tomadas del vocabulario de GRUPOS_RELACIONADOS (helpers/recomendacionHelper.js).
// Se cargan con `npm run seed`; los que ya existen (mismo nombre) se omiten.
// El precio de reposicion (base de las penalizaciones) sale de PRECIOS_RECURSOS por nombre exacto.
import PRECIOS_RECURSOS from './preciosRecursos.js'

const RECURSOS_BASE = [
    // ---------- tecnico: electronica, robotica, redes, energia, taller y prototipado ----------
    {nombre: 'Kit de sensores Arduino', categoria: 'tecnico', descripcion: 'Set de 37 sensores compatibles con Arduino', etiquetas: ['sensor', 'arduino', 'robotica']},
    {nombre: 'Protoboard de 830 puntos', categoria: 'tecnico', descripcion: 'Protoboard con juego de cables jumper', etiquetas: ['protoboard', 'circuito', 'electronica']},
    {nombre: 'Placa ESP32', categoria: 'tecnico', descripcion: 'Microcontrolador con WiFi y Bluetooth para proyectos IoT', etiquetas: ['esp32', 'iot', 'microcontrolador']},
    {nombre: 'Kit de servomotores', categoria: 'tecnico', descripcion: 'Cuatro servos SG90 con accesorios de montaje', etiquetas: ['servo', 'motor', 'robotica']},
    {nombre: 'Chasis de robot seguidor de linea', categoria: 'tecnico', descripcion: 'Chasis con motores, ruedas y sensores infrarrojos', etiquetas: ['robot', 'seguidor', 'sensor']},
    {nombre: 'Fuente de voltaje regulable', categoria: 'tecnico', descripcion: 'Fuente DC de 0 a 30 V y 5 A para laboratorio', etiquetas: ['fuente', 'voltaje', 'electrica']},
    {nombre: 'Osciloscopio digital', categoria: 'tecnico', descripcion: 'Osciloscopio de dos canales y 100 MHz', etiquetas: ['osciloscopio', 'electronica', 'medicion']},
    {nombre: 'Ponchadora RJ45', categoria: 'tecnico', descripcion: 'Ponchadora con conectores RJ45 y probador de cable', etiquetas: ['ponchadora', 'rj45', 'redes']},
    {nombre: 'Router inalambrico WiFi', categoria: 'tecnico', descripcion: 'Router doble banda para practicas de conectividad', etiquetas: ['wifi', 'router', 'redes']},
    {nombre: 'Impresora 3D', categoria: 'tecnico', descripcion: 'Impresora 3D con cama caliente y filamento PLA', etiquetas: ['impresora', '3d', 'prototipo']},
    {nombre: 'Taladro inalambrico', categoria: 'tecnico', descripcion: 'Taladro con bateria y juego de brocas', etiquetas: ['taladro', 'herramienta', 'taller']},
    {nombre: 'Caja de herramientas', categoria: 'tecnico', descripcion: 'Destornilladores, alicates, llaves y flexometro', etiquetas: ['herramienta', 'mecanica', 'taller']},
    {nombre: 'Calibrador vernier digital', categoria: 'tecnico', descripcion: 'Calibrador de 150 mm con pantalla digital', etiquetas: ['calibrador', 'medicion', 'mecanica']},
    {nombre: 'Pistola de silicona', categoria: 'tecnico', descripcion: 'Pistola de silicona caliente con barras para maquetas', etiquetas: ['silicona', 'maqueta', 'prototipo']},
    {nombre: 'Dron con camara', categoria: 'tecnico', descripcion: 'Dron con camara HD y dos baterias', etiquetas: ['dron', 'camara', 'vuelo']},
    {nombre: 'Kit de energia solar', categoria: 'tecnico', descripcion: 'Panel solar pequeno con regulador y bateria', etiquetas: ['solar', 'energia', 'bateria']},
    {nombre: 'Extension electrica de 10 metros', categoria: 'tecnico', descripcion: 'Extension con regleta de 6 tomas', etiquetas: ['extension', 'regleta', 'electrica']},

    // ---------- academico: presentaciones, audio y video, laboratorio, ciencias, computo, campo ----------
    {nombre: 'Pantalla de proyeccion', categoria: 'academico', descripcion: 'Pantalla de 100 pulgadas con tripode', etiquetas: ['pantalla', 'proyector', 'presentacion']},
    {nombre: 'Parlante portatil', categoria: 'academico', descripcion: 'Parlante Bluetooth con entrada de microfono', etiquetas: ['parlante', 'audio', 'presentacion']},
    {nombre: 'Adaptador HDMI multipuerto', categoria: 'academico', descripcion: 'Adaptador USB-C a HDMI, VGA y USB', etiquetas: ['adaptador', 'hdmi', 'presentacion']},
    {nombre: 'Clicker inalambrico', categoria: 'academico', descripcion: 'Control para pasar diapositivas en exposiciones', etiquetas: ['clicker', 'diapositiva', 'exposicion']},
    {nombre: 'Microfono de condensador USB', categoria: 'academico', descripcion: 'Microfono para podcast y grabacion de voz', etiquetas: ['microfono', 'podcast', 'audio']},
    {nombre: 'Webcam Full HD', categoria: 'academico', descripcion: 'Camara web 1080p para clases y transmisiones', etiquetas: ['webcam', 'streaming', 'video']},
    {nombre: 'Estabilizador gimbal', categoria: 'academico', descripcion: 'Gimbal de tres ejes para celular', etiquetas: ['gimbal', 'estabilizador', 'video']},
    {nombre: 'Softbox de iluminacion', categoria: 'academico', descripcion: 'Par de softbox con lamparas para estudio', etiquetas: ['softbox', 'iluminacion', 'fotografia']},
    {nombre: 'Tarjeta de memoria SD 128 GB', categoria: 'academico', descripcion: 'Tarjeta SD clase 10 para camaras', etiquetas: ['memoria', 'sd', 'camara']},
    {nombre: 'Microscopio optico', categoria: 'academico', descripcion: 'Microscopio con aumento de hasta 1000x', etiquetas: ['microscopio', 'biologia', 'laboratorio']},
    {nombre: 'Balanza analitica', categoria: 'academico', descripcion: 'Balanza de precision de 0.001 g', etiquetas: ['balanza', 'quimica', 'laboratorio']},
    {nombre: 'Kit de cristaleria de laboratorio', categoria: 'academico', descripcion: 'Probetas, matraces y pipetas', etiquetas: ['probeta', 'matraz', 'laboratorio']},
    {nombre: 'Medidor de pH digital', categoria: 'academico', descripcion: 'Medidor de pH y temperatura para soluciones', etiquetas: ['ph', 'quimica', 'laboratorio']},
    {nombre: 'Calculadora graficadora', categoria: 'academico', descripcion: 'Calculadora graficadora para algebra y calculo', etiquetas: ['graficadora', 'calculadora', 'matematica']},
    {nombre: 'Libro de Fisica General', categoria: 'academico', descripcion: 'Texto de mecanica, ondas y termodinamica', etiquetas: ['fisica', 'libro', 'estudio']},
    {nombre: 'Libro de Estadistica', categoria: 'academico', descripcion: 'Texto de probabilidad y estadistica para ingenieria', etiquetas: ['estadistica', 'libro', 'matematica']},
    {nombre: 'Tablet con lapiz digital', categoria: 'academico', descripcion: 'Tablet para tomar apuntes y leer material de estudio', etiquetas: ['tablet', 'estudio', 'investigacion']},
    {nombre: 'Laptop con GPU', categoria: 'academico', descripcion: 'Laptop con tarjeta grafica para inteligencia artificial', etiquetas: ['gpu', 'datos', 'programacion']},
    {nombre: 'Disco duro externo 1 TB', categoria: 'academico', descripcion: 'Disco USB para respaldos y datos', etiquetas: ['disco', 'usb', 'datos']},
    {nombre: 'Teodolito electronico', categoria: 'academico', descripcion: 'Teodolito para practicas de topografia', etiquetas: ['teodolito', 'topografia', 'civil']},
    {nombre: 'GPS de mano', categoria: 'academico', descripcion: 'GPS para salidas de campo y mapeo', etiquetas: ['gps', 'campo', 'mapeo']},
    {nombre: 'Pizarra acrilica movil', categoria: 'academico', descripcion: 'Pizarra con ruedas y marcadores', etiquetas: ['pizarra', 'marcador', 'taller']},
    {nombre: 'Rotafolio', categoria: 'academico', descripcion: 'Rotafolio con papelografos para reuniones', etiquetas: ['rotafolio', 'papelografo', 'reunion']},

    // ---------- recreativo: deportes, juegos, videojuegos, eventos y musica ----------
    {nombre: 'Balon de voley', categoria: 'recreativo', descripcion: 'Balon oficial de voleibol', etiquetas: ['voley', 'deporte', 'torneo']},
    {nombre: 'Balon de basquet', categoria: 'recreativo', descripcion: 'Balon numero 7 de baloncesto', etiquetas: ['basquet', 'deporte', 'torneo']},
    {nombre: 'Kit de pingpong', categoria: 'recreativo', descripcion: 'Dos raquetas, red y pelotas', etiquetas: ['pingpong', 'raqueta', 'juego']},
    {nombre: 'Juego de chalecos deportivos', categoria: 'recreativo', descripcion: 'Doce chalecos de dos colores para equipos', etiquetas: ['chaleco', 'deporte', 'campeonato']},
    {nombre: 'Conos de entrenamiento', categoria: 'recreativo', descripcion: 'Set de 20 conos con silbato', etiquetas: ['cono', 'silbato', 'deporte']},
    {nombre: 'Naipes', categoria: 'recreativo', descripcion: 'Baraja de naipes para juegos de mesa', etiquetas: ['carta', 'juego', 'mesa']},
    {nombre: 'Consola de videojuegos', categoria: 'recreativo', descripcion: 'Consola con dos mandos para torneos de esports', etiquetas: ['consola', 'videojuego', 'esport']},
    {nombre: 'Gafas de realidad virtual', categoria: 'recreativo', descripcion: 'Visor VR con dos controles', etiquetas: ['vr', 'realidad', 'virtual']},
    {nombre: 'Carpa plegable 3x3', categoria: 'recreativo', descripcion: 'Toldo para ferias y casas abiertas', etiquetas: ['carpa', 'feria', 'evento']},
    {nombre: 'Mesas plegables', categoria: 'recreativo', descripcion: 'Juego de dos mesas para stands', etiquetas: ['mesa', 'stand', 'evento']},
    {nombre: 'Amplificador con microfono', categoria: 'recreativo', descripcion: 'Amplificador portatil para eventos', etiquetas: ['amplificador', 'microfono', 'evento']},
    {nombre: 'Guitarra acustica', categoria: 'recreativo', descripcion: 'Guitarra para actividades culturales', etiquetas: ['guitarra', 'musica', 'cultura']}
]

const RECURSOS_SEED = RECURSOS_BASE.map(r => ({...r, precio: PRECIOS_RECURSOS[r.nombre]}))

export default RECURSOS_SEED
