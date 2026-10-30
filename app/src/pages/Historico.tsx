import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { request } from '../api/client';
import { PIURA_CENTER } from '../components/MapView';

interface DistritoCuenta { distrito: string; eventos: number }
interface PuntoHistorico { lat: number; lon: number; distrito: string; codigo_peligro: string; estudio: string }

/** Encuadra el mapa en los puntos del distrito elegido. */
function Encuadre({ puntos }: { puntos: PuntoHistorico[] }) {
  const mapa = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    const limites = L.latLngBounds(puntos.map((p) => [p.lat, p.lon] as [number, number]));
    mapa.fitBounds(limites, { padding: [20, 20], maxZoom: 12 });
  }, [mapa, puntos]);
  return null;
}

/** Búsqueda histórica: eligen un distrito de Piura y ven sus eventos en el mapa y cuántos hay por distrito. */
export default function Historico() {
  const [distritos, setDistritos] = useState<DistritoCuenta[]>([]);
  const [elegido, setElegido] = useState<string>('');
  const [puntos, setPuntos] = useState<PuntoHistorico[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    request<DistritoCuenta[]>('GET', '/historico/distritos')
      .then((d) => { setDistritos(d); setElegido(d[0]?.distrito ?? ''); })
      .catch(() => setError('No pude cargar los distritos. ¿Está encendido el servidor?'));
  }, []);

  useEffect(() => {
    if (!elegido) return;
    setCargando(true);
    request<{ features: { geometry: { coordinates: [number, number] }; properties: Omit<PuntoHistorico, 'lat' | 'lon'> }[] }>(
      'GET', `/historico?distrito=${encodeURIComponent(elegido)}`,
    )
      .then((fc) => setPuntos(fc.features.map((f) => ({
        lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], ...f.properties,
      }))))
      .catch(() => setError('No pude cargar los eventos de ese distrito.'))
      .finally(() => setCargando(false));
  }, [elegido]);

  const maximo = useMemo(() => Math.max(1, ...distritos.map((d) => d.eventos)), [distritos]);
  const top = distritos.slice(0, 12);
  const totalElegido = distritos.find((d) => d.distrito === elegido)?.eventos ?? 0;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">Eventos históricos · Piura</h1>
        <Link className="btn ghost" to="/perfil">Volver</Link>
      </header>
      <div className="content">
        {error && <div className="card" style={{ color: '#B3261E' }}>{error}</div>}

        <div className="card">
          <label className="eyebrow" htmlFor="distrito">Distrito</label>
          <select id="distrito" value={elegido} onChange={(e) => setElegido(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 16 }}>
            {distritos.map((d) => <option key={d.distrito} value={d.distrito}>{d.distrito} ({d.eventos})</option>)}
          </select>
          <span className="muted" style={{ marginTop: 6, display: 'block' }}>
            {elegido}: {totalElegido} eventos registrados en el inventario de INGEMMET.
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MapContainer center={PIURA_CENTER} zoom={9} style={{ height: 360, width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Encuadre puntos={puntos} />
            {puntos.map((p, i) => (
              <CircleMarker key={i} center={[p.lat, p.lon]} radius={5} pathOptions={{ color: '#B3261E', fillOpacity: 0.7 }}>
                <Popup>
                  <b>{p.distrito}</b><br />
                  Código de peligro: {p.codigo_peligro || 'sin dato'}<br />
                  <small>{p.estudio || 'Estudio sin nombre'}</small>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        {cargando && <span className="muted">Cargando eventos…</span>}

        <div className="card">
          <span className="eyebrow">Distritos con más eventos</span>
          {top.map((d) => (
            <button
              key={d.distrito}
              onClick={() => setElegido(d.distrito)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '6px 0', cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{d.distrito}</span><b>{d.eventos}</b>
              </span>
              <span style={{ display: 'block', height: 10, borderRadius: 5, background: d.distrito === elegido ? '#B3261E' : '#d9b8b5', width: `${(d.eventos / maximo) * 100}%` }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
