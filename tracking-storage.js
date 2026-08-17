"use strict";

/*
=========================================================
ARAVON SHOP
SHARED TRACKING STORAGE
=========================================================

Single shared tracking format used by:

ADMIN ORDER REVIEW
CUSTOMER ORDER DETAILS

Primary order storage:
adminOrders

Fallback tracking storage:
aravon_tracking_<orderId>
=========================================================
*/


/* =======================================================
   STORAGE KEY
======================================================= */

function getTrackingStorageKey(orderId) {

  return (
    "aravon_tracking_" +
    String(orderId || "").trim()
  );

}


/* =======================================================
   GET ADMIN ORDERS
======================================================= */

function getAdminOrders() {

  try {

    const raw =
      localStorage.getItem("adminOrders");

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      "Unable to read adminOrders:",
      error
    );

    return [];

  }

}


/* =======================================================
   SAVE ADMIN ORDERS
======================================================= */

function saveAdminOrders(orders) {

  try {

    localStorage.setItem(
      "adminOrders",
      JSON.stringify(
        Array.isArray(orders)
          ? orders
          : []
      )
    );

    return true;

  } catch (error) {

    console.error(
      "Unable to save adminOrders:",
      error
    );

    return false;

  }

}


/* =======================================================
   GET ORDER ID
======================================================= */

function getStoredOrderId(order) {

  if (!order) {
    return "";
  }

  return String(
    order.orderId ||
    order.orderID ||
    order.id ||
    ""
  ).trim();

}


/* =======================================================
   NORMALIZE TRACKING
======================================================= */

function normalizeTrackingData(
  tracking,
  order = {}
) {

  const source =
    tracking &&
    typeof tracking === "object"
      ? tracking
      : {};


  const number = String(

    source.number ||

    source.trackingNumber ||

    order.trackingNumber ||

    order.tracking_number ||

    ""

  ).trim();


  const carrier = String(

    source.carrier ||

    order.carrier ||

    order.shippingCarrier ||

    ""

  ).trim();


  const trackingLink = String(

    source.trackingLink ||

    source.trackingUrl ||

    source.url ||

    order.trackingLink ||

    order.trackingUrl ||

    order.trackingURL ||

    ""

  ).trim();


  const status = String(

    source.status ||

    order.trackingStatus ||

    ""

  ).trim().toLowerCase();


  const estimatedDelivery =

    source.estimatedDelivery ||

    source.deliveryDate ||

    order.estimatedDelivery ||

    order.deliveryDate ||

    "";


  const updatedAt =

    source.updatedAt ||

    order.trackingUpdatedAt ||

    order.updatedAt ||

    "";


  return {

    number,

    carrier,

    trackingLink,

    status:
      status || (
        number
          ? "shipped"
          : "incoming"
      ),

    estimatedDelivery,

    updatedAt

  };

}


/* =======================================================
   GET TRACKING FOR ORDER
======================================================= */

function getTrackingForOrder(order) {

  if (!order) {

    return {

      number: "",
      carrier: "",
      trackingLink: "",
      status: "incoming",
      estimatedDelivery: "",
      updatedAt: ""

    };

  }


  /*
  -------------------------------------------------------
  PRIMARY SOURCE
  Order.tracking
  -------------------------------------------------------
  */

  const nestedTracking =
    normalizeTrackingData(
      order.tracking,
      order
    );


  /*
  -------------------------------------------------------
  LOCAL STORAGE OVERRIDE
  -------------------------------------------------------
  */

  try {

    const key =
      getTrackingStorageKey(
        getStoredOrderId(order)
      );


    const raw =
      localStorage.getItem(key);


    if (raw) {

      const stored =
        JSON.parse(raw);


      if (
        stored &&
        typeof stored === "object"
      ) {

        return normalizeTrackingData(

          {
            ...nestedTracking,
            ...stored
          },

          order

        );

      }

    }

  } catch (error) {

    console.error(
      "Unable to read tracking storage:",
      error
    );

  }


  return nestedTracking;

}


/* =======================================================
   FIND ORDER IN ADMIN ORDERS
======================================================= */

function findAdminOrder(orderId) {

  const wanted =
    String(
      orderId || ""
    ).trim();


  if (!wanted) {
    return null;
  }


  const orders =
    getAdminOrders();


  return (

    orders.find(
      function (order) {

        return (
          getStoredOrderId(order) ===
          wanted
        );

      }
    ) ||

    null

  );

}


/* =======================================================
   SAVE TRACKING FOR ORDER
======================================================= */

function saveTrackingForOrder(
  orderId,
  tracking
) {

  const id =
    String(
      orderId || ""
    ).trim();


  if (!id) {
    return false;
  }


  const normalized =
    normalizeTrackingData(
      tracking,
      {}
    );


  /*
  -------------------------------------------------------
  SAVE FALLBACK TRACKING KEY
  -------------------------------------------------------
  */

  try {

    localStorage.setItem(

      getTrackingStorageKey(id),

      JSON.stringify(
        normalized
      )

    );

  } catch (error) {

    console.error(
      "Unable to save tracking:",
      error
    );

  }


  /*
  -------------------------------------------------------
  UPDATE ADMIN ORDERS TOO
  -------------------------------------------------------
  */

  const orders =
    getAdminOrders();


  let changed = false;


  const updatedOrders =
    orders.map(
      function (order) {

        if (
          getStoredOrderId(order) !==
          id
        ) {

          return order;

        }


        changed = true;


        return {

          ...order,

          tracking: {

            ...(order.tracking || {}),

            ...normalized

          },

          trackingNumber:
            normalized.number,

          carrier:
            normalized.carrier,

          trackingLink:
            normalized.trackingLink,

          trackingStatus:
            normalized.status,

          estimatedDelivery:
            normalized.estimatedDelivery,

          trackingUpdatedAt:
            normalized.updatedAt,

          updatedAt:
            normalized.updatedAt ||
            order.updatedAt,

          fulfillmentStatus:
            normalized.number
              ? "shipped"
              : (
                  order.fulfillmentStatus ||
                  "processing"
                )

        };

      }
    );


  if (changed) {

    saveAdminOrders(
      updatedOrders
    );

  }


  return true;

}


/* =======================================================
   LISTEN FOR ADMIN ORDER CHANGES
======================================================= */

function onAdminOrdersChanged(callback) {

  if (
    typeof callback !== "function"
  ) {

    return function () {};

  }


  function handler(event) {

    if (
      event.key === "adminOrders" ||
      (
        event.key &&
        event.key.startsWith(
          "aravon_tracking_"
        )
      )
    ) {

      callback(event);

    }

  }


  window.addEventListener(
    "storage",
    handler
  );


  return function () {

    window.removeEventListener(
      "storage",
      handler
    );

  };

}