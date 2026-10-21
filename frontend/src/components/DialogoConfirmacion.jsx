import { useEffect, useRef } from 'react'
import { btnSecondary } from './auth/authStyles.jsx'

/* ---------- Diálogo modal de confirmación (Escape o clic fuera cancela) ---------- */
export default function DialogoConfirmacion({ abierto, titulo, children, textoConfirmar = 'Confirmar', procesando, onConfirmar, onCancelar }) {
  const botonCancelar = useRef(null)

  useEffect(() => {
    if (!abierto) return
    botonCancelar.current?.focus()
    const alPresionar = (e) => e.key === 'Escape' && !procesando && onCancelar()
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierto, procesando, onCancelar])

  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => !procesando && onCancelar()} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-descripcion"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 motion-safe:animate-aparecer dark:bg-slate-900 dark:ring-slate-800"
      >
        <h2 id="dialogo-titulo" className="text-lg font-bold text-epn-900 dark:text-white">
          {titulo}
        </h2>
        <div id="dialogo-descripcion" className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {children}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={botonCancelar} type="button" onClick={onCancelar} disabled={procesando} className={btnSecondary}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60"
          >
            {procesando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
