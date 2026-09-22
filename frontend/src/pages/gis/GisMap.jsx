import React, { useState } from 'react';
import { useGisLayers, useHeatmap, useCities } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { MapCanvas } from '../../components/maps/MapCanvas';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { Tabs } from '../../components/ui/Tabs';
import { Select, Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { get } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

export default function GisMap() {
  const [selectedCity, setSelectedCity] = useState('chennai');
  const { data: citiesData } = useCities();
  const { data, isLoading, error, refetch } = useGisLayers({ city: selectedCity });
  const [heatLayer, setHeatLayer] = useState('ridership');
  const { data: heat } = useHeatmap(heatLayer, { city: selectedCity });
  const [drawMode, setDrawMode] = useState('none');
  const [vertices, setVertices] = useState([]);
  const [radiusKm, setRadiusKm] = useState(2);
  const [radiusCenter, setRadiusCenter] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const toast = useToast();

  const cities = citiesData?.data || [
    { slug: 'chennai', city_name: 'Chennai', center: [13.05, 80.20], zoom: 12 },
    { slug: 'coimbatore', city_name: 'Coimbatore', center: [11.0168, 76.9558], zoom: 12 },
    { slug: 'bengaluru', city_name: 'Bengaluru', center: [12.9716, 77.5946], zoom: 12 },
  ];
  const activeCity = cities.find((c) => c.slug === selectedCity || c.city_name?.toLowerCase() === selectedCity?.toLowerCase()) || cities[0];

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const runSearch = async (e) => {
    e.preventDefault();
    try {
      const params = { city: selectedCity };
      if (search) params.q = search;
      if (radiusCenter) { params.lat = radiusCenter[0]; params.lng = radiusCenter[1]; params.radius_km = radiusKm; }
      if (vertices.length >= 3) {
        const lngs = vertices.map((v) => v[1]); const lats = vertices.map((v) => v[0]);
        params.bbox = `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;
      }
      const res = await get('/mobility/gis/search', params);
      setResults(res.data);
      toast(`Found ${res.data.zones.length} zones · ${res.data.points.length} transit points in ${activeCity.city_name}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Smart City GIS Map"
        description="Interactive OpenStreetMap with traffic, population density, transit layers, heatmaps, route analysis, clustering, geo/radius search and polygon selection."
        actions={(
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setRadiusCenter(null);
                  setVertices([]);
                  setResults(null);
                }}
                options={cities.map((c) => ({ value: c.slug, label: `${c.city_name}` }))}
              />
            </div>
            <Badge tone="primary" dot>{activeCity.city_name} · EPSG:4326</Badge>
          </div>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <MapCanvas
            zones={data.zones}
            points={data.points}
            routes={data.routes}
            heatPoints={heat?.data.points}
            center={activeCity.center}
            zoom={activeCity.zoom || 12}
            drawMode={drawMode === 'polygon' ? 'polygon' : null}
            onVertices={setVertices}
            radiusKm={radiusKm}
            radiusCenter={radiusCenter}
            onMapClick={(ll) => { if (drawMode === 'radius') setRadiusCenter(ll); }}
            scoreMode="composite"
            height={560}
          />

          <Card>
            <CardHeader title="Heatmap & analysis layers" subtitle="Intensity ramps: blue → emerald → amber → red" />
            <Tabs
              tabs={[
                { id: 'ridership', label: 'Ridership', content: (
                  <LayerInfo layer="ridership" points={heat?.data.points} note="Boardings intensity per ward centroid" />
                ) },
                { id: 'congestion', label: 'Traffic / Congestion', content: (
                  <LayerInfo layer="congestion" points={heat?.data.points} note="Peak congestion index per corridor segment" />
                ) },
                { id: 'connectivity', label: 'Connectivity', content: (
                  <LayerInfo layer="connectivity" points={heat?.data.points} note="Composite connectivity score coverage" />
                ) },
                { id: 'demand', label: 'Travel demand', content: (
                  <LayerInfo layer="demand" points={heat?.data.points} note="Total observed travel demand per ward" />
                ) },
              ]}
              onChange={setHeatLayer}
              initial="ridership"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Geo search" subtitle="Text · radius · polygon selection" />
            <form onSubmit={runSearch} className="space-y-3">
              <Input label="Search stops, stations, zones" placeholder="e.g. Tambaram, MS-003" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select
                label="Draw mode"
                value={drawMode}
                onChange={(e) => { setDrawMode(e.target.value); if (e.target.value !== 'radius') setRadiusCenter(null); }}
                options={[
                  { value: 'none', label: 'Off' },
                  { value: 'radius', label: 'Radius search — click map' },
                  { value: 'polygon', label: 'Polygon selection — click vertices' },
                ]}
              />
              {drawMode === 'radius' && (
                <>
                  <Input label="Radius (km)" type="number" min="0.2" max="20" step="0.5" value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))} />
                  <p className="text-[11px] text-text-secondary">
                    {radiusCenter ? `Centre set at ${radiusCenter[0].toFixed(3)}, ${radiusCenter[1].toFixed(3)}` : 'Click the map to place the radius centre'}
                  </p>
                </>
              )}
              {drawMode === 'polygon' && (
                <p className="text-[11px] text-text-secondary">Vertices: {vertices.length} {vertices.length >= 3 ? '(bbox applied)' : '(need 3+)'}</p>
              )}
              <Button type="submit" className="w-full" variant="secondary">Search layers</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Results" subtitle={results ? `${results.zones.length} zones · ${results.points.length} points` : 'Run a search to inspect matches'} />
            {results && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.zones.map((z) => (
                  <div key={z.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <p className="font-medium">{z.name}</p>
                    <p className="text-text-secondary">{z.code} · ward</p>
                  </div>
                ))}
                {results.points.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border px-3 py-2 text-xs flex justify-between">
                    <div><p className="font-medium">{p.name}</p><p className="text-text-secondary">{p.code}</p></div>
                    <Badge>{p.mode}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LayerInfo({ layer, points = [], note }) {
  const top = [...points].sort((a, b) => (b.intensity || 0) - (a.intensity || 0)).slice(0, 5);
  return (
    <div>
      <p className="text-xs text-text-secondary mb-3">{note}</p>
      <div className="space-y-1.5">
        {top.map((p) => (
          <div key={p.label} className="flex items-center justify-between text-xs rounded-lg bg-surface px-3 py-2">
            <span>{p.label}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(p.intensity || 0) * 100}%` }} />
              </div>
              <span className="text-text-secondary tabular-nums">{(p.intensity || 0).toFixed(2)}</span>
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-xs text-text-secondary">No heat points for this layer yet.</p>}
      </div>
    </div>
  );
}
