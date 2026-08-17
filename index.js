// ============================================================
// public/js/index.js
// ARAVON SHOP — HOMEPAGE CONTROLLER
//
// Handles:
//   - Homepage products
//   - Search
//   - Category search
//   - Price sorting
//   - Gender filtering
//   - Product navigation
//   - Mobile menu
//   - Cart count
//
// Uses:
//   - /homepage.json
//   - /theme.json
//   - /js/utils.js
//   - /cart/shared/cart.js
//
// IMPORTANT:
// Keep page-specific cart operations inside cart/shared/cart.js.
// ============================================================

import {
    loadJSON,
    formatPrice,
    getProductImage,
    productMatchesSearch,
    productMatchesGender,
    sortByPrice,
    escapeHTML
} from "./utils.js";


// ============================================================
// CONFIGURATION
// ============================================================

const HOMEPAGE_JSON = "/homepage.json";
const THEME_JSON = "/theme.json";

const CART_STORAGE_KEY = "cart";


// ============================================================
// DOM READY
// ============================================================

document.addEventListener("DOMContentLoaded", init);


// ============================================================
// INITIALIZE HOMEPAGE
// ============================================================

async function init() {

    // --------------------------------------------------------
    // ELEMENTS
    // --------------------------------------------------------

    const productGrid =
        document.getElementById("productGrid");

    const searchInput =
        document.getElementById("searchInput");

    const searchBtn =
        document.getElementById("searchBtn");

    const cartCount =
        document.getElementById("cartCount");

    const sortDropdown =
        document.getElementById("sortDropdown");

    const genderDropdown =
        document.getElementById("genderDropdown");

    const menuToggle =
        document.getElementById("menuToggle");

    const mobileMenu =
        document.getElementById("mobileMenu");


    // --------------------------------------------------------
    // MOBILE MENU
    // --------------------------------------------------------

    setupMobileMenu(
        menuToggle,
        mobileMenu
    );


    // --------------------------------------------------------
    // CART COUNT
    // --------------------------------------------------------

    updateCartCount(cartCount);


    // --------------------------------------------------------
    // LOAD HOMEPAGE DATA
    // --------------------------------------------------------

    const homepage =
        await loadJSON(
            HOMEPAGE_JSON,
            {
                products: []
            }
        );


    const products =
        Array.isArray(homepage.products)
            ? homepage.products
            : [];


    // --------------------------------------------------------
    // IF HOMEPAGE ALREADY CONTAINS PRODUCT CARDS
    // --------------------------------------------------------

    if (
        productGrid &&
        productGrid.querySelectorAll(".product-card").length > 0
    ) {

        setupExistingProductCards(
            productGrid
        );

        setupSearch(
            searchInput,
            searchBtn,
            productGrid,
            products
        );

        setupFilters(
            sortDropdown,
            genderDropdown,
            productGrid
        );

        return;
    }


    // --------------------------------------------------------
    // RENDER PRODUCTS FROM homepage.json
    // --------------------------------------------------------

    if (productGrid) {

        renderProducts(
            productGrid,
            products
        );

    }


    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    setupSearch(
        searchInput,
        searchBtn,
        productGrid,
        products
    );


    // --------------------------------------------------------
    // SORT + GENDER FILTER
    // --------------------------------------------------------

    setupFilters(
        sortDropdown,
        genderDropdown,
        productGrid
    );
}


// ============================================================
// MOBILE MENU
// ============================================================

function setupMobileMenu(
    menuToggle,
    mobileMenu
) {

    if (
        !menuToggle ||
        !mobileMenu
    ) {
        return;
    }


    menuToggle.addEventListener(
        "click",
        () => {

            mobileMenu.classList.toggle(
                "show"
            );

            const isOpen =
                mobileMenu.classList.contains(
                    "show"
                );

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        }
    );


    // --------------------------------------------------------
    // CLOSE MENU WHEN A LINK IS CLICKED
    // --------------------------------------------------------

    mobileMenu
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    mobileMenu.classList.remove(
                        "show"
                    );

                    menuToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        });
}


// ============================================================
// EXISTING PRODUCT CARDS
// ============================================================

function setupExistingProductCards(
    productGrid
) {

    const cards =
        [
            ...productGrid.querySelectorAll(
                ".product-card"
            )
        ];


    cards.forEach(card => {

        setupProductCard(
            card
        );

    });
}


// ============================================================
// PRODUCT CARD
// ============================================================

