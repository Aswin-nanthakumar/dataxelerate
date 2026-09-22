import React, { useState } from 'react';
import { useRecommendations, useGenerateRecommendations, useUpdateRecommendation } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Select } from '../../components/ui/Input';
import { PageSkeleton, ErrorState, ProgressBar, EmptyState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { fmt, priorityBadge } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

export default function Recommendations() {
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading, error, refetch } = useRecommendations({ type: type || undefined, limit: 50 });
  const generate = useGenerateRecommendations();
  const update = useUpdateRecommendation();
  const toast = useToast();
  const { isRole } = useAuth();
  const canWrite = isRole('administrator', 'city_planner', 'transport_authority');

  return (
    <div>
      <PageHeader
        title="AI Recommendation Engine"
        description="Investment-ready business cases: new bus routes, shuttles, bike share, EV stations, route optimisations and service expansions — each with problem, root cause, cost, impact, ROI, priority and roadmap."
        actions={(
          <>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: '', label: 'All types' },
                { value: 'new_bus_route', label: 'New bus routes' },
                { value: 'shuttle_service', label: 'Shuttles' },
                { value: 'bike_share', label: 'Bike share' },
                { value: 'ev_station', label: 'EV stations' },
                { value: 'route_optimization', label: 'Route optimisation' },
                { value: 'service_expansion', label: 'Service expansion' },
                { value: 'pedestrian_improvement', label: 'Pedestrian' },
              ]}
            />
            {canWrite && (
              <Button
                loading={generate.isPending}
                onClick={async () => {
                  try {
                    const res = await generate.mutateAsync();
                    toast(`Generated ${res.data.length} recommendations`, 'success');
                  } catch (e) { toast(e.message, 'error'); }
                }}
              >
                <Icons.zap width={15} height={15} /> Regenerate
              </Button>
            )}
          </>
        )}
      />

      {isLoading && <PageSkeleton />}
      {error && <ErrorState error={error} retry={refetch} />}
      {data && data.data.length === 0 && <EmptyState title="No recommendations yet" body="Regenerate to run the engine against current analytics." />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.data.map((r) => (
            <Card key={r.id} hover className="flex flex-col">
              <CardHeader
                title={r.title}
                subtitle={r.zone_name}
                action={<Badge className={priorityBadge(r.priority_level)} dot>{r.priority_level}</Badge>}
              />
              <div className="space-y-2 mb-4 flex-1">
                <div className="text-xs">
                  <p className="font-semibold text-text-secondary text-[11px] uppercase tracking-wide">Problem</p>
                  <p className="mt-0.5">{r.problem}</p>
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-text-secondary text-[11px] uppercase tracking-wide">Root cause</p>
                  <p className="mt-0.5">{r.root_cause}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  ['Cost', fmt.usd(r.estimated_cost_usd)],
                  ['ROI', `${r.roi}×`],
                  ['Ridership', `+${r.expected_impact.ridership_increase_pct}%`],
                  ['Carbon', `${r.expected_impact.carbon_savings_tons_yr}t/yr`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-surface border border-border px-2 py-2 text-center">
                    <p className="text-[10px] text-text-secondary">{label}</p>
                    <p className="text-[11px] font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelected(r)}>Business case</Button>
                {canWrite && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={async () => {
                      try {
                        await update.mutateAsync({ id: r.id, status: 'approved' });
                        toast('Recommendation approved', 'success');
                        refetch();
                      } catch (e) { toast(e.message, 'error'); }
                    }}
                  >
                    Approve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title} wide>
        {selected && (
          <div className="space-y-4 text-sm">
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Problem</p>
              <p className="mt-1">{selected.problem}</p>
            </section>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Root cause</p>
              <p className="mt-1">{selected.root_cause}</p>
            </section>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['Estimated cost', fmt.usd(selected.estimated_cost_usd)],
                ['ROI', selected.roi],
                ['Priority', selected.priority_level],
                ['Type', selected.rec_type.replace(/_/g, ' ')],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-surface border border-border p-3">
                  <p className="text-[10px] text-text-secondary">{l}</p>
                  <p className="text-xs font-semibold mt-1">{v}</p>
                </div>
              ))}
            </section>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Expected impact</p>
              <div className="mt-2 space-y-2">
                <ProgressBar value={selected.expected_impact.ridership_increase_pct} max={20} label={`Ridership +${selected.expected_impact.ridership_increase_pct}%`} tone="success" />
                <ProgressBar value={selected.expected_impact.congestion_reduction_pct} max={12} label={`Congestion −${selected.expected_impact.congestion_reduction_pct}%`} tone="primary" />
                <ProgressBar value={selected.expected_impact.accessibility_gain} max={0.4} label={`Accessibility +${selected.expected_impact.accessibility_gain}`} tone="warning" />
              </div>
              <p className="text-[11px] text-text-secondary mt-2">
                Carbon savings ≈ {selected.expected_impact.carbon_savings_tons_yr} tons CO₂e/year · annual benefit ≈ {fmt.usd(selected.expected_impact.annual_benefit_usd)}
              </p>
            </section>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Implementation roadmap</p>
              <ol className="mt-2 space-y-2">
                {selected.roadmap.map((step, i) => (
                  <li key={step.phase} className="flex gap-3 rounded-lg border border-border p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{i + 1}</span>
                    <div>
                      <p className="text-xs font-medium">{step.phase} <span className="text-text-secondary font-normal">· {step.days} days</span></p>
                      <p className="text-[11px] text-text-secondary mt-0.5">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </Dialog>
    </div>
  );
}
