// middleware/authMiddleware.js
// -------------------------------------------------------------------
// JWT authentication guard used by Module 1 protected routes.
// -------------------------------------------------------------------

const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing authentication token' });
  }
  try {
    const secret = process.env.JWT_SECRET || 'default_jwt_secret';
    const payload = jwt.verify(token, secret);
    // attach user info to request for downstream handlers
    req.student = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = { protect };
