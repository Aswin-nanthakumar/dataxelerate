import React, { useState } from 'react';
import { useReports, useGenerateReport } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { tokenStore } from '../../api/client';
import { fmt } from '../../utils/cn';
import { Icons } from '../../components/layout/Icons';

const API = import.meta.env.VITE_API_BASE || '/api/v1';

export default function Reports() {
  const { data, isLoading, error, refetch } = useReports();
  const generate = useGenerateReport();
  const toast = useToast();
  const [reportType, setReportType] = useState('mobility_overview');
  const [period, setPeriod] = useState('monthly');
  const [format, setFormat] = useState('pdf');

  const run = async () => {
    try {
      await generate.mutateAsync({ reportType, period, format });
      toast('Report generated — includes charts, maps, predictions, AI insights and recommendations', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const download = async (id) => {
    try {
      const res = await fetch(`${API}/reports/${id}/download`, {
        headers: { Authorization: `Bearer ${tokenStore.access}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `urbanflow-report-${id.slice(0, 8)}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        title="Report Generator"
        description="Planning reports with charts, map snapshots, demand predictions, AI insights and recommendations. Export as PDF, Excel or CSV across daily, weekly, monthly and annual periods."
        actions={<Badge tone="primary" dot>PDF · Excel · CSV</Badge>}
      />

      <Card className="mb-4">
        <CardHeader title="Generate a report" subtitle="Every report embeds KPIs, gap analysis, forecasts and costed recommendations" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select label="Report type" value={reportType} onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'mobility_overview', label: 'Smart Mobility Overview' },
              { value: 'connectivity', label: 'Connectivity & Accessibility' },
              { value: 'first_last_mile', label: 'First & Last-Mile Gap Analysis' },
              { value: 'demand_forecast', label: 'Demand Forecast Outlook' },
              { value: 'investment_plan', label: 'Gap Urgency & Investment Plan' },
            ]}
          />
          <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' },
            ]}
          />
          <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value)}
            options={[
              { value: 'pdf', label: 'PDF document' },
              { value: 'excel', label: 'Excel workbook' },
              { value: 'csv', label: 'CSV bundle' },
            ]}
          />
          <div className="flex items-end">
            <Button className="w-full" loading={generate.isPending} onClick={run}>
              <Icons.download width={15} height={15} /> Generate
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Generated reports" subtitle="Stored with full JSON content for re-download in any format" />
        {isLoading && <PageSkeleton />}
        {error && <ErrorState error={error} retry={refetch} />}
        {data && data.data.length === 0 && <EmptyState title="No reports yet" body="Generate your first planning report above." />}
        {data && data.data.length > 0 && (
          <Table
            columns={[
              { key: 'title', label: 'Report', render: (r) => <span className="font-medium">{r.title}</span> },
              { key: 'type', label: 'Type', render: (r) => <Badge>{r.report_type.replace(/_/g, ' ')}</Badge> },
              { key: 'period', label: 'Period', render: (r) => r.period },
              { key: 'format', label: 'Format', render: (r) => <Badge tone="primary">{r.format}</Badge> },
              { key: 'date', label: 'Generated', render: (r) => fmt.dateTime(r.generated_at) },
              {
                key: 'actions', label: '',
                render: (r) => (
                  <Button size="sm" variant="secondary" onClick={() => download(r.id)}>
                    <Icons.download width={13} height={13} /> Download
                  </Button>
                ),
              },
            ]}
            rows={data.data}
            rowKey={(r) => r.id}
          />
        )}
      </Card>
    </div>
  );
}
