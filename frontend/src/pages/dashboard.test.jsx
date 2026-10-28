import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import Catalogo from './Catalogo.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import PublicLayout from '../components/layout/PublicLayout.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { iniciales } from '../utils/usuario.js'
import { useAuthStore } from '../store/authStore.js'
import * as prestamoService from '../services/prestamoService.js'
import * as recomendacionService from '../services/recomendacionService.js'

vi.mock('../services/prestamoService.js', () => ({ listarMisPrestamos: vi.fn() }))
vi.mock('../services/recomendacionService.js', () => ({ obtenerRecomendaciones: vi.fn() }))

const usuario = {
  id: '1',
  nombres: 'Jairo Andrés',
  apellidos: 'Maigua Pérez',
  correo: 'jairo.maigua@epn.edu.ec',
  facultad: 'Escuela de Formación de Tecnólogos',
  rol: 'estudiante',
}

const laptop = { _id: '64b000000000000000000a01', nombre: 'Laptop Dell Inspiron 15', categoria: 'tecnico', imagen: 'https://res.cloudinary.com/demo/laptop.jpg' }
const kit = { _id: '64b000000000000000000a02', nombre: 'Kit de herramientas básicas', categoria: 'tecnico', imagen: '' }

const PRESTAMOS = [
  { _id: 'p1', estado: 'entregado', recurso: laptop, fechaEntrega: '2026-09-15T10:00:00Z', fechaDevolucion: '2099-09-22T10:00:00Z', createdAt: '2026-09-10T10:00:00Z', updatedAt: '2026-09-15T10:00:00Z' },
  { _id: 'p2', estado: 'pendiente', recurso: kit, fechaDevolucion: '2099-10-01T10:00:00Z', createdAt: '2026-09-14T10:00:00Z', updatedAt: '2026-09-14T10:00:00Z' },
  { _id: 'p3', estado: 'rechazado', recurso: kit, fechaDevolucion: '2026-09-01T10:00:00Z', createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-08-08T10:00:00Z' },
]

const renderPanel = (ruta = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<p>Landing</p>} />
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<AppLayout />}>
          <Route element={<RutaProtegida roles={['estudiante']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>
        <Route path="/recursos" element={<Catalogo />} />
        <Route element={<PublicLayout />}>
          <Route path="/recursos/:id" element={<p>Ficha del recurso</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  prestamoService.listarMisPrestamos.mockResolvedValue({ total: PRESTAMOS.length, prestamos: PRESTAMOS })
  recomendacionService.obtenerRecomendaciones.mockResolvedValue({
    total: 1,
    recomendaciones: [{ recurso: { _id: 'r9', nombre: 'Microscopio óptico', descripcion: 'Para laboratorios', categoria: 'academico', imagen: 'https://res.cloudinary.com/demo/micro.jpg' }, razon: 'Coincide con tu facultad' }],
  })
})

describe('Dashboard del estudiante', () => {
  test('sin sesión redirige al login', () => {
    renderPanel()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  test('un administrador no entra al panel del estudiante', () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario: { ...usuario, rol: 'administrador' } })
    renderPanel()
    expect(screen.getByText('Landing')).toBeInTheDocument()
  })

  test('muestra el saludo, los movimientos y las recomendaciones con su reserva', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPanel()

    expect(screen.getByRole('heading', { level: 1, name: /¡Hola, Jairo!/ })).toBeInTheDocument()
    const movimientos = within(screen.getByRole('region', { name: 'Últimos movimientos' }))
    expect(await movimientos.findByText('Préstamo entregado')).toBeInTheDocument()
    expect(movimientos.getByText('Laptop Dell Inspiron 15')).toBeInTheDocument()
    expect(movimientos.getByText('Solicitud en revisión')).toBeInTheDocument()
    expect(movimientos.getByText('Solicitud rechazada')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Tu préstamo activo' })).not.toBeInTheDocument()

    const recomendaciones = within(screen.getByRole('region', { name: 'Recomendaciones para ti' }))
    expect(await recomendaciones.findByText('Microscopio óptico')).toBeInTheDocument()
    // la foto del recurso se toma de recurso.imagen (Cloudinary)
    expect(recomendaciones.getByRole('img', { name: 'Microscopio óptico' })).toHaveAttribute('src', 'https://res.cloudinary.com/demo/micro.jpg')
    // en el panel no se reserva: el botón lleva a la ficha pública del recurso
    expect(screen.queryByRole('link', { name: /Reservar/ })).not.toBeInTheDocument()
    await userEvent.click(recomendaciones.getByRole('link', { name: 'Ver Microscopio óptico en recursos' }))
    expect(screen.getByText('Ficha del recurso')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    expect(recomendacionService.obtenerRecomendaciones).toHaveBeenCalledWith(
      expect.objectContaining({ contexto: expect.stringContaining('Escuela de Formación de Tecnólogos') }),
      expect.anything(),
    )
  })

  test('el avatar usa las iniciales y el menú permite cerrar sesión', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPanel()

    expect(iniciales(usuario)).toBe('JM')
    expect(screen.getAllByText('JM').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /Jairo Maigua/ }))
    expect(screen.getByRole('menuitem', { name: /Cerrar sesión/ })).toBeInTheDocument()
    // desde el avatar se vuelve a la landing para seguir explorando
    expect(screen.getByRole('menuitem', { name: /Página principal/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('menuitem', { name: /Mi panel/ })).toHaveAttribute('href', '/dashboard')
  })

  test('un invitado ve la ficha del recurso con el navbar del sitio, sin panel', () => {
    renderPanel('/recursos/r9')

    expect(screen.getByText('Ficha del recurso')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Sitio' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute('href', '/registro')
  })

  test('con sesión, la ficha usa el mismo navbar de la landing con acceso al panel', () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPanel('/recursos/r9')

    expect(screen.getByText('Ficha del recurso')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    // las secciones del navbar vuelven a la landing
    expect(screen.getByRole('link', { name: 'Recursos' })).toHaveAttribute('href', '/#recursos')
    expect(screen.getByRole('link', { name: /Jairo/ })).toHaveAttribute('href', '/dashboard')
    expect(screen.queryByRole('link', { name: 'Registrarse' })).not.toBeInTheDocument()
  })

  test('la barra lateral no incluye el catálogo de recursos', () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPanel()

    const navegacion = within(screen.getByRole('navigation', { name: 'Principal' }))
    expect(navegacion.getByRole('link', { name: 'Recomendaciones inteligentes' })).toBeInTheDocument()
    expect(navegacion.queryByRole('link', { name: 'Recursos' })).not.toBeInTheDocument()
  })

  test('/recursos redirige a la sección Recursos de la landing', () => {
    renderPanel('/recursos?categoria=tecnico')
    expect(screen.getByText('Landing')).toBeInTheDocument()
  })

  test('el buscador superior lleva al catálogo de la landing', async () => {
    useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
    renderPanel()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar recursos' }), 'arduino{Enter}')
    expect(screen.getByText('Landing')).toBeInTheDocument()
  })
})
