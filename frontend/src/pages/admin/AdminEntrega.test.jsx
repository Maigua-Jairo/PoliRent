import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminEntrega from './AdminEntrega.jsx'
import * as prestamoService from '../../services/prestamoService.js'
import * as recursoService from '../../services/recursoService.js'

vi.mock('../../services/prestamoService.js', () => ({
  listarPrestamos: vi.fn(),
  registrarEntrega: vi.fn(),
  registrarDevolucion: vi.fn(),
}))
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
    createdAt: '2026-10-11T09:00:00.000Z',
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
  prestamoService.registrarEntrega.mockResolvedValue({ msg: 'Entrega registrada correctamente' })
  prestamoService.registrarDevolucion.mockResolvedValue({ msg: 'Devolución registrada correctamente', totalPenalizado: 0, advertencias: [] })
  recursoService.listarRecursos.mockResolvedValue({ recursos: [] })
})

const renderAdminEntrega = () => render(
  <MemoryRouter>
    <AdminEntrega />
  </MemoryRouter>,
)

describe('Entrega y devolución', () => {
  test('separa en pestañas las entregas pendientes y las devoluciones pendientes', async () => {
    renderAdminEntrega()

    const region = await screen.findByRole('region', { name: 'Tabla de entregas por registrar' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('max-h-[70vh]', 'overflow-y-auto', 'overflow-x-hidden', 'scroll-tabla')

    const elementoTabla = await screen.findByRole('table')
    expect(elementoTabla).toHaveClass('table-fixed')
    const tabla = within(elementoTabla)
    expect(tabla.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument()
    expect(tabla.getByRole('columnheader', { name: 'Fecha de solicitud' })).toBeInTheDocument()
    expect(tabla.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument()
    expect(tabla.getByText('1')).toBeInTheDocument()
    expect(await tabla.findByText('Libro de cálculo')).toBeInTheDocument()
    expect(tabla.getByText(new Date(prestamos[1].createdAt).toLocaleDateString('es-EC'))).toBeInTheDocument()
    expect(tabla.queryByText('Multímetro')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Devoluciones/ }))
    const devoluciones = within(await screen.findByRole('region', { name: 'Tabla de devoluciones por registrar' }))
    expect(devoluciones.getByText('Multímetro')).toBeInTheDocument()
    expect(devoluciones.getByText(new Date(prestamos[0].fechaEntrega).toLocaleDateString('es-EC'))).toBeInTheDocument()
    expect(devoluciones.getByRole('button', { name: 'Registrar devolución de Multímetro' })).toBeInTheDocument()
    expect(devoluciones.queryByText('Libro de cálculo')).not.toBeInTheDocument()
  })

  test('busca recursos sin distinguir tildes y filtra las filas por estado', async () => {
    const user = userEvent.setup()
    renderAdminEntrega()

    await user.click(screen.getByRole('tab', { name: /Devoluciones/ }))
    const tabla = within(await screen.findByRole('table'))
    expect(await tabla.findByText('Multímetro')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' }), 'multimetro')

    expect(tabla.getByText('Multímetro')).toBeInTheDocument()
    expect(tabla.queryByText('Laptop')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar estudiante o recurso...' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'entregado')

    expect(tabla.getByText('Multímetro')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'En revisión' })).not.toBeInTheDocument()
  })

  test('registra una entrega aprobada y adjunta la foto de evidencia opcional', async () => {
    const user = userEvent.setup()
    renderAdminEntrega()
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Registrar entrega de Libro de cálculo' }))
    await user.selectOptions(screen.getByLabelText('Condición del recurso al entregarlo'), 'incompleto')
    const evidencia = new File(['foto'], 'evidencia.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/Foto de evidencia/), evidencia)
    await user.type(screen.getByLabelText(/Responsable/), 'María López')
    await user.type(screen.getByLabelText(/Observaciones/), 'Se entrega con su estuche')
    await user.click(screen.getByRole('button', { name: 'Registrar entrega' }))

    expect(prestamoService.registrarEntrega).toHaveBeenCalledWith('p-academico', {
      responsable: 'María López',
      observaciones: 'Se entrega con su estuche',
      condicion: 'incompleto',
      evidencia,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Entrega registrada correctamente')
  })

  test('exige evidencia para recursos dañados e informa el resultado de la devolución', async () => {
    const user = userEvent.setup()
    prestamoService.registrarDevolucion.mockResolvedValue({
      msg: 'Devolución registrada correctamente',
      recurso: { estado: 'mantenimiento' },
      totalPenalizado: 5,
      advertencias: ['Se requiere revisar el recurso antes de volver a prestarlo'],
    })
    renderAdminEntrega()
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: /Devoluciones/ }))
    await user.click(await screen.findByRole('button', { name: 'Registrar devolución de Multímetro' }))
    await user.selectOptions(screen.getByLabelText('Condición del recurso'), 'danado')
    await user.click(screen.getByRole('button', { name: 'Registrar devolución' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Adjunta una foto de evidencia para devolver un recurso dañado o incompleto.')
    expect(prestamoService.registrarDevolucion).not.toHaveBeenCalled()

    const evidencia = new File(['foto'], 'danio.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText(/Foto de evidencia/), evidencia)
    await user.type(screen.getByLabelText(/Responsable/), 'María López')
    await user.type(screen.getByLabelText(/Observaciones/), 'Carcasa agrietada')
    await user.click(screen.getByRole('button', { name: 'Registrar devolución' }))

    expect(prestamoService.registrarDevolucion).toHaveBeenCalledWith('p-tecnico', {
      responsable: 'María López',
      observaciones: 'Carcasa agrietada',
      condicion: 'danado',
      evidencia,
    })
    const resultado = await screen.findByRole('status')
    expect(resultado).toHaveTextContent('Devolución registrada correctamente')
    expect(resultado).toHaveTextContent('Estado del recurso: Mantenimiento.')
    expect(resultado).toHaveTextContent('$5,00')
    expect(resultado).toHaveTextContent('Se requiere revisar el recurso antes de volver a prestarlo')
  })

  test('permite devolver en buen estado sin foto de evidencia', async () => {
    const user = userEvent.setup()
    renderAdminEntrega()
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: /Devoluciones/ }))
    await user.click(await screen.findByRole('button', { name: 'Registrar devolución de Multímetro' }))
    await user.click(screen.getByRole('button', { name: 'Registrar devolución' }))

    expect(prestamoService.registrarDevolucion).toHaveBeenCalledWith('p-tecnico', {
      responsable: '',
      observaciones: '',
      condicion: 'bueno',
      evidencia: null,
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Devolución registrada correctamente')
  })
})
