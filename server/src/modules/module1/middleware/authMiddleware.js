// middleware/authMiddleware.js
// -------------------------------------------------------------------
// JWT authentication guard used by Module 1 protected routes.
// Verifies Bearer tokens and attaches req.student = { id, email }.
// -------------------------------------------------------------------

const jwt = require('jsonwebtoken');

function protect(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication token. Please log in.'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'parakh_adaptive_learning_secret_2026';
    const payload = jwt.verify(token, secret);
    // Attach student info to request for downstream handlers
    req.student = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please log in again.'
    });
  }
}

module.exports = { protect };
