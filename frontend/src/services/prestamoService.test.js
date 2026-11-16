import { afterEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosCliente.js'
import { registrarDevolucion, registrarEntrega } from './prestamoService.js'

afterEach(() => vi.restoreAllMocks())

describe('prestamoService', () => {
  test('envía evidencia de entrega como multipart/form-data', async () => {
    const put = vi.spyOn(axiosClient, 'put').mockResolvedValue({ data: { msg: 'Entrega registrada' } })
    const evidencia = new File(['foto'], 'evidencia.png', { type: 'image/png' })

    await registrarEntrega('prestamo-1', {
      responsable: 'María López',
      observaciones: 'Se entrega con estuche',
      condicion: 'bueno',
      evidencia,
    })

    const [url, datos, config] = put.mock.calls[0]
    expect(url).toBe('/api/prestamos/prestamo-1/entregar')
    expect(datos).toBeInstanceOf(FormData)
    expect(datos.get('responsable')).toBe('María López')
    expect(datos.get('observaciones')).toBe('Se entrega con estuche')
    expect(datos.get('condicion')).toBe('bueno')
    expect(datos.get('evidencia')).toBeInstanceOf(File)
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })

  test('envía condición y evidencia de devolución como multipart/form-data', async () => {
    const put = vi.spyOn(axiosClient, 'put').mockResolvedValue({ data: { msg: 'Devolución registrada' } })
    const evidencia = new File(['foto'], 'danio.jpg', { type: 'image/jpeg' })

    await registrarDevolucion('prestamo-2', {
      responsable: 'María López',
      observaciones: 'Carcasa agrietada',
      condicion: 'danado',
      evidencia,
    })

    const [url, datos, config] = put.mock.calls[0]
    expect(url).toBe('/api/prestamos/prestamo-2/devolver')
    expect(datos).toBeInstanceOf(FormData)
    expect(datos.get('responsable')).toBe('María López')
    expect(datos.get('observaciones')).toBe('Carcasa agrietada')
    expect(datos.get('condicion')).toBe('danado')
    expect(datos.get('evidencia')).toBeInstanceOf(File)
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })
})
