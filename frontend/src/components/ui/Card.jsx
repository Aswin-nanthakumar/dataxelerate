import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function Card({ className, children, hover, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={cn('card p-5', hover && 'hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, delta, icon, tone = 'primary', delay = 0 }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };
  return (
    <Card hover delay={delay} className="flex items-center gap-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-secondary truncate">{label}</p>
        <p className="text-xl font-semibold tracking-tight text-text-primary mt-0.5">{value}</p>
        {delta != null && (
          <p className={cn('text-[11px] font-medium mt-0.5', delta >= 0 ? 'text-success' : 'text-danger')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </p>
        )}
      </div>
    </Card>
  );
}
