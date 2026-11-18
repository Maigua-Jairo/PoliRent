import { afterEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosCliente.js'
import { anularPenalizacion, consultarMisPenalizaciones, pagarPenalizacion } from './penalizacionService.js'

afterEach(() => vi.restoreAllMocks())

describe('penalizacionService', () => {
  test('consulta las penalizaciones del estudiante y transmite estado y signal', async () => {
    const respuesta = { total: 1, totalAdeudado: 8, penalizaciones: [] }
    const signal = new AbortController().signal
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: respuesta })

    await expect(consultarMisPenalizaciones({ estado: 'pendiente' }, { signal })).resolves.toEqual(respuesta)
    expect(get).toHaveBeenCalledWith('/api/penalizaciones/mis', {
      params: { estado: 'pendiente' },
      signal,
    })
  })

  test('registra el pago de una penalización por id', async () => {
    const respuesta = { msg: 'Pago registrado correctamente' }
    const put = vi.spyOn(axiosClient, 'put').mockResolvedValue({ data: respuesta })

    await expect(pagarPenalizacion('penalizacion-1')).resolves.toEqual(respuesta)
    expect(put).toHaveBeenCalledWith('/api/penalizaciones/penalizacion-1/pagar')
  })

  test('envía el motivo al anular una penalización', async () => {
    const respuesta = { msg: 'Penalización anulada correctamente' }
    const put = vi.spyOn(axiosClient, 'put').mockResolvedValue({ data: respuesta })

    await expect(anularPenalizacion('penalizacion-2', 'Artículo repuesto')).resolves.toEqual(respuesta)
    expect(put).toHaveBeenCalledWith('/api/penalizaciones/penalizacion-2/anular', { motivo: 'Artículo repuesto' })
  })
})
