import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MisSolicitudes from './MisSolicitudes.jsx'
import DetallePrestamo from './DetallePrestamo.jsx'
import RutaProtegida from '../components/routes/RutaProtegida.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as prestamoService from '../services/prestamoService.js'
import { formatearFecha } from '../utils/prestamos.js'

vi.mock('../services/prestamoService.js', () => ({
  listarMisPrestamos: vi.fn(),
  cancelarPrestamo: vi.fn(),
}))

const usuario = { id: '1', nombres: 'Jairo', apellidos: 'Maigua', rol: 'estudiante' }
const laptop = { _id: '64b000000000000000000a01', nombre: 'Laptop Dell Inspiron 15', categoria: 'tecnico', imagen: '' }
const kit = { _id: '64b000000000000000000a02', nombre: 'Kit de herramientas básicas', categoria: 'tecnico', imagen: '' }
const tablet = { _id: '64b000000000000000000a03', nombre: 'Tablet gráfica Wacom', categoria: 'tecnico', imagen: '' }

const PRESTAMOS = [
  { _id: 'p1', estado: 'aprobado', recurso: laptop, motivo: 'Proyecto de tesis', fechaDevolucion: '2099-09-22T10:00:00Z', createdAt: '2026-09-15T10:00:00Z' },
  { _id: 'p2', estado: 'pendiente', recurso: kit, fechaDevolucion: '2099-10-01T10:00:00Z', createdAt: '2026-09-12T10:00:00Z' },
  { _id: 'p3', estado: 'rechazado', recurso: tablet, motivoRechazo: 'Sin stock', fechaDevolucion: '2026-09-10T10:00:00Z', createdAt: '2026-09-05T10:00:00Z' },
]

const renderEn = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Login</p>} />
        <Route element={<RutaProtegida roles={['estudiante']} />}>
          <Route path="/solicitudes" element={<MisSolicitudes />} />
          <Route path="/solicitudes/:id" element={<DetallePrestamo />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
  useAuthStore.getState().iniciarSesion({ token: 'jwt', usuario })
  prestamoService.listarMisPrestamos.mockResolvedValue({ total: PRESTAMOS.length, prestamos: PRESTAMOS })
})

