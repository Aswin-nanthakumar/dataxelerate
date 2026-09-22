import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
  secondary: 'bg-white text-text-primary border border-border hover:bg-surface',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
  success: 'bg-success text-white hover:bg-success/90 shadow-sm',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-9 w-9',
};

export function Button({
  variant = 'primary', size = 'md', className, loading, children, disabled, ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        variants[variant], sizes[size], className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
          <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function IconButton({ className, label, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors', className)}
      {...props}
    >
      {children}
    </button>
  );
}