function setupProductCard(
    card
) {

    if (!card) {
        return;
    }


    // --------------------------------------------------------
    // PRODUCT CLICK
    // --------------------------------------------------------

    card.addEventListener(
        "click",
        event => {

            // Do not navigate when clicking
            // an Add to Cart button.

            if (
                event.target.closest(
                    ".add-cart-btn"
                )
            ) {
                return;
            }


            const id =
                card.dataset.id;


            if (!id) {
                return;
            }


            window.location.href =
                `product-pages/single-product.html?id=${encodeURIComponent(id)}`;

        }
    );


    // --------------------------------------------------------
    // ADD TO CART
    //
    // Central cart/shared/cart.js remains
    // responsible for the actual cart system.
    // --------------------------------------------------------

    const addButton =
        card.querySelector(
            ".add-cart-btn"
        );


    if (!addButton) {
        return;
    }


    addButton.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            const product =
                getProductFromCard(card);


            if (!product.id) {
                return;
            }


            addToCartFallback(
                product
            );


            updateCartCount(
                document.getElementById(
                    "cartCount"
                )
            );

        }
    );
}


// ============================================================
// PRODUCT FROM HTML CARD
// ============================================================

function getProductFromCard(
    card
) {

    const id =
        card.dataset.id || "";


    const nameElement =
        card.querySelector(
            ".product-title"
        );


    const price =
        Number(
            card.dataset.price || 0
        );


    const imageElement =
        card.querySelector(
            "img"
        );


    return {

        id,

        name:
            nameElement
                ? nameElement.textContent.trim()
                : "Product",

        price,

        image:
            imageElement
                ? imageElement.src
                : "",

        qty: 1

    };
}


// ============================================================
// CART FALLBACK
//
// This keeps the homepage compatible with the existing
// localStorage cart while cart/shared/cart.js is the
// central cart system.
//
// Once cart.js is loaded globally, it can take over.
// ============================================================

function addToCartFallback(
    product
) {

    let cart = [];


    try {

        cart =
            JSON.parse(
                localStorage.getItem(
                    CART_STORAGE_KEY
                )
            ) || [];

    } catch (error) {

        cart = [];

    }


    const existing =
        cart.find(
            item =>
                String(item.id) ===
                String(product.id)
        );


    if (existing) {

        existing.qty =
            Number(existing.qty || 0) + 1;

    } else {

        cart.push({

            id: product.id,

            name: product.name,

            price: product.price,

            image: product.image,

            qty: 1

        });

    }


    localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
    );
}


// ============================================================
// CART COUNT
// ============================================================

function updateCartCount(
    cartCount
) {

    if (!cartCount) {
        return;
    }


    let cart = [];


    try {

        cart =
            JSON.parse(
                localStorage.getItem(
                    CART_STORAGE_KEY
                )
            ) || [];

    } catch (error) {

        cart = [];

    }


    const total =
        cart.reduce(
            (sum, item) => {

                return (
                    sum +
                    Math.max(
                        0,
                        Number(item.qty) || 0
                    )
                );

            },
            0
        );


    cartCount.textContent =
        String(total);
}


// ============================================================
// SEARCH
// ============================================================

function setupSearch(
    searchInput,
    searchBtn,
    productGrid,
    products
) {

    if (!searchInput) {
        return;
    }


    const runSearch = () => {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();


        // ----------------------------------------------------
        // EMPTY SEARCH
        // ----------------------------------------------------

        if (!query) {

            if (productGrid) {

                renderProducts(
                    productGrid,
                    products
                );

            }

            return;
        }


        // ----------------------------------------------------
        // CATEGORY SEARCH
        // ----------------------------------------------------

        const category =
            detectCategory(
                query
            );


        if (category) {

            window.location.href =
                `product-pages/${category}.html`;

            return;
        }


        // ----------------------------------------------------
        // PRODUCT SEARCH
        // ----------------------------------------------------

        const matchingProducts =
            products.filter(
                product =>
                    productMatchesSearch(
                        product,
                        query
                    )
            );


        if (productGrid) {

            renderProducts(
                productGrid,
                matchingProducts
            );

        }

    };


    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            runSearch
        );

    }


    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                runSearch();

            }

        }
    );
}


// ============================================================
// CATEGORY DETECTION
// ============================================================

