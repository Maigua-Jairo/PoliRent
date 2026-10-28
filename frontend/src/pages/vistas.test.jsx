import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Home from './Home.jsx'
import Perfil from './Perfil.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as authService from '../services/authService.js'
import * as recursoService from '../services/recursoService.js'

vi.mock('../services/recursoService.js', () => ({ listarRecursos: vi.fn() }))

vi.mock('../services/authService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  obtenerPerfil: vi.fn(),
  actualizarPerfil: vi.fn(),
  cerrarSesion: vi.fn(),
}))

const usuario = {
  id: '1',
  nombres: 'Juan Carlos',
  apellidos: 'Pérez López',
  cedula: '1712345675',
  correo: 'juan.perez@epn.edu.ec',
  telefono: '0991234567',
  facultad: 'Ingeniería en Sistemas',
  rol: 'estudiante',
}

const renderApp = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route element={<RutaProtegida />}>
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  recursoService.listarRecursos.mockResolvedValue({ total: 0, recursos: [] })
})

describe('Landing (HU-001)', () => {
  test('la sección Recursos muestra el catálogo completo del backend', async () => {
    recursoService.listarRecursos.mockResolvedValue({
      total: 1,
      recursos: [{ _id: 'a1', nombre: 'Kit Arduino Uno', descripcion: '', categoria: 'tecnico', estado: 'disponible', imagen: '' }],
    })
    renderApp('/')

    const recursos = within(screen.getByRole('region', { name: 'Recursos' }))
    expect(await recursos.findByRole('link', { name: 'Kit Arduino Uno' })).toBeInTheDocument()
    for (const categoria of ['Técnicos', 'Académicos', 'Recreativos']) {
      expect(recursos.getByRole('button', { name: new RegExp(categoria) })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Recomendaciones inteligentes' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Iniciar sesión/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Explorar recursos/ })).toHaveAttribute('href', '#recursos')
  })

  test('con sesión muestra al usuario y permite cerrar sesión', async () => {
    authService.cerrarSesion.mockResolvedValue({})
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderApp('/')

    expect(screen.getByText('Juan')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }))

    expect(authService.cerrarSesion).toHaveBeenCalled()
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('Perfil (HU-002)', () => {
  test('sin sesión redirige al login', () => {
    renderApp('/perfil')
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
  })

  test('muestra los datos y guarda los cambios', async () => {
    authService.obtenerPerfil.mockResolvedValue({ usuario })
    authService.actualizarPerfil.mockResolvedValue({
      msg: 'Perfil actualizado correctamente',
      usuario: { ...usuario, telefono: '0987654321' },
    })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderApp('/perfil')

    expect(screen.getByText('1712345675')).toBeInTheDocument()
    const telefono = screen.getByLabelText('Teléfono')
    await userEvent.clear(telefono)
    await userEvent.type(telefono, '0987654321')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Perfil actualizado correctamente')).toBeInTheDocument()
    expect(authService.actualizarPerfil).toHaveBeenCalledWith(expect.objectContaining({ telefono: '0987654321' }))
    expect(useAuthStore.getState().usuario.telefono).toBe('0987654321')
  })

  test('la pestaña Seguridad muestra el cambio de contraseña', async () => {
    authService.obtenerPerfil.mockResolvedValue({ usuario })
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderApp('/perfil')

    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Seguridad' }))
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument()
    expect(screen.queryByLabelText('Teléfono')).not.toBeInTheDocument()
  })
})
