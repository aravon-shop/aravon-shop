// ============================================================
// UTILITY FUNCTIONS
// ============================================================
// Common helper functions used across the application
// ============================================================

const constants = require('../config/constants');
const crypto = require('crypto');

/**
 * Clean and truncate text input
 */
function cleanText(value, maxLength = constants.MAX_TEXT_LENGTH) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

/**
 * Parse price from various formats
 */
function parsePrice(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    return Number(cleaned);
  }

  return NaN;
}

/**
 * Parse quantity as integer
 */
function parseQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.floor(quantity);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate HTTP/HTTPS URL
 */
function isValidHttpUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Limit string length for Stripe metadata (max 500 chars)
 */
function limitMetadata(value, maxLength = 500) {
  return cleanText(value, maxLength);
}

/**
 * Generate unique order ID
 */
function generateOrderId() {
  const now = new Date();

  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);

  return `${constants.ORDER_ID_PREFIX}-${year}${month}${day}-${randomPart}`;
}

/**
 * Convert cents to currency value
 */
function centsToValue(cents) {
  return Math.round(cents) / 100;
}

/**
 * Convert currency value to cents
 */
function valueToCents(value) {
  return Math.round(value * 100);
}

/**
 * Serialize Firestore timestamp to ISO string
 */
function serializeFirestoreTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

/**
 * Deep copy object
 */
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract customer info from Stripe session
 */
function extractCustomerFromSession(session) {
  const metadata = session.metadata || {};
  const customerDetails = session.customer_details || {};
  const shippingDetails = session.shipping_details || {};
  const shippingAddress = shippingDetails.address || {};
  const billingAddress = customerDetails.address || {};

  return {
    firstName: cleanText(metadata.firstName),
    lastName: cleanText(metadata.lastName),
    fullName:
      [cleanText(metadata.firstName), cleanText(metadata.lastName)].filter(Boolean).join(' ') ||
      cleanText(shippingDetails.name) ||
      cleanText(customerDetails.name) ||
      '',
    email: cleanText(customerDetails.email) || cleanText(session.customer_email) || '',
    phone: cleanText(customerDetails.phone) || cleanText(metadata.phone) || '',
    houseNumber: cleanText(metadata.houseNumber),
    address: cleanText(shippingAddress.line1) || cleanText(metadata.address) || cleanText(billingAddress.line1) || '',
    addressLine2: cleanText(shippingAddress.line2) || cleanText(billingAddress.line2) || '',
    city: cleanText(shippingAddress.city) || cleanText(metadata.city) || cleanText(billingAddress.city) || '',
    zip: cleanText(shippingAddress.postal_code) || cleanText(metadata.zip) || cleanText(billingAddress.postal_code) || '',
    country: cleanText(shippingAddress.country) || cleanText(metadata.country) || cleanText(billingAddress.country) || '',
  };
}

module.exports = {
  cleanText,
  parsePrice,
  parseQuantity,
  isValidEmail,
  isValidHttpUrl,
  limitMetadata,
  generateOrderId,
  centsToValue,
  valueToCents,
  serializeFirestoreTimestamp,
  deepCopy,
  extractCustomerFromSession,
};
