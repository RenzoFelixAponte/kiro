// Backend simulado para la demo. Responde con la MISMA forma que el contrato,
// así las pantallas no cambian al conectar el backend real.
// Todos los datos son de ejemplo (zona piloto Castilla, Piura).
import type {
  AccessRoute,
  Broadcast,
  BroadcastInput,
  BrigadeCase,
  CreatePhotoInput,
  Feature,
  FeatureCollection,
  Level,
  Photo,
  PointDetail,
  RankingItem,
  Role,
  User,
} from './types';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export function levelFromScore(score: number): Level {
  if (score >= 85) return 'emergencia';
  if (score >= 60) return 'alerta';
  if (score >= 30) return 'atencion';
  return 'normal';
}

interface MockPoint extends PointDetail {
  base: number; // puntaje sin fotos
}

const now = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const points: MockPoint[] = [
  {
    id: 'pc_014', code: 'PC-014', name: 'Quebrada PC-014', type: 'quebrada', district: 'Castilla',
    lat: -5.1932, lon: -80.6101, is_official_critical: true, base: 62, photos_last_hour: 3,
    score: 92, level: 'emergencia', followers: 18, updated_at: minutesAgo(12),
    score_breakdown: { official_critical: 25, historical: 15, rain: 15, photos: 30, households: 15 },
  },
  {
    id: 'pc_007', code: 'PC-007', name: 'Quebrada PC-007', type: 'quebrada', district: 'Chulucanas',
    lat: -5.0925, lon: -80.1625, is_official_critical: true, base: 64, photos_last_hour: 2,
    score: 84, level: 'alerta', followers: 9, updated_at: minutesAgo(25),
    score_breakdown: { official_critical: 25, historical: 15, rain: 15, photos: 20, households: 9 },
  },
  {
    id: 'pc_022', code: 'PC-022', name: 'Cauce PC-022', type: 'cauce', district: 'Castilla',
    lat: -5.2005, lon: -80.615, is_official_critical: false, base: 45, photos_last_hour: 1,
    score: 55, level: 'atencion', followers: 4, updated_at: minutesAgo(60),
    score_breakdown: { official_critical: 0, historical: 15, rain: 15, photos: 10, households: 15 },
  },
  {
    id: 'pc_031', code: 'PC-031', name: 'Canal PC-031', type: 'cauce', district: 'Castilla',
    lat: -5.189, lon: -80.618, is_official_critical: false, base: 28, photos_last_hour: 1,
    score: 38, level: 'atencion', followers: 3, updated_at: minutesAgo(90),
    score_breakdown: { official_critical: 0, historical: 0, rain: 15, photos: 10, households: 13 },
  },
  {
    id: 'rio_piura', code: 'RP-01', name: 'Río Piura · puente de referencia', type: 'rio', district: 'Piura',
    lat: -5.198, lon: -80.629, is_official_critical: false, base: 15, photos_last_hour: 0,
    score: 15, level: 'normal', followers: 22, updated_at: minutesAgo(120),
    score_breakdown: { official_critical: 0, historical: 0, rain: 15, photos: 0, households: 0 },
  },
];

const photos: Photo[] = [
  { id: 'f_0141', point_id: 'pc_014', image_url: '', target: 'quebrada', signal: 'barro', taken_at: minutesAgo(12), verified: true },
  { id: 'f_0139', point_id: 'pc_014', image_url: '', target: 'quebrada', signal: 'nivel', taken_at: minutesAgo(34), verified: false },
  { id: 'f_0137', point_id: 'pc_014', image_url: '', target: 'quebrada', signal: 'barro', taken_at: minutesAgo(48), verified: false },
  { id: 'f_0120', point_id: 'pc_014', image_url: '', target: 'quebrada', signal: 'normal', taken_at: minutesAgo(260), verified: false },
  { id: 'f_0118', point_id: 'rio_piura', image_url: '', target: 'rio', signal: 'normal', taken_at: minutesAgo(120), verified: false },
];

const historical: Feature[] = [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.6095, -5.1925] }, properties: { id: 'he_001', type: 'huaico', date: '2017-03-15', severity: 'alta', families_affected: null, source: '[fuente de ejemplo]', description: 'Activación de quebrada (dato de ejemplo)' } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.6125, -5.1955] }, properties: { id: 'he_002', type: 'inundacion', date: '2023-03-10', severity: 'media', families_affected: null, source: '[fuente de ejemplo]', description: 'Inundación de calles (dato de ejemplo)' } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.6275, -5.1985] }, properties: { id: 'he_003', type: 'desborde', date: '2017-03-27', severity: 'alta', families_affected: null, source: '[fuente de ejemplo]', description: 'Desborde de río (dato de ejemplo)' } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-80.1640, -5.0930] }, properties: { id: 'he_004', type: 'huaico', date: '2017-02-20', severity: 'alta', families_affected: null, source: '[fuente de ejemplo]', description: 'Huaico (dato de ejemplo)' } },
];

