import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { Photo, PointDetail } from '../../api/types';
import { Icon, LevelBadge, PhotoBox, SIGNAL_LABEL, VecinoNav, ago, fmtTime } from '../../components/ui';

export default function Vigilancia() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [point, setPoint] = useState<PointDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.point(id).then(setPoint).catch((e) => setError(e.message));
    api.pointPhotos(id).then(setPhotos).catch(() => undefined);
  }, [id]);

  // Comparación: la foto de control más reciente vs. la última foto
  const latest = photos[0];
  const control = photos.find((p) => p.signal === 'normal' && p.id !== latest?.id);

  return (
    <div className="app">
      <header className="topbar" style={{ justifyContent: 'flex-start' }}>
        <button className="btn link" aria-label="Volver" onClick={() => navigate(-1)}><Icon name="back" size={22} /></button>
        <div className="stack" style={{ gap: 1 }}>
          <h1 className="title" style={{ fontSize: 20 }}>{point?.name ?? 'Punto de vigilancia'}</h1>
          {point && (
            <span className="sub">
              {point.district}{point.is_official_critical ? ' · zona crítica oficial' : ''} · {point.followers} vecinos lo siguen
            </span>
          )}
        </div>
      </header>

      <div className="content">
        {error && <span className="error">{error}</span>}
        {point && (
          <section className="card">
            <div className="between">
              <span className="eyebrow">Comparación de fotos</span>
              <LevelBadge level={point.level} />
            </div>
            <div className="grid2">
              <div className="stack" style={{ gap: 6 }}>
                <PhotoBox height={130} src={control?.image_url || undefined} label={control ? `[Control ${fmtTime(control.taken_at)}]` : '[Sin foto de control]'} />
                <span className="small muted">{control ? `${fmtTime(control.taken_at)} · ${SIGNAL_LABEL.normal}` : 'Falta una foto de control'}</span>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <PhotoBox height={130} alert={latest?.signal !== 'normal'} src={latest?.image_url || undefined} label={latest ? `[Última ${fmtTime(latest.taken_at)}]` : '[Sin fotos]'} />
                <span className="small muted">{latest ? `${fmtTime(latest.taken_at)} · ${SIGNAL_LABEL[latest.signal]}` : ''}</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
              {point.photos_last_hour > 0
                ? `${point.photos_last_hour} fotos de alerta en la última hora. Puntaje ${point.score}/100.`
                : 'Sin fotos de alerta en la última hora.'}
            </p>
            <div className="row wrap" style={{ gap: 6 }}>
              {point.score_breakdown.official_critical > 0 && <span className="tag">Zona crítica +{point.score_breakdown.official_critical}</span>}
              {point.score_breakdown.historical > 0 && <span className="tag">Historial +{point.score_breakdown.historical}</span>}
              {point.score_breakdown.rain > 0 && <span className="tag">Lluvia +{point.score_breakdown.rain}</span>}
              {point.score_breakdown.photos > 0 && <span className="tag">Fotos +{point.score_breakdown.photos}</span>}
              {point.score_breakdown.households > 0 && <span className="tag">Viviendas +{point.score_breakdown.households}</span>}
            </div>
          </section>
        )}

        <span className="eyebrow">Fotos recientes</span>
        {photos.map((f) => (
          <div key={f.id} className="card row" style={{ padding: 10 }}>
            <div style={{ width: 52, flexShrink: 0 }}><PhotoBox height={52} alert={f.signal !== 'normal'} src={f.image_url || undefined} label=" " /></div>
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="strong" style={{ fontSize: 14 }}>{SIGNAL_LABEL[f.signal]}</span>
              <span className="small muted">{ago(f.taken_at)}{f.verified ? ' · verificada' : ''}</span>
            </div>
            <span className="dot" style={{ background: f.signal === 'normal' ? 'var(--lvl-normal)' : '#B42318' }} />
          </div>
        ))}

        <div className="notice info">Consejo: toma las fotos siempre desde el mismo lugar (por ejemplo, el mismo poste o puente). Así la comparación es más clara.</div>

        <div className="row">
          <button className="btn ghost" aria-pressed={following} onClick={() => api.followPoint(id).then(() => setFollowing(true))}>
            {following ? 'Siguiendo' : 'Seguir punto'}
          </button>
          <Link className="btn primary" style={{ flex: 1 }} to={`/vecino/foto?punto=${id}`}>Subir nueva foto</Link>
        </div>
      </div>
      <VecinoNav />
    </div>
  );
}
