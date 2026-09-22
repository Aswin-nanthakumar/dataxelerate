import React from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { scoreColor } from '../../utils/cn';

const AXIS = { stroke: '#64748B', fontSize: 10, tickLine: false, axisLine: false };
const TIP = {
  contentStyle: {
    background: '#0F172A', border: 'none', borderRadius: 8, color: '#fff',
    fontSize: 11, padding: '8px 10px', boxShadow: '0 10px 30px -12px rgb(15 23 42 / 0.4)',
  },
  labelStyle: { color: '#94A3B8', fontSize: 10 },
  itemStyle: { color: '#fff', fontSize: 11 },
  cursor: { stroke: '#E2E8F0' },
};

export function TrendChart({ data, xKey = 'date', yKey = 'boardings', height = 240, color = '#2563EB', label = 'Boardings' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} tickFormatter={(v) => (typeof v === 'string' ? v.slice(5) || v : v)} />
        <YAxis {...AXIS} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip {...TIP} />
        <Area type="monotone" dataKey={yKey} name={label} stroke={color} strokeWidth={2} fill={`url(#g-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({ history = [], forecast = [], height = 280 }) {
  const data = [
    ...history.map((h) => ({ date: h.date || h.timestamp, boardings: h.boardings, type: 'History' })),
    ...forecast.map((f) => ({
      date: (f.predicted_at || f.timestamp || '').slice(5, 10),
      boardings: f.predicted_value, lower: f.lower_bound, upper: f.upper_bound, type: 'Forecast',
    })),
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="date" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip {...TIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        <Line dataKey="boardings" name="Demand" stroke="#2563EB" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="upper" name="Upper band" stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" dot={false} />
        <Line dataKey="lower" name="Lower band" stroke="#94A3B8" strokeWidth={1} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DistributionDonut({ data, height = 220 }) {
  // data: [{ name, value }]
  const COLORS = ['#10B981', '#2563EB', '#F59E0B', '#EF4444'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip {...TIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScoreBars({ data, height = 280, xKey = 'name', yKey = 'value', colorForValue = false }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} interval={0} tick={{ fontSize: 9 }} />
        <YAxis {...AXIS} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
        <Tooltip {...TIP} />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorForValue ? scoreColor(d[yKey]) : '#2563EB'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({ data, keys, height = 260, xKey = 'name' }) {
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} interval={0} tick={{ fontSize: 9 }} />
        <YAxis {...AXIS} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
        <Tooltip {...TIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.label} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} maxBarSize={14} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ data, dataKey = 'value', height = 36, color = '#2563EB' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.08} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
