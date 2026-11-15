import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminHistorial from './AdminHistorial.jsx'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'

vi.mock('../../hooks/useDashboardAdmin.js', () => ({ default: vi.fn() }))

const prestamos = [
  {
    _id: 'p-devuelto',
    estado: 'devuelto',
    usuario: { nombres: 'María', apellidos: 'Pérez' },
    recurso: { nombre: 'Multímetro' },
    createdAt: '2026-10-12T10:00:00.000Z',
    fechaDevolucion: '2026-10-20T10:00:00.000Z',
  },
  {
    _id: 'p-pendiente',
    estado: 'pendiente',
    usuario: { nombres: 'Luis', apellidos: 'Vega' },
    recurso: { nombre: 'Laptop' },
    createdAt: '2026-10-15T10:00:00.000Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  useDashboardAdmin.mockReturnValue({ cargando: false, error: '', prestamos })
})

const renderAdminHistorial = () => render(
  <MemoryRouter>
    <AdminHistorial />
  </MemoryRouter>,
)

describe('Historial de préstamos del administrador', () => {
  test('muestra la búsqueda y el filtro de todos los estados', () => {
    renderAdminHistorial()

    expect(screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' })).toBeInTheDocument()
    const tabla = within(screen.getByRole('table'))
    expect(tabla.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument()
    expect(tabla.getByRole('columnheader', { name: 'Estado' })).toHaveClass('text-center')
    expect(tabla.getByText('1')).toBeInTheDocument()
    const estados = within(screen.getByRole('combobox', { name: 'Filtrar por estado' }))
    expect(estados.getByRole('option', { name: 'Todos los estados' })).toBeInTheDocument()
    expect(estados.getByRole('option', { name: 'Devuelto' })).toBeInTheDocument()
    expect(estados.getByRole('option', { name: 'En revisión' })).toBeInTheDocument()
  })

  test('filtra por estudiante o recurso sin distinguir tildes y por estado', async () => {
    const user = userEvent.setup()
    renderAdminHistorial()
    const tabla = within(screen.getByRole('table'))
    const buscar = screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' })

    await user.type(buscar, 'maria')
    expect(tabla.getByText('Multímetro')).toBeInTheDocument()
    expect(tabla.queryByText('Laptop')).not.toBeInTheDocument()

    await user.clear(buscar)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'pendiente')
    expect(tabla.getByText('Laptop')).toBeInTheDocument()
    expect(tabla.queryByText('Multímetro')).not.toBeInTheDocument()
  })
})
