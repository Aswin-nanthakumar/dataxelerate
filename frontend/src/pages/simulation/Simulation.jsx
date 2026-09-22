import React, { useState } from 'react';
import { useRunSimulation, useSimulations, useGisLayers } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { PageSkeleton, ErrorState, ProgressBar } from '../../components/ui/Feedback';
import { MapCanvas } from '../../components/maps/MapCanvas';
import { useToast } from '../../components/ui/Toast';
import { fmt } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

export default function Simulation() {
  const { data: gis } = useGisLayers();
  const { data: sims, isLoading, error, refetch } = useSimulations();
  const run = useRunSimulation();
  const toast = useToast();

  const [name, setName] = useState('Sholinganallur feeder trial');
  const [kind, setKind] = useState('bus_stop');
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [marker, setMarker] = useState([12.901, 80.228]);
  const [result, setResult] = useState(null);

  const execute = async () => {
    try {
      const res = await run.mutateAsync({
        name, kind, radius_km: radiusKm, coordinates: [marker[1], marker[0]],
      });
      setResult(res.data);
      toast('Simulation complete — projections computed', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        title="What-If Simulation Engine"
        description="Simulate new bus stops, routes, metro stations, bike-share and EV stations. Predict ridership uplift, congestion relief, accessibility gain, carbon savings and ROI before committing capital."
        actions={<Badge tone="warning" dot>Planner workspace</Badge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {gis && (
            <MapCanvas
              zones={gis.zones} points={gis.points} routes={gis.routes}
              scenarioMarker={marker} radiusKm={radiusKm} radiusCenter={marker}
              onMapClick={(latlng) => setMarker(latlng)}
              height={460}
            />
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                <StatCard label="Ridership uplift" value={`+${result.ridership_increase_pct}%`} tone="success" icon={<Icons.bus width={18} height={18} />} />
                <StatCard label="Congestion relief" value={`−${result.congestion_reduction_pct}%`} tone="primary" icon={<Icons.zap width={18} height={18} />} />
                <StatCard label="Accessibility gain" value={`+${result.accessibility_gain}`} tone="primary" icon={<Icons.connectivity width={18} height={18} />} />
                <StatCard label="Carbon savings" value={`${result.carbon_savings_tons_yr} t/yr`} tone="success" icon={<Icons.forecast width={18} height={18} />} />
                <StatCard label="ROI" value={`${result.roi}×`} tone={result.roi > 0 ? 'success' : 'danger'} icon={<Icons.gaps width={18} height={18} />} />
              </div>

              <Card>
                <CardHeader title="Projected demand ramp-up" subtitle="Uplift realisation curve over 12 months (S-curve adoption)" />
                <div className="flex items-end gap-1 h-40">
                  {result.results.projected_demand_curve.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-text-secondary">{m.uplift_pct}%</span>
                      <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, m.uplift_pct * 4)}%` }} />
                      <span className="text-[9px] text-text-secondary">M{m.month}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader title="Affected zones" subtitle="Before/after walk access & connectivity projection" />
                <div className="space-y-2">
                  {result.results.affected_zones.map((z) => (
                    <div key={z.zone_id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-xs">
                      <span className="font-medium w-32 truncate">{z.zone_name}</span>
                      <div className="flex-1">
                        <ProgressBar value={z.projected_score} label={`Score ${z.current_score ?? '—'} → ${z.projected_score}`} tone="success" />
                      </div>
                      <span className="text-text-secondary">walk {z.walk_access_km_before}→{z.walk_access_km_after} km</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Scenario setup" subtitle="Click the map to place the intervention" />
            <div className="space-y-3">
              <Input label="Scenario name" value={name} onChange={(e) => setName(e.target.value)} />
              <Select
                label="Intervention type"
                value={kind} onChange={(e) => setKind(e.target.value)}
                options={[
                  { value: 'bus_stop', label: 'New bus stop' },
                  { value: 'bus_route', label: 'New bus route' },
                  { value: 'metro_station', label: 'New metro station' },
                  { value: 'bike_share', label: 'Bike-share station' },
                  { value: 'ev_station', label: 'EV charging station' },
                ]}
              />
              <Input label="Catchment radius (km)" type="number" min="0.2" max="20" step="0.5"
                value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))} />
              <p className="text-[11px] text-text-secondary">
                Placement: {marker[0].toFixed(4)}, {marker[1].toFixed(4)}
              </p>
              <Button className="w-full" loading={run.isPending} onClick={execute}>
                <Icons.zap width={15} height={15} /> Run simulation
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent simulations" />
            {isLoading && <PageSkeleton />}
            {error && <ErrorState error={error} retry={refetch} />}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sims?.data.map((s) => (
                <button key={s.id} onClick={() => setResult(s)}
                  className="w-full text-left rounded-lg border border-border px-3 py-2.5 text-xs hover:border-primary/40 transition-colors">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-text-secondary mt-0.5">
                    {s.kind.replace(/_/g, ' ')} · +{s.ridership_increase_pct}% ridership · ROI {s.roi}×
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
