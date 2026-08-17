/* ⭐ Generate Automatic ID */
function generateId() {
  return crypto.randomUUID();
}

/* ⭐ Create Product Button */
function createProduct() {
  window.location.href = "create/admin-create-product.html";
}

/* ⭐ Load & Save */
function loadData(key, fallback) {
  return JSON.parse(localStorage.getItem(key)) || fallback;
}
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ⭐ REAL PRODUCT LIST — EXACTLY 40 PRODUCTS */
let products = [
  /* INDEX */
  { id: "wflJPiAgvEizvZGIXHq7", name: "Pink Crop Top", price: 22, stock: 60 },
  { id: "dg5QeaJyOWlpLsL6SUJX", name: "Yoga Mat Pro", price: 29, stock: 80 },
  { id: "dxuw6gQS8QXIvQCzP4X5", name: "Adjustable Dumbbell Set", price: 89, stock: 15 },
  { id: "ciaXxGcs7qVEXKsSgEqV", name: "Wooden Building Blocks", price: 59, stock: 25 },

  /* FASHION */
  { id: "B9lfflcrEtvqqY6KgQ0v", name: "Classic White T-Shirt", price: 45, stock: 50 },
  { id: "dzKMrLKP7PuF6KQkE0Hx", name: "Black Oversized Hoodie", price: 39, stock: 40 },
  { id: "dS8x2EONo6GswrWP7f7j", name: "Slim Fit Blue Jeans", price: 49, stock: 30 },
  { id: "wflJPiAgvEizvZGIXHq7", name: "Pink Crop Top", price: 22, stock: 60 },

  /* SPORTS */
  { id: "dg5QeaJyOWlpLsL6SUJX", name: "Yoga Mat Pro", price: 29, stock: 80 },
  { id: "dxuw6gQS8QXIvQCzP4X5", name: "Adjustable Dumbbell Set", price: 89, stock: 15 },
  { id: "ciaXxGcs7qVEXKsSgEqV", name: "Wooden Building Blocks", price: 59, stock: 25 },
  { id: "dg5QeaJyOWlpLsL6SUJX2", name: "Resistance Band Set", price: 19, stock: 70 },

  /* TOYS */
  { id: "Q9xLm2VaRw8NkJpT5HsC", name: "Classic White T-Shirt", price: 19, stock: 50 },
  { id: "eF4YzMp7QnKu1XdRaB8L", name: "Black Oversized Hoodie", price: 39, stock: 40 },
  { id: "Tj6HvWq2NsXe9PmLcR5A", name: "Slim Fit Blue Jeans", price: 49, stock: 30 },
  { id: "bK3ZrUt8FyQmWp1JnV7D", name: "Leather Crossbody Bag", price: 45, stock: 20 },

  /* ACCESSORIES */
  { id: "Nk6T74BpXqMr9LyVs1Hd", name: "TurboBlend Mixer", price: 41, stock: 50 },
  { id: "Yu1M63KzQpNx8TfRv4Lc", name: "FreshLock Storage Box", price: 33, stock: 40 },
  { id: "Qd3L58ZmAwKp6XnRt7Fy", name: "Slim Fit Blue Jeans", price: 49, stock: 30 },
  { id: "Ax7Q19LmVtNc5RzHp3Kw", name: "VoltMax Charging Dock", price: 55, stock: 20 },

  /* BEST SELLER */
  { id: "Rp7ZaXmL4QvTyNkH8WsF", name: "AirFlow Mini Fan", price: 19, stock: 80 },
  { id: "Ta8QmLpX5RvZnKyW3HsF", name: "BrightBeam Desk Lamp", price: 39, stock: 50 },
  { id: "mK9VrXtQ2LpNzWaH7YbJ", name: "EcoFresh Lunch Box", price: 49, stock: 40 },
  { id: "XnQ7LpZaT4VmRwK8HyFc", name: "UltraCharge Power Bank", price: 45, stock: 45 },

  /* APPLIANCES */
  { id: "Kr8X21VmQpLs7NaTf4Hy", name: "PureMist Humidifier", price: 63, stock: 60 },
  { id: "wD5J93AcYuRn2PkMz8Gb", name: "TerraBlend Blender", price: 99, stock: 20 },
  { id: "Ht1Q64ZvWxKe9LmCs7Np", name: "AeroPulse Wireless Earbuds", price: 48, stock: 70 },
  { id: "Pf7M30RyQaXu5JnTk2Vs", name: "SwiftCharge Power Bank", price: 45, stock: 90 }
];

/* ⭐ Save to LocalStorage */
saveData("inventoryProducts", products);

/* ⭐ Load other admin data */
let users = loadData("adminUsers", []);
let orders = loadData("adminOrders", []);
let payments = loadData("adminPayments", []);
let messages = loadData("adminMessages", []);

/* ⭐ Update Sidebar Counts */
function updateSidebarCounts() {
  document.getElementById("inventoryCount").innerText = products.length;
  document.getElementById("usersCount").innerText = users.length;
  document.getElementById("ordersCount").innerText = orders.length;
  document.getElementById("paymentCount").innerText = payments.length;
  document.getElementById("messagesCount").innerText = messages.length;
}

/* ⭐ Render Products */
function renderProducts(list) {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <h3>${p.name}</h3>
      <p><strong>Price:</strong> €${p.price}</p>
      <p><strong>Stock:</strong> ${p.stock}</p>
      <p><strong>Product ID:</strong> ${p.id}</p>

      <button class="edit-btn" onclick="editProduct('${p.id}')">Edit Product</button>
      <button class="delete-btn" onclick="deleteProduct('${p.id}')">Delete</button>
    `;
    container.appendChild(card);
  });
}

/* ⭐ Edit Product */
function editProduct(id) {
  window.location.href = `edit/admin-edit-product.html?id=${id}`;
}

/* ⭐ Delete Product */
function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveData("inventoryProducts", products);
  renderProducts(products);
  updateSidebarCounts();
}

/* ⭐ Search */
function searchProducts() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = products.filter(p => p.name.toLowerCase().includes(term));
  renderProducts(filtered);
}

/* ⭐ Initial Load */
renderProducts(products);
updateSidebarCounts();
