/* =========================================================
   ARAVON SHOP
   single-product.js

   CUSTOMER SINGLE PRODUCT PAGE

   DATA SOURCE:
   product-storage.js
   └── inventoryProducts

   IMPORTANT:
   product-storage.js MUST load before this file.

   This file does NOT use a hard-coded products object.
========================================================= */

"use strict";


/* =========================================================
   PRODUCT STORAGE CHECK
========================================================= */

if (!window.AravonProductStorage) {

  console.error(
    "Aravon Shop: product-storage.js must load before single-product.js."
  );

}


/* =========================================================
   GET PRODUCT ID FROM URL
========================================================= */

const urlParams = new URLSearchParams(
  window.location.search
);

const productId =
  urlParams.get("id") || "";


/* =========================================================
   PAGE ELEMENTS
========================================================= */

const productPage =
  document.getElementById("productPage");

const productImage =
  document.getElementById("productImage");

const thumbnailRow =
  document.getElementById("thumbnailRow");

const productName =
  document.getElementById("productName");

const productPrice =
  document.getElementById("productPrice");

const productBrand =
  document.getElementById("productBrand");

const productCategory =
  document.getElementById("productCategory");

const productShortDescription =
  document.getElementById("productShortDescription");

const productDescription =
  document.getElementById("productDescription");

const productDescriptionBottom =
  document.getElementById("productDescriptionBottom");

const productIdElement =
  document.getElementById("productId");

const customerIdElement =
  document.getElementById("customerId");

const variantSelector =
  document.getElementById("variantSelector");

const variantRequired =
  document.getElementById("variantRequired");

const fastCheckoutBtn =
  document.getElementById("fastCheckoutBtn");

const addToCartBtn =
  document.getElementById("addToCartBtn");

const cartCount =
  document.getElementById("cartCount");

const moreProducts =
  document.getElementById("moreProducts");

const stripeDescription =
  document.getElementById("stripeDescription");


/* =========================================================
   SAFE TEXT HELPER
========================================================= */

function safeText(value, fallback = "") {

  if (
    value === null ||
    value === undefined
  ) {

    return fallback;

  }

  const text =
    String(value).trim();

  return text || fallback;

}


/* =========================================================
   SAFE NUMBER HELPER
========================================================= */

function safeNumber(value, fallback = 0) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


/* =========================================================
   GET CURRENT PRODUCT
========================================================= */

let product = null;


if (
  window.AravonProductStorage &&
  productId
) {

  product =
    window.AravonProductStorage
      .getProductById(productId);

}


/* =========================================================
   LOG PRODUCT INFORMATION
========================================================= */

console.log(
  "Aravon Shop: Product ID:",
  productId
);

console.log(
  "Aravon Shop: Loaded inventory product:",
  product
);


/* =========================================================
   PRODUCT NOT FOUND
========================================================= */

if (!product) {

  console.error(
    "Aravon Shop: Product not found in inventoryProducts:",
    productId
  );


  if (productPage) {

    productPage.innerHTML = `

      <div class="product-not-found">

        <h2>Product not found</h2>

        <p>
          This product could not be found in the inventory.
        </p>

      </div>

    `;

  }

}


/* =========================================================
   MAIN PRODUCT
========================================================= */

