import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PenalizacionesAdmin from './PenalizacionesAdmin.jsx'
import * as penalizacionService from '../../services/penalizacionService.js'

vi.mock('../../services/penalizacionService.js', () => ({
  listarPenalizaciones: vi.fn(),
  pagarPenalizacion: vi.fn(),
  anularPenalizacion: vi.fn(),
}))

const PENALIZACIONES = [
  {
    _id: 'p1',
    tipo: 'atraso',
    monto: 4.5,
    dias: 2,
    descripcion: 'Atraso de 2 días',
    estado: 'pendiente',
    createdAt: '2026-09-12T10:24:00.000Z',
    usuario: { nombres: 'Carlos', apellidos: 'Méndez', correo: 'carlos@epn.edu.ec', cedula: '1723456789' },
    recurso: { nombre: 'Multímetro digital', categoria: 'tecnico', precio: 45 },
    prestamo: { _id: '64b0000000000000000000a1' },
  },
  {
    _id: 'p2',
    tipo: 'danio',
    monto: 9,
    descripcion: 'Daño reportado',
    estado: 'pagada',
    createdAt: '2026-09-10T09:00:00.000Z',
    fechaPago: '2026-09-11T09:00:00.000Z',
    usuario: { nombres: 'María', apellidos: 'López', correo: 'maria@epn.edu.ec', cedula: '1712345678' },
    recurso: { nombre: 'Libro de cálculo', categoria: 'academico', precio: 20 },
    prestamo: { _id: '64b0000000000000000000a2' },
  },
]

const renderSeccion = (props = {}) =>
  render(
    <PenalizacionesAdmin
      total={PENALIZACIONES.length}
      totalPendiente={4.5}
      cargando={false}
      error=""
      penalizaciones={PENALIZACIONES}
      onActualizar={vi.fn()}
      {...props}
    />,
  )

beforeEach(() => {
  vi.clearAllMocks()
  penalizacionService.pagarPenalizacion.mockResolvedValue({ msg: 'Pago registrado correctamente' })
  penalizacionService.anularPenalizacion.mockResolvedValue({ msg: 'Penalización anulada correctamente' })
})

describe('Penalizaciones del administrador', () => {
  test('muestra la tabla completa con registros, estudiante, recurso y estado', () => {
    renderSeccion()

    const seccion = within(screen.getByRole('region', { name: 'Penalizaciones' }))
    const tabla = within(screen.getByRole('table', { name: 'Listado completo de penalizaciones registradas' }))
    expect(seccion.getByText('2 registros')).toBeInTheDocument()
    expect(seccion.getByText('Carlos Méndez')).toBeInTheDocument()
    expect(seccion.getByText('carlos@epn.edu.ec')).toBeInTheDocument()
    expect(seccion.getByText(/Cédula: 1723456789/)).toBeInTheDocument()
    expect(seccion.getByText('Multímetro digital')).toBeInTheDocument()
    expect(tabla.getByText('Técnico')).toBeInTheDocument()
    expect(seccion.getByText('Atraso de 2 días')).toBeInTheDocument()
    expect(tabla.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument()
    expect(tabla.getAllByRole('columnheader')[1]).toHaveTextContent('Acciones')
    expect(tabla.queryByRole('columnheader', { name: 'Préstamo' })).not.toBeInTheDocument()
    expect(seccion.getByText('Última actualización')).toBeInTheDocument()
    expect(seccion.getByText('Fecha de pago')).toBeInTheDocument()
    expect(seccion.getByText('María López')).toBeInTheDocument()
    expect(tabla.getByText('Pagada')).toBeInTheDocument()
    const filas = tabla.getAllByRole('row')
    expect(within(filas[1]).getAllByRole('cell')[0]).toHaveTextContent('1')
    expect(within(filas[1]).getByRole('button', { name: 'Registrar pago de Carlos Méndez por Multímetro digital' })).toBeInTheDocument()
    expect(within(filas[2]).getAllByRole('cell')[0]).toHaveTextContent('2')
    expect(within(filas[2]).getAllByRole('cell')[1]).toHaveTextContent('—')
  })

  test('filtra por estudiante, estado y rango de fechas', async () => {
    const user = userEvent.setup()
    renderSeccion()
    const tabla = screen.getByRole('table', { name: 'Listado completo de penalizaciones registradas' })

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por estudiante' }), 'mendez')
    expect(within(tabla).getByText('Carlos Méndez')).toBeInTheDocument()
    expect(within(tabla).queryByText('María López')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar por estudiante' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'pagada')
    expect(within(tabla).getByText('María López')).toBeInTheDocument()
    expect(within(tabla).queryByText('Carlos Méndez')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), '')
    await user.type(screen.getByLabelText('Fecha desde'), '2026-09-11')
    expect(within(tabla).getByText('Carlos Méndez')).toBeInTheDocument()
    expect(within(tabla).queryByText('María López')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Fecha desde'))
    await user.type(screen.getByLabelText('Fecha hasta'), '2026-09-11')
    expect(within(tabla).getByText('María López')).toBeInTheDocument()
    expect(within(tabla).queryByText('Carlos Méndez')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Fecha hasta'))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por tipo de recurso' }), 'academico')
    expect(within(tabla).getByText('María López')).toBeInTheDocument()
    expect(within(tabla).queryByText('Carlos Méndez')).not.toBeInTheDocument()
    const filasFiltradas = within(tabla).getAllByRole('row')
    expect(within(filasFiltradas[1]).getAllByRole('cell')[0]).toHaveTextContent('1')
  })

  test('solicita confirmación antes de registrar un pago y actualiza la lista', async () => {
    const user = userEvent.setup()
    const onActualizar = vi.fn()
    renderSeccion({ onActualizar })

    await user.click(screen.getByRole('button', { name: 'Registrar pago de Carlos Méndez por Multímetro digital' }))
    const dialogo = within(screen.getByRole('alertdialog'))
    expect(dialogo.getByText(/¿Confirmas el pago de/)).toBeInTheDocument()
    await user.click(dialogo.getByRole('button', { name: 'Sí, registrar pago' }))

    expect(penalizacionService.pagarPenalizacion).toHaveBeenCalledWith('p1')
    expect(await screen.findByText('Pago registrado correctamente')).toBeInTheDocument()
    expect(onActualizar).toHaveBeenCalledOnce()
  })

  test('exige un motivo válido para anular y lo envía al backend', async () => {
    const user = userEvent.setup()
    const onActualizar = vi.fn()
    renderSeccion({ onActualizar })

    await user.click(screen.getByRole('button', { name: 'Anular penalización de Carlos Méndez por Multímetro digital' }))
    const dialogo = within(screen.getByRole('alertdialog'))
    const motivo = dialogo.getByLabelText('Motivo de anulación')
    const confirmar = dialogo.getByRole('button', { name: 'Sí, anular' })
    expect(confirmar).toBeDisabled()

    await user.type(motivo, ' Reposición ')
    expect(confirmar).toBeEnabled()
    await user.click(confirmar)

    expect(penalizacionService.anularPenalizacion).toHaveBeenCalledWith('p1', 'Reposición')
    expect(await screen.findByText('Penalización anulada correctamente')).toBeInTheDocument()
    expect(onActualizar).toHaveBeenCalledOnce()
  })

  test('muestra un estado vacío cuando aún no hay registros', () => {
    renderSeccion({ total: 0, totalPendiente: 0, penalizaciones: [] })
    expect(screen.getByText('Aún no hay penalizaciones registradas.')).toBeInTheDocument()
  })
})
