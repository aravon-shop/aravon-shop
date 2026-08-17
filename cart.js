/* =========================================================
   ARAVON SHOP — CART.JS
   Universal Shopping Cart Controller

   Location:
   public/cart/shared/cart.js

   Used by:
   - index.html
   - product pages
   - category pages
   - cart/checkout.html
   - cart/success.html

   Storage:
   localStorage["cart"]

   IMPORTANT:
   This file is the single source of truth for:
   - cart storage
   - cart item quantities
   - cart badge count
   - cart totals
   - cart changes
========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const CART_STORAGE_KEY = "cart";

/*
 * Current shop configuration uses free shipping.
 * Keep this here so checkout.js and cart pages can use
 * the same calculated shipping amount.
 */
const CART_SHIPPING_COST = 0;


/* =========================================================
   NUMBER HELPER
========================================================= */

function getCartNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    /*
     * Supports:
     * 45
     * "45"
     * "45.99"
     * "€45"
     * "€45.99"
     *
     * Also supports common European formatting such as:
     * "€45,99"
     */

    if (typeof value === "number") {

        return Number.isFinite(value)
            ? value
            : 0;
    }

    let cleanedValue = String(value)
        .trim()
        .replace(/[^\d,.-]/g, "");

    if (!cleanedValue) {
        return 0;
    }

    /*
     * If both comma and period exist, determine which one
     * is most likely the decimal separator.
     *
     * Examples:
     * 1,299.99 -> 1299.99
     * 1.299,99 -> 1299.99
     */

    if (
        cleanedValue.includes(",") &&
        cleanedValue.includes(".")
    ) {

        const lastComma =
            cleanedValue.lastIndexOf(",");

        const lastPeriod =
            cleanedValue.lastIndexOf(".");

        if (lastComma > lastPeriod) {

            cleanedValue =
                cleanedValue
                    .replace(/\./g, "")
                    .replace(",", ".");

        } else {

            cleanedValue =
                cleanedValue
                    .replace(/,/g, "");
        }

    } else if (
        cleanedValue.includes(",")
    ) {

        /*
         * A single comma is treated as a decimal separator.
         */
        cleanedValue =
            cleanedValue.replace(",", ".");
    }

    const number =
        Number.parseFloat(cleanedValue);

    return Number.isFinite(number)
        ? number
        : 0;
}


/* =========================================================
   QUANTITY HELPER
========================================================= */

function getCartQuantity(item) {

    if (!item) {
        return 1;
    }

    const rawQuantity =
        item.quantity ??
        item.qty ??
        1;

    const quantity =
        Number.parseInt(
            rawQuantity,
            10
        );

    if (
        !Number.isFinite(quantity) ||
        quantity < 1
    ) {
        return 1;
    }

    return quantity;
}


/* =========================================================
   PRODUCT ID
========================================================= */

function getProductId(product) {

    if (!product) {
        return null;
    }

    const id =
        product.id ??
        product.productId ??
        product.productID ??
        product.dataId ??
        product.data_id ??
        null;

    if (
        id === null ||
        id === undefined
    ) {
        return null;
    }

    const normalizedId =
        String(id).trim();

    return normalizedId || null;
}


/* =========================================================
   PRODUCT NAME
========================================================= */

function getProductName(product) {

    if (!product) {
        return "Product";
    }

    const name =
        product.name ??
        product.title ??
        product.productName ??
        "Product";

    return (
        String(name).trim() ||
        "Product"
    );
}


/* =========================================================
   PRODUCT PRICE
========================================================= */

function getProductPrice(product) {

    if (!product) {
        return 0;
    }

    /*
     * Sale price takes priority only when it is actually
     * present and greater than or equal to zero.
     */

    const possiblePrices = [
        product.salePrice,
        product.price,
        product.productPrice,
        product.amount
    ];

    for (
        const rawPrice of possiblePrices
    ) {

        if (
            rawPrice === null ||
            rawPrice === undefined ||
            rawPrice === ""
        ) {
            continue;
        }

        const price =
            getCartNumber(rawPrice);

        if (
            Number.isFinite(price) &&
            price >= 0
        ) {
            return price;
        }
    }

    return 0;
}


