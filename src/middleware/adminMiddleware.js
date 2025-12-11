module.exports = function (req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
};