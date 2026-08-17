// =============================================================
// ARAVON SHOP
// server.js
//
// Express local development server
//
// FEATURES
// - Serves /public
// - Serves homepage.json
// - Saves homepage.json for local development
// - Creates secure Stripe Checkout Sessions
// - Stores Aravon product IDs in Stripe product metadata
// - Confirms Stripe Checkout payment status
// - Creates real Aravon customer orders in Firestore
// - Generates internal Aravon order numbers
// - Prevents duplicate order creation
// - Recovers orders created by Stripe webhook or success page
// - Retrieves orders for the customer View Order page
// - Supports Stripe webhook payment confirmation
// - Keeps Stripe secret key server-side
// - Keeps Firebase Admin credentials server-side
//
// IMPORTANT:
// NEVER place secrets inside /public/.
//
// Stripe secret keys, Firebase private keys and webhook secrets
// belong ONLY in the root .env file.
//
// =============================================================

import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import crypto from "crypto";
import { fileURLToPath } from "url";


// =============================================================
// ENVIRONMENT
// =============================================================

dotenv.config();


// =============================================================
// PATH SETUP
// =============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(
    __dirname,
    "public"
);

const homepagePath = path.join(
    publicPath,
    "homepage.json"
);


// =============================================================
// EXPRESS APP
// =============================================================

const app = express();


// =============================================================
// CONFIGURATION
// =============================================================

const PORT =
    Number(process.env.PORT || 3000);

const SHOP_NAME =
    cleanText(process.env.SHOP_NAME) ||
    "Aravon Shop";

const CURRENCY =
    (
        cleanText(process.env.CURRENCY) ||
        "eur"
    ).toLowerCase();

const PUBLIC_BASE_URL =
    (
        process.env.PUBLIC_BASE_URL ||
        `http://localhost:${PORT}`
    ).replace(/\/+$/, "");

const SHOP_URL =
    PUBLIC_BASE_URL;


// =============================================================
// STRIPE CONFIGURATION
// =============================================================

const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

let stripe = null;

if (stripeSecretKey) {
    stripe = new Stripe(
        stripeSecretKey
    );
} else {
    console.warn(
        "WARNING: STRIPE_SECRET_KEY is not configured."
    );

    console.warn(
        "Stripe Checkout will not work until it is added to .env."
    );
}


// =============================================================
// FIREBASE ADMIN / FIRESTORE
// =============================================================

let firestore = null;
let firebaseAdminInitialized = false;


function initializeFirebaseAdmin() {
    try {
        if (admin.apps.length > 0) {
            firestore = admin.firestore();
            firebaseAdminInitialized = true;
            return true;
        }

        const projectId =
            cleanText(
                process.env.FIREBASE_PROJECT_ID
            );

        const clientEmail =
            cleanText(
                process.env.FIREBASE_CLIENT_EMAIL
            );

        const privateKey =
            process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(
                    /\\n/g,
                    "\n"
                )
                : "";

        if (
            !projectId ||
            !clientEmail ||
            !privateKey
        ) {
            console.warn(
                "WARNING: Firebase Admin credentials are not fully configured."
            );

            console.warn(
                "Firestore order storage will not be available."
            );

            return false;
        }

        admin.initializeApp({
            credential:
                admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
        });

        firestore =
            admin.firestore();

        firebaseAdminInitialized =
            true;

        console.log(
            "Firebase Admin / Firestore: configured"
        );

        return true;

    } catch (error) {
        console.error(
            "Aravon Shop: Firebase Admin initialization failed:",
            error
        );

        firestore = null;
        firebaseAdminInitialized = false;

        return false;
    }
}


initializeFirebaseAdmin();


// =============================================================
// STRIPE WEBHOOK SECRET
// =============================================================

const stripeWebhookSecret =
    cleanText(
        process.env.STRIPE_WEBHOOK_SECRET
    );


// =============================================================
// MIDDLEWARE
// =============================================================
//
// IMPORTANT:
//
// The Stripe webhook route must be registered BEFORE
// express.json(), because Stripe signature verification
// requires the original raw request body.
//
// =============================================================

app.disable(
    "x-powered-by"
);


// =============================================================
// STRIPE WEBHOOK
// =============================================================