/* =========================================================
   PRODUCT IMAGE
========================================================= */

function getProductImage(product) {

    if (!product) {
        return "";
    }

    const image =
        product.image ??
        product.img ??
        product.imageUrl ??
        product.imageURL ??
        product.thumbnail ??
        product.photo ??
        product.productImage ??
        "";

    return String(image).trim();
}


/* =========================================================
   PRODUCT SIZE
========================================================= */

function getProductSize(product) {

    if (!product) {
        return null;
    }

    const size =
        product.size ??
        product.selectedSize ??
        product.productSize ??
        null;

    if (
        size === null ||
        size === undefined ||
        String(size).trim() === ""
    ) {
        return null;
    }

    return String(size).trim();
}


/* =========================================================
   PRODUCT GENDER
========================================================= */

function getProductGender(product) {

    if (!product) {
        return null;
    }

    const gender =
        product.gender ??
        product.productGender ??
        null;

    if (
        gender === null ||
        gender === undefined ||
        String(gender).trim() === ""
    ) {
        return null;
    }

    return String(gender).trim();
}


/* =========================================================
   PRODUCT CATEGORY
========================================================= */

function getProductCategory(product) {

    if (!product) {
        return null;
    }

    const category =
        product.category ??
        product.productCategory ??
        null;

    if (
        category === null ||
        category === undefined ||
        String(category).trim() === ""
    ) {
        return null;
    }

    return String(category).trim();
}


/* =========================================================
   NORMALIZE CART ITEM

   Converts old/legacy cart structures into the standard
   Aravon Shop cart structure.
========================================================= */

function normalizeCartItem(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }

    const productId =
        getProductId(item);

    if (
        !productId
    ) {
        return null;
    }

    const name =
        getProductName(item);

    const price =
        getProductPrice(item);

    const image =
        getProductImage(item);

    const size =
        getProductSize(item);

    const gender =
        getProductGender(item);

    const category =
        getProductCategory(item);

    const quantity =
        getCartQuantity(item);

    return {

        id:
            productId,

        productId:
            productId,

        name:
            name,

        title:
            name,

        price:
            price,

        image:
            image,

        size:
            size,

        gender:
            gender,

        category:
            category,

        quantity:
            quantity
    };
}


/* =========================================================
   NORMALIZE CART
========================================================= */

function normalizeCart(cart) {

    if (!Array.isArray(cart)) {
        return [];
    }

    return cart
        .map(normalizeCartItem)
        .filter(Boolean);
}


/* =========================================================
   GET CART
========================================================= */

function getCart() {

    try {

        const storedCart =
            localStorage.getItem(
                CART_STORAGE_KEY
            );

        if (!storedCart) {
            return [];
        }

        const parsedCart =
            JSON.parse(
                storedCart
            );

        if (!Array.isArray(parsedCart)) {
            return [];
        }

        return normalizeCart(
            parsedCart
        );

    } catch (error) {

        console.error(
            "Aravon Cart: Unable to read cart.",
            error
        );

        return [];
    }
}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart(cart) {

    const safeCart =
        normalizeCart(cart);

    try {

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(
                safeCart
            )
        );

        updateCartCount();

        dispatchCartUpdated(
            safeCart
        );

        return true;

    } catch (error) {

        console.error(
            "Aravon Cart: Unable to save cart.",
            error
        );

        return false;
    }
}


/* =========================================================
   CLEAR CART

   Used only after confirmed successful payment.

   This function:
   1. Removes localStorage["cart"]
   2. Updates every cart badge
   3. Dispatches cartUpdated
   4. Keeps pages synchronized
========================================================= */

function clearCart() {

    try {

        localStorage.removeItem(
            CART_STORAGE_KEY
        );

        updateCartCount();

        dispatchCartUpdated(
            []
        );

        return true;

    } catch (error) {

        console.error(
            "Aravon Cart: Unable to clear cart.",
            error
        );

        return false;
    }
}