describe('Mis solicitudes (HU-007)', () => {
  test('sin sesión redirige al login', () => {
    useAuthStore.getState().cerrarSesion()
    renderEn('/solicitudes')
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  test('lista las solicitudes y filtra por estado', async () => {
    renderEn('/solicitudes')
    const lista = within(await screen.findByRole('region', { name: 'Solicitudes' }))
    expect(await lista.findByText('Laptop Dell Inspiron 15')).toBeInTheDocument()
    expect(lista.getByText('Tablet gráfica Wacom')).toBeInTheDocument()
    expect(lista.getByText('1')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'rechazadas')
    expect(lista.queryByText('Laptop Dell Inspiron 15')).not.toBeInTheDocument()
    expect(lista.getByText('Tablet gráfica Wacom')).toBeInTheDocument()
  })

  test('busca recursos y presenta las acciones con el estilo de Herramientas', async () => {
    const user = userEvent.setup()
    renderEn('/solicitudes')

    const tabla = await screen.findByRole('region', { name: 'Lista de solicitudes' })
    expect(tabla).toHaveClass('max-h-[70vh]', 'overflow-y-auto', 'overflow-x-hidden', 'scroll-tabla')
    expect(tabla).toHaveAttribute('tabindex', '0')
    expect(within(tabla).getByText('Acciones')).toHaveClass('text-center')
    expect(within(tabla).getByText('Estado')).toHaveClass('text-center')

    const busqueda = screen.getByRole('searchbox', { name: 'Buscar recurso...' })
    await user.type(busqueda, 'kit')

    expect(within(tabla).getByText('Kit de herramientas básicas')).toBeInTheDocument()
    expect(within(tabla).queryByText('Laptop Dell Inspiron 15')).not.toBeInTheDocument()

    await user.clear(busqueda)
    const enlaceVer = within(tabla).getByRole('link', { name: 'Ver solicitud de Laptop Dell Inspiron 15' })
    const botonCancelar = within(tabla).getByRole('button', { name: 'Cancelar solicitud de Laptop Dell Inspiron 15' })
    expect(enlaceVer.parentElement).toHaveClass('lg:justify-center')
    expect(within(tabla).getByText('Aprobada').parentElement).toHaveClass('flex', 'justify-center')
    expect(botonCancelar.querySelector('svg path')).toHaveAttribute('d', 'M18 6 6 18M6 6l12 12')
    for (const accion of [enlaceVer, botonCancelar]) {
      expect(accion).toHaveClass('h-9', 'w-9')
      expect(accion.querySelector('svg')).toHaveAttribute('stroke-width', '2')
    }
    expect(enlaceVer).toHaveAttribute('title', 'Ver solicitud')
    expect(botonCancelar).toHaveAttribute('title', 'Cancelar solicitud')
  })

  test('mantiene alineada la fecha aunque el recurso tenga un nombre largo', async () => {
    const prestamosConDomino = [
      {
        _id: 'p-domino',
        estado: 'entregado',
        recurso: { _id: 'r-domino', nombre: 'Juego de dominó profesional de doble nueve', categoria: 'recreativo', imagen: '' },
        fechaDevolucion: '2099-09-22T10:00:00Z',
        createdAt: '2026-09-15T10:00:00Z',
      },
      {
        _id: 'p-corto',
        estado: 'pendiente',
        recurso: { _id: 'r-corto', nombre: 'Regla', categoria: 'tecnico', imagen: '' },
        fechaDevolucion: '2099-09-22T10:00:00Z',
        createdAt: '2026-09-12T10:00:00Z',
      },
    ]
    prestamoService.listarMisPrestamos.mockResolvedValueOnce({ prestamos: prestamosConDomino })
    renderEn('/solicitudes')

    const filaDomino = (await screen.findByText('Juego de dominó profesional de doble nueve')).closest('li')
    const filaCorta = screen.getByText('Regla').closest('li')
    const columnaFecha = [...within(filaDomino).getAllByText(formatearFecha(prestamosConDomino[0].createdAt))]
      .find((elemento) => elemento.classList.contains('whitespace-nowrap'))

    expect(columnaFecha).toBeInTheDocument()
    expect(filaDomino.className).toContain('lg:grid-cols-[6rem_minmax(0,1fr)_9rem_8rem_10rem]')
    expect(filaCorta.className).toContain('lg:grid-cols-[6rem_minmax(0,1fr)_9rem_8rem_10rem]')
  })

  test('solo permite cancelar solicitudes en revisión o aprobadas', async () => {
    prestamoService.cancelarPrestamo.mockResolvedValue({ msg: 'Solicitud cancelada correctamente' })
    renderEn('/solicitudes')

    expect(await screen.findByRole('button', { name: 'Cancelar solicitud de Kit de herramientas básicas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar solicitud de Tablet gráfica Wacom' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud de Kit de herramientas básicas' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }))

    expect(prestamoService.cancelarPrestamo).toHaveBeenCalledWith('p2')
    expect(await screen.findByText('Solicitud cancelada correctamente')).toBeInTheDocument()
  })
})

describe('Detalle del préstamo (HU-007)', () => {
  test('muestra la información y las instrucciones de retiro', async () => {
    renderEn('/solicitudes/p1')

    expect(await screen.findByRole('heading', { name: 'Laptop Dell Inspiron 15' })).toBeInTheDocument()
    expect(screen.getByText('Proyecto de tesis')).toBeInTheDocument()
    expect(screen.getByText('Días restantes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver instrucciones' }))
    expect(screen.getByRole('heading', { name: 'Instrucciones de retiro' })).toBeInTheDocument()
    expect(screen.queryByText(/QR/)).not.toBeInTheDocument()
  })

  test('muestra quien entregó el recurso, su condición y la evidencia registrada', async () => {
    const prestamoEntregado = {
      _id: 'p-entregado',
      estado: 'entregado',
      recurso: laptop,
      fechaEntrega: '2026-10-12T10:00:00.000Z',
      fechaDevolucion: '2099-09-22T10:00:00Z',
      entrega: {
        responsableNombre: 'María López',
        condicion: 'incompleto',
        observaciones: 'Se entrega con un cable faltante',
        evidencia: { url: 'https://res.cloudinary.com/demo/evidencia.jpg' },
      },
    }
    prestamoService.listarMisPrestamos.mockResolvedValueOnce({ prestamos: [prestamoEntregado] })
    renderEn('/solicitudes/p-entregado')

    const informacion = within(await screen.findByRole('region', { name: 'Información de entrega y devolución' }))
    expect(informacion.getByText('María López')).toBeInTheDocument()
    expect(informacion.getByText('Incompleto')).toBeInTheDocument()
    expect(informacion.getByText('Se entrega con un cable faltante')).toBeInTheDocument()
    expect(informacion.getByRole('link', { name: 'Ver foto' })).toHaveAttribute('href', 'https://res.cloudinary.com/demo/evidencia.jpg')
  })

  test('una solicitud rechazada muestra el motivo y no tiene acciones', async () => {
    renderEn('/solicitudes/p3')

    expect(await screen.findByText('Sin stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver instrucciones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar préstamo' })).not.toBeInTheDocument()
  })

  test('avisa si la solicitud no existe', async () => {
    renderEn('/solicitudes/zzz')
    expect(await screen.findByText('No encontramos esta solicitud.')).toBeInTheDocument()
  })
})
