import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import ImagenRecurso from '../recursos/ImagenRecurso.jsx'
import { iconos } from '../layout/iconos.jsx'
import { buscarCategoria } from '../../utils/recursos.jsx'

/* ---------- Recurso recomendado; la imagen viene de recurso.imagen (Cloudinary) ---------- */
export default function TarjetaRecomendada({ recurso, razon }) {
  const categoria = buscarCategoria(recurso.categoria)
  return (
    <article className="flex flex-col rounded-xl bg-white p-3 ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-800/60 dark:ring-slate-700">
      <div className="relative">
        <ImagenRecurso recurso={recurso} tamanoIcono={32} className="aspect-4/3 w-full rounded-lg" />
        <span className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-bold ${categoria.tono}`}>
          {categoria.etiqueta}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-bold text-epn-900 dark:text-white">
        <Link to={`/recursos/${recurso._id}`} className="hover:text-brand-600 hover:underline dark:hover:text-brand-400">
          {recurso.nombre}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{recurso.descripcion || razon}</p>
      {razon && recurso.descripcion && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-brand-600 dark:text-brand-400" title={razon}>
          {razon}
        </p>
      )}
      <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        Disponible
      </p>
      {/* En el panel no se reserva: lleva a la ficha pública del catálogo, donde está la reserva */}
      <Link
        to={`/recursos/${recurso._id}`}
        aria-label={`Ver ${recurso.nombre} en recursos`}
        className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600"
      >
        Ver en recursos <Icon size={12}>{iconos.flecha}</Icon>
      </Link>
    </article>
  )
}
