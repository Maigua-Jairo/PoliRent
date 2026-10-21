import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import RecuperarClave from './pages/RecuperarClave.jsx'
import RestablecerClave from './pages/RestablecerClave.jsx'
import Perfil from './pages/Perfil.jsx'
import Catalogo from './pages/Catalogo.jsx'
import DetalleRecurso from './pages/DetalleRecurso.jsx'
import GestionRecursos from './pages/admin/GestionRecursos.jsx'
import FormularioRecurso from './pages/admin/FormularioRecurso.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
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

        <Route element={<AppLayout />}>
          {/* Públicas: invitados, estudiantes y administradores (HU-006/007) */}
          <Route path="/recursos" element={<Catalogo />} />
          <Route path="/recursos/:id" element={<DetalleRecurso />} />

          {/* Requieren sesión (cualquier rol) */}
          <Route element={<RutaProtegida />}>
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Solo administradores (HU-003) */}
          <Route element={<RutaProtegida roles={['administrador']} />}>
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
