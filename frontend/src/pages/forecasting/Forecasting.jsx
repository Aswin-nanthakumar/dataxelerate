import React, { useState } from 'react';
import { useForecast, useDashboard } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader, StatCard } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSkeleton, ErrorState, ProgressBar } from '../../components/ui/Feedback';
import { Select } from '../../components/ui/Input';
import { ForecastChart, TrendChart } from '../../components/charts/Charts';
import { fmt } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

export default function Forecasting() {
  const [granularity, setGranularity] = useState('daily');
  const [horizon, setHorizon] = useState(14);
  const { data, isLoading, error, refetch } = useForecast(granularity, horizon);
  const { data: dash } = useDashboard();

  return (
    <div>
      <PageHeader
        title="Demand Forecasting AI"
        description="XGBoost + LightGBM ensemble (with scikit-learn gradient boosting) over historical usage, weather, events, holidays and population growth. Calibrated confidence bands included."
        actions={(
          <div className="flex gap-2">
            <Select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'seasonal', label: 'Seasonal' },
              ]}
            />
            <Select
              value={String(horizon)}
              onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
              options={[7, 14, 30, 60, 90].map((h) => ({ value: String(h), label: `${h} steps` }))}
            />
          </div>
        )}
      />

      {isLoading && <PageSkeleton />}
      {error && <ErrorState error={error} retry={refetch} />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard label="Model" value={data.data.model_name.split('+')[0]} tone="primary" icon={<Icons.zap width={20} height={20} />} />
            <StatCard
              label="Trend vs baseline"
              value={`${data.data.trend_pct >= 0 ? '+' : ''}${data.data.trend_pct}%`}
              tone={data.data.trend_pct >= 0 ? 'success' : 'warning'}
              icon={<Icons.forecast width={20} height={20} />}
            />
            <StatCard label="Avg confidence" value={fmt.pct(data.data.confidence_avg)} tone="success" icon={<Icons.connectivity width={20} height={20} />} />
            <StatCard label="History points" value={data.data.history_points} tone="primary" icon={<Icons.dashboard width={20} height={20} />} />
          </div>

          <Card className="mb-4">
            <CardHeader
              title={`${granularity[0].toUpperCase()}${granularity.slice(1)} demand forecast — ${horizon} steps`}
              subtitle={`Model ${data.data.model_name} v${data.data.model_version} · confidence bands at ~80% interval`}
              actions={<Badge tone="primary" dot>AI service ensemble</Badge>}
            />
            <ForecastChart
              history={(dash?.data.ridership_trend || []).slice(-7).map((t) => ({ date: t.date.slice(5), boardings: t.boardings }))}
              forecast={data.data.predictions.map((p) => ({ ...p, timestamp: p.predicted_at }))}
              height={300}
            />
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2">
              <CardHeader title="Prediction table" subtitle="Point forecast with lower/upper bounds and per-step confidence" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-surface">
                    <tr>
                      {['Timestamp', 'Forecast', 'Lower', 'Upper', 'Confidence'].map((h) => <th key={h} className="th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.predictions.slice(0, 12).map((p) => (
                      <tr key={p.predicted_at}>
                        <td className="td">{fmt.dateTime(p.predicted_at)}</td>
                        <td className="td font-semibold">{fmt.num(p.predicted_value)}</td>
                        <td className="td text-text-secondary">{fmt.num(p.lower_bound)}</td>
                        <td className="td text-text-secondary">{fmt.num(p.upper_bound)}</td>
                        <td className="td"><ProgressBar value={p.confidence} tone={p.confidence > 0.75 ? 'success' : 'warning'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title="Input factors" subtitle="Feature set powering the ensemble" />
              <div className="space-y-2">
                {[
                  ['Historical usage', 'Lag-1/2/7 + rolling means'],
                  ['Weather', 'Temperature & precipitation'],
                  ['Events', 'City event uplift flags'],
                  ['Holidays', 'Public holiday calendar'],
                  ['Population growth', 'Zone growth-rate trend index'],
                ].map(([label, detail]) => (
                  <div key={label} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success" />
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[11px] text-text-secondary">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
