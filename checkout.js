```javascript
// =========================================================
// ARAVON SHOP — CHECKOUT.JS
// Secure Checkout / Cart Page Controller
//
// Location:
// public/cart/shared/checkout.js
//
// Works with:
// public/cart/shared/cart.js
//
// Storage:
// localStorage["cart"]
//
// Checkout flow:
//
// checkout.html
//      ↓
// POST /create-checkout-session
//      ↓
// server.js
//      ↓
// Stripe Checkout
//      ↓
// ┌───────────────────────┐
// │                       │
// ▼                       ▼
// success.html         cancel.html
// │                       │
// └─ confirmed payment    └─ cart preserved
//
// IMPORTANT:
//
// 1. cart.js is the primary cart controller.
// 2. This file does NOT expose Stripe secret keys.
// 3. This file does NOT create Firestore orders.
// 4. THIS FILE NEVER CLEARS THE CART.
// 5. Clicking checkout does NOT remove localStorage["cart"].
// 6. Leaving checkout for Stripe does NOT remove the cart.
// 7. Cancelled/failed checkout does NOT remove the cart.
// 8. The backend validates products, prices, quantities,
//    shipping and final payment amount.
// 9. Stripe webhook/backend confirms successful payment.
// 10. success.html is responsible for clearing the cart
//     only after confirmed successful payment.
//
// =========================================================

"use strict";


// =========================================================
// CONSTANTS
// =========================================================

const CART_STORAGE_KEY = "cart";

const CHECKOUT_ENDPOINT =
    "/create-checkout-session";

const CART_PRODUCT_FALLBACK_IMAGE =
    "https://picsum.photos/300/300";


// =========================================================
// INITIALIZATION STATE
// =========================================================

let aravonCheckoutInitialized = false;


// =========================================================
// DOM READY
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeCheckoutPage,
    {
        once: true
    }
);


// =========================================================
// INITIALIZE CHECKOUT PAGE
// =========================================================

function initializeCheckoutPage() {

    // -----------------------------------------------------
    // Prevent duplicate initialization
    // -----------------------------------------------------

    if (aravonCheckoutInitialized) {
        return;
    }


    // =====================================================
    // DOM ELEMENTS
    // =====================================================

    const cartItemsContainer =
        document.getElementById("cartItems");

    const emptyCart =
        document.getElementById("emptyCart");

    const summaryItems =
        document.getElementById("summaryItems");

    const summarySubtotal =
        document.getElementById("summarySubtotal");

    const summaryShipping =
        document.getElementById("summaryShipping");

    const summaryTotal =
        document.getElementById("summaryTotal");

    const checkoutBtn =
        document.getElementById("checkoutBtn");

    const checkoutMessage =
        document.getElementById("checkoutMessage");

    const searchInput =
        document.getElementById("searchInput");

    const searchBtn =
        document.getElementById("searchBtn");


    // =====================================================
    // MAKE SURE THIS IS THE CHECKOUT PAGE
    // =====================================================

    if (
        !cartItemsContainer ||
        !checkoutBtn
    ) {
        return;
    }


    // -----------------------------------------------------
    // Mark as initialized only after required DOM exists
    // -----------------------------------------------------

    aravonCheckoutInitialized = true;


    // =====================================================
    // STATE
    // =====================================================

    let checkoutInProgress = false;

    let isRendering = false;


    // =====================================================
    // MESSAGE HELPERS
    // =====================================================

    function showMessage(
        message,
        type = "error"
    ) {

        if (!checkoutMessage) {
            return;
        }

        checkoutMessage.textContent =
            String(message || "");

        checkoutMessage.className =
            `checkout-message ${type}`;
    }


    function clearMessage() {

        if (!checkoutMessage) {
            return;
        }

        checkoutMessage.textContent =
            "";

        checkoutMessage.className =
            "checkout-message";
    }


    // =====================================================
    // SAFE NUMBER
    // =====================================================

    function safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    // =====================================================
    // GET CART
    //
    // cart.js is the preferred source.
    // localStorage is the fallback.
    //
    // IMPORTANT:
    //
    // This function ONLY READS the cart.
    // It never removes or clears the cart.
    // =====================================================

    function getCurrentCart() {

        if (
            typeof window.getCart ===
            "function"
        ) {

            try {

                const cart =
                    window.getCart();

                if (
                    Array.isArray(cart)
                ) {

                    return cart;
                }

            } catch (error) {

                console.error(
                    "Aravon Checkout: getCart() failed:",
                    error
                );
            }
        }


        try {

            const savedCart =
                localStorage.getItem(
                    CART_STORAGE_KEY
                );

            if (!savedCart) {
                return [];
            }


            const parsedCart =
                JSON.parse(savedCart);


            if (
                !Array.isArray(parsedCart)
            ) {

                return [];
            }


            return parsedCart;

        } catch (error) {

            console.error(
                "Aravon Checkout: Unable to read cart:",
                error
            );

            return [];
        }
    }


    // =====================================================
    // NORMALIZE PRODUCT ID
    // =====================================================

    function normalizeProductId(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return "";
        }


        const value =
            item.id ??
            item.productId ??
            item.productID ??
            item.dataId ??
            item.data_id ??
            "";


        return String(value).trim();
    }


    // =====================================================
    // NORMALIZE PRODUCT NAME
    // =====================================================

    function normalizeProductName(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return "Unnamed Product";
        }


        const value =
            item.name ??
            item.title ??
            item.productName ??
            "Unnamed Product";


        const name =
            String(value).trim();


        return name ||
            "Unnamed Product";
    }


    // =====================================================
    // NORMALIZE PRICE
    //
    // Client price is DISPLAY information only.
    //
    // The backend MUST validate the actual product price.
    // =====================================================

    function normalizeProductPrice(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return 0;
        }


        const rawPrice =
            item.price ??
            item.salePrice ??
            item.productPrice ??
            item.amount ??
            0;


        const price =
            safeNumber(rawPrice);


        if (
            price < 0
        ) {

            return 0;
        }


        return price;
    }


    // =====================================================
    // NORMALIZE QUANTITY
    // =====================================================

    function normalizeProductQuantity(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return 1;
        }


        const quantity =
            Math.floor(
                safeNumber(
                    item.quantity ??
                    item.qty ??
                    1,
                    1
                )
            );


        if (
            quantity < 1
        ) {

            return 1;
        }


        return quantity;
    }


    // =====================================================
    // NORMALIZE IMAGE
    // =====================================================

    function normalizeProductImage(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return "";
        }


        const image =
            item.image ??
            item.img ??
            item.imageUrl ??
            item.imageURL ??
            item.thumbnail ??
            item.photo ??
            item.productImage ??
            "";


        return String(image).trim();
    }


    // =====================================================
    // NORMALIZE SIZE
    // =====================================================

    function normalizeProductSize(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return null;
        }


        const value =
            item.size ??
            item.selectedSize ??
            item.productSize ??
            null;


        if (
            value === null ||
            value === undefined
        ) {

            return null;
        }


        const size =
            String(value).trim();


        return size || null;
    }


    // =====================================================
    // NORMALIZE CART ITEM
    // =====================================================

    function normalizeItem(item) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            return {
                id: "",
                productId: "",
                name: "Unnamed Product",
                title: "Unnamed Product",
                price: 0,
                image: "",
                quantity: 1,
                size: null,
                gender: null,
                category: null
            };
        }


        const id =
            normalizeProductId(item);

        const name =
            normalizeProductName(item);

        const price =
            normalizeProductPrice(item);

        const quantity =
            normalizeProductQuantity(item);

        const image =
            normalizeProductImage(item);

        const size =
            normalizeProductSize(item);


        return {

            id,

            productId:
                id,

            name,

            title:
                name,

            price,

            image,

            quantity,

            size,

            gender:
                item.gender ??
                item.productGender ??
                null,

            category:
                item.category ??
                item.productCategory ??
                null
        };
    }


    // =====================================================
    // NORMALIZED CART
    // =====================================================

    function getNormalizedCart() {

        const cart =
            getCurrentCart();


        if (
            !Array.isArray(cart)
        ) {

            return [];
        }


        return cart
            .map(normalizeItem)
            .filter(
                item =>
                    item.id !== ""
            );
    }


    // =====================================================
    // CART ITEM KEY
    //
    // Same product + same size = same cart item.
    // =====================================================

    function getCartItemKey(item) {

        const normalized =
            normalizeItem(item);


        return (
            String(normalized.id) +
            "::" +
            String(normalized.size ?? "")
        );
    }


    // =====================================================
    // FIND CART ITEM
    // =====================================================

    function findCartItemByKey(
        cart,
        itemKey
    ) {

        if (
            !Array.isArray(cart)
        ) {

            return -1;
        }


        return cart.findIndex(
            item =>
                getCartItemKey(item) ===
                itemKey
        );
    }


    // =====================================================
    // GET TOTALS
    //
    // Prefer cart.js totals.
    //
    // These totals are for DISPLAY only.
    // The backend must calculate the secure payment amount.
    // =====================================================

    function getCurrentTotals() {

        if (
            typeof window.getCartTotals ===
            "function"
        ) {

            try {

                const totals =
                    window.getCartTotals();


                if (
                    totals &&
                    typeof totals === "object"
                ) {

                    return {

                        itemCount:
                            safeNumber(
                                totals.itemCount
                            ),

                        subtotal:
                            safeNumber(
                                totals.subtotal
                            ),

                        shipping:
                            safeNumber(
                                totals.shipping
                            ),

                        total:
                            safeNumber(
                                totals.total
                            )
                    };
                }

            } catch (error) {

                console.error(
                    "Aravon Checkout: getCartTotals() failed:",
                    error
                );
            }
        }


        // -------------------------------------------------
        // FALLBACK DISPLAY CALCULATION
        // -------------------------------------------------

        const cart =
            getNormalizedCart();


        let itemCount =
            0;

        let subtotal =
            0;


        cart.forEach(
            item => {

                itemCount +=
                    item.quantity;

                subtotal +=
                    item.price *
                    item.quantity;
            }
        );


        // Display fallback only.
        // The server determines actual shipping.

        const shipping =
            0;


        const total =
            subtotal +
            shipping;


        return {

            itemCount,

            subtotal,

            shipping,

            total
        };
    }


    // =====================================================
    // CUSTOMER INFORMATION
    // =====================================================

    function getCustomerInformation() {

        function getValue(id) {

            const element =
                document.getElementById(id);


            if (!element) {
                return "";
            }


            return String(
                element.value ?? ""
            ).trim();
        }


        return {

            firstName:
                getValue("firstName"),

            lastName:
                getValue("lastName"),

            email:
                getValue("email")
                    .toLowerCase(),

            phone:
                getValue("phone"),

            houseNumber:
                getValue("houseNumber"),

            address:
                getValue("address"),

            city:
                getValue("city"),

            zip:
                getValue("zip"),

            country:
                getValue("country")
        };
    }


    // =====================================================
    // EMAIL VALIDATION
    // =====================================================

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    }


    // =====================================================
    // CUSTOMER VALIDATION
    // =====================================================

    function validateCustomerInformation(
        customer
    ) {

        if (!customer.firstName) {

            showMessage(
                "Please enter your first name."
            );

            return false;
        }


        if (!customer.lastName) {

            showMessage(
                "Please enter your last name."
            );

            return false;
        }


        if (!customer.email) {

            showMessage(
                "Please enter your email address."
            );

            return false;
        }


        if (
            !isValidEmail(
                customer.email
            )
        ) {

            showMessage(
                "Please enter a valid email address."
            );

            return false;
        }


        if (!customer.phone) {

            showMessage(
                "Please enter your phone number."
            );

            return false;
        }


        if (!customer.houseNumber) {

            showMessage(
                "Please enter your house number."
            );

            return false;
        }


        if (!customer.address) {

            showMessage(
                "Please enter your street address."
            );

            return false;
        }


        if (!customer.city) {

            showMessage(
                "Please enter your city."
            );

            return false;
        }


        if (!customer.zip) {

            showMessage(
                "Please enter your ZIP code."
            );

            return false;
        }


        if (!customer.country) {

            showMessage(
                "Please select your country."
            );

            return false;
        }


        return true;
    }


    // =====================================================
    // FORMAT PRICE
    // =====================================================

    function formatPrice(value) {

        const number =
            safeNumber(value);


        return `€${number.toFixed(2)}`;
    }


    // =====================================================
    // UPDATE CART COUNT
    // =====================================================

    function updateCheckoutCartCount() {

        if (
            typeof window.updateCartCount ===
            "function"
        ) {

            try {

                window.updateCartCount();

                return;

            } catch (error) {

                console.error(
                    "Aravon Checkout: updateCartCount() failed:",
                    error
                );
            }
        }


        const cart =
            getNormalizedCart();


        const count =
            cart.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.quantity,
                0
            );


        const badges =
            document.querySelectorAll(
                "#cartCount, .cart-count, [data-cart-count]"
            );


        badges.forEach(
            badge => {

                badge.textContent =
                    String(count);

                badge.setAttribute(
                    "aria-label",
                    `${count} item${count === 1 ? "" : "s"} in cart`
                );
            }
        );
    }


    // =====================================================
    // UPDATE SUMMARY
    // =====================================================

    function updateCheckoutSummary() {

        const totals =
            getCurrentTotals();


        if (summaryItems) {

            summaryItems.textContent =
                String(
                    totals.itemCount
                );
        }


        if (summarySubtotal) {

            summarySubtotal.textContent =
                formatPrice(
                    totals.subtotal
                );
        }


        if (summaryShipping) {

            summaryShipping.textContent =
                totals.shipping === 0
                    ? "Free"
                    : formatPrice(
                        totals.shipping
                    );
        }


        if (summaryTotal) {

            summaryTotal.textContent =
                formatPrice(
                    totals.total
                );
        }


        updateCheckoutCartCount();
    }


    // =====================================================
    // UPDATE CHECKOUT BUTTON
    // =====================================================

    function updateCheckoutButtonState() {

        const hasItems =
            getNormalizedCart().length > 0;


        checkoutBtn.disabled =
            !hasItems ||
            checkoutInProgress;
    }


    // =====================================================
    // RENDER EMPTY CART
    // =====================================================

    function renderEmptyCart() {

        cartItemsContainer.innerHTML =
            "";


        if (emptyCart) {

            emptyCart.style.display =
                "block";
        }


        checkoutBtn.disabled =
            true;


        updateCheckoutSummary();
    }


    // =====================================================
    // CREATE CART ITEM
    // =====================================================

    function createCartItem(item) {

        const normalized =
            normalizeItem(item);


        const name =
            normalized.name;

        const price =
            normalized.price;

        const quantity =
            normalized.quantity;

        const image =
            normalized.image ||
            CART_PRODUCT_FALLBACK_IMAGE;

        const productId =
            normalized.id;

        const size =
            normalized.size;

        const itemKey =
            getCartItemKey(
                normalized
            );


        // =================================================
        // MAIN CART ITEM
        // =================================================

        const cartItem =
            document.createElement(
                "div"
            );


        cartItem.className =
            "cart-item";


        cartItem.dataset.cartKey =
            itemKey;


        // =================================================
        // PRODUCT LINK
        // =================================================

        const productLink =
            document.createElement(
                "a"
            );


        productLink.className =
            "cart-product-link";


        if (productId) {

            productLink.href =
                `../product-pages/single-product.html?id=${encodeURIComponent(
                    productId
                )}`;

        } else {

            productLink.href =
                "#";


            productLink.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                }
            );
        }


        // =================================================
        // PRODUCT IMAGE
        // =================================================

        const imageElement =
            document.createElement(
                "img"
            );


        imageElement.src =
            image;


        imageElement.alt =
            name;


        imageElement.width =
            120;


        imageElement.height =
            120;


        imageElement.loading =
            "lazy";


        imageElement.decoding =
            "async";


        imageElement.onerror =
            () => {

                imageElement.onerror =
                    null;

                imageElement.src =
                    CART_PRODUCT_FALLBACK_IMAGE;
            };


        // =================================================
        // PRODUCT INFORMATION
        // =================================================

        const itemInfo =
            document.createElement(
                "div"
            );


        itemInfo.className =
            "item-info";


        const itemTitle =
            document.createElement(
                "div"
            );


        itemTitle.className =
            "item-title";


        itemTitle.textContent =
            name;


        const itemPrice =
            document.createElement(
                "div"
            );


        itemPrice.className =
            "item-price";


        itemPrice.textContent =
            formatPrice(
                price
            );


        itemInfo.appendChild(
            itemTitle
        );


        itemInfo.appendChild(
            itemPrice
        );


        // =================================================
        // SIZE
        // =================================================

        if (size) {

            const itemSize =
                document.createElement(
                    "div"
                );


            itemSize.className =
                "item-size";


            itemSize.textContent =
                `Size: ${size}`;


            itemInfo.appendChild(
                itemSize
            );
        }


        productLink.appendChild(
            imageElement
        );


        productLink.appendChild(
            itemInfo
        );


        // =================================================
        // CONTROLS
        // =================================================

        const controls =
            document.createElement(
                "div"
            );


        controls.className =
            "cart-controls";


        // =================================================
        // QUANTITY BOX
        // =================================================

        const quantityBox =
            document.createElement(
                "div"
            );


        quantityBox.className =
            "qty-box";


        // =================================================
        // DECREASE BUTTON
        // =================================================

        const decreaseButton =
            document.createElement(
                "button"
            );


        decreaseButton.type =
            "button";


        decreaseButton.className =
            "qty-btn";


        decreaseButton.dataset.checkoutAction =
            "decrease";


        decreaseButton.dataset.cartKey =
            itemKey;


        decreaseButton.setAttribute(
            "aria-label",
            `Decrease quantity of ${name}`
        );


        decreaseButton.textContent =
            "−";


        // =================================================
        // QUANTITY
        // =================================================

        const quantityText =
            document.createElement(
                "span"
            );


        quantityText.className =
            "qty-value";


        quantityText.textContent =
            String(quantity);


        quantityText.setAttribute(
            "aria-label",
            `Quantity ${quantity}`
        );


        // =================================================
        // INCREASE BUTTON
        // =================================================

        const increaseButton =
            document.createElement(
                "button"
            );


        increaseButton.type =
            "button";


        increaseButton.className =
            "qty-btn";


        increaseButton.dataset.checkoutAction =
            "increase";


        increaseButton.dataset.cartKey =
            itemKey;


        increaseButton.setAttribute(
            "aria-label",
            `Increase quantity of ${name}`
        );


        increaseButton.textContent =
            "+";


        quantityBox.appendChild(
            decreaseButton
        );


        quantityBox.appendChild(
            quantityText
        );


        quantityBox.appendChild(
            increaseButton
        );


        // =================================================
        // REMOVE BUTTON
        // =================================================

        const removeButton =
            document.createElement(
                "button"
            );


        removeButton.type =
            "button";


        removeButton.className =
            "remove-btn";


        removeButton.dataset.checkoutAction =
            "remove";


        removeButton.dataset.cartKey =
            itemKey;


        removeButton.setAttribute(
            "aria-label",
            `Remove ${name} from cart`
        );


        removeButton.textContent =
            "Remove";


        controls.appendChild(
            quantityBox
        );


        controls.appendChild(
            removeButton
        );


        // =================================================
        // COMPLETE ITEM
        // =================================================

        cartItem.appendChild(
            productLink
        );


        cartItem.appendChild(
            controls
        );


        return cartItem;
    }


    // =====================================================
    // SAVE CART
    //
    // Used ONLY for customer cart modifications.
    //
    // This function is NEVER called to start payment.
    // =====================================================

    function saveCheckoutCart(cart) {

        if (
            !Array.isArray(cart)
        ) {

            cart = [];
        }


        const normalizedCart =
            cart.map(
                normalizeItem
            );


        // -------------------------------------------------
        // PREFERRED CART.JS METHOD
        // -------------------------------------------------

        if (
            typeof window.saveCart ===
            "function"
        ) {

            try {

                const result =
                    window.saveCart(
                        normalizedCart
                    );


                if (
                    result !== false
                ) {

                    updateCheckoutCartCount();

                    return true;
                }

            } catch (error) {

                console.error(
                    "Aravon Checkout: saveCart() failed:",
                    error
                );
            }
        }


        // -------------------------------------------------
        // LOCAL STORAGE FALLBACK
        // -------------------------------------------------

        try {

            localStorage.setItem(
                CART_STORAGE_KEY,
                JSON.stringify(
                    normalizedCart
                )
            );

        } catch (error) {

            console.error(
                "Aravon Checkout: Unable to save cart:",
                error
            );


            showMessage(
                "Unable to update your cart."
            );


            return false;
        }


        // -------------------------------------------------
        // NOTIFY OTHER ARAVON SCRIPTS
        // -------------------------------------------------

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "cartUpdated",
                    {
                        detail: {
                            cart:
                                normalizedCart
                        }
                    }
                )
            );


            document.dispatchEvent(
                new CustomEvent(
                    "cartUpdated",
                    {
                        detail: {
                            cart:
                                normalizedCart
                        }
                    }
                )
            );

        } catch (error) {

            console.error(
                "Aravon Checkout: cartUpdated event failed:",
                error
            );
        }


        updateCheckoutCartCount();


        return true;
    }


    // =====================================================
    // CHANGE QUANTITY
    // =====================================================

    function modifyCartQuantity(
        itemKey,
        amount
    ) {

        if (!itemKey) {
            return;
        }


        const change =
            Number(amount);


        if (
            !Number.isFinite(change)
        ) {

            return;
        }


        const cart =
            getNormalizedCart();


        const index =
            findCartItemByKey(
                cart,
                itemKey
            );


        if (
            index === -1
        ) {

            renderCheckoutCart();

            return;
        }


        const currentQuantity =
            cart[index].quantity;


        const newQuantity =
            currentQuantity +
            Math.trunc(change);


        if (
            newQuantity <= 0
        ) {

            cart.splice(
                index,
                1
            );

        } else {

            cart[index].quantity =
                newQuantity;
        }


        if (
            saveCheckoutCart(
                cart
            )
        ) {

            renderCheckoutCart();
        }
    }


    // =====================================================
    // REMOVE ITEM
    // =====================================================

    function removeCartItem(itemKey) {

        if (!itemKey) {
            return;
        }


        const cart =
            getNormalizedCart();


        const index =
            findCartItemByKey(
                cart,
                itemKey
            );


        if (
            index === -1
        ) {

            renderCheckoutCart();

            return;
        }


        cart.splice(
            index,
            1
        );


        if (
            saveCheckoutCart(
                cart
            )
        ) {

            renderCheckoutCart();
        }
    }


    // =====================================================
    // RENDER CART
    // =====================================================

    function renderCheckoutCart() {

        if (isRendering) {
            return;
        }


        isRendering =
            true;


        try {

            const cart =
                getNormalizedCart();


            cartItemsContainer.innerHTML =
                "";


            // -------------------------------------------------
            // EMPTY CART
            // -------------------------------------------------

            if (
                cart.length === 0
            ) {

                renderEmptyCart();

                return;
            }


            // -------------------------------------------------
            // SHOW CART
            // -------------------------------------------------

            if (emptyCart) {

                emptyCart.style.display =
                    "none";
            }


            // -------------------------------------------------
            // DOCUMENT FRAGMENT
            // -------------------------------------------------

            const fragment =
                document.createDocumentFragment();


            cart.forEach(
                item => {

                    fragment.appendChild(
                        createCartItem(
                            item
                        )
                    );
                }
            );


            cartItemsContainer.appendChild(
                fragment
            );


            updateCheckoutSummary();

            updateCheckoutButtonState();

        } finally {

            isRendering =
                false;
        }
    }


    // =====================================================
    // CART CONTROLS
    // =====================================================

    cartItemsContainer.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-checkout-action]"
                );


            if (
                !button ||
                !cartItemsContainer.contains(
                    button
                )
            ) {

                return;
            }


            event.preventDefault();

            event.stopPropagation();


            const itemKey =
                button.dataset.cartKey;


            if (!itemKey) {
                return;
            }


            const action =
                button.dataset.checkoutAction;


            if (
                action ===
                "increase"
            ) {

                modifyCartQuantity(
                    itemKey,
                    1
                );

                return;
            }


            if (
                action ===
                "decrease"
            ) {

                modifyCartQuantity(
                    itemKey,
                    -1
                );

                return;
            }


            if (
                action ===
                "remove"
            ) {

                removeCartItem(
                    itemKey
                );
            }
        }
    );


    // =====================================================
    // CART UPDATED — WINDOW
    // =====================================================

    window.addEventListener(
        "cartUpdated",
        () => {

            renderCheckoutCart();
        }
    );


    // =====================================================
    // CART UPDATED — DOCUMENT
    // =====================================================

    document.addEventListener(
        "cartUpdated",
        () => {

            renderCheckoutCart();
        }
    );


    // =====================================================
    // LOCAL STORAGE CHANGED
    // =====================================================

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                CART_STORAGE_KEY
            ) {

                renderCheckoutCart();
            }
        }
    );


    // =====================================================
    // START STRIPE CHECKOUT
    //
    // CRITICAL:
    //
    // THIS FUNCTION DOES NOT CLEAR THE CART.
    //
    // localStorage["cart"] remains untouched.
    //
    // The customer may:
    //
    // - successfully pay
    // - cancel Stripe checkout
    // - close Stripe
    // - experience a payment failure
    //
    // and the cart remains available until the confirmed
    // payment flow explicitly clears it.
    // =====================================================

    checkoutBtn.addEventListener(
        "click",
        async () => {

            // -------------------------------------------------
            // PREVENT DOUBLE CLICK
            // -------------------------------------------------

            if (
                checkoutInProgress
            ) {

                return;
            }


            clearMessage();


            // -------------------------------------------------
            // GET CURRENT CART
            // -------------------------------------------------

            const cart =
                getNormalizedCart();


            if (
                cart.length === 0
            ) {

                showMessage(
                    "Your cart is empty."
                );


                renderEmptyCart();


                return;
            }


            // -------------------------------------------------
            // CUSTOMER INFORMATION
            // -------------------------------------------------

            const customer =
                getCustomerInformation();


            if (
                !validateCustomerInformation(
                    customer
                )
            ) {

                return;
            }


            // -------------------------------------------------
            // DISPLAY TOTALS
            //
            // These are informational only.
            //
            // The server MUST calculate and validate the
            // actual Stripe payment amount.
            // -------------------------------------------------

            const totals =
                getCurrentTotals();


            // -------------------------------------------------
            // CHECKOUT PAYLOAD
            // -------------------------------------------------

            const checkoutData = {

                customer,

                items:
                    cart.map(
                        item => ({

                            id:
                                item.id,

                            productId:
                                item.id,

                            name:
                                item.name,

                            price:
                                item.price,

                            quantity:
                                item.quantity,

                            image:
                                item.image,

                            size:
                                item.size,

                            gender:
                                item.gender,

                            category:
                                item.category
                        })
                    ),

                itemCount:
                    totals.itemCount,

                subtotal:
                    totals.subtotal,

                shipping:
                    totals.shipping,

                total:
                    totals.total,

                currency:
                    "eur"
            };


            // -------------------------------------------------
            // IMPORTANT SECURITY NOTE
            //
            // The values above are NOT trusted by the server.
            // They are sent for checkout context/display only.
            //
            // DO NOT log customer information or the complete
            // checkout payload in production.
            // -------------------------------------------------

            console.info(
                "Aravon Shop: Preparing secure checkout."
            );


            // -------------------------------------------------
            // LOCK CHECKOUT BUTTON
            // -------------------------------------------------

            checkoutInProgress =
                true;


            checkoutBtn.disabled =
                true;


            const originalText =
                checkoutBtn.textContent;


            checkoutBtn.textContent =
                "Preparing Checkout...";


            try {

                // =================================================
                // SECURE BACKEND REQUEST
                //
                // NEVER place Stripe secret keys here.
                // =================================================

                const response =
                    await fetch(
                        CHECKOUT_ENDPOINT,
                        {
                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    checkoutData
                                )
                        }
                    );


                // =================================================
                // READ RESPONSE
                // =================================================

                const responseText =
                    await response.text();


                let result =
                    null;


                if (
                    responseText.trim()
                ) {

                    try {

                        result =
                            JSON.parse(
                                responseText
                            );

                    } catch (error) {

                        console.error(
                            "Aravon Checkout: Invalid server JSON:",
                            error
                        );
                    }
                }


                // =================================================
                // SERVER ERROR
                // =================================================

                if (
                    !response.ok
                ) {

                    const serverMessage =
                        result &&
                        typeof result.error ===
                        "string"

                            ? result.error

                            : "Unable to create secure Stripe checkout.";


                    throw new Error(
                        serverMessage
                    );
                }


                // =================================================
                // STRIPE CHECKOUT URL
                //
                // Preferred backend response:
                //
                // {
                //     "url": "https://checkout.stripe.com/..."
                // }
                //
                // IMPORTANT:
                //
                // DO NOT CLEAR THE CART HERE.
                // =================================================

                if (
                    result &&
                    typeof result.url ===
                    "string" &&
                    result.url.trim()
                ) {

                    /*
                     * Payment has NOT been confirmed yet.
                     *
                     * Therefore:
                     *
                     * DO NOT CALL:
                     *
                     * clearCart()
                     * localStorage.removeItem("cart")
                     * saveCart([])
                     *
                     * The cart remains available.
                     */

                    window.location.assign(
                        result.url
                    );


                    return;
                }


                // =================================================
                // OPTIONAL SESSION-ID FALLBACK
                //
                // Supports a backend that returns:
                //
                // {
                //     "sessionId": "...",
                //     "publishableKey": "pk_..."
                // }
                // =================================================

                if (
                    result &&
                    typeof result.sessionId ===
                    "string" &&
                    result.sessionId.trim()
                ) {

                    if (
                        typeof window.Stripe !==
                        "function"
                    ) {

                        throw new Error(
                            "Stripe.js is not loaded."
                        );
                    }


                    if (
                        typeof result.publishableKey !==
                        "string" ||
                        !result.publishableKey.trim()
                    ) {

                        throw new Error(
                            "Stripe publishable key was not returned."
                        );
                    }


                    const stripe =
                        window.Stripe(
                            result.publishableKey
                        );


                    if (
                        !stripe ||
                        typeof stripe.redirectToCheckout !==
                        "function"
                    ) {

                        throw new Error(
                            "Stripe Checkout is not available."
                        );
                    }


                    const stripeResult =
                        await stripe.redirectToCheckout(
                            {
                                sessionId:
                                    result.sessionId
                            }
                        );


                    if (
                        stripeResult &&
                        stripeResult.error
                    ) {

                        throw new Error(
                            stripeResult.error.message ||
                            "Stripe Checkout could not be started."
                        );
                    }


                    /*
                     * IMPORTANT:
                     *
                     * No cart clearing here.
                     *
                     * Stripe has not yet been confirmed
                     * as successfully paid.
                     */

                    return;
                }


                // =================================================
                // INVALID BACKEND RESPONSE
                // =================================================

                throw new Error(
                    "Stripe Checkout URL was not returned by the server."
                );


            } catch (error) {

                console.error(
                    "Aravon secure checkout error:",
                    error
                );


                showMessage(
                    error &&
                    error.message

                        ? error.message

                        : "Unable to start secure checkout. Please try again."
                );


            } finally {

                /*
                 * IMPORTANT:
                 *
                 * This finally block ONLY restores the button.
                 *
                 * It does NOT clear the cart.
                 *
                 * It does NOT call clearCart().
                 *
                 * It does NOT remove localStorage["cart"].
                 */

                checkoutInProgress =
                    false;


                checkoutBtn.disabled =
                    getNormalizedCart().length === 0;


                checkoutBtn.textContent =
                    originalText ||
                    "Proceed to Checkout";
            }
        }
    );


    // =====================================================
    // SEARCH
    // =====================================================

    function runSearch() {

        if (!searchInput) {
            return;
        }


        const query =
            String(
                searchInput.value ?? ""
            ).trim();


        if (!query) {
            return;
        }


        window.location.href =
            `../index.html?search=${encodeURIComponent(
                query
            )}`;
    }


    // =====================================================
    // SEARCH BUTTON
    // =====================================================

    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            runSearch
        );
    }


    // =====================================================
    // SEARCH ENTER
    // =====================================================

    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    runSearch();
                }
            }
        );
    }


    // =====================================================
    // INITIAL CART COUNT
    // =====================================================

    updateCheckoutCartCount();


    // =====================================================
    // INITIAL CART RENDER
    // =====================================================

    renderCheckoutCart();
}


// =========================================================
// OPTIONAL PUBLIC CHECKOUT API
//
// Allows other Aravon scripts to initialize the checkout
// page when necessary.
//
// IMPORTANT:
//
// This API does NOT contain a clear-cart operation.
// =========================================================

window.AravonCheckout = {

    initialize:
        initializeCheckoutPage

};


// =========================================================
// END OF ARAVON SHOP CHECKOUT.JS
// =========================================================