app.post(
    "/stripe-webhook",
    express.raw({
        type: "application/json"
    }),
    async (req, res) => {
        try {
            if (!stripe) {
                return res
                    .status(500)
                    .send(
                        "Stripe is not configured."
                    );
            }

            if (!stripeWebhookSecret) {
                console.error(
                    "Stripe webhook secret is not configured."
                );

                return res
                    .status(500)
                    .send(
                        "Webhook secret is not configured."
                    );
            }

            const signature =
                req.headers[
                    "stripe-signature"
                ];

            if (!signature) {
                return res
                    .status(400)
                    .send(
                        "Missing Stripe signature."
                    );
            }

            let event;

            try {
                event =
                    stripe.webhooks.constructEvent(
                        req.body,
                        signature,
                        stripeWebhookSecret
                    );
            } catch (
                signatureError
            ) {
                console.error(
                    "Aravon Shop: Invalid Stripe webhook signature:",
                    signatureError.message
                );

                return res
                    .status(400)
                    .send(
                        "Invalid webhook signature."
                    );
            }


            // -------------------------------------------------
            // CHECKOUT COMPLETED
            // -------------------------------------------------

            if (
                event.type ===
                "checkout.session.completed"
            ) {
                const session =
                    event.data.object;

                if (
                    session.payment_status ===
                    "paid"
                ) {
                    try {
                        const order =
                            await createOrderFromStripeSession(
                                session
                            );

                        console.log(
                            `Aravon Shop: Order ${order.orderId} confirmed from Stripe webhook.`
                        );

                    } catch (
                        orderError
                    ) {
                        console.error(
                            "Aravon Shop: Could not create Firestore order from webhook:",
                            orderError
                        );

                        return res
                            .status(500)
                            .send(
                                "Order creation failed."
                            );
                    }
                }
            }


            // -------------------------------------------------
            // ASYNC PAYMENT SUCCEEDED
            // -------------------------------------------------

            if (
                event.type ===
                "checkout.session.async_payment_succeeded"
            ) {
                const session =
                    event.data.object;

                try {
                    const order =
                        await createOrderFromStripeSession(
                            session
                        );

                    console.log(
                        `Aravon Shop: Async payment order ${order.orderId} confirmed.`
                    );

                } catch (
                    orderError
                ) {
                    console.error(
                        "Aravon Shop: Could not create async-payment order:",
                        orderError
                    );

                    return res
                        .status(500)
                        .send(
                            "Order creation failed."
                        );
                }
            }


            // -------------------------------------------------
            // ASYNC PAYMENT FAILED
            // -------------------------------------------------

            if (
                event.type ===
                "checkout.session.async_payment_failed"
            ) {
                const session =
                    event.data.object;

                console.log(
                    `Aravon Shop: Async Stripe payment failed for session ${session.id}.`
                );
            }


            // -------------------------------------------------
            // PAYMENT INTENT SUCCEEDED
            // -------------------------------------------------

            if (
                event.type ===
                "payment_intent.succeeded"
            ) {
                console.log(
                    "Aravon Shop: Stripe payment intent succeeded."
                );
            }


            return res
                .status(200)
                .json({
                    received: true
                });

        } catch (error) {
            console.error(
                "Aravon Shop: Stripe webhook error:",
                error
            );

            return res
                .status(500)
                .send(
                    "Webhook processing error."
                );
        }
    }
);


// =============================================================
// JSON MIDDLEWARE
// =============================================================

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


// =============================================================
// HEALTH CHECK
// =============================================================

app.get(
    "/health",
    (req, res) => {
        res
            .status(200)
            .json({
                ok: true,
                service: SHOP_NAME,
                server: "running",
                stripe: Boolean(stripe),
                firestore: Boolean(firestore)
            });
    }
);


// =============================================================
// FIRESTORE HEALTH CHECK
// =============================================================

app.get(
    "/api/firestore-status",
    async (req, res) => {
        if (!firestore) {
            return res
                .status(503)
                .json({
                    success: false,
                    firestore: false,
                    error:
                        "Firestore is not configured."
                });
        }

        try {
            await firestore
                .collection("_server_health")
                .doc("status")
                .set(
                    {
                        service: SHOP_NAME,

                        checkedAt:
                            admin
                                .firestore
                                .FieldValue
                                .serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );

            return res
                .status(200)
                .json({
                    success: true,
                    firestore: true
                });

        } catch (error) {
            console.error(
                "Firestore health check failed:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    firestore: false,
                    error:
                        "Firestore connection failed."
                });
        }
    }
);


// =============================================================
// HOMEPAGE.JSON
// =============================================================


// -------------------------------------------------------------
// GET homepage.json
// -------------------------------------------------------------

app.get(
    "/homepage.json",
    (req, res) => {
        try {
            if (
                !fs.existsSync(
                    homepagePath
                )
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "homepage.json was not found."
                    });
            }

            const data =
                fs.readFileSync(
                    homepagePath,
                    "utf8"
                );

            JSON.parse(data);

            res.setHeader(
                "Content-Type",
                "application/json; charset=utf-8"
            );

            return res.send(
                data
            );

        } catch (error) {
            console.error(
                "Aravon Shop: Cannot read homepage.json:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Cannot read homepage.json."
                });
        }
    }
);


// -------------------------------------------------------------
// PUT homepage.json
// -------------------------------------------------------------

app.put(
    "/homepage.json",
    (req, res) => {
        try {
            if (
                !req.body ||
                typeof req.body !== "object" ||
                Array.isArray(req.body)
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid homepage configuration."
                    });
            }

            fs.writeFileSync(
                homepagePath,
                JSON.stringify(
                    req.body,
                    null,
                    2
                ),
                "utf8"
            );

            return res.json({
                status: "saved"
            });

        } catch (error) {
            console.error(
                "Aravon Shop: Cannot save homepage.json:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Cannot save homepage.json."
                });
        }
    }
);


// =============================================================
// STRIPE CHECKOUT
// =============================================================

