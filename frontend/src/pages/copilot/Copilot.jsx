import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useCopilotChat } from '../../hooks/useApi';
import { PageHeader } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ScorePill } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { fmt } from '../../utils/cn';

const SUGGESTIONS = [
  'Show connectivity gaps',
  "Predict next month's demand",
  'Which regions require new feeder buses?',
  'Generate transit improvement report',
  'Show congestion hotspots',
  'Rank gap urgency zones',
];

export default function Copilot() {
  const { user } = useAuth();
  const chat = useCopilotChat();
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [thread, setThread] = useState([
    {
      role: 'assistant',
      content: `Hello ${user.full_name.split(' ')[0]} — I'm the URBANFLOW Mobility Copilot. Ask me about connectivity gaps, demand forecasts, feeder recommendations, reports or scenarios. All answers are grounded in live platform analytics.`,
    },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' }); }, [thread]);

  const send = async (text) => {
    const content = (text ?? message).trim();
    if (!content) return;
    setMessage('');
    setThread((t) => [...t, { role: 'user', content }]);
    try {
      const res = await chat.mutateAsync({ message: content, sessionId: sessionId || undefined });
      setSessionId(res.data.session_id);
      setThread((t) => [...t, { role: 'assistant', content: res.data.answer, intent: res.data.intent, data: res.data.data }]);
    } catch (e) {
      setThread((t) => [...t, { role: 'assistant', content: `Sorry — ${e.message}` }]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <PageHeader
        title="AI Mobility Copilot"
        description="Natural-language analytics: database querying, analytics explanations, report generation, AI recommendations and scenario analysis — always grounded in live data."
        actions={<Badge tone="primary" dot>{sessionId ? `Session ${sessionId.slice(0, 8)}` : 'New session'}</Badge>}
      />

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {thread.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-surface border border-border rounded-bl-md'
              }`}
              >
                {m.intent && <Badge tone="neutral" className="mb-2">{m.intent.replace(/_/g, ' ')}</Badge>}
                <p className="whitespace-pre-wrap">{m.content}</p>
                <InlineData data={m.data} />
              </div>
            </motion.div>
          ))}
          {chat.isPending && (
            <div className="flex gap-1.5 px-4 py-3 w-fit bg-surface border border-border rounded-2xl">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-2 w-2 rounded-full bg-text-secondary"
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="badge bg-surface border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <Input
              placeholder="Ask about gaps, demand, routes, reports…"
              value={message} onChange={(e) => setMessage(e.target.value)}
              aria-label="Message the copilot"
            />
            <Button type="submit" loading={chat.isPending}>Send</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InlineData({ data }) {
  if (!data) return null;
  if (data.gaps) {
    return (
      <div className="mt-3 space-y-1.5">
        {data.gaps.slice(0, 3).map((g) => (
          <div key={g.zone_id} className="flex items-center justify-between rounded-lg bg-white border border-border px-3 py-2 text-xs">
            <span>{g.zone_name}</span><ScorePill score={g.composite_score} />
          </div>
        ))}
      </div>
    );
  }
  if (data.forecast) {
    return (
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {data.forecast.predictions.slice(0, 3).map((p) => (
          <div key={p.predicted_at} className="rounded-lg bg-white border border-border px-2 py-2 text-center text-xs">
            <p className="text-text-secondary text-[10px]">{fmt.dateTime(p.predicted_at)}</p>
            <p className="font-semibold">{fmt.num(p.predicted_value)}</p>
          </div>
        ))}
      </div>
    );
  }
  if (data.recommendations) {
    return (
      <div className="mt-3 space-y-1.5">
        {data.recommendations.slice(0, 3).map((r) => (
          <div key={r.id || r.title} className="rounded-lg bg-white border border-border px-3 py-2 text-xs">
            <p className="font-medium">{r.title}</p>
            <p className="text-text-secondary">{fmt.usd(r.estimated_cost_usd)} · ROI {r.roi} · {r.priority_level}</p>
          </div>
        ))}
      </div>
    );
  }
  if (data.hotspots) {
    return (
      <div className="mt-3 space-y-1">
        {data.hotspots.slice(0, 3).map((h) => (
          <div key={h.segment_name} className="flex justify-between rounded-lg bg-white border border-border px-3 py-1.5 text-xs">
            <span>{h.segment_name}</span><span className="text-text-secondary">p95 {h.p95_congestion}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