function detectCategory(
    query
) {

    const categoryMap = {

        fashion: [
            "fashion",
            "shirt",
            "tshirt",
            "t-shirt",
            "jeans",
            "dress",
            "hoodie",
            "jacket",
            "clothes",
            "clothing",
            "cap",
            "hat"
        ],

        sports: [
            "sports",
            "sport",
            "ball",
            "football",
            "basketball",
            "running",
            "gym",
            "fitness",
            "yoga",
            "dumbbell"
        ],

        toys: [
            "toy",
            "toys",
            "lego",
            "doll",
            "puzzle",
            "blocks",
            "action figure"
        ],

        accessories: [
            "accessories",
            "wallet",
            "belt",
            "sunglasses",
            "necklace",
            "chain",
            "watch",
            "bag",
            "tote"
        ],

        automotive: [
            "automotive",
            "automotive",
            "car",
            "vehicle",
            "tire",
            "tyre"
        ],

        electronics: [
            "electronics",
            "electronic",
            "earbuds",
            "phone",
            "laptop",
            "camera"
        ],

        appliances: [
            "appliances",
            "appliance",
            "fridge",
            "microwave",
            "washer",
            "heater",
            "air purifier"
        ],

        trending: [
            "trending",
            "popular",
            "hot"
        ],

        "best-seller": [
            "best seller",
            "bestseller",
            "best-selling",
            "top seller"
        ]

    };


    for (
        const category in categoryMap
    ) {

        const keywords =
            categoryMap[category];


        if (
            keywords.some(
                keyword =>
                    query.includes(keyword)
            )
        ) {

            return category;
        }

    }


    return null;
}


// ============================================================
// SORT + GENDER FILTER
// ============================================================

function setupFilters(
    sortDropdown,
    genderDropdown,
    productGrid
) {

    if (
        !sortDropdown &&
        !genderDropdown
    ) {
        return;
    }


    const originalCards =
        productGrid
            ? [
                ...productGrid.querySelectorAll(
                    ".product-card"
                )
            ]
            : [];


    const renderFilteredCards = () => {

        if (!productGrid) {
            return;
        }


        let cards =
            [...originalCards];


        // ----------------------------------------------------
        // GENDER
        // ----------------------------------------------------

        const gender =
            genderDropdown
                ? genderDropdown.value
                : "all";


        if (
            gender &&
            gender !== "all"
        ) {

            cards =
                cards.filter(
                    card =>
                        productMatchesGender(
                            {
                                gender:
                                    card.dataset.gender
                            },
                            gender
                        )
                );

        }


        // ----------------------------------------------------
        // SORT
        // ----------------------------------------------------

        const sort =
            sortDropdown
                ? sortDropdown.value
                : "default";


        if (
            sort === "low-high"
        ) {

            cards.sort(
                (a, b) =>
                    Number(
                        a.dataset.price || 0
                    ) -
                    Number(
                        b.dataset.price || 0
                    )
            );

        }


        if (
            sort === "high-low"
        ) {

            cards.sort(
                (a, b) =>
                    Number(
                        b.dataset.price || 0
                    ) -
                    Number(
                        a.dataset.price || 0
                    )
            );

        }


        // ----------------------------------------------------
        // DISPLAY
        // ----------------------------------------------------

        productGrid.innerHTML = "";


        cards.forEach(
            card => {

                productGrid.appendChild(
                    card
                );

            }
        );

    };


    if (sortDropdown) {

        sortDropdown.addEventListener(
            "change",
            renderFilteredCards
        );

    }


    if (genderDropdown) {

        genderDropdown.addEventListener(
            "change",
            renderFilteredCards
        );

    }
}


// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts(
    productGrid,
    products
) {

    if (!productGrid) {
        return;
    }


    productGrid.innerHTML = "";


    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        productGrid.innerHTML = `
            <div class="no-products">
                <p>No products found.</p>
            </div>
        `;

        return;
    }


    products.forEach(
        product => {

            const card =
                createProductCard(
                    product
                );


            productGrid.appendChild(
                card
            );


            setupProductCard(
                card
            );

        }
    );
}


// ============================================================
// CREATE PRODUCT CARD
//
// Keeps the important existing classes/data attributes
// so your current CSS can continue working.
// ============================================================

function createProductCard(
    product
) {

    const card =
        document.createElement("article");


    card.className =
        "product-card";


    card.dataset.id =
        product.id || "";


    card.dataset.gender =
        product.gender || "";


    card.dataset.price =
        Number(product.price) || 0;


    const image =
        getProductImage(
            product,
            ""
        );


    const name =
        escapeHTML(
            product.name ||
            "Product"
        );


    const brand =
        escapeHTML(
            product.brand ||
            "Aravon"
        );


    const price =
        formatPrice(
            product.price || 0
        );


    card.innerHTML = `

        <div class="product-image">

            <img
                src="${escapeHTML(image)}"
                alt="${name}"
                loading="lazy"
            >

        </div>

        <div class="product-info">

            <div class="product-brand">
                ${brand}
            </div>

            <h3 class="product-title">
                ${name}
            </h3>

            <div
                class="product-price"
                data-price="${Number(product.price) || 0}"
            >
                ${price}
            </div>

            <button
                type="button"
                class="add-cart-btn"
            >
                Add to Cart
            </button>

        </div>

    `;


    return card;
}