app.post(
    "/create-checkout-session",
    async (req, res) => {
        try {
            if (!stripe) {
                return res
                    .status(500)
                    .json({
                        error:
                            "Stripe is not configured on the server. Add STRIPE_SECRET_KEY to the root .env file."
                    });
            }

            const body =
                req.body || {};

            const customer =
                body.customer || {};

            const items =
                Array.isArray(body.items)
                    ? body.items
                    : [];


            // -------------------------------------------------
            // CUSTOMER
            // -------------------------------------------------

            const firstName =
                cleanText(
                    customer.firstName
                );

            const lastName =
                cleanText(
                    customer.lastName
                );

            const email =
                cleanText(
                    customer.email
                );

            const phone =
                cleanText(
                    customer.phone
                );

            const houseNumber =
                cleanText(
                    customer.houseNumber
                );

            const address =
                cleanText(
                    customer.address
                );

            const city =
                cleanText(
                    customer.city
                );

            const zip =
                cleanText(
                    customer.zip
                );

            const country =
                cleanText(
                    customer.country
                );


            if (
                !firstName ||
                !lastName ||
                !email ||
                !address ||
                !city ||
                !zip
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Required customer information is missing."
                    });
            }


            if (
                !isValidEmail(
                    email
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Please provide a valid email address."
                    });
            }


            // -------------------------------------------------
            // CART
            // -------------------------------------------------

            if (
                items.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Your cart is empty."
                    });
            }


            // -------------------------------------------------
            // NORMALIZE CART
            // -------------------------------------------------

            const normalizedItems =
                items.map(
                    (item) => {
                        const id =
                            cleanText(
                                item.id ||
                                item.productId
                            );

                        const name =
                            cleanText(
                                item.name
                            ) ||
                            "Aravon Shop Product";

                        const price =
                            parsePrice(
                                item.price
                            );

                        const quantity =
                            parseQuantity(
                                item.quantity
                            );

                        const image =
                            cleanText(
                                item.image
                            );

                        const size =
                            cleanText(
                                item.size
                            );

                        const gender =
                            cleanText(
                                item.gender
                            );

                        const category =
                            cleanText(
                                item.category
                            );

                        return {
                            id,
                            name,
                            price,
                            quantity,
                            image,
                            size,
                            gender,
                            category
                        };
                    }
                );


            // -------------------------------------------------
            // VALIDATE ITEMS
            // -------------------------------------------------

            for (
                const item of normalizedItems
            ) {
                if (!item.id) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "A cart item is missing its product ID."
                        });
                }

                if (
                    !Number.isFinite(
                        item.price
                    ) ||
                    item.price <= 0
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                `Invalid price for product "${item.name}".`
                        });
                }

                if (
                    !Number.isInteger(
                        item.quantity
                    ) ||
                    item.quantity < 1 ||
                    item.quantity > 99
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                `Invalid quantity for product "${item.name}".`
                        });
                }
            }


            // -------------------------------------------------
            // CALCULATE SERVER TOTAL
            // -------------------------------------------------

            let subtotalCents = 0;
            let itemCount = 0;

            for (
                const item of normalizedItems
            ) {
                const unitPriceCents =
                    Math.round(
                        item.price * 100
                    );

                subtotalCents +=
                    unitPriceCents *
                    item.quantity;

                itemCount +=
                    item.quantity;
            }


            // -------------------------------------------------
            // SHIPPING
            // -------------------------------------------------

            const FREE_SHIPPING_THRESHOLD_CENTS =
                5000;

            const STANDARD_SHIPPING_CENTS =
                495;

            const shippingCents =
                subtotalCents >=
                FREE_SHIPPING_THRESHOLD_CENTS
                    ? 0
                    : STANDARD_SHIPPING_CENTS;

            const totalCents =
                subtotalCents +
                shippingCents;


            if (
                totalCents <= 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "The checkout total is invalid."
                    });
            }


            // -------------------------------------------------
            // STRIPE LINE ITEMS
            // -------------------------------------------------
            //
            // IMPORTANT FIX:
            //
            // The ORIGINAL ARAVON PRODUCT ID is stored on the
            // Stripe Product itself:
            //
            // product_data.metadata.productId
            //
            // Later, when the order is recovered from Stripe,
            // createOrderFromStripeSession() reads:
            //
            // product.metadata.productId
            //
            // This prevents the Firestore order from losing
            // the original Aravon product ID.
            //
            // -------------------------------------------------

            const lineItems =
                normalizedItems.map(
                    (item) => {

                        // -------------------------------------
                        // STRIPE PRODUCT METADATA
                        // -------------------------------------
                        //
                        // This is the critical fix.
                        //
                        // item.id is the original Aravon product
                        // ID from the cart.
                        //
                        // -------------------------------------

                        const productMetadata = {
                            productId:
                                limitMetadata(
                                    item.id
                                )
                        };


                        if (item.size) {
                            productMetadata.size =
                                limitMetadata(
                                    item.size
                                );
                        }

                        if (item.gender) {
                            productMetadata.gender =
                                limitMetadata(
                                    item.gender
                                );
                        }

                        if (item.category) {
                            productMetadata.category =
                                limitMetadata(
                                    item.category
                                );
                        }


                        // -------------------------------------
                        // STRIPE PRODUCT DATA
                        // -------------------------------------

                        const productData = {
                            name:
                                item.name,

                            // IMPORTANT:
                            //
                            // The Aravon product ID is stored
                            // directly in Stripe Product metadata.
                            //
                            metadata:
                                productMetadata
                        };


                        // -------------------------------------
                        // DESCRIPTION
                        // -------------------------------------

                        const descriptionParts = [];


                        if (item.size) {
                            descriptionParts.push(
                                `Size: ${item.size}`
                            );
                        }

                        if (item.gender) {
                            descriptionParts.push(
                                `Gender: ${item.gender}`
                            );
                        }

                        if (item.category) {
                            descriptionParts.push(
                                `Category: ${item.category}`
                            );
                        }


                        if (
                            descriptionParts.length
                        ) {
                            productData.description =
                                descriptionParts.join(
                                    " • "
                                );
                        }


                        // -------------------------------------
                        // PRODUCT IMAGE
                        // -------------------------------------

                        if (
                            isValidHttpUrl(
                                item.image
                            )
                        ) {
                            productData.images = [
                                item.image
                            ];
                        }


                        // -------------------------------------
                        // STRIPE PRICE
                        // -------------------------------------

                        return {
                            price_data: {
                                currency:
                                    CURRENCY,

                                product_data:
                                    productData,

                                unit_amount:
                                    Math.round(
                                        item.price * 100
                                    )
                            },

                            quantity:
                                item.quantity
                        };
                    }
                );


            // -------------------------------------------------
            // SHIPPING LINE ITEM
            // -------------------------------------------------

            if (
                shippingCents > 0
            ) {
                lineItems.push({
                    price_data: {
                        currency:
                            CURRENCY,

                        product_data: {
                            name:
                                "Standard Shipping"
                        },

                        unit_amount:
                            shippingCents
                    },

                    quantity: 1
                });
            }


            // -------------------------------------------------
            // CREATE STRIPE CHECKOUT SESSION
            // -------------------------------------------------

            const session =
                await stripe.checkout.sessions.create({
                    mode:
                        "payment",

                    payment_method_types: [
                        "card"
                    ],

                    line_items:
                        lineItems,

                    customer_email:
                        email,

                    billing_address_collection:
                        "auto",

                    shipping_address_collection: {
                        allowed_countries: [
                            "NL",
                            "BE",
                            "DE",
                            "FR",
                            "LU"
                        ]
                    },

                    metadata: {
                        firstName:
                            limitMetadata(
                                firstName
                            ),

                        lastName:
                            limitMetadata(
                                lastName
                            ),

                        phone:
                            limitMetadata(
                                phone
                            ),

                        houseNumber:
                            limitMetadata(
                                houseNumber
                            ),

                        address:
                            limitMetadata(
                                address
                            ),

                        city:
                            limitMetadata(
                                city
                            ),

                        zip:
                            limitMetadata(
                                zip
                            ),

                        country:
                            limitMetadata(
                                country
                            ),

                        itemCount:
                            String(
                                itemCount
                            )
                    },

                    success_url:
                        `${SHOP_URL}/cart/success.html?session_id={CHECKOUT_SESSION_ID}`,

                    cancel_url:
                        `${SHOP_URL}/cart/cancel.html`
                });


            if (!session.url) {
                console.error(
                    "Stripe did not return a Checkout URL.",
                    session.id
                );

                return res
                    .status(500)
                    .json({
                        error:
                            "Stripe Checkout URL was not returned."
                    });
            }


            return res.json({
                url:
                    session.url,

                sessionId:
                    session.id
            });

        } catch (error) {
            console.error(
                "Aravon secure checkout error:",
                error
            );

            if (
                error &&
                error.type &&
                String(
                    error.type
                ).startsWith("Stripe")
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            error.message ||
                            "Stripe Checkout could not be created."
                    });
            }

            return res
                .status(500)
                .json({
                    error:
                        "Unable to create secure Stripe checkout."
                });
        }
    }
);


