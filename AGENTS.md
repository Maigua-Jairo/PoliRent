# AGENTS.md

PoliRent — React SPA for loaning technical equipment at Escuela Politécnica Nacional (UI copy is in Spanish; keep new copy in Spanish).

## Layout

- The entire app lives in `Frontend/`. The repo root has no manifest, no workspace, no CI, no tests.
- Run **all** npm commands from `C:\PoliRent\Frontend` (there is no root `package.json`).

## Commands (run in `Frontend/`)

```sh
npm run dev      # Vite dev server
npm run build    # production build -> dist/
npm run lint     # oxlint (only check; exits 0 with warnings)
npm run preview  # serve dist/
```

There is no test or typecheck command — do not invent one; `npm run lint` + `npm run build` is the full verification. No TypeScript; plain JS/JSX with explicit `.jsx` extensions in relative imports.

## Stack quirks

- **Tailwind v4**: no `tailwind.config.js`. All theme is in `src/index.css` (`@import "tailwindcss"`, `@theme` tokens `epn-*` / `brand-*` / `font-script`, and `@custom-variant dark`). Add design tokens there, not in a config file.
- **Dark mode** is class-based (`.dark` on `<html>`), driven by `src/hooks/darkMode.js` (zustand + `persist` under localStorage key `theme`, which hydrates synchronously; the module toggles the DOM class at load and on every change). The UI control is `src/components/ThemeToggle.jsx`, rendered in `Home.jsx` and `AuthLayout.jsx`. Every new component needs `dark:` variants (convention: `bg-slate-950` page, `bg-slate-900` cards, `slate-800` borders/rings, `text-white` headings, `text-slate-400` body). Don't add a separate theme mechanism.
- Router is `BrowserRouter` in `src/App.jsx`: `/`, `/login`, `/registro`, wildcard redirects to `/`.

## Known landmines

- **oxlint does not flag undefined identifiers** (no `no-undef`), and the build doesn't either — a missing import (e.g. a hook) only blows up at runtime when the route renders. Double-check imports by hand.
- API layer: `src/api/axiosCliente.js` (axios with Bearer token from `src/store/authStore.js`, zustand + `persist` key `polirent-auth`) → `src/services/authService.js` (`iniciarSesion` → `POST /api/login`, `registrarUsuario` → `POST /api/registro`, `obtenerMensajeError`). Add new endpoints as service functions there, not raw axios calls in pages.
- `.env` sets `VITE_API_URL` (currently the Render backend). Never commit secrets there.
- `src/pages/Home.jsx` references `/images/hero-campus.jpg` and `/images/students.jpg`, but `public/images/` is empty (build warns, images 404 at runtime; gradient fallbacks show). Put the images in `public/images/`.
- `dist/` is gitignored but may contain a stale build in the working tree — regenerate it, never hand-edit it.
- Lint currently reports 2 pre-existing `react(purity)` warnings (`Date` called during render in `AuthLayout.jsx` and `Home.jsx`). They don't fail the build; don't "fix" unrelated ones in a drive-by.

## Conventions

- Validation helpers live in `src/utils/validaciones.js`: emails must be `@epn.edu.ec`, Ecuadorian cédula checksum, phones `09XXXXXXXX`. Reuse them for any new forms instead of writing ad-hoc regexes.
- Shared auth form primitives (`AuthLayout`, `Field`, `Icon`, `PasswordInput`, style strings in `authStyles.jsx`) — extend these rather than rebuilding login/register markup. Note `Home.jsx` duplicates some icon/button constants locally.
