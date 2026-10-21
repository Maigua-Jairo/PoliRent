import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// persist hidrata de forma síncrona desde localStorage ('theme'), así que el
// estado ya refleja la preferencia guardada al terminar create().
const useDarkMode = create(
    persist(
        (set) => ({
            isDarkMode: false,
            setIsDarkMode: (value) => set({ isDarkMode: value }),
            toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode }))
        }),
        { name: 'theme' }
    )
)

if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', useDarkMode.getState().isDarkMode)
    useDarkMode.subscribe((state) => {
        document.documentElement.classList.toggle('dark', state.isDarkMode)
    })
}

export default useDarkMode
