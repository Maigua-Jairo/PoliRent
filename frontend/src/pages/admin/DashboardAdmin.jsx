import { useCallback, useState } from 'react'
import Alerta from '../../components/Alerta.jsx'
import BienvenidaAdmin from '../../components/admin/BienvenidaAdmin.jsx'
import AccesosRapidos from '../../components/admin/AccesosRapidos.jsx'
import SolicitudesRecientes from '../../components/admin/SolicitudesRecientes.jsx'
import GraficoCategorias from '../../components/admin/GraficoCategorias.jsx'
import GraficoSolicitudes from '../../components/admin/GraficoSolicitudes.jsx'
import ResumenInventario from '../../components/admin/ResumenInventario.jsx'
import UltimasActividades from '../../components/admin/UltimasActividades.jsx'
import ReporteRapido from '../../components/admin/ReporteRapido.jsx'
import DialogoRechazo from '../../components/admin/DialogoRechazo.jsx'
import { TarjetaResumen } from '../../components/dashboard/Resumen.jsx'
import { iconos } from '../../components/layout/iconos.jsx'
import useDashboardAdmin from '../../hooks/useDashboardAdmin.js'
import { aprobarPrestamo } from '../../services/prestamoService.js'
import { obtenerMensajeError } from '../../services/authService.js'
import { useAuthStore } from '../../store/authStore.js'
import { inventarioPorCategoria, ultimasActividades } from '../../utils/estadisticas.js'
import { descargarArchivo, generarReporteCSV } from '../../utils/reporte.js'

/* ---------- Panel principal del administrador (HU-003) ---------- */
export default function DashboardAdmin() {
  const usuario = useAuthStore((state) => state.usuario)
  const { cargando, error, prestamos, recursos, ahora, recargar } = useDashboardAdmin()
  const [aviso, setAviso] = useState({ tipo: 'exito', texto: '' })
  const [aprobando, setAprobando] = useState(false)
  const [aRechazar, setARechazar] = useState(null)
  const cerrarRechazo = useCallback(() => setARechazar(null), [])

  const inventario = inventarioPorCategoria(recursos)
  const pendientes = prestamos.filter((p) => p.estado === 'pendiente').length
  const activos = prestamos.filter((p) => p.estado === 'entregado').length

  const aprobar = async (prestamo) => {
    setAprobando(true)
    try {
      const respuesta = await aprobarPrestamo(prestamo._id)
      setAviso({ tipo: 'exito', texto: respuesta.msg })
      recargar()
    } catch (e) {
      setAviso({ tipo: 'error', texto: obtenerMensajeError(e) })
    } finally {
      setAprobando(false)
    }
  }

  const onRechazo = ({ tipo, texto }) => {
    setAviso({ tipo, texto })
    if (tipo === 'exito') recargar()
  }

  const generarReporte = () => {
    const fecha = new Date().toISOString().slice(0, 10)
    descargarArchivo(generarReporteCSV(prestamos, recursos), `reporte-polirent-${fecha}.csv`)
  }

  return (
    <div className="space-y-6 motion-safe:animate-aparecer">
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <BienvenidaAdmin usuario={usuario} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <AccesosRapidos onReporte={generarReporte} />
        </div>
      </div>

      <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>
      <Alerta>{error}</Alerta>

      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
        <TarjetaResumen
          titulo="Total de herramientas"
          valor={recursos.length}
          detalle="en inventario"
          icono={iconos.recursos}
          tono="bg-brand-500 shadow-brand-500/30"
          cargando={cargando}
        />
        <TarjetaResumen
          titulo="Préstamos activos"
          valor={activos}
          detalle="recursos en uso"
          icono={iconos.bolsa}
          tono="bg-emerald-500 shadow-emerald-500/30"
          cargando={cargando}
        />
        <TarjetaResumen
          titulo="Solicitudes pendientes"
          valor={pendientes}
          detalle="requieren revisión"
          icono={iconos.solicitudes}
          tono="bg-violet-500 shadow-violet-500/30"
          cargando={cargando}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <SolicitudesRecientes prestamos={prestamos} cargando={cargando} procesando={aprobando} onAprobar={aprobar} onRechazar={setARechazar} />
          <div className="grid gap-6 2xl:grid-cols-2 [&>*]:min-w-0">
            <ResumenInventario inventario={inventario} cargando={cargando} />
            <UltimasActividades actividades={ultimasActividades(prestamos, recursos)} ahora={ahora} cargando={cargando} />
          </div>
        </div>
        <div className="min-w-0 space-y-6 xl:col-span-4">
          <GraficoCategorias inventario={inventario} cargando={cargando} />
          <GraficoSolicitudes prestamos={prestamos} ahora={ahora} cargando={cargando} />
          <ReporteRapido onReporte={generarReporte} deshabilitado={cargando} />
        </div>
      </div>

      <DialogoRechazo prestamo={aRechazar} onCerrar={cerrarRechazo} onResultado={onRechazo} />
    </div>
  )
}