// =============================================================
// STRIPE CHECKOUT STATUS
// =============================================================
//
// GET /api/checkout-status?session_id=cs_...
//
// Stripe is the authority for payment status.
//
// Once payment is confirmed, this endpoint ensures that a real
// Aravon Firestore order exists.
//
// =============================================================

app.get(
    "/api/checkout-status",
    async (req, res) => {
        try {
            if (!stripe) {
                return res
                    .status(500)
                    .json({
                        success: false,
                        confirmed: false,
                        error:
                            "Stripe is not configured on the server."
                    });
            }


            const sessionId =
                cleanText(
                    req.query.session_id
                );


            if (!sessionId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        confirmed: false,
                        error:
                            "Stripe checkout session ID is required."
                    });
            }


            if (
                !sessionId.startsWith(
                    "cs_"
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        confirmed: false,
                        error:
                            "Invalid Stripe checkout session ID."
                    });
            }


            const session =
                await stripe.checkout.sessions.retrieve(
                    sessionId
                );


            const paymentStatus =
                session.payment_status ||
                "unknown";

            const sessionStatus =
                session.status ||
                "unknown";


            let orderId =
                session.metadata &&
                session.metadata.orderId
                    ? cleanText(
                        session.metadata.orderId
                    )
                    : null;


            // -------------------------------------------------
            // PAYMENT CONFIRMED
            // -------------------------------------------------

            if (
                paymentStatus === "paid" &&
                sessionStatus === "complete"
            ) {
                if (!firestore) {
                    return res
                        .status(503)
                        .json({
                            success: true,
                            confirmed: true,
                            paymentStatus,
                            sessionStatus,
                            orderId: null,
                            sessionId:
                                session.id,
                            orderCreationFailed:
                                true,
                            error:
                                "Payment was confirmed, but Firestore is not configured."
                        });
                }


                try {
                    const order =
                        await createOrderFromStripeSession(
                            session
                        );

                    orderId =
                        order.orderId;

                } catch (
                    orderError
                ) {
                    console.error(
                        "Aravon Shop: Payment is confirmed, but order creation failed:",
                        orderError
                    );

                    return res
                        .status(500)
                        .json({
                            success: true,
                            confirmed: true,
                            paymentStatus,
                            sessionStatus,
                            orderId: null,
                            sessionId:
                                session.id,
                            orderCreationFailed:
                                true,
                            error:
                                "Payment was confirmed, but the Aravon order could not be stored yet."
                        });
                }


                return res
                    .status(200)
                    .json({
                        success: true,
                        confirmed: true,
                        paymentStatus,
                        sessionStatus,
                        orderId,
                        sessionId:
                            session.id
                    });
            }


            // -------------------------------------------------
            // EXPIRED
            // -------------------------------------------------

            if (
                sessionStatus ===
                "expired"
            ) {
                return res
                    .status(200)
                    .json({
                        success: true,
                        confirmed: false,
                        paymentStatus,
                        sessionStatus,
                        orderStatus:
                            "expired",
                        orderId,
                        sessionId:
                            session.id
                    });
            }


            // -------------------------------------------------
            // PENDING
            // -------------------------------------------------

            return res
                .status(200)
                .json({
                    success: true,
                    confirmed: false,
                    paymentStatus,
                    sessionStatus,
                    orderId,
                    sessionId:
                        session.id
                });

        } catch (error) {
            console.error(
                "Aravon Shop: Stripe checkout status error:",
                error
            );


            if (
                error &&
                error.code ===
                "resource_missing"
            ) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        confirmed: false,
                        error:
                            "The Stripe checkout session could not be found."
                    });
            }


            if (
                error &&
                error.type ===
                "StripeInvalidRequestError"
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        confirmed: false,
                        error:
                            "The Stripe checkout session is invalid."
                    });
            }


            return res
                .status(500)
                .json({
                    success: false,
                    confirmed: false,
                    error:
                        "Unable to securely confirm the Stripe payment."
                });
        }
    }
);


