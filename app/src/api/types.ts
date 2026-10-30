// Tipos del contrato de API. Deben coincidir con la "Guía de integración frontend ↔ backend".
// Si el backend cambia un campo, se cambia aquí y TypeScript marca cada pantalla afectada.

export type Role = 'vecino' | 'brigadista' | 'autoridad';
export type UserStatus = 'nuevo' | 'activo' | 'pendiente_aprobacion' | 'bloqueado';
export type Level = 'normal' | 'atencion' | 'alerta' | 'emergencia';
export type PointType = 'quebrada' | 'rio' | 'cauce';
export type Signal = 'normal' | 'barro' | 'nivel' | 'ruido' | 'caudal' | 'obstruido';
export type HistoricalType = 'huaico' | 'desborde' | 'inundacion';
export type AssignmentStatus = 'asignado' | 'en_camino' | 'en_campo' | 'cerrado';
export type Audience = 'vecinos_radio' | 'seguidores' | 'brigadistas' | 'autoridades';

export interface User {
  id: string;
  phone: string;
  name?: string;
  role: Role | null;
  status: UserStatus;
  district?: string;
  lat?: number;
  lon?: number;
}

// ---- Auth ----
export interface OtpRequestResponse {
  request_id: string;
  expires_in: number;
}
export interface OtpVerifyResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
export interface ProfileInput {
  role: Role;
  name: string;
  district: string;
  lat?: number;
  lon?: number;
  sms_alerts: boolean;
}

// ---- Vecino ----
export interface PointSummary {
  id: string;
  code: string;
  name: string;
  type: PointType;
  level: Level;
  lat: number;
  lon: number;
  distance_m?: number;
  score?: number;
  is_official_critical?: boolean;
}

export interface NearbyAlerts {
  zone_level: Level;
  reason: string;
  rain_warning: { active: boolean; source: string; until?: string };
  points: PointSummary[];
  historical_nearby: number;
  nearest_shelter?: { name: string; distance_m: number; lat: number; lon: number };
}

export interface ScoreBreakdown {
  official_critical: number;
  historical: number;
  rain: number;
  photos: number;
  households: number;
}

export interface PointDetail extends PointSummary {
  district: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  photos_last_hour: number;
  followers: number;
  updated_at: string;
}

export interface Photo {
  id: string;
  point_id: string;
  image_url: string;
  target: PointType;
  signal: Signal;
  comment?: string;
  taken_at: string;
  verified: boolean;
}

export interface UploadUrlResponse {
  upload_url: string; // URL firmada para PUT de la imagen
  image_url: string; // URL pública final para registrar la foto
}

export interface CreatePhotoInput {
  point_id: string;
  image_url: string;
  target: PointType;
  signal: Signal;
  comment?: string;
  lat?: number;
  lon?: number;
  taken_at: string;
}

export interface CreatePhotoResponse {
  photo_id: string;
  code: string;
  point: { id: string; level: Level; score: number; photos_last_hour: number };
  brigade_notified: boolean;
}

// ---- Brigadista ----
export interface BrigadeCase {
  assignment_id: string;
  point: PointSummary;
  title: string;
  status: AssignmentStatus;
  reports: number;
  reasons: string[];
  photos: string[];
  created_at: string;
  distance_m?: number;
}

export interface VerificationInput {
  signal_confirmed: boolean;
  families_alerted: boolean;
  needs_support: boolean;
  notes?: string;
}

export interface Impact {
  radius_m: number;
  families: number | null;
  people: number | null;
  households: number | null;
}

export interface AccessRoute {
  id: string;
  distance_m: number;
  eta_min: number;
  via: string;
  warnings: string[];
  path: [number, number][]; // [lat, lon]
}

// ---- Autoridad ----
export interface DashboardSummary {
  photos_today: number;
  points_alert: number;
  points_monitored: number;
  brigades_active: number;
  avg_response_min: number | null;
}

export interface RankingItem {
  rank: number;
  point: PointSummary;
  score: number;
  why: string;
  status: string;
  has_brigade: boolean;
}

export interface IncidentInput {
  point_id: string;
  type: HistoricalType;
  level: Level;
  radius_m: number;
}

export interface Incident {
  incident_id: string;
  families_impacted: number | null;
  people_estimated: number | null;
}

export interface BroadcastInput {
  audience: Audience[];
  message: string;
  confirm?: boolean;
}

export interface BroadcastPreview {
  recipients: Partial<Record<Audience, number>> & { total: number };
  segments_per_sms: number;
}

export interface Broadcast {
  broadcast_id: string;
  status: 'enviando' | 'completado' | 'error';
  sent?: number;
  failed?: number;
}

// ---- Capas GeoJSON ----
export type LayerName =
  | 'historical_events'
  | 'critical_zones'
  | 'monitoring_points'
  | 'heatmap'
  | 'households'
  | 'access_routes';

export interface Feature<P = Record<string, unknown>> {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: [number, number][] };
  properties: P;
}

export interface FeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: Feature<P>[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
