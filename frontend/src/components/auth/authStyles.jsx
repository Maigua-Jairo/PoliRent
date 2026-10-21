export const icons = {
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  id: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16a3 3 0 0 1 6 0M15 10h3M15 14h3" />
    </>
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  cap: (
    <>
      <path d="M2 9 12 4l10 5-10 5z" />
      <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  logout: (
    <>
      <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
}

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/* ---------- Clases reutilizables ---------- */
export const btnPrimary =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60'

/* ---------- Select o textarea sin icono a la izquierda ---------- */
export const selectClass =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3 text-sm text-slate-800 transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

/* ---------- Clase para inputs según estado de error ---------- */
// conIcono: deja espacio para el icono de la izquierda; conFlecha: para la flecha de un <select>
export const inputClass = (error, conIcono = true, conFlecha = false) =>
  `w-full rounded-lg border bg-white py-2.5 ${conFlecha ? 'appearance-none pr-10' : 'pr-3'} ${conIcono ? 'pl-10' : 'pl-3'} text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:ring-4 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/15 dark:border-slate-700'
  }`
