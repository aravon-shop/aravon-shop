// ============================================================
// SECURITY & ERROR HANDLING MIDDLEWARE
// ============================================================
// Protects application from common vulnerabilities
// ============================================================

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../config/logger');

/**
 * Security headers middleware
 */
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        frameSrc: ['https://js.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
}

/**
 * CORS configuration
 */
function corsMiddleware() {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const corsCredentials = process.env.CORS_CREDENTIALS === 'true';

  return cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    credentials: corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: 86400, // 24 hours
  });
}

/**
 * General API rate limiter
 */
function apiRateLimiter() {
  return rateLimit({
    windowMs: process.env.API_RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
    max: process.env.API_RATE_LIMIT_MAX_REQUESTS || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development',
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later.',
      });
    },
  });
}

/**
 * Strict rate limiter for checkout endpoint
 */
function checkoutRateLimiter() {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: process.env.CHECKOUT_RATE_LIMIT_MAX_REQUESTS || 10,
    message: 'Too many checkout attempts. Please wait before trying again.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use combination of IP and email for rate limiting
      const email = req.body?.customer?.email || req.ip;
      return `${req.ip}-${email}`;
    },
    skip: (req) => process.env.NODE_ENV === 'development',
    handler: (req, res) => {
      logger.warn('Checkout rate limit exceeded', {
        ip: req.ip,
        email: req.body?.customer?.email,
      });
      res.status(429).json({
        success: false,
        error: 'Too many checkout attempts. Please wait before trying again.',
      });
    },
  });
}

/**
 * Input sanitization middleware
 */
function sanitizeInputs() {
  return mongoSanitize({
    allowDots: true,
    onSanitize: ({ req, key }) => {
      logger.debug('Input sanitized', { key, path: req.path });
    },
  });
}

/**
 * Request logging middleware
 */
function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      logger[level]('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });

    next();
  };
}

/**
 * Error handling middleware
 */
function errorHandler() {
  return (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    logger.error('Application error', {
      message: err.message,
      status: statusCode,
      path: req.path,
      method: req.method,
      stack: isDevelopment ? err.stack : undefined,
    });

    // Prevent header already sent error
    if (res.headersSent) {
      return next(err);
    }

    const response = {
      success: false,
      error: isDevelopment ? err.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: err.stack }),
    };

    res.status(statusCode).json(response);
  };
}

/**
 * 404 Not Found middleware
 */
function notFoundHandler() {
  return (req, res) => {
    logger.warn('Route not found', {
      path: req.path,
      method: req.method,
    });

    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found',
      });
    }

    res.status(404).json({
      success: false,
      error: 'Not found',
    });
  };
}

module.exports = {
  securityHeaders,
  corsMiddleware,
  apiRateLimiter,
  checkoutRateLimiter,
  sanitizeInputs,
  requestLogger,
  errorHandler,
  notFoundHandler,
};