if (product) {


  /* =======================================================
     NORMALIZE PRODUCT
  ======================================================= */

  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage.normalizeProduct ===
      "function"
  ) {

    product =
      window.AravonProductStorage
        .normalizeProduct(product);

  }


  console.log(
    "Aravon Shop: Normalized product:",
    product
  );


  /* =======================================================
     PRODUCT ID
  ======================================================= */

  const normalizedProductId =
    safeText(
      product.id,
      productId
    );


  if (productIdElement) {

    productIdElement.textContent =
      normalizedProductId;

    productIdElement.dataset.productId =
      normalizedProductId;

  }


  /* =======================================================
     CUSTOMER ID
  ======================================================= */

  /*
     Customer ID is not required to load the product.

     If your page has #customerId, use the existing
     customer/session value when available.
  */

  if (customerIdElement) {

    let customerId = "";

    try {

      customerId =
        localStorage.getItem("customerId") ||
        localStorage.getItem("userId") ||
        localStorage.getItem("uid") ||
        "";

    } catch (error) {

      console.warn(
        "Aravon Shop: Could not read customer ID.",
        error
      );

    }


    customerIdElement.textContent =
      customerId || "";

  }


  /* =======================================================
     PRODUCT NAME
  ======================================================= */

  const name =
    safeText(
      product.name,
      "Product"
    );


  if (productName) {

    productName.textContent =
      name;

  }


  /* =======================================================
     PRODUCT PRICE
  ======================================================= */

  const price =
    safeNumber(
      product.price,
      0
    );


  if (productPrice) {

    productPrice.textContent =
      `€${price.toFixed(2)}`;

  }


  /* =======================================================
     BRAND
  ======================================================= */

  let brand = "";


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage.getProductBrand ===
      "function"
  ) {

    brand =
      window.AravonProductStorage
        .getProductBrand(product);

  } else {

    brand =
      product.brand ||
      product.brandName ||
      product.manufacturer ||
      "";

  }


  brand =
    safeText(
      brand,
      "Aravon"
    );


  if (productBrand) {

    productBrand.textContent =
      brand;

  }


  /* =======================================================
     CATEGORY
  ======================================================= */

  let category = "";


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage.getProductCategory ===
      "function"
  ) {

    category =
      window.AravonProductStorage
        .getProductCategory(product);

  } else {

    category =
      product.category ||
      product.categoryName ||
      product.categorySlug ||
      product.slug ||
      product.productCategory ||
      "";

  }


  category =
    safeText(
      category,
      "Uncategorized"
    );


  if (productCategory) {

    productCategory.textContent =
      category;

  }


  /* =======================================================
     SHORT DESCRIPTION
  ======================================================= */

  let shortDescription = "";


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage
        .getProductShortDescription ===
      "function"
  ) {

    shortDescription =
      window.AravonProductStorage
        .getProductShortDescription(product);

  } else {

    shortDescription =
      product.shortDescription ||
      product.summary ||
      product.description ||
      "";

  }


  shortDescription =
    safeText(
      shortDescription,
      "No short description available"
    );


  if (productShortDescription) {

    productShortDescription.textContent =
      shortDescription;

  }


  /* =======================================================
     FULL DESCRIPTION
  ======================================================= */

  let fullDescription = "";


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage
        .getProductDescription ===
      "function"
  ) {

    fullDescription =
      window.AravonProductStorage
        .getProductDescription(product);

  } else {

    fullDescription =
      product.description ||
      product.productDescription ||
      product.longDescription ||
      product.details ||
      product.shortDescription ||
      "";

  }


  fullDescription =
    safeText(
      fullDescription,
      "No product description available"
    );


  if (productDescription) {

    productDescription.textContent =
      fullDescription;

  }


  if (productDescriptionBottom) {

    productDescriptionBottom.textContent =
      fullDescription;

  }


  /* =======================================================
     STRIPE DESCRIPTION
  ======================================================= */

  if (stripeDescription) {

    stripeDescription.textContent =
      fullDescription;

  }


  /* =======================================================
     PRODUCT IMAGES
  ======================================================= */

  let productImages = [];


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage.getProductImages ===
      "function"
  ) {

    productImages =
      window.AravonProductStorage
        .getProductImages(product);

  }


  /*
     Safety fallback.

     product-storage.js normally already creates
     normalized product.images.
  */

  if (
    productImages.length === 0 &&
    Array.isArray(product.images)
  ) {

    productImages =
      product.images
        .filter(Boolean)
        .map(
          image =>
            String(image).trim()
        )
        .filter(Boolean);

  }


  /*
     Final single-image fallback.
  */

  if (
    productImages.length === 0 &&
    typeof product.image === "string" &&
    product.image.trim() !== ""
  ) {

    productImages = [
      product.image.trim()
    ];

  }


  /*
     Remove duplicates.
  */

  productImages = [
    ...new Set(
      productImages
        .filter(Boolean)
        .map(
          image =>
            String(image).trim()
        )
        .filter(Boolean)
    )
  ];


  console.log(
    "Aravon Shop: Resolved product images:",
    productImages
  );


  /* =======================================================
     MAIN IMAGE
  ======================================================= */

  if (productImage) {

    if (productImages.length > 0) {

      productImage.src =
        productImages[0];

      productImage.alt =
        `${name} product image`;

      productImage.style.display =
        "block";

      productImage.removeAttribute(
        "data-no-image"
      );

    } else {

      console.warn(
        "Aravon Shop: No image found for product:",
        normalizedProductId
      );


      productImage.removeAttribute(
        "src"
      );


      productImage.alt =
        "No product image available";


      productImage.setAttribute(
        "data-no-image",
        "true"
      );

    }

  }


  /* =======================================================
     THUMBNAILS
  ======================================================= */

  if (thumbnailRow) {

    thumbnailRow.innerHTML =
      "";


    productImages.forEach(
      (imageUrl, index) => {

        const thumbnail =
          document.createElement("img");


        thumbnail.src =
          imageUrl;


        thumbnail.alt =
          `${name} image ${index + 1}`;


        thumbnail.className =
          "product-thumbnail";


        thumbnail.loading =
          "lazy";


        thumbnail.style.cursor =
          "pointer";


        thumbnail.addEventListener(
          "click",
          () => {

            if (productImage) {

              productImage.src =
                imageUrl;

              productImage.alt =
                `${name} product image`;

            }

          }
        );


        thumbnailRow.appendChild(
          thumbnail
        );

      }
    );

  }


  /* =======================================================
     VARIANTS / SIZES
  ======================================================= */

  let variants = [];


  if (
    window.AravonProductStorage &&
    typeof
      window.AravonProductStorage
        .getProductVariants ===
      "function"
  ) {

    variants =
      window.AravonProductStorage
        .getProductVariants(product);

  } else {

    variants =
      Array.isArray(product.variants)
        ? product.variants
        : (
            Array.isArray(product.sizes)
              ? product.sizes
              : []
          );

  }


  variants =
    variants
      .map(
        variant =>
          safeText(variant, "")
      )
      .filter(Boolean);


  /*
     Products without variants use One Size.
  */

  if (variants.length === 0) {

    variants = [
      "One Size"
    ];

  }


  if (variantSelector) {

    variantSelector.innerHTML =
      "";


    variants.forEach(
      variant => {

        const button =
          document.createElement("button");


        button.type =
          "button";


        button.className =
          "variant-btn";


        button.textContent =
          variant;


        button.dataset.variant =
          variant;


        button.addEventListener(
          "click",
          () => {

            variantSelector
              .querySelectorAll(
                ".variant-btn"
              )
              .forEach(
                currentButton => {

                  currentButton.classList.remove(
                    "active"
                  );

                }
              );


            button.classList.add(
              "active"
            );


            if (variantRequired) {

              variantRequired.style.display =
                "none";

            }

          }
        );


        variantSelector.appendChild(
          button
        );

      }
    );

  }


  /* =======================================================
     STRIPE CHECKOUT
  ======================================================= */

  if (fastCheckoutBtn) {

    const stripeLink =
      safeText(
        product.stripePaymentLink ||
        product.stripeUrl ||
        product.paymentLink ||
        product.stripeLink ||
        "",
        ""
      );


    if (stripeLink) {

      fastCheckoutBtn.href =
        stripeLink;


      fastCheckoutBtn.target =
        "_blank";


      fastCheckoutBtn.rel =
        "noopener noreferrer";


      fastCheckoutBtn.style.display =
        "block";

    } else {

      fastCheckoutBtn.style.display =
        "none";

    }

  }


  /* =======================================================
     QUANTITY
  ======================================================= */

  let quantity = 1;


  const qtyValue =
    document.getElementById(
      "qtyValue"
    );


  const qtyMinus =
    document.getElementById(
      "qtyMinus"
    );


  const qtyPlus =
    document.getElementById(
      "qtyPlus"
    );


  function updateQuantityDisplay() {

    if (qtyValue) {

      qtyValue.textContent =
        quantity;

    }

  }


  if (qtyMinus) {

    qtyMinus.addEventListener(
      "click",
      event => {

        event.preventDefault();


        if (quantity > 1) {

          quantity--;

        }


        updateQuantityDisplay();

      }
    );

  }


  if (qtyPlus) {

    qtyPlus.addEventListener(
      "click",
      event => {

        event.preventDefault();


        quantity++;


        updateQuantityDisplay();

      }
    );

  }


  updateQuantityDisplay();


  /* =======================================================
     ADD TO CART
  ======================================================= */

  if (addToCartBtn) {

    addToCartBtn.addEventListener(
      "click",
      event => {

        event.preventDefault();


        /*
           Find selected variant.
        */

        const selectedVariant =
          variantSelector
            ? variantSelector.querySelector(
                ".variant-btn.active"
              )
            : null;


        /*
           Require a variant.

           One Size products automatically receive
           One Size because the selector is generated above.
        */

        if (!selectedVariant) {

          if (variantRequired) {

            variantRequired.style.display =
              "inline";

          }

          return;

        }


        let cart = [];


        try {

          cart =
            JSON.parse(
              localStorage.getItem("cart")
            ) || [];


          if (!Array.isArray(cart)) {

            cart = [];

          }

        } catch (error) {

          console.error(
            "Aravon Shop: Could not read cart.",
            error
          );


          cart = [];

        }


        /*
           Add the inventory product to cart.
        */

        cart.push({

          id:
            normalizedProductId,

          name:
            name,

          price:
            price,

          image:
            productImages[0] || "",

          imageUrl:
            productImages[0] || "",

          qty:
            quantity,

          quantity:
            quantity,

          size:
            selectedVariant.dataset.variant ||
            selectedVariant.textContent,

          variant:
            selectedVariant.dataset.variant ||
            selectedVariant.textContent,

          brand:
            brand,

          category:
            category

        });


        try {

          localStorage.setItem(
            "cart",
            JSON.stringify(cart)
          );

        } catch (error) {

          console.error(
            "Aravon Shop: Could not save cart.",
            error
          );

          return;

        }


        updateCartCount();


        /*
           Button feedback.
        */

        const originalText =
          addToCartBtn.textContent;


        addToCartBtn.textContent =
          "Added to Cart";


        setTimeout(
          () => {

            addToCartBtn.textContent =
              originalText;

          },
          1200
        );

      }
    );

  }

}


