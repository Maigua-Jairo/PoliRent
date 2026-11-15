import { afterEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosCliente.js'
import { conversarConAsistente } from './asistenteService.js'

afterEach(() => vi.restoreAllMocks())

describe('asistenteService', () => {
  test('envía mensaje e historial al endpoint del asistente', async () => {
    const respuesta = { tipo: 'ayuda', respuesta: 'Puedes explorar el catálogo.', recomendaciones: [], enlaces: [] }
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: respuesta })
    const historial = [{ rol: 'usuario', texto: 'hola' }]

    await expect(conversarConAsistente({ mensaje: '¿Cómo reservo?', historial })).resolves.toEqual(respuesta)

    expect(post).toHaveBeenCalledWith(
      '/api/asistente',
      { mensaje: '¿Cómo reservo?', historial },
      { signal: undefined, timeout: 45000 },
    )
  })
})
