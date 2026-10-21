import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Login from './Login.jsx'
import Register from './Register.jsx'
import { useAuthStore } from '../store/authStore.js'
import * as authService from '../services/authService.js'

vi.mock('../services/authService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  iniciarSesion: vi.fn(),
  registrarUsuario: vi.fn(),
}))

const renderEn = (ruta, elemento) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path={ruta} element={elemento} />
        <Route path="/" element={<p>Página de inicio</p>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().cerrarSesion()
})

describe('Login', () => {
  test('muestra errores de validación sin llamar al backend', async () => {
    renderEn('/login', <Login />)
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('El correo es obligatorio.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument()
    expect(authService.iniciarSesion).not.toHaveBeenCalled()
  })

  test('guarda la sesión y redirige al inicio', async () => {
    const usuario = { id: '1', nombres: 'Juan', rol: 'estudiante' }
    authService.iniciarSesion.mockResolvedValue({ token: 'jwt-123', usuario })
    renderEn('/login', <Login />)

    await userEvent.type(screen.getByLabelText('Correo institucional'), 'juan.perez@epn.edu.ec')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave1234')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Página de inicio')).toBeInTheDocument()
    expect(authService.iniciarSesion).toHaveBeenCalledWith({ correo: 'juan.perez@epn.edu.ec', password: 'Clave1234' })
    expect(useAuthStore.getState()).toMatchObject({ token: 'jwt-123', usuario })
  })

  test('muestra el mensaje de error del backend', async () => {
    authService.iniciarSesion.mockRejectedValue({ response: { data: { msg: 'Usuario o Contraseña incorrecta' } } })
    renderEn('/login', <Login />)

    await userEvent.type(screen.getByLabelText('Correo institucional'), 'juan.perez@epn.edu.ec')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Mala1234')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o Contraseña incorrecta')
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('Registro', () => {
  test('ofrece solo las facultades de la lista', () => {
    renderEn('/registro', <Register />)
    const opciones = screen.getAllByRole('option').map((o) => o.textContent)
    expect(opciones).toContain('Escuela de Formación de Tecnólogos')
    expect(opciones).toHaveLength(8) // placeholder + 7 facultades
  })

  test('envía los datos completos y redirige al login con el mensaje', async () => {
    authService.registrarUsuario.mockResolvedValue({ msg: 'Usuario registrado correctamente, ya puedes iniciar sesion' })
    renderEn('/registro', <Register />)

    await userEvent.type(screen.getByLabelText('Nombres'), 'Juan Carlos')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'Pérez López')
    await userEvent.type(screen.getByLabelText('Cédula'), '17-1234-5675')
    await userEvent.type(screen.getByLabelText('Teléfono'), '0991234567')
    await userEvent.type(screen.getByLabelText('Correo institucional'), 'juan.perez@epn.edu.ec')
    await userEvent.selectOptions(screen.getByLabelText('Facultad'), 'Ingeniería en Sistemas')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave1234')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Clave1234')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Usuario registrado correctamente')
    expect(authService.registrarUsuario).toHaveBeenCalledWith({
      nombres: 'Juan Carlos',
      apellidos: 'Pérez López',
      cedula: '1712345675',
      correo: 'juan.perez@epn.edu.ec',
      telefono: '0991234567',
      facultad: 'Ingeniería en Sistemas',
      password: 'Clave1234',
    })
  })

  test('detecta contraseñas que no coinciden', async () => {
    renderEn('/registro', <Register />)
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Clave1234')
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'Clave9999')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(authService.registrarUsuario).not.toHaveBeenCalled()
  })
})
