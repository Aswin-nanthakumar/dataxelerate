import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const fmt = {
  num: (n) => (n == null ? '—' : new Intl.NumberFormat('en-US').format(Math.round(n))),
  compact: (n) => (n == null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)),
  pct: (n, digits = 1) => (n == null ? '—' : `${(n * 100).toFixed(digits)}%`),
  usd: (n) => (n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)),
  score: (n) => (n == null ? '—' : Number(n).toFixed(2)),
  date: (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'),
  dateTime: (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'),
};

export function scoreColor(score) {
  if (score >= 0.75) return '#10B981';
  if (score >= 0.55) return '#2563EB';
  if (score >= 0.4) return '#F59E0B';
  return '#EF4444';
}

export function severityColor(sev) {
  return { critical: '#EF4444', warning: '#F59E0B', info: '#2563EB' }[sev] || '#64748B';
}

export function priorityBadge(level) {
  return {
    critical: 'bg-danger/10 text-danger',
    high: 'bg-warning/10 text-warning',
    medium: 'bg-primary/10 text-primary',
    low: 'bg-success/10 text-success',
  }[level] || 'bg-surface text-text-secondary';
}
