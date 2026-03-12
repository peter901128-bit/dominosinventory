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

/** 항목 1개당 메일 본문 (인삿말 + 필요 수량만큼 추가 발주 요청) */
function buildBodyForItem(row) {
  const unit = row.단위 ? ` (${row.단위})` : '';
  const lines = [
    '안녕하세요.',
    '',
    '재고 관리 담당자입니다. 재고 부족 품목에 대해 추가 발주를 요청드립니다.',
    '',
    '■ 품목: ' + (row.품목 || '') + unit,
    '■ 현재고: ' + row.현재고,
    '■ 최소고: ' + row.최소고,
    '■ 발주 권장 수량: ' + row.발주권장,
    '',
    '위 필요 수량(' + row.발주권장 + (row.단위 ? row.단위 : '개') + ')만큼 추가 발주 요청드립니다.',
    '',
    '감사합니다.',
  ];
  return lines.join('\n');
}

/** 여러 항목을 한 메일 본문으로 */
function buildBodyForItems(rows) {
  const header = [
    '안녕하세요.',
    '',
    '재고 관리 담당자입니다. 재고 부족 품목에 대해 추가 발주를 요청드립니다.',
    '',
  ];
  const blocks = rows.map((row) => {
    const unit = row.단위 ? ` (${row.단위})` : '';
    return [
      '■ 품목: ' + (row.품목 || '') + unit,
      '  현재고: ' + row.현재고 + ' / 최소고: ' + row.최소고 + ' → 발주 권장: ' + row.발주권장 + (row.단위 ? row.단위 : '개'),
      '',
    ].join('\n');
  });
  const footer = [
    '위 품목들은 필요 수량만큼 추가 발주 요청드립니다.',
    '',
    '감사합니다.',
  ];
  return header.join('\n') + blocks.join('') + footer.join('\n');
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
    res.status(500).json({
      error: 'GMAIL_APP_PASSWORD가 설정되지 않았습니다. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 GMAIL_APP_PASSWORD( Gmail 앱 비밀번호 )를 추가한 뒤 재배포하세요.',
    });
    return;
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SENDER, pass: password },
  });
  try {
    if (items.length === 1) {
      const text = buildBodyForItem(items[0]);
      await transporter.sendMail({
        from: SENDER,
        to: toEmails.join(', '),
        subject: '[재고 발주] ' + (items[0].품목 || '품목') + ' - 추가 발주 요청',
        text,
      });
    } else {
      const text = buildBodyForItems(items);
      const subject = items.length > 1
        ? '[재고 발주] ' + items.length + '개 품목 - 추가 발주 요청'
        : '[재고 발주] 추가 발주 요청';
      await transporter.sendMail({
        from: SENDER,
        to: toEmails.join(', '),
        subject,
        text,
      });
    }
    res.status(200).json({ ok: true, sent_to: toEmails, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || '메일 발송 실패' });
  }
};
