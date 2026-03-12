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

/** Email Template 시트 기준: 본문 템플릿
 * 안녕하세요 {{SUPPLIER_NAME}} 담당자님.
 * 도미노피자 {{STORE_NAME}}입니다.
 * 아래 품목에 대해 발주 요청드립니다.
 * {{ITEM_LIST}}
 * 첨부한 발주서 확인 부탁드립니다.
 * 감사합니다.
 * {{INTERNAL_OWNER}}
 */
function buildItemList(rows) {
  return rows
    .map((row) => {
      const u = row.단위 || '개';
      return `· ${row.품목 || ''} (${row.규격 || ''}) | 현재고 ${row.현재고}${u} / 안전재고 ${row.안전재고 || ''}${u} → 발주 권장 ${row.발주권장}${u}`;
    })
    .join('\n');
}

function buildEmailFromTemplate(opts) {
  const storeName = opts.store_name || '점포';
  const supplierName = opts.supplier_name || '발주처';
  const orderDate = opts.order_date || new Date().toLocaleDateString('ko-KR');
  const itemList = buildItemList(opts.items || []);
  const internalOwner = opts.internal_owner || '점포 운영매니저';

  const subject = `[발주요청] ${storeName} / ${supplierName} / ${orderDate}`;
  const body = [
    `안녕하세요 ${supplierName} 담당자님.`,
    '',
    `도미노피자 ${storeName}입니다.`,
    '아래 품목에 대해 발주 요청드립니다.',
    '',
    itemList,
    '',
    '첨부한 발주서 확인 부탁드립니다.',
    '감사합니다.',
    internalOwner,
  ].join('\n');

  return { subject, text: body };
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
  const toEmails = [...new Set([...toList].filter((e) => e && String(e).includes('@')))];
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
  const { subject, text } = buildEmailFromTemplate({
    store_name: body.store_name,
    supplier_name: body.supplier_name,
    order_date: body.order_date,
    internal_owner: body.internal_owner,
    items,
  });
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SENDER, pass: password },
  });
  try {
    await transporter.sendMail({
      from: SENDER,
      to: toEmails.join(', '),
      subject,
      text,
    });
    res.status(200).json({ ok: true, sent_to: toEmails, count: items.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || '메일 발송 실패' });
  }
};
