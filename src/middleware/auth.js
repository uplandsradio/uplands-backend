// middleware/auth.js
module.exports = function (req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'uplands-secret';
  const key = req.header('x-admin-key') || req.query.key;
  if (key && key === ADMIN_KEY) return next();
  return res.status(403).json({ error: 'Forbidden' });
};