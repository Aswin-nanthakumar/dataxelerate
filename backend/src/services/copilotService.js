'use strict';

/**
 * AI Mobility Copilot — natural-language interface to the platform.
 *
 * Pipeline: intent classification → data retrieval (real analytics!) →
 * response composition. When GEMINI_API_KEY / OPENAI_API_KEY are set the
 * response is phrased by the LLM; otherwise the deterministic composer
 * answers with the same grounded data (no hallucinated numbers).
 */

const config = require('../config');
const { getDb } = require('../config/database');
const { dashboardSummary, fullAnalytics, congestionHotspots } = require('./analyticsService');
const { generateRecommendations } = require('./recommendationService');
const { forecastDemand } = require('./forecastService');
const { buildReportContent } = require('./reportService');

const INTENTS = [
  { intent: 'show_connectivity_gaps', rx: /(connectivity gap|transit desert|underserved|poorly connected|coverage gap)/i },
  { intent: 'predict_demand', rx: /(predict|forecast|demand next|future demand|next month|next week|next hour)/i },
  { intent: 'generate_report', rx: /(report|generate.*(pdf|excel|csv)|summary report|planning report)/i },
  { intent: 'recommend_feeder', rx: /(feeder|which regions.*(bus|feeder)|new bus|recommend|shuttle)/i },
  { intent: 'last_mile', rx: /(last[- ]mile|destination access|alight|egress)/i },
  { intent: 'first_mile', rx: /(first[- ]mile|walking distance|access barrier|reach transit)/i },
  { intent: 'congestion', rx: /(congestion|hotspot|traffic jam|slow traffic)/i },
  { intent: 'gap_urgency', rx: /(urgency|priority|invest|where to build|gap index)/i },
  { intent: 'simulation', rx: /(what[- ]?if|simulate|scenario|new stop|new station|new route)/i },
  { intent: 'dashboard', rx: /(dashboard|overview|kpi|how is|status|summary of)/i },
];

function classify(text) {
  for (const i of INTENTS) if (i.rx.test(text)) return i.intent;
  return 'general';
}

async function gatherData(intent) {
  switch (intent) {
    case 'show_connectivity_gaps': {
      const { connectivity } = await fullAnalytics();
      const gaps = connectivity.filter((c) => c.is_transit_desert || c.composite_score < 0.5)
        .sort((a, b) => a.composite_score - b.composite_score);
      return { gaps };
    }
    case 'predict_demand': {
      const daily = await forecastDemand({ granularity: 'daily', horizon: 30 });
      return { forecast: daily };
    }
    case 'generate_report': {
      const content = await buildReportContent({ reportType: 'mobility_overview', period: 'monthly' });
      return { report_ready: true, title: content.title, summary: content.executive_summary };
    }
    case 'recommend_feeder': {
      const recs = await generateRecommendations();
      return { recommendations: recs.filter((r) => ['new_bus_route', 'shuttle_service', 'route_optimization'].includes(r.rec_type)).slice(0, 6) };
    }
    case 'last_mile': case 'first_mile': {
      const { firstMile, lastMile } = await fullAnalytics();
      return { first_mile: firstMile.slice(0, 6), last_mile: lastMile.slice(0, 6) };
    }
    case 'congestion':
      return { hotspots: await congestionHotspots() };
    case 'gap_urgency': {
      const { gaps } = await fullAnalytics();
      return { gap_urgency: gaps.slice(0, 8) };
    }
    case 'simulation':
      return {
        simulation_hint: 'Open the What-If Simulation module, drop a proposed stop/route/station on the map, and run the scenario to see ridership, congestion, accessibility and carbon deltas.',
      };
    case 'dashboard':
    default:
      return { summary: await dashboardSummary() };
  }
}

