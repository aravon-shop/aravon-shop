// ============================================================
// public/js/utils.js
// ARAVON SHOP — SHARED UTILITIES
//
// Used by:
//   - index.js
//   - product-pages/shared/product-storage.js
//   - product-pages/shared/single-product.js
//   - cart/shared/cart.js
//   - admin pages
//   - user pages
//
// Purpose:
//   - Price formatting
//   - Safe JSON loading
//   - Safe localStorage handling
//   - Theme helpers
//   - URL/query helpers
//   - Product helpers
//   - General DOM utilities
//
// IMPORTANT:
// This file contains NO page-specific logic.
// ============================================================


// ============================================================
// SITE DEFAULTS
// ============================================================

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_CURRENCY_SYMBOL = "€";


// ============================================================
// PRICE FORMATTING
// ============================================================

/**
 * Format a number as a shop price.
 *
 * Example:
 * formatPrice(45)
 * → "€45.00"
 */
export function formatPrice(
  value,
  currency = DEFAULT_CURRENCY
) {

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${DEFAULT_CURRENCY_SYMBOL}0.00`;
  }

  try {

    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);

  } catch (error) {

    return `${DEFAULT_CURRENCY_SYMBOL}${number.toFixed(2)}`;
  }
}


/**
 * Convert a value safely to a number.
 */
export function toNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/**
 * Calculate a product/cart line total.
 */
export function calculateLineTotal(
  price,
  quantity
) {

  const safePrice = toNumber(price);
  const safeQuantity = Math.max(
    0,
    Math.floor(toNumber(quantity, 0))
  );

  return safePrice * safeQuantity;
}


// ============================================================
// JSON UTILITIES
// ============================================================

/**
 * Safely parse JSON.
 *
 * Returns fallback instead of throwing an error.
 */
export function safeJSONParse(
  value,
  fallback = null
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  try {

    return JSON.parse(value);

  } catch (error) {

    console.warn(
      "Aravon Shop: Invalid JSON.",
      error
    );

    return fallback;
  }
}


/**
 * Safely stringify an object.
 */
export function safeJSONStringify(
  value,
  fallback = "{}"
) {

  try {

    return JSON.stringify(value);

  } catch (error) {

    console.warn(
      "Aravon Shop: Could not convert value to JSON.",
      error
    );

    return fallback;
  }
}


/**
 * Load a JSON file using fetch().
 *
 * Example:
 *
 * const data = await loadJSON("/homepage.json");
 */
export async function loadJSON(
  url,
  fallback = {}
) {

  try {

    const response = await fetch(url, {
      cache: "no-cache"
    });

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    return data;

  } catch (error) {

    console.error(
      `Aravon Shop: Failed to load JSON: ${url}`,
      error
    );

    return fallback;
  }
}


// ============================================================
// LOCAL STORAGE
// ============================================================

/**
 * Safely get an item from localStorage.
 */
export function getStorageItem(
  key,
  fallback = null
) {

  try {

    const value =
      localStorage.getItem(key);

    return value === null
      ? fallback
      : value;

  } catch (error) {

    console.warn(
      "Aravon Shop: localStorage read failed.",
      error
    );

    return fallback;
  }
}


/**
 * Safely store an item in localStorage.
 */
export function setStorageItem(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      String(value)
    );

    return true;

  } catch (error) {

    console.warn(
      "Aravon Shop: localStorage write failed.",
      error
    );

    return false;
  }
}


/**
 * Safely remove an item from localStorage.
 */
export function removeStorageItem(key) {

  try {

    localStorage.removeItem(key);

    return true;

  } catch (error) {

    console.warn(
      "Aravon Shop: localStorage remove failed.",
      error
    );

    return false;
  }
}


/**
 * Read JSON from localStorage.
 */
export function getStorageJSON(
  key,
  fallback = null
) {

  const value =
    getStorageItem(key, null);

  if (value === null) {
    return fallback;
  }

  return safeJSONParse(
    value,
    fallback
  );
}


/**
 * Save JSON to localStorage.
 */
export function setStorageJSON(
  key,
  value
) {

  const json =
    safeJSONStringify(value, null);

  if (json === null) {
    return false;
  }

  return setStorageItem(
    key,
    json
  );
}


// ============================================================
// DOM UTILITIES
// ============================================================

/**
 * Find one element safely.
 */
export function $(selector, parent = document) {

  if (!selector) {
    return null;
  }

  return parent.querySelector(selector);
}


/**
 * Find multiple elements safely.
 */
export function $$(selector, parent = document) {

  if (!selector) {
    return [];
  }

  return Array.from(
    parent.querySelectorAll(selector)
  );
}


/**
 * Safely set text content.
 */
export function setText(
  element,
  value
) {

  if (!element) {
    return;
  }

  element.textContent =
    value ?? "";
}


/**
 * Safely set an attribute.
 */
export function setAttribute(
  element,
  attribute,
  value
) {

  if (!element || !attribute) {
    return;
  }

  if (
    value === null ||
    value === undefined
  ) {

    element.removeAttribute(attribute);

    return;
  }

  element.setAttribute(
    attribute,
    String(value)
  );
}


/**
 * Safely toggle an element's visibility.
 */
export function toggleElement(
  element,
  visible
) {

  if (!element) {
    return;
  }

  element.hidden = !visible;
}


/**
 * Wait until DOM is ready.
 */
export function onDOMReady(callback) {

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      callback,
      { once: true }
    );

  } else {

    callback();
  }
}


// ============================================================
// URL / QUERY PARAMETERS
// ============================================================

/**
 * Get a URL query parameter.
 *
 * Example:
 *
 * URL:
 * single-product.html?id=ABC123
 *
 * getQueryParam("id")
 * → "ABC123"
 */
export function getQueryParam(
  name
) {

  if (!name) {
    return null;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get(name);
}


/**
 * Get all URL query parameters.
 */
export function getQueryParams() {

  return new URLSearchParams(
    window.location.search
  );
}


/**
 * Build a URL with query parameters.
 */
export function buildURL(
  path,
  params = {}
) {

  const url =
    new URL(
      path,
      window.location.origin
    );

  Object.entries(params)
    .forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        url.searchParams.set(
          key,
          value
        );
      }

    });

  return url.toString();
}


// ============================================================
// PRODUCT UTILITIES
// ============================================================

/**
 * Get a safe product ID.
 */
export function getProductId(product) {

  if (!product) {
    return "";
  }

  return String(
    product.id ??
    product.productId ??
    ""
  ).trim();
}


/**
 * Get a safe product name.
 */
export function getProductName(product) {

  if (!product) {
    return "Product";
  }

  return String(
    product.name ??
    product.title ??
    "Product"
  ).trim();
}


/**
 * Get a safe product price.
 */
export function getProductPrice(product) {

  if (!product) {
    return 0;
  }

  return toNumber(
    product.price,
    0
  );
}


/**
 * Get the first valid product image.
 */
export function getProductImage(
  product,
  fallback = ""
) {

  if (!product) {
    return fallback;
  }

  const images =
    Array.isArray(product.images)
      ? product.images
      : [];

  const firstImage =
    images.find(
      image =>
        typeof image === "string" &&
        image.trim() !== ""
    );

  if (firstImage) {
    return firstImage;
  }

  if (
    typeof product.image === "string" &&
    product.image.trim() !== ""
  ) {

    return product.image;
  }

  if (
    typeof product.thumbnail === "string" &&
    product.thumbnail.trim() !== ""
  ) {

    return product.thumbnail;
  }

  return fallback;
}


/**
 * Normalize product category.
 */
export function normalizeCategory(
  category
) {

  return String(
    category ?? ""
  )
    .trim()
    .toLowerCase();
}


/**
 * Normalize gender.
 */
export function normalizeGender(
  gender
) {

  return String(
    gender ?? ""
  )
    .trim()
    .toLowerCase();
}


/**
 * Check whether a product belongs
 * to a category.
 */
export function productMatchesCategory(
  product,
  category
) {

  if (!product || !category) {
    return false;
  }

  return (
    normalizeCategory(
      product.category
    ) ===
    normalizeCategory(category)
  );
}


/**
 * Check whether a product matches gender.
 */
export function productMatchesGender(
  product,
  gender
) {

  if (!product || !gender) {
    return false;
  }

  const productGender =
    normalizeGender(
      product.gender
    );

  const requestedGender =
    normalizeGender(gender);

  if (
    requestedGender === "" ||
    requestedGender === "all"
  ) {

    return true;
  }

  return (
    productGender ===
    requestedGender
  );
}


// ============================================================
// SEARCH UTILITIES
// ============================================================

/**
 * Create a normalized search string
 * from product information.
 */
export function getProductSearchText(
  product
) {

  if (!product) {
    return "";
  }

  return [

    product.name,
    product.title,
    product.brand,
    product.category,
    product.gender,
    product.description

  ]
    .filter(
      value =>
        value !== undefined &&
        value !== null
    )
    .join(" ")
    .toLowerCase()
    .trim();
}


/**
 * Check whether a product matches
 * a search query.
 */
export function productMatchesSearch(
  product,
  query
) {

  const search =
    String(
      query ?? ""
    )
      .toLowerCase()
      .trim();

  if (!search) {
    return true;
  }

  const productText =
    getProductSearchText(product);

  return productText.includes(search);
}


// ============================================================
// ARRAY UTILITIES
// ============================================================

/**
 * Ensure a value is always an array.
 */
export function ensureArray(
  value
) {

  return Array.isArray(value)
    ? value
    : [];
}


/**
 * Remove duplicate values.
 */
export function uniqueArray(
  array
) {

  if (!Array.isArray(array)) {
    return [];
  }

  return [
    ...new Set(array)
  ];
}


/**
 * Find an item by ID.
 */
export function findById(
  array,
  id
) {

  if (!Array.isArray(array)) {
    return null;
  }

  const targetId =
    String(id ?? "");

  return (
    array.find(
      item =>
        String(
          item?.id ??
          item?.productId ??
          ""
        ) === targetId
    ) ?? null
  );
}


// ============================================================
// SORTING
// ============================================================

/**
 * Sort products by price.
 *
 * Supported:
 *   low
 *   high
 *   asc
 *   desc
 */
export function sortByPrice(
  products,
  direction = "low"
) {

  if (!Array.isArray(products)) {
    return [];
  }

  const sorted =
    [...products];

  if (
    direction === "high" ||
    direction === "desc"
  ) {

    sorted.sort(
      (a, b) =>
        getProductPrice(b) -
        getProductPrice(a)
    );

  } else {

    sorted.sort(
      (a, b) =>
        getProductPrice(a) -
        getProductPrice(b)
    );
  }

  return sorted;
}


// ============================================================
// THEME UTILITIES
// ============================================================

/**
 * Apply CSS variables from a theme object.
 *
 * Example theme:
 *
 * {
 *   colors: {
 *     primary: "#111111",
 *     accent: "#ff0000"
 *   }
 * }
 */
export function applyTheme(
  theme = {}
) {

  if (
    !theme ||
    typeof theme !== "object"
  ) {
    return;
  }

  const root =
    document.documentElement;

  const colors =
    theme.colors || {};

  Object.entries(colors)
    .forEach(([key, value]) => {

      if (
        value !== null &&
        value !== undefined
      ) {

        root.style.setProperty(
          `--color-${key}`,
          String(value)
        );
      }

    });

  const fonts =
    theme.fonts || {};

  Object.entries(fonts)
    .forEach(([key, value]) => {

      if (
        value !== null &&
        value !== undefined
      ) {

        root.style.setProperty(
          `--font-${key}`,
          String(value)
        );
      }

    });
}


/**
 * Apply a light/dark appearance.
 */
export function applyAppearance(
  appearance = "light"
) {

  const root =
    document.documentElement;

  const value =
    String(
      appearance ?? "light"
    ).toLowerCase();

  if (
    value === "dark"
  ) {

    root.classList.add("dark");
    root.classList.remove("light");

  } else {

    root.classList.add("light");
    root.classList.remove("dark");
  }
}


// ============================================================
// DEBOUNCE / THROTTLE
// ============================================================

/**
 * Debounce a function.
 *
 * Useful for:
 *   - Search input
 *   - Live filtering
 *   - Admin forms
 */
export function debounce(
  callback,
  delay = 300
) {

  let timeoutId = null;

  return function (...args) {

    clearTimeout(timeoutId);

    timeoutId =
      setTimeout(
        () => {
          callback.apply(
            this,
            args
          );
        },
        delay
      );
  };
}


/**
 * Throttle a function.
 */
export function throttle(
  callback,
  delay = 100
) {

  let waiting = false;

  return function (...args) {

    if (waiting) {
      return;
    }

    callback.apply(
      this,
      args
    );

    waiting = true;

    setTimeout(
      () => {
        waiting = false;
      },
      delay
    );
  };
}


// ============================================================
// GENERAL HELPERS
// ============================================================

/**
 * Escape HTML.
 *
 * Useful when inserting customer/product
 * data into HTML.
 */
export function escapeHTML(
  value
) {

  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;
}


/**
 * Generate a simple unique ID.
 */
export function generateId(
  prefix = "id"
) {

  const random =
    Math.random()
      .toString(36)
      .slice(2, 10);

  return `${prefix}-${Date.now()}-${random}`;
}


/**
 * Sleep/delay helper.
 */
export function sleep(
  milliseconds = 0
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}


/**
 * Check whether the current browser
 * is online.
 */
export function isOnline() {

  return navigator.onLine;
}


// ============================================================
// EXPORT DEFAULTS
// ============================================================

export default {

  formatPrice,
  toNumber,
  calculateLineTotal,

  safeJSONParse,
  safeJSONStringify,
  loadJSON,

  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getStorageJSON,
  setStorageJSON,

  $,
  $$,
  setText,
  setAttribute,
  toggleElement,
  onDOMReady,

  getQueryParam,
  getQueryParams,
  buildURL,

  getProductId,
  getProductName,
  getProductPrice,
  getProductImage,

  normalizeCategory,
  normalizeGender,

  productMatchesCategory,
  productMatchesGender,
  productMatchesSearch,

  getProductSearchText,

  ensureArray,
  uniqueArray,
  findById,

  sortByPrice,

  applyTheme,
  applyAppearance,

  debounce,
  throttle,

  escapeHTML,
  generateId,
  sleep,
  isOnline

};