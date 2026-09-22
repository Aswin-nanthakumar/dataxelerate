import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { Icons } from './Icons';
import { cn } from '../../utils/cn';

/**
 * Role-aware navigation. Every role sees the modules it has permission for;
 * Administration is administrator-only, Simulation requires plan rights.
 */
const NAV = [
  { to: '/dashboard', label: 'Smart Mobility', icon: 'dashboard', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/map', label: 'Smart City Map', icon: 'map', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/connectivity', label: 'Connectivity', icon: 'connectivity', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/first-mile', label: 'First-Mile', icon: 'firstMile', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/last-mile', label: 'Last-Mile', icon: 'lastMile', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/forecasting', label: 'Demand Forecasting', icon: 'forecast', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/gap-urgency', label: 'Gap Urgency', icon: 'gaps', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/recommendations', label: 'Recommendations', icon: 'recommend', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/copilot', label: 'AI Mobility Copilot', icon: 'copilot', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/simulation', label: 'What-If Simulation', icon: 'simulate', roles: ['administrator', 'city_planner', 'transport_authority'] },
  { to: '/reports', label: 'Report Generator', icon: 'reports', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/notifications', label: 'Notifications', icon: 'bell', roles: ['administrator', 'city_planner', 'transport_authority', 'analyst'] },
  { to: '/admin', label: 'Administration', icon: 'admin', roles: ['administrator'] },
];

export function Sidebar({ open, onClose }) {
  const { user, role, logout } = useAuth();
  const items = NAV.filter((n) => !role || n.roles.includes(role));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-sidebar/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-white transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary navigation"
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
              <path d="M6 24 L11 8 L16 19 L21 6 L26 24" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">URBANFLOW <span className="text-primary">AI</span></p>
            <p className="text-[10px] text-slate-400">Smart Urban Mobility Analytics</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const Icon = Icons[item.icon];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'nav-link',
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="nav-indicator" className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" />
                    )}
                    <Icon width={17} height={17} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold">
              {(user?.full_name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.full_name}</p>
              <p className="truncate text-[10px] text-slate-400">{ROLE_LABELS[role] || role}</p>
            </div>
            <button onClick={logout} title="Sign out" aria-label="Sign out" className="text-slate-400 hover:text-white transition-colors">
              <Icons.logout width={16} height={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export { NAV };
