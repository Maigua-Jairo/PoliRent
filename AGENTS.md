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
- **Préstamos**: `services/prestamoService.js`, carga en `hooks/useMisPrestamos.js`; estados, pestañas y reglas (`puedeCancelar`, `enCurso`) en `utils/prestamos.js`, que debe coincidir con `ESTADOS_PRESTAMO` de `backend/src/models/Prestamo.js`. No hay `GET` de un préstamo: el detalle lo busca en la lista del estudiante. La reserva (HU-008) se hace en `/recursos/:id` con `components/prestamos/FormularioSolicitud.jsx` (sección `#solicitar`); en el panel no se reserva: las tarjetas de recomendación tienen "Ver en recursos", que abre esa ficha pública; las reglas de fecha (≤ 30 días) y motivo (≤ 300) en `utils/prestamos.js` deben coincidir con `validarSolicitudPrestamo` del backend.
- **QR**: no se implementa en el frontend (decisión del proyecto). El backend todavía genera y escanea QR (`/api/prestamos/:id/qr`, `/api/prestamos/escanear`) y es la única vía para registrar entrega y devolución; no lo consumas desde el frontend.
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
- `POST /api/recuperar-clave` envía el enlace `FRONTEND_URL/recuperar-clave/:token` al correo institucional por SMTP (`src/config/mailer.js`, variables `SMTP_*`). Sin SMTP: en producción responde 503; con `NODE_ENV=development` además devuelve el token en la respuesta para probar sin correo.
- `GET /api/recursos` acepta `categoria`, `estado` y `buscar` (texto literal en nombre/descripción, sin distinguir mayúsculas).
