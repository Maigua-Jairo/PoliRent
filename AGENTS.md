# AGENTS.md

PoliRent — sistema de préstamo y recomendación de recursos para las asociaciones de estudiantes de la Escuela Politécnica Nacional (UI y mensajes en español; mantener el texto nuevo en español). Los requisitos están en las historias de usuario HU-001…HU-011 del trabajo de titulación del frontend.

## Layout (monorepo)

- `backend/` — API REST Express + Mongoose (ESM). Entrada `src/index.js`, app en `src/server.js`.
- `frontend/` — SPA React + Vite.
- No hay `package.json` en la raíz: ejecuta los comandos npm dentro de cada carpeta.

## Comandos

```sh
# backend/
npm run dev      # nodemon
npm test         # Jest (ESM vía --experimental-vm-modules) + Supertest; no usa base de datos

# frontend/
npm run dev      # Vite
npm test         # Vitest + Testing Library (jsdom)
npm run lint     # oxlint
npm run build    # producción -> dist/
```

Verificación completa: `npm test` en ambos + `npm run lint` y `npm run build` en el frontend.

## Contrato backend ↔ frontend

- Las reglas de validación están duplicadas a propósito y deben coincidir:
  `backend/src/middlewares/validationMiddleware.js` ↔ `frontend/src/utils/validaciones.js`
  (correo `@epn.edu.ec`, cédula ecuatoriana con dígito verificador y única, teléfono `09XXXXXXXX`, contraseña ≥ 8 con mayúscula/minúscula/número).
- Listas cerradas que deben coincidir: `FACULTADES` (`backend/src/models/Usuario.js` ↔ `frontend/src/utils/validaciones.js`) y `CATEGORIAS`/`ESTADOS` de recursos (`backend/src/models/Recurso.js` ↔ `frontend/src/utils/recursos.jsx`). Límites de recurso: nombre 3–100, descripción ≤ 500, imagen JPG/PNG/WEBP ≤ 2 MB.
- **Multipart con axios**: `api/axiosCliente.js` usa `Content-Type: application/json` por defecto, y con ese encabezado axios convierte un `FormData` a JSON y descarta los archivos. Toda petición con archivo debe pasar `headers: { 'Content-Type': 'multipart/form-data' }` (ver `services/recursoService.js`).
- Errores: el backend responde `{ msg }`. Un `401` en una petición autenticada cierra la sesión en el frontend (interceptor de `api/axiosCliente.js`), así que los errores de datos deben ser `400`, nunca `401`.
- Registro: siempre crea `estudiante` y no devuelve token; el frontend redirige a `/login`. Los administradores se asignan cambiando `rol` en la base de datos.
- `GET /api/recursos` y `GET /api/recursos/:id` son públicos; crear/editar/eliminar exige rol `administrador`. Las imágenes llegan como `multipart/form-data` en el campo `imagen` y se suben a Cloudinary (sin variables `CLOUDINARY_*` la subida responde 503).
- **Precio del recurso**: `precio` (dólares, 0–100000, por defecto 0; en multipart llega como texto) es el precio de reposición y la base de las penalizaciones. `GET /api/recursos` ya lo devuelve.
- **Solicitud de préstamo** (`POST /api/prestamos`): además de `recursoId`, `fechaDevolucion` y `motivo`, exige `aceptaTerminos: true` y `docenteReferencia: {nombre (3–100), correo, telefono?}`. `fechaDevolucion` acepta `AAAA-MM-DD` (se guarda a las 18:00 de Ecuador) o fecha con hora; el límite de 30 días se cuenta por días calendario (hasta el final del día `hoy + 30`) y la hora debe caer entre 07:00 y 18:00 (hora de Ecuador). Con penalizaciones `pendiente` responde 400 con el monto. El préstamo devuelve `terminos`, `docenteReferencia`, `entrega` y `devolucion` (evidencias solo con `url`); nunca `codigoQR`.
- **Políticas** (`backend/src/helpers/politicasHelper.js`, valores por variables de entorno): atraso 5 % del precio por día o fracción, daño/incompleto 20 %, pérdida 100 % (sin sumar atraso), tope 100 % del precio por préstamo; horario 07:00–18:00 `America/Guayaquil` (`VALIDAR_HORARIO=false` lo desactiva). `GET /api/terminos` (público) devuelve tarifas, horario y las frases de los términos.

## Frontend

