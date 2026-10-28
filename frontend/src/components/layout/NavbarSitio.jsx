import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '../Icon.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import SesionUsuario from '../SesionUsuario.jsx'
import { iconos } from './iconos.jsx'
import { useAuthStore } from '../../store/authStore.js'

const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const btnPrimary = `${btn} bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600`
const btnOutline = `${btn} border border-brand-500 text-brand-600 hover:bg-brand-500/10 dark:text-brand-400`

export const container = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10'

// Secciones de la landing (Home.jsx)
const NAV_LINKS = [
  { seccion: 'inicio', label: 'Inicio' },
  { seccion: 'recursos', label: 'Recursos' },
  { seccion: 'como-funciona', label: 'Préstamos' },
  { seccion: 'recomendaciones', label: 'Recomendaciones' },
  { seccion: 'contacto', label: 'Contacto' },
]

/* En la landing es un ancla; desde otra página vuelve a la landing en esa sección */
function EnlaceSeccion({ seccion, enLanding, ...props }) {
  return enLanding ? <a href={`#${seccion}`} {...props} /> : <Link to={`/#${seccion}`} {...props} />
}

/* ---------- Logo (también en el pie de la landing) ---------- */
export function Logo({ light = false }) {
  const { pathname } = useLocation()
  return (
    <EnlaceSeccion seccion="inicio" enLanding={pathname === '/'} className="flex shrink-0 items-center gap-2.5">
      <span className={`text-2xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-epn-900 dark:text-white'}`}>PoliRent</span>
      <span className={`ml-2 hidden text-[11px] leading-tight sm:block lg:hidden xl:block ${light ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
        Escuela Politécnica
        <br />
        Nacional
      </span>
    </EnlaceSeccion>
  )
}

/* ---------- Navbar del sitio público: landing y ficha de recursos ---------- */
export default function NavbarSitio({ activo = 'inicio' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const autenticado = useAuthStore((state) => Boolean(state.token))
  const enLanding = useLocation().pathname === '/'

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className={`${container} flex h-16 items-center justify-between gap-6`}>
        <Logo />

        <nav aria-label="Sitio" className="hidden h-full items-center gap-5 lg:flex xl:gap-8">
          {NAV_LINKS.map((link) => (
            <EnlaceSeccion
              key={link.seccion}
              seccion={link.seccion}
              enLanding={enLanding}
              aria-current={link.seccion === activo ? 'page' : undefined}
              className={`relative flex h-full items-center text-sm font-semibold transition-colors ${
                link.seccion === activo
                  ? 'text-brand-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-500 dark:text-brand-400'
                  : 'text-slate-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400'
              }`}
            >
              {link.label}
            </EnlaceSeccion>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex xl:gap-4">
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
            <Icon size={24}>{menuOpen ? iconos.cerrar : iconos.menu}</Icon>
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <nav aria-label="Sitio (móvil)" className="border-t border-slate-200 bg-white lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className={`${container} flex flex-col gap-1 py-4`}>
            {NAV_LINKS.map((link) => (
              <EnlaceSeccion
                key={link.seccion}
                seccion={link.seccion}
                enLanding={enLanding}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  link.seccion === activo
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </EnlaceSeccion>
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
  )
}
