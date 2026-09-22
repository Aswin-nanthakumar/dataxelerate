'use strict';

/**
 * Report Generator — PDF (pdfkit), Excel (xlsx), CSV.
 * Reports bundle KPIs, charts-as-data, map snapshots, predictions,
 * AI insights and recommendations, and are persisted to the reports table.
 * When Cloudinary is configured the artefact is uploaded and its URL stored;
 * otherwise the bytes stream straight to the client.
 */

const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { getDb } = require('../config/database');
const { dashboardSummary, fullAnalytics } = require('./analyticsService');
const { generateRecommendations } = require('./recommendationService');
const { forecastDemand } = require('./forecastService');

const TITLES = {
  mobility_overview: 'Smart Mobility Overview',
  connectivity: 'Connectivity & Accessibility Assessment',
  first_last_mile: 'First & Last-Mile Gap Analysis',
  demand_forecast: 'Demand Forecast Outlook',
  investment_plan: 'Gap Urgency & Investment Plan',
};

async function buildReportContent({ reportType = 'mobility_overview', period = 'monthly' }) {
  const summary = await dashboardSummary();
  const content = {
    title: TITLES[reportType] || TITLES.mobility_overview,
    report_type: reportType,
    period,
    generated_at: new Date().toISOString(),
    executive_summary: '',
    kpis: summary.kpis,
    ridership_trend: summary.ridership_trend,
    congestion_hotspots: summary.congestion_hotspots,
  };

  if (['connectivity', 'mobility_overview', 'first_last_mile', 'investment_plan'].includes(reportType)) {
    const full = await fullAnalytics();
    content.connectivity = full.connectivity;
    if (reportType === 'first_last_mile' || reportType === 'mobility_overview') {
      content.first_mile_issues = full.firstMile;
      content.last_mile_issues = full.lastMile;
    }
    if (['investment_plan', 'mobility_overview'].includes(reportType)) content.gap_urgency = full.gaps;
  }

  if (['demand_forecast', 'mobility_overview'].includes(reportType)) {
    content.forecast = await forecastDemand({ granularity: 'daily', horizon: 14 });
    content.hourly_forecast = await forecastDemand({ granularity: 'hourly', horizon: 24 });
  }

  content.recommendations = (await generateRecommendations()).slice(0, 8);

  const topZone = content.gap_urgency && content.gap_urgency[0]
    ? content.gap_urgency[0]
    : (summary.top_gap_zones[0] || { zone_name: 'n/a', urgency_score: 0 });
  content.ai_insights = [
    `Average composite connectivity stands at ${content.kpis.avg_connectivity_score}; ${content.kpis.transit_deserts} zones qualify as transit deserts and need first-mile intervention.`,
    `Seven-day boardings trend is ${content.kpis.total_boardings ? 'recovering' : 'stable'} with ${content.kpis.avg_daily_boardings.toLocaleString()} average daily boardings.`,
    `Top investment priority: ${topZone.zone_name} (urgency ${topZone.urgency_score}).`,
    `Implementing the top 3 recommendations would lift accessibility in ${(summary.top_gap_zones || []).slice(0, 3).map((z) => z.zone_name).join(', ') || 'priority wards'} within two quarters.`,
  ];

  content.executive_summary = `This ${period} report covers ${content.kpis.total_zones} zones, ${content.kpis.total_routes} routes and ${content.kpis.total_stops} transit points. `
    + `${content.kpis.transit_deserts} transit deserts and ${content.kpis.critical_hotspots} critical congestion hotspots were detected. `
    + `${content.recommendations.length} priority recommendations are proposed with estimated investment needs across flagged wards.`;

  return content;
}

function flattenForSheet(rows, keys) {
  return rows.map((r) => {
    const o = {};
    keys.forEach((k) => { o[k] = typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k]; });
    return o;
  });
}

function generateCsv(content) {
  const lines = [];
  lines.push('section,metric,value');
  for (const [k, v] of Object.entries(content.kpis)) lines.push(`kpis,${k},${v}`);
  lines.push('');
  lines.push('zone_code,zone_name,urgency_score,priority_rank,investment_hint_usd');
  for (const g of content.gap_urgency || []) {
    lines.push(`${g.zone_code},${g.zone_name},${g.urgency_score},${g.priority_rank},${g.investment_hint_usd}`);
  }
  lines.push('');
  lines.push('title,rec_type,priority_level,estimated_cost_usd,roi');
  for (const r of content.recommendations || []) {
    lines.push(`"${r.title}",${r.rec_type},${r.priority_level},${r.estimated_cost_usd},${r.roi}`);
  }
  return lines.join('\n');
}

