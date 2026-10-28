import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { buscarEstadoPrestamo, formatearFechaHora } from '../../utils/prestamos.js'
import { CabeceraSeccion, EnlaceVer, Esqueleto, tarjeta } from './comunes.jsx'

const ICONO_ESTADO = {
  pendiente: iconos.reloj,
  aprobado: iconos.check,
  entregado: iconos.bolsa,
  devuelto: iconos.devolucion,
  rechazado: iconos.equis,
  cancelado: iconos.equis,
}

/* ---------- Últimos cambios de estado de las solicitudes del estudiante ---------- */
export default function UltimosMovimientos({ prestamos, cargando, limite = 4 }) {
  const recientes = [...prestamos]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt))
    .slice(0, limite)

  let contenido
  if (cargando) {
    contenido = (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} className="h-14" />
        ))}
      </div>
    )
  } else if (!recientes.length) {
    contenido = <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no has realizado solicitudes.</p>
  } else {
    contenido = (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {recientes.map((p) => {
          const estado = buscarEstadoPrestamo(p.estado)
          const fila = (
            <>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${estado.tono}`}>
                <Icon size={18} stroke={2.4}>{ICONO_ESTADO[p.estado] ?? iconos.reloj}</Icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-epn-900 dark:text-white">{estado.movimiento}</span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">{p.recurso?.nombre ?? 'Recurso eliminado'}</span>
                <span className="block text-xs text-slate-400 dark:text-slate-500">{formatearFechaHora(p.updatedAt ?? p.createdAt)}</span>
              </span>
            </>
          )
          return (
            <li key={p._id}>
              <Link
                to={`/solicitudes/${p._id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                {fila}
                <Icon size={16} className="text-slate-400">{iconos.derecha}</Icon>
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <section id="movimientos" aria-labelledby="titulo-movimientos" className={`${tarjeta} scroll-mt-24 space-y-2 p-5`}>
      <CabeceraSeccion
        id="titulo-movimientos"
        titulo="Últimos movimientos"
        enlace={prestamos.length ? <EnlaceVer to="/solicitudes">Ver todos</EnlaceVer> : null}
      />
      {contenido}
    </section>
  )
}
