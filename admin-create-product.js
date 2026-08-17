/* ⭐ Load & Save Helpers */
function loadData(key, fallback) {
  return JSON.parse(localStorage.getItem(key)) || fallback;
}
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ⭐ Load existing data */
let products = loadData("inventoryProducts", []);
let users = loadData("adminUsers", []);
let orders = loadData("adminOrders", []);
let payments = loadData("adminPayments", []);
let messages = loadData("adminMessages", []);

/* ⭐ Update sidebar counts */
function updateSidebarCounts() {
  document.getElementById("inventoryCount").innerText = products.length;
  document.getElementById("usersCount").innerText = users.length;
  document.getElementById("ordersCount").innerText = orders.length;
  document.getElementById("paymentCount").innerText = payments.length;
  document.getElementById("messagesCount").innerText = messages.length;
}

/* ⭐ Read product name from URL */
const params = new URLSearchParams(window.location.search);
const productNameFromURL = decodeURIComponent(params.get("id"));

/* ⭐ Find product */
const product = products.find(p => p.name === productNameFromURL);

/* ⭐ Load product into form */
if (!product) {
  document.getElementById("productName").innerText = "Product Not Found";
} else {
  document.getElementById("productName").innerText = product.name;
  document.getElementById("nameInput").value = product.name;
  document.getElementById("priceInput").value = product.price;
  document.getElementById("stockInput").value = product.stock;
  document.getElementById("descInput").value = product.description || "";

  /* Stripe */
  document.getElementById("stripeProductId").value = product.stripeProductId || "";
  document.getElementById("stripePaymentLink").value = product.stripePaymentLink || "";

  /* Images */
  const preview = document.getElementById("imagePreview");

  if (product.imageUrls) {
    product.imageUrls.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      preview.appendChild(img);
    });
  }

  if (product.uploadedImages) {
    product.uploadedImages.forEach(base64 => {
      const img = document.createElement("img");
      img.src = base64;
      preview.appendChild(img);
    });
  }

  /* ⭐ Load Visibility */
  if (product.visibility) {
    document.getElementById("vp_index").checked = product.visibility.index;
    document.getElementById("vp_fashion").checked = product.visibility.fashion;
    document.getElementById("vp_sports").checked = product.visibility.sports;
    document.getElementById("vp_toys").checked = product.visibility.toys;
    document.getElementById("vp_accessories").checked = product.visibility.accessories;
    document.getElementById("vp_electronics").checked = product.visibility.electronics;
    document.getElementById("vp_automotive").checked = product.visibility.automotive;
    document.getElementById("vp_appliance").checked = product.visibility.appliance;
    document.getElementById("vp_bestseller").checked = product.visibility.bestseller;
    document.getElementById("vp_trending").checked = product.visibility.trending;
  }

  /* ⭐ Load Recommend */
  if (product.recommend) {
    document.getElementById("rp_index").checked = product.recommend.index;
    document.getElementById("rp_fashion").checked = product.recommend.fashion;
    document.getElementById("rp_sports").checked = product.recommend.sports;
    document.getElementById("rp_toys").checked = product.recommend.toys;
    document.getElementById("rp_accessories").checked = product.recommend.accessories;
    document.getElementById("rp_electronics").checked = product.recommend.electronics;
    document.getElementById("rp_automotive").checked = product.recommend.automotive;
    document.getElementById("rp_appliance").checked = product.recommend.appliance;
    document.getElementById("rp_bestseller").checked = product.recommend.bestseller;
    document.getElementById("rp_trending").checked = product.recommend.trending;
  }
}

/* ⭐ Convert uploaded images to Base64 */
function convertImagesToBase64(files) {
  return new Promise(resolve => {
    const images = [];
    let processed = 0;

    if (files.length === 0) resolve(images);

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        images.push(reader.result);
        processed++;
        if (processed === files.length) resolve(images);
      };
      reader.readAsDataURL(file);
    });
  });
}

/* ⭐ Save Product */
async function saveProduct() {
  if (!product) {
    alert("Product not found.");
    return;
  }

  /* Update fields */
  product.name = document.getElementById("nameInput").value;
  product.price = document.getElementById("priceInput").value;
  product.stock = document.getElementById("stockInput").value;
  product.description = document.getElementById("descInput").value;

  /* Stripe */
  product.stripeProductId = document.getElementById("stripeProductId").value;
  product.stripePaymentLink = document.getElementById("stripePaymentLink").value;

  /* Images */
  const newUploadedImages = await convertImagesToBase64(
    document.getElementById("uploadImages").files
  );

  if (!product.uploadedImages) product.uploadedImages = [];
  product.uploadedImages = product.uploadedImages.concat(newUploadedImages);

  /* ⭐ Save Visibility (LEFT COLUMN) */
  product.visibility = {
    index: document.getElementById("vp_index").checked,
    fashion: document.getElementById("vp_fashion").checked,
    sports: document.getElementById("vp_sports").checked,
    toys: document.getElementById("vp_toys").checked,
    accessories: document.getElementById("vp_accessories").checked,
    electronics: document.getElementById("vp_electronics").checked,
    automotive: document.getElementById("vp_automotive").checked,
    appliance: document.getElementById("vp_appliance").checked,
    bestseller: document.getElementById("vp_bestseller").checked,
    trending: document.getElementById("vp_trending").checked
  };

  /* ⭐ Save Recommend (RIGHT COLUMN) */
  product.recommend = {
    index: document.getElementById("rp_index").checked,
    fashion: document.getElementById("rp_fashion").checked,
    sports: document.getElementById("rp_sports").checked,
    toys: document.getElementById("rp_toys").checked,
    accessories: document.getElementById("rp_accessories").checked,
    electronics: document.getElementById("rp_electronics").checked,
    automotive: document.getElementById("rp_automotive").checked,
    appliance: document.getElementById("rp_appliance").checked,
    bestseller: document.getElementById("rp_bestseller").checked,
    trending: document.getElementById("rp_trending").checked
  };

  /* ⭐ Save to localStorage */
  saveData("inventoryProducts", products);
  updateSidebarCounts();

  alert("Product updated successfully!");
}

/* ⭐ Back button */
function goBack() {
  window.location.href = "../admin-inventory.html";
}

/* ⭐ Initial load */
updateSidebarCounts();
