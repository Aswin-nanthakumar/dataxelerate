import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Badge, ScorePill } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { PageSkeleton, ErrorState, ProgressBar } from '../../components/ui/Feedback';
import { DistributionDonut, TrendChart } from '../../components/charts/Charts';
import { fmt, priorityBadge } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

const ROLE_BLURB = {
  administrator: 'Full platform control — users, RBAC, audit and system health.',
  city_planner: 'Planning workspace — simulations, recommendations and investment cases.',
  transport_authority: 'Operations view — service reliability, approvals and capacity.',
  analyst: 'Analytics workspace — read-only intelligence and personal reports.',
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const k = data.data.kpis;
  const dist = data.data.connectivity_distribution;
  const donut = [
    { name: 'Excellent', value: dist.excellent },
    { name: 'Good', value: dist.good },
    { name: 'Fair', value: dist.fair },
    { name: 'Poor', value: dist.poor },
  ];

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${user.full_name.split(' ')[0]}`}
        description={ROLE_BLURB[role]}
        actions={<Badge tone="primary" dot>Live analytics · {ROLE_LABELS[role]}</Badge>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Avg daily boardings" value={fmt.compact(k.avg_daily_boardings)} delta={2.8} tone="primary" delay={0}
          icon={<Icons.bus width={20} height={20} />} />
        <StatCard label="Avg connectivity score" value={fmt.score(k.avg_connectivity_score)} tone="success" delay={0.05}
          icon={<Icons.connectivity width={20} height={20} />} />
        <StatCard label="Transit deserts" value={k.transit_deserts} tone={k.transit_deserts > 2 ? 'danger' : 'warning'} delay={0.1}
          icon={<Icons.firstMile width={20} height={20} />} />
        <StatCard label="Critical hotspots" value={k.critical_hotspots} tone="warning" delay={0.15}
          icon={<Icons.gaps width={20} height={20} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card className="xl:col-span-2" delay={0.1}>
          <CardHeader
            title="Ridership trend — last 7 days"
            subtitle={`${fmt.num(k.total_boardings)} boardings in the observation window · ${k.total_routes} routes · ${k.total_stops} stops`}
          />
          <TrendChart data={data.data.ridership_trend.map((t) => ({ ...t, date: t.date.slice(5) }))} />
        </Card>
        <Card delay={0.15}>
          <CardHeader title="Connectivity distribution" subtitle="Zones by composite score band" />
          <DistributionDonut data={donut} />
          <ProgressBar value={k.coverage_pct} label="Network coverage" tone={k.coverage_pct > 0.7 ? 'success' : 'warning'} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card delay={0.2}>
          <CardHeader
            title="Priority gap zones"
            subtitle="Gap Urgency Index — top investment candidates"
            action={<Link to="/gap-urgency" className="text-xs font-medium text-primary hover:underline">View all</Link>}
          />
          <Table
            columns={[
              { key: 'rank', label: '#', render: (r) => r.priority_rank },
              { key: 'name', label: 'Zone', render: (r) => (
                <div><p className="font-medium">{r.zone_name}</p><p className="text-[11px] text-text-secondary">{r.zone_code}</p></div>
              ) },
              { key: 'urgency', label: 'Urgency', render: (r) => <ScorePill score={r.urgency_score} /> },
              { key: 'inv', label: 'Investment', render: (r) => fmt.usd(r.investment_hint_usd) },
            ]}
            rows={data.data.top_gap_zones}
            rowKey={(r) => r.zone_id}
          />
        </Card>

        <Card delay={0.25}>
          <CardHeader
            title="Congestion hotspots"
            subtitle="95th-percentile congestion by corridor"
            action={<Link to="/map" className="text-xs font-medium text-primary hover:underline">Open map</Link>}
          />
          <Table
            columns={[
              { key: 'seg', label: 'Corridor', render: (r) => <span className="font-medium">{r.segment_name}</span> },
              { key: 'p95', label: 'P95 congestion', render: (r) => <ScorePill score={r.p95_congestion} /> },
              {
                key: 'level', label: 'Level',
                render: (r) => (
                  <Badge tone={r.hotspot_level === 'critical' ? 'danger' : r.hotspot_level === 'warning' ? 'warning' : 'neutral'} dot>
                    {r.hotspot_level}
                  </Badge>
                ),
              },
            ]}
            rows={data.data.congestion_hotspots}
            rowKey={(r) => r.segment_name}
          />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Run a what-if scenario', 'Test new stops, routes, metro', '/simulation', 'simulate'],
          ['Ask the AI Copilot', 'Natural-language mobility queries', '/copilot', 'copilot'],
          ['Generate planning report', 'PDF · Excel · CSV with AI insights', '/reports', 'reports'],
          ['Review recommendations', 'Costed investment business cases', '/recommendations', 'recommend'],
        ].map(([title, body, to, icon]) => (
          <Link key={to} to={to} className="card p-4 hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="text-primary mb-2 group-hover:scale-110 transition-transform">
              {React.createElement(Icons[icon], { width: 18, height: 18 })}
            </div>
            <p className="text-xs font-semibold">{title}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
