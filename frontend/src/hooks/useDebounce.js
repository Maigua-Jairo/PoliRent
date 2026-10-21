import { useEffect, useState } from 'react'

/* Devuelve el valor solo cuando deja de cambiar durante `espera` ms (evita una petición por tecla) */
export default function useDebounce(valor, espera = 350) {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDiferido(valor), espera)
    return () => clearTimeout(id)
  }, [valor, espera])
  return diferido
}
