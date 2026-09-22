import React from 'react';
import { useGapUrgency } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { ScorePill, Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { PageSkeleton, ErrorState, ProgressBar } from '../../components/ui/Feedback';
import { ScoreBars } from '../../components/charts/Charts';
import { fmt, priorityBadge } from '../../utils/cn';

const FACTORS = [
  ['population_density', 'Population density', 25],
  ['vulnerability_index', 'Vulnerability index', 25],
  ['connectivity_deficit', 'Connectivity deficit', 20],
  ['economic_activity', 'Economic activity', 15],
  ['growth_rate', 'Growth rate', 15],
];

export default function GapUrgency() {
  const { data, isLoading, error, refetch } = useGapUrgency();
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const rows = data.data;

  return (
    <div>
      <PageHeader
        title="Gap Urgency Index"
        description="Composite priority engine blending population density, economic activity, vulnerability, growth rate and connectivity deficit into an investment ranking."
        actions={<Badge tone="primary">Weights · PDI 25 / VI 25 / CD 20 / EA 15 / GR 15</Badge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Urgency scores by zone" subtitle="Ranked — higher score = more urgent intervention" />
          <ScoreBars
            data={rows.map((r) => ({ name: r.zone_name, value: r.urgency_score }))}
            xKey="name" yKey="value" colorForValue height={300}
          />
        </Card>
        <Card>
          <CardHeader title="Index composition" subtitle="How the urgency score is built" />
          <div className="space-y-3">
            {FACTORS.map(([key, label, w]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{label}</span>
                  <span className="text-text-secondary">{w}%</span>
                </div>
                <ProgressBar value={w} max={25} tone="primary" />
              </div>
            ))}
          </div>
          <div className="mt-5 text-[11px] text-text-secondary leading-relaxed rounded-lg bg-surface border border-border p-3">
            Investment hints scale with urgency and connectivity deficit, sized for feeder-route,
            shared-mobility and walk-access packages typical of Indian metropolitan wards.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Priority ranking & investment suggestions" subtitle="Ordered by urgency score — ready for capital planning" />
        <Table
          columns={[
            {
              key: 'rank', label: 'Rank',
              render: (r) => (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-xs font-semibold">
                  {r.priority_rank}
                </span>
              ),
            },
            { key: 'zone', label: 'Zone', render: (r) => (
              <div><p className="font-medium">{r.zone_name}</p><p className="text-[11px] text-text-secondary">{r.zone_code}</p></div>
            ) },
            { key: 'urgency', label: 'Urgency', render: (r) => <ScorePill score={r.urgency_score} /> },
            { key: 'deficit', label: 'Connectivity deficit', render: (r) => <ScorePill score={r.connectivity_deficit} /> },
            { key: 'vuln', label: 'Vulnerability', render: (r) => <ScorePill score={r.vulnerability_index} /> },
            { key: 'inv', label: 'Suggested investment', render: (r) => <span className="font-semibold">{fmt.usd(r.investment_hint_usd)}</span> },
            {
              key: 'actions', label: 'Investment suggestions',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.suggested_actions.slice(0, 2).map((a) => <Badge key={a} tone="primary">{a}</Badge>)}
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.zone_id}
        />
      </Card>
    </div>
  );
}
