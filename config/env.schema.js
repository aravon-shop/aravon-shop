// ============================================================
// ENVIRONMENT CONFIGURATION SCHEMA & VALIDATION
// ============================================================
// Ensures all required environment variables are present
// and properly formatted before server startup
// ============================================================

const requiredEnvVars = {
  // Server
  NODE_ENV: { type: 'enum', values: ['development', 'production', 'staging'], required: true },
  PORT: { type: 'number', required: false, default: 3000 },
  SHOP_NAME: { type: 'string', required: false, default: 'Aravon Shop' },
  CURRENCY: { type: 'string', required: false, default: 'eur', validate: (v) => /^[a-z]{3}$/i.test(v) },
  PUBLIC_BASE_URL: { type: 'url', required: true },
  LOG_LEVEL: { type: 'enum', values: ['error', 'warn', 'info', 'debug'], required: false, default: 'info' },

  // Stripe
  STRIPE_SECRET_KEY: { type: 'string', required: true, validate: (v) => v.startsWith('sk_') },
  STRIPE_WEBHOOK_SECRET: { type: 'string', required: true, validate: (v) => v.startsWith('whsec_') },
  STRIPE_PUBLISHABLE_KEY: { type: 'string', required: false, validate: (v) => v.startsWith('pk_') },

  // Firebase
  FIREBASE_PROJECT_ID: { type: 'string', required: true },
  FIREBASE_CLIENT_EMAIL: { type: 'email', required: true },
  FIREBASE_PRIVATE_KEY: { type: 'string', required: true },

  // Security
  JWT_SECRET: { type: 'string', required: true, minLength: 32 },
  ADMIN_JWT_EXPIRY: { type: 'string', required: false, default: '7d' },
  API_RATE_LIMIT_WINDOW_MS: { type: 'number', required: false, default: 900000 },
  API_RATE_LIMIT_MAX_REQUESTS: { type: 'number', required: false, default: 100 },
  CHECKOUT_RATE_LIMIT_MAX_REQUESTS: { type: 'number', required: false, default: 10 },

  // Database
  FIRESTORE_RETRY_ATTEMPTS: { type: 'number', required: false, default: 3 },
  FIRESTORE_RETRY_DELAY_MS: { type: 'number', required: false, default: 1000 },

  // Monitoring
  SENTRY_DSN: { type: 'url', required: false },
  MORGAN_FORMAT: { type: 'string', required: false, default: 'combined' },

  // CORS
  CORS_ORIGIN: { type: 'string', required: false, default: '*' },
  CORS_CREDENTIALS: { type: 'boolean', required: false, default: false },

  // Feature Flags
  ENABLE_PAYMENT_RETRY: { type: 'boolean', required: false, default: true },
  ENABLE_IDEMPOTENCY_CHECK: { type: 'boolean', required: false, default: true },
  ENABLE_AUDIT_LOGGING: { type: 'boolean', required: false, default: true },
  ENABLE_WEBHOOK_SIGNATURE_VERIFICATION: { type: 'boolean', required: false, default: true },
};

/**
 * Validate environment variables against schema
 * @throws {Error} If validation fails
 */
function validateEnv() {
  const errors = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    // Check if required
    if (config.required && (value === undefined || value === '')) {
      errors.push(`Missing required env var: ${key}`);
      continue;
    }

    // Use default if not provided
    if (!value && config.default !== undefined) {
      process.env[key] = config.default;
      continue;
    }

    if (!value) continue;

    // Type validation
    switch (config.type) {
      case 'url':
        try {
          new URL(value);
        } catch {
          errors.push(`Invalid URL format for ${key}: ${value}`);
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`Invalid email format for ${key}: ${value}`);
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Invalid number format for ${key}: ${value}`);
        } else {
          process.env[key] = Number(value);
        }
        break;
      case 'boolean':
        process.env[key] = value === 'true' || value === '1';
        break;
      case 'enum':
        if (!config.values.includes(value.toLowerCase())) {
          errors.push(`Invalid value for ${key}. Expected one of: ${config.values.join(', ')}`);
        }
        break;
    }

    // Length validation
    if (config.minLength && value.length < config.minLength) {
      errors.push(`${key} must be at least ${config.minLength} characters long`);
    }

    // Custom validation
    if (config.validate && !config.validate(value)) {
      errors.push(`Validation failed for ${key}: ${value}`);
    }
  }

  if (errors.length > 0) {
    const errorMessage = errors.join('\n');
    throw new Error(`Environment validation failed:\n${errorMessage}`);
  }

  return true;
}

module.exports = {
  validateEnv,
  requiredEnvVars,
};
