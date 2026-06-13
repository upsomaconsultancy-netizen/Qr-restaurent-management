const env = require('../config/env');

function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status === 500) console.error('[error]', err);

  const details = Array.isArray(err.details) ? err.details : err.details ? [String(err.details)] : [];
  let message = err.message || 'Something went wrong';
  if (status !== 500 && details.length) {
    message = `${message}: ${details.join(', ')}`;
  }

  res.status(status).json({
    success: false,
    message: status === 500 && env.nodeEnv === 'production' ? 'Internal server error' : message,
    details: details.length ? details : undefined
  });
}

module.exports = { notFound, errorHandler };
