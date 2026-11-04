import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminEntrega from './AdminEntrega.jsx'
import * as prestamoService from '../../services/prestamoService.js'
import * as recursoService from '../../services/recursoService.js'

vi.mock('../../services/prestamoService.js', () => ({ listarPrestamos: vi.fn() }))
vi.mock('../../services/recursoService.js', () => ({ listarRecursos: vi.fn() }))

const prestamos = [
  {
    _id: 'p-tecnico',
    estado: 'entregado',
    usuario: { nombres: 'Ana', apellidos: 'Pérez' },
    recurso: { nombre: 'Multímetro', categoria: 'tecnico' },
    fechaEntrega: '2026-10-12T10:00:00.000Z',
    fechaDevolucion: '2026-10-20T10:00:00.000Z',
  },
  {
    _id: 'p-academico',
    estado: 'aprobado',
    usuario: { nombres: 'Luis', apellidos: 'Vega' },
    recurso: { nombre: 'Libro de cálculo', categoria: 'academico' },
    fechaDevolucion: '2026-10-25T10:00:00.000Z',
  },
  {
    _id: 'p-pendiente',
    estado: 'pendiente',
    recurso: { nombre: 'Laptop', categoria: 'tecnico' },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  prestamoService.listarPrestamos.mockResolvedValue({ prestamos })
  recursoService.listarRecursos.mockResolvedValue({ recursos: [] })
})

const renderAdminEntrega = () => render(
  <MemoryRouter>
    <AdminEntrega />
  </MemoryRouter>,
)

describe('Entrega y devolución', () => {
  test('muestra la fecha de entrega en lugar del estado', async () => {
    renderAdminEntrega()

    const tabla = within(await screen.findByRole('table'))
    expect(tabla.getByRole('columnheader', { name: 'Fecha de entrega' })).toBeInTheDocument()
    expect(tabla.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument()
    expect(await tabla.findByText(new Date(prestamos[0].fechaEntrega).toLocaleDateString('es-EC'))).toBeInTheDocument()
    expect(tabla.getByText('Pendiente')).toBeInTheDocument()
    expect(tabla.queryByText('Laptop')).not.toBeInTheDocument()
  })

  test('filtra las filas por categoría', async () => {
    const user = userEvent.setup()
    renderAdminEntrega()

    const tabla = within(await screen.findByRole('table'))
    expect(await tabla.findByText('Multímetro')).toBeInTheDocument()
    expect(tabla.getByText('Libro de cálculo')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por categoría' }), 'academico')

    expect(tabla.getByText('Libro de cálculo')).toBeInTheDocument()
    expect(tabla.queryByText('Multímetro')).not.toBeInTheDocument()
  })
})
