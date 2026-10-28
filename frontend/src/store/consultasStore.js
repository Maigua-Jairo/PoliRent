import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAXIMO = 5

// Últimas consultas al asistente de recomendaciones, por usuario (persistidas en 'polirent-consultas')
export const useConsultasStore = create(
  persist(
    (set) => ({
      porUsuario: {},
      agregarConsulta: (clave, texto) =>
        set((state) => {
          const anteriores = (state.porUsuario[clave] ?? []).filter((c) => c.texto !== texto)
          return { porUsuario: { ...state.porUsuario, [clave]: [{ texto, fecha: Date.now() }, ...anteriores].slice(0, MAXIMO) } }
        }),
    }),
    { name: 'polirent-consultas' },
  ),
)
