import useDarkMode from '../hooks/darkMode.js'

const sol = (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
)
const luna = <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />

/* ---------- Botón para alternar modo claro / oscuro ---------- */
export default function ThemeToggle({ className = '' }) {
  const isDarkMode = useDarkMode((state) => state.isDarkMode)
  const toggleDarkMode = useDarkMode((state) => state.toggleDarkMode)
  const etiqueta = isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      aria-label={etiqueta}
      title={etiqueta}
      className={`rounded-lg p-2 text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isDarkMode ? sol : luna}
      </svg>
    </button>
  )
}
