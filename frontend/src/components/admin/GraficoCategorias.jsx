import { useState } from 'react'
import { CabeceraSeccion, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'

const RADIO = 46
const CIRCUNFERENCIA = 2 * Math.PI * RADIO
const SEPARACION = 2 // espacio de superficie entre segmentos

const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

/* ---------- Anillo con la cantidad de recursos por categoría ---------- */
export default function GraficoCategorias({ inventario, cargando }) {
  const [activa, setActiva] = useState(null)
  const total = inventario.reduce((suma, fila) => suma + fila.total, 0)
  const conRecursos = inventario.filter((fila) => fila.total > 0)
  const enfocada = inventario.find((fila) => fila.categoria.valor === activa)

  // cada segmento empieza donde terminó el anterior (desde las 12 en punto)
  const largos = conRecursos.map((fila) => (fila.total / total) * CIRCUNFERENCIA)
  const segmentos = conRecursos.map((fila, i) => ({
    fila,
    inicio: largos.slice(0, i).reduce((suma, l) => suma + l, 0),
    largo: conRecursos.length > 1 ? Math.max(largos[i] - SEPARACION, 1) : largos[i],
  }))

  return (
    <section aria-labelledby="titulo-grafico-categorias" className={`${tarjeta} @container p-5`}>
      <CabeceraSeccion id="titulo-grafico-categorias" titulo="Recursos por categoría" />
      {cargando ? (
        <Esqueleto className="mt-5 h-44" />
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 @sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${total} recursos en total`}>
              <circle cx="60" cy="60" r={RADIO} fill="none" strokeWidth="18" className="stroke-slate-100 dark:stroke-slate-800" />
              {segmentos.map(({ fila, inicio, largo }) => (
                <circle
                  key={fila.categoria.valor}
                  cx="60"
                  cy="60"
                  r={RADIO}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={activa === fila.categoria.valor ? 22 : 18}
                  strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                  strokeDashoffset={-inicio}
                  className={`${fila.categoria.grafico} cursor-pointer transition-[stroke-width]`}
                  onMouseEnter={() => setActiva(fila.categoria.valor)}
                  onMouseLeave={() => setActiva(null)}
                >
                  <title>{`${fila.categoria.plural}: ${fila.total} (${porcentaje(fila.total, total)} %)`}</title>
                </circle>
              ))}
            </svg>
            {/* al pasar el cursor el centro muestra la categoría; si no, el total */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden="true">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{enfocada ? enfocada.categoria.plural : 'Total'}</p>
                <p className="text-2xl font-extrabold text-epn-900 dark:text-white">{enfocada ? enfocada.total : total}</p>
              </div>
            </div>
          </div>

          <ul className="w-full space-y-3 text-sm">
            {inventario.map((fila) => (
              <li
                key={fila.categoria.valor}
                className="flex items-center justify-between gap-3"
                onMouseEnter={() => setActiva(fila.categoria.valor)}
                onMouseLeave={() => setActiva(null)}
              >
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <svg className={`h-3 w-3 ${fila.categoria.grafico}`} viewBox="0 0 12 12" aria-hidden="true">
                    <circle cx="6" cy="6" r="6" fill="currentColor" />
                  </svg>
                  {fila.categoria.plural}
                </span>
                <span className="whitespace-nowrap text-slate-700 tabular-nums dark:text-slate-300">
                  <span className="font-semibold">{porcentaje(fila.total, total)} %</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">({fila.total})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
