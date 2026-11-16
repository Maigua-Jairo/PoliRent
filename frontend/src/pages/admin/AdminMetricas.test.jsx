import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminMetricas from './AdminMetricas.jsx'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import {
  consultarReportePenalizaciones,
  consultarReportePrestamos,
  consultarReporteRecursos,
} from '../../services/reporteService.js'
import { descargarArchivo } from '../../utils/reporte.js'

vi.mock('../../hooks/useDashboardAdmin.js', () => ({ default: vi.fn() }))
vi.mock('../../services/reporteService.js', () => ({
  consultarReportePenalizaciones: vi.fn(),
  consultarReportePrestamos: vi.fn(),
  consultarReporteRecursos: vi.fn(),
}))
vi.mock('../../utils/reporte.js', () => ({ descargarArchivo: vi.fn() }))

const prestamos = [
  { estado: 'entregado', solicitadoEl: '2026-10-10T12:00:00.000Z', correo: 'ana@epn.edu.ec' },
  { estado: 'pendiente', solicitadoEl: '2026-10-11T12:00:00.000Z', correo: 'luis@epn.edu.ec' },
  { estado: 'cancelado', solicitadoEl: '2026-10-12T12:00:00.000Z', correo: 'ana@epn.edu.ec' },
]
const recursos = [
  { recurso: 'Multímetro', categoria: 'tecnico', vecesPrestado: 2 },
  { recurso: 'Libro', categoria: 'academico', vecesPrestado: 1 },
]

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

beforeEach(() => {
  vi.clearAllMocks()
  useDashboardAdmin.mockReturnValue({
    cargando: false,
    error: '',
    errorMetricas: '',
    metricas: {
      recursos: { total: 4 },
      penalizaciones: {
        pendientes: { cantidad: 2, monto: 35.5 },
        pagadas: { cantidad: 1, monto: 10 },
        anuladas: { cantidad: 1 },
        montoPorTipo: { atraso: 5.5, danio: 30, perdida: 10 },
      },
      recursosParaReponer: [{
        recurso: { _id: 'rec-1', nombre: 'Osciloscopio en mantenimiento', estado: 'mantenimiento' },
        vecesPrestado: 4,
        ocupacion30Dias: 65,
        incidentes: 2,
        razones: ['en_mantenimiento', 'danos_frecuentes'],
      }],
    },
  })
  consultarReportePrestamos.mockResolvedValue({ prestamos })
  consultarReporteRecursos.mockResolvedValue({ recursos })
  consultarReportePenalizaciones.mockResolvedValue({ penalizaciones: [], total: 3, totalMonto: 17.5 })
})

describe('Métricas y reportes', () => {
  test('consulta reportes con el período de los últimos 30 días', async () => {
    render(<AdminMetricas />)

    const hoy = new Date()
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 29)
    await waitFor(() => {
      expect(consultarReportePrestamos).toHaveBeenCalledWith({ desde: formatDate(desde), hasta: formatDate(hoy) })
      expect(consultarReporteRecursos).toHaveBeenCalledWith({ desde: formatDate(desde), hasta: formatDate(hoy) })
    })
    expect(await screen.findByText('Multímetro')).toBeInTheDocument()
    expect(screen.getByText('Solicitudes Totales').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Usuarios Activos').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('2 préstamos')).toBeInTheDocument()
    expect(screen.getByText('Pendientes').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Daños frecuentes')).toBeInTheDocument()
    expect(screen.getByText('65 % de ocupación')).toBeInTheDocument()
  })

  test('al cambiar el período vuelve a consultar y genera el CSV seleccionado', async () => {
    const user = userEvent.setup()
    render(<AdminMetricas />)

    await screen.findByText('Multímetro')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Período de métricas' }), '90')
    const hoy = new Date()
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 89)
    await waitFor(() => {
      expect(consultarReportePrestamos).toHaveBeenLastCalledWith({ desde: formatDate(desde), hasta: formatDate(hoy) })
    })

    await user.click(await screen.findByRole('button', { name: /Reporte de recursos/ }))
    await user.click(screen.getByRole('button', { name: 'Generar Reporte CSV' }))

    await waitFor(() => {
      expect(consultarReporteRecursos).toHaveBeenLastCalledWith({ desde: formatDate(desde), hasta: formatDate(hoy), formato: 'csv' })
    })
    expect(descargarArchivo).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^reporte-polirent-recursos-\d{4}-\d{2}-\d{2}\.csv$/),
    )
  })

  test('genera el CSV de penalizaciones con el período seleccionado', async () => {
    const user = userEvent.setup()
    render(<AdminMetricas />)

    await screen.findByText('Multímetro')
    consultarReportePenalizaciones.mockResolvedValueOnce(new Blob(['csv de penalizaciones']))
    const hoy = new Date()
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - 29)
    await user.click(screen.getByRole('button', { name: /Reporte de penalizaciones/ }))
    expect(screen.getByText(/3 registros/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Generar Reporte CSV' }))

    await waitFor(() => {
      expect(consultarReportePenalizaciones).toHaveBeenLastCalledWith({
        desde: formatDate(desde),
        hasta: formatDate(hoy),
        formato: 'csv',
      })
    })
    expect(descargarArchivo).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^reporte-polirent-penalizaciones-\d{4}-\d{2}-\d{2}\.csv$/),
    )
  })
})
