// ============================================================
// PAYMENT SERVICE
// ============================================================
// Handles Stripe payment operations with retry logic
// ============================================================

const { retryWithBackoff, StripeError, AppError } = require('./errors');
const { limitMetadata, centsToValue, valueToCents } = require('./helpers');
const constants = require('../config/constants');
const logger = require('../config/logger');

/**
 * Create Stripe checkout session with retry
 */
async function createCheckoutSession(stripe, sessionConfig) {
  try {
    if (process.env.ENABLE_PAYMENT_RETRY === 'true') {
      return await retryWithBackoff(
        () => stripe.checkout.sessions.create(sessionConfig),
        3,
        1000
      );
    }
    return await stripe.checkout.sessions.create(sessionConfig);
  } catch (err) {
    logger.error('Stripe checkout session creation failed', {
      error: err.message,
      code: err.code,
    });
    throw new StripeError('Failed to create checkout session', err, 'create_session');
  }
}

/**
 * Retrieve checkout session with retry
 */
async function retrieveCheckoutSession(stripe, sessionId) {
  try {
    if (process.env.ENABLE_PAYMENT_RETRY === 'true') {
      return await retryWithBackoff(
        () => stripe.checkout.sessions.retrieve(sessionId),
        3,
        1000
      );
    }
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    if (err.code === 'resource_missing') {
      throw new AppError('Checkout session not found', 404, { sessionId });
    }
    throw new StripeError('Failed to retrieve session', err, 'retrieve_session');
  }
}

/**
 * List checkout line items
 */
async function listCheckoutLineItems(stripe, sessionId) {
  try {
    const response = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ['data.price.product'],
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    logger.error('Failed to retrieve line items', {
      sessionId,
      error: err.message,
    });
    throw new StripeError('Failed to retrieve line items', err, 'list_line_items');
  }
}

/**
 * Update checkout session metadata
 */
async function updateCheckoutSessionMetadata(stripe, sessionId, metadata) {
  try {
    return await stripe.checkout.sessions.update(sessionId, { metadata });
  } catch (err) {
    logger.error('Failed to update session metadata', {
      sessionId,
      error: err.message,
    });
    // Don't throw - metadata update failure shouldn't prevent order creation
  }
}

/**
 * Construct Stripe webhook event with verification
 */
function constructWebhookEvent(rawBody, signature, webhookSecret) {
  try {
    if (process.env.ENABLE_WEBHOOK_SIGNATURE_VERIFICATION === 'false') {
      logger.warn('Webhook signature verification is disabled');
      return JSON.parse(rawBody);
    }

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new StripeError('Invalid webhook signature', err, 'webhook_verification');
  }
}

/**
 * Calculate order totals from line items
 */
function calculateOrderTotals(lineItems) {
  let subtotalCents = 0;
  let itemCount = 0;

  lineItems.forEach((item) => {
    const unitPriceCents = Math.round((item.price?.unit_amount || 0) * 100);
    subtotalCents += unitPriceCents * (item.quantity || 1);
    itemCount += item.quantity || 1;
  });

  // Calculate shipping
  const shippingCents =
    subtotalCents >= constants.FREE_SHIPPING_THRESHOLD_CENTS ? 0 : constants.STANDARD_SHIPPING_CENTS;

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    itemCount,
  };
}

module.exports = {
  createCheckoutSession,
  retrieveCheckoutSession,
  listCheckoutLineItems,
  updateCheckoutSessionMetadata,
  constructWebhookEvent,
  calculateOrderTotals,
};