const households: Feature[] = Array.from({ length: 14 }, (_, i) => ({
  type: 'Feature' as const,
  geometry: { type: 'Point' as const, coordinates: [-80.6120 + (i % 5) * 0.0011, -5.1942 - Math.floor(i / 5) * 0.0009] as [number, number] },
  properties: { id: `hh_${i}`, families: 1 + (i % 3) },
}));

const brigadeBase: [number, number] = [-5.2045, -80.6225]; // [lat, lon]

const cases: BrigadeCase[] = [
  {
    assignment_id: 'as_01', title: 'Agua con barro en quebrada', status: 'asignado', reports: 3,
    reasons: ['3 fotos de alerta', 'Zona crítica oficial', 'Aviso de lluvia', 'Viviendas expuestas'],
    photos: ['', '', ''], created_at: minutesAgo(20), distance_m: 1200,
    point: { id: 'pc_014', code: 'PC-014', name: 'Quebrada PC-014', type: 'quebrada', level: 'emergencia', lat: -5.1932, lon: -80.6101 },
  },
  {
    assignment_id: 'as_02', title: 'Grietas en muro junto al cauce', status: 'asignado', reports: 1,
    reasons: ['Grietas', 'Historial cercano'], photos: [''], created_at: minutesAgo(60), distance_m: 2800,
    point: { id: 'pc_022', code: 'PC-022', name: 'Cauce PC-022', type: 'cauce', level: 'atencion', lat: -5.2005, lon: -80.615 },
  },
  {
    assignment_id: 'as_03', title: 'Cauce obstruido con desmonte', status: 'asignado', reports: 1,
    reasons: ['Prevención: limpieza'], photos: [''], created_at: minutesAgo(1300), distance_m: 900,
    point: { id: 'pc_031', code: 'PC-031', name: 'Canal PC-031', type: 'cauce', level: 'atencion', lat: -5.189, lon: -80.618 },
  },
];

let mockUser: User = { id: 'u_demo', phone: '', role: null, status: 'nuevo' };
const broadcasts = new Map<string, Broadcast>();

const fail = (code: string, message: string): never => {
  const e = new Error(message) as Error & { code: string; status: number };
  e.code = code;
  e.status = 400;
  throw e;
};

const summary = (p: MockPoint) => ({
  id: p.id, code: p.code, name: p.name, type: p.type, level: p.level, lat: p.lat, lon: p.lon,
  score: p.score, is_official_critical: p.is_official_critical,
});

const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

const levelRank: Record<Level, number> = { normal: 0, atencion: 1, alerta: 2, emergencia: 3 };