- **Tailwind v4**: sin `tailwind.config.js`; tokens (`epn-*`, `brand-*`, `font-script`) y `@custom-variant dark` en `src/index.css`.
- **Modo oscuro** por clase `.dark` en `<html>`, manejado por `src/hooks/darkMode.js` (zustand + persist, clave `theme`) y `components/ThemeToggle.jsx`. Todo componente nuevo necesita variantes `dark:`.
- **Sesión**: `src/store/authStore.js` (zustand + persist, clave `polirent-auth`) guarda `token` y `usuario` (con `rol`). Cerrar sesión con `hooks/useCerrarSesion.js`.
- **API**: agrega endpoints como funciones en `src/services/*Service.js`, nunca llamadas axios sueltas en las páginas.
- **Rutas** (`src/App.jsx`): `SoloInvitados` envuelve login/registro/recuperación y, con sesión, redirige a `rutaInicio(usuario)` (`store/authStore.js`): `/dashboard` para estudiantes y `/admin` para administradores; el login usa la misma regla. El catálogo completo vive en la sección `#recursos` de la landing (`Home.jsx` con `components/recursos/CatalogoRecursos.jsx`); `/recursos?…` solo redirige a `/?…#recursos`. `PublicLayout` envuelve la ficha `/recursos/:id` para todos, también con sesión: ahí se reserva, nunca dentro del panel. `AppLayout` (panel) envuelve solo rutas protegidas:
  - `RutaProtegida roles={['estudiante']}`: `/dashboard`, `/recomendaciones`, `/solicitudes`, `/solicitudes/:id` (el backend solo deja a estudiantes usar `/api/prestamos/mis` y `/api/recomendaciones`);
  - `RutaProtegida` (cualquier rol): `/perfil` (configuración de cuenta, pestañas en `?seccion=perfil|seguridad|notificaciones`);
  - `RutaProtegida roles={['administrador']}`: `/admin` (dashboard) y `/admin/recursos…`.
- **Layouts**: la landing y la ficha del recurso comparten el mismo navbar, `components/layout/NavbarSitio.jsx` (secciones de la landing; fuera de `/` sus enlaces van a `/#seccion` y `Home` se desplaza a la sección). `components/layout/PublicLayout.jsx` lo usa para la ficha. `components/layout/AppLayout.jsx` es el panel: barra lateral fija (panel en móvil) con navegación según el rol, sin el catálogo, y barra superior con buscador global (lleva a `/?buscar=…#recursos`), campana, menú del usuario y `ThemeToggle`. Los invitados no tienen panel: reservar y recibir recomendaciones exige sesión de estudiante. El menú del usuario (`components/layout/MenuUsuario.jsx`) ofrece Mi panel, Página principal (`/`, para seguir explorando), Mi cuenta y Cerrar sesión. Iconos de navegación y paneles en `components/layout/iconos.jsx`. Avatar con iniciales en `components/Avatar.jsx` (aún no hay foto de perfil).
- **Préstamos**: `services/prestamoService.js`, carga en `hooks/useMisPrestamos.js`; estados, pestañas y reglas (`puedeCancelar`, `enCurso`) en `utils/prestamos.js`, que debe coincidir con `ESTADOS_PRESTAMO` de `backend/src/models/Prestamo.js`. No hay `GET` de un préstamo: el detalle lo busca en la lista del estudiante. La reserva (HU-008) se hace en `/recursos/:id` con `components/prestamos/FormularioSolicitud.jsx` (sección `#solicitar`); en el panel no se reserva: las tarjetas de recomendación tienen "Ver en recursos", que abre esa ficha pública; las reglas de fecha (≤ 30 días) y motivo (≤ 300) en `utils/prestamos.js` deben coincidir con `validarSolicitudPrestamo` del backend. **Un solo préstamo a la vez**: con uno `pendiente`/`aprobado`/`entregado` el backend responde 400 (`{ msg }` con el nombre del recurso activo) a cualquier solicitud nueva; reglas en `ESTADOS_ACTIVOS` y `mensajePrestamoActivo` de `backend/src/models/Prestamo.js`. El aviso en la ficha queda a cargo del frontend.
- **QR**: no se implementa en el frontend (decisión del proyecto). El backend todavía genera y escanea QR (`/api/prestamos/:id/qr`, `/api/prestamos/escanear`) ; no lo consumas desde el frontend. Para registrar entrega y devolución sin lector de QR existen `PUT /api/prestamos/:id/entregar` y `PUT /api/prestamos/:id/devolver` (ver "Pendiente en el frontend").
- **Dashboard del administrador** (`pages/admin/DashboardAdmin.jsx`, componentes en `components/admin/`): carga `GET /api/prestamos` y `GET /api/recursos` (`hooks/useDashboardAdmin.js`); cifras, inventario, gráficos y actividad se calculan en el cliente (`utils/estadisticas.js`). Aprueba y rechaza solicitudes (`aprobarPrestamo`, `rechazarPrestamo`). "Generar reporte" descarga un CSV (`;` + BOM) armado en el navegador (`utils/reporte.js`). No hay conteo de usuarios ni tendencias (sin endpoint ni historial). La barra lateral del admin muestra el menú completo del diseño; las pantallas inexistentes salen como "Pronto". Colores de categoría en gráficos: `grafico` en `CATEGORIAS` (paleta validada para claro y oscuro).
- **Recomendaciones**: `services/recomendacionService.js`; reglas del contexto (5–500) en `utils/recomendaciones.js`. El filtro por categoría se aplica en el cliente (el backend no lo acepta y solo recomienda recursos disponibles). Las consultas recientes se guardan por usuario en `store/consultasStore.js` (clave `polirent-consultas`).
- **Datos provisionales**: ubicación, horario y responsable de entrega (`INFO_ENTREGA`), código de recurso (`codigoRecurso`), notificaciones y "Cambiar foto" son texto fijo hasta que el backend los exponga.
- **Catálogo** (sección Recursos de la landing): los filtros viven en la URL (`hooks/useFiltrosRecursos.js`), la carga en `hooks/useRecursos.js`; componentes en `components/recursos/`. Las fotos de recursos se muestran siempre desde `recurso.imagen` con `ImagenRecurso` (respaldo con el icono de la categoría). Animación de entrada `motion-safe:animate-aparecer` definida en `src/index.css`.
- **Formularios**: React Hook Form; adapta los validadores con `regla()` de `utils/validaciones.js`. Primitivas compartidas: `Field`/`AuthLayout`, `PasswordInput`, `Alerta`, `Icon`, `DialogoConfirmacion`, clases (incluida `pestana()`) en `components/auth/authStyles.jsx`.
- oxlint **no detecta identificadores sin definir** y el build tampoco: cada pantalla nueva debe tener al menos una prueba que la renderice.
- `src/pages/Home.jsx` usa `/images/hero-campus.jpg` y `/images/students.jpg`, que aún no existen en `public/images/` (se ve el degradado de respaldo).
- Lint tiene 2 advertencias `react(purity)` conocidas (`new Date()` en `AuthLayout.jsx` y `Home.jsx`); no bloquean.

