import TarjetaRecomendada from '../recomendaciones/TarjetaRecomendada.jsx'
import { iconos } from '../layout/iconos.jsx'
import { CabeceraSeccion, EnlaceVer, Esqueleto, tarjeta } from './comunes.jsx'

/* ---------- Recomendaciones según la facultad y el historial (HU-009) ---------- */
export default function RecomendacionesParaTi({ cargando, error, lista }) {
  let contenido
  if (cargando) {
    contenido = (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-56" />
        ))}
      </div>
    )
  } else if (error) {
    contenido = <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
  } else if (!lista.length) {
    contenido = (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Aún no tenemos sugerencias para ti. Cuéntale tu proyecto al asistente para recibir recomendaciones.
      </p>
    )
  } else {
    contenido = (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {lista.map(({ recurso, razon }) => (
          <TarjetaRecomendada key={recurso._id} recurso={recurso} razon={razon} />
        ))}
      </div>
    )
  }

  return (
    <section
      id="recomendaciones"
      aria-labelledby="titulo-recomendaciones"
      className={`${tarjeta} scroll-mt-24 space-y-5 bg-linear-to-b from-brand-500/5 to-transparent p-5`}
    >
      <CabeceraSeccion
        id="titulo-recomendaciones"
        titulo="Recomendaciones para ti"
        subtitulo="Basadas en tu facultad y tu historial de préstamos."
        icono={iconos.check}
        enlace={<EnlaceVer to="/recomendaciones">Ver todas</EnlaceVer>}
      />
      {contenido}
    </section>
  )
}
