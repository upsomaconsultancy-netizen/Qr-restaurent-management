const { v4: uuid } = require('uuid');
const Joi = require('joi');
const User = require('../models/User');
const Outlet = require('../models/Outlet');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/jwt');
const { audit } = require('../utils/audit');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

async function issueTokens(user, req, res) {
  const payload = { sub: user._id.toString(), role: user.role, restaurantId: user.restaurantId, outletId: user.outletId || null };
  const access = signAccess(payload);
  const refresh = signRefresh({ sub: payload.sub, jti: uuid() });
  await RefreshToken.create({
    userId: user._id,
    token: refresh,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  res.cookie('refreshToken', refresh, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth'
  });
  return { accessToken: access };
}

exports.login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Invalid credentials format');

  const user = await User.findOne({ email: value.email, isDeleted: false }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.checkPassword(value.password))) {
    audit({ req, action: 'LOGIN_FAILED', entity: 'User', meta: { email: value.email } });
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Block login if the outlet assigned to this WAITER/KITCHEN is inactive
  if (['WAITER', 'KITCHEN'].includes(user.role) && user.outletId) {
    const outlet = await Outlet.findOne({ _id: user.outletId, isDeleted: false }).lean();
    if (!outlet || outlet.status !== 'ACTIVE') {
      audit({ req, restaurantId: user.restaurantId, action: 'LOGIN_BLOCKED_OUTLET_INACTIVE', entity: 'User', entityId: user._id });
      throw ApiError.forbidden('This outlet has been deactivated. Please contact your main branch.', 'OUTLET_INACTIVE');
    }
  }

  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip;
  await user.save();
  audit({ req, restaurantId: user.restaurantId, action: 'LOGIN', entity: 'User', entityId: user._id });

  const { accessToken } = await issueTokens(user, req, res);
  res.json({
    success: true,
    data: {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurantId, outletId: user.outletId || null }
    }
  });
};

exports.refresh = async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  let payload;
  try { payload = verifyRefresh(token); } catch { throw ApiError.unauthorized('Invalid refresh token'); }

  const stored = await RefreshToken.findOne({ token, revokedAt: null });
  if (!stored) throw ApiError.unauthorized('Refresh token revoked');

  const user = await User.findOne({ _id: payload.sub, isDeleted: false, isActive: true });
  if (!user) throw ApiError.unauthorized('User disabled');

  // rotation: revoke old, issue new
  stored.revokedAt = new Date();
  await stored.save();
  const { accessToken } = await issueTokens(user, req, res);
  res.json({ success: true, data: { accessToken } });
};

exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) await RefreshToken.updateOne({ token }, { revokedAt: new Date() });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
};
