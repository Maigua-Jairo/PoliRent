import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import RecuperarClave from './pages/RecuperarClave.jsx'
import RestablecerClave from './pages/RestablecerClave.jsx'
import Perfil from './pages/Perfil.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Recomendaciones from './pages/Recomendaciones.jsx'
import MisSolicitudes from './pages/MisSolicitudes.jsx'
import DetallePrestamo from './pages/DetallePrestamo.jsx'
import Catalogo from './pages/Catalogo.jsx'
import DetalleRecurso from './pages/DetalleRecurso.jsx'
import DashboardAdmin from './pages/admin/DashboardAdmin.jsx'
import GestionRecursos from './pages/admin/GestionRecursos.jsx'
import FormularioRecurso from './pages/admin/FormularioRecurso.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import RutaProtegida from './components/routes/RutaProtegida.jsx'
import SoloInvitados from './components/routes/SoloInvitados.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Solo sin sesión activa */}
        <Route element={<SoloInvitados />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-clave" element={<RecuperarClave />} />
          <Route path="/recuperar-clave/:token" element={<RestablecerClave />} />
        </Route>

        {/* Catálogo público: se explora y se reserva aquí, fuera del panel (HU-006/007/008) */}
        <Route element={<PublicLayout />}>
          <Route path="/recursos" element={<Catalogo />} />
          <Route path="/recursos/:id" element={<DetalleRecurso />} />
        </Route>

        <Route element={<AppLayout />}>
          {/* Panel del estudiante (el administrador tiene el suyo en /admin) */}
          <Route element={<RutaProtegida roles={['estudiante']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recomendaciones" element={<Recomendaciones />} />
            <Route path="/solicitudes" element={<MisSolicitudes />} />
            <Route path="/solicitudes/:id" element={<DetallePrestamo />} />
          </Route>

          {/* Requieren sesión (cualquier rol) */}
          <Route element={<RutaProtegida />}>
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Solo administradores (HU-003) */}
          <Route element={<RutaProtegida roles={['administrador']} />}>
            <Route path="/admin" element={<DashboardAdmin />} />
            <Route path="/admin/recursos" element={<GestionRecursos />} />
            <Route path="/admin/recursos/nuevo" element={<FormularioRecurso />} />
            <Route path="/admin/recursos/:id/editar" element={<FormularioRecurso />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
