import React from 'react';
import { cn } from '../../utils/cn';

const tones = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface text-text-secondary border border-border',
};

export function Badge({ tone = 'neutral', className, children, dot }) {
  return (
    <span className={cn('badge', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function ScorePill({ score, label }) {
  const tone = score >= 0.75 ? 'success' : score >= 0.55 ? 'primary' : score >= 0.4 ? 'warning' : 'danger';
  return <Badge tone={tone} dot>{label ? `${label} ${Number(score).toFixed(2)}` : Number(score).toFixed(2)}</Badge>;
}