/* =========================================================
   DISPATCH CART UPDATED EVENT

   The event is dispatched on window.

   A document event is also dispatched for backward
   compatibility with existing Aravon Shop pages.

   Existing listeners should therefore continue working.
========================================================= */

function dispatchCartUpdated(cart) {

    const safeCart =
        Array.isArray(cart)
            ? cart
            : [];

    /*
     * Window event
     */

    try {

        window.dispatchEvent(
            new CustomEvent(
                "cartUpdated",
                {
                    detail: {
                        cart: safeCart
                    }
                }
            )
        );

    } catch (error) {

        console.error(
            "Aravon Cart: Window cartUpdated event failed.",
            error
        );
    }


    /*
     * Document event
     */

    try {

        document.dispatchEvent(
            new CustomEvent(
                "cartUpdated",
                {
                    detail: {
                        cart: safeCart
                    }
                }
            )
        );

    } catch (error) {

        console.error(
            "Aravon Cart: Document cartUpdated event failed.",
            error
        );
    }
}


/* =========================================================
   FIND CART ITEM

   Same product + same size = same cart item.
========================================================= */

function findCartItem(
    cart,
    productId,
    size = null
) {

    if (!Array.isArray(cart)) {
        return -1;
    }

    if (
        productId === null ||
        productId === undefined ||
        String(productId).trim() === ""
    ) {
        return -1;
    }

    const normalizedProductId =
        String(productId).trim();

    const normalizedSize =
        size === null ||
        size === undefined ||
        String(size).trim() === ""
            ? null
            : String(size).trim();

    return cart.findIndex(
        item => {

            const itemId =
                getProductId(item);

            const itemSize =
                getProductSize(item);

            return (
                String(itemId) ===
                normalizedProductId
            ) &&
            (
                itemSize ===
                normalizedSize
            );
        }
    );
}


/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(
    product,
    quantity = 1
) {

    if (!product) {

        console.error(
            "Aravon Cart: Product is missing."
        );

        return false;
    }

    const productId =
        getProductId(product);

    if (!productId) {

        console.error(
            "Aravon Cart: Product ID is missing.",
            product
        );

        return false;
    }

    const name =
        getProductName(product);

    const price =
        getProductPrice(product);

    const image =
        getProductImage(product);

    const size =
        getProductSize(product);

    const gender =
        getProductGender(product);

    const category =
        getProductCategory(product);

    let addQuantity =
        Number.parseInt(
            quantity,
            10
        );

    if (
        !Number.isFinite(addQuantity) ||
        addQuantity < 1
    ) {
        addQuantity = 1;
    }

    const cart =
        getCart();

    const existingIndex =
        findCartItem(
            cart,
            productId,
            size
        );


    /* =====================================================
       EXISTING ITEM
    ===================================================== */

    if (
        existingIndex !== -1
    ) {

        const existing =
            cart[
                existingIndex
            ];

        const oldQuantity =
            getCartQuantity(
                existing
            );

        existing.quantity =
            oldQuantity +
            addQuantity;

        delete existing.qty;

        /*
         * Refresh product information without destroying
         * useful existing values when the new product object
         * does not contain them.
         */

        existing.id =
            productId;

        existing.productId =
            productId;

        existing.name =
            name;

        existing.title =
            name;

        existing.price =
            price;

        if (image) {
            existing.image =
                image;
        }

        existing.size =
            size;

        if (
            gender !== null &&
            gender !== undefined
        ) {
            existing.gender =
                gender;
        } else if (
            !existing.gender
        ) {
            existing.gender =
                null;
        }

        if (
            category !== null &&
            category !== undefined
        ) {
            existing.category =
                category;
        } else if (
            !existing.category
        ) {
            existing.category =
                null;
        }


    } else {


        /* =================================================
           NEW ITEM
        ================================================= */

        cart.push({

            id:
                productId,

            productId:
                productId,

            name:
                name,

            title:
                name,

            price:
                price,

            image:
                image,

            size:
                size,

            gender:
                gender,

            category:
                category,

            quantity:
                addQuantity
        });
    }


    const saved =
        saveCart(
            cart
        );


    if (saved) {

        showCartNotification(
            `${name} added to cart`
        );
    }


    return saved;
}


