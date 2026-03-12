const nodemailer = require('nodemailer');
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
  const cookie = parseCookie(req.headers && req.headers.cookie);
  return cookie.auth === getSign();
}

const SENDER = 'peter901128@gmail.com';

function buildBody(items) {
  const lines = ['[재고 발주 안내]', '', '아래 품목은 재고 부족으로 발주를 권장합니다.', ''];
  items.forEach((row, i) => {
    const unit = row.단위 ? ` (${row.단위})` : '';
    lines.push(`${i + 1}. ${row.품목 || ''}${unit}`);
    lines.push(`   - 현재고: ${row.현재고}, 최소고: ${row.최소고}, 발주 권장: ${row.발주권장}`);
    if (row.공급처) lines.push(`   - 공급처: ${row.공급처}`);
    lines.push('');
  });
  return lines.join('\n');
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const items = body.items || [];
  const extraTo = body.extra_to || [];
  if (items.length === 0) {
    res.status(400).json({ error: '발주할 품목이 없습니다.' });
    return;
  }
  const toList = Array.isArray(extraTo) ? extraTo : [extraTo];
  const toEmails = [...new Set([...toList, 'peter901128@gmail.com'].filter((e) => e && String(e).includes('@')))];
  if (toEmails.length === 0) {
    res.status(400).json({ error: '수신 이메일이 없습니다.' });
    return;
  }
  const password = (process.env.GMAIL_APP_PASSWORD || '').trim();
  if (!password) {
    res.status(500).json({ error: 'GMAIL_APP_PASSWORD가 설정되지 않았습니다.' });
    return;
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SENDER, pass: password },
  });
  const text = buildBody(items);
  try {
    await transporter.sendMail({
      from: SENDER,
      to: toEmails.join(', '),
      subject: '[재고 발주] 발주 권장 품목 안내',
      text,
    });
    res.status(200).json({ ok: true, sent_to: toEmails });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || '메일 발송 실패' });
  }
};