export async function mockRequest<T>(method: string, fullPath: string, body?: unknown): Promise<T> {
  await delay();
  const [path, query = ''] = fullPath.split('?');
  const q = new URLSearchParams(query);
  const b = (body ?? {}) as Record<string, unknown>;
  let m: RegExpMatchArray | null;
  const res = (x: unknown) => x as T;

  // ---------- Auth ----------
  if (method === 'POST' && path === '/auth/otp/request') {
    const phone = String(b.phone ?? '');
    if (!/^\+519\d{8}$/.test(phone)) fail('invalid_phone', 'Número inválido. Usa +51 y 9 dígitos que empiecen en 9.');
    mockUser = { ...mockUser, phone };
    return res({ request_id: 'otp_demo', expires_in: 300 });
  }
  if (method === 'POST' && path === '/auth/otp/verify') {
    if (b.code !== '123456') fail('otp_invalid', 'Código incorrecto. En modo demo usa 123456.');
    return res({ access_token: 'demo_access', refresh_token: 'demo_refresh', user: mockUser });
  }
  if (method === 'POST' && path === '/me/profile') {
    mockUser = {
      ...mockUser,
      role: b.role as Role,
      name: String(b.name ?? ''),
      district: String(b.district ?? ''),
      lat: b.lat as number | undefined,
      lon: b.lon as number | undefined,
      status: 'activo', // en producción brigadista/autoridad quedan en pendiente_aprobacion
    };
    return res(mockUser);
  }
  if (method === 'GET' && path === '/me') return res(mockUser);

  // ---------- Vecino ----------
  if (method === 'GET' && path === '/alerts/nearby') {
    const lat = Number(q.get('lat'));
    const lon = Number(q.get('lon'));
    const radius = Number(q.get('radius_m') ?? 2000);
    const near = points
      .map((p) => ({ ...summary(p), distance_m: distance(lat, lon, p.lat, p.lon) }))
      .filter((p) => p.distance_m <= Math.max(radius, 3000))
      .sort((a, b2) => a.distance_m - b2.distance_m);
    const list = near.length ? near : points.map((p) => ({ ...summary(p), distance_m: distance(lat, lon, p.lat, p.lon) })).slice(0, 3);
    const worst = list.reduce<Level>((acc, p) => (levelRank[p.level] > levelRank[acc] ? p.level : acc), 'normal');
    return res({
      zone_level: worst,
      reason:
        worst === 'normal'
          ? 'Sin cambios en las fotos recientes de tu zona.'
          : 'Las fotos de vecinos muestran agua con barro en la quebrada y hay aviso de lluvia.',
      rain_warning: { active: true, source: 'SENAMHI', until: new Date(Date.now() + 12 * 3600000).toISOString() },
      points: list,
      historical_nearby: historical.length - 1,
      nearest_shelter: { name: '[Nombre del refugio]', distance_m: 600, lat: -5.1995, lon: -80.6205 },
    });
  }

  if (method === 'GET' && (m = path.match(/^\/layers\/(\w+)$/))) {
    const layer = m[1];
    const fc = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });
    if (layer === 'historical_events') return res(fc(historical));
    if (layer === 'households') return res(fc(households));
    if (layer === 'monitoring_points' || layer === 'critical_zones') {
      const src = layer === 'critical_zones' ? points.filter((p) => p.is_official_critical) : points;
      return res(fc(src.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: summary(p) }))));
    }
    if (layer === 'heatmap') {
      const feats: Feature[] = photos
        .filter((f) => f.signal !== 'normal')
        .map((f) => {
          const p = points.find((x) => x.id === f.point_id)!;
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon + (Math.random() - 0.5) * 0.002, p.lat + (Math.random() - 0.5) * 0.002] }, properties: { weight: 1 } };
        });
      points.filter((p) => p.level === 'emergencia').forEach((p) =>
        feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { weight: 3 } }),
      );
      return res(fc(feats));
    }
    return res(fc([]));
  }

  if (method === 'GET' && (m = path.match(/^\/points\/([\w-]+)$/))) {
    const p = points.find((x) => x.id === m![1]);
    if (!p) fail('not_found', 'Punto no encontrado');
    const { base: _base, ...detail } = p!;
    return res(detail);
  }
  if (method === 'GET' && (m = path.match(/^\/points\/([\w-]+)\/photos$/))) {
    return res(photos.filter((f) => f.point_id === m![1]).sort((a, b2) => b2.taken_at.localeCompare(a.taken_at)));
  }
  if (method === 'POST' && (m = path.match(/^\/points\/([\w-]+)\/follow$/))) {
    const p = points.find((x) => x.id === m![1]);
    if (p) p.followers += 1;
    return res(undefined);
  }
  if (method === 'POST' && path === '/photos/upload-url') {
    const id = `f_${Math.floor(Math.random() * 9000 + 1000)}`;
    return res({ upload_url: `https://storage.example/upload/${id}`, image_url: `https://storage.example/${id}.jpg` });
  }
  if (method === 'POST' && path === '/photos') {
    const input = b as unknown as CreatePhotoInput;
    const p = points.find((x) => x.id === input.point_id);
    if (!p) fail('not_found', 'Punto no encontrado');
    const id = `f_${Math.floor(Math.random() * 9000 + 1000)}`;
    photos.push({ id, point_id: p!.id, image_url: input.image_url, target: input.target, signal: input.signal, comment: input.comment, taken_at: input.taken_at || now(), verified: false });
    if (input.signal !== 'normal') {
      p!.photos_last_hour += 1;
      p!.score_breakdown.photos = Math.min(30, p!.photos_last_hour * 10);
      p!.score = Math.min(100, p!.base + p!.score_breakdown.photos);
      p!.level = levelFromScore(p!.score);
      p!.updated_at = now();
    }
    return res({
      photo_id: id,
      code: `QA-${id.slice(2)}`,
      point: { id: p!.id, level: p!.level, score: p!.score, photos_last_hour: p!.photos_last_hour },
      brigade_notified: levelRank[p!.level] >= levelRank.alerta,
    });
  }

  // ---------- Brigadista ----------
  if (method === 'GET' && path === '/brigade/cases') {
    const status = q.get('status');
    return res(cases.filter((c) => !status || c.status === status));
  }
  if (method === 'PATCH' && (m = path.match(/^\/assignments\/([\w-]+)$/))) {
    const c = cases.find((x) => x.assignment_id === m![1]);
    if (c) c.status = b.status as BrigadeCase['status'];
    return res(undefined);
  }
  if (method === 'POST' && (m = path.match(/^\/assignments\/([\w-]+)\/verification$/))) {
    const c = cases.find((x) => x.assignment_id === m![1]);
    if (c && b.signal_confirmed) {
      const p = points.find((x) => x.id === c.point.id);
      if (p && levelRank[p.level] < levelRank.alerta) p.level = 'alerta';
      c.status = 'en_campo';
    }
    return res(undefined);
  }
  if (method === 'GET' && (m = path.match(/^\/points\/([\w-]+)\/impact$/))) {
    const r = Number(q.get('radius_m') ?? 300);
    const factor = r / 300;
    return res({ radius_m: r, families: Math.round(46 * factor), people: Math.round(180 * factor), households: Math.round(38 * factor) });
  }
  if (method === 'GET' && (m = path.match(/^\/points\/([\w-]+)\/routes$/))) {
    const p = points.find((x) => x.id === m![1]);
    if (!p) fail('not_found', 'Punto no encontrado');
    const route: AccessRoute = {
      id: 'rt_01', distance_m: 4200, eta_min: 12, via: '[vía de referencia]',
      warnings: ['Evita el cruce del río: reportado no transitable'],
      path: [brigadeBase, [-5.2010, -80.6190], [-5.1985, -80.6150], [-5.1960, -80.6125], [p!.lat, p!.lon]],
    };
    return res([route]);
  }

  // ---------- Autoridad ----------
  if (method === 'GET' && path === '/dashboard/summary') {
    return res({
      photos_today: photos.length,
      points_alert: points.filter((p) => levelRank[p.level] >= levelRank.alerta).length,
      points_monitored: points.length,
      brigades_active: 3,
      avg_response_min: null, // se calcula con datos reales
    });
  }
  if (method === 'GET' && path === '/dashboard/ranking') {
    const district = q.get('district');
    const unassigned = q.get('unassigned') === 'true';
    const items: RankingItem[] = [...points]
      .sort((a, b2) => b2.score - a.score)
      .map((p, i) => {
        const hasBrigade = cases.some((c) => c.point.id === p.id && c.status !== 'asignado') || p.id === 'pc_014';
        return {
          rank: i + 1,
          point: summary(p),
          score: p.score,
          why: [p.is_official_critical ? 'Zona crítica' : null, p.photos_last_hour ? `${p.photos_last_hour} fotos de alerta` : null, p.score_breakdown.rain ? 'lluvia' : null]
            .filter(Boolean)
            .join(' + '),
          status: hasBrigade ? 'Brigada en camino' : 'Sin brigada',
          has_brigade: hasBrigade,
        };
      })
      .filter((r) => (!district || points.find((p) => p.id === r.point.id)?.district === district) && (!unassigned || !r.has_brigade));
    return res(items);
  }
  if (method === 'POST' && path === '/assignments') {
    return res({ assignment_id: `as_${Math.floor(Math.random() * 900 + 100)}` });
  }
  if (method === 'POST' && path === '/incidents') {
    const r = Number(b.radius_m ?? 1000);
    const factor = r / 1000;
    const p = points.find((x) => x.id === b.point_id);
    if (p) p.level = 'emergencia';
    return res({ incident_id: 'inc_09', families_impacted: Math.round(46 * factor), people_estimated: Math.round(180 * factor) });
  }
  if (method === 'POST' && (m = path.match(/^\/incidents\/([\w-]+)\/broadcast\/preview$/))) {
    const input = b as unknown as BroadcastInput;
    const counts = { vecinos_radio: 312, seguidores: 18, brigadistas: 24, autoridades: 8 };
    const recipients: Record<string, number> = {};
    let total = 0;
    input.audience.forEach((a) => {
      recipients[a] = counts[a];
      total += counts[a];
    });
    return res({ recipients: { ...recipients, total }, segments_per_sms: input.message.length > 160 ? Math.ceil(input.message.length / 153) : 1 });
  }
  if (method === 'POST' && (m = path.match(/^\/incidents\/([\w-]+)\/broadcast$/))) {
    if (!b.confirm) fail('confirm_required', 'Falta confirmar el envío');
    const id = 'bc_03';
    broadcasts.set(id, { broadcast_id: id, status: 'enviando', sent: 0, failed: 0 });
    setTimeout(() => broadcasts.set(id, { broadcast_id: id, status: 'completado', sent: 358, failed: 4 }), 2500);
    return res({ broadcast_id: id, status: 'enviando' });
  }
  if (method === 'GET' && (m = path.match(/^\/broadcasts\/([\w-]+)$/))) {
    return res(broadcasts.get(m[1]) ?? { broadcast_id: m[1], status: 'completado', sent: 0, failed: 0 });
  }

  fail('mock_not_found', `Mock sin ruta para ${method} ${path}`);
  return res(undefined);
}
