import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';

const DEMO = [
  ['admin@urbanflow.ai', 'Administrator'],
  ['planner@urbanflow.ai', 'City Planner'],
  ['authority@urbanflow.ai', 'Transportation Authority'],
  ['analyst@urbanflow.ai', 'Analyst'],
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('admin@urbanflow.ai');
  const [password, setPassword] = useState('Urbanflow#2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      toast('Welcome back to URBANFLOW AI', 'success');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar p-12 text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <svg width="22" height="22" viewBox="0 0 32 32"><path d="M6 24 L11 8 L16 19 L21 6 L26 24" stroke="#2563EB" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">URBANFLOW AI</span>
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-snug">
            AI-Powered Smart Urban Mobility Analytics
          </h1>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            First/Last-Mile connectivity prediction, demand forecasting, gap-urgency prioritisation
            and AI-driven transit investment recommendations — one platform for city planners and
            transportation authorities.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[['12', 'Wards modelled'], ['8', 'Transit routes'], ['45d', 'History depth']].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/5 p-4">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-[11px] text-slate-400 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>
        <p className="text-[11px] text-slate-500">Chennai Metropolitan Mobility Authority · Production deployment ready</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="text-xs text-text-secondary mt-1">Access your mobility intelligence workspace</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            {error && <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2" role="alert">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="lg">Sign in securely</Button>
          </form>

          <div className="mt-8 rounded-xl border border-border bg-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Demo accounts · password Urbanflow#2026</p>
            <div className="mt-3 space-y-1.5">
              {DEMO.map(([e, role]) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmail(e); setPassword('Urbanflow#2026'); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white transition-colors"
                >
                  <span className="text-text-primary font-medium">{e}</span>
                  <Badge tone="neutral">{role}</Badge>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-6 text-[11px] text-text-secondary">JWT + refresh-token rotation · bcrypt · RBAC · rate limiting</p>
        </motion.div>
      </div>
    </div>
  );
}
