import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MisSolicitudes from './MisSolicitudes.jsx'
import DetallePrestamo from './DetallePrestamo.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as prestamoService from '../services/prestamoService.js'

vi.mock('../services/prestamoService.js', () => ({
  listarMisPrestamos: vi.fn(),
  cancelarPrestamo: vi.fn(),
}))

const usuario = { id: '1', nombres: 'Jairo', apellidos: 'Maigua', rol: 'estudiante' }
const laptop = { _id: '64b000000000000000000a01', nombre: 'Laptop Dell Inspiron 15', categoria: 'tecnico', imagen: '' }
const kit = { _id: '64b000000000000000000a02', nombre: 'Kit de herramientas básicas', categoria: 'tecnico', imagen: '' }
const tablet = { _id: '64b000000000000000000a03', nombre: 'Tablet gráfica Wacom', categoria: 'tecnico', imagen: '' }

const PRESTAMOS = [
  { _id: 'p1', estado: 'aprobado', recurso: laptop, motivo: 'Proyecto de tesis', fechaDevolucion: '2099-09-22T10:00:00Z', createdAt: '2026-09-15T10:00:00Z' },
  { _id: 'p2', estado: 'pendiente', recurso: kit, fechaDevolucion: '2099-10-01T10:00:00Z', createdAt: '2026-09-12T10:00:00Z' },
  { _id: 'p3', estado: 'rechazado', recurso: tablet, motivoRechazo: 'Sin stock', fechaDevolucion: '2026-09-10T10:00:00Z', createdAt: '2026-09-05T10:00:00Z' },
]

const renderEn = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<RutaProtegida roles={['estudiante']} />}>
          <Route path="/solicitudes" element={<MisSolicitudes />} />
          <Route path="/solicitudes/:id" element={<DetallePrestamo />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
  prestamoService.listarMisPrestamos.mockResolvedValue({ total: PRESTAMOS.length, prestamos: PRESTAMOS })
})

describe('Mis solicitudes (HU-007)', () => {
  test('sin sesión redirige al login', () => {
    useAuthStore.getState().cerrarSesion()
    renderEn('/solicitudes')
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  test('lista las solicitudes y filtra por estado', async () => {
    renderEn('/solicitudes')
    const lista = within(await screen.findByRole('region', { name: 'Solicitudes' }))
    expect(await lista.findByText('Laptop Dell Inspiron 15')).toBeInTheDocument()
    expect(lista.getByText('Tablet gráfica Wacom')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Rechazadas \(1\)/ }))
    expect(lista.queryByText('Laptop Dell Inspiron 15')).not.toBeInTheDocument()
    expect(lista.getByText('Tablet gráfica Wacom')).toBeInTheDocument()
  })

  test('solo permite cancelar solicitudes en revisión o aprobadas', async () => {
    prestamoService.cancelarPrestamo.mockResolvedValue({ msg: 'Solicitud cancelada correctamente' })
    renderEn('/solicitudes')

    expect(await screen.findByRole('button', { name: 'Cancelar solicitud de Kit de herramientas básicas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar solicitud de Tablet gráfica Wacom' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud de Kit de herramientas básicas' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }))

    expect(prestamoService.cancelarPrestamo).toHaveBeenCalledWith('p2')
    expect(await screen.findByText('Solicitud cancelada correctamente')).toBeInTheDocument()
  })
})

describe('Detalle del préstamo (HU-007)', () => {
  test('muestra la información y las instrucciones de retiro', async () => {
    renderEn('/solicitudes/p1')

    expect(await screen.findByRole('heading', { name: 'Laptop Dell Inspiron 15' })).toBeInTheDocument()
    expect(screen.getByText('Proyecto de tesis')).toBeInTheDocument()
    expect(screen.getByText('Días restantes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver instrucciones' }))
    expect(screen.getByRole('heading', { name: 'Instrucciones de retiro' })).toBeInTheDocument()
    expect(screen.queryByText(/QR/)).not.toBeInTheDocument()
  })

  test('una solicitud rechazada muestra el motivo y no tiene acciones', async () => {
    renderEn('/solicitudes/p3')

    expect(await screen.findByText('Sin stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver instrucciones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar préstamo' })).not.toBeInTheDocument()
  })

  test('avisa si la solicitud no existe', async () => {
    renderEn('/solicitudes/zzz')
    expect(await screen.findByText('No encontramos esta solicitud.')).toBeInTheDocument()
  })
})
