import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useDebounce from './useDebounce.js'
import { CATEGORIAS, ESTADOS } from '../utils/recursos.jsx'

const valido = (lista, valor) => (lista.some((x) => x.valor === valor) ? valor : '')

/* Filtros del catálogo guardados en la URL (?categoria=&estado=&buscar=) para poder compartir el enlace */
export default function useFiltrosRecursos() {
  const [params, setParams] = useSearchParams()
  const [buscar, setBuscar] = useState(params.get('buscar') ?? '')
  const categoria = valido(CATEGORIAS, params.get('categoria'))
  const estado = valido(ESTADOS, params.get('estado'))
  const buscarDiferido = useDebounce(buscar.trim())

  const actualizar = (clave, valor) =>
    setParams(
      (prev) => {
        const siguiente = new URLSearchParams(prev)
        if (valor) siguiente.set(clave, valor)
        else siguiente.delete(clave)
        return siguiente
      },
      { replace: true },
    )

  const onBuscar = (valor) => {
    setBuscar(valor)
    actualizar('buscar', valor.trim())
  }

  const limpiar = () => {
    setBuscar('')
    setParams({}, { replace: true })
  }

  return {
    buscar,
    categoria,
    estado,
    filtros: { categoria, estado, buscar: buscarDiferido },
    hayFiltros: Boolean(buscar.trim() || categoria || estado),
    onBuscar,
    onCategoria: (valor) => actualizar('categoria', valor),
    onEstado: (valor) => actualizar('estado', valor),
    limpiar,
  }
}
