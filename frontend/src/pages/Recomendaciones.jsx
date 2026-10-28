import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { iconos } from '../components/layout/iconos.jsx'
import { tarjeta } from '../components/dashboard/comunes.jsx'
import PanelFiltros from '../components/recomendaciones/PanelFiltros.jsx'
import { ConsejosRapidos, ConsultasRecientes } from '../components/recomendaciones/PanelLateral.jsx'
import { Escribiendo, MensajeAsistente, MensajeUsuario } from '../components/recomendaciones/Mensajes.jsx'
import { obtenerRecomendaciones } from '../services/recomendacionService.js'
import { obtenerMensajeError } from '../services/authService.js'
import { useAuthStore } from '../store/authStore.js'
import { useConsultasStore } from '../store/consultasStore.js'
import { buscarCategoria } from '../utils/recursos.jsx'
import { CONTEXTO_MAX, horaActual, LIMITE_RECOMENDACIONES, validarContexto } from '../utils/recomendaciones.js'

const SIN_CONSULTAS = []

// Términos que el backend encontró en la consulta (sin repetir, máximo 6)
const terminosDetectados = (recomendaciones) =>
  [...new Set(recomendaciones.flatMap((r) => r.terminosCoincidentes ?? []))].slice(0, 6)

const respuestaAsistente = (recomendaciones, categoria) => {
  const filtro = categoria ? ` de tipo ${buscarCategoria(categoria).etiqueta.toLowerCase()}` : ''
  if (!recomendaciones.length) {
    return `No encontré recursos disponibles${filtro} relacionados con tu proyecto. Prueba a describirlo con otras palabras o menciona las herramientas que necesitas.`
  }
  const cuantos = recomendaciones.length === 1 ? 'el siguiente recurso' : `los siguientes ${recomendaciones.length} recursos`
  return `¡Perfecto! Para tu proyecto te recomiendo ${cuantos}${filtro}. Están ordenados del más al menos relevante:`
}

