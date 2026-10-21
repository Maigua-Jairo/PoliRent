import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import RecuperarClave from './pages/RecuperarClave.jsx'
import RestablecerClave from './pages/RestablecerClave.jsx'
import Perfil from './pages/Perfil.jsx'
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

        {/* Requieren sesión (cualquier rol) */}
        <Route element={<RutaProtegida />}>
          <Route element={<AppLayout />}>
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
