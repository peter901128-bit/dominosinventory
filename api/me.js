const { isAuthenticated } = require('./auth-helper');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (isAuthenticated(req)) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
