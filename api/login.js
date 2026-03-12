const crypto = require('crypto');

function getSign() {
  const secret = process.env.TEAM_PASSWORD || '';
  return crypto.createHmac('sha256', secret).update('verified').digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const password = (body.password || '').trim();
  const expected = (process.env.TEAM_PASSWORD || '').trim();
  if (!expected) {
    res.status(500).json({ error: 'TEAM_PASSWORD not configured' });
    return;
  }
  if (password !== expected) {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }
  const token = getSign();
  const isProd = process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith('localhost');
  res.setHeader(
    'Set-Cookie',
    `auth=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax${isProd ? '; Secure' : ''}`
  );
  res.status(200).json({ ok: true });
};
