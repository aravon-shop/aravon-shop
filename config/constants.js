// ============================================================
// APPLICATION CONSTANTS
// ============================================================
// Centralized configuration for business logic values
// ============================================================

module.exports = {
  // Shipping
  FREE_SHIPPING_THRESHOLD_CENTS: 5000, // €50
  STANDARD_SHIPPING_CENTS: 495, // €4.95

  // Order
  ORDER_ID_PREFIX: 'ARV',
  ORDER_STATUSES: {
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },
  FULFILLMENT_STATUSES: {
    UNFULFILLED: 'unfulfilled',
    PARTIALLY_FULFILLED: 'partially_fulfilled',
    FULFILLED: 'fulfilled',
  },
  PAYMENT_STATUSES: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  // Validation
  MAX_QUANTITY_PER_ITEM: 99,
  MIN_QUANTITY_PER_ITEM: 1,
  MAX_TEXT_LENGTH: 500,
  MAX_REQUEST_SIZE: '1mb',

  // Stripe
  STRIPE_WEBHOOK_EVENTS: {
    CHECKOUT_COMPLETED: 'checkout.session.completed',
    ASYNC_PAYMENT_SUCCEEDED: 'checkout.session.async_payment_succeeded',
    ASYNC_PAYMENT_FAILED: 'checkout.session.async_payment_failed',
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    CHARGE_REFUNDED: 'charge.refunded',
  },

  // Database
  COLLECTIONS: {
    ORDERS: 'orders',
    CUSTOMERS: 'customers',
    PRODUCTS: 'products',
    AUDIT_LOGS: 'audit_logs',
    ADMIN_USERS: 'admins',
  },

  // Retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,

  // Time
  SESSION_EXPIRY_HOURS: 24,
  JWT_EXPIRY: process.env.ADMIN_JWT_EXPIRY || '7d',

  // Allowed countries for shipping
  ALLOWED_SHIPPING_COUNTRIES: ['NL', 'BE', 'DE', 'FR', 'LU'],
};
