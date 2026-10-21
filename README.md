# PoliRent

Sistema web para la gestión y recomendación inteligente de recursos (técnicos, académicos y recreativos) de las asociaciones de estudiantes de la Escuela Politécnica Nacional.

| Carpeta | Componente | Stack | Despliegue |
|---|---|---|---|
| [`backend/`](backend) | API REST | Node.js, Express, MongoDB (Mongoose), JWT, Cloudinary | Render (Web Service) |
| [`frontend/`](frontend) | SPA | React, Vite, Tailwind CSS, Zustand, React Hook Form, Axios | Render (Static Site) |

## Puesta en marcha local

Requisitos: Node.js 20 o superior y una base de MongoDB (Atlas o local).

```sh
# Backend (http://localhost:4000)
cd backend
cp .env.example .env    # completar MONGODB_URI y JWT_SECRET
npm install
npm run dev

# Frontend (http://localhost:5173), en otra terminal
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

## Pruebas

```sh
cd backend && npm test     # Jest + Supertest (no requiere base de datos)
cd frontend && npm test    # Vitest + Testing Library
```

## Variables de entorno

Las variables del **backend** son secretas y solo se configuran en el servicio del backend (ver [`backend/.env.example`](backend/.env.example)). El **frontend** solo usa `VITE_API_URL`; todo lo que empieza con `VITE_` queda incrustado en el JavaScript público, así que nunca debe contener secretos.

| Variable | Backend | Frontend |
|---|---|---|
| `NODE_ENV` (`production` en Render) | ✅ | — |
| `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` | ✅ | — |
| `FRONTEND_URL` (origen permitido por CORS) | ✅ | — |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ | — |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (correo de recuperación) | ✅ | — |
| `INSTITUTIONAL_EMAIL_DOMAIN` | ✅ | — |
| `VITE_API_URL` | — | ✅ |

## Despliegue en Render

- **Backend** (Web Service): raíz `backend`, build `npm install`, start `npm start`.
- **Frontend** (Static Site): raíz `frontend`, build `npm install && npm run build`, carpeta publicada `dist`. Agregar la regla *Rewrite* `/*` → `/index.html` para que las rutas de React (`/perfil`, `/login`, …) funcionen al recargar la página.

## Administradores

El registro público siempre crea cuentas con rol `estudiante`. Para convertir una cuenta en administrador, cambia su campo `rol` a `administrador` directamente en la colección `usuarios` de MongoDB.
