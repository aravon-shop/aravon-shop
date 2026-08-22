// ============================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ============================================================
// Protects admin endpoints with JWT token verification
// ============================================================

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header', {
      path: req.path,
      ip: req.ip,
    });
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization token',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('JWT verification failed', {
      error: err.message,
      path: req.path,
      ip: req.ip,
    });

    const statusCode = err.name === 'TokenExpiredError' ? 401 : 403;
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';

    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

/**
 * Verify user has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user?.id,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      error: 'Unauthorized. Admin access required.',
    });
  }

  next();
}

/**
 * Verify user has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(permission)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        required: permission,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        error: `Permission required: ${permission}`,
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireAdmin,
  requirePermission,
};
