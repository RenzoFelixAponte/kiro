import { Link, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../auth/AuthContext';
import { Icon, VecinoNav } from '../components/ui';

export default function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">Mi perfil</h1>
      </header>
      <div className="content">
        <div className="card">
          <span className="eyebrow">{user.role}</span>
          <span className="strong" style={{ fontSize: 18 }}>{user.name || 'Sin nombre'}</span>
          <span className="muted">{user.phone} · {user.district}</span>
        </div>
        <Link className="btn ghost block" to={homeForRole(user.role)}>Ir a mi inicio</Link>
        <Link className="btn ghost block" to="/historico">Buscar eventos históricos por distrito</Link>
        <button
          className="btn ghost block"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          <Icon name="logout" /> Cerrar sesión
        </button>
      </div>
      {user.role === 'vecino' && <VecinoNav />}
    </div>
  );
}
