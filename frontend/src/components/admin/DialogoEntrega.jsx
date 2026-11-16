import { useCallback, useState } from 'react'
import Alerta from '../Alerta.jsx'
import DialogoConfirmacion from '../DialogoConfirmacion.jsx'
import { registrarEntrega } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { TAMANO_MAXIMO_IMAGEN, TIPOS_IMAGEN } from '../../utils/recursos.jsx'

const LIMITE_OBSERVACIONES = 300
const CONDICIONES_ENTREGA = [
  { valor: 'bueno', etiqueta: 'Bueno' },
  { valor: 'danado', etiqueta: 'Dañado' },
  { valor: 'incompleto', etiqueta: 'Incompleto' },
]

export default function DialogoEntrega({ prestamo, onCerrar, onResultado, onRecargar }) {
  const [responsable, setResponsable] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [condicion, setCondicion] = useState('bueno')
  const [evidencia, setEvidencia] = useState(null)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cerrar = useCallback(() => {
    setResponsable('')
    setObservaciones('')
    setCondicion('bueno')
    setEvidencia(null)
    setError('')
    onCerrar()
  }, [onCerrar])

  const elegirEvidencia = (event) => {
    const archivo = event.target.files?.[0]
    if (!archivo) {
      setEvidencia(null)
      return
    }
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setEvidencia(null)
      setError('La evidencia debe ser una imagen JPG, PNG o WEBP.')
      event.target.value = ''
      return
    }
    if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
      setEvidencia(null)
      setError('La evidencia no debe superar los 2 MB.')
      event.target.value = ''
      return
    }
    setEvidencia(archivo)
    setError('')
  }

  const confirmar = async () => {
    const nombreResponsable = responsable.trim()
    const detalle = observaciones.trim()
    if (nombreResponsable && (nombreResponsable.length < 3 || nombreResponsable.length > 100)) {
      setError('El responsable debe tener entre 3 y 100 caracteres.')
      return
    }
    if (detalle.length > LIMITE_OBSERVACIONES) {
      setError(`Las observaciones no deben superar los ${LIMITE_OBSERVACIONES} caracteres.`)
      return
    }

    setError('')
    setProcesando(true)
    try {
      const respuesta = await registrarEntrega(prestamo._id, {
        responsable: nombreResponsable,
        observaciones: detalle,
        condicion,
        evidencia,
      })
      onResultado({ tipo: 'exito', texto: respuesta.msg })
      onRecargar()
      cerrar()
    } catch (e) {
      setError(obtenerMensajeError(e))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <DialogoConfirmacion
      abierto={Boolean(prestamo)}
      titulo="Registrar entrega"
      textoConfirmar="Registrar entrega"
      textoCancelar="Cancelar"
      procesando={procesando}
      onConfirmar={confirmar}
      onCancelar={cerrar}
    >
      <div className="space-y-4">
        <p>
          Registrar la entrega de <strong className="text-slate-800 dark:text-slate-100">{prestamo?.recurso?.nombre ?? 'este recurso'}</strong>
          {' '}a {prestamo?.usuario?.nombres ?? 'el estudiante'}.
        </p>
        <Alerta>{error}</Alerta>
        <div>
          <label htmlFor="condicion-entrega" className="mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
            Condición del recurso al entregarlo
          </label>
          <select
            id="condicion-entrega"
            value={condicion}
            onChange={(event) => setCondicion(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {CONDICIONES_ENTREGA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="responsable-entrega" className="mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
            Responsable <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="responsable-entrega"
            type="text"
            value={responsable}
            maxLength={100}
            onChange={(event) => setResponsable(event.target.value)}
            placeholder="Por defecto, tu nombre de administrador"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label htmlFor="observaciones-entrega" className="mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
            Observaciones <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="observaciones-entrega"
            rows={3}
            value={observaciones}
            maxLength={LIMITE_OBSERVACIONES}
            onChange={(event) => setObservaciones(event.target.value)}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{observaciones.length}/{LIMITE_OBSERVACIONES}</p>
        </div>
        <div>
          <label htmlFor="evidencia-entrega" className="mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
            Foto de evidencia <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            id="evidencia-entrega"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={elegirEvidencia}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-500/20 dark:text-slate-300 dark:file:text-brand-300"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Formatos JPG, PNG o WEBP; máximo 2 MB. {evidencia?.name}
          </p>
        </div>
      </div>
    </DialogoConfirmacion>
  )
}
