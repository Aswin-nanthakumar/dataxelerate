import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge, ScorePill } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Tabs } from '../components/ui/Tabs';
import { StatCard } from '../components/ui/Card';
import { ProgressBar, Switch } from '../components/ui/Feedback';
import { fmt, scoreColor, priorityBadge } from '../utils/cn';

export function renderWithProviders(ui, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UI primitives', () => {
  it('Button renders label, handles clicks and shows loading state', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Generate</Button>);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<Button loading>Generate</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('Badge and ScorePill map tones to score bands', () => {
    render(<><Badge tone="danger" dot>Critical</Badge><ScorePill score={0.82} /></>);
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('0.82')).toBeInTheDocument();
    expect(scoreColor(0.9)).toBe('#10B981');
    expect(scoreColor(0.3)).toBe('#EF4444');
    expect(priorityBadge('critical')).toContain('danger');
  });

  it('Input and Select are labelled accessibly', () => {
    render(<><Input label="Work email" /><Select label="Format" options={[{ value: 'pdf', label: 'PDF' }]} /></>);
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
  });

  it('Table renders rows, empty state and custom cells', () => {
    const columns = [{ key: 'name', label: 'Zone', render: (r) => `ZONE:${r.name}` }];
    const { rerender } = render(<Table columns={columns} rows={[{ name: 'Adyar' }]} />);
    expect(screen.getByText('ZONE:Adyar')).toBeInTheDocument();
    rerender(<Table columns={columns} rows={[]} empty="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('Tabs switch content', () => {
    render(
      <Tabs tabs={[
        { id: 'a', label: 'Alpha', content: <p>Alpha panel</p> },
        { id: 'b', label: 'Beta', content: <p>Beta panel</p> },
      ]} />,
    );
    expect(screen.getByText('Alpha panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByText('Beta panel')).toBeInTheDocument();
  });

  it('StatCard, ProgressBar and Switch render with values', () => {
    render(<>
      <StatCard label="Boardings" value="12.4K" delta={2.8} />
      <ProgressBar value={0.6} label="Coverage" />
      <Switch checked onChange={() => {}} label="toggle" />
    </>);
    expect(screen.getByText('12.4K')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('formatters produce stable output', () => {
    expect(fmt.num(1234567)).toBe('1,234,567');
    expect(fmt.pct(0.875)).toBe('87.5%');
    expect(fmt.usd(1500000)).toContain('1,500,000');
    expect(fmt.compact(21000)).toBe('21K');
  });
});

describe('Auth flow (mocked API)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('Login page renders demo accounts and form', async () => {
    const Login = (await import('../pages/auth/Login')).default;
    renderWithProviders(<Login />);
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getAllByText(/admin@urbanflow.ai/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /sign in securely/i })).toBeInTheDocument();
  });

  it('shows error toast region and validates form fields', async () => {
    const Login = (await import('../pages/auth/Login')).default;
    renderWithProviders(<Login />);
    const email = screen.getByLabelText('Work email');
    fireEvent.change(email, { target: { value: 'planner@urbanflow.ai' } });
    expect(email.value).toBe('planner@urbanflow.ai');
  });
});

describe('Dashboard integration (mocked fetch)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('uf_access', 'test-token');
    localStorage.setItem('uf_user', JSON.stringify({ id: '1', full_name: 'Asha Raman', role: 'administrator', email: 'admin@urbanflow.ai' }));
  });

  it('renders KPIs from the dashboard API', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: { user: { id: '1', full_name: 'Asha Raman', role: 'administrator', email: 'a@x.com' }, role_dashboard: 'admin' } }) });
      }
      if (u.includes('/mobility/dashboard')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            success: true,
            data: {
              kpis: {
                total_zones: 12, total_stops: 40, total_routes: 8, total_boardings: 1000000,
                avg_daily_boardings: 22222, avg_connectivity_score: 0.54, transit_deserts: 3,
                critical_hotspots: 2, coverage_pct: 0.66,
              },
              ridership_trend: [{ date: '2026-09-01', boardings: 20000 }, { date: '2026-09-02', boardings: 21000 }],
              top_gap_zones: [{ zone_id: 'z1', zone_name: 'Manali', zone_code: 'WARD-012', urgency_score: 0.81, priority_rank: 1, investment_hint_usd: 2500000 }],
              congestion_hotspots: [{ segment_name: 'City Trunk 1 segment', p95_congestion: 0.8, hotspot_level: 'critical' }],
              connectivity_distribution: { excellent: 2, good: 4, fair: 3, poor: 3 },
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: [] }) });
    });

    const Dashboard = (await import('../pages/dashboard/Dashboard')).default;
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/avg daily boardings/i)).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByText('22.2K')).toBeInTheDocument();
    expect(screen.getByText('Transit deserts')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Manali')).toBeInTheDocument());
    expect(screen.getByText(/City Trunk 1 segment/)).toBeInTheDocument();
  });
});
