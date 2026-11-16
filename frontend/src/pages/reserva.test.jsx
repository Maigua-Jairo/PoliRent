import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import DetalleRecurso from './DetalleRecurso.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as recursoService from '../services/recursoService.js'
import * as prestamoService from '../services/prestamoService.js'
import { aValorInput, sumarDias } from '../utils/prestamos.js'

vi.mock('../services/recursoService.js', () => ({ obtenerRecurso: vi.fn() }))
vi.mock('../services/prestamoService.js', () => ({
  listarMisPrestamos: vi.fn(),
  obtenerTerminosPrestamo: vi.fn(),
  solicitarPrestamo: vi.fn(),
}))

const usuario = { id: '1', nombres: 'Jairo', apellidos: 'Maigua', rol: 'estudiante' }
const microscopio = { _id: 'r9', nombre: 'Microscopio óptico', descripcion: 'Para laboratorio', categoria: 'academico', estado: 'disponible', imagen: '' }

function Destino() {
  const { state } = useLocation()
  return <p>Mis solicitudes: {state?.mensaje}</p>
}

const renderDetalle = (ruta = '/recursos/r9#solicitar') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/recursos/:id" element={<DetalleRecurso />} />
        <Route path="/solicitudes" element={<Destino />} />
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  )

const elegirFecha = (valor) => {
  const campo = screen.getByLabelText('Fecha de devolución')
  fireEvent.change(campo, { target: { value: valor } })
  fireEvent.blur(campo)
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  recursoService.obtenerRecurso.mockResolvedValue(microscopio)
  prestamoService.listarMisPrestamos.mockResolvedValue({ prestamos: [] })
  prestamoService.obtenerTerminosPrestamo.mockResolvedValue({
    version: '1.0',
    tarifas: { atrasoPorDia: 5, danio: 20, perdida: 100, tope: 100 },
    horario: { inicio: '07:00', fin: '18:00' },
    condiciones: [
      'Si el recurso se devuelve dañado o incompleto, pagarás el 20 % de su precio.',
      'La entrega y la devolución solo se realizan entre las 07:00 y las 18:00.',
    ],
  })
})