/* =========================================================
   UPDATE CART COUNT
========================================================= */

function updateCartCount() {

  let cart = [];


  try {

    cart =
      JSON.parse(
        localStorage.getItem("cart")
      ) || [];


    if (!Array.isArray(cart)) {

      cart = [];

    }

  } catch (error) {

    cart = [];

  }


  const totalQuantity =
    cart.reduce(
      (
        total,
        item
      ) => {

        const quantity =
          Number(
            item?.qty ??
            item?.quantity ??
            0
          );


        return (
          total +
          (
            Number.isFinite(quantity)
              ? quantity
              : 0
          )
        );

      },
      0
    );


  if (cartCount) {

    cartCount.textContent =
      totalQuantity;

  }

}


/* =========================================================
   INITIAL CART COUNT
========================================================= */

updateCartCount();


/* =========================================================
   REVIEWS
========================================================= */

if (productId) {

  const reviewsKey =
    `reviews_${productId}`;


  const reviewsList =
    document.getElementById(
      "reviewsList"
    );


  function loadReviews() {

    if (!reviewsList) {

      return;

    }


    let reviews = [];


    try {

      reviews =
        JSON.parse(
          localStorage.getItem(
            reviewsKey
          )
        ) || [];


      if (!Array.isArray(reviews)) {

        reviews = [];

      }

    } catch (error) {

      reviews = [];

    }


    reviewsList.innerHTML =
      "";


    if (reviews.length === 0) {

      reviewsList.innerHTML =
        "<p>No reviews yet.</p>";

      return;

    }


    reviews.forEach(
      review => {

        const div =
          document.createElement("div");


        div.style.marginBottom =
          "12px";


        const strong =
          document.createElement("strong");


        strong.textContent =
          safeText(
            review.name,
            "Customer"
          );


        const rating =
          document.createTextNode(
            ` – ⭐ ${safeText(
              review.rating,
              "0"
            )}`
          );


        const br =
          document.createElement("br");


        const comment =
          document.createTextNode(
            safeText(
              review.comment,
              ""
            )
          );


        div.appendChild(
          strong
        );


        div.appendChild(
          rating
        );


        div.appendChild(
          br
        );


        div.appendChild(
          comment
        );


        reviewsList.appendChild(
          div
        );

      }
    );

  }


  loadReviews();


  /* =======================================================
     STAR RATING
  ======================================================= */

  const ratingStars =
    document.getElementById(
      "ratingStars"
    );


  let selectedRating =
    0;


  if (ratingStars) {

    ratingStars.innerHTML =
      "";


    for (
      let i = 1;
      i <= 5;
      i++
    ) {

      const star =
        document.createElement("span");


      star.textContent =
        "⭐";


      star.style.cursor =
        "pointer";


      star.style.fontSize =
        "20px";


      star.style.opacity =
        "0.3";


      star.setAttribute(
        "role",
        "button"
      );


      star.setAttribute(
        "aria-label",
        `${i} star rating`
      );


      star.addEventListener(
        "click",
        () => {

          selectedRating =
            i;


          ratingStars
            .querySelectorAll("span")
            .forEach(
              (
                currentStar,
                index
              ) => {

                currentStar.style.opacity =
                  index < i
                    ? "1"
                    : "0.3";

              }
            );

        }
      );


      ratingStars.appendChild(
        star
      );

    }

  }


  /* =======================================================
     SUBMIT REVIEW
  ======================================================= */

  const submitReviewBtn =
    document.getElementById(
      "submitReviewBtn"
    );


  if (submitReviewBtn) {

    submitReviewBtn.addEventListener(
      "click",
      event => {

        event.preventDefault();


        const reviewName =
          document.getElementById(
            "reviewName"
          );


        const reviewComment =
          document.getElementById(
            "reviewComment"
          );


        const reviewStatus =
          document.getElementById(
            "reviewStatus"
          );


        const name =
          reviewName
            ? reviewName.value.trim()
            : "";


        const comment =
          reviewComment
            ? reviewComment.value.trim()
            : "";


        if (
          !name ||
          !comment ||
          selectedRating === 0
        ) {

          if (reviewStatus) {

            reviewStatus.textContent =
              "Please fill all fields and select a rating.";

          }

          return;

        }


        let reviews = [];


        try {

          reviews =
            JSON.parse(
              localStorage.getItem(
                reviewsKey
              )
            ) || [];


          if (!Array.isArray(reviews)) {

            reviews = [];

          }

        } catch (error) {

          reviews = [];

        }


        reviews.push({

          name:
            name,

          comment:
            comment,

          rating:
            selectedRating,

          productId:
            productId,

          createdAt:
            new Date().toISOString()

        });


        try {

          localStorage.setItem(
            reviewsKey,
            JSON.stringify(reviews)
          );

        } catch (error) {

          console.error(
            "Aravon Shop: Could not save review.",
            error
          );

          return;

        }


        if (reviewStatus) {

          reviewStatus.textContent =
            "Review submitted!";

        }


        if (reviewName) {

          reviewName.value =
            "";

        }


        if (reviewComment) {

          reviewComment.value =
            "";

        }


        selectedRating =
          0;


        if (ratingStars) {

          ratingStars
            .querySelectorAll("span")
            .forEach(
              star => {

                star.style.opacity =
                  "0.3";

              }
            );

        }


        loadReviews();

      }
    );

  }

}