/* =========================================================
   ADD TO CART FROM HTML ELEMENT

   Supported:

   <button
       class="add-to-cart"
       data-id="ABC123"
       data-name="T-Shirt"
       data-price="45"
       data-image="image.jpg"
       data-gender="adults"
       data-category="fashion">
   </button>
========================================================= */

function addToCartFromElement(
    element
) {

    if (!element) {
        return false;
    }

    const dataset =
        element.dataset || {};

    const product = {

        id:
            dataset.id ||
            dataset.productId,

        name:
            dataset.name ||
            dataset.title ||
            dataset.productName,

        price:
            dataset.price,

        salePrice:
            dataset.salePrice,

        image:
            dataset.image ||
            dataset.img ||
            dataset.imageUrl ||
            dataset.imageURL,

        gender:
            dataset.gender,

        category:
            dataset.category,

        size:
            dataset.size ||
            dataset.selectedSize ||
            null
    };


    /*
     * If there is a parent product card with information
     * missing from the button, inherit it.
     */

    if (
        !product.id &&
        typeof element.closest ===
            "function"
    ) {

        const card =
            element.closest(
                "[data-id]"
            );

        if (card) {

            product.id =
                card.dataset.id ||
                card.dataset.productId;

            product.name =
                product.name ||
                card.dataset.name ||
                card.dataset.title ||
                card.dataset.productName;

            product.price =
                product.price ||
                card.dataset.price;

            product.salePrice =
                product.salePrice ||
                card.dataset.salePrice;

            product.image =
                product.image ||
                card.dataset.image ||
                card.dataset.img ||
                card.dataset.imageUrl;

            product.gender =
                product.gender ||
                card.dataset.gender;

            product.category =
                product.category ||
                card.dataset.category;
        }
    }


    return addToCart(
        product,
        1
    );
}


/* =========================================================
   REMOVE FROM CART
========================================================= */

function removeFromCart(
    productId,
    size = null
) {

    const cart =
        getCart();

    const index =
        findCartItem(
            cart,
            productId,
            size
        );

    if (index === -1) {
        return false;
    }

    cart.splice(
        index,
        1
    );

    return saveCart(
        cart
    );
}


/* =========================================================
   SET QUANTITY
========================================================= */

function setCartQuantity(
    productId,
    quantity,
    size = null
) {

    const cart =
        getCart();

    const index =
        findCartItem(
            cart,
            productId,
            size
        );

    if (index === -1) {
        return false;
    }

    let newQuantity =
        Number.parseInt(
            quantity,
            10
        );

    if (
        !Number.isFinite(
            newQuantity
        )
    ) {
        newQuantity = 1;
    }

    if (
        newQuantity <= 0
    ) {

        cart.splice(
            index,
            1
        );

    } else {

        cart[
            index
        ].quantity =
            newQuantity;

        delete cart[
            index
        ].qty;
    }

    return saveCart(
        cart
    );
}


/* =========================================================
   INCREASE QUANTITY
========================================================= */

function increaseCartQuantity(
    productId,
    size = null
) {

    const cart =
        getCart();

    const index =
        findCartItem(
            cart,
            productId,
            size
        );

    if (index === -1) {
        return false;
    }

    const quantity =
        getCartQuantity(
            cart[
                index
            ]
        );

    cart[
        index
    ].quantity =
        quantity + 1;

    delete cart[
        index
    ].qty;

    return saveCart(
        cart
    );
}


/* =========================================================
   DECREASE QUANTITY
========================================================= */

function decreaseCartQuantity(
    productId,
    size = null
) {

    const cart =
        getCart();

    const index =
        findCartItem(
            cart,
            productId,
            size
        );

    if (index === -1) {
        return false;
    }

    const quantity =
        getCartQuantity(
            cart[
                index
            ]
        );

    if (
        quantity <= 1
    ) {

        cart.splice(
            index,
            1
        );

    } else {

        cart[
            index
        ].quantity =
            quantity - 1;

        delete cart[
            index
        ].qty;
    }

    return saveCart(
        cart
    );
}


