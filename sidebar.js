// ============================================================
// ARAVON SHOP
// ADMIN SHARED SIDEBAR
// Controls all sidebar notification numbers
// ============================================================


// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

const ORDERS_STORAGE_KEY = "adminOrders";
const PRODUCTS_STORAGE_KEY = "inventoryProducts";
const PAYMENTS_STORAGE_KEY = "adminPayments";
const MESSAGES_STORAGE_KEY = "adminMessages";
const USERS_STORAGE_KEY = "adminUsers";


// ============================================================
// GET ARRAY COUNT FROM LOCAL STORAGE
// ============================================================

function getLocalCount(key) {

  try {

    const value =
      localStorage.getItem(key);

    if (!value) {
      return 0;
    }

    const parsed =
      JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return 0;
    }

    return parsed.length;

  } catch (error) {

    console.warn(
      `Could not read localStorage key "${key}":`,
      error
    );

    return 0;
  }
}


// ============================================================
// UPDATE ONE BADGE
// ============================================================

function updateBadge(
  elementId,
  count
) {

  const badge =
    document.getElementById(elementId);

  if (!badge) {
    return;
  }

  const safeCount =
    Number.isFinite(Number(count))
      ? Math.max(0, Number(count))
      : 0;

  badge.textContent =
    safeCount;

  /*
   * Hide badge when there are no items.
   */

  if (safeCount <= 0) {

    badge.style.display =
      "none";

  } else {

    badge.style.display =
      "inline-flex";
  }
}


// ============================================================
// UPDATE ALL ADMIN SIDEBAR COUNTS
// ============================================================

export function updateSidebarCounts() {

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const productCount =
    getLocalCount(
      PRODUCTS_STORAGE_KEY
    );


  // ==========================================================
  // ORDERS
  // ==========================================================

  const orderCount =
    getLocalCount(
      ORDERS_STORAGE_KEY
    );


  // ==========================================================
  // PAYMENTS
  // ==========================================================

  const paymentCount =
    getLocalCount(
      PAYMENTS_STORAGE_KEY
    );


  // ==========================================================
  // MESSAGES
  // ==========================================================

  const messageCount =
    getLocalCount(
      MESSAGES_STORAGE_KEY
    );


  // ==========================================================
  // USERS
  // ==========================================================

  const usersCount =
    getLocalCount(
      USERS_STORAGE_KEY
    );


  // ==========================================================
  // UPDATE BADGES
  // ==========================================================

  updateBadge(
    "productCountBadge",
    productCount
  );

  updateBadge(
    "orderCountBadge",
    orderCount
  );

  updateBadge(
    "paymentCountBadge",
    paymentCount
  );

  updateBadge(
    "messageCountBadge",
    messageCount
  );

  updateBadge(
    "usersCountBadge",
    usersCount
  );
}


// ============================================================
// UPDATE ONE SPECIFIC BADGE
// ============================================================

export function refreshOrdersBadge() {

  updateBadge(
    "orderCountBadge",
    getLocalCount(
      ORDERS_STORAGE_KEY
    )
  );
}


export function refreshProductsBadge() {

  updateBadge(
    "productCountBadge",
    getLocalCount(
      PRODUCTS_STORAGE_KEY
    )
  );
}


export function refreshPaymentsBadge() {

  updateBadge(
    "paymentCountBadge",
    getLocalCount(
      PAYMENTS_STORAGE_KEY
    )
  );
}


export function refreshMessagesBadge() {

  updateBadge(
    "messageCountBadge",
    getLocalCount(
      MESSAGES_STORAGE_KEY
    )
  );
}


export function refreshUsersBadge() {

  updateBadge(
    "usersCountBadge",
    getLocalCount(
      USERS_STORAGE_KEY
    )
  );
}


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateSidebarCounts();

  }
);


// ============================================================
// LOCAL STORAGE CHANGES
//
// This fires when another browser tab/window changes
// localStorage.
//
// Example:
//
// Tab A deletes an order.
// Tab B automatically updates its Orders badge.
// ============================================================

window.addEventListener(
  "storage",
  event => {

    if (!event.key) {

      updateSidebarCounts();

      return;
    }

    const watchedKeys = [
      ORDERS_STORAGE_KEY,
      PRODUCTS_STORAGE_KEY,
      PAYMENTS_STORAGE_KEY,
      MESSAGES_STORAGE_KEY,
      USERS_STORAGE_KEY
    ];

    if (
      watchedKeys.includes(
        event.key
      )
    ) {

      updateSidebarCounts();
    }

  }
);


// ============================================================
// CUSTOM SIDEBAR UPDATE EVENT
//
// Other admin files can call:
//
// window.dispatchEvent(
//   new Event("adminSidebarUpdate")
// );
//
// This is useful because the normal "storage" event does NOT
// fire in the same browser tab that changed localStorage.
// ============================================================

window.addEventListener(
  "adminSidebarUpdate",
  () => {

    updateSidebarCounts();

  }
);


// ============================================================
// CUSTOM ORDERS UPDATE EVENT
//
// Your shared orders.js already dispatches:
//
// "adminOrdersUpdated"
//
// whenever saveOrders() is called.
//
// This makes the Orders badge update immediately.
// ============================================================

window.addEventListener(
  "adminOrdersUpdated",
  () => {

    refreshOrdersBadge();

  }
);


// ============================================================
// CUSTOM PRODUCTS UPDATE EVENT
// ============================================================

window.addEventListener(
  "adminProductsUpdated",
  () => {

    refreshProductsBadge();

  }
);


// ============================================================
// CUSTOM PAYMENTS UPDATE EVENT
// ============================================================

window.addEventListener(
  "adminPaymentsUpdated",
  () => {

    refreshPaymentsBadge();

  }
);


// ============================================================
// CUSTOM MESSAGES UPDATE EVENT
// ============================================================

window.addEventListener(
  "adminMessagesUpdated",
  () => {

    refreshMessagesBadge();

  }
);


// ============================================================
// CUSTOM USERS UPDATE EVENT
// ============================================================

window.addEventListener(
  "adminUsersUpdated",
  () => {

    refreshUsersBadge();

  }
);


// ============================================================
// MANUAL GLOBAL REFRESH
//
// Allows any admin page to force a complete sidebar refresh:
//
// window.refreshAdminSidebar();
//
// ============================================================

window.refreshAdminSidebar =
  function () {

    updateSidebarCounts();

  };


// ============================================================
// INITIAL UPDATE
//
// This handles cases where this module is imported after
// DOMContentLoaded has already fired.
// ============================================================

if (
  document.readyState === "loading"
) {

  // DOMContentLoaded handler above will run.

} else {

  updateSidebarCounts();

}