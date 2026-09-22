'use strict';

/**
 * Query helpers shared by every list endpoint:
 * pagination (page/limit), search (q), sort (sort=-field), filters.
 */

const MAX_LIMIT = 100;

function parseListQuery(query = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const q = (query.q || '').toString().trim().toLowerCase();
  const sortRaw = (query.sort || '').toString();
  const sortDesc = sortRaw.startsWith('-');
  const sortField = sortRaw.replace(/^[-+]/, '');
  return { page, limit, q, sortField, sortDesc, offset: (page - 1) * limit };
}

function paginate(rows, { page, limit }, extraMeta = {}) {
  const total = rows.length;
  const slice = rows.slice((page - 1) * limit, page * limit);
  return {
    rows: slice,
    meta: {
      page, limit, total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
      ...extraMeta,
    },
  };
}

function matchesSearch(row, q, fields = ['name', 'title', 'code']) {
  if (!q) return true;
  return fields.some((f) => String(row[f] || '').toLowerCase().includes(q));
}

module.exports = { parseListQuery, paginate, matchesSearch, MAX_LIMIT };
