import { Navigate, useLocation } from 'react-router-dom'

/* ---------- El catálogo vive en la sección "Recursos" de la landing: /recursos?x -> /?x#recursos ---------- */
export default function Catalogo() {
  const { search } = useLocation()
  return <Navigate to={`/${search}#recursos`} replace />
}
