'use strict';

const { validationResult } = require('express-validator');
const { HttpError } = require('../utils/response');

/** Runs express-validator chains and 422s on failure. */
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return next(new HttpError(422, 'Validation failed', errors.array().map((e) => ({
      field: e.path, message: e.msg, value: e.value,
    }))));
  };
}

module.exports = { validate };
