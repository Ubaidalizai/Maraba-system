const jwt = require('jsonwebtoken');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

const ACCESS_SECRET = getEnv('JWT_SECRET', 'access-secret-dev');
const ACCESS_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '15m');
const ACCESS_COOKIE_MAX_AGE = parseInt(
  process.env.ACCESS_COOKIE_MAX_AGE || '900000',
  10
);
const REFRESH_COOKIE_MAX_AGE = parseInt(
  process.env.REFRESH_COOKIE_MAX_AGE || String(24 * 60 * 60 * 1000),
  10
);

function generateAccessToken(userId) {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

module.exports = {
  generateAccessToken,
  setAuthCookies,
  clearAuthCookies,
  verifyAccessToken,
};
