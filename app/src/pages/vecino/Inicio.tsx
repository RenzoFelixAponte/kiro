import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { USE_MOCK } from '../../api/client';
import type { Feature, NearbyAlerts } from '../../api/types';
import MapView, { PIURA_CENTER, getPosition } from '../../components/MapView';
import { Icon, LevelBadge, LevelScale, VecinoNav, km } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

const HIST_LABEL: Record<string, string> = { huaico: 'Huaico', desborde: 'Desborde', inundacion: 'Inundación' };

export default function Inicio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // En modo demo se simula la ubicación en la zona piloto para que el mapa tenga datos
  const home: [number, number] = user?.lat && user?.lon ? [user.lat, user.lon] : PIURA_CENTER;
  const [me, setMe] = useState<[number, number]>(home);
  const [gpsReal, setGpsReal] = useState(!USE_MOCK);
  const [alerts, setAlerts] = useState<NearbyAlerts | null>(null);
  const [historical, setHistorical] = useState<Feature[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gpsReal) getPosition(home).then(setMe);
    else setMe(home);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsReal]);

  useEffect(() => {
    setError('');
    api.nearbyAlerts(me[0], me[1]).then(setAlerts).catch((e) => setError(e.message));
    api.layer('historical_events').then((fc) => setHistorical(fc.features)).catch(() => undefined);
  }, [me]);

  const level = alerts?.zone_level ?? 'normal';
  const recentHist = historical
    .map((f) => f.properties as { type: string; date: string; source: string })
    .slice(0, 3);

  return (
    <div className="app">
      <header className="topbar">
        <div className="stack" style={{ gap: 2 }}>
          <span className="brand">Quebrada Alerta</span>
          <span className="sub row" style={{ gap: 4 }}>
            <Icon name="pin" size={14} /> {user?.district ?? 'Piura'}
            {USE_MOCK && !gpsReal && ' · ubicación demo'}
          </span>
        </div>
        <button className="btn ghost small" onClick={() => setGpsReal((v) => !v)} aria-pressed={gpsReal}>
          {gpsReal ? 'GPS activo' : 'Usar mi GPS'}
        </button>
      </header>

      <div className="content">
        {alerts?.rain_warning.active && (
          <div className="notice dark row" style={{ alignItems: 'flex-start' }}>
            <Icon name="rain" size={22} color="#FDBA74" />
            <div className="stack" style={{ gap: 2 }}>
              <span className="strong" style={{ fontSize: 15 }}>Aviso de lluvia vigente</span>
              <span style={{ fontSize: 13, color: '#C9D2DE' }}>Fuente: {alerts.rain_warning.source}</span>
            </div>
          </div>
        )}

        <section className="card" aria-label="Alerta temprana de tu zona">
          <div className="between">
            <span className="eyebrow">Alerta temprana · tu zona</span>
            <LevelBadge level={level} />
          </div>
          <LevelScale level={level} />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{alerts?.reason ?? 'Cargando…'}</p>
          {error && <span className="error">{error}</span>}

          <MapView
            center={me}
            zoom={15}
            me={me}
            points={alerts?.points ?? []}
            historical={historical}
            onPointClick={(p) => navigate(`/vecino/punto/${p.id}`)}
          />
          <div className="legend">
            <span><span className="dot" style={{ background: '#1E4FA8' }} />Tú</span>
            <span><span className="dot" style={{ background: 'var(--lvl-alerta)' }} />Punto crítico</span>
            <span><span className="dot" style={{ background: 'var(--lvl-atencion)' }} />En observación</span>
            <span><span className="dot" style={{ background: 'var(--history)', opacity: 0.6 }} />Evento anterior</span>
          </div>

          {recentHist.length > 0 && (
            <div className="notice history">
              <strong>Historial de tu zona: {alerts?.historical_nearby ?? recentHist.length} eventos registrados</strong>
              <div className="small" style={{ marginTop: 2 }}>
                {recentHist.map((h) => `${HIST_LABEL[h.type] ?? h.type} ${h.date?.slice(0, 4)}`).join(' · ')} · fuente: {recentHist[0].source}
              </div>
            </div>
          )}
        </section>

        <Link className="btn primary block" style={{ minHeight: 60, fontSize: 17 }} to="/vecino/foto">
          <Icon name="camera" size={22} stroke={2.2} /> Subir foto de quebrada o río
        </Link>
        <span className="small muted center" style={{ marginTop: -4, display: 'block', textAlign: 'center' }}>
          Aunque todo se vea normal: tus fotos ayudan a detectar cambios a tiempo
        </span>

        {alerts?.nearest_shelter && (
          <div className="card row">
            <Icon name="shelter" size={22} color="var(--info)" />
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="strong" style={{ fontSize: 14 }}>Refugio más cercano</span>
              <span className="small muted">{alerts.nearest_shelter.name} · {km(alerts.nearest_shelter.distance_m)}</span>
            </div>
          </div>
        )}

        <span className="eyebrow">Quebradas y ríos cerca de ti</span>
        {(alerts?.points ?? []).map((p) => (
          <Link key={p.id} to={`/vecino/punto/${p.id}`} className="card row" style={{ textDecoration: 'none', color: 'inherit', padding: 12 }}>
            <span className="dot" style={{ background: `var(--lvl-${p.level})`, width: 12, height: 12, borderRadius: 6 }} />
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="strong" style={{ fontSize: 14 }}>{p.name}</span>
              <span className="small muted">{km(p.distance_m)}{p.is_official_critical ? ' · zona crítica oficial' : ''}</span>
            </div>
            <LevelBadge level={p.level} />
          </Link>
        ))}
      </div>
      <VecinoNav />
    </div>
  );
}
