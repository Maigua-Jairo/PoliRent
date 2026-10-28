import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { EnlaceVer, Esqueleto, tarjeta } from './comunes.jsx'

/* ---------- Tarjeta con una cifra (dashboard del estudiante y del administrador) ---------- */
export function TarjetaResumen({ titulo, valor, detalle, icono, tono, enlace, cargando }) {
  return (
    <article className={`${tarjeta} flex flex-col p-5`}>
      <div className="flex items-start gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-md ${tono}`}>
          <Icon size={24}>{icono}</Icon>
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-epn-900 dark:text-white">{titulo}</h3>
          {cargando ? (
            <Esqueleto className="mt-2 h-7 w-10" />
          ) : (
            <p className="mt-1 text-2xl font-extrabold text-epn-900 dark:text-white">{valor}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{detalle}</p>
        </div>
      </div>
      {enlace && (
        <EnlaceVer to={enlace.to} className="mt-4 self-end">
          {enlace.texto}
        </EnlaceVer>
      )}
    </article>
  )
}

/* ---------- Fila de cifras: solicitudes, préstamos, recomendaciones y devoluciones ---------- */
export default function Resumen({ activas, enPrestamo, recomendaciones, devoluciones, cargando, cargandoRecomendaciones }) {
  const tarjetas = [
    {
      titulo: 'Mis solicitudes',
      valor: activas,
      detalle: 'solicitudes activas',
      icono: iconos.cuenta,
      tono: 'bg-brand-500 shadow-brand-500/30',
      enlace: { to: '/solicitudes', texto: 'Ver todas' },
    },
    {
      titulo: 'En préstamo',
      valor: enPrestamo,
      detalle: 'recursos activos',
      icono: iconos.bolsa,
      tono: 'bg-emerald-500 shadow-emerald-500/30',
      enlace: { to: '/solicitudes?estado=prestamo', texto: 'Ver detalles' },
    },
    {
      titulo: 'Recomendaciones',
      valor: recomendaciones,
      detalle: 'recursos sugeridos para ti',
      icono: iconos.recomendaciones,
      tono: 'bg-violet-500 shadow-violet-500/30',
      enlace: { to: '/recomendaciones', texto: 'Ver recomendaciones' },
      cargando: cargandoRecomendaciones,
    },
    {
      titulo: 'Próximas devoluciones',
      valor: devoluciones,
      detalle: 'en los próximos 3 días',
      icono: iconos.calendario,
      tono: 'bg-amber-500 shadow-amber-500/30',
      enlace: { to: '/solicitudes?estado=prestamo', texto: 'Ver préstamos' },
    },
  ]
  return (
    <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {tarjetas.map((t) => (
        <TarjetaResumen key={t.titulo} cargando={cargando} {...t} />
      ))}
    </section>
  )
}
