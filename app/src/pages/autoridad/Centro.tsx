import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { DashboardSummary, Feature, Photo, RankingItem } from '../../api/types';
import MapView, { PIURA_CENTER } from '../../components/MapView';
import { LEVEL_COLOR, PhotoBox, SIGNAL_LABEL, ago } from '../../components/ui';

// Vista de escritorio para COER y municipalidad. Fluida: también funciona en celular.
export default function Centro() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [historical, setHistorical] = useState<Feature[]>([]);
  const [heat, setHeat] = useState<Feature[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    api.dashboardSummary().then(setSummary);
    api.ranking().then(async (r) => {
      setRanking(r);
      // Galería: últimas fotos de los 3 puntos con mayor puntaje
      const lists = await Promise.all(r.slice(0, 3).map((x) => api.pointPhotos(x.point.id, 5)));
      setPhotos(lists.flat().sort((a, b) => b.taken_at.localeCompare(a.taken_at)).slice(0, 8));
    });
    api.layer('historical_events').then((fc) => setHistorical(fc.features));
    api.layer('heatmap').then((fc) => setHeat(fc.features));
  }, []);

  return (
    <div style={{ minHeight: '100%', background: 'var(--ground)' }}>
      <header className="web-header">
        <div className="inner">
          <span className="brand">Quebrada Alerta</span>
          <nav aria-label="Secciones" className="row wrap" style={{ flex: 1, gap: 4 }}>
            <a href="#mapa" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14, padding: '10px 12px', borderRadius: 8, background: '#1C2B40' }}>Mapa de alerta</a>
            <a href="#fotos" style={{ color: '#C9D2DE', textDecoration: 'none', fontWeight: 600, fontSize: 14, padding: '10px 12px' }}>Fotos ciudadanas</a>
            <Link to="/autoridad" style={{ color: '#C9D2DE', textDecoration: 'none', fontWeight: 600, fontSize: 14, padding: '10px 12px' }}>Vista móvil</Link>
          </nav>
        </div>
      </header>

      <main className="web-main">
        <div className="between wrap" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 4 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Centro de alerta temprana</h1>
            <span className="muted" style={{ fontSize: 14 }}>Fotos de vecinos + zonas críticas oficiales + historial + aviso de lluvia</span>
          </div>
          {ranking[0] && (
            <Link className="btn danger" to={`/autoridad/siniestro/${ranking[0].point.id}`}>Activar siniestro</Link>
          )}
        </div>

        <div className="kpis">
          <div className="stat"><span className="lbl">Fotos recibidas hoy</span><span className="num">{summary?.photos_today ?? '—'}</span></div>
          <div className="stat"><span className="lbl">Puntos en Alerta o más</span><span className="num" style={{ color: '#B42318' }}>{summary?.points_alert ?? '—'}</span></div>
          <div className="stat"><span className="lbl">Puntos vigilados</span><span className="num">{summary?.points_monitored ?? '—'}</span></div>
          <div className="stat"><span className="lbl">Tiempo foto → brigada</span><span className="num">{summary?.avg_response_min != null ? `${summary.avg_response_min} min` : '—'}</span></div>
        </div>

        <div id="mapa" className="split">
          <section className="card main" aria-label="Mapa">
            <span className="strong" style={{ fontSize: 17 }}>Mapa de puntos de vigilancia · Piura</span>
            <MapView className="map web" center={PIURA_CENTER} zoom={14} points={ranking.map((r) => r.point)} historical={historical} heat={heat} />
            <div className="legend">
              <span><span className="dot" style={{ background: 'var(--lvl-emergencia)' }} />Emergencia</span>
              <span><span className="dot" style={{ background: 'var(--lvl-alerta)' }} />Alerta</span>
              <span><span className="dot" style={{ background: 'var(--lvl-atencion)' }} />Atención</span>
              <span><span className="dot" style={{ background: 'var(--lvl-normal)' }} />Normal</span>
              <span><span className="dot" style={{ background: 'var(--history)', opacity: 0.6 }} />Evento anterior</span>
            </div>
          </section>
          <section className="card side" aria-label="Prioridad de atención">
            <span className="strong" style={{ fontSize: 17 }}>Prioridad de atención</span>
            {ranking.map((r) => (
              <div key={r.point.id} className="stack" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                <div className="row">
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: LEVEL_COLOR[r.point.level], color: r.point.level === 'atencion' || r.point.level === 'normal' ? '#0F1B2D' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{r.rank}</span>
                  <div className="stack" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                    <span className="strong" style={{ fontSize: 14 }}>{r.point.name}</span>
                    <span className="small muted">{r.why}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>{r.score}</span>
                </div>
                <span className="small strong" style={{ color: r.has_brigade ? 'var(--muted)' : '#B42318' }}>{r.status}</span>
              </div>
            ))}
          </section>
        </div>

        <section id="fotos" className="card" aria-label="Fotos ciudadanas">
          <div className="between wrap">
            <span className="strong" style={{ fontSize: 17 }}>Últimas fotos de quebradas y ríos</span>
            <span className="small muted">Cada foto se compara con las anteriores del mismo punto</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {photos.map((f) => (
              <div key={f.id} style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                <PhotoBox height={120} alert={f.signal !== 'normal'} src={f.image_url || undefined} />
                <div className="stack" style={{ padding: 10, gap: 3 }}>
                  <span className="small strong" style={{ color: f.signal === 'normal' ? 'var(--ink-2)' : '#B42318' }}>{f.signal === 'normal' ? 'CONTROL' : 'ALERTA'}</span>
                  <span className="strong" style={{ fontSize: 14 }}>{SIGNAL_LABEL[f.signal]}</span>
                  <span className="small muted">{f.point_id.toUpperCase()} · {ago(f.taken_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
