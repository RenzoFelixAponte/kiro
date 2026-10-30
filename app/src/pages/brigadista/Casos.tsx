import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { AssignmentStatus, BrigadeCase } from '../../api/types';
import { LevelBadge, PhotoBox, ago, km } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

const TABS: { id: AssignmentStatus; label: string }[] = [
  { id: 'asignado', label: 'Asignados' },
  { id: 'en_campo', label: 'En campo' },
  { id: 'cerrado', label: 'Cerrados' },
];

export default function Casos() {
  const { user } = useAuth();
  const [tab, setTab] = useState<AssignmentStatus>('asignado');
  const [cases, setCases] = useState<BrigadeCase[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [check, setCheck] = useState({ signal_confirmed: true, families_alerted: false, needs_support: false });
  const [msg, setMsg] = useState('');

  const load = () => api.brigadeCases(tab).then((cs) => { setCases(cs); setOpen(cs[0]?.assignment_id ?? null); });
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async (c: BrigadeCase) => {
    await api.verifyAssignment(c.assignment_id, check);
    setMsg(`Caso ${c.point.code} confirmado. La autoridad ya puede alertar al sector.`);
    load();
  };

  return (
    <div className="app">
      <header className="topbar dark" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div className="between">
          <div className="stack" style={{ gap: 1 }}>
            <span className="eyebrow">Brigada · {user?.district}</span>
            <h1 className="title">Casos</h1>
          </div>
          <Link to="/brigadista" className="chip" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Mapa</Link>
        </div>
        <div className="grid3" style={{ background: '#1C2B40', padding: 4, borderRadius: 12, gap: 6 }}>
          {TABS.map((t) => (
            <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)} style={{ borderRadius: 9 }}>{t.label}</button>
          ))}
        </div>
      </header>

      <div className="content" style={{ paddingTop: 14 }}>
        {msg && <div className="notice info">{msg}</div>}
        {cases.length === 0 && <p className="muted">No hay casos en esta pestaña.</p>}
        {cases.map((c) => {
          const isOpen = open === c.assignment_id;
          return (
            <div key={c.assignment_id} className={`card${isOpen ? ' strong' : ''}`}>
              <div className="between">
                <LevelBadge level={c.point.level} />
                <span className="small muted">{ago(c.created_at)}</span>
              </div>
              <div className="stack" style={{ gap: 4 }}>
                <span className="strong" style={{ fontSize: 17 }}>{c.title}</span>
                <span className="small muted">{c.point.code} · {km(c.distance_m)} · {c.reports} reporte(s)</span>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>{c.reasons.map((r) => <span key={r} className="tag">{r}</span>)}</div>
              {isOpen ? (
                <>
                  <div className="grid3">{c.photos.map((p, i) => <PhotoBox key={i} src={p || undefined} label={`[Foto ${i + 1}]`} />)}</div>
                  <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                    <span className="eyebrow">Verificación en campo</span>
                    <label className="check"><input type="checkbox" checked={check.signal_confirmed} onChange={(e) => setCheck({ ...check, signal_confirmed: e.target.checked })} />Señal confirmada</label>
                    <label className="check"><input type="checkbox" checked={check.families_alerted} onChange={(e) => setCheck({ ...check, families_alerted: e.target.checked })} />Familias alertadas o evacuadas</label>
                    <label className="check"><input type="checkbox" checked={check.needs_support} onChange={(e) => setCheck({ ...check, needs_support: e.target.checked })} />Requiere maquinaria o apoyo</label>
                  </div>
                  <div className="row">
                    <button className="btn ghost small" onClick={() => api.updateAssignment(c.assignment_id, 'en_camino').then(() => setMsg('Estado: en camino'))}>En camino</button>
                    <button className="btn dark" style={{ flex: 1, minHeight: 48, fontSize: 14 }} onClick={() => confirm(c)}>Confirmar y reportar</button>
                  </div>
                </>
              ) : (
                <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(c.assignment_id)}>Ver caso</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
