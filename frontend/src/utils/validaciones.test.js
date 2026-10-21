import { describe, expect, test } from 'vitest'
import {
  regla,
  validarCedula,
  validarConfirmacion,
  validarContrasena,
  validarCorreoEPN,
  validarFacultad,
  validarNombre,
  validarTelefono,
} from './validaciones.js'

describe('validaciones', () => {
  test('correo: solo acepta el dominio institucional', () => {
    expect(validarCorreoEPN('juan.perez@epn.edu.ec')).toBe('')
    expect(validarCorreoEPN('juan@gmail.com')).toMatch(/institucionales/)
    expect(validarCorreoEPN('')).toMatch(/obligatorio/)
  })

  test('nombre: exige letras y al menos 2 caracteres', () => {
    expect(validarNombre('José María', 'El nombre')).toBe('')
    expect(validarNombre('J', 'El nombre')).toMatch(/corto/)
    expect(validarNombre('Juan2', 'El nombre')).toMatch(/letras/)
  })

  test('cédula: verifica el dígito verificador', () => {
    expect(validarCedula('1712345675')).toBe('')
    expect(validarCedula('1712345670')).toBe('La cédula no es válida.')
    expect(validarCedula('17123')).toMatch(/10 dígitos/)
    expect(validarCedula('9912345675')).toBe('La cédula no es válida.')
  })

  test('teléfono: formato 09XXXXXXXX', () => {
    expect(validarTelefono('0991234567')).toBe('')
    expect(validarTelefono('0221234567')).toMatch(/09XXXXXXXX/)
  })

  test('facultad: solo valores de la lista', () => {
    expect(validarFacultad('Ingeniería en Sistemas')).toBe('')
    expect(validarFacultad('Medicina')).toMatch(/Selecciona/)
  })

  test('contraseña: mayúscula, minúscula, número y 8 caracteres', () => {
    expect(validarContrasena('Clave1234')).toBe('')
    expect(validarContrasena('Cl1')).toMatch(/8 caracteres/)
    expect(validarContrasena('clave1234')).toMatch(/mayúscula/)
    expect(validarContrasena('CLAVE1234')).toMatch(/minúscula/)
    expect(validarContrasena('ClaveSegura')).toMatch(/número/)
  })

  test('confirmación: compara contra el campo original', () => {
    const validar = validarConfirmacion('password')
    expect(validar('Clave1234', { password: 'Clave1234' })).toBe('')
    expect(validar('Otra1234', { password: 'Clave1234' })).toMatch(/no coinciden/)
  })

  test('regla: adapta el validador a react-hook-form', () => {
    expect(regla(validarTelefono)('0991234567')).toBe(true)
    expect(regla(validarTelefono)('123')).toMatch(/09XXXXXXXX/)
  })
})