/* =========================================================
   RECOMMENDED / OTHER PRODUCTS
========================================================= */

function loadRecommendedProducts() {

  if (!moreProducts) {

    return;

  }


  if (
    !window.AravonProductStorage
  ) {

    console.error(
      "Aravon Shop: product-storage.js is required for recommendations."
    );

    return;

  }


  let products = [];


  /*
     Get every product except the current one.
  */

  products =
    window.AravonProductStorage
      .getOtherProducts(productId);


  moreProducts.innerHTML =
    "";


  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {

    moreProducts.innerHTML =
      "<p>No recommended products available.</p>";

    return;

  }


  /*
     Prefer products marked as recommended.

     If none are marked recommended, use other products.
  */

  const recommendedProducts =
    products.filter(
      item =>
        item?.recommended === true
    );


  const productsToDisplay =
    recommendedProducts.length > 0
      ? recommendedProducts
      : products;


  productsToDisplay.forEach(
    recommendedProduct => {

      const card =
        document.createElement("div");


      card.className =
        "product-card";


      /*
         Product-card data source.

         These are generated from the actual
         inventory product, not hard-coded HTML.
      */

      card.dataset.id =
        safeText(
          recommendedProduct.id,
          ""
        );


      const image =
        window.AravonProductStorage
          .getProductImage(
            recommendedProduct
          ) || "";


      const name =
        safeText(
          recommendedProduct.name,
          "Product"
        );


      const price =
        safeNumber(
          recommendedProduct.price,
          0
        );


      const brand =
        safeText(
          recommendedProduct.brand,
          "Aravon"
        );


      const category =
        safeText(
          recommendedProduct.category,
          "Uncategorized"
        );


      /* ===================================================
         IMAGE
      =================================================== */

      let imageHtml = "";


      if (image) {

        imageHtml = `

          <img
            src="${escapeHtmlAttribute(image)}"
            alt="${escapeHtmlAttribute(name)}"
            loading="lazy"
          >

        `;

      } else {

        imageHtml = `

          <div class="product-no-image">
            No image
          </div>

        `;

      }


      /* ===================================================
         CARD HTML
      =================================================== */

      card.innerHTML = `

        <div
          class="slider"
          data-image="${escapeHtmlAttribute(image)}"
        >

          ${imageHtml}

        </div>


        <div
          class="product-title"
        >

          ${escapeHtml(name)}

        </div>


        <div
          class="product-price"
        >

          €${price.toFixed(2)}

        </div>


        <button
          type="button"
          class="recommend-add-btn"
          data-id="${escapeHtmlAttribute(
            recommendedProduct.id
          )}"
        >

          Add to Cart

        </button>

      `;


      /*
         Store useful product data on the card.
      */

      card.dataset.image =
        image;


      card.dataset.brand =
        brand;


      card.dataset.category =
        category;


      card.dataset.price =
        String(price);


      /* ===================================================
         OPEN PRODUCT
      =================================================== */

      card.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".recommend-add-btn"
            )
          ) {

            return;

          }


          const targetId =
            safeText(
              recommendedProduct.id,
              ""
            );


          if (!targetId) {

            return;

          }


          window.location.href =
            `single-product.html?id=${
              encodeURIComponent(
                targetId
              )
            }`;

        }
      );


      /* ===================================================
         ADD RECOMMENDED PRODUCT TO CART
      =================================================== */

      const button =
        card.querySelector(
          ".recommend-add-btn"
        );


      if (button) {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();

            event.stopPropagation();


            let cart = [];


            try {

              cart =
                JSON.parse(
                  localStorage.getItem(
                    "cart"
                  )
                ) || [];


              if (!Array.isArray(cart)) {

                cart = [];

              }

            } catch (error) {

              cart = [];

            }


            const recommendedVariant =
              Array.isArray(
                recommendedProduct.variants
              ) &&
              recommendedProduct.variants.length > 0

                ? recommendedProduct.variants[0]

                : (
                    Array.isArray(
                      recommendedProduct.sizes
                    ) &&
                    recommendedProduct.sizes.length > 0

                      ? recommendedProduct.sizes[0]

                      : "One Size"
                  );


            cart.push({

              id:
                recommendedProduct.id,

              name:
                name,

              price:
                price,

              image:
                image,

              imageUrl:
                image,

              qty:
                1,

              quantity:
                1,

              size:
                recommendedVariant,

              variant:
                recommendedVariant,

              brand:
                brand,

              category:
                category

            });


            try {

              localStorage.setItem(
                "cart",
                JSON.stringify(cart)
              );

            } catch (error) {

              console.error(
                "Aravon Shop: Could not save recommended product to cart.",
                error
              );

              return;

            }


            updateCartCount();


            const originalText =
              button.textContent;


            button.textContent =
              "Added";


            setTimeout(
              () => {

                button.textContent =
                  originalText;

              },
              1000
            );

          }
        );

      }


      moreProducts.appendChild(
        card
      );

    }
  );

}


