import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sesión del usuario (persistida en localStorage bajo 'polirent-auth')
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      iniciarSesion: ({ token, usuario }) => set({ token, usuario }),
      actualizarUsuario: (usuario) => set({ usuario }),
      setToken: (token) => set({ token }),
      cerrarSesion: () => set({ token: null, usuario: null }),
    }),
    { name: 'polirent-auth' },
  ),
)

export const esAdministrador = (usuario) => usuario?.rol === 'administrador'
