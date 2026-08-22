// ============================================================
// IDEMPOTENCY HANDLING MIDDLEWARE
// ============================================================
// Prevents duplicate processing of checkout requests
// ============================================================

const crypto = require('crypto');
const logger = require('../config/logger');

// In-memory store for idempotency keys (in production, use Redis)
const idempotencyStore = new Map();
const IDEMPOTENCY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate hash of request body
 */
function generateRequestHash(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

/**
 * Check if request was already processed
 */
function checkIdempotency(req, res, next) {
  if (process.env.ENABLE_IDEMPOTENCY_CHECK !== 'true') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    // Generate one if not provided
    req.idempotencyKey = crypto.randomUUID();
    return next();
  }

  // Validate idempotency key format (UUID)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Idempotency-Key format. Must be a valid UUID.',
    });
  }

  const requestHash = generateRequestHash(req.body);
  const cacheKey = `${idempotencyKey}:${requestHash}`;
  const cached = idempotencyStore.get(cacheKey);

  if (cached) {
    if (cached.status === 'processing') {
      logger.warn('Duplicate request in progress', { idempotencyKey });
      return res.status(409).json({
        success: false,
        error: 'Request is already being processed. Please wait.',
      });
    }

    if (cached.status === 'completed') {
      logger.info('Returning cached idempotent response', { idempotencyKey });
      return res.status(cached.statusCode).json(cached.response);
    }
  }

  // Mark as processing
  idempotencyStore.set(cacheKey, {
    status: 'processing',
    timestamp: Date.now(),
  });

  // Store idempotency info on response
  req.idempotencyKey = idempotencyKey;
  res.on('finish', () => {
    idempotencyStore.set(cacheKey, {
      status: 'completed',
      statusCode: res.statusCode,
      response: res.locals.responseBody,
      timestamp: Date.now(),
    });

    // Cleanup old entries
    cleanupIdempotencyStore();
  });

  next();
}

/**
 * Clean up expired idempotency entries
 */
function cleanupIdempotencyStore() {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_EXPIRY_MS) {
      idempotencyStore.delete(key);
    }
  }
}

module.exports = {
  checkIdempotency,
  generateRequestHash,
};
