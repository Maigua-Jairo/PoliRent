import { Outlet } from 'react-router-dom'
import NavbarSitio, { container } from './NavbarSitio.jsx'

/* ---------- Ficha pública de un recurso: mismo navbar que la landing; aquí se reserva, fuera del panel ---------- */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavbarSitio activo="recursos" />
      <main className={`${container} py-8`}>
        <Outlet />
      </main>
    </div>
  )
}
