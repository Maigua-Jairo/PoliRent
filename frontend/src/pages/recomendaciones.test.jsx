import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Recomendaciones from './Recomendaciones.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useConsultasStore } from '../store/consultasStore.js'
import * as recomendacionService from '../services/recomendacionService.js'

vi.mock('../services/recomendacionService.js', () => ({ obtenerRecomendaciones: vi.fn() }))

const usuario = { id: '1', nombres: 'Jairo', apellidos: 'Maigua', correo: 'jairo.maigua@epn.edu.ec', rol: 'estudiante' }

const RESPUESTA = {
  total: 2,
  recomendaciones: [
    {
      recurso: { _id: 'r1', nombre: 'Cámara Raspberry Pi HQ', descripcion: 'Cámara de alta resolución', categoria: 'tecnico', imagen: 'https://res.cloudinary.com/demo/camara.jpg' },
      relevancia: 100,
      terminosCoincidentes: ['vision', 'camara'],
      razon: 'Coincide con tu proyecto en: vision, camara',
    },
    {
      recurso: { _id: 'r2', nombre: 'OpenCV - Guía práctica', descripcion: 'Manual con ejemplos', categoria: 'academico', imagen: '' },
      relevancia: 60,
      terminosCoincidentes: ['vision'],
      razon: 'Coincide con tu proyecto en: vision',
    },
  ],
}

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/recomendaciones']}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<RutaProtegida roles={['estudiante']} />}>
          <Route path="/recomendaciones" element={<Recomendaciones />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  useConsultasStore.setState({ porUsuario: {} })
  recomendacionService.obtenerRecomendaciones.mockResolvedValue(RESPUESTA)
})

describe('Recomendaciones inteligentes (HU-009)', () => {
  test('sin sesión redirige al login', () => {
    renderPagina()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  test('valida la consulta antes de llamar al backend', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPagina()

    await userEvent.type(screen.getByLabelText('Describe tu proyecto'), 'abc{Enter}')
    expect(screen.getByText('Escribe al menos 5 caracteres.')).toBeInTheDocument()
    expect(recomendacionService.obtenerRecomendaciones).not.toHaveBeenCalled()
  })

  test('envía la consulta, muestra los recursos y la guarda en recientes', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPagina()

    expect(screen.getByText(/¡Hola, Jairo!/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Describe tu proyecto'), 'Proyecto de visión por computadora')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }))

    const recursos = within(await screen.findByRole('region', { name: 'Recursos recomendados' }))
    expect(recursos.getByText('Cámara Raspberry Pi HQ')).toBeInTheDocument()
    expect(recursos.getByRole('img', { name: 'Cámara Raspberry Pi HQ' })).toHaveAttribute('src', 'https://res.cloudinary.com/demo/camara.jpg')
    expect(recursos.getByText('OpenCV - Guía práctica')).toBeInTheDocument()
    expect(recomendacionService.obtenerRecomendaciones).toHaveBeenCalledWith(
      expect.objectContaining({ contexto: 'Proyecto de visión por computadora' }),
    )

    const recientes = within(screen.getByRole('region', { name: 'Mis consultas recientes' }))
    expect(recientes.getByText('Proyecto de visión por computadora')).toBeInTheDocument()
  })

  test('los filtros están ocultos hasta pedirlos y limitan la categoría', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPagina()

    expect(screen.queryByRole('group', { name: 'Tipo de recurso' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    await userEvent.click(screen.getByRole('button', { name: 'Académicos' }))

    await userEvent.type(screen.getByLabelText('Describe tu proyecto'), 'Proyecto de visión por computadora{Enter}')
    const recursos = within(await screen.findByRole('region', { name: 'Recursos recomendados' }))
    expect(recursos.getByText('OpenCV - Guía práctica')).toBeInTheDocument()
    expect(recursos.queryByText('Cámara Raspberry Pi HQ')).not.toBeInTheDocument()
  })

  test('muestra el mensaje del backend si falla', async () => {
    recomendacionService.obtenerRecomendaciones.mockRejectedValue({ response: { data: { msg: 'El contexto debe tener entre 5 y 500 caracteres' } } })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPagina()

    await userEvent.type(screen.getByLabelText('Describe tu proyecto'), 'Necesito sensores{Enter}')
    expect(await screen.findByText('El contexto debe tener entre 5 y 500 caracteres')).toBeInTheDocument()
  })
})
