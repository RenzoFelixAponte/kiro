import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { DashboardSummary, RankingItem } from '../../api/types';
import { Icon, LEVEL_COLOR } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

export default function Tablero() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [filter, setFilter] = useState<{ district?: string; unassigned?: boolean }>({});
  const [msg, setMsg] = useState('');

  useEffect(() => { api.dashboardSummary().then(setSummary); }, []);
  useEffect(() => { api.ranking(filter.district, filter.unassigned).then(setRanking); }, [filter]);

  const assign = async (r: RankingItem) => {
    await api.assign(r.point.id, 'br_castilla_2');
    setMsg(`Brigada asignada a ${r.point.code}.`);
  };

  const top = ranking[0];

  return (
    <div className="app">
      <header className="topbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
        <span className="eyebrow">COER / Municipalidad · {user?.district}</span>
        <div className="between">
          <h1 className="title" style={{ fontSize: 22 }}>Puntos críticos priorizados</h1>
          <Link className="btn ghost small" to="/perfil">Perfil</Link>
        </div>
      </header>

      <div className="content">
        <div className="grid2">
          <div className="stat"><span className="lbl">Fotos hoy</span><span className="num">{summary?.photos_today ?? '—'}</span></div>
          <div className="stat"><span className="lbl">En Alerta o más</span><span className="num" style={{ color: '#B42318' }}>{summary?.points_alert ?? '—'}</span></div>
          <div className="stat"><span className="lbl">Brigadas activas</span><span className="num">{summary?.brigades_active ?? '—'}</span></div>
          <div className="stat"><span className="lbl">Foto → brigada</span><span className="num">{summary?.avg_response_min != null ? `${summary.avg_response_min} min` : '—'}</span></div>
        </div>

        <div className="row" style={{ gap: 8, overflowX: 'auto' }}>
          <button className="chip" aria-pressed={!filter.district && !filter.unassigned} onClick={() => setFilter({})}>Todos</button>
          <button className="chip" aria-pressed={!!filter.unassigned} onClick={() => setFilter({ ...filter, unassigned: !filter.unassigned })}>Sin brigada</button>
          <button className="chip" aria-pressed={filter.district === 'Castilla'} onClick={() => setFilter({ ...filter, district: filter.district === 'Castilla' ? undefined : 'Castilla' })}>Castilla</button>
          <button className="chip" aria-pressed={filter.district === 'Chulucanas'} onClick={() => setFilter({ ...filter, district: filter.district === 'Chulucanas' ? undefined : 'Chulucanas' })}>Chulucanas</button>
        </div>

        {msg && <div className="notice info">{msg}</div>}

        {ranking.map((r) => (
          <div key={r.point.id} className="card" style={{ padding: '12px 14px', gap: 8 }}>
            <div className="row">
              <span style={{ width: 34, height: 34, borderRadius: 10, background: LEVEL_COLOR[r.point.level], color: r.point.level === 'atencion' || r.point.level === 'normal' ? '#0F1B2D' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{r.rank}</span>
              <div className="stack" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                <span className="strong" style={{ fontSize: 15 }}>{r.point.name}</span>
                <span className="small muted">{r.why}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{r.score}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#E9EDF1', overflow: 'hidden' }}>
              <div style={{ height: 6, width: `${r.score}%`, background: LEVEL_COLOR[r.point.level] }} />
            </div>
            <div className="between">
              <span className="small strong" style={{ color: r.has_brigade ? 'var(--muted)' : '#B42318' }}>{r.status}</span>
              <div className="row" style={{ gap: 6 }}>
                {!r.has_brigade && <button className="btn ghost small" onClick={() => assign(r)}>Asignar</button>}
                <Link className="btn ghost small" to={`/autoridad/siniestro/${r.point.id}`}>Siniestro</Link>
              </div>
            </div>
          </div>
        ))}

        {top && (
          <Link className="btn danger block" to={`/autoridad/siniestro/${top.point.id}`}>
            <Icon name="warn" size={18} /> Activar siniestro y enviar SMS
          </Link>
        )}

        <span className="eyebrow" style={{ marginTop: 4 }}>Más servicios</span>
        <div className="grid2">
          <Link className="choice" to="/autoridad/centro" style={{ textDecoration: 'none', minHeight: 72 }}><span className="strong" style={{ fontSize: 14 }}>Centro de alerta</span><span className="small muted">Vista de escritorio</span></Link>
          <button className="choice" style={{ minHeight: 72 }} disabled title="Fase 2"><span className="strong" style={{ fontSize: 14 }}>Aprobar cuentas</span><span className="small muted">Fase 2</span></button>
          <button className="choice" style={{ minHeight: 72 }} disabled title="Fase 2"><span className="strong" style={{ fontSize: 14 }}>Prevención</span><span className="small muted">Cauces a limpiar · fase 2</span></button>
          <button className="choice" style={{ minHeight: 72 }} disabled title="Fase 2"><span className="strong" style={{ fontSize: 14 }}>Exportar reporte</span><span className="small muted">COER e INDECI · fase 2</span></button>
        </div>
      </div>
    </div>
  );
}
