const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/env");

module.exports = function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalid or expired" });
  }
};
