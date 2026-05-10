const vegetables = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄️", "🍄", "🌾", "🧅"];
const seedPriceValues = {
  "🥕": 1,
  "🌽": 2,
  "🥬": 3,
  "🍅": 4,
  "🥔": 5,
  "🧄️": 6,
  "🍄": 9,
  "🌾": 8,
  "🧅": 7
};

function getStoredSeedInventory() {
  const stored = localStorage.getItem("seedInventory");
  return stored ? JSON.parse(stored) : {};
}

function saveSeedInventory(inventory) {
  localStorage.setItem("seedInventory", JSON.stringify(inventory));
}

function renderSeedPurchaseList() {
  const container = document.getElementById("seedPurchaseContainer");
  if (!container) return;

  container.innerHTML = vegetables.map((emoji) => {
    const value = (seedPriceValues[emoji] || 1) * 10;
    return `
      <div class="sell-row buy-row" data-name="${emoji}">
        <label>
          <input type="checkbox" class="buy-checkbox" />
          ${emoji} のたね (価格 ${value}コイン)
        </label>
        <input type="number" class="buy-quantity" min="1" value="1" />
      </div>
    `;
  }).join("");
}

function subtractCoins(amount) {
  const current = window.getStoredCoins ? window.getStoredCoins() : Number(localStorage.getItem("coinTotal") || 0);
  if (current < amount) {
    return null;
  }
  const next = current - amount;
  localStorage.setItem("coinTotal", String(next));
  if (window.updateCoinUI) {
    window.updateCoinUI();
  }
  return next;
}

function purchaseSeeds() {
  const rows = Array.from(document.querySelectorAll(".buy-row"));
  const inventory = getStoredSeedInventory();
  let totalCost = 0;
  const purchases = [];

  rows.forEach((row) => {
    const checkbox = row.querySelector(".buy-checkbox");
    const quantityInput = row.querySelector(".buy-quantity");
    if (!checkbox.checked) return;

    const quantity = Math.max(1, Number(quantityInput.value));
    const name = row.dataset.name;
    const cost = (seedPriceValues[name] || 1) * 10 * quantity;
    totalCost += cost;
    purchases.push({ name, quantity });
  });

  const status = document.getElementById("buyStatus");
  if (!status) return;

  if (totalCost <= 0) {
    status.textContent = "購入するたねを選択してください。";
    return;
  }

  const remaining = subtractCoins(totalCost);
  if (remaining === null) {
    status.textContent = "コインが足りません。";
    return;
  }

  purchases.forEach((purchase) => {
    inventory[purchase.name] = (inventory[purchase.name] || 0) + purchase.quantity;
  });
  saveSeedInventory(inventory);
  renderSeedPurchaseList();
  status.textContent = `${totalCost}コインで購入しました。`;
}

function initializePurchasePage() {
  renderSeedPurchaseList();
  const buyButton = document.getElementById("buyButton");
  if (buyButton) {
    buyButton.addEventListener("click", purchaseSeeds);
  }
}

window.addEventListener("DOMContentLoaded", initializePurchasePage);