function composeAnswer(intent, data) {
  switch (intent) {
    case 'show_connectivity_gaps': {
      const top = data.gaps.slice(0, 5);
      return `I found ${data.gaps.length} zones with connectivity gaps (transit deserts or composite score < 0.50). Priority list:\n`
        + top.map((g, i) => `${i + 1}. ${g.zone_name} — composite ${g.composite_score}, nearest transit ${g.details.nearest_transit_km} km${g.is_transit_desert ? ' [TRANSIT DESERT]' : ''}`).join('\n')
        + `\n\nRecommended next step: run the First-Mile module for intervention ideas for ${top[0] ? top[0].zone_name : 'the worst-affected ward'}.`;
    }
    case 'predict_demand': {
      const f = data.forecast;
      const first = f.predictions[0]; const last = f.predictions[f.predictions.length - 1];
      return `30-day demand forecast (${f.model_name}): trend ${f.trend_pct >= 0 ? '+' : ''}${f.trend_pct}% vs recent baseline.\n`
        + `• Next day: ${Math.round(first.predicted_value).toLocaleString()} boardings (${Math.round(first.lower_bound).toLocaleString()}–${Math.round(first.upper_bound).toLocaleString()}, confidence ${first.confidence})\n`
        + `• Day 30: ${Math.round(last.predicted_value).toLocaleString()} boardings\n`
        + 'Factors: historical usage, weather, events, holidays, population growth.';
    }
    case 'generate_report':
      return `Your "${data.title}" report is ready. ${data.summary} Use the Report Generator to export it as PDF, Excel or CSV.`;
    case 'recommend_feeder': {
      const r = data.recommendations;
      if (!r.length) return 'No feeder recommendations are currently prioritised — coverage is adequate across wards.';
      return `Top feeder/service recommendations:\n`
        + r.map((x, i) => `${i + 1}. ${x.title} (${x.priority_level} priority, $${x.estimated_cost_usd.toLocaleString()}, ROI ${x.roi})\n   Problem: ${x.problem}`).join('\n');
    }
    case 'first_mile': {
      const f = data.first_mile;
      return `First-mile analysis found ${f.length} zones with access barriers. Worst:\n`
        + f.slice(0, 4).map((x, i) => `${i + 1}. ${x.zone_name}: ${x.problems[0]}`).join('\n');
    }
    case 'last_mile': {
      const l = data.last_mile;
      return `Last-mile analysis found ${l.length} zones with destination-access problems. Worst:\n`
        + l.slice(0, 4).map((x, i) => `${i + 1}. ${x.zone_name}: ${x.problems[0]}`).join('\n');
    }
    case 'congestion':
      return `Congestion hotspots:\n`
        + data.hotspots.slice(0, 4).map((h, i) => `${i + 1}. ${h.segment_name} — p95 congestion ${h.p95_congestion} (${h.hotspot_level})`).join('\n');
    case 'gap_urgency':
      return `Gap Urgency ranking (top investment priorities):\n`
        + data.gap_urgency.map((g) => `${g.priority_rank}. ${g.zone_name} — urgency ${g.urgency_score}, suggested investment $${(g.investment_hint_usd / 1e6).toFixed(2)}M`).join('\n');
    case 'simulation':
      return data.simulation_hint;
    default: {
      const k = data.summary.kpis;
      return `Here's the mobility picture: ${k.total_zones} zones, ${k.total_routes} routes, ${k.transit_deserts} transit deserts, average connectivity ${k.avg_connectivity_score}, ${k.avg_daily_boardings.toLocaleString()} avg daily boardings.\n\n`
        + 'Try: "Show connectivity gaps" · "Predict next month\'s demand" · "Which regions require new feeder buses?" · "Generate transit improvement report"';
    }
  }
}

async function llmPolish(question, answer, data) {
  const system = 'You are URBANFLOW AI Mobility Copilot for city planners. Be concise, professional, data-grounded. Never invent numbers.';
  const prompt = `Question: ${question}\n\nGrounded data answer (use these exact numbers):\n${answer}\n\nRephrase slightly for a professional planner audience:`;

  if (config.ai.geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.3 },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.candidates && json.candidates[0] && json.candidates[0].content
          && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text;
        if (text && text.trim()) return text.trim();
      }
    } catch (_e) { /* fall through */ }
  }

  if (config.ai.openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ai.openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
          max_tokens: 400, temperature: 0.3,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (_e) { /* fall through */ }
  }

  return answer;
}

async function chat({ message, sessionId, user }) {
  const db = await getDb();
  const session = sessionId || require('crypto').randomUUID();
  const intent = classify(message);
  const data = await gatherData(intent);
  const grounded = composeAnswer(intent, data);
  const answer = await llmPolish(message, grounded, data);

  await db.insert('copilot_messages', {
    tenant_id: user.tenantId, user_id: user.id, session_id: session,
    role: 'user', content: message, intent, payload: {},
    created_at: new Date().toISOString(),
  });
  await db.insert('copilot_messages', {
    tenant_id: user.tenantId, user_id: user.id, session_id: session,
    role: 'assistant', content: answer, intent, payload: { grounded: grounded.slice(0, 500) },
    created_at: new Date().toISOString(),
  });

  return { session_id: session, intent, answer, data: slim(data) };
}

function slim(data) {
  // Keep payloads useful but small for the chat UI.
  if (data.gaps) return { gaps: data.gaps.slice(0, 5) };
  if (data.forecast) return { forecast: { ...data.forecast, predictions: data.forecast.predictions.slice(0, 7) } };
  if (data.recommendations) return { recommendations: data.recommendations.slice(0, 4) };
  if (data.hotspots) return { hotspots: data.hotspots.slice(0, 5) };
  if (data.gap_urgency) return { gap_urgency: data.gap_urgency.slice(0, 5) };
  return data;
}

async function history(sessionId) {
  const db = await getDb();
  const rows = await db.select('copilot_messages', { session_id: sessionId });
  rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return rows;
}

module.exports = { chat, history, classify, INTENTS };
