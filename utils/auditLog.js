// ============================================================
// AUDIT LOGGING SERVICE
// ============================================================
// Tracks important actions for compliance and debugging
// ============================================================

const logger = require('../config/logger');
const constants = require('../config/constants');

/**
 * Log audit event to Firestore
 */
async function logAuditEvent(firestore, eventData) {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') {
    return;
  }

  try {
    const auditEntry = {
      timestamp: new Date(),
      ...eventData,
    };

    await firestore.collection(constants.COLLECTIONS.AUDIT_LOGS).add(auditEntry);

    logger.debug('Audit event logged', { eventType: eventData.type });
  } catch (err) {
    logger.error('Failed to log audit event', {
      error: err.message,
      eventType: eventData.type,
    });
  }
}

/**
 * Log order creation
 */
async function logOrderCreated(firestore, orderId, session, userId = null) {
  await logAuditEvent(firestore, {
    type: 'ORDER_CREATED',
    orderId,
    stripeSessionId: session.id,
    email: session.customer_email,
    amount: session.amount_total,
    currency: session.currency,
    userId,
  });
}

/**
 * Log order status change
 */
async function logOrderStatusChange(firestore, orderId, oldStatus, newStatus, userId = null) {
  await logAuditEvent(firestore, {
    type: 'ORDER_STATUS_CHANGED',
    orderId,
    oldStatus,
    newStatus,
    userId,
  });
}

/**
 * Log payment processed
 */
async function logPaymentProcessed(firestore, orderId, session, status) {
  await logAuditEvent(firestore, {
    type: 'PAYMENT_PROCESSED',
    orderId,
    stripeSessionId: session.id,
    paymentStatus: status,
    amount: session.amount_total,
  });
}

/**
 * Log webhook event
 */
async function logWebhookEvent(firestore, eventType, eventId, data) {
  await logAuditEvent(firestore, {
    type: 'WEBHOOK_RECEIVED',
    eventType,
    eventId,
    ...data,
  });
}

/**
 * Log admin action
 */
async function logAdminAction(firestore, userId, action, details) {
  await logAuditEvent(firestore, {
    type: 'ADMIN_ACTION',
    userId,
    action,
    ...details,
  });
}

module.exports = {
  logAuditEvent,
  logOrderCreated,
  logOrderStatusChange,
  logPaymentProcessed,
  logWebhookEvent,
  logAdminAction,
};
