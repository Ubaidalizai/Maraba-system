const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken.model');

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_EXPIRES_MS = parseInt(
  process.env.REFRESH_COOKIE_MAX_AGE || String(24 * 60 * 60 * 1000),
  10
);

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function getRequestMeta(req) {
  return req?.headers?.['user-agent'] || undefined;
}

async function createRefreshSession(userId, req) {
  const rawToken = generateRawRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);

  await RefreshToken.create({
    user: userId,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt,
    userAgent: getRequestMeta(req),
  });

  return { rawToken, expiresAt };
}

async function findValidRefreshSession(rawToken) {
  if (!rawToken) return null;

  const session = await RefreshToken.findOne({
    tokenHash: hashRefreshToken(rawToken),
    expiresAt: { $gt: new Date() },
  });

  return session;
}

async function rotateRefreshSession(rawToken, req) {
  const session = await findValidRefreshSession(rawToken);
  if (!session) return null;

  const userId = session.user;
  await RefreshToken.deleteOne({ _id: session._id });
  const created = await createRefreshSession(userId, req);
  return { userId, ...created };
}

async function revokeRefreshSession(rawToken) {
  if (!rawToken) return;
  await RefreshToken.deleteOne({ tokenHash: hashRefreshToken(rawToken) });
}

async function revokeAllUserRefreshSessions(userId) {
  await RefreshToken.deleteMany({ user: userId });
}

module.exports = {
  createRefreshSession,
  findValidRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
  revokeAllUserRefreshSessions,
};
