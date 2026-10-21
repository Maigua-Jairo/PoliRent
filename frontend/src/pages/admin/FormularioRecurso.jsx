import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Alerta from '../../components/Alerta.jsx'
import Icon from '../../components/Icon.jsx'
import ImagenRecurso from '../../components/recursos/ImagenRecurso.jsx'
import { btnPrimary, btnSecondary, icons, inputClass, selectClass } from '../../components/auth/authStyles.jsx'
import { actualizarRecurso, crearRecurso, obtenerRecurso } from '../../services/recursoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { CATEGORIAS, ESTADOS, TIPOS_IMAGEN, validarImagen, validarNombreRecurso } from '../../utils/recursos.jsx'
import { regla } from '../../utils/validaciones.js'

const VACIO = { nombre: '', categoria: '', estado: 'disponible', descripcion: '', imagen: null }
const MAX_DESCRIPCION = 500
const btnGuardar = btnPrimary.replace('w-full', 'w-full sm:w-auto')
const etiqueta = 'mb-1.5 block text-sm font-semibold text-epn-900 dark:text-slate-200'
const errorTexto = 'mt-1.5 text-xs font-medium text-red-600 dark:text-red-400'

/* ---------- Registrar o actualizar un recurso (HU-003) ---------- */
export default function FormularioRecurso() {
  const { id } = useParams()
  const edicion = Boolean(id)
  const navigate = useNavigate()
  const [errorServidor, setErrorServidor] = useState('')
  const [original, setOriginal] = useState(null)
  const [quitarImagen, setQuitarImagen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched', defaultValues: VACIO })

  // En edición carga el recurso y llena el formulario
  useEffect(() => {
    if (!edicion) return
    obtenerRecurso(id)
      .then((r) => {
        setOriginal(r)
        reset({ nombre: r.nombre, categoria: r.categoria, estado: r.estado, descripcion: r.descripcion ?? '', imagen: null })
      })
      .catch((e) => setErrorServidor(obtenerMensajeError(e)))
  }, [edicion, id, reset])

  const [imagenes, descripcion = '', categoriaElegida] = useWatch({ control, name: ['imagen', 'descripcion', 'categoria'] })
  const archivo = imagenes?.[0]
  // URL temporal para previsualizar el archivo elegido; se libera al cambiarlo o salir
  const vistaPrevia = useMemo(
    () => (archivo && !validarImagen(archivo) ? URL.createObjectURL(archivo) : ''),
    [archivo],
  )
  useEffect(() => () => vistaPrevia && URL.revokeObjectURL(vistaPrevia), [vistaPrevia])

  const onSubmit = async (form) => {
    setErrorServidor('')
    const datos = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      estado: form.estado,
      descripcion: form.descripcion.trim(),
      imagen: form.imagen?.[0],
      // una cadena vacía le indica al backend que quite la imagen actual
      ...(quitarImagen && !form.imagen?.[0] && { imagen: '' }),
    }
    try {
      const respuesta = edicion ? await actualizarRecurso(id, datos) : await crearRecurso(datos)
      navigate('/admin/recursos', { state: { mensaje: respuesta.msg } })
    } catch (e) {
      setErrorServidor(obtenerMensajeError(e))
    }
  }

  const cargandoEdicion = edicion && !original && !errorServidor
  const imagenActual = !quitarImagen && original?.imagen

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/recursos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
        <Icon size={18}>{icons.back}</Icon> Volver a la gestión de recursos
      </Link>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-epn-900 dark:text-white">{edicion ? 'Editar recurso' : 'Nuevo recurso'}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {edicion ? 'Actualiza la información del recurso en el catálogo.' : 'Registra un recurso técnico, académico o recreativo.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={cargandoEdicion}
        className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        <Alerta className="sm:col-span-2">{errorServidor}</Alerta>

        <div className="sm:col-span-2">
          <label htmlFor="nombre" className={etiqueta}>Nombre</label>
          <input
            id="nombre"
            type="text"
            maxLength={100}
            placeholder="Kit Arduino Uno"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
            className={inputClass(errors.nombre, false)}
            {...register('nombre', { validate: regla(validarNombreRecurso) })}
          />
          {errors.nombre && <p id="nombre-error" className={errorTexto}>{errors.nombre.message}</p>}
        </div>

        <div>
          <label htmlFor="categoria" className={etiqueta}>Categoría</label>
          <div className="relative">
            <select
              id="categoria"
              aria-invalid={!!errors.categoria}
              aria-describedby={errors.categoria ? 'categoria-error' : undefined}
              className={`${selectClass} ${errors.categoria ? 'border-red-400' : ''}`}
              {...register('categoria', { required: 'Selecciona una categoría.' })}
            >
              <option value="" disabled>Selecciona una categoría</option>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
              ))}
            </select>
            <Icon size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400">{icons.chevron}</Icon>
          </div>
          {errors.categoria && <p id="categoria-error" className={errorTexto}>{errors.categoria.message}</p>}
        </div>

        <div>
          <label htmlFor="estado-recurso" className={etiqueta}>Estado</label>
          <div className="relative">
            <select id="estado-recurso" className={selectClass} {...register('estado')}>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
              ))}
            </select>
            <Icon size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400">{icons.chevron}</Icon>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="descripcion" className={etiqueta}>Descripción <span className="font-normal text-slate-400">(opcional)</span></label>
          <textarea
            id="descripcion"
            rows={4}
            maxLength={MAX_DESCRIPCION}
            placeholder="Características, accesorios incluidos, cuidados…"
            className={`${selectClass} resize-y pr-3`}
            {...register('descripcion')}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{descripcion.length}/{MAX_DESCRIPCION}</p>
        </div>

        <div className="sm:col-span-2">
          <span className={etiqueta}>Imagen <span className="font-normal text-slate-400">(opcional, JPG/PNG/WEBP, máx. 2 MB)</span></span>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {vistaPrevia ? (
              <img src={vistaPrevia} alt="Vista previa de la nueva imagen" className="h-28 w-36 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
            ) : (
              <ImagenRecurso
                recurso={{ nombre: original?.nombre ?? 'Recurso', categoria: categoriaElegida || 'tecnico', imagen: imagenActual }}
                tamanoIcono={30}
                className="h-28 w-36 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700"
              />
            )}
            <div className="space-y-2">
              <label htmlFor="imagen" className={`${btnSecondary} cursor-pointer`}>
                {archivo || imagenActual ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </label>
              <input
                id="imagen"
                type="file"
                accept={TIPOS_IMAGEN.join(',')}
                className="sr-only"
                aria-invalid={!!errors.imagen}
                aria-describedby={errors.imagen ? 'imagen-error' : undefined}
                {...register('imagen', { validate: (lista) => validarImagen(lista?.[0]) || true })}
              />
              {archivo && <p className="max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">{archivo.name}</p>}
              {imagenActual && !archivo && (
                <button type="button" onClick={() => setQuitarImagen(true)} className="block text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
                  Quitar imagen actual
                </button>
              )}
              {errors.imagen && <p id="imagen-error" className={errorTexto}>{errors.imagen.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <Link to="/admin/recursos" className={btnSecondary}>Cancelar</Link>
          <button type="submit" className={btnGuardar} disabled={isSubmitting || cargandoEdicion}>
            {isSubmitting ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Registrar recurso'}
          </button>
        </div>
      </form>
    </div>
  )
}