describe('Reserva desde el detalle del recurso (HU-008)', () => {
  test('un invitado debe iniciar sesión para reservar', async () => {
    renderDetalle()
    expect(await screen.findByText(/inicia sesión con tu cuenta institucional o regístrate/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute('href', '/registro')
    expect(screen.queryByLabelText('Fecha de devolución')).not.toBeInTheDocument()
  })

  test('centra la ficha y agrupa la imagen con la información y la reserva', async () => {
    recursoService.obtenerRecurso.mockResolvedValue({
      ...microscopio,
      imagen: 'https://ejemplo.test/microscopio.jpg',
    })
    renderDetalle()

    const ficha = await screen.findByRole('article')
    const informacion = within(ficha).getByRole('region', { name: 'Información del recurso' })
    const imagen = within(informacion).getByRole('img', { name: microscopio.nombre })
    const reserva = within(ficha).getByRole('region', { name: 'Reserva del recurso' })

    expect(ficha).toHaveClass('mx-auto', 'max-w-5xl')
    expect(informacion).toContainElement(imagen)
    expect(ficha).toContainElement(reserva)
    expect(informacion).not.toContainElement(reserva)
  })

  test('permite ampliar y cerrar la imagen del recurso', async () => {
    recursoService.obtenerRecurso.mockResolvedValue({
      ...microscopio,
      imagen: 'https://ejemplo.test/microscopio.jpg',
    })
    renderDetalle()

    await userEvent.click(await screen.findByRole('button', { name: 'Ampliar imagen de Microscopio óptico' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Imagen ampliada de Microscopio óptico' })
    expect(within(dialogo).getByRole('img', { name: 'Imagen ampliada: Microscopio óptico' })).toHaveAttribute(
      'src',
      'https://ejemplo.test/microscopio.jpg',
    )

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar imagen ampliada' }))
    expect(screen.queryByRole('dialog', { name: 'Imagen ampliada de Microscopio óptico' })).not.toBeInTheDocument()
  })

  test('bloquea una nueva solicitud mientras existe un préstamo activo, aunque sea de otro recurso', async () => {
    prestamoService.listarMisPrestamos.mockResolvedValue({
      prestamos: [{
        _id: 'p-activo',
        estado: 'pendiente',
        recurso: { _id: 'otro-recurso', nombre: 'Laptop' },
      }],
    })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText('Ya tienes una solicitud en revisión (Laptop). Cancélala o espera la respuesta antes de solicitar otro recurso.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver mi solicitud activa' })).toHaveAttribute('href', '/solicitudes/p-activo')
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument()
  })

  test('permite volver a solicitar cuando las solicitudes anteriores ya finalizaron', async () => {
    prestamoService.listarMisPrestamos.mockResolvedValue({
      prestamos: [
        { _id: 'p-rechazado', estado: 'rechazado', recurso: { _id: 'r9', nombre: microscopio.nombre } },
        { _id: 'p-cancelado', estado: 'cancelado', recurso: { _id: 'r8', nombre: 'Laptop' } },
        { _id: 'p-devuelto', estado: 'devuelto', recurso: { _id: 'r7', nombre: 'Libro' } },
      ],
    })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByRole('button', { name: 'Enviar solicitud' })).toBeInTheDocument()
  })

  test('no muestra la solicitud si falla la comprobación de préstamos y ofrece reintentar', async () => {
    prestamoService.listarMisPrestamos.mockRejectedValueOnce({
      response: { data: { msg: 'No se pudo consultar la lista' } },
    })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText(/No pudimos verificar si tienes un préstamo activo\. No se pudo consultar la lista/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar verificación' })).toBeInTheDocument()
  })

  test('valida la fecha y envía la solicitud', async () => {
    prestamoService.solicitarPrestamo.mockResolvedValue({ msg: 'Solicitud de prestamo enviada correctamente' })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByText('Elige la fecha de devolución.')).toBeInTheDocument()

    elegirFecha(aValorInput(sumarDias(new Date(), 31)))
    expect(await screen.findByText('El préstamo no puede superar los 30 días.')).toBeInTheDocument()

    elegirFecha(aValorInput(sumarDias(new Date(), 7)))
    await userEvent.type(screen.getByLabelText(/Motivo/), 'Prácticas de biología')
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Carlos Ruiz')
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'carlos.ruiz@epn.edu.ec')
    await userEvent.type(screen.getByLabelText('Teléfono'), '0991234567')
    expect(await screen.findByText(/Si el recurso se devuelve dañado/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Acepto los términos y condiciones del préstamo.' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('Mis solicitudes: Solicitud de prestamo enviada correctamente')).toBeInTheDocument()
    expect(prestamoService.solicitarPrestamo).toHaveBeenCalledWith({
      recursoId: 'r9',
      fechaDevolucion: expect.any(String),
      motivo: 'Prácticas de biología',
      aceptaTerminos: true,
      docenteReferencia: {
        nombre: 'Carlos Ruiz',
        correo: 'carlos.ruiz@epn.edu.ec',
        telefono: '0991234567',
      },
    })
  })

  test('muestra los términos después de la fecha y el motivo', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    await screen.findByText(/Si el recurso se devuelve dañado/)
    const fecha = screen.getByLabelText('Fecha de devolución')
    const motivo = screen.getByLabelText(/Motivo/)
    const terminos = screen.getByRole('region', { name: 'Términos y condiciones' })

    expect(fecha.compareDocumentPosition(motivo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(motivo.compareDocumentPosition(terminos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('requiere datos válidos del docente y aceptar los términos', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    await screen.findByRole('button', { name: 'Enviar solicitud' })
    elegirFecha(aValorInput(sumarDias(new Date(), 3)))
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Jo')
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'correo-invalido')
    await userEvent.type(screen.getByLabelText('Teléfono'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('El nombre debe tener entre 3 y 100 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(screen.getByText('El teléfono del docente no es válido.')).toBeInTheDocument()
    expect(screen.getByText('Debes aceptar los términos y condiciones.')).toBeInTheDocument()
    expect(prestamoService.solicitarPrestamo).not.toHaveBeenCalled()
  })

  test('no permite solicitar si no se pudieron cargar los términos y permite reintentarlo', async () => {
    prestamoService.obtenerTerminosPrestamo
      .mockRejectedValueOnce({ response: { data: { msg: 'No se pudieron cargar los términos' } } })
      .mockResolvedValueOnce({
        version: '1.0',
        horario: { inicio: '07:00', fin: '18:00' },
        condiciones: ['Debes devolver el recurso en buen estado.'],
      })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText('No se pudieron cargar los términos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }))

    expect(await screen.findByText('Debes devolver el recurso en buen estado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled()
  })

  test('muestra el error del backend', async () => {
    prestamoService.solicitarPrestamo.mockRejectedValue({
      response: { data: { msg: 'Ya tienes una solicitud en revision (Laptop). Cancelala o espera la respuesta antes de solicitar otro recurso' } },
    })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    await screen.findByRole('button', { name: 'Enviar solicitud' })
    elegirFecha(aValorInput(sumarDias(new Date(), 3)))
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Carlos Ruiz')
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'carlos@epn.edu.ec')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Acepto los términos y condiciones del préstamo.' }))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByText('Ya tienes una solicitud en revision (Laptop). Cancelala o espera la respuesta antes de solicitar otro recurso')).toBeInTheDocument()
  })

  test('un recurso prestado no se puede reservar', async () => {
    recursoService.obtenerRecurso.mockResolvedValue({ ...microscopio, estado: 'prestado' })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText(/no está disponible en este momento porque está prestado/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument()
  })

  test('un recurso en mantenimiento se identifica y no puede reservarse', async () => {
    recursoService.obtenerRecurso.mockResolvedValue({ ...microscopio, estado: 'mantenimiento' })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText('Mantenimiento')).toBeInTheDocument()
    expect(screen.getByText(/no está disponible en este momento porque está en mantenimiento/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument()
  })
})
