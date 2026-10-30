import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { AccessRoute, BrigadeCase, Feature, Impact } from '../../api/types';
import MapView from '../../components/MapView';
import { Icon, LevelBadge, ago, km } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

const BRIGADE_BASE: [number, number] = [-5.2045, -80.6225]; // en producción: GPS del brigadista
const rank = { normal: 0, atencion: 1, alerta: 2, emergencia: 3 };

export default function MapaOperativo() {
  const { user } = useAuth();
  const [cases, setCases] = useState<BrigadeCase[]>([]);
  const [selected, setSelected] = useState<BrigadeCase | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [route, setRoute] = useState<AccessRoute | null>(null);
  const [heat, setHeat] = useState<Feature[]>([]);
  const [households, setHouseholds] = useState<Feature[]>([]);
  const [historical, setHistorical] = useState<Feature[]>([]);
  const [layers, setLayers] = useState({ heat: true, routes: true, households: true, historical: false });

  useEffect(() => {
    api.brigadeCases().then((cs) => {
      const sorted = [...cs].sort((a, b) => rank[b.point.level] - rank[a.point.level]);
      setCases(sorted);
      setSelected(sorted[0] ?? null);
    });
    api.layer('heatmap').then((fc) => setHeat(fc.features));
    api.layer('households').then((fc) => setHouseholds(fc.features));
    api.layer('historical_events').then((fc) => setHistorical(fc.features));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.impact(selected.point.id, 300).then(setImpact);
    api.routes(selected.point.id, BRIGADE_BASE[0], BRIGADE_BASE[1]).then((rs) => setRoute(rs[0] ?? null));
  }, [selected]);

  const toggle = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const center: [number, number] = selected ? [selected.point.lat - 0.004, selected.point.lon - 0.003] : BRIGADE_BASE;

  return (
    <div className="app">
      <header className="topbar dark" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div className="between">
          <div className="stack" style={{ gap: 1 }}>
            <span className="eyebrow">Brigadista · {user?.district}</span>
            <h1 className="title">Mapa operativo</h1>
          </div>
          <Link to="/brigadista/casos" className="chip" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Casos {cases.length}</Link>
        </div>
        <div className="row" style={{ gap: 6, overflowX: 'auto' }}>
          <button className="chip" aria-pressed={layers.heat} onClick={() => toggle('heat')}>Mapa de calor</button>
          <button className="chip" aria-pressed={layers.routes} onClick={() => toggle('routes')}>Rutas</button>
          <button className="chip" aria-pressed={layers.households} onClick={() => toggle('households')}>Viviendas</button>
          <button className="chip" aria-pressed={layers.historical} onClick={() => toggle('historical')}>Historial</button>
        </div>
      </header>

      <MapView
        className="map tall"
        center={center}
        zoom={15}
        me={BRIGADE_BASE}
        points={cases.map((c) => c.point)}
        highlightPointId={selected?.point.id}
        heat={layers.heat ? heat : []}
        households={layers.households ? households : []}
        historical={layers.historical ? historical : []}
        route={layers.routes ? route?.path : undefined}
        onPointClick={(p) => setSelected(cases.find((c) => c.point.id === p.id) ?? null)}
      />

      {selected && (
        <div className="sheet">
          <span className="grab" />
          <div className="between" style={{ alignItems: 'flex-start' }}>
            <div className="stack" style={{ gap: 2 }}>
              <span className="strong" style={{ fontSize: 18 }}>{selected.point.name} activada</span>
              <span className="small muted">{selected.reports} reportes · {ago(selected.created_at)}</span>
            </div>
            <LevelBadge level={selected.point.level} />
          </div>
          <div className="grid3">
            <div className="stat" style={{ background: 'var(--ground)', border: 'none' }}><span className="num" style={{ fontSize: 24 }}>{impact?.families ?? '—'}</span><span className="lbl">familias impactadas</span></div>
            <div className="stat" style={{ background: 'var(--ground)', border: 'none' }}><span className="num" style={{ fontSize: 24 }}>{impact?.people ?? '—'}</span><span className="lbl">personas aprox.</span></div>
            <div className="stat" style={{ background: 'var(--ground)', border: 'none' }}><span className="num" style={{ fontSize: 24 }}>{impact?.households ?? '—'}</span><span className="lbl">viviendas en 300 m</span></div>
          </div>
          {route && (
            <div className="card" style={{ padding: 12, gap: 6 }}>
              <span className="eyebrow">Ruta de acceso</span>
              <span className="strong" style={{ fontSize: 15 }}>{km(route.distance_m)} · {route.eta_min} min por {route.via}</span>
              {route.warnings.map((w) => (
                <span key={w} className="row small" style={{ color: '#9A3412', alignItems: 'flex-start', gap: 6 }}><Icon name="warn" size={16} />{w}</span>
              ))}
            </div>
          )}
          <div className="row">
            <Link className="btn ghost" to="/brigadista/casos">Ver caso</Link>
            <a
              className="btn dark"
              style={{ flex: 1 }}
              href={`https://www.google.com/maps/dir/?api=1&destination=${selected.point.lat},${selected.point.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="nav" size={18} /> Iniciar ruta
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