/* =========================================================
   GET TOTAL ITEM COUNT
========================================================= */

function getCartItemCount() {

    const cart =
        getCart();

    return cart.reduce(
        (
            total,
            item
        ) => {

            return (
                total +
                getCartQuantity(
                    item
                )
            );

        },
        0
    );
}


/* =========================================================
   GET SUBTOTAL
========================================================= */

function getCartSubtotal() {

    const cart =
        getCart();

    return cart.reduce(
        (
            total,
            item
        ) => {

            const price =
                getProductPrice(
                    item
                );

            const quantity =
                getCartQuantity(
                    item
                );

            return (
                total +
                (
                    price *
                    quantity
                )
            );

        },
        0
    );
}


/* =========================================================
   GET CART TOTALS
========================================================= */

function getCartTotals() {

    const itemCount =
        getCartItemCount();

    const subtotal =
        getCartSubtotal();

    const shipping =
        subtotal > 0
            ? CART_SHIPPING_COST
            : 0;

    const total =
        subtotal +
        shipping;

    return {

        itemCount:
            itemCount,

        subtotal:
            subtotal,

        shipping:
            shipping,

        total:
            total
    };
}


/* =========================================================
   GET CART TOTAL

   Compatibility helper.

   Allows older checkout/cart code to use:

   getCartTotal()

   while getCartTotals() remains the main API.
========================================================= */

function getCartTotal() {

    return getCartTotals().total;
}


/* =========================================================
   UPDATE ALL CART BADGES

   Supports:

   #cartCount
   .cart-count
   [data-cart-count]
========================================================= */

function updateCartCount() {

    const count =
        getCartItemCount();

    const badges =
        document.querySelectorAll(
            "#cartCount, .cart-count, [data-cart-count]"
        );

    badges.forEach(
        badge => {

            badge.textContent =
                String(
                    count
                );

            badge.setAttribute(
                "aria-label",
                `${count} item${count === 1 ? "" : "s"} in cart`
            );

            /*
             * Keep the badge accessible.
             */

            if (
                count > 0
            ) {

                badge.removeAttribute(
                    "aria-hidden"
                );

            }
        }
    );

    return count;
}


/* =========================================================
   CART NOTIFICATION
========================================================= */

function showCartNotification(
    message
) {

    /*
     * Do not attempt to create a notification before
     * document.body exists.
     */

    if (!document.body) {
        return;
    }

    let notification =
        document.getElementById(
            "cartNotification"
        );


    if (!notification) {

        notification =
            document.createElement(
                "div"
            );

        notification.id =
            "cartNotification";

        notification.style.position =
            "fixed";

        notification.style.top =
            "20px";

        notification.style.right =
            "20px";

        notification.style.zIndex =
            "99999";

        notification.style.padding =
            "14px 20px";

        notification.style.background =
            "#222";

        notification.style.color =
            "#fff";

        notification.style.borderRadius =
            "8px";

        notification.style.fontSize =
            "14px";

        notification.style.fontFamily =
            "Inter, sans-serif";

        notification.style.boxShadow =
            "0 5px 20px rgba(0,0,0,.2)";

        notification.style.maxWidth =
            "calc(100vw - 40px)";

        notification.style.wordBreak =
            "break-word";

        notification.style.pointerEvents =
            "none";

        notification.setAttribute(
            "role",
            "status"
        );

        notification.setAttribute(
            "aria-live",
            "polite"
        );

        document.body.appendChild(
            notification
        );
    }


    notification.textContent =
        String(
            message || ""
        );

    notification.style.display =
        "block";


    clearTimeout(
        notification._cartTimer
    );


    notification._cartTimer =
        setTimeout(
            () => {

                if (
                    notification
                ) {

                    notification.style.display =
                        "none";
                }

            },
            2200
        );
}


