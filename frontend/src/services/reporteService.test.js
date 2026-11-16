import { afterEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosCliente.js'
import { consultarReportePenalizaciones } from './reporteService.js'

afterEach(() => vi.restoreAllMocks())

describe('reporteService', () => {
  test('descarga el reporte de penalizaciones con sus filtros en CSV', async () => {
    const archivo = new Blob(['reporte'])
    const signal = new AbortController().signal
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: archivo })

    const respuesta = await consultarReportePenalizaciones(
      { desde: '2026-10-01', hasta: '2026-10-31', estado: 'pendiente', formato: 'csv' },
      { signal },
    )

    expect(get).toHaveBeenCalledWith('/api/reportes/penalizaciones', {
      params: { desde: '2026-10-01', hasta: '2026-10-31', estado: 'pendiente', formato: 'csv' },
      signal,
      responseType: 'blob',
    })
    expect(respuesta).toBe(archivo)
  })
})
