import Alerta from '../components/Alerta.jsx'
import Bienvenida from '../components/dashboard/Bienvenida.jsx'
import Resumen from '../components/dashboard/Resumen.jsx'
import RecomendacionesParaTi from '../components/dashboard/RecomendacionesParaTi.jsx'
import TarjetaPerfil from '../components/dashboard/TarjetaPerfil.jsx'
import UltimosMovimientos from '../components/dashboard/UltimosMovimientos.jsx'
import useDashboard from '../hooks/useDashboard.js'
import { useAuthStore } from '../store/authStore.js'
import { devolucionesProximas, ESTADOS_ACTIVOS } from '../utils/prestamos.js'

/* ---------- Panel principal del estudiante (HU-007 / HU-009) ---------- */
export default function Dashboard() {
  const usuario = useAuthStore((state) => state.usuario)
  const { prestamos, recomendaciones } = useDashboard(usuario?.facultad)
  const lista = prestamos.lista

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <Bienvenida usuario={usuario} />
      <Alerta>{prestamos.error}</Alerta>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <Resumen
            cargando={prestamos.cargando}
            cargandoRecomendaciones={recomendaciones.cargando}
            activas={lista.filter((p) => ESTADOS_ACTIVOS.includes(p.estado)).length}
            enPrestamo={lista.filter((p) => p.estado === 'entregado').length}
            recomendaciones={recomendaciones.lista.length}
            devoluciones={devolucionesProximas(lista, prestamos.ahora).length}
          />
          <RecomendacionesParaTi {...recomendaciones} />
        </div>
        <div className="min-w-0 space-y-6 xl:col-span-4">
          <TarjetaPerfil usuario={usuario} />
          <UltimosMovimientos prestamos={lista} cargando={prestamos.cargando} />
        </div>
      </div>
    </div>
  )
}
