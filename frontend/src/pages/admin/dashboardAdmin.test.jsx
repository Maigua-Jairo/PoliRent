import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DashboardAdmin from './DashboardAdmin.jsx'
import AppLayout from '../../components/layout/AppLayout.jsx'
import RutaProtegida from '../../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../../store/authStore.js'
import * as prestamoService from '../../services/prestamoService.js'
import * as recursoService from '../../services/recursoService.js'
import { generarReporteCSV } from '../../utils/reporte.js'

vi.mock('../../services/prestamoService.js', () => ({
  listarPrestamos: vi.fn(),
  aprobarPrestamo: vi.fn(),
  rechazarPrestamo: vi.fn(),
}))
vi.mock('../../services/recursoService.js', () => ({ listarRecursos: vi.fn() }))

const admin = { id: '9', nombres: 'Ana', apellidos: 'Torres', rol: 'administrador' }

const RECURSOS = [
  { _id: 'r1', nombre: 'Laptop Dell Inspiron 15', categoria: 'tecnico', estado: 'prestado', createdAt: '2026-09-01T10:00:00Z' },
  { _id: 'r2', nombre: 'Multímetro digital', categoria: 'tecnico', estado: 'disponible', createdAt: '2026-09-02T10:00:00Z' },
  { _id: 'r3', nombre: 'Libro de cálculo', categoria: 'academico', estado: 'disponible', createdAt: '2026-09-03T10:00:00Z' },
]

const carlos = { nombres: 'Carlos', apellidos: 'Méndez', correo: 'carlos.mendez@epn.edu.ec' }
const PRESTAMOS = [
  { _id: '64b0000000000000000000a1', estado: 'pendiente', usuario: carlos, recurso: RECURSOS[1], createdAt: '2026-09-12T10:24:00Z', updatedAt: '2026-09-12T10:24:00Z' },
  { _id: '64b0000000000000000000a2', estado: 'entregado', usuario: carlos, recurso: RECURSOS[0], createdAt: '2026-09-10T09:00:00Z', updatedAt: '2026-09-11T09:00:00Z' },
]

const renderAdmin = (ruta = '/admin') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<p>Landing</p>} />
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<AppLayout />}>
          <Route element={<RutaProtegida roles={['administrador']} />}>
            <Route path="/admin" element={<DashboardAdmin />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario: admin })
  prestamoService.listarPrestamos.mockResolvedValue({ total: PRESTAMOS.length, prestamos: PRESTAMOS })
  recursoService.listarRecursos.mockResolvedValue({ total: RECURSOS.length, recursos: RECURSOS })
})

describe('Dashboard del administrador (HU-003)', () => {
  test('un estudiante no puede entrar', () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario: { ...admin, rol: 'estudiante' } })
    renderAdmin()
    expect(screen.getByText('Landing')).toBeInTheDocument()
  })

  test('muestra cifras, solicitudes recientes e inventario con datos del backend', async () => {
    renderAdmin()

    expect(screen.getByRole('heading', { level: 1, name: '¡Hola, Ana!' })).toBeInTheDocument()
    const solicitudes = within(screen.getByRole('region', { name: 'Solicitudes recientes' }))
    expect(await solicitudes.findByText('Multímetro digital')).toBeInTheDocument()
    expect(solicitudes.getByText('#SR-00A1')).toBeInTheDocument()

    const resumen = within(screen.getByRole('region', { name: 'Resumen' }))
    expect(resumen.getByText('Total de herramientas').closest('article')).toHaveTextContent('3')
    expect(resumen.getByText('Préstamos activos').closest('article')).toHaveTextContent('1')
    expect(resumen.getByText('Solicitudes pendientes').closest('article')).toHaveTextContent('1')
    expect(screen.queryByText('Usuarios registrados')).not.toBeInTheDocument()

    const tecnicos = within(screen.getByRole('region', { name: 'Resumen de inventario' })).getByText('Técnicos').closest('tr')
    // total 2, disponibles 1, en uso 1
    expect(within(tecnicos).getAllByText(/^\d+$/).map((c) => c.textContent)).toEqual(['2', '1', '1'])
  })

  test('aprueba una solicitud pendiente', async () => {
    prestamoService.aprobarPrestamo.mockResolvedValue({ msg: 'Solicitud aprobada correctamente' })
    renderAdmin()

    await userEvent.click(await screen.findByRole('button', { name: /Aprobar solicitud de Carlos Méndez/ }))
    expect(prestamoService.aprobarPrestamo).toHaveBeenCalledWith('64b0000000000000000000a1')
    expect(await screen.findByText('Solicitud aprobada correctamente')).toBeInTheDocument()
    expect(prestamoService.listarPrestamos).toHaveBeenCalledTimes(2)
  })

  test('rechaza una solicitud con motivo', async () => {
    prestamoService.rechazarPrestamo.mockResolvedValue({ msg: 'Solicitud rechazada correctamente' })
    renderAdmin()

    await userEvent.click(await screen.findByRole('button', { name: /Rechazar solicitud de Carlos Méndez/ }))
    const dialogo = within(screen.getByRole('alertdialog'))
    await userEvent.type(dialogo.getByLabelText(/Motivo/), 'Sin stock')
    await userEvent.click(dialogo.getByRole('button', { name: 'Sí, rechazar' }))

    expect(prestamoService.rechazarPrestamo).toHaveBeenCalledWith('64b0000000000000000000a1', 'Sin stock')
    expect(await screen.findByText('Solicitud rechazada correctamente')).toBeInTheDocument()
  })

  test('la barra lateral marca como próximamente las pantallas que no existen', async () => {
    renderAdmin()
    const navegacion = within(screen.getByRole('navigation', { name: 'Principal' }))

    expect(navegacion.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    expect(navegacion.getByRole('link', { name: 'Herramientas' })).toHaveAttribute('href', '/admin/recursos')
    expect(navegacion.queryByRole('link', { name: /Entrega y devolución/ })).not.toBeInTheDocument()
    expect(navegacion.getByText('Entrega y devolución').closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true')
    expect((await screen.findAllByText('Multímetro digital')).length).toBeGreaterThan(0)
  })
})

describe('Reporte CSV', () => {
  test('incluye solicitudes e inventario con separador ; y BOM', () => {
    const csv = generarReporteCSV(PRESTAMOS, RECURSOS)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('SOLICITUDES DE PRÉSTAMO')
    expect(csv).toContain('#SR-00A1;Carlos Méndez;carlos.mendez@epn.edu.ec;Multímetro digital;Técnico;En revisión')
    expect(csv).toContain('INVENTARIO DE RECURSOS')
    expect(csv).toContain('Libro de cálculo;Académico;Disponible')
  })
})
