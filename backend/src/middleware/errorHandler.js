'use strict';

const { HttpError } = require('../utils/response');
const config = require('../config');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      error: { message: err.message, details: err.details || undefined },
    });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { message: 'Malformed JSON body' } });
  }

  console.error('[error]', err);
  const payload = { message: 'Internal server error' };
  if (config.env !== 'production' && err) payload.details = err.message;
  return res.status(500).json({ success: false, error: payload });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { message: `Route ${req.method} ${req.path} not found` } });
}

module.exports = { errorHandler, notFoundHandler };