## Backend

- Archivos vacíos reservados para trabajo futuro: préstamos (`prestamoController`, `prestamoRouter`, `models/Prestamo`), recomendaciones (`recomendacionController`, `recomendacionRouter`), QR (`helpers/qrHelper`), `helpers/responseHelper`, `routers/index`. No los borres.
- **Asistente** `POST /api/asistente` (público, sesión opcional con `verificarTokenOpcional`): un solo chat que responde `tipo` `ayuda` | `recomendacion` | `fuera_de_tema`. Motor híbrido: `helpers/asistenteHelper.js` (preguntas frecuentes con palabras clave + TF-IDF de `recomendacionHelper`) y, con `GEMINI_API_KEY`, `helpers/geminiHelper.js` (fetch nativo, JSON validado; solo puede elegir ids de recursos enviados). Las dudas que el motor local reconoce con seguridad (`seguro`) no llaman a Gemini; si Gemini falla o tarda (`GEMINI_TIMEOUT_MS`, el nivel gratuito tarda 10-20 s) responde el motor local. Al cambiar reglas del sistema, actualiza también `PREGUNTAS_FRECUENTES`.
- Recursos de ejemplo: `npm run seed` (`src/seed/`), inserta solo los nombres que faltan; `-- --dry` para simular.
- `POST /api/recuperar-clave` envía el enlace `FRONTEND_URL/recuperar-clave/:token` al correo institucional por SMTP (`src/config/mailer.js`, variables `SMTP_*`). Sin SMTP: en producción responde 503; con `NODE_ENV=development` además devuelve el token en la respuesta para probar sin correo.
- `GET /api/recursos` acepta `categoria`, `estado` y `buscar` (texto literal en nombre/descripción, sin distinguir mayúsculas).
- **Políticas** en `helpers/politicasHelper.js` (funciones puras que leen `process.env` al llamarse): `PENALIZACION_ATRASO_DIA`, `PENALIZACION_DANIO`, `PENALIZACION_PERDIDA`, `HORARIO_INICIO`, `HORARIO_FIN`, `VALIDAR_HORARIO`. Los tests ponen `VALIDAR_HORARIO=false` salvo los de horario. Al cambiar tarifas u horario, las respuestas del asistente (`PREGUNTAS_FRECUENTES` con getters) y `textoTerminos()` se actualizan solas.
- **Entrega y devolución**: `POST /api/prestamos/escanear` (QR), `PUT /api/prestamos/:id/entregar` y `PUT /api/prestamos/:id/devolver` comparten `registrarMovimiento` (`prestamoController.js`). Aceptan JSON o `multipart/form-data` con `responsable` (por defecto el administrador), `observaciones` y la foto `evidencia` (`subirEvidenciaPrestamo`, carpeta `polirent/evidencias`). La devolución recibe `condicion` (`bueno`|`danado`|`incompleto`|`perdido`); `danado`/`incompleto` exigen evidencia; el recurso queda `disponible` solo si es `bueno` (si no, `mantenimiento`). Fuera de horario responde 400, salvo `perdido`. Crea un documento `Penalizacion` por cada penalización y notifica (`penalizacion`); responde además `penalizaciones`, `totalPenalizado` y `advertencias` (recurso sin precio). `GET /api/prestamos/:id` (dueño o administrador) sirve para consultar el préstamo durante la entrega.
- **Penalizaciones** (`models/Penalizacion.js`, `penalizacionController.js`, `penalizacionRouter.js`; lógica compartida en `helpers/penalizacionHelper.js`): `GET /api/penalizaciones/mis` (estudiante: `totalAdeudado`, `atrasoEnCurso` calculado al vuelo), `GET /api/penalizaciones` (administrador, filtros `estado`, `usuario`, `desde`, `hasta`), `PUT /api/penalizaciones/:id/pagar` y `PUT /api/penalizaciones/:id/anular` (`{motivo}` 3–200; solo sobre `pendiente`). El docente de referencia solo lo ve el administrador (no se le envía correo).
- **Métricas**: `GET /api/metricas` agrega `penalizaciones` y `recursosParaReponer` (`helpers/metricasHelper.js`: alta demanda ≥ 60 % de ocupación en 30 días, daños, pérdidas, mantenimiento). Reportes: columnas nuevas en `/api/reportes/prestamos` y `/api/reportes/recursos`, y `GET /api/reportes/penalizaciones` (CSV con `celdaCSV` y BOM).
- **Asistente**: preguntas frecuentes `horario` y `penalizaciones`; `responderDeuda` responde "¿cuánto debo?" con los datos reales del estudiante antes del motor local y de Gemini (a Gemini se le pasa la deuda en `contextoUsuario`).
- **Swagger**: `tests/openapi.test.js` falla si una ruta de `src/routers/` no está en `src/docs/openapi.js` o viceversa: documenta cada ruta nueva.
- Precios: `src/seed/preciosRecursos.js` (tabla `nombre -> precio`, estimaciones de la asociación; no cambiar sin pedido) alimenta la semilla y `npm run precios` (`-- --dry`, `-- --forzar`; solo pone precio a los recursos sin precio, compara sin tildes ni mayúsculas; lógica pura en `src/seed/preciosLogica.js`).

