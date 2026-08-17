// ===============================
// ADMIN INVENTORY STORAGE SYSTEM
// ===============================

// LocalStorage key
const INVENTORY_KEY = "aravon_inventory_storage";

// -----------------------------------------------
// Load inventory from localStorage
// -----------------------------------------------
export function getInventory() {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Error loading inventory:", err);
    return [];
  }
}

// -----------------------------------------------
// Save inventory to localStorage
// -----------------------------------------------
function saveInventory(inventory) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (err) {
    console.error("Error saving inventory:", err);
  }
}

// -----------------------------------------------
// Add product to inventory (from product pages)
// -----------------------------------------------
export function addInventoryItem(product) {
  if (!product || !product.id) return;

  const inventory = getInventory();

  // Prevent duplicates
  const exists = inventory.some(item => item.id === product.id);
  if (exists) return;

  // Add new product
  inventory.push({
    id: product.id,
    name: product.name || "Unnamed Product",
    price: product.price || 0,
    gender: product.gender || "unknown",
    image: product.image || "",
    category: product.category || "unknown",
    stock: product.stock || 0,
    createdAt: Date.now()
  });

  saveInventory(inventory);
}

// -----------------------------------------------
// Update stock (admin only)
// -----------------------------------------------
export function updateStock(productId, newStock) {
  const inventory = getInventory();
  const item = inventory.find(p => p.id === productId);

  if (!item) return false;

  item.stock = Number(newStock);
  saveInventory(inventory);
  return true;
}

// -----------------------------------------------
// Delete product from inventory (admin only)
// -----------------------------------------------
export function deleteInventoryItem(productId) {
  let inventory = getInventory();
  inventory = inventory.filter(item => item.id !== productId);
  saveInventory(inventory);
}

// -----------------------------------------------
// Clear entire inventory (admin only)
// -----------------------------------------------
export function clearInventory() {
  localStorage.removeItem(INVENTORY_KEY);
}
