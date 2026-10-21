import { Link } from 'react-router-dom'
import { icons } from './authStyles.jsx'
import emblem from '../../assets/images/EPN Tech Education Emblem.png'
import ThemeToggle from '../ThemeToggle.jsx'
import Icon from '../Icon.jsx'

/* ---------- Campo de formulario con icono y mensaje de error ---------- */
export function Field({ id, label, icon, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-epn-900 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={18}
          className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 ${
            error ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          {icons[icon]}
        </Icon>
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  )
}

/* ---------- Layout de pantalla dividida para login / registro ---------- */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_1.15fr] dark:bg-slate-950">
      {/* Panel institucional */}
      <aside className="relative isolate hidden overflow-hidden bg-epn-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-epn-950 via-epn-900 to-epn-800" />
        <div className="absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-brand-400/15 blur-3xl" />
        <svg
          className="pointer-events-none absolute right-0 bottom-0 -z-10 h-32 w-[28rem] text-brand-500/15"
          viewBox="0 0 320 100"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 100 70 60l30 12 60-50 25 15 20-12 55 40 60 15v20z" />
        </svg>

        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span className="text-2xl font-extrabold tracking-tight">PoliRent</span>
          <span className="ml-2 text-[11px] leading-tight text-slate-300">
            Escuela Politécnica
            <br />
            Nacional
          </span>
        </Link>

        <div className="max-w-md">
          <img src={emblem} alt="Emblema EPN" className="mb-8 h-28 w-auto drop-shadow-xl" />
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-white">
            Tu proyecto, nuestras <span className="block text-brand-400">herramientas</span>
          </h2>
          <p className="mt-4 leading-relaxed text-slate-300">
            Accede al préstamo de recursos técnicos y manuales de la comunidad politécnica.
          </p>
          <p className="mt-8 -rotate-3 font-script text-3xl font-bold text-white">
            Más recursos, <span className="border-b-4 border-yellow-400">más aprendizaje</span>
          </p>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} EPN. Todos los derechos reservados.
        </p>
      </aside>

      {/* Panel del formulario */}
      <main className="flex flex-col px-4 py-6 sm:px-8 lg:px-16">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-400"
          >
            <Icon size={18}>{icons.back}</Icon> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-epn-900 lg:hidden dark:text-white">
              PoliRent
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  )
}