## Pendiente en el frontend

El backend ya expone lo siguiente, pero el frontend todavía no lo usa (no está implementado):

- Enviar `aceptaTerminos` y `docenteReferencia` en `FormularioSolicitud.jsx` y mostrar los términos (`GET /api/terminos`) antes de aceptar. Sin esos campos la solicitud responde 400.
- Cambiar `fechaDevolucionISO` (`frontend/src/utils/prestamos.js`): hoy manda la fecha elegida **con la hora actual** y ahora la hora debe caer entre 07:00 y 18:00 (hora de Ecuador). Enviar solo `AAAA-MM-DD` (el backend la toma a las 18:00), una hora fija o un selector de hora. Actualizar la regla de 30 días a días calendario.
- Campo `precio` en `FormularioRecurso.jsx` (multipart, 0–100000).
- Pantallas de penalizaciones: la del estudiante (`/api/penalizaciones/mis`, deuda y atraso en curso, aviso en la ficha si tiene deuda) y la del administrador (listar, pagar, anular con motivo).
- Registro de entrega y devolución por id (`PUT /api/prestamos/:id/entregar|devolver`) con responsable, observaciones, condición y foto de evidencia (multipart, `headers: { 'Content-Type': 'multipart/form-data' }`); mostrar `penalizaciones` y `advertencias` de la respuesta. Esto reemplaza la decisión de no registrar entregas desde el frontend.
- Mostrar `recursosParaReponer` y `penalizaciones` de `GET /api/metricas` en el dashboard del administrador, y el reporte `GET /api/reportes/penalizaciones`.
- El tipo de notificación `penalizacion` (icono y texto en la campana).