/* =========================================================
   HTML ESCAPE HELPERS
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeHtmlAttribute(value) {

  return escapeHtml(
    value
  );

}




/* =========================================================
   LOAD RECOMMENDED PRODUCTS
========================================================= */

loadRecommendedProducts();


/* =========================================================
   MATCH BUTTON SIZES
========================================================= */

function matchButtonSizes() {

  const addButton =
    document.getElementById(
      "addToCartBtn"
    );


  const stripeButton =
    document.getElementById(
      "fastCheckoutBtn"
    );


  if (
    !addButton ||
    !stripeButton
  ) {

    return;

  }


  const stripeStyle =
    window.getComputedStyle(
      stripeButton
    );


  /*
     Only copy visual properties.

     Do not force the add button's width to the
     Stripe button's offsetWidth because that can
     cause problems on responsive/mobile layouts.
  */

  addButton.style.padding =
    stripeStyle.padding;


  addButton.style.borderRadius =
    stripeStyle.borderRadius;


  addButton.style.fontSize =
    stripeStyle.fontSize;


  addButton.style.fontWeight =
    stripeStyle.fontWeight;


  /*
     Keep both buttons visually consistent.
  */

  if (
    stripeButton.offsetWidth > 0
  ) {

    addButton.style.width =
      stripeButton.offsetWidth +
      "px";

  }

}


