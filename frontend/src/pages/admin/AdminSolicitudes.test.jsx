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

    const region = screen.getByRole('region', { name: 'Tabla de solicitudes de préstamo' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('max-h-[70vh]', 'overflow-y-auto', 'overflow-x-hidden', 'scroll-tabla')

    const elementoTabla = screen.getByRole('table')
    expect(elementoTabla).toHaveClass('table-fixed')
    const tabla = within(elementoTabla)
    for (const columna of ['ID', 'Usuario', 'Recurso', 'Tipo', 'Fecha solicitud', 'Estado', 'Acciones']) {
      expect(tabla.getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
    expect(tabla.getByRole('columnheader', { name: 'ID' })).not.toHaveClass('hidden')
    expect(tabla.getByRole('columnheader', { name: 'Estado' })).toHaveClass('text-center')
    expect(tabla.getByRole('columnheader', { name: 'Acciones' })).toHaveClass('text-center')

    const filas = tabla.getAllByRole('row')
    expect(filas[1]).toHaveTextContent('Ana')
    expect(filas[1]).toHaveTextContent('Libro de cálculo')
    expect(filas[1]).toHaveTextContent('1')
    expect(filas[1].querySelector('td:nth-child(6)')).toHaveClass('text-center')
    expect(filas[2]).toHaveTextContent('Carlos')
    expect(filas[2]).toHaveTextContent('Laptop')
    const verRecurso = tabla.getByRole('link', { name: 'Ver Laptop' })
    expect(verRecurso.parentElement).toHaveClass('justify-center')
    expect(verRecurso).toHaveAttribute('href', '/recursos/r1')
    for (const accion of [
      verRecurso,
      tabla.getByRole('button', { name: 'Aprobar solicitud de Ana Pérez para Libro de cálculo' }),
      tabla.getByRole('button', { name: 'Rechazar solicitud de Ana Pérez para Libro de cálculo' }),
    ]) {
      expect(accion).toHaveClass('h-9', 'w-9', 'text-brand-600/70', 'hover:bg-brand-500/10')
      expect(accion.querySelector('svg')).toHaveAttribute('stroke-width', '2')
    }
  })

  test('permite aprobar una solicitud pendiente', async () => {
    const user = userEvent.setup()
    renderAdminSolicitudes()

    await user.click(screen.getByRole('button', { name: 'Aprobar solicitud de Ana Pérez para Libro de cálculo' }))

    expect(aprobarPrestamo).toHaveBeenCalledWith('64b0000000000000000000a1')
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitud aprobada correctamente')
    expect(recargar).toHaveBeenCalledOnce()
  })

  test('busca por estudiante o recurso sin distinguir tildes y filtra por estado', async () => {
    const user = userEvent.setup()
    renderAdminSolicitudes()
    const tabla = within(screen.getByRole('table'))

    await user.type(screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' }), 'calculo')

    expect(tabla.getByText('Libro de cálculo')).toBeInTheDocument()
    expect(tabla.queryByText('Laptop')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'entregado')

    expect(tabla.getByText('Laptop')).toBeInTheDocument()
    expect(tabla.queryByText('Libro de cálculo')).not.toBeInTheDocument()
  })
})
