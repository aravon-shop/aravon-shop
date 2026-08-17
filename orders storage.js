// =======================================================
// ARAVON SHOP
// SHARED ADMIN ORDERS LOCAL STORAGE
// FILE: orders-storage.js
// =======================================================

const ORDERS_STORAGE_KEY = "adminOrders";


// =======================================================
// 3 DEMO ORDERS
// =======================================================

const DEMO_ORDERS = [

  {
    orderID: "order_1721670000001",

    USERINFO: {
      firstName: "Molly",
      lastName: "Barbie",
      email: "ti.a.eduardo24@gmail.com",
      phone: "31698765432"
    },

    shippingAddress: {
      street: "Klarden",
      houseNumber: "88",
      postalCode: "2589 CH",
      city: "Arnhem",
      country: "Netherlands"
    },

    total: 49,

    status: "Delivered",

    createdAtText: "2024-07-22 10:00",

    trackingNumber: "",

    trackingCarrier: "",

    trackingSent: false
  },


  {
    orderID: "order_1721670000002",

    USERINFO: {
      firstName: "Molly",
      lastName: "Barbie",
      email: "ti.a.eduardo24@gmail.com",
      phone: "31698765432"
    },

    shippingAddress: {
      street: "Klarden",
      houseNumber: "88",
      postalCode: "2589 CH",
      city: "Arnhem",
      country: "Netherlands"
    },

    total: 45,

    status: "Shipped",

    createdAtText: "2024-07-22 10:15",

    trackingNumber: "",

    trackingCarrier: "",

    trackingSent: false
  },


  {
    orderID: "order_1721670000003",

    USERINFO: {
      firstName: "Molly",
      lastName: "Barbie",
      email: "ti.a.eduardo24@gmail.com",
      phone: "31698765432"
    },

    shippingAddress: {
      street: "Klarden",
      houseNumber: "88",
      postalCode: "2589 CH",
      city: "Arnhem",
      country: "Netherlands"
    },

    total: 39,

    status: "Processing",

    createdAtText: "2024-07-22 10:30",

    trackingNumber: "",

    trackingCarrier: "",

    trackingSent: false
  }

];


// =======================================================
// INITIALIZE ORDERS
// =======================================================

export function initializeOrders() {

  try {

    const existing =
      localStorage.getItem(
        ORDERS_STORAGE_KEY
      );


    // IMPORTANT:
    // Never overwrite existing orders.
    if (existing !== null) {

      return getOrders();

    }


    localStorage.setItem(

      ORDERS_STORAGE_KEY,

      JSON.stringify(
        DEMO_ORDERS
      )

    );


    return [
      ...DEMO_ORDERS
    ];

  } catch (error) {

    console.error(
      "Orders initialization failed:",
      error
    );

    return [];

  }

}


// =======================================================
// GET ALL ORDERS
// =======================================================

export function getOrders() {

  try {

    const stored =
      localStorage.getItem(
        ORDERS_STORAGE_KEY
      );


    // No orders exist yet.
    if (stored === null) {

      return initializeOrders();

    }


    const parsed =
      JSON.parse(
        stored
      );


    // Make sure the stored value is an array.
    if (!Array.isArray(parsed)) {

      console.warn(
        "adminOrders is not an array. Resetting orders."
      );


      localStorage.setItem(

        ORDERS_STORAGE_KEY,

        JSON.stringify(
          DEMO_ORDERS
        )

      );


      return [
        ...DEMO_ORDERS
      ];

    }


    return parsed;

  } catch (error) {

    console.error(
      "Could not read adminOrders:",
      error
    );

    return [];

  }

}


// =======================================================
// SAVE ORDERS
// =======================================================

export function saveOrders(
  orders
) {

  try {

    if (!Array.isArray(orders)) {

      console.error(
        "saveOrders() requires an array."
      );

      return false;

    }


    localStorage.setItem(

      ORDERS_STORAGE_KEY,

      JSON.stringify(
        orders
      )

    );


    // Notify pages in the current tab.
    window.dispatchEvent(

      new CustomEvent(
        "adminOrdersUpdated",
        {
          detail: {
            orders: orders
          }
        }
      )

    );


    return true;

  } catch (error) {

    console.error(
      "Could not save adminOrders:",
      error
    );

    return false;

  }

}


// =======================================================
// ADD ORDER
// =======================================================

export function addOrder(
  order
) {

  if (
    !order ||
    !order.orderID
  ) {

    console.error(
      "Invalid order."
    );

    return false;

  }


  const orders =
    getOrders();


  const exists =
    orders.some(

      existingOrder =>

        String(
          existingOrder.orderID
        ) ===

        String(
          order.orderID
        )

    );


  if (exists) {

    console.warn(
      "Order already exists:",
      order.orderID
    );

    return false;

  }


  orders.push(
    order
  );


  return saveOrders(
    orders
  );

}


// =======================================================
// GET ONE ORDER BY ID
// =======================================================

export function getOrderById(
  orderID
) {

  if (!orderID) {

    return null;

  }


  const orders =
    getOrders();


  return (

    orders.find(

      order =>

        String(
          order.orderID
        ) ===

        String(
          orderID
        )

    ) || null

  );

}


// =======================================================
// UPDATE ORDER
// =======================================================

export function updateOrder(
  orderID,
  updates
) {

  if (
    !orderID ||
    !updates ||
    typeof updates !== "object"
  ) {

    return false;

  }


  const orders =
    getOrders();


  const index =
    orders.findIndex(

      order =>

        String(
          order.orderID
        ) ===

        String(
          orderID
        )

    );


  if (index === -1) {

    console.warn(
      "Order not found:",
      orderID
    );

    return false;

  }


  orders[index] = {

    ...orders[index],

    ...updates

  };


  return saveOrders(
    orders
  );

}


// =======================================================
// DELETE ORDER
// =======================================================

export function deleteOrder(
  orderID
) {

  if (!orderID) {

    return false;

  }


  const orders =
    getOrders();


  const filtered =
    orders.filter(

      order =>

        String(
          order.orderID
        ) !==

        String(
          orderID
        )

    );


  if (
    filtered.length ===
    orders.length
  ) {

    console.warn(
      "Order not found:",
      orderID
    );

    return false;

  }


  return saveOrders(
    filtered
  );

}


// =======================================================
// GET ORDER COUNT
// =======================================================

export function getOrderCount() {

  return getOrders().length;

}


// =======================================================
// CLEAR ALL ORDERS
// =======================================================

export function clearOrders() {

  try {

    localStorage.removeItem(
      ORDERS_STORAGE_KEY
    );


    window.dispatchEvent(

      new CustomEvent(
        "adminOrdersUpdated"
      )

    );


    return true;

  } catch (error) {

    console.error(
      "Could not clear orders:",
      error
    );

    return false;

  }

}


// =======================================================
// RESET TO THE 3 DEMO ORDERS
// =======================================================

export function resetDemoOrders() {

  return saveOrders(

    DEMO_ORDERS.map(

      order => ({

        ...order,

        USERINFO: {

          ...order.USERINFO

        },

        shippingAddress: {

          ...order.shippingAddress

        }

      })

    )

  );

}


// =======================================================
// AUTO INITIALIZE
// =======================================================

initializeOrders();