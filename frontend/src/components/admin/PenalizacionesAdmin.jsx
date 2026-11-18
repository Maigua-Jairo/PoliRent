import { useCallback, useMemo, useState } from 'react'
import Alerta from '../Alerta.jsx'
import DialogoConfirmacion from '../DialogoConfirmacion.jsx'
import { CabeceraSeccion, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'
import { buscarCategoria, CATEGORIAS } from '../../utils/recursos.jsx'
import { obtenerMensajeError } from '../../services/authService.js'
import { anularPenalizacion, pagarPenalizacion } from '../../services/penalizacionService.js'

const ETIQUETAS_TIPO = {
  atraso: 'Atraso',
  danio: 'Daño',
  perdida: 'Pérdida',
}

const ESTADOS = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'pagada', etiqueta: 'Pagada' },
  { valor: 'anulada', etiqueta: 'Anulada' },
]

const TONOS_ESTADO = {
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  pagada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  anulada: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

const formatearMoneda = (monto) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(monto) || 0)

const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-EC', { dateStyle: 'short', timeZone: 'UTC' }).format(valor)
}

const fechaUTC = (fecha) => {
  if (!fecha) return ''
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime()) ? '' : valor.toISOString().slice(0, 10)
}

const textoBusqueda = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

const nombreUsuario = (usuario) =>
  [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || 'Estudiante no disponible'

export default function PenalizacionesAdmin({
  penalizaciones,
  total,
  totalPendiente,
  cargando,
  error,
  onActualizar,
}) {
  const [filtros, setFiltros] = useState({ estudiante: '', estado: '', categoria: '', desde: '', hasta: '' })
  const [accion, setAccion] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: '' })

  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)
  const visibles = useMemo(() => {
    const consulta = textoBusqueda(filtros.estudiante.trim())
    if (rangoInvalido) return []

    return penalizaciones.filter((penalizacion) => {
      if (filtros.estado && penalizacion.estado !== filtros.estado) return false
      if (filtros.categoria && penalizacion.recurso?.categoria !== filtros.categoria) return false
      const fecha = fechaUTC(penalizacion.createdAt)
      if (filtros.desde && (!fecha || fecha < filtros.desde)) return false
      if (filtros.hasta && (!fecha || fecha > filtros.hasta)) return false
      if (!consulta) return true

      const usuario = penalizacion.usuario ?? {}
      const datosEstudiante = [
        usuario.nombres,
        usuario.apellidos,
        usuario.correo,
        usuario.cedula,
      ].map(textoBusqueda).join(' ')
      return datosEstudiante.includes(consulta)
    })
  }, [filtros, penalizaciones, rangoInvalido])

  const actualizarFiltro = (campo) => (evento) => {
    setFiltros((actuales) => ({ ...actuales, [campo]: evento.target.value }))
  }

  const limpiarFiltros = () => setFiltros({ estudiante: '', estado: '', categoria: '', desde: '', hasta: '' })

  const cerrarAccion = useCallback(() => {
    if (procesando) return
    setAccion(null)
    setMotivo('')
  }, [procesando])

  const confirmarAccion = async () => {
    if (!accion) return
    const motivoLimpio = motivo.trim()
    if (accion.tipo === 'anular' && (motivoLimpio.length < 3 || motivoLimpio.length > 200)) return

    setProcesando(true)
    try {
      const respuesta = accion.tipo === 'pagar'
        ? await pagarPenalizacion(accion.penalizacion._id)
        : await anularPenalizacion(accion.penalizacion._id, motivoLimpio)
      setAviso({ tipo: 'exito', texto: respuesta.msg })
      onActualizar()
    } catch (e) {
      setAviso({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setProcesando(false)
      setAccion(null)
      setMotivo('')
    }
  }

  const motivoValido = motivo.trim().length >= 3 && motivo.trim().length <= 200
  const estudianteAccion = nombreUsuario(accion?.penalizacion?.usuario)
  const recursoAccion = accion?.penalizacion?.recurso?.nombre ?? 'el recurso'

  return (
    <section aria-labelledby="titulo-penalizaciones-admin" className={`${tarjeta} overflow-hidden`}>
      <div className="p-5 pb-4">
        <CabeceraSeccion id="titulo-penalizaciones-admin" titulo="Penalizaciones" />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{total} {total === 1 ? 'registro' : 'registros'}</span>
          <span>
            Pendiente de pago:{' '}
            <strong className="font-semibold text-epn-900 dark:text-white">{formatearMoneda(totalPendiente)}</strong>
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Las acciones de pago y anulación están disponibles solo para penalizaciones pendientes.
        </p>
      </div>

      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Buscar estudiante
          <input
            type="search"
            value={filtros.estudiante}
            onChange={actualizarFiltro('estudiante')}
            placeholder="Nombre, correo o cédula"
            aria-label="Buscar por estudiante"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Estado
          <select
            value={filtros.estado}
            onChange={actualizarFiltro('estado')}
            aria-label="Filtrar por estado"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((estado) => <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Tipo de recurso
          <select
            value={filtros.categoria}
            onChange={actualizarFiltro('categoria')}
            aria-label="Filtrar por tipo de recurso"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Todos los tipos</option>
            {CATEGORIAS.map((categoria) => <option key={categoria.valor} value={categoria.valor}>{categoria.etiqueta}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Fecha desde
          <input
            type="date"
            value={filtros.desde}
            onChange={actualizarFiltro('desde')}
            aria-label="Fecha desde"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Fecha hasta
          <input
            type="date"
            value={filtros.hasta}
            onChange={actualizarFiltro('hasta')}
            aria-label="Fecha hasta"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <div className="flex items-center justify-between gap-3 sm:col-span-2 xl:col-span-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando {visibles.length} de {total} penalizaciones
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            disabled={!filtros.estudiante && !filtros.estado && !filtros.categoria && !filtros.desde && !filtros.hasta}
            className="text-xs font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-300"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {rangoInvalido && (
        <Alerta className="mx-5 mb-4">La fecha desde no puede ser posterior a la fecha hasta.</Alerta>
      )}
      <Alerta tipo={aviso.tipo} className="mx-5 mb-4">{aviso.texto}</Alerta>
      {error ? (
        <p role="alert" className="px-5 pb-5 text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : cargando ? (
        <div className="space-y-2 px-5 pb-5" role="status" aria-label="Cargando penalizaciones">
          {[0, 1, 2].map((fila) => <Esqueleto key={fila} className="h-12" />)}
        </div>
      ) : !penalizaciones.length ? (
        <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">Aún no hay penalizaciones registradas.</p>
      ) : !visibles.length ? (
        <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">No hay penalizaciones que coincidan con los filtros.</p>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full min-w-[1440px] text-left text-sm">
            <caption className="sr-only">Listado completo de penalizaciones registradas</caption>
            <thead className="sticky top-0 bg-slate-50 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                {[
                  'ID',
                  'Acciones',
                  'Fecha de registro',
                  'Última actualización',
                  'Estudiante',
                  'Recurso',
                  'Tipo',
                  'Días',
                  'Descripción',
                  'Monto',
                  'Estado',
                  'Fecha de pago',
                  'Motivo de anulación',
                ].map((columna) => (
                  <th key={columna} scope="col" className="px-4 py-3">{columna}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibles.map((penalizacion, indice) => {
                const usuario = penalizacion.usuario
                const recurso = penalizacion.recurso
                const categoria = recurso?.categoria ? buscarCategoria(recurso.categoria).etiqueta : ''
                return (
                  <tr key={penalizacion._id} className="align-top text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3">{indice + 1}</td>
                    <td className="px-4 py-3">
                      {penalizacion.estado === 'pendiente' ? (
                        <div className="flex min-w-36 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setAccion({ tipo: 'pagar', penalizacion })}
                            disabled={procesando || cargando}
                            aria-label={`Registrar pago de ${nombreUsuario(usuario)} por ${recurso?.nombre ?? 'el recurso'}`}
                            className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-50"
                          >
                            Registrar pago
                          </button>
                          <button
                            type="button"
                            onClick={() => setAccion({ tipo: 'anular', penalizacion })}
                            disabled={procesando || cargando}
                            aria-label={`Anular penalización de ${nombreUsuario(usuario)} por ${recurso?.nombre ?? 'el recurso'}`}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            Anular
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatearFecha(penalizacion.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatearFecha(penalizacion.updatedAt)}</td>
                    <td className="max-w-52 px-4 py-3">
                      <p className="font-semibold text-epn-900 dark:text-white">{nombreUsuario(usuario)}</p>
                      {usuario?.correo && <p className="mt-0.5 text-xs">{usuario.correo}</p>}
                      {usuario?.cedula && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Cédula: {usuario.cedula}</p>}
                    </td>
                    <td className="max-w-52 px-4 py-3">
                      <p className="font-medium">{recurso?.nombre ?? 'Recurso eliminado'}</p>
                      {categoria && <p className="mt-0.5 text-xs">{categoria}</p>}
                      {typeof recurso?.precio === 'number' && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Reposición: {formatearMoneda(recurso.precio)}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{ETIQUETAS_TIPO[penalizacion.tipo] ?? penalizacion.tipo}</td>
                    <td className="px-4 py-3">{penalizacion.dias ?? '—'}</td>
                    <td className="max-w-64 whitespace-normal px-4 py-3">{penalizacion.descripcion || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatearMoneda(penalizacion.monto)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONOS_ESTADO[penalizacion.estado] ?? TONOS_ESTADO.anulada}`}>
                        {ESTADOS.find((estado) => estado.valor === penalizacion.estado)?.etiqueta ?? penalizacion.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatearFecha(penalizacion.fechaPago)}</td>
                    <td className="max-w-56 whitespace-normal px-4 py-3">{penalizacion.motivoAnulacion || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmacion
        abierto={Boolean(accion)}
        titulo={accion?.tipo === 'pagar' ? 'Registrar pago' : 'Anular penalización'}
        textoConfirmar={accion?.tipo === 'pagar' ? 'Sí, registrar pago' : 'Sí, anular'}
        textoCancelar="Volver"
        procesando={procesando}
        confirmarDeshabilitado={accion?.tipo === 'anular' && !motivoValido}
        tonoConfirmar={accion?.tipo === 'pagar' ? 'principal' : 'destructivo'}
        onConfirmar={confirmarAccion}
        onCancelar={cerrarAccion}
      >
        {accion?.tipo === 'pagar' ? (
          <p>
            ¿Confirmas el pago de <strong className="text-slate-800 dark:text-slate-100">{formatearMoneda(accion.penalizacion.monto)}</strong> de {estudianteAccion} por {recursoAccion}?
          </p>
        ) : (
          <>
            <p>
              Se anulará la penalización de <strong className="text-slate-800 dark:text-slate-100">{estudianteAccion}</strong> por {recursoAccion}. Esta acción no se puede deshacer.
            </p>
            <label htmlFor="motivo-anulacion-penalizacion" className="mt-4 mb-1.5 block font-semibold text-epn-900 dark:text-slate-200">
              Motivo de anulación
            </label>
            <textarea
              id="motivo-anulacion-penalizacion"
              rows={3}
              value={motivo}
              maxLength={200}
              onChange={(evento) => setMotivo(evento.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{motivo.length}/200 (mínimo 3 caracteres)</p>
          </>
        )}
      </DialogoConfirmacion>
    </section>
  )
}