// =============================================================
// GET CUSTOMER ORDER
// =============================================================
//
// GET /api/orders/:orderId
//
// Used by the customer's View Order button.
//
// =============================================================

app.get(
    "/api/orders/:orderId",
    async (req, res) => {
        try {
            if (!firestore) {
                return res
                    .status(503)
                    .json({
                        success: false,
                        error:
                            "Order storage is not configured."
                    });
            }


            const orderId =
                cleanText(
                    req.params.orderId
                );


            if (!orderId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Order ID is required."
                    });
            }


            const orderReference =
                firestore
                    .collection("orders")
                    .doc(orderId);


            const snapshot =
                await orderReference.get();


            if (!snapshot.exists) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            "Order not found."
                    });
            }


            const order =
                snapshot.data();


            return res
                .status(200)
                .json({
                    success: true,

                    order:
                        sanitizeOrderForCustomer(
                            order
                        )
                });

        } catch (error) {
            console.error(
                "Aravon Shop: Could not retrieve order:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Unable to retrieve the order."
                });
        }
    }
);


// =============================================================
// ADMIN ORDER LOOKUP
// =============================================================
//
// NOTE:
// Add your Firebase Authentication/admin middleware here when
// your admin API authentication is connected.
//
// =============================================================

app.get(
    "/api/admin/orders/:orderId",
    async (req, res) => {
        try {
            if (!firestore) {
                return res
                    .status(503)
                    .json({
                        success: false,
                        error:
                            "Order storage is not configured."
                    });
            }


            const orderId =
                cleanText(
                    req.params.orderId
                );


            if (!orderId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Order ID is required."
                    });
            }


            const snapshot =
                await firestore
                    .collection("orders")
                    .doc(orderId)
                    .get();


            if (!snapshot.exists) {
                return res
                    .status(404)
                    .json({
                        success: false,
                        error:
                            "Order not found."
                    });
            }


            return res
                .status(200)
                .json({
                    success: true,

                    order:
                        snapshot.data()
                });

        } catch (error) {
            console.error(
                "Aravon Shop: Admin order lookup error:",
                error
            );

            return res
                .status(500)
                .json({
                    success: false,
                    error:
                        "Unable to retrieve admin order."
                });
        }
    }
);


// =============================================================
// SERVE PUBLIC FOLDER
// =============================================================

app.use(
    express.static(
        publicPath,
        {
            extensions: [
                "html"
            ]
        }
    )
);


// =============================================================
// ROOT ROUTE
// =============================================================

app.get(
    "/",
    (req, res) => {
        res.sendFile(
            path.join(
                publicPath,
                "index.html"
            )
        );
    }
);


// =============================================================
// 404 HANDLER
// =============================================================

app.use(
    (req, res) => {
        if (
            req.path.startsWith(
                "/api/"
            ) ||
            req.path ===
            "/create-checkout-session" ||
            req.path ===
            "/stripe-webhook"
        ) {
            return res
                .status(404)
                .json({
                    error:
                        "API endpoint not found."
                });
        }


        return res
            .status(404)
            .sendFile(
                path.join(
                    publicPath,
                    "index.html"
                )
            );
    }
);


// =============================================================
// GLOBAL ERROR HANDLER
// =============================================================

app.use(
    (error, req, res, next) => {
        console.error(
            "Aravon server error:",
            error
        );


        if (res.headersSent) {
            return next(error);
        }


        return res
            .status(500)
            .json({
                error:
                    "An unexpected server error occurred."
            });
    }
);


// =============================================================
// FIRESTORE ORDER CREATION
// =============================================================
//
// This function creates the REAL Aravon order.
//
// It is intentionally idempotent.
//
// Both:
//
// Stripe webhook
//
// and:
//
// /api/checkout-status
//
// can safely call this function.
//
// The Stripe Checkout Session ID is the unique payment
// reference.
//
// The customer-facing order ID is:
//
// ARV-YYYYMMDD-XXXXXX
//
// Example:
//
// ARV-20260817-8F4K2M
//
// =============================================================

