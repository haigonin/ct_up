const ADVENTURE_ITEMS_KEY = "adventureItems";
const COOKED_DISHES_KEY = "cookedDishes";
const harvestEmojis = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄️", "🍄", "🌾", "🧅"];
const dishValues = {
  "🥗": 3,
  "🍕": 5,
  "🍜": 6,
  "🍞": 2,
  "🍝": 5,
  "🍛": 4,
  "🌮": 5,
  "🌯": 5,
  "🥘": 4,
  "🥧": 3
};

function getStoredAdventureItems() {
  const stored = localStorage.getItem(ADVENTURE_ITEMS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveAdventureItems(items) {
  localStorage.setItem(ADVENTURE_ITEMS_KEY, JSON.stringify(items));
}

function getStoredCookedDishes() {
  const stored = localStorage.getItem(COOKED_DISHES_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveCookedDishes(dishes) {
  localStorage.setItem(COOKED_DISHES_KEY, JSON.stringify(dishes));
}

function getStoredCoins() {
  if (window.getStoredCoins && window.getStoredCoins !== getStoredCoins) {
    return window.getStoredCoins();
  }
  const stored = localStorage.getItem("coinTotal");
  return stored ? Number(stored) : 0;
}

function addCoinsToWallet(amount) {
  if (window.addCoins && window.addCoins !== addCoinsToWallet) {
    return window.addCoins(amount);
  }
  const total = getStoredCoins() + amount;
  localStorage.setItem("coinTotal", String(total));
  if (window.updateCoinUI) {
    window.updateCoinUI();
  }
  return total;
}

function groupAdventureItems(items) {
  const groups = {};
  items.forEach((item) => {
    const key = `${item.name}|${item.power}`;
    if (!groups[key]) {
      groups[key] = { name: item.name, power: item.power, count: 0 };
    }
    groups[key].count++;
  });
  return Object.values(groups);
}

function renderAdventureSellList() {
  const container = document.getElementById("adventureSellContainer");
  if (!container) return;

  const items = getStoredAdventureItems().filter(item => !harvestEmojis.includes(item.name));
  if (items.length === 0) {
    container.innerHTML = "<p class='no-stats'>冒険で獲得したアイテムはありません。</p>";
    return;
  }

  const groups = groupAdventureItems(items);
  container.innerHTML = groups.map((group) => {
    const value = group.power * 50;
    return `
      <div class="sell-row sell-adventure-row" data-name="${group.name}" data-power="${group.power}" data-count="${group.count}">
        <label>
          <input type="checkbox" class="sell-checkbox" />
          ${group.name} × ${group.count} (1個 ${value}コイン)
        </label>
        <input type="number" class="sell-quantity" min="1" max="${group.count}" value="${group.count}" />
      </div>
    `;
  }).join("");
}

function renderDishSellList() {
  const container = document.getElementById("dishSellContainer");
  if (!container) return;

  const dishes = getStoredCookedDishes();
  const keys = Object.keys(dishes);
  if (keys.length === 0) {
    container.innerHTML = "<p class='no-stats'>売却できる料理がありません。</p>";
    return;
  }

  container.innerHTML = keys.map((dish) => {
    const count = dishes[dish];
    const value = (dishValues[dish] || 0) * 5;
    return `
      <div class="sell-row sell-dish-row" data-name="${dish}" data-count="${count}">
        <label>
          <input type="checkbox" class="sell-checkbox" />
          ${dish} × ${count} (1個${value}コイン)
        </label>
        <input type="number" class="sell-quantity" min="1" max="${count}" value="${count}" />
      </div>
    `;
  }).join("");
}

function removeAdventureItems(name, power, quantity) {
  const items = getStoredAdventureItems();
  let remaining = quantity;
  const newItems = [];
  items.forEach((item) => {
    if (remaining > 0 && item.name === name && item.power === power) {
      remaining -= 1;
      return;
    }
    newItems.push(item);
  });
  saveAdventureItems(newItems);
}

function removeCookedDish(name, quantity) {
  const dishes = getStoredCookedDishes();
  const current = dishes[name] || 0;
  const next = Math.max(0, current - quantity);
  if (next <= 0) {
    delete dishes[name];
  } else {
    dishes[name] = next;
  }
  saveCookedDishes(dishes);
}

function sellSelectedItems() {
  const adventureRows = Array.from(document.querySelectorAll(".sell-adventure-row"));
  const dishRows = Array.from(document.querySelectorAll(".sell-dish-row"));
  let totalCoins = 0;

  adventureRows.forEach((row) => {
    const checkbox = row.querySelector(".sell-checkbox");
    const quantityInput = row.querySelector(".sell-quantity");
    if (!checkbox.checked) return;

    const quantity = Math.min(Number(quantityInput.value), Number(row.dataset.count));
    if (quantity <= 0) return;
    const power = Number(row.dataset.power);
    totalCoins += power * 50 * quantity;
    removeAdventureItems(row.dataset.name, power, quantity);
  });

  dishRows.forEach((row) => {
    const checkbox = row.querySelector(".sell-checkbox");
    const quantityInput = row.querySelector(".sell-quantity");
    if (!checkbox.checked) return;

    const quantity = Math.min(Number(quantityInput.value), Number(row.dataset.count));
    if (quantity <= 0) return;
    const value = (dishValues[row.dataset.name] || 0) * 5;
    totalCoins += value * quantity;
    removeCookedDish(row.dataset.name, quantity);
  });

  const status = document.getElementById("sellStatus");
  if (!status) return;

  if (totalCoins <= 0) {
    status.textContent = "売却するアイテムと個数を選択してください。";
    return;
  }

  const newTotal = addCoinsToWallet(totalCoins);
  status.textContent = `売却完了！${totalCoins}コインを獲得しました。（合計: ${newTotal}コイン）`;
  renderAdventureSellList();
  renderDishSellList();
}

function initializeSellPage() {
  const sellButton = document.getElementById("sellButton");
  if (sellButton) {
    sellButton.addEventListener("click", sellSelectedItems);
  }
  renderAdventureSellList();
  renderDishSellList();
}

window.addEventListener("DOMContentLoaded", initializeSellPage);