/* =========================================================
   INITIAL BUTTON MATCH
========================================================= */

setTimeout(
  matchButtonSizes,
  150
);


window.addEventListener(
  "resize",
  matchButtonSizes
);


/* =========================================================
   UPDATE PAGE WHEN INVENTORY CHANGES
========================================================= */

window.addEventListener(
  "inventoryProductsUpdated",
  () => {

    /*
       Reload the current product from the updated
       inventory.

       This prevents stale product information when
       another part of the site updates inventory.
    */

    if (
      !window.AravonProductStorage ||
      !productId
    ) {

      return;

    }


    const updatedProduct =
      window.AravonProductStorage
        .getProductById(productId);


    if (!updatedProduct) {

      return;

    }


    /*
       Refresh the page so all product fields,
       gallery, variants and recommendations stay
       synchronized with inventoryProducts.
    */

    window.location.reload();

  }
);


if (variants.length > 0) {
  selectedVariant = variants[0];
  const firstBtn = variantSelector.querySelector(".variant-btn");
  if (firstBtn) firstBtn.classList.add("active");
  variantRequired.style.display = "none";
}

const stock = safeNumber(firstValue(product, ["stock", "inventory", "quantity"], 0), 0);

if (stock <= 0) {
  addToCartBtn.disabled = true;
  addToCartBtn.textContent = "Out of Stock";
  fastCheckoutBtn.style.display = "none";
}

const stock = safeNumber(firstValue(product, ["stock", "inventory", "quantity"], 0), 0);
if (stock > 0 && quantity > stock) quantity = stock;

productImage.src = "https://via.placeholder.com/800x600?text=No+Image";
productImage.alt = "No product image available";
productImage.classList.add("placeholder");

noImage.textContent = "No image";
// or:
// create an <img> with the placeholder URL

window.location.href = `single-product.html?id=${encodeURIComponent(id)}`;
// optionally:
// window.scrollTo({ top: 0, behavior: "smooth" });

/* =========================================================
   END OF single-product.js
========================================================= */