import { useCallback, useState } from 'react'
import DialogoConfirmacion from '../DialogoConfirmacion.jsx'
import { rechazarPrestamo } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'

// Igual que validarRechazo en backend/src/middlewares/validationMiddleware.js
const MOTIVO_RECHAZO_MAX = 200

/* ---------- Rechaza una solicitud con un motivo opcional; avisa con onResultado({ tipo, texto }) ---------- */
export default function DialogoRechazo({ prestamo, onCerrar, onResultado }) {
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  // estable: DialogoConfirmacion vuelve a enfocar su botón si cambia onCancelar
  const cerrar = useCallback(() => {
    setMotivo('')
    onCerrar()
  }, [onCerrar])

  const confirmar = async () => {
    setProcesando(true)
    try {
      const respuesta = await rechazarPrestamo(prestamo._id, motivo.trim() || undefined)
      onResultado({ tipo: 'exito', texto: respuesta.msg })
    } catch (e) {
      onResultado({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setProcesando(false)
      cerrar()
    }
  }

  return (
    <DialogoConfirmacion
      abierto={Boolean(prestamo)}
      titulo="Rechazar solicitud"
      textoConfirmar="Sí, rechazar"
      textoCancelar="Volver"
      procesando={procesando}
      onConfirmar={confirmar}
      onCancelar={cerrar}
    >
      <p>
        Vas a rechazar la solicitud de <strong className="text-slate-800 dark:text-slate-100">{prestamo?.recurso?.nombre ?? 'este recurso'}</strong>.
      </p>
      <label htmlFor="motivo-rechazo" className="mt-4 mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
        Motivo <span className="font-normal text-slate-400">(opcional, lo verá el estudiante)</span>
      </label>
      <textarea
        id="motivo-rechazo"
        rows={3}
        value={motivo}
        maxLength={MOTIVO_RECHAZO_MAX}
        onChange={(e) => setMotivo(e.target.value)}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <p className="mt-1 text-right text-xs text-slate-400">
        {motivo.length}/{MOTIVO_RECHAZO_MAX}
      </p>
    </DialogoConfirmacion>
  )
}
