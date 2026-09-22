import React from 'react';
import { useAdminUsers, useUpdateUser, useAuditLog } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Select } from '../../components/ui/Input';
import { PageSkeleton, ErrorState, Switch } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { ROLE_LABELS } from '../../context/AuthContext';
import { fmt } from '../../utils/cn';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function Admin() {
  const { data, isLoading, error, refetch } = useAdminUsers();
  const { data: audit } = useAuditLog();
  const update = useUpdateUser();
  const toast = useToast();

  return (
    <div>
      <PageHeader
        title="Administration Portal"
        description="User management, RBAC role assignment and platform audit trail. Administrator-only workspace."
        actions={<Badge tone="danger">Administrator</Badge>}
      />

      <Card className="mb-4">
        <CardHeader title="Users & roles" subtitle="Roles gate every API capability and dashboard" />
        {isLoading && <PageSkeleton />}
        {error && <ErrorState error={error} retry={refetch} />}
        {data && (
          <Table
            columns={[
              {
                key: 'user', label: 'User',
                render: (u) => (
                  <div>
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-[11px] text-text-secondary">{u.email}</p>
                  </div>
                ),
              },
              {
                key: 'role', label: 'Role',
                render: (u) => (
                  <Select
                    value={u.role}
                    options={ROLE_OPTIONS}
                    onChange={async (e) => {
                      try {
                        await update.mutateAsync({ id: u.id, role: e.target.value });
                        toast('Role updated', 'success');
                        refetch();
                      } catch (err) { toast(err.message, 'error'); }
                    }}
                  />
                ),
              },
              { key: 'dash', label: 'Dashboard', render: (u) => <Badge tone="primary">{{
                administrator: 'Admin', city_planner: 'Planner', transport_authority: 'Operations', analyst: 'Analyst',
              }[u.role]}</Badge> },
              { key: 'login', label: 'Last login', render: (u) => (u.last_login_at ? fmt.dateTime(u.last_login_at) : '—') },
              {
                key: 'active', label: 'Active',
                render: (u) => (
                  <Switch
                    checked={u.is_active !== false}
                    label={`Toggle ${u.email}`}
                    onChange={async (v) => {
                      try {
                        await update.mutateAsync({ id: u.id, is_active: v });
                        refetch();
                      } catch (err) { toast(err.message, 'error'); }
                    }}
                  />
                ),
              },
            ]}
            rows={data.data}
            rowKey={(u) => u.id}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="RBAC capability matrix" subtitle="Which role may call which capability" />
          <Table
            columns={[
              { key: 'cap', label: 'Capability', render: (r) => <span className="font-mono text-xs">{r.cap}</span> },
              {
                key: 'roles', label: 'Roles',
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.roles.map((role) => <Badge key={role} tone="neutral">{ROLE_LABELS[role]}</Badge>)}
                  </div>
                ),
              },
            ]}
            rows={[
              { cap: 'users:read / users:write', roles: ['administrator'] },
              { cap: 'admin:settings / audit:read', roles: ['administrator'] },
              { cap: 'recommendations:write', roles: ['administrator', 'city_planner', 'transport_authority'] },
              { cap: 'recommendations:approve', roles: ['administrator', 'transport_authority'] },
              { cap: 'simulation:run', roles: ['administrator', 'city_planner', 'transport_authority'] },
              { cap: 'reports:write', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
              { cap: 'analytics:read / copilot:use', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
            ]}
            rowKey={(r) => r.cap}
          />
        </Card>

        <Card>
          <CardHeader title="Audit trail" subtitle="Recent privileged actions across the platform" />
          {audit && (
            <Table
              columns={[
                { key: 'action', label: 'Action', render: (a) => <span className="font-medium">{a.action}</span> },
                { key: 'entity', label: 'Entity', render: (a) => a.entity || '—' },
                { key: 'time', label: 'When', render: (a) => fmt.dateTime(a.created_at) },
              ]}
              rows={audit.data}
              rowKey={(a) => a.id}
              empty="No audit entries yet — actions appear here as users work"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
