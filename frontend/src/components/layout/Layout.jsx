import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar, NAV } from './Sidebar';
import { IconButton } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { Icons } from './Icons';

export function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { role, user } = useAuth();
  const { pathname } = useLocation();
  const current = NAV.find((n) => pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white/90 backdrop-blur px-4 sm:px-6">
          <IconButton label="Open navigation" className="lg:hidden -ml-1" onClick={() => setOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </IconButton>
          <h1 className="text-sm font-semibold text-text-primary truncate">{current?.label || 'URBANFLOW AI'}</h1>
          <div className="ml-auto flex items-center gap-3">
            <Badge tone="primary">{ROLE_LABELS[role] || role}</Badge>
            <span className="hidden sm:block text-xs text-text-secondary truncate max-w-[160px]">{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-[1500px] w-full mx-auto">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-3 text-[11px] text-text-secondary flex flex-wrap gap-x-4 justify-between bg-white">
          <span>URBANFLOW AI — AI-Powered Smart Urban Mobility Analytics &amp; First/Last-Mile Connectivity Prediction</span>
          <span>Chennai Metropolitan Mobility Authority · Asia/Kolkata</span>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-up">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
        {description && <p className="text-xs text-text-secondary mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
