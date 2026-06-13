const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccess(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
}
function signRefresh(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
}
function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}
function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
