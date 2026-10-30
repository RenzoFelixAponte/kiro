import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Level } from '../api/types';

export const LEVEL_LABEL: Record<Level, string> = {
  normal: 'Normal',
  atencion: 'Atención',
  alerta: 'Alerta',
  emergencia: 'Emergencia',
};

export const LEVEL_COLOR: Record<Level, string> = {
  normal: 'var(--lvl-normal)',
  atencion: 'var(--lvl-atencion)',
  alerta: 'var(--lvl-alerta)',
  emergencia: 'var(--lvl-emergencia)',
};

export function LevelBadge({ level }: { level: Level }) {
  const dark = level === 'atencion' || level === 'normal';
  return (
    <span className="badge" style={{ background: LEVEL_COLOR[level], color: dark ? '#0F1B2D' : '#fff' }}>
      {LEVEL_LABEL[level].toUpperCase()}
    </span>
  );
}

export function LevelScale({ level }: { level: Level }) {
  const levels: Level[] = ['normal', 'atencion', 'alerta', 'emergencia'];
  return (
    <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 4 }}>
      {levels.map((l) => (
        <div key={l} className="stack" style={{ gap: 4 }}>
          <span style={{ height: l === level ? 10 : 6, marginTop: l === level ? -2 : 0, borderRadius: 3, background: LEVEL_COLOR[l] }} />
          <span className="small" style={{ fontWeight: l === level ? 700 : 400, color: l === level ? 'var(--ink)' : 'var(--muted)' }}>
            {LEVEL_LABEL[l]}
          </span>
        </div>
      ))}
    </div>
  );
}

const paths: Record<string, ReactNode> = {
  back: <path d="M15 5l-7 7 7 7" />,
  pin: (<><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  camera: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  home: <path d="M3 11l9-7 9 7v9H3z" />,
  map: (<><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>),
  plus: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>),
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  rain: (<><path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4 4 0 0 1 0 8" /><path d="M9 20l1-2M13 20l1-2M17 20l1-2" /></>),
  check: <path d="M5 12l5 5 9-10" />,
  nav: <path d="M3 11l18-8-8 18-2-8z" />,
  warn: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  shelter: (<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>),
  logout: (<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>),
};

export function Icon({ name, size = 20, color = 'currentColor', stroke = 2 }: { name: keyof typeof paths | string; size?: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function VecinoNav() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <nav className="bottomnav" aria-label="Navegación principal">
      <NavLink to="/vecino" end className={cls}><Icon name="home" size={22} />Inicio</NavLink>
      <NavLink to="/vecino/punto/pc_014" className={cls}><Icon name="map" size={22} />Vigilancia</NavLink>
      <NavLink to="/vecino/foto" className={cls}><Icon name="plus" size={22} />Subir foto</NavLink>
      <NavLink to="/perfil" className={cls}><Icon name="bell" size={22} />Perfil</NavLink>
    </nav>
  );
}

export function PhotoBox({ alert, label, height = 64, src }: { alert?: boolean; label?: string; height?: number; src?: string }) {
  return (
    <div className={`photo-ph${alert ? ' alert' : ''}`} style={{ height }}>
      {src ? <img src={src} alt={label ?? 'Foto del punto'} /> : <span>{label ?? '[foto]'}</span>}
    </div>
  );
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};

export const km = (m?: number) => (m === undefined ? '' : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

export const SIGNAL_LABEL: Record<string, string> = {
  normal: 'Todo normal (foto de control)',
  barro: 'Agua turbia o con barro',
  nivel: 'Subió el nivel del agua',
  ruido: 'Ruido fuerte de piedras',
  caudal: 'El agua dejó de bajar de golpe',
  obstruido: 'Cauce con basura o desmonte',
};
