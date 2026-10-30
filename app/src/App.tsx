import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { homeForRole, useAuth } from './auth/AuthContext';
import type { Role } from './api/types';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import Historico from './pages/Historico';
import Inicio from './pages/vecino/Inicio';
import SubirFoto from './pages/vecino/SubirFoto';
import Vigilancia from './pages/vecino/Vigilancia';
import MapaOperativo from './pages/brigadista/MapaOperativo';
import Casos from './pages/brigadista/Casos';
import Tablero from './pages/autoridad/Tablero';
import Siniestro from './pages/autoridad/Siniestro';
import Centro from './pages/autoridad/Centro';

/** Protege rutas por rol. La validación real del rol la hace el backend en cada endpoint. */
function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !user.role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/perfil" element={<RequireRole><Perfil /></RequireRole>} />
      <Route path="/historico" element={<RequireRole><Historico /></RequireRole>} />

      {/* Vecino (brigadistas y autoridades también pueden subir fotos) */}
      <Route path="/vecino" element={<RequireRole><Inicio /></RequireRole>} />
      <Route path="/vecino/foto" element={<RequireRole><SubirFoto /></RequireRole>} />
      <Route path="/vecino/punto/:id" element={<RequireRole><Vigilancia /></RequireRole>} />

      {/* Brigadista */}
      <Route path="/brigadista" element={<RequireRole roles={['brigadista', 'autoridad']}><MapaOperativo /></RequireRole>} />
      <Route path="/brigadista/casos" element={<RequireRole roles={['brigadista', 'autoridad']}><Casos /></RequireRole>} />

      {/* Autoridad */}
      <Route path="/autoridad" element={<RequireRole roles={['autoridad']}><Tablero /></RequireRole>} />
      <Route path="/autoridad/siniestro/:pointId" element={<RequireRole roles={['autoridad']}><Siniestro /></RequireRole>} />
      <Route path="/autoridad/centro" element={<RequireRole roles={['autoridad']}><Centro /></RequireRole>} />

      <Route path="*" element={<Navigate to={user?.role ? homeForRole(user.role) : '/login'} replace />} />
    </Routes>
  );
}
