import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';

function renderApp(ui, role = 'city_planner') {
  localStorage.clear();
  localStorage.setItem('uf_access', 'tok');
  localStorage.setItem('uf_user', JSON.stringify({ id: 'u1', full_name: 'Vikram Iyer', role, email: 'planner@urbanflow.ai' }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const okJson = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data }) });

beforeEach(() => vi.restoreAllMocks());

describe('Module pages', () => {
  it('Connectivity page shows weighted parameters and rankings', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'V', role: 'analyst', email: 'a' }, role_dashboard: 'analyst' });
      if (u.includes('/connectivity/rankings')) return okJson([
        { rank: 1, zone_name: 'Anna Nagar', zone_code: 'WARD-004', composite_score: 0.77, accessibility_score: 0.7, is_transit_desert: false },
      ]);
      if (u.includes('/connectivity')) return {
        ...{}, ok: true, status: 200,
        json: () => Promise.resolve({
          success: true,
          data: [{
            zone_id: 'z1', zone_name: 'Anna Nagar', zone_code: 'WARD-004',
            distance_to_transit: 0.8, frequency_score: 0.7, reliability_score: 0.85, safety_score: 0.8, intermodal_score: 0.75,
            composite_score: 0.77, first_mile_score: 0.74, last_mile_score: 0.7, accessibility_score: 0.7,
            coverage_pct: 0.8, is_transit_desert: false,
          }],
          meta: { page: 1, limit: 8, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        }),
      };
      return okJson({});
    });

    const Connectivity = (await import('../pages/connectivity/Connectivity')).default;
    renderApp(<Connectivity />, 'analyst');
    await waitFor(() => expect(screen.getByText('Connectivity Analytics')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Distance to transit')).toBeInTheDocument());
    expect(screen.getByText('Intermodal availability')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Anna Nagar/).length).toBeGreaterThan(0));
  });

  it('First-Mile page lists barriers and suggestions', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'V', role: 'analyst', email: 'a' }, role_dashboard: 'analyst' });
      if (u.includes('/first-mile')) return okJson({
        summary: { zones_with_barriers: 1, transit_deserts: 1, priority_zones: ['Manali'], walk_barrier_km: 1.2 },
        issues: [{
          zone_id: 'z12', zone_name: 'Manali', zone_code: 'WARD-012', severity: 'critical', first_mile_score: 0.21,
          problems: ['Nearest transit is 2.4 km away (walk barrier > 1.2 km)'],
          barriers: { walking_distance_km: 2.4, missing_feeder_route: true, missing_intermodal: true, low_income_vulnerability: true },
          suggestions: [{ type: 'shuttle_service', text: 'Launch on-demand feeder shuttle' }],
        }],
      });
      return okJson({});
    });

    const FirstMile = (await import('../pages/firstMile/FirstMile')).default;
    renderApp(<FirstMile />);
    await waitFor(() => expect(screen.getByText('First-Mile Analytics')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Launch on-demand feeder shuttle/)).toBeInTheDocument());
    expect(screen.getAllByText('Manali').length).toBeGreaterThan(0);
  });

  it('Recommendations page renders full business case dialog', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'V', role: 'city_planner', email: 'p' }, role_dashboard: 'planner' });
      if (u.includes('/recommendations')) return okJson([{
        id: 'r1', title: 'New feeder bus route — Manali', zone_name: 'Manali', rec_type: 'new_bus_route',
        status: 'proposed', problem: 'No trunk service', root_cause: 'Network design gap',
        estimated_cost_usd: 850000, roi: 1.4, priority_level: 'critical', priority_score: 0.8,
        expected_impact: { ridership_increase_pct: 12, congestion_reduction_pct: 6, accessibility_gain: 0.18, carbon_savings_tons_yr: 420, annual_benefit_usd: 900000 },
        roadmap: [{ phase: 'Design & consultation', days: 7, detail: 'Site surveys' }],
      }]);
      return okJson({});
    });

    const Recommendations = (await import('../pages/recommendations/Recommendations')).default;
    renderApp(<Recommendations />);
    await waitFor(() => expect(screen.getByText('AI Recommendation Engine')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('New feeder bus route — Manali')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /business case/i }));
    await waitFor(() => expect(screen.getAllByText('Root cause').length).toBeGreaterThan(1));
    expect(screen.getByText('Implementation roadmap')).toBeInTheDocument();
  });

  it('Copilot page sends messages and renders grounded replies', async () => {
    global.fetch = vi.fn((url, opts) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'V', role: 'analyst', email: 'a' }, role_dashboard: 'analyst' });
      if (u.includes('/copilot/chat')) {
        const body = JSON.parse(opts.body);
        expect(body.message).toBe('Show connectivity gaps');
        return okJson({
          session_id: 'sess-1', intent: 'show_connectivity_gaps',
          answer: 'I found 3 zones with connectivity gaps. Priority list: Manali — composite 0.28',
          data: { gaps: [{ zone_id: 'z', zone_name: 'Manali', composite_score: 0.28 }] },
        });
      }
      return okJson({});
    });

    const Copilot = (await import('../pages/copilot/Copilot')).default;
    renderApp(<Copilot />);
    await waitFor(() => expect(screen.getByText('AI Mobility Copilot')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Show connectivity gaps' }));
    await waitFor(() => expect(screen.getByText(/I found 3 zones with connectivity gaps/)).toBeInTheDocument());
    expect(screen.getByText('show connectivity gaps')).toBeInTheDocument();
  });

  it('Reports page generates reports through the API', async () => {
    let posted = null;
    global.fetch = vi.fn((url, opts) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'V', role: 'analyst', email: 'a' }, role_dashboard: 'analyst' });
      if (u.includes('/reports') && opts && opts.method === 'POST') {
        posted = JSON.parse(opts.body);
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ success: true, data: { report: { id: 'rep1' }, bytes: 2048 } }) });
      }
      if (u.includes('/reports')) return okJson([{
        id: 'rep9', title: 'Smart Mobility Overview (monthly)', report_type: 'mobility_overview',
        period: 'monthly', format: 'pdf', generated_at: '2026-09-20T10:00:00Z',
      }]);
      return okJson({});
    });

    const Reports = (await import('../pages/reports/Reports')).default;
    renderApp(<Reports />);
    await waitFor(() => expect(screen.getByText('Report Generator')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted.reportType).toBe('mobility_overview');
    expect(posted.format).toBe('pdf');
    await waitFor(() => expect(screen.getByText('Smart Mobility Overview (monthly)')).toBeInTheDocument());
  });

  it('Admin page blocks non-admin dashboards via route guard pattern', async () => {
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/me')) return okJson({ user: { id: 'u1', full_name: 'A', role: 'administrator', email: 'a' }, role_dashboard: 'admin' });
      if (u.includes('/admin/users')) return okJson([
        { id: 'u2', full_name: 'Rahul Das', email: 'analyst@urbanflow.ai', role: 'analyst', is_active: true, last_login_at: null },
      ]);
      if (u.includes('/admin/audit')) return okJson([]);
      return okJson({});
    });

    const Admin = (await import('../pages/admin/Admin')).default;
    renderApp(<Admin />, 'administrator');
    await waitFor(() => expect(screen.getByText('Administration Portal')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Rahul Das')).toBeInTheDocument());
    expect(screen.getByText('RBAC capability matrix')).toBeInTheDocument();
  });
});
