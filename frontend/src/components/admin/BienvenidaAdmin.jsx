import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'

/* ---------- Banner del panel de administración (degradado institucional, sin fotografía) ---------- */
export default function BienvenidaAdmin({ usuario }) {
  const nombre = usuario?.nombres?.split(' ')[0] ?? 'administrador'
  return (
    <section
      aria-labelledby="titulo-bienvenida-admin"
      className="relative h-full overflow-hidden rounded-2xl bg-linear-to-br from-epn-950 via-epn-900 to-epn-800 px-6 py-7 text-white shadow-lg sm:px-8 dark:from-slate-900 dark:via-epn-950 dark:to-epn-900 dark:ring-1 dark:ring-slate-800"
    >
      <svg
        className="pointer-events-none absolute right-0 bottom-0 h-3/4 w-full text-white/5 sm:w-3/4"
        viewBox="0 0 320 100"
        preserveAspectRatio="none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0 100 70 55l30 12 60-52 25 15 20-12 55 40 60 15v27z" />
        <path d="M60 100 140 48l40 20 50-30 90 62z" opacity="0.6" />
      </svg>
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">Panel de administración</p>
          <h1 id="titulo-bienvenida-admin" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            ¡Hola, {nombre}!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
            Aquí puedes gestionar los recursos, las solicitudes y el uso de la plataforma de forma eficiente y segura.
          </p>
          <a
            href="#solicitudes-recientes"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
          >
            Ver solicitudes recientes <Icon size={16}>{iconos.flecha}</Icon>
          </a>
        </div>
        <p className="hidden max-w-60 shrink-0 -rotate-6 text-right font-script text-3xl leading-tight font-bold md:block">
          Juntos impulsamos proyectos
          <svg className="mt-1 ml-auto h-3 w-36 text-amber-300" viewBox="0 0 160 12" fill="none" aria-hidden="true">
            <path d="M2 10C40 3 100 1 158 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </p>
      </div>
    </section>
  )
}
