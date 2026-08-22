// ============================================================
// RETRY & ERROR RECOVERY UTILITIES
// ============================================================
// Implements exponential backoff and retry logic
// ============================================================

const logger = require('../config/logger');
const constants = require('../config/constants');

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(
  fn,
  maxAttempts = constants.MAX_RETRY_ATTEMPTS,
  initialDelayMs = constants.RETRY_DELAY_MS,
  backoffMultiplier = 2
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        logger.warn('Retry attempt', {
          attempt,
          maxAttempts,
          delay,
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('All retry attempts failed', {
    maxAttempts,
    error: lastError.message,
  });
  throw lastError;
}

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
  }
}

/**
 * Custom error class for Firestore errors
 */
class FirestoreError extends AppError {
  constructor(message, originalError, operation = 'unknown') {
    super(`Firestore ${operation} failed: ${message}`, 500, {
      operation,
      originalError: originalError?.message,
    });
    this.originalError = originalError;
  }
}

/**
 * Custom error class for Stripe errors
 */
class StripeError extends AppError {
  constructor(message, originalError, operation = 'unknown') {
    super(`Stripe ${operation} failed: ${message}`, 400, {
      operation,
      stripeErrorCode: originalError?.code,
      stripeErrorType: originalError?.type,
    });
    this.originalError = originalError;
  }
}

module.exports = {
  retryWithBackoff,
  AppError,
  FirestoreError,
  StripeError,
};
