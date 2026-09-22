import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export function Tabs({ tabs, initial, onChange, className }) {
  const [active, setActive] = useState(initial || tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  return (
    <div className={className}>
      <div className="flex gap-1 rounded-lg bg-surface p-1 w-fit max-w-full overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => { setActive(t.id); onChange?.(t.id); }}
            className={cn(
              'px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
              active === t.id ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{current?.content}</div>
    </div>
  );
}