async function createOrderFromStripeSession(
    session
) {
    if (!firestore) {
        throw new Error(
            "Firestore is not configured."
        );
    }


    if (
        !session ||
        !session.id
    ) {
        throw new Error(
            "A valid Stripe Checkout Session is required."
        );
    }


    // ---------------------------------------------------------
    // PAYMENT MUST BE CONFIRMED
    // ---------------------------------------------------------

    if (
        session.payment_status !==
        "paid"
    ) {
        throw new Error(
            "Cannot create a paid order before Stripe confirms payment."
        );
    }


    // ---------------------------------------------------------
    // CHECK STRIPE METADATA FIRST
    // ---------------------------------------------------------

    const metadataOrderId =
        session.metadata &&
        session.metadata.orderId
            ? cleanText(
                session.metadata.orderId
            )
            : "";


    if (metadataOrderId) {
        try {
            const existingByMetadata =
                await firestore
                    .collection("orders")
                    .doc(
                        metadataOrderId
                    )
                    .get();


            if (
                existingByMetadata.exists
            ) {
                return {
                    orderId:
                        metadataOrderId,

                    created: false,

                    order:
                        existingByMetadata.data()
                };
            }

        } catch (error) {
            console.warn(
                "Aravon Shop: Could not check orderId stored in Stripe metadata:",
                error.message
            );
        }
    }


    // ---------------------------------------------------------
    // CHECK FOR EXISTING ORDER BY STRIPE SESSION ID
    // ---------------------------------------------------------

    const existingSnapshot =
        await firestore
            .collection("orders")
            .where(
                "stripeSessionId",
                "==",
                session.id
            )
            .limit(1)
            .get();


    if (
        !existingSnapshot.empty
    ) {
        const existingDocument =
            existingSnapshot.docs[0];

        const existingOrder =
            existingDocument.data();

        const existingOrderId =
            cleanText(
                existingOrder.orderId ||
                existingDocument.id
            );


        if (
            existingOrderId &&
            (
                !session.metadata ||
                session.metadata.orderId !==
                existingOrderId
            )
        ) {
            await updateStripeSessionMetadata(
                session,
                existingOrderId
            );
        }


        return {
            orderId:
                existingOrderId,

            created: false,

            order:
                existingOrder
        };
    }


    // ---------------------------------------------------------
    // BUILD ORDER
    // ---------------------------------------------------------

    const orderId =
        generateOrderId();


    const customer =
        extractCustomerFromSession(
            session
        );


    const stripeLineItems =
        await retrieveStripeLineItems(
            session.id
        );


    if (
        stripeLineItems.length === 0
    ) {
        throw new Error(
            "Stripe returned no checkout line items. The order was not created."
        );
    }


    // ---------------------------------------------------------
    // CONVERT STRIPE ITEMS TO ARAVON ITEMS
    // ---------------------------------------------------------
    //
    // IMPORTANT FIX:
    //
    // The original Aravon product ID is stored in:
    //
    // product.metadata.productId
    //
    // because create-checkout-session stores it in:
    //
    // price_data.product_data.metadata.productId
    //
    // ---------------------------------------------------------

    const items =
        stripeLineItems
            .filter(
                (lineItem) =>
                    lineItem.price &&
                    lineItem.price.product
            )
            .map(
                (lineItem) => {

                    const product =
                        typeof lineItem.price.product ===
                        "object"
                            ? lineItem.price.product
                            : null;


                    const productMetadata =
                        product &&
                        product.metadata
                            ? product.metadata
                            : {};


                    // -----------------------------------------
                    // ORIGINAL ARAVON PRODUCT ID
                    // -----------------------------------------

                    const productId =
                        cleanText(
                            productMetadata.productId
                        );


                    const productName =
                        product &&
                        product.name
                            ? cleanText(
                                product.name
                            )
                            : "Aravon Shop Product";


                    return {

                        // IMPORTANT:
                        // Original Aravon product ID.
                        id:
                            productId ||
                            null,

                        // Same ID explicitly available as
                        // productId for admin/order systems.
                        productId:
                            productId ||
                            null,

                        name:
                            productName,

                        quantity:
                            Number(
                                lineItem.quantity ||
                                1
                            ),

                        unitPrice:
                            Number(
                                lineItem.price.unit_amount ||
                                0
                            ) / 100,

                        currency:
                            (
                                lineItem.price.currency ||
                                CURRENCY
                            ).toLowerCase(),

                        description:
                            product &&
                            product.description
                                ? cleanText(
                                    product.description
                                )
                                : "",

                        image:
                            product &&
                            Array.isArray(
                                product.images
                            ) &&
                            product.images.length
                                ? cleanText(
                                    product.images[0]
                                )
                                : null,

                        size:
                            cleanText(
                                productMetadata.size
                            ),

                        gender:
                            cleanText(
                                productMetadata.gender
                            ),

                        category:
                            cleanText(
                                productMetadata.category
                            )
                    };
                }
            );


    // ---------------------------------------------------------
    // MAKE SURE PRODUCTS WERE FOUND
    // ---------------------------------------------------------

    if (
        items.length === 0
    ) {
        throw new Error(
            "Stripe checkout items could not be converted into Aravon products."
        );
    }


    // ---------------------------------------------------------
    // TOTALS
    // ---------------------------------------------------------

    const amountTotalCents =
        Number(
            session.amount_total ||
            0
        );


    const amountSubtotalCents =
        Number(
            session.amount_subtotal ||
            0
        );


    const shippingTotalCents =
        Math.max(
            0,
            amountTotalCents -
            amountSubtotalCents
        );


    // ---------------------------------------------------------
    // CREATE FIRESTORE DOCUMENT
    // ---------------------------------------------------------

    const orderData = {
        orderId,

        orderNumber:
            orderId,

        stripeSessionId:
            session.id,

        stripePaymentIntentId:
            typeof session.payment_intent ===
            "string"
                ? session.payment_intent
                : null,

        paymentStatus:
            "paid",

        orderStatus:
            "processing",

        fulfillmentStatus:
            "unfulfilled",

        currency:
            (
                session.currency ||
                CURRENCY
            ).toLowerCase(),

        subtotal:
            amountSubtotalCents /
            100,

        shipping:
            shippingTotalCents /
            100,

        total:
            amountTotalCents /
            100,

        itemCount:
            items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.quantity ||
                        0
                    ),
                0
            ),

        customer,

        items,

        stripe: {
            checkoutSessionId:
                session.id,

            paymentIntentId:
                typeof session.payment_intent ===
                "string"
                    ? session.payment_intent
                    : null,

            paymentStatus:
                session.payment_status,

            sessionStatus:
                session.status
        },

        createdAt:
            admin
                .firestore
                .FieldValue
                .serverTimestamp(),

        updatedAt:
            admin
                .firestore
                .FieldValue
                .serverTimestamp(),

        paidAt:
            admin
                .firestore
                .FieldValue
                .serverTimestamp()
    };


    // ---------------------------------------------------------
    // USE ORDER ID AS FIRESTORE DOCUMENT ID
    // ---------------------------------------------------------

    const orderReference =
        firestore
            .collection("orders")
            .doc(
                orderId
            );


    try {
        await orderReference.create(
            orderData
        );

    } catch (createError) {

        // -----------------------------------------------------
        // RACE CONDITION RECOVERY
        // -----------------------------------------------------

        if (
            createError &&
            (
                createError.code ===
                6 ||
                createError.code ===
                "already-exists" ||
                createError.code ===
                "ALREADY_EXISTS"
            )
        ) {
            const recovered =
                await orderReference.get();


            if (
                recovered.exists
            ) {
                const recoveredOrder =
                    recovered.data();


                await updateStripeSessionMetadata(
                    session,
                    recoveredOrder.orderId ||
                    orderId
                );


                return {
                    orderId:
                        recoveredOrder.orderId ||
                        orderId,

                    created: false,

                    order:
                        recoveredOrder
                };
            }
        }


        throw createError;
    }


    // ---------------------------------------------------------
    // SAVE INTERNAL ORDER ID IN STRIPE METADATA
    // ---------------------------------------------------------

    await updateStripeSessionMetadata(
        session,
        orderId
    );


    return {
        orderId,

        created: true,

        order:
            orderData
    };
}


