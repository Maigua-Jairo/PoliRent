import { useCallback, useState } from 'react'
import Icon from '../Icon.jsx'
import { icons } from '../auth/authStyles.jsx'
import { CabeceraSeccion, Esqueleto, tarjeta } from '../dashboard/comunes.jsx'
import { solicitudesPorDia } from '../../utils/estadisticas.js'

const RANGOS = [7, 14, 30]
const ALTO = 220
const MARGEN = { arriba: 12, derecha: 12, abajo: 28, izquierda: 32 }

const etiquetaDia = (fecha) => fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })

// Máximo "redondo" del eje Y (al menos 4 para que la escala tenga 4 divisiones)
const maximoEje = (valor) => {
  if (valor <= 4) return 4
  const paso = 10 ** Math.floor(Math.log10(valor))
  return Math.ceil(valor / paso) * paso
}

/* ---------- Solicitudes de préstamo creadas por día ---------- */
export default function GraficoSolicitudes({ prestamos, ahora, cargando }) {
  const [dias, setDias] = useState(7)
  const [activo, setActivo] = useState(null)
  // se dibuja al ancho real del contenedor para que los textos mantengan su tamaño en cualquier pantalla
  const [ancho, setAncho] = useState(360)
  const medir = useCallback((nodo) => {
    if (!nodo || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(240, Math.round(entrada.contentRect.width))))
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  const serie = cargando ? [] : solicitudesPorDia(prestamos, dias, ahora)
  const maximo = maximoEje(Math.max(0, ...serie.map((p) => p.total)))
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (i) => MARGEN.izquierda + (serie.length > 1 ? (i / (serie.length - 1)) * anchoUtil : anchoUtil / 2)
  const y = (valor) => MARGEN.arriba + altoUtil - (valor / maximo) * altoUtil
  // una etiqueta del eje X cada ~48 px como mínimo para que no se encimen
  const cadaCuanto = Math.max(1, Math.ceil(dias / Math.max(2, Math.floor(anchoUtil / 48))))
  const puntoActivo = activo !== null ? serie[activo] : null
  const totalPeriodo = serie.reduce((suma, p) => suma + p.total, 0)

  return (
    <section aria-labelledby="titulo-grafico-solicitudes" className={`${tarjeta} p-5`}>
      <CabeceraSeccion
        id="titulo-grafico-solicitudes"
        titulo="Solicitudes por día"
        subtitulo={cargando ? undefined : `${totalPeriodo} en los últimos ${dias} días`}
        enlace={
          <div className="relative">
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              aria-label="Rango de días"
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {RANGOS.map((r) => (
                <option key={r} value={r}>
                  Últimos {r} días
                </option>
              ))}
            </select>
            <Icon size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400">
              {icons.chevron}
            </Icon>
          </div>
        }
      />

      {cargando ? (
        <Esqueleto className="mt-5 h-52" />
      ) : (
        <div ref={medir} className="relative mt-4">
          <svg viewBox={`0 0 ${ancho} ${ALTO}`} className="h-auto w-full" role="img" aria-label={`Solicitudes por día en los últimos ${dias} días`}>
            {/* cuadrícula y eje Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(maximo * f)} y2={y(maximo * f)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
                <text x={MARGEN.izquierda - 8} y={y(maximo * f)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px] dark:fill-slate-400">
                  {Math.round(maximo * f)}
                </text>
              </g>
            ))}
            {/* eje X */}
            {serie.map((p, i) =>
              i % cadaCuanto === 0 || i === serie.length - 1 ? (
                <text key={p.dia.toISOString()} x={x(i)} y={ALTO - 8} textAnchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'} className="fill-slate-500 text-[11px] dark:fill-slate-400">
                  {etiquetaDia(p.dia)}
                </text>
              ) : null,
            )}
            {/* área suave y línea */}
            <path
              d={`M${x(0)},${y(0)} ${serie.map((p, i) => `L${x(i)},${y(p.total)}`).join(' ')} L${x(serie.length - 1)},${y(0)} Z`}
              className="fill-brand-500/10"
            />
            <polyline
              points={serie.map((p, i) => `${x(i)},${y(p.total)}`).join(' ')}
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-brand-500"
            />
            {puntoActivo && (
              <line x1={x(activo)} x2={x(activo)} y1={MARGEN.arriba} y2={y(0)} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" strokeDasharray="4 4" />
            )}
            {serie.map((p, i) => (
              <circle
                key={p.dia.toISOString()}
                cx={x(i)}
                cy={y(p.total)}
                r={activo === i ? 6 : 4}
                strokeWidth="2"
                className="fill-brand-500 stroke-white dark:stroke-slate-900"
              />
            ))}
            {/* zonas de contacto más grandes que los puntos */}
            {serie.map((p, i) => (
              <rect
                key={p.dia.toISOString()}
                x={x(i) - anchoUtil / serie.length / 2}
                y={MARGEN.arriba}
                width={anchoUtil / serie.length}
                height={altoUtil}
                fill="transparent"
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo(null)}
              />
            ))}
          </svg>
          {puntoActivo && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-epn-950 px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-lg dark:bg-slate-700"
              style={{ left: `${(x(activo) / ancho) * 100}%` }}
              role="status"
            >
              <span className="font-semibold">{etiquetaDia(puntoActivo.dia)}</span> · {puntoActivo.total}{' '}
              {puntoActivo.total === 1 ? 'solicitud' : 'solicitudes'}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
