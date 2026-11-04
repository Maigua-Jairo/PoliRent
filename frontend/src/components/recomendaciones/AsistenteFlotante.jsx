import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../Icon.jsx'
import { iconos } from '../layout/iconos.jsx'
import { obtenerMensajeError } from '../../services/authService.js'
import { obtenerRecomendaciones } from '../../services/recomendacionService.js'
import { useAuthStore } from '../../store/authStore.js'
import { useConsultasStore } from '../../store/consultasStore.js'
import { CONTEXTO_MAX, validarContexto } from '../../utils/recomendaciones.js'

const PREGUNTAS_FRECUENTES = [
  {
    pregunta: '¿Cómo solicito un recurso?',
    palabras: ['solicit', 'reserva', 'reservar', 'prestar'],
    respuesta: 'Explora el catálogo, abre la ficha del recurso e inicia sesión como estudiante. En la sección de solicitud elige la fecha de devolución y envía el formulario. La asociación revisará tu solicitud.',
  },
  {
    pregunta: '¿Cómo funcionan las recomendaciones?',
    palabras: ['recomendacion', 'recomendar', 'proyecto'],
    respuesta: 'Describe tu proyecto y las herramientas que necesitas. Con ese contexto, PoliRent busca recursos disponibles relacionados. También puedes usar la pantalla completa de Recomendaciones inteligentes.',
  },
  {
    pregunta: '¿Dónde reviso mis solicitudes?',
    palabras: ['solicitudes', 'estado', 'cancelar'],
    respuesta: 'En “Mis Solicitudes” puedes revisar el estado y los detalles. Las solicitudes pendientes o aprobadas se pueden cancelar desde su detalle.',
  },
  {
    pregunta: '¿Cómo devuelvo un recurso?',
    palabras: ['devolver', 'devolucion', 'entrega'],
    respuesta: 'Revisa la fecha de devolución en el detalle de tu préstamo y coordina la entrega con la asociación estudiantil responsable.',
  },
  {
    pregunta: '¿Cómo actualizo mis datos?',
    palabras: ['perfil', 'cuenta', 'datos', 'contrasena'],
    respuesta: 'Abre “Mi Cuenta” o “Mi perfil” desde el panel para revisar la configuración de tu cuenta y las opciones de seguridad.',
  },
]

const normalizar = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const responderPregunta = (texto) => {
  const consulta = normalizar(texto)
  const parecePregunta = /[?¿]/.test(texto) || /^(como|donde|cuando|que|por que|puedo|necesito saber)\b/.test(consulta)
  if (!parecePregunta) return ''
  return PREGUNTAS_FRECUENTES.find((item) => item.palabras.some((palabra) => consulta.includes(palabra)))?.respuesta
}

