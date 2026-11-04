import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../Icon.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import MenuUsuario from './MenuUsuario.jsx'
import { iconos } from './iconos.jsx'
import { esAdministrador, rutaInicio, useAuthStore } from '../../store/authStore.js'
import { listarNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas } from '../../services/notificacionService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import AsistenteFlotante from '../recomendaciones/AsistenteFlotante.jsx'

const enlace = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-400 ${
    isActive
      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`

const seccionCuenta = (search) => new URLSearchParams(search).get('seccion') ?? 'perfil'

// Navegación del panel por rol. Los accesos administrativos apuntan a las vistas existentes
// y reflejan la información que ya expone el backend.
const navegacionPorRol = (usuario) => {
  if (esAdministrador(usuario)) {
    return [
      { items: [{ to: '/admin', etiqueta: 'Inicio', icono: iconos.inicio, end: true }] },
      {
        titulo: 'Gestión de Recursos',
        items: [{ to: '/admin/recursos', etiqueta: 'Herramientas', icono: iconos.lapiz }],
      },
      {
        titulo: 'Solicitudes',
        items: [
          { to: '/admin/solicitudes', etiqueta: 'Solicitudes de préstamo', icono: iconos.solicitudes },
          { to: '/admin/entrega', etiqueta: 'Entrega y devolución', icono: iconos.camion },
        ],
      },
      {
        titulo: 'Reportes',
        items: [
          { to: '/admin/historial', etiqueta: 'Historial de préstamos', icono: iconos.historial },
          { to: '/admin/metricas', etiqueta: 'Métricas y reportes', icono: iconos.grafico },
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
  const { to, etiqueta, icono, end, activo } = item
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

/* ---------- Campana de notificaciones con lectura desde el backend ---------- */
function Notificaciones() {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const recargar = async () => {
    try {
      setCargando(true)
      const respuesta = await listarNotificaciones()
      setNotificaciones(respuesta.notificaciones ?? [])
      setError('')
    } catch (e) {
      setError(obtenerMensajeError(e))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (!abierto) return
    const controlador = new AbortController()
    listarNotificaciones({}, { signal: controlador.signal })
      .then((respuesta) => {
        if (!controlador.signal.aborted) setNotificaciones(respuesta.notificaciones ?? [])
      })
      .catch((e) => {
        if (!controlador.signal.aborted) setError(obtenerMensajeError(e))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [abierto])

  useEffect(() => {
    const controlador = new AbortController()
    listarNotificaciones({}, { signal: controlador.signal })
      .then((respuesta) => {
        if (!controlador.signal.aborted) setNotificaciones(respuesta.notificaciones ?? [])
      })
      .catch((e) => {
        if (!controlador.signal.aborted) setError(obtenerMensajeError(e))
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false)
      })
    return () => controlador.abort()
  }, [])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  const marcarLeida = async (id) => {
    try {
      await marcarNotificacionLeida(id)
      await recargar()
    } catch (e) {
      setError(obtenerMensajeError(e))
    }
  }

  const marcarTodas = async () => {
    try {
      await marcarTodasNotificacionesLeidas()
      await recargar()
    } catch (e) {
      setError(obtenerMensajeError(e))
    }
  }

  return (
    <div className="relative" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setAbierto(false)}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Notificaciones"
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Icon size={20}>{iconos.campana}</Icon>
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl bg-white p-3 text-sm text-slate-600 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800 dark:text-white">Notificaciones</p>
            {noLeidas > 0 && (
              <button type="button" onClick={marcarTodas} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Marcar todas
              </button>
            )}
          </div>
          {cargando && <p className="py-2 text-xs text-slate-500 dark:text-slate-400">Cargando…</p>}
          {!cargando && error && <p className="py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          {!cargando && !error && notificaciones.length === 0 && <p className="py-2 text-xs text-slate-500 dark:text-slate-400">No tienes notificaciones nuevas.</p>}
          {!cargando && !error && notificaciones.length > 0 && (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notificaciones.slice(0, 8).map((n) => (
                <li key={n._id} className={`rounded-lg border p-2 ${n.leida ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60' : 'border-brand-200 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs leading-5 text-slate-700 dark:text-slate-200">{n.mensaje}</p>
                    {!n.leida && (
                      <button type="button" onClick={() => marcarLeida(n._id)} className="shrink-0 text-[10px] font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        Marcar
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{new Date(n.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
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
      {sesion.rol === 'estudiante' && <AsistenteFlotante />}
    </div>
  )
}
