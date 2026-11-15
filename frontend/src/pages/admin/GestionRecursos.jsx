import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Alerta from '../../components/Alerta.jsx'
import DialogoConfirmacion from '../../components/DialogoConfirmacion.jsx'
import Icon from '../../components/Icon.jsx'
import EtiquetaEstado from '../../components/recursos/EtiquetaEstado.jsx'
import ImagenRecurso from '../../components/recursos/ImagenRecurso.jsx'
import { ErrorRecursos, SinRecursos } from '../../components/recursos/EstadosLista.jsx'
import { Esqueleto, tarjeta } from '../../components/dashboard/comunes.jsx'
import { iconos } from '../../components/layout/iconos.jsx'
import { btnPrimary } from '../../components/auth/authStyles.jsx'
import FiltrosTablaAdmin from '../../components/admin/FiltrosTablaAdmin.jsx'
import useFiltrosRecursos from '../../hooks/useFiltrosRecursos.js'
import useRecursos from '../../hooks/useRecursos.js'
import { eliminarRecurso } from '../../services/recursoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { buscarCategoria, ESTADOS } from '../../utils/recursos.jsx'

const btnNuevo = btnPrimary.replace('w-full', 'w-full sm:w-auto').replace('px-6 py-3', 'px-5 py-2.5 text-sm')
const btnIcono =
  'grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-400'
const columnas = 'md:grid md:grid-cols-[6rem_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] md:items-center md:gap-4'

/* ---------- Gestión de recursos del administrador (HU-003) ---------- */
export default function GestionRecursos() {
  const location = useLocation()
  const filtros = useFiltrosRecursos({ incluirCategoria: false })
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
      <Icon size={18}>{iconos.mas}</Icon> Agregar recurso
    </Link>
  )

  let contenido
  if (cargando) {
    contenido = (
      <div className="space-y-3 p-4" role="status" aria-label="Cargando recursos">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} className="h-16" />
        ))}
      </div>
    )
  } else if (error) {
    contenido = (
      <div className="p-6">
        <ErrorRecursos mensaje={error} onReintentar={recargar} />
      </div>
    )
  } else if (!recursos.length) {
    contenido = (
      <div className="p-6">
        <SinRecursos hayFiltros={filtros.hayFiltros} onLimpiar={filtros.limpiar}>
          {!filtros.hayFiltros && nuevo}
        </SinRecursos>
      </div>
    )
  } else {
    contenido = (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {recursos.map((r, i) => {
          const prestado = r.estado === 'prestado'
          return (
            <li
              key={r._id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 motion-safe:animate-aparecer sm:px-6 ${columnas}`}
              style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
            >
              <span className="w-20 shrink-0 font-mono text-xs text-slate-500 sm:w-24 md:w-auto dark:text-slate-400">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ImagenRecurso recurso={r} tamanoIcono={18} className="h-12 w-12 shrink-0 rounded-lg" />
                <span className="min-w-0">
                  <Link
                    to={`/recursos/${r._id}`}
                    className="block truncate text-sm font-semibold text-epn-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400"
                  >
                    {r.nombre}
                  </Link>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{r.descripcion || 'Sin descripción'}</span>
                </span>
              </div>
              <span className="min-w-0 truncate text-center text-sm text-slate-500 dark:text-slate-400">{buscarCategoria(r.categoria).etiqueta}</span>
              <span className="flex justify-center">
                <EtiquetaEstado estado={r.estado} />
              </span>
              <div className="ml-auto flex gap-1 md:ml-0 md:justify-center">
                <Link to={`/recursos/${r._id}`} className={btnIcono} aria-label={`Ver ${r.nombre}`} title="Ver en el catálogo">
                  <Icon size={18}>{iconos.ojo}</Icon>
                </Link>
                <Link to={`/admin/recursos/${r._id}/editar`} className={btnIcono} aria-label={`Editar ${r.nombre}`} title="Editar">
                  <Icon size={18}>{iconos.lapiz}</Icon>
                </Link>
                <button
                  type="button"
                  onClick={() => setAEliminar(r)}
                  disabled={prestado}
                  title={prestado ? 'No se puede eliminar un recurso prestado' : 'Eliminar'}
                  aria-label={`Eliminar ${r.nombre}`}
                  className={`${btnIcono} hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400`}
                >
                  <Icon size={18}>{iconos.papelera}</Icon>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">Gestión de Recursos</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Administra las herramientas, categorías y disponibilidad.</p>
      </div>

      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FiltrosTablaAdmin
          busqueda={filtros.buscar}
          onBusqueda={filtros.onBuscar}
          estado={filtros.estado}
          onEstado={filtros.onEstado}
          estados={ESTADOS}
          etiquetaBusqueda="Buscar recurso..."
        />
        {nuevo}
      </div>

      <section aria-label="Recursos" className={`${tarjeta} overflow-hidden`}>
        <div
          className="scroll-tabla max-h-[70vh] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Lista de herramientas"
          tabIndex={0}
        >
          <div className="scroll-progreso sticky top-0 z-20 -mb-[3px] h-[3px] bg-brand-500" aria-hidden="true" />
          <div
            className={`sticky top-[3px] z-10 hidden border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold tracking-wide text-slate-600 uppercase md:grid dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 ${columnas}`}
            aria-hidden="true"
          >
            <span>ID</span>
            <span>Recurso</span>
            <span className="text-center">Categoría</span>
            <span className="text-center">Estado</span>
            <span className="text-center">Acciones</span>
          </div>
          {contenido}
        </div>
      </section>

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
