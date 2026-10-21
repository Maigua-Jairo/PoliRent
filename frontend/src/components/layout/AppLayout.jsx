import { Link, Outlet } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle.jsx'
import SesionUsuario from '../SesionUsuario.jsx'

/* ---------- Layout de las pantallas internas (usuario autenticado) ---------- */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-epn-900 dark:text-white">
            PoliRent
          </Link>
          <div className="flex items-center gap-2">
            <SesionUsuario className="hidden sm:flex" />
            <ThemeToggle />
          </div>
        </div>
        <SesionUsuario className="justify-between border-t border-slate-200 px-4 py-2 sm:hidden dark:border-slate-800" />
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
