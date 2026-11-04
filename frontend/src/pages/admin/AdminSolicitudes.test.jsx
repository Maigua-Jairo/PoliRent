import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminSolicitudes from './AdminSolicitudes.jsx'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { aprobarPrestamo } from '../../services/prestamoService.js'

vi.mock('../../hooks/useDashboardAdmin.js', () => ({ default: vi.fn() }))
vi.mock('../../services/prestamoService.js', () => ({ aprobarPrestamo: vi.fn() }))

const prestamos = [
  {
    _id: '64b0000000000000000000a2',
    estado: 'entregado',
    usuario: { nombres: 'Carlos', apellidos: 'Méndez' },
    recurso: { _id: 'r1', nombre: 'Laptop', categoria: 'tecnico' },
    createdAt: '2026-09-10T09:00:00Z',
  },
  {
    _id: '64b0000000000000000000a1',
    estado: 'pendiente',
    usuario: { nombres: 'Ana', apellidos: 'Pérez' },
    recurso: { _id: 'r2', nombre: 'Libro de cálculo', categoria: 'academico' },
    createdAt: '2026-09-12T10:24:00Z',
  },
]
const recargar = vi.fn()

const renderAdminSolicitudes = () => render(
  <MemoryRouter>
    <AdminSolicitudes />
  </MemoryRouter>,
)

beforeEach(() => {
  vi.clearAllMocks()
  useDashboardAdmin.mockReturnValue({ cargando: false, error: '', prestamos, recargar })
  aprobarPrestamo.mockResolvedValue({ msg: 'Solicitud aprobada correctamente' })
})

describe('Solicitudes de préstamo del administrador', () => {
  test('usa las columnas de la tabla de Inicio y lista todos los estados', () => {
    renderAdminSolicitudes()

    const tabla = within(screen.getByRole('table'))
    for (const columna of ['ID', 'Usuario', 'Recurso', 'Tipo', 'Fecha solicitud', 'Estado', 'Acciones']) {
      expect(tabla.getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }

    const filas = tabla.getAllByRole('row')
    expect(filas[1]).toHaveTextContent('Ana')
    expect(filas[1]).toHaveTextContent('Libro de cálculo')
    expect(filas[2]).toHaveTextContent('Carlos')
    expect(filas[2]).toHaveTextContent('Laptop')
    expect(tabla.getByRole('link', { name: 'Ver Laptop' })).toHaveAttribute('href', '/recursos/r1')
  })

  test('permite aprobar una solicitud pendiente', async () => {
    const user = userEvent.setup()
    renderAdminSolicitudes()

    await user.click(screen.getByRole('button', { name: 'Aprobar solicitud de Ana Pérez para Libro de cálculo' }))

    expect(aprobarPrestamo).toHaveBeenCalledWith('64b0000000000000000000a1')
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud aprobada correctamente')
    expect(recargar).toHaveBeenCalledOnce()
  })
})
