import React from 'react';
import { useFirstMile } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Badge, ScorePill } from '../../components/ui/Badge';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Tabs } from '../../components/ui/Tabs';
import { Icons } from '../../components/layout/Icons';
import { fmt, severityColor } from '../../utils/cn';

export default function FirstMile() {
  const { data, isLoading, error, refetch } = useFirstMile();
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const { summary, issues } = data.data;
  const critical = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div>
      <PageHeader
        title="First-Mile Analytics"
        description={`Detects transit deserts, long walking distances (>${summary.walk_barrier_km} km barriers), feeder route issues and access barriers — with improvement suggestions and priority zones.`}
        actions={<Badge tone="danger" dot>{summary.zones_with_barriers} zones with barriers</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Zones with access barriers" value={summary.zones_with_barriers} tone="warning" icon={<Icons.firstMile width={20} height={20} />} />
        <StatCard label="Transit deserts" value={summary.transit_deserts} tone="danger" icon={<Icons.gaps width={20} height={20} />} />
        <StatCard label="Priority zones" value={summary.priority_zones.length} tone="primary" icon={<Icons.bus width={20} height={20} />} />
      </div>

      <Tabs
        tabs={[
          { id: 'critical', label: `Critical (${critical.length})`, content: <IssueList issues={critical} empty="No critical first-mile barriers" /> },
          { id: 'warning', label: `Warnings (${warnings.length})`, content: <IssueList issues={warnings} empty="No first-mile warnings" /> },
          { id: 'all', label: `All zones (${issues.length})`, content: <IssueList issues={issues} empty="No first-mile issues detected" /> },
        ]}
      />
    </div>
  );
}

function IssueList({ issues, empty }) {
  if (!issues.length) {
    return <EmptyState title={empty} body="Every modelled ward currently meets walking-access thresholds." />;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {issues.map((issue) => (
        <Card key={issue.zone_id} className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: severityColor(issue.severity) }} />
          <CardHeader
            title={issue.zone_name}
            subtitle={issue.zone_code}
            action={<ScorePill score={issue.first_mile_score} label="First-mile" />}
          />
          <div className="space-y-2 mb-4">
            {issue.problems.map((p) => (
              <p key={p} className="text-xs text-text-primary flex gap-2">
                <span className="text-danger mt-0.5">●</span>{p}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(issue.barriers).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface border border-border px-2.5 py-2 text-[11px]">
                <p className="text-text-secondary">{k.replace(/_/g, ' ')}</p>
                <p className={`font-semibold mt-0.5 ${v === true || (typeof v === 'number' && v > 1.2) ? 'text-danger' : 'text-text-primary'}`}>
                  {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? `${fmt.score(v)} km` : String(v)}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-2">Improvement suggestions</p>
            <div className="space-y-1.5">
              {issue.suggestions.map((s) => (
                <div key={s.text} className="flex items-start gap-2 text-xs rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <Badge tone="primary">{s.type.replace(/_/g, ' ')}</Badge>
                  <span className="text-text-primary">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
