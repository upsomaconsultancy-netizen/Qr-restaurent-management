const ApiError = require('../utils/ApiError');

/** Joi validation middleware: validate({ body, params, query }) */
function validate(schemas) {
  return (req, _res, next) => {
    for (const key of ['body', 'params', 'query']) {
      if (!schemas[key]) continue;
      const { error, value } = schemas[key].validate(req[key], { stripUnknown: true });
      if (error) return next(ApiError.badRequest('Validation failed', error.details.map(d => d.message)));
      req[key] = value;
    }
    next();
  };
}

module.exports = { validate };