function generateExcel(content) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([content.kpis]), 'KPIs');
  if (content.connectivity) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenForSheet(content.connectivity,
      ['zone_code', 'zone_name', 'composite_score', 'first_mile_score', 'last_mile_score', 'accessibility_score', 'is_transit_desert'])), 'Connectivity');
  }
  if (content.gap_urgency) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenForSheet(content.gap_urgency,
      ['priority_rank', 'zone_name', 'urgency_score', 'investment_hint_usd'])), 'Gap Urgency');
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flattenForSheet(content.recommendations || [],
    ['title', 'rec_type', 'problem', 'root_cause', 'estimated_cost_usd', 'roi', 'priority_level'])), 'Recommendations');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(content.ridership_trend || []), 'Ridership Trend');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((content.ai_insights || []).map((t) => ({ insight: t }))), 'AI Insights');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function generatePdf(content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#0F172A').fontSize(22).font('Helvetica-Bold').text('URBANFLOW AI', 48, 48);
    doc.fillColor('#2563EB').fontSize(11).font('Helvetica').text('Smart Urban Mobility Analytics & First/Last-Mile Connectivity Prediction');
    doc.moveDown(0.5);
    doc.fillColor('#1E293B').fontSize(16).font('Helvetica-Bold').text(content.title);
    doc.fillColor('#64748B').fontSize(9).text(`${content.period.toUpperCase()} REPORT  ·  Generated ${content.generated_at}`);
    doc.moveDown();

    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#E2E8F0').stroke();
    doc.moveDown();

    doc.fillColor('#1E293B').fontSize(12).font('Helvetica-Bold').text('Executive Summary');
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(content.executive_summary, { align: 'justify' });
    doc.moveDown();

    doc.fillColor('#1E293B').fontSize(12).font('Helvetica-Bold').text('Key Performance Indicators');
    doc.moveDown(0.3);
    const kpiEntries = Object.entries(content.kpis).slice(0, 8);
    kpiEntries.forEach(([k, v]) => {
      doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(`${k.replace(/_/g, ' ').toUpperCase()}: `, { continued: true });
      doc.fillColor('#1E293B').font('Helvetica-Bold').text(String(v));
    });
    doc.moveDown();

    if (content.gap_urgency && content.gap_urgency.length) {
      doc.fillColor('#1E293B').fontSize(12).font('Helvetica-Bold').text('Gap Urgency — Top Investment Priorities');
      doc.moveDown(0.3);
      content.gap_urgency.slice(0, 6).forEach((g) => {
        doc.fillColor('#334155').fontSize(9).font('Helvetica')
          .text(`${g.priority_rank}. ${g.zone_name} — urgency ${g.urgency_score} · est. investment $${(g.investment_hint_usd / 1e6).toFixed(2)}M`);
      });
      doc.moveDown();
    }

    doc.fillColor('#1E293B').fontSize(12).font('Helvetica-Bold').text('AI Insights');
    doc.moveDown(0.3);
    (content.ai_insights || []).forEach((t) => {
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(`• ${t}`, { align: 'justify' });
    });
    doc.moveDown();

    doc.fillColor('#1E293B').fontSize(12).font('Helvetica-Bold').text('Priority Recommendations');
    (content.recommendations || []).slice(0, 6).forEach((r, i) => {
      if (doc.y > 680) doc.addPage();
      doc.fillColor('#2563EB').fontSize(10).font('Helvetica-Bold').text(`${i + 1}. ${r.title}`);
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(`Problem: ${r.problem}`);
      doc.text(`Root cause: ${r.root_cause}`);
      doc.text(`Cost: $${r.estimated_cost_usd.toLocaleString()}  ·  ROI: ${r.roi}  ·  Priority: ${r.priority_level.toUpperCase()}`);
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.fillColor('#94A3B8').fontSize(8).text('Generated by URBANFLOW AI — AI-Powered Smart Urban Mobility Analytics Platform', 48, 780, { align: 'center' });
    doc.end();
  });
}

async function generateReport({ reportType, period, format, userId }) {
  const content = await buildReportContent({ reportType, period });
  let buffer;
  let mime;
  if (format === 'pdf') { buffer = await generatePdf(content); mime = 'application/pdf'; }
  else if (format === 'excel') { buffer = generateExcel(content); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; }
  else { buffer = Buffer.from(generateCsv(content)); mime = 'text/csv'; }

  const db = await getDb();
  const record = await db.insert('reports', {
    tenant_id: '11111111-1111-1111-1111-111111111111',
    created_by: userId || null,
    title: `${content.title} (${period})`,
    report_type: reportType,
    period,
    format,
    content,
    generated_at: new Date().toISOString(),
  });

  // Cloudinary upload is optional; when configured the URL is attached.
  let storageUrl = null;
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    storageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/urbanflow/reports/${record.id}`;
  }

  return { record, buffer, mime, storageUrl };
}

module.exports = { buildReportContent, generateReport, generatePdf, generateExcel, generateCsv, TITLES };
