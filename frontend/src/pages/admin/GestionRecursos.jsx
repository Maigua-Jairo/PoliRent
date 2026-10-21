import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Alerta from '../../components/Alerta.jsx'
import DialogoConfirmacion from '../../components/DialogoConfirmacion.jsx'
import Icon from '../../components/Icon.jsx'
import EtiquetaEstado from '../../components/recursos/EtiquetaEstado.jsx'
import FiltrosRecursos from '../../components/recursos/FiltrosRecursos.jsx'
import ImagenRecurso from '../../components/recursos/ImagenRecurso.jsx'
import { EsqueletoRecursos, ErrorRecursos, SinRecursos } from '../../components/recursos/EstadosLista.jsx'
import { btnPrimary, btnSecondary } from '../../components/auth/authStyles.jsx'
import useFiltrosRecursos from '../../hooks/useFiltrosRecursos.js'
import useRecursos from '../../hooks/useRecursos.js'
import { eliminarRecurso } from '../../services/recursoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { buscarCategoria } from '../../utils/recursos.jsx'

const mas = <path d="M12 5v14M5 12h14" />
const btnNuevo = btnPrimary.replace('w-full', 'w-auto').replace('px-6 py-3', 'px-5 py-2.5 text-sm')

/* ---------- Gestión de recursos del administrador (HU-003) ---------- */
export default function GestionRecursos() {
  const location = useLocation()
  const filtros = useFiltrosRecursos()
  const { recursos, cargando, error, recargar } = useRecursos(filtros.filtros)
  const [aEliminar, setAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: location.state?.mensaje ?? '' })

  const cancelar = useCallback(() => setAEliminar(null), [])

  const confirmarEliminacion = async () => {
    setEliminando(true)
    try {
      const respuesta = await eliminarRecurso(aEliminar._id)
      setAviso({ tipo: 'exito', texto: respuesta.msg })
      recargar()
    } catch (e) {
      setAviso({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setEliminando(false)
      setAEliminar(null)
    }
  }

  const nuevo = (
    <Link to="/admin/recursos/nuevo" className={btnNuevo}>
      <Icon size={18}>{mas}</Icon> Nuevo recurso
    </Link>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="-rotate-2 font-script text-2xl font-bold text-brand-600 dark:text-brand-400">Panel de administración</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Gestionar recursos</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Registra, actualiza y elimina los recursos del catálogo.</p>
        </div>
        {nuevo}
      </div>

      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
      <FiltrosRecursos {...filtros} />

      {cargando ? (
        <EsqueletoRecursos cantidad={3} />
      ) : error ? (
        <ErrorRecursos mensaje={error} onReintentar={recargar} />
      ) : recursos.length === 0 ? (
        <SinRecursos hayFiltros={filtros.hayFiltros} onLimpiar={filtros.limpiar}>
          {!filtros.hayFiltros && nuevo}
        </SinRecursos>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {recursos.map((r, i) => {
            const categoria = buscarCategoria(r.categoria)
            const prestado = r.estado === 'prestado'
            return (
              <li
                key={r._id}
                className="grid grid-cols-[4rem_1fr] items-center gap-4 p-4 motion-safe:animate-aparecer sm:grid-cols-[4rem_1fr_auto_auto] sm:px-6"
                style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
              >
                <ImagenRecurso recurso={r} tamanoIcono={22} className="h-16 w-16 rounded-xl" />
                <div className="min-w-0">
                  <Link to={`/recursos/${r._id}`} className="font-bold text-epn-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400">
                    {r.nombre}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{r.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${categoria.tono}`}>{categoria.etiqueta}</span>
                  <EtiquetaEstado estado={r.estado} />
                </div>
                <div className="col-span-2 flex gap-2 sm:col-span-1 sm:justify-end">
                  <Link to={`/admin/recursos/${r._id}/editar`} className={btnSecondary} aria-label={`Editar ${r.nombre}`}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAEliminar(r)}
                    disabled={prestado}
                    title={prestado ? 'No se puede eliminar un recurso prestado' : undefined}
                    aria-label={`Eliminar ${r.nombre}`}
                    className={`${btnSecondary} text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10`}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <DialogoConfirmacion
        abierto={Boolean(aEliminar)}
        titulo="Eliminar recurso"
        textoConfirmar="Sí, eliminar"
        procesando={eliminando}
        onConfirmar={confirmarEliminacion}
        onCancelar={cancelar}
      >
        ¿Seguro que deseas eliminar <strong className="text-slate-800 dark:text-slate-100">{aEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
      </DialogoConfirmacion>
    </div>
  )
}
