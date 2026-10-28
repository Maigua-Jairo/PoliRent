import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../Icon.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import MenuUsuario from './MenuUsuario.jsx'
import { iconos } from './iconos.jsx'
import { esAdministrador, rutaInicio, useAuthStore } from '../../store/authStore.js'

const enlace = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-400 ${
    isActive
      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`

const seccionCuenta = (search) => new URLSearchParams(search).get('seccion') ?? 'perfil'

// Navegación del panel por rol, en grupos. `proximamente`: pantalla aún no implementada.
// El catálogo y la reserva viven fuera del panel (PublicLayout): se llega desde la landing,
// el buscador superior, las recomendaciones o "Página principal" del menú del usuario
const navegacionPorRol = (usuario) => {
  if (esAdministrador(usuario)) {
    return [
      { items: [{ to: '/admin', etiqueta: 'Inicio', icono: iconos.inicio, end: true }] },
      {
        titulo: 'Gestión de Recursos',
        items: [
          { to: '/admin/recursos', etiqueta: 'Herramientas', icono: iconos.lapiz },
          { etiqueta: 'Categorías', icono: iconos.categorias, proximamente: true },
          { etiqueta: 'Inventario', icono: iconos.recursos, proximamente: true },
        ],
      },
      {
        titulo: 'Solicitudes',
        items: [
          { etiqueta: 'Solicitudes de préstamo', icono: iconos.solicitudes, proximamente: true },
          { etiqueta: 'Entrega y devolución', icono: iconos.camion, proximamente: true },
        ],
      },
      {
        titulo: 'Reportes',
        items: [
          { etiqueta: 'Historial de préstamos', icono: iconos.historial, proximamente: true },
          { etiqueta: 'Métricas y reportes', icono: iconos.grafico, proximamente: true },
        ],
      },
      {
        titulo: 'Cuenta',
        items: [
          {
            to: '/perfil',
            etiqueta: 'Mi perfil',
            icono: iconos.cuenta,
            activo: ({ pathname, search }) => pathname === '/perfil' && seccionCuenta(search) === 'perfil',
          },
          {
            to: '/perfil?seccion=seguridad',
            etiqueta: 'Configuración',
            icono: iconos.ajustes,
            activo: ({ pathname, search }) => pathname === '/perfil' && seccionCuenta(search) !== 'perfil',
          },
        ],
      },
    ]
  }
  return [
    {
      items: [
        { to: '/dashboard', etiqueta: 'Inicio', icono: iconos.inicio, end: true },
        { to: '/solicitudes', etiqueta: 'Mis Solicitudes', icono: iconos.solicitudes },
        { to: '/recomendaciones', etiqueta: 'Recomendaciones inteligentes', icono: iconos.destello },
        { to: '/perfil', etiqueta: 'Mi Cuenta', icono: iconos.cuenta },
      ],
    },
  ]
}

function ItemNavegacion({ item, onNavegar }) {
  const location = useLocation()
  const { to, etiqueta, icono, end, activo, proximamente } = item
  if (proximamente) {
    return (
      <span aria-disabled="true" title="Disponible próximamente" className={`${enlace({ isActive: false })} cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-300`}>
        <Icon size={20}>{icono}</Icon>
        {etiqueta}
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">Pronto</span>
      </span>
    )
  }
  if (activo) {
    const esActivo = activo(location)
    return (
      <Link to={to} onClick={onNavegar} aria-current={esActivo ? 'page' : undefined} className={enlace({ isActive: esActivo })}>
        <Icon size={20}>{icono}</Icon>
        {etiqueta}
      </Link>
    )
  }
  return (
    <NavLink to={to} end={end} onClick={onNavegar} className={enlace}>
      <Icon size={20}>{icono}</Icon>
      {etiqueta}
    </NavLink>
  )
}

/* ---------- Barra lateral: marca, navegación y lema ---------- */
function BarraLateral({ usuario, onNavegar }) {
  return (
    <div className="flex h-full flex-col bg-epn-950 px-4 py-6 text-white dark:bg-slate-900">
      <Link to={rutaInicio(usuario)} onClick={onNavegar} className="px-2">
        <span className="block text-3xl font-extrabold tracking-tight">PoliRent</span>
        <span className="mt-1 block text-sm leading-snug text-slate-300">
          Sistema de Préstamo
          <br />
          de Recursos
        </span>
      </Link>

      <nav aria-label="Principal" className="scroll-fino mt-8 -mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-4">
        {navegacionPorRol(usuario).map((grupo, i) => (
          <div key={grupo.titulo ?? i}>
            {grupo.titulo && <p className="mb-2 px-4 text-xs font-semibold tracking-wide text-slate-400">{grupo.titulo}</p>}
            <div className="flex flex-col gap-1.5">
              {grupo.items.map((item) => (
                <ItemNavegacion key={item.etiqueta} item={item} onNavegar={onNavegar} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* en pantallas bajas se oculta para dejar sitio al menú */}
      <figure className="mt-4 shrink-0 rounded-2xl [@media(max-height:760px)]:hidden border border-white/10 bg-white/5 px-5 py-5 text-center">
        <blockquote className="text-sm leading-relaxed text-slate-200">
          “La tecnología y el conocimiento también se prestan”
        </blockquote>
        <figcaption className="mt-3 flex items-center justify-center gap-2 text-sm font-bold">
          <span className="flex h-3 w-5 flex-col overflow-hidden rounded-sm" aria-hidden="true">
            <span className="flex-1 bg-red-600" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-red-600" />
          </span>
          EPN
        </figcaption>
      </figure>
    </div>
  )
}

/* ---------- Campana de notificaciones (provisional: aún no existen en el backend) ---------- */
function Notificaciones() {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setAbierto(false)}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Notificaciones"
        className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Icon size={20}>{iconos.campana}</Icon>
      </button>
      {abierto && (
        <p className="absolute right-0 z-50 mt-2 w-60 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
          No tienes notificaciones nuevas.
        </p>
      )}
    </div>
  )
}

/* ---------- Buscador global: lleva al catálogo de la landing con ?buscar= ---------- */
function Buscador() {
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const onSubmit = (e) => {
    e.preventDefault()
    const buscar = texto.trim()
    // el catálogo vive en la sección Recursos de la landing
    navigate(buscar ? `/?buscar=${encodeURIComponent(buscar)}#recursos` : '/#recursos')
    setTexto('')
  }
  return (
    <form role="search" onSubmit={onSubmit} className="relative w-full max-w-xl">
      <Icon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
        {iconos.buscar}
      </Icon>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar herramientas, categorías o palabras clave..."
        aria-label="Buscar recursos"
        className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pr-4 pl-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
      />
    </form>
  )
}

/* ---------- Panel con sesión (dashboard, solicitudes, recomendaciones, cuenta, administración) ---------- */
export default function AppLayout() {
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)
  const [menuMovil, setMenuMovil] = useState(false)
  const sesion = token ? usuario : null

  // Todas sus rutas están protegidas: sin sesión, RutaProtegida redirige al login
  if (!sesion) return <Outlet />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Barra lateral fija en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <BarraLateral usuario={sesion} />
      </aside>

      {/* Barra lateral como panel en móvil */}
      {menuMovil && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuMovil(false)}
            className="absolute inset-0 bg-slate-950/60"
          />
          <aside className="relative h-full w-72 max-w-[85%] shadow-2xl">
            <BarraLateral usuario={sesion} onNavegar={() => setMenuMovil(false)} />
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMenuMovil(false)}
              className="absolute top-4 right-3 grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
            >
              <Icon size={20}>{iconos.cerrar}</Icon>
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuMovil(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Icon size={22}>{iconos.menu}</Icon>
            </button>
            <div className="min-w-0 flex-1">
              <Buscador />
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Notificaciones />
              <MenuUsuario usuario={sesion} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
