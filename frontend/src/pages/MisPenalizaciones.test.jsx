import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MisPenalizaciones from './MisPenalizaciones.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as penalizacionService from '../services/penalizacionService.js'

vi.mock('../services/penalizacionService.js', () => ({
  consultarMisPenalizaciones: vi.fn(),
  listarPenalizaciones: vi.fn(),
  pagarPenalizacion: vi.fn(),
  anularPenalizacion: vi.fn(),
}))
vi.mock('../services/notificacionService.js', () => ({
  listarNotificaciones: vi.fn().mockResolvedValue({ notificaciones: [] }),
  marcarNotificacionLeida: vi.fn(),
  marcarTodasNotificacionesLeidas: vi.fn(),
}))
vi.mock('../components/recomendaciones/AsistenteFlotante.jsx', () => ({ default: () => null }))

const usuario = { id: '1', nombres: 'Jairo', apellidos: 'Maigua', rol: 'estudiante' }
const respuesta = {
  total: 1,
  totalAdeudado: 12,
  totalAtrasoEnCurso: 3,
  atrasoEnCurso: [
    {
      prestamo: 'prestamo-1',
      recurso: { _id: 'recurso-1', nombre: 'Laptop de laboratorio' },
      diasAtraso: 2,
      montoAcumulado: 3,
    },
  ],
  penalizaciones: [
    {
      _id: 'penalizacion-1',
      tipo: 'danio',
      monto: 12,
      dias: undefined,
      descripcion: 'Daño en el equipo',
      estado: 'pendiente',
      createdAt: '2026-11-10T10:00:00.000Z',
      recurso: { _id: 'recurso-1', nombre: 'Laptop de laboratorio' },
      prestamo: 'prestamo-1',
    },
  ],
}

const renderEn = (ruta = '/penalizaciones') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Iniciar sesión</p>} />
        <Route element={<AppLayout />}>
          <Route element={<RutaProtegida roles={['estudiante']} />}>
            <Route path="/penalizaciones" element={<MisPenalizaciones />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
  penalizacionService.consultarMisPenalizaciones.mockResolvedValue(respuesta)
})

describe('Mis penalizaciones', () => {
  test('muestra la deuda, el atraso en curso y el historial personal', async () => {
    renderEn()

    expect(screen.getByRole('heading', { level: 1, name: 'Mis penalizaciones' })).toBeInTheDocument()
    const resumen = within(await screen.findByRole('region', { name: 'Resumen de penalizaciones' }))
    expect(resumen.getByText('Total adeudado').closest('article')).toHaveTextContent('$12,00')
    expect(resumen.getByText('Atraso en curso').closest('article')).toHaveTextContent('$3,00')

    const atrasos = within(screen.getByRole('table', { name: 'Préstamos con atraso y monto acumulado' }))
    expect(atrasos.getByText('Laptop de laboratorio')).toBeInTheDocument()
    expect(atrasos.getByText('2')).toBeInTheDocument()

    const historial = within(screen.getByRole('table', { name: 'Historial de penalizaciones del estudiante' }))
    expect(historial.getByText('Daño')).toBeInTheDocument()
    expect(historial.getByText('Daño en el equipo')).toBeInTheDocument()
    expect(historial.getByText('Pendiente')).toBeInTheDocument()
    expect(penalizacionService.consultarMisPenalizaciones).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  test('incluye el acceso en la barra lateral y lo marca como activo', () => {
    renderEn()
    const enlace = within(screen.getByRole('navigation', { name: 'Principal' }))
      .getByRole('link', { name: 'Mis penalizaciones' })
    expect(enlace).toHaveAttribute('href', '/penalizaciones')
    expect(enlace).toHaveAttribute('aria-current', 'page')
  })

  test('requiere sesión de estudiante para entrar', () => {
    useAuthStore.getState().cerrarSesion()
    renderEn()
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument()
    expect(penalizacionService.consultarMisPenalizaciones).not.toHaveBeenCalled()
  })
})
