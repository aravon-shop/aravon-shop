// ============================================================
// INPUT VALIDATION MIDDLEWARE
// ============================================================
// Validates request payloads against defined schemas
// ============================================================

const constants = require('../config/constants');
const logger = require('../config/logger');

/**
 * Validate customer information
 */
function validateCustomerInfo(data) {
  const errors = [];

  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.push('First name is required');
  }

  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
    errors.push('Last name is required');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.phone || !/^[+\d\s\-()]{7,20}$/.test(data.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
    errors.push('Address is required');
  }

  if (!data.city || typeof data.city !== 'string' || data.city.trim().length === 0) {
    errors.push('City is required');
  }

  if (!data.zip || !/^[A-Za-z0-9\s\-]{3,10}$/.test(data.zip)) {
    errors.push('Valid ZIP/postal code is required');
  }

  if (data.country && !constants.ALLOWED_SHIPPING_COUNTRIES.includes(data.country.toUpperCase())) {
    errors.push(`Country must be one of: ${constants.ALLOWED_SHIPPING_COUNTRIES.join(', ')}`);
  }

  return errors;
}

/**
 * Validate cart items
 */
function validateCartItems(items) {
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Cart must contain at least one item');
    return errors;
  }

  items.forEach((item, index) => {
    const prefix = `Item ${index + 1}`;

    if (!item.id || typeof item.id !== 'string') {
      errors.push(`${prefix}: Product ID is required`);
    }

    if (!item.name || typeof item.name !== 'string') {
      errors.push(`${prefix}: Product name is required`);
    }

    const price = Number(item.price);
    if (isNaN(price) || price <= 0) {
      errors.push(`${prefix}: Price must be a positive number`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < constants.MIN_QUANTITY_PER_ITEM || quantity > constants.MAX_QUANTITY_PER_ITEM) {
      errors.push(`${prefix}: Quantity must be between ${constants.MIN_QUANTITY_PER_ITEM} and ${constants.MAX_QUANTITY_PER_ITEM}`);
    }
  });

  return errors;
}

/**
 * Middleware factory for validating request body
 */
function validateRequest(validator) {
  return (req, res, next) => {
    const errors = validator(req.body);

    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        path: req.path,
        errors,
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

/**
 * Validate checkout request
 */
function validateCheckoutRequest(req, res, next) {
  const { customer, items } = req.body;

  if (!customer) {
    return res.status(400).json({
      success: false,
      error: 'Customer information is required',
    });
  }

  const customerErrors = validateCustomerInfo(customer);
  if (customerErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid customer information',
      details: customerErrors,
    });
  }

  const itemErrors = validateCartItems(items);
  if (itemErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid cart items',
      details: itemErrors,
    });
  }

  next();
}

module.exports = {
  validateCustomerInfo,
  validateCartItems,
  validateRequest,
  validateCheckoutRequest,
};
