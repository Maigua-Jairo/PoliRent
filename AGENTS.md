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
- **Rutas** (`src/App.jsx`): `SoloInvitados` envuelve login/registro/recuperación. `AppLayout` envuelve el catálogo público (`/recursos`, `/recursos/:id`), `/perfil` (con `RutaProtegida`) y `/admin/recursos…` (con `RutaProtegida roles={['administrador']}`).
- **Catálogo**: los filtros viven en la URL (`hooks/useFiltrosRecursos.js`), la carga en `hooks/useRecursos.js`; componentes en `components/recursos/`. Animación de entrada `motion-safe:animate-aparecer` definida en `src/index.css`.
- **Formularios**: React Hook Form; adapta los validadores con `regla()` de `utils/validaciones.js`. Primitivas compartidas: `Field`/`AuthLayout`, `PasswordInput`, `Alerta`, `Icon`, clases en `components/auth/authStyles.jsx`.
- oxlint **no detecta identificadores sin definir** y el build tampoco: cada pantalla nueva debe tener al menos una prueba que la renderice.
- `src/pages/Home.jsx` usa `/images/hero-campus.jpg` y `/images/students.jpg`, que aún no existen en `public/images/` (se ve el degradado de respaldo).
- Lint tiene 2 advertencias `react(purity)` conocidas (`new Date()` en `AuthLayout.jsx` y `Home.jsx`); no bloquean.

## Backend

- Archivos vacíos reservados para trabajo futuro: préstamos (`prestamoController`, `prestamoRouter`, `models/Prestamo`), recomendaciones (`recomendacionController`, `recomendacionRouter`), QR (`helpers/qrHelper`), `helpers/responseHelper`, `routers/index`. No los borres.
- `POST /api/recuperar-clave` envía el enlace `FRONTEND_URL/recuperar-clave/:token` al correo institucional por SMTP (`src/config/mailer.js`, variables `SMTP_*`). Sin SMTP: en producción responde 503; con `NODE_ENV=development` además devuelve el token en la respuesta para probar sin correo.
- `GET /api/recursos` acepta `categoria`, `estado` y `buscar` (texto literal en nombre/descripción, sin distinguir mayúsculas).
