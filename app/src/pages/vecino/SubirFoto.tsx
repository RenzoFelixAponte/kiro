import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { uploadFile } from '../../api/client';
import type { CreatePhotoResponse, PointSummary, PointType, Signal } from '../../api/types';
import { PIURA_CENTER } from '../../components/MapView';
import { Icon, LEVEL_LABEL, SIGNAL_LABEL, km } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';

const TARGETS: { id: PointType; label: string }[] = [
  { id: 'quebrada', label: 'Quebrada' },
  { id: 'rio', label: 'Río' },
  { id: 'cauce', label: 'Cauce o canal' },
];

const SIGNALS: { id: Signal; level: 'CONTROL' | 'ALERTA' | 'ATENCIÓN' }[] = [
  { id: 'normal', level: 'CONTROL' },
  { id: 'barro', level: 'ALERTA' },
  { id: 'nivel', level: 'ALERTA' },
  { id: 'ruido', level: 'ALERTA' },
  { id: 'caudal', level: 'ALERTA' },
  { id: 'obstruido', level: 'ATENCIÓN' },
];
const TAG_COLOR = { CONTROL: '#33404F', ALERTA: '#B42318', 'ATENCIÓN': '#9A5B00' };

export default function SubirFoto() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [target, setTarget] = useState<PointType>('quebrada');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [points, setPoints] = useState<PointSummary[]>([]);
  const [pointId, setPointId] = useState(params.get('punto') ?? '');
  const [signal, setSignal] = useState<Signal>('normal');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreatePhotoResponse | null>(null);
  const [pos, setPos] = useState<[number, number]>(user?.lat && user?.lon ? [user.lat, user.lon] : PIURA_CENTER);
  const [locMode, setLocMode] = useState<'gps' | 'calle'>('gps');
  const [calle, setCalle] = useState('');
  const [locMsg, setLocMsg] = useState('');

  const usarGps = () => {
    setLocMode('gps');
    if (!navigator.geolocation) { setLocMsg('Tu navegador no comparte la ubicación. Escribe la calle.'); setLocMode('calle'); return; }
    setLocMsg('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos([p.coords.latitude, p.coords.longitude]); setLocMsg('Usando tu ubicación actual.'); },
      () => { setLocMsg('No pude obtener tu GPS. Revisa el permiso o escribe la calle.'); setLocMode('calle'); },
      { timeout: 8000 },
    );
  };

  const buscarCalle = async () => {
    setLocMsg('Buscando la calle…');
    try {
      const r = await api.geocode(calle.trim());
      setPos([r.lat, r.lon]);
      setLocMsg(`Ubicación: ${r.direccion}`);
    } catch (e) {
      setLocMsg((e as Error).message);
    }
  };

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setPos([p.coords.latitude, p.coords.longitude]), () => undefined, { timeout: 5000 });
  }, []);

  useEffect(() => {
    api.nearbyAlerts(pos[0], pos[1], 3000).then((a) => {
      setPoints(a.points);
      if (!pointId && a.points[0]) setPointId(a.points[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      let imageUrl = '';
      if (file) {
        const up = await api.photoUploadUrl(file.type || 'image/jpeg');
        await uploadFile(up.upload_url, file);
        imageUrl = up.image_url;
      }
      const r = await api.createPhoto({
        point_id: pointId,
        image_url: imageUrl,
        target,
        signal,
        comment: comment || undefined,
        lat: pos[0],
        lon: pos[1],
        taken_at: new Date().toISOString(),
      });
      setResult(r);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const point = points.find((p) => p.id === pointId);

  return (
    <div className="app">
      <header className="topbar" style={{ justifyContent: 'flex-start' }}>
        <button className="btn link" aria-label="Volver" onClick={() => (step === 2 ? setStep(1) : navigate(-1))}><Icon name="back" size={22} /></button>
        <h1 className="title" style={{ fontSize: 20 }}>Subir foto</h1>
      </header>
      <div className="progress" aria-hidden="true">
        <span className="on" />
        <span className={step >= 2 ? 'on' : ''} />
        <span className={step >= 3 ? 'on' : ''} />
      </div>

      {step === 1 && (
        <>
          <div className="content">
            <div className="stack" style={{ gap: 4 }}>
              <h2 style={{ fontSize: 19 }}>¿Qué vas a fotografiar?</h2>
              <span className="muted" style={{ fontSize: 14 }}>Toma la foto desde un lugar seguro y, si puedes, siempre desde el mismo punto.</span>
            </div>
            <div className="grid3">
              {TARGETS.map((t) => (
                <button key={t.id} className="seg" aria-pressed={target === t.id} onClick={() => setTarget(t.id)}>{t.label}</button>
              ))}
            </div>

            <label className="choice center" style={{ height: 200, border: preview ? 'none' : '2px dashed #A9B3C1', justifyContent: 'center', padding: preview ? 0 : 12, overflow: 'hidden' }}>
              {preview ? (
                <img src={preview} alt="Foto seleccionada" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
              ) : (
                <>
                  <Icon name="camera" size={36} color="var(--info)" stroke={1.8} />
                  <span className="strong">Tomar o subir foto</span>
                  <span className="small muted">Cámara o galería · se guarda con fecha y hora</span>
                </>
              )}
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>

            <div className="field">
              ¿Dónde está la quebrada?
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className={`btn ${locMode === 'gps' ? 'primary' : 'ghost'}`} onClick={usarGps}>Mi GPS actual</button>
                <button type="button" className={`btn ${locMode === 'calle' ? 'primary' : 'ghost'}`} onClick={() => setLocMode('calle')}>Escribir la calle</button>
              </div>
              {locMode === 'calle' && (
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <input className="input" placeholder="Ej.: Av. Grau, Castilla" value={calle} onChange={(e) => setCalle(e.target.value)} />
                  <button type="button" className="btn ghost" onClick={buscarCalle} disabled={calle.trim().length < 3}>Buscar</button>
                </div>
              )}
              {locMsg && <span className="small muted">{locMsg}</span>}
            </div>

            <label className="field">
              Punto de vigilancia
              <select className="input" value={pointId} onChange={(e) => setPointId(e.target.value)}>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {km(p.distance_m)}</option>
                ))}
              </select>
            </label>

            <div className="notice warn">Nunca te acerques al cauce para tomar la foto. Si el agua ya está entrando a las casas, aléjate y llama al 115.</div>
          </div>
          <div className="footer-actions">
            <button className="btn primary block" disabled={!pointId} onClick={() => setStep(2)}>Continuar</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="content">
            <div className="row">
              <div className="photo-ph alert" style={{ width: 64, height: 64, flexShrink: 0 }}>
                {preview ? <img src={preview} alt="" /> : '[foto]'}
              </div>
              <div className="stack" style={{ gap: 4 }}>
                <h2 style={{ fontSize: 19 }}>¿Qué notas en la foto?</h2>
                <span className="small muted">{TARGETS.find((t) => t.id === target)?.label} · {point?.code}</span>
              </div>
            </div>
            <div className="grid2">
              {SIGNALS.map((s) => (
                <button key={s.id} className="choice" style={{ minHeight: 96 }} aria-pressed={signal === s.id} onClick={() => setSignal(s.id)}>
                  <span className="small strong" style={{ color: TAG_COLOR[s.level], letterSpacing: 0.4 }}>{s.level}</span>
                  <span className="strong" style={{ fontSize: 15, lineHeight: 1.3 }}>{SIGNAL_LABEL[s.id]}</span>
                </button>
              ))}
            </div>
            <label className="field">
              Comentario (opcional)
              <textarea className="input" rows={2} placeholder="Ej.: se escucha ruido de piedras desde arriba" value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            {error && <span className="error">{error}</span>}
          </div>
          <div className="footer-actions">
            <button className="btn ghost" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn primary" style={{ flex: 1 }} disabled={busy} onClick={submit}>{busy ? 'Enviando…' : 'Enviar foto'}</button>
          </div>
        </>
      )}

      {step === 3 && result && (
        <div className="content center" style={{ justifyContent: 'center', gap: 16 }}>
          <span style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={36} color="var(--info)" stroke={2.4} />
          </span>
          {signal === 'normal' ? (
            <>
              <h2 className="title" style={{ fontSize: 24 }}>Foto de control guardada</h2>
              <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.5 }}>Gracias. Esta foto queda como referencia de cómo se ve el punto en calma: si la próxima muestra cambios, se detectan antes.</p>
            </>
          ) : (
            <>
              <h2 className="title" style={{ fontSize: 24 }}>Alerta recibida</h2>
              <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
                Código <strong>{result.code}</strong>. El punto tiene {result.point.photos_last_hour} fotos de alerta en la última hora y está en nivel{' '}
                <strong>{LEVEL_LABEL[result.point.level]}</strong>.
                {result.brigade_notified && ' La brigada del sector ya fue notificada.'}
              </p>
            </>
          )}
          <Link className="btn dark block" to={`/vecino/punto/${result.point.id}`}>Ver fotos de este punto</Link>
          <button className="btn link" onClick={() => { setStep(1); onFile(null); setSignal('normal'); setComment(''); }}>Subir otra foto</button>
        </div>
      )}
    </div>
  );
}
