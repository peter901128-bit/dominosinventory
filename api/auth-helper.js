const crypto = require('crypto');

function getSign() {
  const secret = process.env.TEAM_PASSWORD || '';
  return crypto.createHmac('sha256', secret).update('verified').digest('hex');
}

function parseCookie(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...v] = part.trim().split('=');
    if (key && v.length) acc[key] = v.join('=').trim();
    return acc;
  }, {});
}

function isAuthenticated(req) {
  const cookie = parseCookie(req.headers.cookie);
  return cookie.auth === getSign();
}

module.exports = { getSign, parseCookie, isAuthenticated };
