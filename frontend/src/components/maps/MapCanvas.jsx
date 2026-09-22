import React, { useMemo, useState, useEffect } from 'react';
import {
  Circle, CircleMarker, GeoJSON, LayersControl, MapContainer, TileLayer, Tooltip as LTooltip, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { cn, scoreColor } from '../../utils/cn';
import { Switch } from '../ui/Feedback';

const CHENNAI = [13.05, 80.2];

function MapViewController({ center, zoom }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && center[0] && center[1]) {
      map.setView(center, zoom || 12, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

/** Intensity → heat colour ramp (blue → emerald → amber → red). */
function heatColor(t) {
  if (t > 0.75) return '#EF4444';
  if (t > 0.5) return '#F59E0B';
  if (t > 0.28) return '#10B981';
  return '#2563EB';
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { onMapClick?.([e.latlng.lat, e.latlng.lng]); },
  });
  return null;
}

/**
 * Feature-cluster: transit points grouped per zone as counted bubbles.
 * Lightweight clustering without external plugins (keeps the bundle lean).
 */
function ClusterLayer({ points = [], zones = [], enabled }) {
  if (!enabled) {
    return points.map((p) => (
      <CircleMarker
        key={p.properties.id}
        center={[p.geometry.coordinates[1], p.geometry.coordinates[0]]}
        radius={5}
        pathOptions={{ color: modeColor(p.properties.mode), fillColor: modeColor(p.properties.mode), fillOpacity: 0.85, weight: 1.5, stroke: '#fff' }}
      >
        <LTooltip direction="top">{p.properties.name} · {p.properties.mode}{p.properties.daily_ridership ? ` · ${p.properties.daily_ridership} riders/day` : ''}</LTooltip>
      </CircleMarker>
    ));
  }

  const byZone = new Map();
  for (const p of points) {
    const [lng, lat] = p.geometry.coordinates;
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const arr = byZone.get(key) || [];
    arr.push(p);
    byZone.set(key, arr);
  }
  return [...byZone.entries()].map(([key, group]) => {
    const [lat, lng] = key.split(',').map(Number);
    return (
      <CircleMarker key={key} center={[lat, lng]} radius={12}
        pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563EB', fillOpacity: 0.85 }}
      >
        <LTooltip direction="top">{group.length} transit points</LTooltip>
        <span />
      </CircleMarker>
    );
  });
}

function modeColor(mode) {
  return {
    bus: '#2563EB', metro: '#8B5CF6', bike_share: '#10B981',
    ev_charger: '#F59E0B', parking: '#64748B', rail: '#0EA5E9', tram: '#EC4899', ferry: '#06B6D4',
  }[mode] || '#64748B';
}

function HeatLayer({ points = [] }) {
  return points.filter((p) => (p.intensity ?? 0) > 0).map((p, i) => (
    <Circle
      key={`${p.label || 'heat'}-${i}`}
      center={[p.lat, p.lng]}
      radius={350 + (p.intensity || 0) * 1400}
      pathOptions={{ stroke: false, fillColor: heatColor(p.intensity || 0), fillOpacity: 0.16 + (p.intensity || 0) * 0.22 }}
    >
      <LTooltip>{p.label} · intensity {(p.intensity ?? 0).toFixed(2)}</LTooltip>
    </Circle>
  ));
}

/**
 * MapCanvas — OpenStreetMap base with:
 * zones (GeoJSON), transit points (with clustering), routes, heatmaps,
 * radius search circle, polygon-selection (click vertices), scenario marker.
 */
export function MapCanvas({
  zones, points, routes, heatPoints, drawMode, onVertices, radiusKm, radiusCenter,
  scenarioMarker, onMapClick, scoreMode = 'composite', height = 520, className,
  center = CHENNAI, zoom = 12,
}) {
  const [cluster, setCluster] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showTransit, setShowTransit] = useState(true);
  const [showDensity, setShowDensity] = useState(true);
  const [vertices, setVertices] = useState([]);

  const handleMapClick = (latlng) => {
    if (drawMode === 'polygon') {
      setVertices((v) => {
        const next = [...v, latlng];
        onVertices?.(next);
        return next;
      });
    }
    onMapClick?.(latlng);
  };

  const zoneStyle = useMemo(() => (feature) => {
    const p = feature.properties || {};
    const score = p[`${scoreMode}_score`] ?? p.composite_score ?? 0.5;
    return {
      color: '#CBD5E1', weight: 1, fillColor: scoreColor(score), fillOpacity: showDensity ? 0.18 + score * 0.25 : 0.06,
    };
  }, [scoreMode, showDensity]);

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-border', className)} style={{ height }}>
      <MapContainer center={center || CHENNAI} zoom={zoom || 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <MapViewController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} />

        {zones?.features && showDensity && (
          <GeoJSON data={zones} style={zoneStyle} onEachFeature={(f, layer) => {
            const p = f.properties || {};
            layer.bindTooltip(`${p.name} (${p.code})`, { sticky: true });
          }} />
        )}

        {routes?.features && showTraffic && routes.features.map((r) => (
          <GeoJSON key={r.id || r.properties.code} data={r} style={() => ({
            color: r.properties.color || '#2563EB', weight: 4, opacity: 0.8,
          })} onEachFeature={(f, layer) => {
            layer.bindTooltip(`${f.properties.name} · ${f.properties.frequency_min} min headway · ${f.properties.distance_km} km`, { sticky: true });
          }} />
        ))}

        {showTransit && <ClusterLayer points={points?.features || []} enabled={cluster} />}

        {heatPoints && <HeatLayer points={heatPoints} />}

        {radiusCenter && radiusKm > 0 && (
          <Circle center={radiusCenter} radius={radiusKm * 1000}
            pathOptions={{ color: '#2563EB', weight: 2, dashArray: '6 4', fillOpacity: 0.06 }} />
        )}

        {vertices.length > 0 && (
          <>
            {vertices.map((v, i) => <CircleMarker key={i} center={v} radius={5} pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 1 }} />)}
            {vertices.length >= 2 && (
              <GeoJSON data={{ type: 'LineString', coordinates: vertices.map(([lat, lng]) => [lng, lat]) }}
                style={{ color: '#2563EB', weight: 2, dashArray: '4 4' }} />
            )}
          </>
        )}

        {scenarioMarker && (
          <CircleMarker center={scenarioMarker} radius={9}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#F59E0B', fillOpacity: 1 }} />
        )}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2 bg-white/95 backdrop-blur rounded-lg border border-border p-3 shadow-card text-xs min-w-[168px]">
        <p className="font-semibold text-text-primary text-[11px] uppercase tracking-wide">Layers</p>
        {[
          ['Traffic & routes', showTraffic, setShowTraffic],
          ['Population density', showDensity, setShowDensity],
          ['Transit points', showTransit, setShowTransit],
          ['Cluster points', cluster, setCluster],
        ].map(([label, val, set]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-text-secondary">
            <span>{label}</span>
            <Switch checked={val} onChange={set} label={label} />
          </div>
        ))}
        {drawMode === 'polygon' && (
          <div className="pt-1 border-t border-border text-text-secondary">
            <p>Polygon selection: click to add vertices ({vertices.length})</p>
            <button className="text-primary font-medium mt-1 hover:underline" onClick={() => { setVertices([]); onVertices?.([]); }}>
              Clear polygon
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-[500] flex gap-2 bg-white/95 backdrop-blur rounded-lg border border-border px-3 py-2 shadow-card">
        {[['bus', 'Bus'], ['metro', 'Metro'], ['bike_share', 'Bike'], ['ev_charger', 'EV'], ['parking', 'Park']].map(([m, label]) => (
          <span key={m} className="inline-flex items-center gap-1 text-[10px] text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: modeColor(m) }} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MiniMap({ center = CHENNAI, zoom = 11, children, height = 220, className }) {
  return (
    <div className={cn('rounded-xl overflow-hidden border border-border', className)} style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
