// Un función por endpoint del contrato. Las pantallas solo llaman a "api.*".
import { request } from './client';
import type {
  AccessRoute,
  AssignmentStatus,
  Broadcast,
  BroadcastInput,
  BroadcastPreview,
  BrigadeCase,
  CreatePhotoInput,
  CreatePhotoResponse,
  DashboardSummary,
  FeatureCollection,
  Impact,
  Incident,
  IncidentInput,
  LayerName,
  NearbyAlerts,
  OtpRequestResponse,
  OtpVerifyResponse,
  Photo,
  PointDetail,
  ProfileInput,
  RankingItem,
  UploadUrlResponse,
  User,
  VerificationInput,
} from './types';

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return p ? `?${p}` : '';
};

export const PIURA_BBOX = '-81.4,-6.4,-79.2,-4.0';

export const api = {
  // Auth
  requestOtp: (phone: string) => request<OtpRequestResponse>('POST', '/auth/otp/request', { phone }),
  verifyOtp: (request_id: string, code: string) =>
    request<OtpVerifyResponse>('POST', '/auth/otp/verify', { request_id, code }),
  completeProfile: (input: ProfileInput) => request<User>('POST', '/me/profile', input),
  me: () => request<User>('GET', '/me'),

  // Vecino
  nearbyAlerts: (lat: number, lon: number, radius_m = 2000) =>
    request<NearbyAlerts>('GET', `/alerts/nearby${qs({ lat, lon, radius_m })}`),
  layer: <P = Record<string, unknown>>(layer: LayerName, bbox = PIURA_BBOX) =>
    request<FeatureCollection<P>>('GET', `/layers/${layer}${qs({ bbox })}`),
  point: (id: string) => request<PointDetail>('GET', `/points/${id}`),
  pointPhotos: (id: string, limit = 20) => request<Photo[]>('GET', `/points/${id}/photos${qs({ limit })}`),
  followPoint: (id: string) => request<void>('POST', `/points/${id}/follow`),
  photoUploadUrl: (content_type: string) =>
    request<UploadUrlResponse>('POST', '/photos/upload-url', { content_type }),
  createPhoto: (input: CreatePhotoInput) => request<CreatePhotoResponse>('POST', '/photos', input),
  geocode: (q: string) => request<{ lat: number; lon: number; direccion: string }>('GET', `/geocode${qs({ q })}`),

  // Brigadista
  brigadeCases: (status?: AssignmentStatus) => request<BrigadeCase[]>('GET', `/brigade/cases${qs({ status })}`),
  updateAssignment: (id: string, status: AssignmentStatus) =>
    request<void>('PATCH', `/assignments/${id}`, { status }),
  verifyAssignment: (id: string, input: VerificationInput) =>
    request<void>('POST', `/assignments/${id}/verification`, input),
  impact: (pointId: string, radius_m = 300) =>
    request<Impact>('GET', `/points/${pointId}/impact${qs({ radius_m })}`),
  routes: (pointId: string, from_lat: number, from_lon: number) =>
    request<AccessRoute[]>('GET', `/points/${pointId}/routes${qs({ from_lat, from_lon })}`),

  // Autoridad
  dashboardSummary: () => request<DashboardSummary>('GET', '/dashboard/summary'),
  ranking: (district?: string, unassigned?: boolean) =>
    request<RankingItem[]>('GET', `/dashboard/ranking${qs({ district, unassigned })}`),
  assign: (point_id: string, brigade_id: string) =>
    request<{ assignment_id: string }>('POST', '/assignments', { point_id, brigade_id }),
  createIncident: (input: IncidentInput) => request<Incident>('POST', '/incidents', input),
  broadcastPreview: (incidentId: string, input: BroadcastInput) =>
    request<BroadcastPreview>('POST', `/incidents/${incidentId}/broadcast/preview`, input),
  broadcast: (incidentId: string, input: BroadcastInput) =>
    request<Broadcast>('POST', `/incidents/${incidentId}/broadcast`, { ...input, confirm: true }),
  broadcastStatus: (id: string) => request<Broadcast>('GET', `/broadcasts/${id}`),
};
