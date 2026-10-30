import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { Audience, Broadcast, BroadcastPreview, HistoricalType, Incident, PointDetail } from '../../api/types';
import { Icon, LEVEL_LABEL } from '../../components/ui';

const TYPES: { id: HistoricalType; label: string }[] = [
  { id: 'huaico', label: 'Huaico' },
  { id: 'desborde', label: 'Desborde' },
  { id: 'inundacion', label: 'Inundación' },
];
const RADII = [
  { m: 500, label: '500 m' },
  { m: 1000, label: '1 km' },
  { m: 2000, label: '2 km' },
];
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'vecinos_radio', label: 'Vecinos dentro del radio' },
  { id: 'seguidores', label: 'Seguidores del punto' },
  { id: 'brigadistas', label: 'Brigadistas del distrito' },
  { id: 'autoridades', label: 'Autoridades y COER' },
];

// Quita tildes para que el SMS quepa en 160 caracteres (codificación GSM-7)
const noAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Siniestro() {
  const { pointId = '' } = useParams();
  const navigate = useNavigate();
  const [point, setPoint] = useState<PointDetail | null>(null);
  const [type, setType] = useState<HistoricalType>('huaico');
  const [radius, setRadius] = useState(1000);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [audience, setAudience] = useState<Audience[]>(['vecinos_radio', 'seguidores', 'brigadistas', 'autoridades']);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.point(pointId).then(setPoint).catch((e) => setError(e.message)); }, [pointId]);

  useEffect(() => {
    if (!point) return;
    const t = TYPES.find((x) => x.id === type)!.label.toUpperCase();
    setMessage(noAccents(`QUEBRADA ALERTA: EMERGENCIA por ${t.toLowerCase()} en ${point.name}, ${point.district}. Alejate del cauce y sube a zona alta. Refugio: [nombre]. Info: [link]`));
  }, [point, type]);

  // Previsualización de destinatarios cada vez que cambia la audiencia o el mensaje
  useEffect(() => {
    if (!incident || audience.length === 0) { setPreview(null); return; }
    api.broadcastPreview(incident.incident_id, { audience, message }).then(setPreview);
  }, [incident, audience, message]);

  // Seguimiento del envío
  useEffect(() => {
    if (!broadcast || broadcast.status !== 'enviando') return;
    const t = setInterval(() => api.broadcastStatus(broadcast.broadcast_id).then(setBroadcast), 1500);
    return () => clearInterval(t);
  }, [broadcast]);

  const activate = async () => {
    setBusy(true);
    setError('');
    try {
      setIncident(await api.createIncident({ point_id: pointId, type, level: 'emergencia', radius_m: radius }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!incident) return;
    setBusy(true);
    try {
      setBroadcast(await api.broadcast(incident.incident_id, { audience, message }));
      setConfirming(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAudience = (a: Audience) =>
    setAudience((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));

  return (
    <div className="app">
      <header className="topbar emergency" style={{ justifyContent: 'flex-start' }}>
        <button className="btn link" style={{ color: '#fff' }} aria-label="Volver" onClick={() => navigate(-1)}><Icon name="back" size={22} /></button>
        <div className="stack" style={{ gap: 1 }}>
          <span className="eyebrow">Autoridad · COER Piura</span>
          <h1 className="title" style={{ fontSize: 20 }}>Activar siniestro</h1>
        </div>
      </header>

      {error && <div className="notice danger" style={{ margin: '12px 16px 0' }}>{error}</div>}

      {!incident && (
        <>
          <div className="content" style={{ paddingTop: 16 }}>
            <div className="card" style={{ gap: 4 }}>
              <span className="eyebrow">Punto</span>
              <span className="strong" style={{ fontSize: 16 }}>{point?.name} · {point?.district}</span>
              {point && <span className="small muted">Nivel {LEVEL_LABEL[point.level]} · puntaje {point.score}</span>}
            </div>
            <span className="strong" style={{ fontSize: 14 }}>Tipo de evento</span>
            <div className="grid3">
              {TYPES.map((t) => <button key={t.id} className="seg danger" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
            </div>
            <span className="strong" style={{ fontSize: 14 }}>Radio de afectación</span>
            <div className="grid3">
              {RADII.map((r) => <button key={r.m} className="seg danger" aria-pressed={radius === r.m} onClick={() => setRadius(r.m)}>{r.label}</button>)}
            </div>
          </div>
          <div className="footer-actions">
            <button className="btn danger block" disabled={busy || !point} onClick={activate}>{busy ? 'Activando…' : 'Activar y preparar SMS'}</button>
          </div>
        </>
      )}

      {incident && !broadcast && (
        <>
          <div className="content" style={{ paddingTop: 16 }}>
            <div className="notice danger">Siniestro activo: {TYPES.find((t) => t.id === type)?.label} · {point?.code} · radio {RADII.find((r) => r.m === radius)?.label}</div>
            <div className="grid2">
              <div className="stat"><span className="num">{incident.families_impacted ?? '—'}</span><span className="lbl">familias en el radio</span></div>
              <div className="stat"><span className="num">{incident.people_estimated ?? '—'}</span><span className="lbl">personas estimadas</span></div>
            </div>
            <span className="strong" style={{ fontSize: 14 }}>¿A quiénes enviar el SMS?</span>
            {AUDIENCES.map((a) => (
              <label key={a.id} className="card check" style={{ padding: 12, flexDirection: 'row' }}>
                <input type="checkbox" checked={audience.includes(a.id)} onChange={() => toggleAudience(a.id)} style={{ accentColor: 'var(--emergency)' }} />
                <span style={{ flex: 1 }}>{a.label}</span>
                <span className="strong">{preview?.recipients[a.id] ?? '—'}</span>
              </label>
            ))}
            <label className="field">
              Mensaje
              <textarea className="input" rows={4} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} value={message} onChange={(e) => setMessage(noAccents(e.target.value))} />
            </label>
            <span className="small" style={{ color: message.length > 160 ? '#B42318' : 'var(--muted)' }}>
              {message.length}/160 caracteres · {preview?.segments_per_sms ?? 1} SMS por persona
            </span>
          </div>
          <div className="footer-actions">
            <button className="btn danger block" disabled={!preview || audience.length === 0} onClick={() => setConfirming(true)}>Revisar y enviar</button>
          </div>
        </>
      )}

      {broadcast && (
        <div className="content" style={{ paddingTop: 16 }}>
          <div className="card">
            <span className="strong" style={{ fontSize: 18 }}>{broadcast.status === 'completado' ? 'Alerta enviada' : 'Enviando alerta…'}</span>
            <div style={{ height: 8, borderRadius: 4, background: '#E9EDF1', overflow: 'hidden' }}>
              <div style={{ height: 8, width: broadcast.status === 'completado' ? '100%' : '35%', background: 'var(--ok)', transition: 'width .6s' }} />
            </div>
            <div className="between small">
              <span>Entregados: {broadcast.sent ?? 0}</span>
              <span>Fallidos: {broadcast.failed ?? 0}</span>
            </div>
          </div>
          <span className="eyebrow">Así lo recibe un vecino</span>
          <div style={{ background: 'var(--ink)', borderRadius: 22, padding: 16 }}>
            <div style={{ background: '#2A3A52', color: '#fff', borderRadius: '4px 16px 16px 16px', padding: 12, fontSize: 14, lineHeight: 1.45 }}>{message}</div>
          </div>
          <Link className="btn dark block" to="/autoridad">Volver al tablero</Link>
        </div>
      )}

      {confirming && (
        <div className="overlay" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Confirmar envío">
            <span className="strong" style={{ fontSize: 19 }}>¿Enviar alerta de emergencia?</span>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              Se enviará un SMS a <strong>{preview?.recipients.total} personas</strong> registradas. Esta acción no se puede deshacer y queda registrada con tu nombre.
            </span>
            <button className="btn danger block" disabled={busy} onClick={send}>{busy ? 'Enviando…' : 'Sí, enviar ahora'}</button>
            <button className="btn ghost block" onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
