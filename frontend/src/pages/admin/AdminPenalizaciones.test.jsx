import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AdminPenalizaciones from './AdminPenalizaciones.jsx'
import * as penalizacionService from '../../services/penalizacionService.js'

vi.mock('../../services/penalizacionService.js', () => ({
  listarPenalizaciones: vi.fn(),
  pagarPenalizacion: vi.fn(),
  anularPenalizacion: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  penalizacionService.listarPenalizaciones.mockResolvedValue({
    total: 1,
    totalPendiente: 8,
    penalizaciones: [
      {
        _id: 'penalizacion-1',
        tipo: 'perdida',
        monto: 8,
        descripcion: 'Pérdida de equipo',
        estado: 'pendiente',
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-01T10:00:00.000Z',
        usuario: { nombres: 'Luis', apellidos: 'Vega', correo: 'luis@epn.edu.ec' },
        recurso: { nombre: 'Cámara' },
      },
    ],
  })
})

describe('Gestión de penalizaciones del administrador', () => {
  test('muestra la tabla desde su propia pantalla y consulta el servicio', async () => {
    render(<AdminPenalizaciones />)

    expect(screen.getByRole('heading', { level: 1, name: 'Gestión de penalizaciones' })).toBeInTheDocument()
    const tabla = within(await screen.findByRole('table', { name: 'Listado completo de penalizaciones registradas' }))
    expect(tabla.getByText('Luis Vega')).toBeInTheDocument()
    expect(tabla.getByText('Cámara')).toBeInTheDocument()
    expect(tabla.getByText('Pérdida')).toBeInTheDocument()
    expect(penalizacionService.listarPenalizaciones).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  test('muestra el error del servidor al no poder cargar penalizaciones', async () => {
    penalizacionService.listarPenalizaciones.mockRejectedValue({
      response: { data: { msg: 'No se pudieron cargar las penalizaciones.' } },
    })
    render(<AdminPenalizaciones />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las penalizaciones.')
  })
})
