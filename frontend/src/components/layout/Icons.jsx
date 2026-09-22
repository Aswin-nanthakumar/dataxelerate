import React from 'react';

const s = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icons = {
  dashboard: (p) => <svg {...s} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  map: (p) => <svg {...s} {...p}><path d="M9 20 3 17V4l6 3 6-3 6 3v13l-6 3-6-3z" /><path d="M9 7v13M15 4v13" /></svg>,
  connectivity: (p) => <svg {...s} {...p}><circle cx="5" cy="12" r="2.4" /><circle cx="19" cy="5" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="m7.2 10.9 9.5-5M7.2 13.1l9.5 5" /></svg>,
  firstMile: (p) => <svg {...s} {...p}><circle cx="6" cy="18" r="2.5" /><path d="M8.5 18h4l3-12h3" /><path d="m13 18 2 3M13 18l-2 3" /></svg>,
  lastMile: (p) => <svg {...s} {...p}><path d="M3 11h10l2-6h4" /><circle cx="18" cy="18" r="2.5" /><path d="M15.5 18h-4" /><path d="m5 18-2 3M5 18l2 3" /></svg>,
  forecast: (p) => <svg {...s} {...p}><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>,
  gaps: (p) => <svg {...s} {...p}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /><circle cx="12" cy="12" r="3" /></svg>,
  recommend: (p) => <svg {...s} {...p}><path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2z" /><path d="M9 22h6" /></svg>,
  copilot: (p) => <svg {...s} {...p}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></svg>,
  simulate: (p) => <svg {...s} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>,
  reports: (p) => <svg {...s} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>,
  bell: (p) => <svg {...s} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  admin: (p) => <svg {...s} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>,
  logout: (p) => <svg {...s} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>,
  search: (p) => <svg {...s} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  bus: (p) => <svg {...s} {...p}><rect x="4" y="3" width="16" height="14" rx="2" /><path d="M4 10h16M8 21v-2M16 21v-2" /><circle cx="8.5" cy="14" r="0.5" fill="currentColor" /><circle cx="15.5" cy="14" r="0.5" fill="currentColor" /></svg>,
  download: (p) => <svg {...s} {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>,
  plus: (p) => <svg {...s} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  zap: (p) => <svg {...s} {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></svg>,
  users: (p) => <svg {...s} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
};