// =============================================================
// RETRIEVE STRIPE LINE ITEMS
// =============================================================

async function retrieveStripeLineItems(
    sessionId
) {
    if (!stripe) {
        throw new Error(
            "Stripe is not configured."
        );
    }


    try {
        const response =
            await stripe.checkout.sessions.listLineItems(
                sessionId,
                {
                    limit: 100,

                    expand: [
                        "data.price.product"
                    ]
                }
            );


        return Array.isArray(
            response.data
        )
            ? response.data
            : [];

    } catch (error) {
        console.error(
            "Aravon Shop: Could not retrieve Stripe line items:",
            error
        );

        throw new Error(
            "Could not retrieve Stripe checkout line items."
        );
    }
}


// =============================================================
// UPDATE STRIPE SESSION METADATA
// =============================================================

async function updateStripeSessionMetadata(
    session,
    orderId
) {
    if (
        !stripe ||
        !session ||
        !session.id ||
        !orderId
    ) {
        return;
    }


    try {
        await stripe.checkout.sessions.update(
            session.id,
            {
                metadata: {
                    ...(session.metadata || {}),
                    orderId
                }
            }
        );

    } catch (error) {
        // Firestore order already exists.
        // Metadata failure should not delete or invalidate it.
        console.error(
            "Aravon Shop: Could not write orderId to Stripe metadata:",
            error
        );
    }
}


// =============================================================
// EXTRACT CUSTOMER INFORMATION
// =============================================================

function extractCustomerFromSession(
    session
) {
    const metadata =
        session.metadata || {};

    const customerDetails =
        session.customer_details || {};

    const shippingDetails =
        session.shipping_details || {};

    const shippingAddress =
        shippingDetails.address || {};

    const billingAddress =
        customerDetails.address || {};


    const firstName =
        cleanText(
            metadata.firstName
        );


    const lastName =
        cleanText(
            metadata.lastName
        );


    const email =
        cleanText(
            customerDetails.email
        ) ||
        cleanText(
            session.customer_email
        );


    const phone =
        cleanText(
            customerDetails.phone
        ) ||
        cleanText(
            metadata.phone
        );


    const address =
        cleanText(
            shippingAddress.line1
        ) ||
        cleanText(
            metadata.address
        ) ||
        cleanText(
            billingAddress.line1
        );


    const addressLine2 =
        cleanText(
            shippingAddress.line2
        ) ||
        cleanText(
            billingAddress.line2
        );


    const city =
        cleanText(
            shippingAddress.city
        ) ||
        cleanText(
            metadata.city
        ) ||
        cleanText(
            billingAddress.city
        );


    const zip =
        cleanText(
            shippingAddress.postal_code
        ) ||
        cleanText(
            metadata.zip
        ) ||
        cleanText(
            billingAddress.postal_code
        );


    const country =
        cleanText(
            shippingAddress.country
        ) ||
        cleanText(
            metadata.country
        ) ||
        cleanText(
            billingAddress.country
        );


    const houseNumber =
        cleanText(
            metadata.houseNumber
        );


    return {
        firstName,

        lastName,

        fullName:
            [
                firstName,
                lastName
            ]
                .filter(Boolean)
                .join(" ") ||
            cleanText(
                shippingDetails.name
            ) ||
            cleanText(
                customerDetails.name
            ),

        email,

        phone,

        houseNumber,

        address,

        addressLine2,

        city,

        zip,

        country
    };
}


