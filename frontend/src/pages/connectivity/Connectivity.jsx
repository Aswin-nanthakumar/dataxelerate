import React, { useState } from 'react';
import { useConnectivity, useConnectivityRankings, useGisLayers, useHeatmap } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, ScorePill } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { PageSkeleton, ErrorState, ProgressBar } from '../../components/ui/Feedback';
import { GroupedBars, ScoreBars } from '../../components/charts/Charts';
import { MapCanvas } from '../../components/maps/MapCanvas';
import { fmt } from '../../utils/cn';
import { Button } from '../../components/ui/Button';

const PARAMS = [
  ['distance_to_transit', 'Distance to transit', '30%'],
  ['frequency_score', 'Service frequency', '20%'],
  ['reliability_score', 'Reliability', '15%'],
  ['safety_score', 'Safety', '15%'],
  ['intermodal_score', 'Intermodal availability', '20%'],
];

export default function Connectivity() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useConnectivity({ page, limit: 8, q: q || undefined, sort: '-composite_score' });
  const { data: rankings } = useConnectivityRankings();
  const { data: gis } = useGisLayers();
  const { data: heat } = useHeatmap('connectivity');

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const rows = data.data;
  const meta = data.meta;

  return (
    <div>
      <PageHeader
        title="Connectivity Analytics"
        description="Composite Connectivity Score across five weighted parameters: distance to transit, service frequency, reliability, safety and intermodal availability."
        actions={(
          <input
            className="input-base w-48" placeholder="Search zones…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search zones"
          />
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Score parameters by zone" subtitle="Normalised 0–1 inputs to the composite index" />
          <GroupedBars
            data={rows.map((r) => ({
              name: r.zone_name,
              Distance: r.distance_to_transit,
              Frequency: r.frequency_score,
              Reliability: r.reliability_score,
              Safety: r.safety_score,
              Intermodal: r.intermodal_score,
            }))}
            keys={[
              { key: 'Distance', label: 'Distance' }, { key: 'Frequency', label: 'Frequency' },
              { key: 'Reliability', label: 'Reliability' }, { key: 'Safety', label: 'Safety' },
              { key: 'Intermodal', label: 'Intermodal' },
            ]}
            xKey="name"
          />
        </Card>
        <Card>
          <CardHeader title="Scoring model" subtitle="Transparent, auditable weights" />
          <div className="space-y-3">
            {PARAMS.map(([key, label, weight]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-primary font-medium">{label}</span>
                  <span className="text-text-secondary">{weight}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${parseInt(weight, 10) * 3.3}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-surface border border-border p-3 text-[11px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Accessibility score</strong> blends composite connectivity (50%),
            last-mile alight-side access (30%) and route reach (20%). Coverage = share of the ward within a
            400 m walk-shed of transit.
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader title="Connectivity heatmap" subtitle="Zone-level composite coverage on OpenStreetMap" />
        {gis && (
          <MapCanvas
            zones={gis.zones} points={gis.points} routes={gis.routes}
            heatPoints={heat?.data.points} scoreMode="composite" height={360}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Zone connectivity scores" subtitle={`Page ${meta.page} of ${meta.totalPages} · ${meta.total} zones`} />
          <Table
            columns={[
              { key: 'zone', label: 'Zone', render: (r) => (
                <div><p className="font-medium">{r.zone_name}</p><p className="text-[11px] text-text-secondary">{r.zone_code}</p></div>
              ) },
              { key: 'comp', label: 'Composite', render: (r) => <ScorePill score={r.composite_score} /> },
              { key: 'fm', label: 'First-mile', render: (r) => <ScorePill score={r.first_mile_score} /> },
              { key: 'lm', label: 'Last-mile', render: (r) => <ScorePill score={r.last_mile_score} /> },
              { key: 'acc', label: 'Accessibility', render: (r) => (
                <ProgressBar value={r.accessibility_score} tone={r.accessibility_score > 0.6 ? 'success' : r.accessibility_score > 0.4 ? 'warning' : 'danger'} />
              ) },
              { key: 'desert', label: 'Status', render: (r) => (
                r.is_transit_desert
                  ? <Badge tone="danger" dot>Transit desert</Badge>
                  : <Badge tone="success" dot>Covered</Badge>
              ) },
            ]}
            rows={rows}
            rowKey={(r) => r.zone_id}
          />
          <div className="flex justify-between items-center mt-3">
            <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-text-secondary">{(meta.totalPages)}</span>
            <Button variant="secondary" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Connectivity rankings" subtitle="League table by composite score" />
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {rankings?.data.map((r) => (
              <div key={r.zone_code} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-xs">
                <span className="w-6 h-6 rounded-md bg-surface flex items-center justify-center font-semibold text-text-secondary">{r.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.zone_name}</p>
                  <p className="text-[11px] text-text-secondary">accessibility {fmt.score(r.accessibility_score)}</p>
                </div>
                <ScorePill score={r.composite_score} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
