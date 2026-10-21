import { afterEach, describe, expect, test, vi } from 'vitest'
import axiosClient from '../api/axiosCliente.js'
import { actualizarRecurso, crearRecurso, listarRecursos } from './recursoService.js'

afterEach(() => vi.restoreAllMocks())

describe('recursoService', () => {
  test('envía los recursos como multipart para no perder la imagen', async () => {
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: {} })
    const imagen = new File(['x'], 'kit.png', { type: 'image/png' })
    await crearRecurso({ nombre: 'Kit', categoria: 'tecnico', descripcion: '', imagen })

    const [url, cuerpo, config] = post.mock.calls[0]
    expect(url).toBe('/api/recursos')
    expect(cuerpo).toBeInstanceOf(FormData)
    expect(cuerpo.get('imagen')).toBeInstanceOf(File)
    expect(cuerpo.get('nombre')).toBe('Kit')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })

  test('una imagen vacía indica que se debe quitar la actual', async () => {
    const put = vi.spyOn(axiosClient, 'put').mockResolvedValue({ data: {} })
    await actualizarRecurso('a1', { nombre: 'Kit', imagen: '' })
    expect(put.mock.calls[0][1].get('imagen')).toBe('')
  })

  test('omite los filtros vacíos al listar', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: { recursos: [] } })
    await listarRecursos({ categoria: 'tecnico', estado: '', buscar: '' })
    expect(get.mock.calls[0][1].params).toEqual({ categoria: 'tecnico' })
  })
})
