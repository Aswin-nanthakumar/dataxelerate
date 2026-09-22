import React from 'react';
import { useLastMile } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Badge, ScorePill } from '../../components/ui/Badge';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { Icons } from '../../components/layout/Icons';
import { severityColor, fmt } from '../../utils/cn';

export default function LastMile() {
  const { data, isLoading, error, refetch } = useLastMile();
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const { summary, issues } = data.data;

  return (
    <div>
      <PageHeader
        title="Last-Mile Analytics"
        description="Detects destination access problems, missing connectivity services and transit coverage gaps — with optimisation and new-service recommendations."
        actions={<Badge tone="warning" dot>{summary.zones_with_gaps} zones with gaps</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Zones with destination gaps" value={summary.zones_with_gaps} tone="warning" icon={<Icons.lastMile width={20} height={20} />} />
        <StatCard label="Avg last-mile score" value={fmt.score(summary.avg_last_mile_score)} tone="primary" icon={<Icons.connectivity width={20} height={20} />} />
        <StatCard label="Priority zones" value={summary.priority_zones.length} tone="danger" icon={<Icons.gaps width={20} height={20} />} />
      </div>

      {issues.length === 0 ? (
        <EmptyState title="No last-mile gaps detected" body="All zones have adequate destination-side access." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <Card key={issue.zone_id} className="relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: severityColor(issue.severity) }} />
              <CardHeader
                title={issue.zone_name}
                subtitle={issue.zone_code}
                action={<ScorePill score={issue.last_mile_score} label="Last-mile" />}
              />
              <div className="space-y-2 mb-4">
                {issue.problems.map((p) => (
                  <p key={p} className="text-xs text-text-primary flex gap-2">
                    <span className="text-warning mt-0.5">●</span>{p}
                  </p>
                ))}
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-2">Missing connectivity services</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {Object.entries(issue.missing_services).map(([k, missing]) => (
                  <Badge key={k} tone={missing ? 'danger' : 'success'} dot>
                    {k.replace(/_/g, ' ')}: {missing ? 'missing' : 'present'}
                  </Badge>
                ))}
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-2">Optimisation recommendations</p>
              <div className="space-y-1.5">
                {issue.suggestions.map((s) => (
                  <div key={s.text} className="flex items-start gap-2 text-xs rounded-lg bg-success/5 border border-success/10 px-3 py-2">
                    <Badge tone="success">{s.type.replace(/_/g, ' ')}</Badge>
                    <span className="text-text-primary">{s.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
