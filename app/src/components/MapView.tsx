import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, PointSummary } from '../api/types';
import { LEVEL_LABEL } from './ui';

// Leaflet necesita colores reales (no variables CSS) en los trazos SVG
const HEX: Record<string, string> = {
  normal: '#9FB4CC',
  atencion: '#F59E0B',
  alerta: '#C2410C',
  emergencia: '#6B0F0A',
};

export const PIURA_CENTER: [number, number] = [-5.1945, -80.62];

interface Props {
  center?: [number, number];
  zoom?: number;
  me?: [number, number] | null;
  points?: PointSummary[];
  historical?: Feature[];
  heat?: Feature[];
  households?: Feature[];
  route?: [number, number][];
  highlightPointId?: string;
  className?: string;
  onPointClick?: (p: PointSummary) => void;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const latlon = (f: Feature): [number, number] | null =>
  f.geometry.type === 'Point' ? [f.geometry.coordinates[1], f.geometry.coordinates[0]] : null;

const HIST_LABEL: Record<string, string> = { huaico: 'Huaico', desborde: 'Desborde', inundacion: 'Inundación' };

export default function MapView({
  center = PIURA_CENTER,
  zoom = 15,
  me,
  points = [],
  historical = [],
  heat = [],
  households = [],
  route,
  highlightPointId,
  className = 'map',
  onPointClick,
}: Props) {
  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <Recenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {heat.map((f, i) => {
          const ll = latlon(f);
          if (!ll) return null;
          const w = Number((f.properties as { weight?: number }).weight ?? 1);
          return <Circle key={`h${i}`} center={ll} radius={90 * w} pathOptions={{ stroke: false, fillColor: '#E8590C', fillOpacity: 0.18 }} />;
        })}

        {households.map((f, i) => {
          const ll = latlon(f);
          if (!ll) return null;
          return <CircleMarker key={`hh${i}`} center={ll} radius={4} pathOptions={{ color: '#4A5668', weight: 1, fillColor: '#6B7A8F', fillOpacity: 0.9 }} />;
        })}

        {historical.map((f, i) => {
          const ll = latlon(f);
          if (!ll) return null;
          const p = f.properties as { type?: string; date?: string; source?: string };
          return (
            <CircleMarker key={`he${i}`} center={ll} radius={7} pathOptions={{ color: '#5B3FA0', weight: 2, dashArray: '3 3', fillColor: '#5B3FA0', fillOpacity: 0.35 }}>
              <Tooltip>
                {HIST_LABEL[p.type ?? ''] ?? 'Evento'} · {p.date?.slice(0, 4)} · fuente: {p.source}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {route && route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#1E4FA8', weight: 5 }} />}

        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={p.id === highlightPointId ? 12 : 9}
            pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: HEX[p.level], fillOpacity: 1 }}
            eventHandlers={onPointClick ? { click: () => onPointClick(p) } : undefined}
          >
            <Tooltip>
              {p.name} · {LEVEL_LABEL[p.level]}
            </Tooltip>
          </CircleMarker>
        ))}

        {me && (
          <CircleMarker center={me} radius={8} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1E4FA8', fillOpacity: 1 }}>
            <Tooltip>Tú</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

/** Pide la ubicación GPS del navegador; si el usuario la niega, usa el valor de respaldo. */
export function getPosition(fallback: [number, number]) {
  return new Promise<[number, number]>((resolve) => {
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout: 6000 },
    );
  });
}
