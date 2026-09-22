import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface border border-border', className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {icon && <div className="mb-3 text-text-secondary">{icon}</div>}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {body && <p className="text-xs text-text-secondary mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="card p-6 border-danger/30 bg-danger/5">
      <p className="text-sm font-medium text-danger">Something went wrong</p>
      <p className="text-xs text-text-secondary mt-1">{error?.message || String(error)}</p>
      {retry && (
        <button onClick={retry} className="mt-3 text-xs font-medium text-primary hover:underline">Try again</button>
      )}
    </div>
  );
}

export function ProgressBar({ value, max = 1, tone = 'primary', label }) {
  const pct = Math.min(100, (value / max) * 100);
  const tones = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' };
  return (
    <div>
      {label && (
        <div className="flex justify-between text-[11px] text-text-secondary mb-1">
          <span>{label}</span><span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', tones[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}
