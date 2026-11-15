import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GestionRecursos from './GestionRecursos.jsx'
import useRecursos from '../../hooks/useRecursos.js'

vi.mock('../../hooks/useRecursos.js', () => ({ default: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  useRecursos.mockReturnValue({ recursos: [], cargando: false, error: '', recargar: vi.fn() })
})

const renderGestionRecursos = (initialEntries = ['/admin/recursos']) => render(
  <MemoryRouter initialEntries={initialEntries}>
    <GestionRecursos />
  </MemoryRouter>,
)

describe('Gestión de herramientas', () => {
  test('muestra la columna ID en la lista de recursos', () => {
    useRecursos.mockReturnValue({
      recursos: [{ _id: 'r1', nombre: 'Multímetro', categoria: 'tecnico', estado: 'disponible' }],
      cargando: false,
      error: '',
      recargar: vi.fn(),
    })
    renderGestionRecursos()

    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Categoría')).toHaveClass('text-center')
    expect(screen.getByText('Estado')).toHaveClass('text-center')
    expect(screen.getByText('Acciones')).toHaveClass('text-center')
    expect(screen.getByText('Técnico')).toHaveClass('text-center')
    const estado = screen.getByText('Disponible', { selector: 'span' })
    expect(estado.parentElement).toHaveClass('flex', 'justify-center')
    const encabezado = screen.getByText('Categoría').parentElement
    const fila = screen.getByRole('link', { name: 'Ver Multímetro' }).closest('li')
    expect(encabezado).toHaveClass('md:grid-cols-[6rem_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]')
    expect(fila).toHaveClass('md:grid-cols-[6rem_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]')
    const acciones = screen.getByRole('link', { name: 'Ver Multímetro' }).parentElement
    expect(acciones).toHaveClass('md:justify-center')
  })

  test('permite recorrer la lista con scroll y muestra el indicador de progreso', () => {
    const { container } = render(
      <MemoryRouter>
        <GestionRecursos />
      </MemoryRouter>,
    )

    const region = screen.getByRole('region', { name: 'Lista de herramientas' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('max-h-[70vh]', 'overflow-y-auto', 'overflow-x-hidden', 'scroll-tabla')
    expect(container.querySelector('.scroll-progreso')).toBeInTheDocument()
  })

  test('elimina el filtro de categoría y lo excluye de la consulta', () => {
    renderGestionRecursos(['/admin/recursos?categoria=tecnico'])

    expect(screen.queryByRole('group', { name: 'Filtrar por categoría' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeInTheDocument()
    expect(useRecursos).toHaveBeenCalledWith({ categoria: '', estado: '', buscar: '' })
  })
})
