import { Link, NavLink, Outlet } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle.jsx'
import SesionUsuario from '../SesionUsuario.jsx'
import { btnSecondary } from '../auth/authStyles.jsx'
import { esAdministrador, useAuthStore } from '../../store/authStore.js'

const enlace = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

/* ---------- Layout de las pantallas internas (catálogo, perfil, administración) ---------- */
export default function AppLayout() {
  const token = useAuthStore((state) => state.token)
  const usuario = useAuthStore((state) => state.usuario)

  const navegacion = (
    <nav aria-label="Principal" className="flex items-center gap-1">
      <NavLink to="/recursos" end className={enlace}>
        Catálogo
      </NavLink>
      {esAdministrador(usuario) && (
        <NavLink to="/admin/recursos" className={enlace}>
          Gestionar recursos
        </NavLink>
      )}
    </nav>
  )

  const sesion = token ? (
    <SesionUsuario />
  ) : (
    <Link to="/login" className={btnSecondary}>
      Iniciar sesión
    </Link>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-epn-900 dark:text-white">
              PoliRent
            </Link>
            <div className="hidden md:block">{navegacion}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">{sesion}</div>
            <ThemeToggle />
          </div>
        </div>
        {/* En pantallas pequeñas la navegación y la sesión bajan a una segunda fila */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 md:hidden dark:border-slate-800">
          {navegacion}
          <div className="sm:hidden">{sesion}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
