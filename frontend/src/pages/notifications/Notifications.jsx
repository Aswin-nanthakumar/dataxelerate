import React from 'react';
import { useNotifications, useMarkNotifications } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { fmt, severityColor } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

const KIND_LABEL = {
  gap_alert: 'Gap alert', demand_anomaly: 'Demand anomaly',
  recommendation: 'Recommendation', report_ready: 'Report ready', system: 'System',
};

export default function Notifications() {
  const { data, isLoading, error, refetch } = useNotifications();
  const mark = useMarkNotifications();
  const toast = useToast();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts from the analytics engine: transit deserts, demand anomalies, high-urgency investment zones and generated reports."
        actions={data?.data.unread > 0 && (
          <Button variant="secondary" size="sm" onClick={async () => {
            await mark.mutateAsync('read-all');
            toast('All notifications marked read', 'success');
          }}>
            Mark all read ({data.data.unread})
          </Button>
        )}
      />

      {isLoading && <PageSkeleton />}
      {error && <ErrorState error={error} retry={refetch} />}
      {data && data.data.items.length === 0 && (
        <EmptyState icon={<Icons.bell width={28} height={28} />} title="All caught up" body="Engine alerts will appear here as the analytics run." />
      )}

      <div className="space-y-3">
        {data?.data.items.map((n) => (
          <Card key={n.id} className={`flex items-start gap-4 ${n.is_read ? 'opacity-70' : ''}`}>
            <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center"
              style={{ background: `${severityColor(n.severity)}1A`, color: severityColor(n.severity) }}>
              <Icons.bell width={17} height={17} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{n.title}</p>
                <Badge tone={n.severity === 'critical' ? 'danger' : n.severity === 'warning' ? 'warning' : 'primary'}>{n.severity}</Badge>
                <Badge>{KIND_LABEL[n.kind] || n.kind}</Badge>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="unread" />}
              </div>
              <p className="text-xs text-text-secondary mt-1">{n.body}</p>
              <p className="text-[11px] text-text-secondary mt-1.5">{fmt.dateTime(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <Button size="sm" variant="ghost" onClick={async () => { await mark.mutateAsync(`${n.id}/read`); refetch(); }}>
                Mark read
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
