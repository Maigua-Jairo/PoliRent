import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CatalogoRecursos from '../components/recursos/CatalogoRecursos.jsx'
import GestionRecursos from './admin/GestionRecursos.jsx'
import FormularioRecurso from './admin/FormularioRecurso.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as recursoService from '../services/recursoService.js'

vi.mock('../services/recursoService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  listarRecursos: vi.fn(),
  crearRecurso: vi.fn(),
  eliminarRecurso: vi.fn(),
}))

const RECURSOS = [
  { _id: 'a1', nombre: 'Kit Arduino Uno', descripcion: 'Placa y sensores', categoria: 'tecnico', estado: 'disponible', imagen: '' },
  { _id: 'b2', nombre: 'Balón de fútbol', descripcion: '', categoria: 'recreativo', estado: 'prestado', imagen: '' },
]

const renderEn = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<p>Inicio</p>} />
        <Route path="/login" element={<p>Login</p>} />
        <Route path="/recursos" element={<CatalogoRecursos />} />
        <Route element={<RutaProtegida roles={['administrador']} />}>
          <Route path="/admin/recursos" element={<GestionRecursos />} />
          <Route path="/admin/recursos/nuevo" element={<FormularioRecurso />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

const sesion = (rol) => useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario: { id: '1', nombres: 'Ana', rol } })

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  recursoService.listarRecursos.mockResolvedValue({ total: 2, recursos: RECURSOS })
})

describe('Catálogo público (HU-006/007)', () => {
  test('un invitado ve los recursos con su categoría y estado', async () => {
    renderEn('/recursos')
    expect(await screen.findByRole('link', { name: 'Kit Arduino Uno' })).toBeInTheDocument()
    expect(screen.getByText('2 recursos encontrados')).toBeInTheDocument()
    const tarjeta = screen.getByRole('link', { name: 'Balón de fútbol' }).closest('article')
    expect(tarjeta).toHaveTextContent('Recreativo')
    expect(tarjeta).toHaveTextContent('Prestado')
  })

  test('filtra por categoría (también desde la URL)', async () => {
    renderEn('/recursos?categoria=academico')
    await screen.findByText('2 recursos encontrados')
    expect(recursoService.listarRecursos).toHaveBeenLastCalledWith(
      { categoria: 'academico', estado: '', buscar: '' },
      expect.anything(),
    )
    expect(screen.getByRole('button', { name: /Académicos/ })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Técnicos/ }))
    await waitFor(() =>
      expect(recursoService.listarRecursos).toHaveBeenLastCalledWith(expect.objectContaining({ categoria: 'tecnico' }), expect.anything()),
    )
  })

  test('muestra un estado vacío con opción de limpiar filtros', async () => {
    recursoService.listarRecursos.mockResolvedValue({ total: 0, recursos: [] })
    renderEn('/recursos?estado=mantenimiento')
    expect(await screen.findByText('Nada por aquí…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
  })
})

describe('Gestión de recursos (HU-003)', () => {
  test('un estudiante no puede entrar al panel', () => {
    sesion('estudiante')
    renderEn('/admin/recursos')
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  test('el administrador elimina un recurso tras confirmar', async () => {
    sesion('administrador')
    recursoService.eliminarRecurso.mockResolvedValue({ msg: 'Recurso eliminado correctamente' })
    renderEn('/admin/recursos')

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Kit Arduino Uno' }))
    const dialogo = screen.getByRole('alertdialog')
    expect(dialogo).toHaveTextContent('Kit Arduino Uno')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Sí, eliminar' }))

    expect(recursoService.eliminarRecurso).toHaveBeenCalledWith('a1')
    expect(await screen.findByText('Recurso eliminado correctamente')).toBeInTheDocument()
  })

  test('no permite eliminar un recurso prestado', async () => {
    sesion('administrador')
    renderEn('/admin/recursos')
    expect(await screen.findByRole('button', { name: 'Eliminar Balón de fútbol' })).toBeDisabled()
  })

  test('valida y registra un recurso nuevo con su imagen', async () => {
    sesion('administrador')
    recursoService.crearRecurso.mockResolvedValue({ msg: 'Recurso registrado correctamente' })
    renderEn('/admin/recursos/nuevo')

    await userEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona una categoría.')).toBeInTheDocument()
    expect(recursoService.crearRecurso).not.toHaveBeenCalled()

    const imagen = new File(['x'], 'kit.png', { type: 'image/png' })
    await userEvent.type(screen.getByLabelText('Nombre'), 'Multímetro digital')
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'tecnico')
    await userEvent.upload(screen.getByLabelText('Seleccionar imagen'), imagen)
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))

    await waitFor(() =>
      expect(recursoService.crearRecurso).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Multímetro digital', categoria: 'tecnico', estado: 'disponible', imagen }),
      ),
    )
    expect(await screen.findByText('Recurso registrado correctamente')).toBeInTheDocument()
  })

  test('rechaza imágenes que no son JPG, PNG o WEBP', async () => {
    sesion('administrador')
    renderEn('/admin/recursos/nuevo')
    const pdf = new File(['x'], 'manual.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('Seleccionar imagen'), pdf, { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recurso' }))
    expect(await screen.findByText('La imagen debe ser JPG, PNG o WEBP.')).toBeInTheDocument()
  })
})