export default function AsistenteFlotante() {
  const usuario = useAuthStore((state) => state.usuario)
  const agregarConsulta = useConsultasStore((state) => state.agregarConsulta)
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const entrada = useRef(null)
  const claveUsuario = usuario?.correo ?? usuario?.id ?? 'anonimo'

  const enviar = async (valor = texto) => {
    const pregunta = valor.trim()
    if (!pregunta || enviando) return

    setMensajes((actuales) => [...actuales, { autor: 'usuario', texto: pregunta }])
    setTexto('')
    setError('')

    const respuestaFAQ = responderPregunta(pregunta)
    if (respuestaFAQ) {
      setMensajes((actuales) => [...actuales, { autor: 'asistente', texto: respuestaFAQ }])
      return
    }

    const errorValidacion = validarContexto(pregunta)
    if (errorValidacion) {
      setMensajes((actuales) => [
        ...actuales,
        { autor: 'asistente', texto: `${errorValidacion} Para preguntas del sistema, puedes elegir una de las consultas frecuentes.` },
      ])
      return
    }

    setEnviando(true)
    try {
      const { recomendaciones = [] } = await obtenerRecomendaciones({ contexto: pregunta, limite: 3 })
      setMensajes((actuales) => [
        ...actuales,
        {
          autor: 'asistente',
          texto: recomendaciones.length
            ? 'Encontré estos recursos que podrían servirte:'
            : 'No encontré recursos disponibles relacionados. Prueba describiendo tu proyecto con otros términos.',
          recomendaciones,
        },
      ])
      agregarConsulta(claveUsuario, pregunta)
    } catch (e) {
      setMensajes((actuales) => [...actuales, { autor: 'asistente', texto: obtenerMensajeError(e) }])
    } finally {
      setEnviando(false)
      entrada.current?.focus()
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {abierto && (
        <section
          id="chat-ayuda-polirent"
          aria-label="Chat de ayuda PoliRent"
          className="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900"
        >
          <header className="flex items-center justify-between bg-epn-950 px-4 py-3 text-white dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-brand-300">
                <Icon size={20}>{iconos.bot}</Icon>
              </span>
              <div>
                <h2 className="text-sm font-bold">Asistente PoliRent</h2>
                <p className="text-xs text-slate-300">Ayuda y recomendaciones</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <Icon size={18}>{iconos.cerrar}</Icon>
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-950/60" aria-live="polite">
            {!mensajes.length && (
              <div className="rounded-xl border border-brand-100 bg-white p-3 text-sm text-slate-700 dark:border-brand-500/20 dark:bg-slate-900 dark:text-slate-200">
                <p className="font-semibold text-epn-900 dark:text-white">¡Hola! ¿En qué te ayudo?</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pregunta sobre PoliRent o cuéntame qué proyecto tienes para buscar recursos.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PREGUNTAS_FRECUENTES.slice(0, 3).map((item) => (
                    <button
                      key={item.pregunta}
                      type="button"
                      onClick={() => enviar(item.pregunta)}
                      className="rounded-full border border-slate-200 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:bg-brand-500/10"
                    >
                      {item.pregunta}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((mensaje, indice) => (
              <div
                key={`${indice}-${mensaje.autor}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  mensaje.autor === 'usuario'
                    ? 'ml-auto rounded-br-sm bg-brand-600 text-white'
                    : 'mr-auto rounded-bl-sm bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
                }`}
              >
                <p className="whitespace-pre-line">{mensaje.texto}</p>
                {mensaje.recomendaciones?.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {mensaje.recomendaciones.map(({ recurso }) => (
                      <li key={recurso._id}>
                        <Link
                          to={`/recursos/${recurso._id}`}
                          onClick={() => setAbierto(false)}
                          className="block rounded-lg bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:bg-brand-500/10 dark:text-brand-300"
                        >
                          {recurso.nombre} · Ver recurso
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        to="/recomendaciones"
                        onClick={() => setAbierto(false)}
                        className="mt-1 inline-block text-xs font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
                      >
                        Ver más recomendaciones
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            ))}
            {enviando && <p role="status" className="text-xs text-slate-500 dark:text-slate-400">Buscando recursos…</p>}
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <form
            onSubmit={(evento) => {
              evento.preventDefault()
              enviar()
            }}
            className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <label htmlFor="consulta-asistente-flotante" className="sr-only">Escribe una pregunta o describe tu proyecto</label>
            <div className="flex items-end gap-2">
              <textarea
                id="consulta-asistente-flotante"
                ref={entrada}
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                maxLength={CONTEXTO_MAX}
                rows={1}
                placeholder="Escribe tu pregunta o contexto…"
                className="max-h-24 min-h-10 flex-1 resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviando}
                aria-label="Enviar mensaje"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon size={18}>{iconos.enviar}</Icon>
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setAbierto((actual) => !actual)
          setError('')
        }}
        aria-label={abierto ? 'Cerrar asistente PoliRent' : 'Abrir asistente PoliRent'}
        aria-expanded={abierto}
        aria-controls="chat-ayuda-polirent"
        className="group grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-900/25 ring-4 ring-white/80 transition hover:-translate-y-1 hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 dark:ring-slate-950"
      >
        <Icon size={24}>{abierto ? iconos.cerrar : iconos.bot}</Icon>
        {!abierto && (
          <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Ayuda y recomendaciones
          </span>
        )}
      </button>
    </div>
  )
}
