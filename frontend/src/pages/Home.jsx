import { useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Icon from '../components/Icon.jsx'
import SesionUsuario from '../components/SesionUsuario.jsx'
import { useAuthStore } from '../store/authStore.js'
import { CATEGORIAS } from '../utils/recursos.jsx'

/* ---------- Iconos propios de la landing ---------- */
const icons = {
  sparkles: <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  book: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" />
    </>
  ),
  laptop: (
    <>
      <rect x="4" y="4" width="16" height="11" rx="2" />
      <path d="M2 19h20" />
    </>
  ),
  brain: (
    <>
      <path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 4 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z" />
      <path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 4 3 3 0 0 1-3-3" />
      <path d="M9 8h1M14 8h1M8 13h2M14 13h2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14a5 5 0 0 1 5 5" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  form: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  box: (
    <>
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="m8 12 3 3 5-6" stroke="#fff" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9 12 4l10 5-10 5z" />
      <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  login: (
    <>
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
}

const SOCIAL_PATHS = {
  facebook:
    'M12 2a10 10 0 0 0-1.6 19.9V14.9H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 12 2z',
  instagram:
    'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM21 7.6c-.1-1.6-.4-3-1.6-4.1C18.3 2.4 16.9 2 15.3 2H8.7c-1.6.1-3 .4-4.1 1.6C3.4 4.6 3 6 3 7.6v8.8c.1 1.6.4 3 1.6 4.1 1.1 1.1 2.5 1.5 4.1 1.5h6.6c1.6 0 3-.4 4.1-1.5 1.1-1.1 1.5-2.5 1.6-4.1zm-2 9.9a3.3 3.3 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.1.4s-3.9.1-5.1-.4a3.3 3.3 0 0 1-1.9-1.9C4.5 16.2 4.6 13 4.6 12s-.1-4.2.4-5.5A3.3 3.3 0 0 1 6.9 4.6C8.2 4.1 11.3 4.2 12 4.2s3.9-.1 5.1.4a3.3 3.3 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.5s.1 4.2-.4 5.5z',
  youtube:
    'M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8zM10 15V9l5.2 3z',
  x: 'M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z',
  linkedin:
    'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z',
}

/* ---------- Logo ---------- */
const Logo = ({ light = false }) => (
  <a href="#inicio" className="flex shrink-0 items-center gap-2.5">
    <span className={`text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-epn-900 dark:text-white'}`}>
      PoliRent
    </span>
    <span
      className={`ml-2 hidden text-[11px] leading-tight sm:block ${light ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}
    >
      Escuela Politécnica
      <br />
      Nacional
    </span>
  </a>
)

/* ---------- Clases reutilizables ---------- */
const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const btnPrimary = `${btn} bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600`
const btnOutline = `${btn} border border-brand-500 text-brand-600 hover:bg-brand-500/10 dark:text-brand-400`
const btnGhost = `${btn} border border-white/40 text-white hover:bg-white/10`

/* ---------- Datos ---------- */
const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Préstamos' },
  { href: '#recomendaciones', label: 'Recomendaciones' },
  { href: '#contacto', label: 'Contacto' },
]

const FEATURES = [
  {
    icon: 'laptop',
    tone: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    title: 'Recursos variados',
    text: 'Recursos técnicos, académicos y recreativos en un solo catálogo.',
  },
  {
    icon: 'brain',
    tone: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    title: 'Recomendaciones inteligentes',
    text: 'Encuentra lo que necesitas según tu perfil y proyectos.',
  },
  {
    icon: 'shield',
    tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    title: 'Proceso seguro y fácil',
    text: 'Solicita, recibe y devuelve de forma rápida y confiable.',
  },
  {
    icon: 'users',
    tone: 'bg-orange-100 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400',
    title: 'Asociaciones estudiantiles',
    text: 'Recursos administrados por las asociaciones de estudiantes de la EPN.',
  },
]

const BENEFITS = [
  'Ahorra tiempo en la búsqueda de recursos.',
  'Aprovecha al máximo los recursos disponibles.',
  'Impulsa tus ideas y proyectos.',
]

const STEPS = [
  { icon: 'search', title: 'Explora', text: 'Busca entre nuestros recursos disponibles.' },
  { icon: 'form', title: 'Solicita', text: 'Completa el formulario de préstamo.' },
  { icon: 'box', title: 'Recibe', text: 'Confirma la disponibilidad y recoge tu recurso.' },
  { icon: 'checkCircle', title: 'Devuelve', text: 'Finaliza el proceso y ayuda a otros estudiantes.' },
]

const container = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10'

/* ---------- Componente ---------- */
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const autenticado = useAuthStore((state) => Boolean(state.token))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className={`${container} flex h-16 items-center justify-between gap-6`}>
          <Logo />

          <nav className="hidden h-full items-center gap-8 lg:flex">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative flex h-full items-center text-sm font-semibold transition-colors ${
                  i === 0
                    ? 'text-brand-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-500 dark:text-brand-400'
                    : 'text-slate-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {autenticado ? (
              <SesionUsuario />
            ) : (
              <>
                <Link to="/login" className={`${btnOutline} px-5 py-2.5 text-sm`}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className={`${btnPrimary} px-5 py-2.5 text-sm`}>
                  Registrarse
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <button
              className="rounded-lg p-2 text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon size={24}>{menuOpen ? icons.close : icons.menu}</Icon>
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <nav className="border-t border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <div className={`${container} flex flex-col gap-1 py-4`}>
              {NAV_LINKS.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    i === 0 ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              {autenticado ? (
                <SesionUsuario className="mt-3 justify-between" />
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link to="/login" className={`${btnOutline} py-2.5 text-sm`}>
                    Iniciar sesión
                  </Link>
                  <Link to="/registro" className={`${btnPrimary} py-2.5 text-sm`}>
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* HERO */}
        <section
          id="inicio"
          className="relative isolate overflow-hidden bg-epn-900 bg-[url('/images/hero-campus.jpg')] bg-cover bg-center"
        >
          {/* Capa de degradado para legibilidad */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-epn-950 via-epn-900/90 to-epn-800/40" />
          <div className="absolute -top-24 right-0 -z-10 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

          <div className={`${container} grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-12`}>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-brand-400/40">
                <Icon size={16}>{icons.book}</Icon>
                Préstamo de Recursos EPN
              </span>
              <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-tight text-white sm:text-5xl">
                Tu proyecto, nuestras <span className="block text-brand-400">herramientas</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-200 sm:text-lg">
                Gestiona el préstamo de recursos técnicos, académicos y recreativos de
                las asociaciones estudiantiles de la Escuela Politécnica Nacional y recibe
                recomendaciones inteligentes según tus necesidades académicas.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Link to={autenticado ? '/perfil' : '/registro'} className={`${btnPrimary} px-6 py-3`}>
                  Comenzar ahora <Icon size={18}>{icons.arrow}</Icon>
                </Link>
                <Link to="/recursos" className={`${btnGhost} px-6 py-3`}>
                  Explorar recursos <Icon size={18}>{icons.search}</Icon>
                </Link>
              </div>
            </div>

            {/* Ilustración decorativa */}
            <div className="relative hidden h-72 lg:block" aria-hidden="true">
              <p className="absolute top-0 right-0 -rotate-6 font-script text-4xl leading-tight font-bold text-white">
                ¡Haz realidad
                <br />
                <span className="ml-4 border-b-2 border-white pb-1">tus ideas!</span>
              </p>
              <div className="absolute right-8 bottom-0 flex flex-col items-end gap-1">
                {['INNOVACIÓN', 'APRENDIZAJE', 'DESARROLLO'].map((t, i) => (
                  <span
                    key={t}
                    className="rounded-md bg-gradient-to-r from-blue-700 to-epn-800 px-6 py-2 text-sm font-bold tracking-wider text-white shadow-xl ring-1 ring-white/20"
                    style={{ transform: `rotate(${4 - i * 2}deg)`, marginRight: `${i * 12}px` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="absolute bottom-6 left-10 grid h-28 w-28 place-items-center rounded-3xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                <Icon size={56} stroke={1.4}>{icons.laptop}</Icon>
              </div>
              <div className="absolute top-20 left-40 grid h-20 w-20 place-items-center rounded-2xl bg-yellow-400/90 text-epn-900 shadow-xl">
                <Icon size={40} stroke={1.6}>{icons.cap}</Icon>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-10">
          <div className={`${container} grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0`}>
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`flex items-start gap-5 ${i > 0 ? 'lg:border-l lg:border-slate-200 lg:pl-8 dark:lg:border-slate-800' : ''} ${
                  i < FEATURES.length - 1 ? 'lg:pr-6' : ''
                }`}
              >
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${f.tone}`}>
                  <Icon size={30} stroke={1.8}>{icons[f.icon]}</Icon>
                </div>
                <div>
                  <h3 className="mt-1 text-[15px] font-bold text-epn-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* RECURSOS POR CATEGORÍA */}
        <section id="recursos" className="scroll-mt-16 pb-10">
          <div className={container}>
            <h2 className="text-2xl font-extrabold text-epn-900 dark:text-white">Recursos por categoría</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Las asociaciones estudiantiles ponen a tu disposición tres tipos de recursos.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {CATEGORIAS.map((c) => (
                <Link
                  key={c.valor}
                  to={`/recursos?categoria=${c.valor}`}
                  className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-500/40 dark:bg-slate-900 dark:ring-slate-800"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-xl ${c.tono}`}>
                    <Icon size={26} stroke={1.8}>{c.icono}</Icon>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-epn-900 dark:text-white">{c.plural}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{c.descripcion}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    Ver recursos <Icon size={16} className="transition-transform group-hover:translate-x-1">{icons.arrow}</Icon>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* POR QUÉ + CÓMO FUNCIONA */}
        <section className="pb-6">
          <div className={`${container} grid gap-5 xl:grid-cols-2`}>
            {/* ¿Por qué usar el sistema? */}
            <article
              id="sobre"
              className="grid gap-6 rounded-2xl bg-blue-50/70 dark:bg-slate-900 p-4 ring-1 ring-blue-100 dark:ring-slate-800 md:grid-cols-[1fr_1.1fr] md:p-4"
            >
              <div className="relative min-h-52 overflow-hidden rounded-xl bg-gradient-to-br from-epn-800 to-brand-600 bg-[url('/images/students.jpg')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-br from-epn-900/60 to-transparent" />
                <p className="absolute top-6 left-5 -rotate-12 font-script text-3xl leading-tight font-bold text-white">
                  Más recursos,
                  <br />
                  <span className="border-b-4 border-yellow-400">más aprendizaje</span>
                </p>
              </div>
              <div className="py-2 pr-2">
                <h2 className="text-xl font-extrabold text-epn-900 dark:text-white">¿Por qué usar el sistema?</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Sabemos que cada proyecto académico necesita herramientas diferentes.
                  Por eso, te ofrecemos una plataforma que te permite acceder a recursos
                  de forma fácil, rápida y con recomendaciones personalizadas.
                </p>
                <ul className="mt-5 space-y-3">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <Icon size={18} stroke={2.5} className="shrink-0 text-brand-500">
                        {icons.check}
                      </Icon>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            {/* ¿Cómo funciona? */}
            <article
              id="como-funciona"
              className="rounded-2xl bg-blue-50/70 dark:bg-slate-900 p-5 ring-1 ring-blue-100 dark:ring-slate-800"
            >
              <h2 className="text-xl font-extrabold text-epn-900 dark:text-white">¿Cómo funciona?</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                En pocos pasos podrás acceder a los recursos que necesitas.
              </p>
              <ol className="mt-7 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative flex flex-col items-center px-2 text-center">
                    <div className="relative grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      <span className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <Icon size={30} stroke={2.2}>{icons[s.icon]}</Icon>
                    </div>
                    <h4 className="mt-4 text-sm font-bold text-epn-900 dark:text-white">{s.title}</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
                    {i < STEPS.length - 1 && (
                      <Icon
                        size={20}
                        className="absolute top-6 -right-2.5 hidden text-brand-500 sm:block"
                      >
                        {icons.arrow}
                      </Icon>
                    )}
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        {/* RECOMENDACIONES */}
        <section id="recomendaciones" className="scroll-mt-16 pb-10">
          <div className={container}>
            <div className="grid items-center gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:grid-cols-[auto_1fr] md:p-8 dark:bg-slate-900 dark:ring-slate-800">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                <Icon size={34} stroke={1.8}>{icons.sparkles}</Icon>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-epn-900 dark:text-white">Recomendaciones inteligentes</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Describe tu proyecto académico o práctica y el sistema te sugerirá recursos similares o
                  complementarios disponibles en las asociaciones, para que no se te escape ninguna herramienta útil.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-epn-900">
          {/* Silueta de montaña decorativa */}
          <svg
            className="pointer-events-none absolute right-0 bottom-0 h-24 w-80 text-brand-500/20"
            viewBox="0 0 320 100"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M0 100 70 60l30 12 60-50 25 15 20-12 55 40 60 15v20z" />
          </svg>
          <div className={`${container} relative flex flex-col gap-6 py-7 md:flex-row md:items-center md:justify-between`}>
            <div className="flex items-start gap-5">
              <Icon size={40} stroke={1.6} className="shrink-0 text-white">
                {icons.cap}
              </Icon>
              <div>
                <h2 className="text-xl font-extrabold text-white">Sé parte de esta iniciativa</h2>
                <p className="mt-1 text-sm text-slate-300">
                  La innovación también se construye con las herramientas adecuadas.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Únete y aprovecha todo lo que el sistema tiene para ti.
                </p>
              </div>
            </div>
            {!autenticado && (
              <div className="flex flex-wrap gap-4 md:mr-24">
                <Link to="/registro" className={`${btnPrimary} px-8 py-2.5 text-sm`}>
                  <Icon size={16}>{icons.user}</Icon> Registrarse
                </Link>
                <Link to="/login" className={`${btnGhost} border-brand-400/60 px-6 py-2.5 text-sm`}>
                  <Icon size={16}>{icons.login}</Icon> Iniciar sesión
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer id="contacto" className="bg-epn-950">
        <div className={`${container} flex flex-col items-center gap-6 py-6 text-center md:flex-row md:justify-between md:text-left`}>
          <Logo light />
          <p className="text-xs leading-relaxed text-slate-300 md:text-center">
            Sistema de Préstamo de Recursos – EPN
            <br />
            Más recursos, más aprendizaje.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex gap-4">
              {Object.entries(SOCIAL_PATHS).map(([name, d]) => (
                <a
                  key={name}
                  href="#"
                  aria-label={name}
                  className="text-white transition-colors hover:text-brand-400"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={d} />
                  </svg>
                </a>
              ))}
            </div>
            <span className="hidden h-6 w-px bg-white/20 sm:block" />
            <span className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} EPN. Todos los derechos reservados.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
