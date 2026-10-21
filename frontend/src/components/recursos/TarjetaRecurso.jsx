import { Link } from 'react-router-dom'
import EtiquetaEstado from './EtiquetaEstado.jsx'
import ImagenRecurso from './ImagenRecurso.jsx'
import { buscarCategoria } from '../../utils/recursos.jsx'

/* ---------- Tarjeta del catálogo (HU-006/007) ---------- */
export default function TarjetaRecurso({ recurso, indice = 0 }) {
  const categoria = buscarCategoria(recurso.categoria)

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-500/40 motion-safe:animate-aparecer dark:bg-slate-900 dark:ring-slate-800"
      style={{ animationDelay: `${Math.min(indice, 11) * 45}ms` }}
    >
      <ImagenRecurso recurso={recurso} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${categoria.tono}`}>
            {categoria.etiqueta}
          </span>
          <EtiquetaEstado estado={recurso.estado} />
        </div>
        <h3 className="mt-3 text-base leading-snug font-bold text-epn-900 dark:text-white">
          {/* el enlace cubre toda la tarjeta */}
          <Link to={`/recursos/${recurso._id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {recurso.nombre}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
          {recurso.descripcion || 'Sin descripción.'}
        </p>
      </div>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-brand-500 group-has-[:focus-visible]:ring-2" aria-hidden="true" />
    </article>
  )
}
