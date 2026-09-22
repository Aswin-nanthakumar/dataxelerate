import React from 'react';
import { cn } from '../../utils/cn';

export function Input({ className, label, hint, error, id, ...props }) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input id={inputId} className={cn('input-base', error && 'border-danger focus:ring-danger/30', className)} {...props} />
      {hint && !error && <p className="text-[11px] text-text-secondary mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-danger mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function Select({ className, label, options = [], id, ...props }) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <select id={selectId} className={cn('input-base appearance-none bg-no-repeat pr-8', className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: 'right 10px center' }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Textarea({ className, label, id, ...props }) {
  const taId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && <label htmlFor={taId} className="block text-xs font-medium text-text-primary mb-1.5">{label}</label>}
      <textarea id={taId} className={cn('input-base min-h-[88px] resize-y', className)} {...props} />
    </div>
  );
}
