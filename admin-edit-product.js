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

/* ⭐ Read product ID from URL */
const params = new URLSearchParams(window.location.search);
const productIdFromURL = params.get("id");

/* ⭐ Find product by REAL ID */
let product = products.find(p => p.id === productIdFromURL);

/* ⭐ Load product */
if (product) {
  document.getElementById("productIdInput").value = product.id;
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

  /* Visibility */
  if (product.visibility) {
    document.getElementById("vp_index").checked = product.visibility.index;
    document.getElementById("vp_fashion").checked = product.visibility.fashion;
    document.getElementById("vp_sports").checked = product.visibility.sports;
    document.getElementById("vp_toys").checked = product.visibility.toys;
    document.getElementById("vp_accessories").checked = product.visibility.accessories;
    document.getElementById("vp_electronics").checked = product.visibility.electronics;
    document.getElementById("vp_automotive").checked = product.visibility.automotive;
    document.getElementById("vp_appliances").checked = product.visibility.appliances;
    document.getElementById("vp_bestseller").checked = product.visibility.bestseller;
    document.getElementById("vp_trending").checked = product.visibility.trending;
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

/* ⭐ Generate automatic ID */
function generateId() {
  return crypto.randomUUID();
}

/* ⭐ Save Product */
async function saveProduct() {
  if (!product) {
    alert("Product not found.");
    return;
  }

  /* Update fields */
  product.id = document.getElementById("productIdInput").value;
  product.name = document.getElementById("nameInput").value;
  product.price = document.getElementById("priceInput").value;
  product.stock = document.getElementById("stockInput").value;
  product.description = document.getElementById("descInput").value;

  /* Stripe */
  product.stripeProductId = document.getElementById("stripeProductId").value;
  product.stripePaymentLink = document.getElementById("stripePaymentLink").value;

  /* Images */
  const newUploadedImages = await convertImagesToBase64(document.getElementById("uploadImages").files);

  if (!product.uploadedImages) product.uploadedImages = [];
  product.uploadedImages = product.uploadedImages.concat(newUploadedImages);

  /* Visibility */
  product.visibility = {
    index: document.getElementById("vp_index").checked,
    fashion: document.getElementById("vp_fashion").checked,
    sports: document.getElementById("vp_sports").checked,
    toys: document.getElementById("vp_toys").checked,
    accessories: document.getElementById("vp_accessories").checked,
    electronics: document.getElementById("vp_electronics").checked,
    automotive: document.getElementById("vp_automotive").checked,
    appliances: document.getElementById("vp_appliances").checked,
    bestseller: document.getElementById("vp_bestseller").checked,
    trending: document.getElementById("vp_trending").checked
  };

  /* Save */
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
