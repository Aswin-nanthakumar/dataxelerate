'use strict';

/** Uniform JSON envelopes + HTTP error type. */

class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function ok(res, data, meta = undefined) {
  return res.json({ success: true, data, ...(meta ? { meta } : {}) });
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function fail(res, status, message, details = null) {
  return res.status(status).json({ success: false, error: { message, details } });
}

module.exports = { HttpError, ok, created, fail };
