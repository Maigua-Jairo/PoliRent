import { useState } from 'react'
import DialogoConfirmacion from '../DialogoConfirmacion.jsx'
import { cancelarPrestamo } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'

/* ---------- Confirma y cancela una solicitud; avisa el resultado con onResultado({ tipo, texto }) ---------- */
export default function DialogoCancelarPrestamo({ prestamo, onCerrar, onResultado }) {
  const [cancelando, setCancelando] = useState(false)

  const confirmar = async () => {
    setCancelando(true)
    try {
      const respuesta = await cancelarPrestamo(prestamo._id)
      onResultado({ tipo: 'exito', texto: respuesta.msg, prestamo: respuesta.prestamo })
    } catch (e) {
      onResultado({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setCancelando(false)
      onCerrar()
    }
  }

  return (
    <DialogoConfirmacion
      abierto={Boolean(prestamo)}
      titulo="Cancelar solicitud"
      textoConfirmar="Sí, cancelar"
      textoCancelar="Volver"
      procesando={cancelando}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    >
      ¿Seguro que deseas cancelar tu solicitud de{' '}
      <strong className="text-slate-800 dark:text-slate-100">{prestamo?.recurso?.nombre ?? 'este recurso'}</strong>? Esta acción no se puede
      deshacer.
    </DialogoConfirmacion>
  )
}