// =============================================================
// SANITIZE ORDER FOR CUSTOMER
// =============================================================
//
// This keeps internal Firestore/Stripe fields away from the
// customer-facing View Order response.
//
// =============================================================

function sanitizeOrderForCustomer(
    order
) {
    return {
        orderId:
            cleanText(
                order.orderId
            ),

        orderNumber:
            cleanText(
                order.orderNumber ||
                order.orderId
            ),

        paymentStatus:
            cleanText(
                order.paymentStatus
            ),

        orderStatus:
            cleanText(
                order.orderStatus
            ),

        fulfillmentStatus:
            cleanText(
                order.fulfillmentStatus
            ),

        currency:
            cleanText(
                order.currency
            ),

        subtotal:
            Number(
                order.subtotal ||
                0
            ),

        shipping:
            Number(
                order.shipping ||
                0
            ),

        total:
            Number(
                order.total ||
                0
            ),

        itemCount:
            Number(
                order.itemCount ||
                0
            ),

        customer:
            order.customer ||
            {},

        items:
            Array.isArray(
                order.items
            )
                ? order.items
                : [],

        createdAt:
            serializeFirestoreTimestamp(
                order.createdAt
            ),

        updatedAt:
            serializeFirestoreTimestamp(
                order.updatedAt
            ),

        paidAt:
            serializeFirestoreTimestamp(
                order.paidAt
            )
    };
}


// =============================================================
// SERIALIZE FIRESTORE TIMESTAMP
// =============================================================

function serializeFirestoreTimestamp(
    value
) {
    if (!value) {
        return null;
    }


    if (
        typeof value.toDate ===
        "function"
    ) {
        return value
            .toDate()
            .toISOString();
    }


    if (
        value instanceof Date
    ) {
        return value.toISOString();
    }


    return value;
}


// =============================================================
// GENERATE ARAVON ORDER ID
// =============================================================
//
// Example:
//
// ARV-20260817-8F4K2M
//
// =============================================================

function generateOrderId() {
    const now =
        new Date();


    const year =
        now
            .getUTCFullYear()
            .toString();


    const month =
        String(
            now.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getUTCDate()
        ).padStart(
            2,
            "0"
        );


    const randomPart =
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()
            .slice(
                0,
                6
            );


    return (
        `ARV-${year}${month}${day}-${randomPart}`
    );
}


// =============================================================
// CLEAN TEXT
// =============================================================

function cleanText(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .trim()
        .slice(
            0,
            500
        );
}


// =============================================================
// PARSE PRICE
// =============================================================

function parsePrice(
    value
) {
    if (
        typeof value ===
        "number"
    ) {
        return value;
    }


    if (
        typeof value ===
        "string"
    ) {
        const cleaned =
            value
                .replace(
                    /[^\d.,-]/g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );


        return Number(
            cleaned
        );
    }


    return NaN;
}


// =============================================================
// PARSE QUANTITY
// =============================================================

function parseQuantity(
    value
) {
    const quantity =
        Number(
            value
        );


    if (
        !Number.isFinite(
            quantity
        )
    ) {
        return 0;
    }


    return Math.floor(
        quantity
    );
}


// =============================================================
// VALIDATE EMAIL
// =============================================================

function isValidEmail(
    email
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );
}


// =============================================================
// VALIDATE HTTP/HTTPS URL
// =============================================================

function isValidHttpUrl(
    value
) {
    if (!value) {
        return false;
    }


    try {
        const url =
            new URL(
                value
            );


        return (
            url.protocol ===
                "http:" ||
            url.protocol ===
                "https:"
        );

    } catch {
        return false;
    }
}


// =============================================================
// STRIPE METADATA LIMIT
// =============================================================

function limitMetadata(
    value
) {
    return cleanText(
        value
    ).slice(
        0,
        500
    );
}


// =============================================================
// START SERVER
// =============================================================

app.listen(
    PORT,
    () => {
        console.log(
            "================================================="
        );

        console.log(
            `${SHOP_NAME} server is running.`
        );

        console.log(
            `Local URL: ${SHOP_URL}`
        );

        console.log(
            `Public folder: ${publicPath}`
        );

        console.log(
            `Homepage JSON: ${homepagePath}`
        );

        console.log(
            `Stripe: ${
                stripe
                    ? "configured"
                    : "NOT configured"
            }`
        );

        console.log(
            `Firestore: ${
                firestore
                    ? "configured"
                    : "NOT configured"
            }`
        );

        console.log(
            "Stripe checkout status:"
        );

        console.log(
            "GET /api/checkout-status?session_id=cs_..."
        );

        console.log(
            "Customer order:"
        );

        console.log(
            "GET /api/orders/:orderId"
        );

        console.log(
            "Stripe webhook:"
        );

        console.log(
            "POST /stripe-webhook"
        );

        console.log(
            "================================================="
        );
    }
);