const jwt = require('jsonwebtoken');

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

const ACCESS_SECRET = getEnv('JWT_SECRET', 'access-secret-dev');
const ACCESS_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '1d');
const REFRESH_SECRET = getEnv('REFRESH_JWT_SECRET', 'refresh-secret-dev');
const REFRESH_EXPIRES_IN = getEnv('REFRESH_JWT_EXPIRES_IN', '7d');

function generateAccessToken(userId) {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(userId) {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  // Short-lived access token cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: parseInt(process.env.ACCESS_COOKIE_MAX_AGE || '900000', 10), // 15m
  });

  // Long-lived refresh token cookie
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: parseInt(process.env.REFRESH_COOKIE_MAX_AGE || '604800000', 10), // 7d
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  verifyAccessToken,
  verifyRefreshToken,
};