/* =========================================================
   GENERIC ADD-TO-CART BUTTON HANDLER

   Supports:

   .add-to-cart
   [data-add-to-cart]

   IMPORTANT:
   The button is NOT permanently marked as handled.
   It can therefore be clicked repeatedly.
========================================================= */

document.addEventListener(
    "click",
    event => {

        const target =
            event.target;

        if (
            !target ||
            typeof target.closest !==
                "function"
        ) {
            return;
        }

        const button =
            target.closest(
                ".add-to-cart, [data-add-to-cart]"
            );

        if (!button) {
            return;
        }


        /*
         * Do not process disabled buttons.
         */

        if (
            button.disabled ||
            button.getAttribute(
                "aria-disabled"
            ) === "true"
        ) {
            return;
        }


        /*
         * If another handler has already prevented the
         * default action, do not duplicate the action.
         */

        if (
            event.defaultPrevented
        ) {
            return;
        }


        /*
         * Product ID may exist directly on the button or
         * on its product card.
         */

        const id =
            button.dataset.id ||
            button.dataset.productId ||
            (
                typeof button.closest ===
                    "function"
                    ? (
                        button.closest(
                            "[data-id]"
                        )?.dataset?.id
                    )
                    : null
            );

        if (
            !id ||
            String(id).trim() === ""
        ) {

            console.warn(
                "Aravon Cart: Add-to-cart button has no product ID.",
                button
            );

            return;
        }


        event.preventDefault();

        event.stopPropagation();


        addToCartFromElement(
            button
        );

    }
);


/* =========================================================
   CART UPDATED EVENT — WINDOW
========================================================= */

window.addEventListener(
    "cartUpdated",
    () => {

        updateCartCount();

    }
);


/* =========================================================
   CART UPDATED EVENT — DOCUMENT
========================================================= */

document.addEventListener(
    "cartUpdated",
    () => {

        updateCartCount();

    }
);


/* =========================================================
   LISTEN FOR CART CHANGES FROM OTHER TABS
========================================================= */

window.addEventListener(
    "storage",
    event => {

        if (
            event.key ===
            CART_STORAGE_KEY
        ) {

            updateCartCount();

            /*
             * Do not write back to localStorage here.
             * This prevents synchronization loops.
             */

            dispatchCartUpdated(
                getCart()
            );
        }

    }
);


/* =========================================================
   INITIALIZE CART COUNT
========================================================= */

function initializeCartCount() {

    updateCartCount();

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCartCount,
        {
            once: true
        }
    );

} else {

    initializeCartCount();
}


/* =========================================================
   PUBLIC API
========================================================= */

window.AravonCart = {

    getCart,

    saveCart,

    clearCart,

    addToCart,

    addToCartFromElement,

    removeFromCart,

    setCartQuantity,

    increaseCartQuantity,

    decreaseCartQuantity,

    getCartItemCount,

    getCartSubtotal,

    getCartTotals,

    getCartTotal,

    updateCartCount,

    showCartNotification
};


/* =========================================================
   BACKWARD COMPATIBILITY

   Allows existing HTML and older JavaScript such as:

   onclick="addToCart(product)"

   to continue working.
========================================================= */

window.getCart =
    getCart;

window.saveCart =
    saveCart;

window.clearCart =
    clearCart;

window.addToCart =
    addToCart;

window.addToCartFromElement =
    addToCartFromElement;

window.removeFromCart =
    removeFromCart;

window.setCartQuantity =
    setCartQuantity;

window.increaseCartQuantity =
    increaseCartQuantity;

window.decreaseCartQuantity =
    decreaseCartQuantity;

window.getCartItemCount =
    getCartItemCount;

window.getCartSubtotal =
    getCartSubtotal;

window.getCartTotals =
    getCartTotals;

window.getCartTotal =
    getCartTotal;

window.updateCartCount =
    updateCartCount;

window.showCartNotification =
    showCartNotification;


/* =========================================================
   END OF ARAVON SHOP CART.JS
========================================================= */