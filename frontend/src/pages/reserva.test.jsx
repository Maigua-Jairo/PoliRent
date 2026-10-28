import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import DetalleRecurso from './DetalleRecurso.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as recursoService from '../services/recursoService.js'
import * as prestamoService from '../services/prestamoService.js'
import { aValorInput, sumarDias } from '../utils/prestamos.js'

vi.mock('../services/recursoService.js', () => ({ obtenerRecurso: vi.fn() }))
vi.mock('../services/prestamoService.js', () => ({ solicitarPrestamo: vi.fn() }))

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
})

describe('Reserva desde el detalle del recurso (HU-008)', () => {
  test('un invitado debe iniciar sesión para reservar', async () => {
    renderDetalle()
    expect(await screen.findByText(/inicia sesión con tu cuenta institucional o regístrate/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute('href', '/registro')
    expect(screen.queryByLabelText('Fecha de devolución')).not.toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))

    expect(await screen.findByText('Mis solicitudes: Solicitud de prestamo enviada correctamente')).toBeInTheDocument()
    expect(prestamoService.solicitarPrestamo).toHaveBeenCalledWith({
      recursoId: 'r9',
      fechaDevolucion: expect.any(String),
      motivo: 'Prácticas de biología',
    })
  })

  test('muestra el error del backend', async () => {
    prestamoService.solicitarPrestamo.mockRejectedValue({ response: { data: { msg: 'Ya tienes una solicitud activa para este recurso' } } })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    await screen.findByRole('button', { name: 'Enviar solicitud' })
    elegirFecha(aValorInput(sumarDias(new Date(), 3)))
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByText('Ya tienes una solicitud activa para este recurso')).toBeInTheDocument()
  })

  test('un recurso prestado no se puede reservar', async () => {
    recursoService.obtenerRecurso.mockResolvedValue({ ...microscopio, estado: 'prestado' })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderDetalle()

    expect(await screen.findByText(/no está disponible en este momento porque está prestado/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument()
  })
})