/* ---------- Asistente de recomendaciones (HU-009) ---------- */
export default function Recomendaciones() {
  const usuario = useAuthStore((state) => state.usuario)
  const claveUsuario = usuario?.correo ?? usuario?.id ?? 'anonimo'
  const consultas = useConsultasStore((state) => state.porUsuario[claveUsuario] ?? SIN_CONSULTAS)
  const agregarConsulta = useConsultasStore((state) => state.agregarConsulta)

  const [mensajes, setMensajes] = useState(() => [{ id: 0, autor: 'asistente', tipo: 'bienvenida', hora: horaActual() }])
  const [texto, setTexto] = useState('')
  const [errorTexto, setErrorTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const siguienteId = useRef(1)
  const conversacion = useRef(null)
  const entrada = useRef(null)

  // Mantiene visible el último mensaje
  useEffect(() => {
    const el = conversacion.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes.length, enviando])

  const agregar = (mensaje) => setMensajes((prev) => [...prev, { id: siguienteId.current++, hora: horaActual(), ...mensaje }])

  const consultar = async (consulta) => {
    const error = validarContexto(consulta)
    setErrorTexto(error)
    if (error || enviando) return

    const contexto = consulta.trim()
    agregar({ autor: 'usuario', texto: contexto, categoria })
    setTexto('')
    setEnviando(true)
    try {
      const { recomendaciones = [] } = await obtenerRecomendaciones({ contexto, limite: LIMITE_RECOMENDACIONES })
      const filtradas = categoria ? recomendaciones.filter((r) => r.recurso.categoria === categoria) : recomendaciones
      agregar({
        autor: 'asistente',
        tipo: 'resultados',
        texto: respuestaAsistente(filtradas, categoria),
        recomendaciones: filtradas,
        terminos: terminosDetectados(filtradas),
      })
      agregarConsulta(claveUsuario, contexto)
      setAhora(Date.now())
    } catch (e) {
      agregar({ autor: 'asistente', tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setEnviando(false)
      entrada.current?.focus()
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    consultar(texto)
  }

  // Enter envía; Shift+Enter agrega un salto de línea
  const onTecla = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      consultar(texto)
    }
  }

  const usarEjemplo = (ejemplo) => {
    setTexto(ejemplo)
    setErrorTexto('')
    entrada.current?.focus()
  }

  const nombre = usuario?.nombres?.split(' ')[0] ?? 'estudiante'
  const categoriaActiva = categoria ? buscarCategoria(categoria) : null

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <h1 className="sr-only">Recomendaciones inteligentes</h1>

      <div className="grid gap-6 xl:grid-cols-12">
        <section aria-label="Conversación con el asistente" className={`${tarjeta} flex min-w-0 flex-col xl:col-span-9`}>
          <ol ref={conversacion} className="max-h-[65vh] min-h-80 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {mensajes.map((m) =>
              m.autor === 'usuario' ? (
                <MensajeUsuario key={m.id} mensaje={m} usuario={usuario} />
              ) : (
                <MensajeAsistente key={m.id} mensaje={m} nombre={nombre} onEjemplo={usarEjemplo} />
              ),
            )}
            {enviando && <Escribiendo />}
          </ol>

          <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
            {filtrosAbiertos && <PanelFiltros id="filtros-recomendaciones" categoria={categoria} onCategoria={setCategoria} />}
            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => setFiltrosAbiertos((v) => !v)}
                aria-expanded={filtrosAbiertos}
                aria-controls="filtros-recomendaciones"
                aria-label={categoriaActiva ? `Filtros (${categoriaActiva.plural})` : 'Filtros'}
                title="Filtros de búsqueda"
                className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 transition-colors ${
                  filtrosAbiertos || categoriaActiva
                    ? 'bg-brand-500/10 text-brand-600 ring-brand-500/40 dark:text-brand-400'
                    : 'text-slate-500 ring-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={20}>{iconos.filtros}</Icon>
                {categoriaActiva && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />}
              </button>
              <div className="relative min-w-0 flex-1">
                <label htmlFor="consulta" className="sr-only">
                  Describe tu proyecto
                </label>
                <textarea
                  id="consulta"
                  ref={entrada}
                  rows={1}
                  value={texto}
                  maxLength={CONTEXTO_MAX}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={onTecla}
                  aria-invalid={Boolean(errorTexto)}
                  aria-describedby={errorTexto ? 'error-consulta' : undefined}
                  placeholder="Escribe tu consulta o describe tu proyecto..."
                  className="block max-h-40 min-h-12 w-full resize-y rounded-xl border border-slate-300 bg-white py-3 pr-14 pl-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={enviando}
                  aria-label="Enviar consulta"
                  className="absolute right-2 bottom-1.5 grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/30 transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon size={16}>{iconos.enviar}</Icon>
                </button>
              </div>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <p id="error-consulta" className="text-red-600 dark:text-red-400">
                {errorTexto}
              </p>
              {texto.length > CONTEXTO_MAX - 100 && (
                <p className="shrink-0 text-slate-400">
                  {texto.length}/{CONTEXTO_MAX}
                </p>
              )}
            </div>
          </form>
        </section>

        <aside className="min-w-0 space-y-6 xl:col-span-3">
          <ConsejosRapidos />
          <ConsultasRecientes consultas={consultas} ahora={ahora} onRepetir={consultar} deshabilitado={enviando} />
        </aside>
      </div>

      {/* Acceso rápido al cuadro de consulta */}
      <button
        type="button"
        onClick={() => entrada.current?.focus()}
        aria-label="Escribir una consulta al asistente"
        className="fixed right-6 bottom-6 z-20 hidden h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/40 transition-transform hover:scale-105 lg:grid"
      >
        <Icon size={26}>{iconos.bot}</Icon>
      </button>
    </div>
  )
}
