// ============================================================
// FIRESTORE ORDER SERVICE
// ============================================================
// Handles all order persistence operations with retry logic
// ============================================================

const { retryWithBackoff, FirestoreError, AppError } = require('../utils/errors');
const { serializeFirestoreTimestamp, generateOrderId, extractCustomerFromSession } = require('../utils/helpers');
const constants = require('../config/constants');
const logger = require('../config/logger');
const { logOrderCreated } = require('../utils/auditLog');

/**
 * Create order in Firestore with idempotency
 */
async function createOrder(firestore, admin, session, stripeLineItems) {
  const orderId = generateOrderId();

  try {
    // Extract customer data
    const customer = extractCustomerFromSession(session);

    // Convert Stripe items to order items
    const items = stripeLineItems
      .filter((item) => item.price && item.price.product)
      .map((item) => {
        const product = typeof item.price.product === 'object' ? item.price.product : null;
        const productMetadata = (product?.metadata) || {};
        const productId = productMetadata.productId || null;

        return {
          id: productId,
          productId,
          name: product?.name || 'Product',
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.price?.unit_amount || 0) / 100,
          currency: (item.price?.currency || 'eur').toLowerCase(),
          description: product?.description || '',
          image:
            product?.images && Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : null,
          size: productMetadata.size || '',
          gender: productMetadata.gender || '',
          category: productMetadata.category || '',
        };
      });

    if (items.length === 0) {
      throw new AppError('No valid items found in checkout session', 400);
    }

    // Calculate totals
    const amountTotalCents = Number(session.amount_total || 0);
    const amountSubtotalCents = Number(session.amount_subtotal || 0);
    const shippingTotalCents = Math.max(0, amountTotalCents - amountSubtotalCents);

    // Build order document
    const orderData = {
      orderId,
      orderNumber: orderId,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      paymentStatus: constants.PAYMENT_STATUSES.PAID,
      orderStatus: constants.ORDER_STATUSES.PROCESSING,
      fulfillmentStatus: constants.FULFILLMENT_STATUSES.UNFULFILLED,
      currency: (session.currency || 'eur').toLowerCase(),
      subtotal: amountSubtotalCents / 100,
      shipping: shippingTotalCents / 100,
      total: amountTotalCents / 100,
      itemCount: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      customer,
      items,
      stripe: {
        checkoutSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paymentStatus: session.payment_status,
        sessionStatus: session.status,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create order with retry and idempotency handling
    const orderRef = firestore.collection(constants.COLLECTIONS.ORDERS).doc(orderId);

    try {
      await retryWithBackoff(
        () => orderRef.create(orderData),
        process.env.FIRESTORE_RETRY_ATTEMPTS || 3,
        process.env.FIRESTORE_RETRY_DELAY_MS || 1000
      );

      // Log audit event
      await logOrderCreated(firestore, orderId, session);

      logger.info('Order created successfully', { orderId, email: customer.email });

      return {
        orderId,
        created: true,
        order: orderData,
      };
    } catch (err) {
      // Handle race condition - order may have already been created
      if (err.code === 6 || err.code === 'already-exists' || err.code === 'ALREADY_EXISTS') {
        const existing = await orderRef.get();
        if (existing.exists) {
          logger.info('Order already exists (race condition recovered)', { orderId });
          return {
            orderId,
            created: false,
            order: existing.data(),
          };
        }
      }

      throw err;
    }
  } catch (err) {
    if (err instanceof FirestoreError || err instanceof AppError) {
      throw err;
    }
    logger.error('Order creation failed', { orderId, error: err.message });
    throw new FirestoreError('Failed to create order', err, 'create_order');
  }
}

/**
 * Retrieve order by ID
 */
async function getOrderById(firestore, orderId) {
  try {
    const doc = await retryWithBackoff(
      () => firestore.collection(constants.COLLECTIONS.ORDERS).doc(orderId).get(),
      3,
      1000
    );

    if (!doc.exists) {
      throw new AppError('Order not found', 404, { orderId });
    }

    return doc.data();
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new FirestoreError('Failed to retrieve order', err, 'get_order');
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(firestore, orderId, orderStatus, fulfillmentStatus = null) {
  try {
    const updateData = {
      orderStatus,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    if (fulfillmentStatus) {
      updateData.fulfillmentStatus = fulfillmentStatus;
    }

    await retryWithBackoff(
      () => firestore.collection(constants.COLLECTIONS.ORDERS).doc(orderId).update(updateData),
      3,
      1000
    );

    logger.info('Order status updated', { orderId, orderStatus });
  } catch (err) {
    throw new FirestoreError('Failed to update order status', err, 'update_order');
  }
}

/**
 * Sanitize order for customer view
 */
function sanitizeOrderForCustomer(order) {
  return {
    orderId: order.orderId || '',
    orderNumber: order.orderNumber || order.orderId || '',
    paymentStatus: order.paymentStatus || '',
    orderStatus: order.orderStatus || '',
    fulfillmentStatus: order.fulfillmentStatus || '',
    currency: order.currency || '',
    subtotal: Number(order.subtotal || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0),
    itemCount: Number(order.itemCount || 0),
    customer: order.customer || {},
    items: Array.isArray(order.items) ? order.items : [],
    createdAt: serializeFirestoreTimestamp(order.createdAt),
    updatedAt: serializeFirestoreTimestamp(order.updatedAt),
    paidAt: serializeFirestoreTimestamp(order.paidAt),
  };
}

module.exports = {
  createOrder,
  getOrderById,
  updateOrderStatus,
  sanitizeOrderForCustomer,
};
