const recipes = {
  "🍅+🥬": "🥗",
  "🌾+🍅": "🍕",
  "🌾+🍄": "🍜",
  "🌾+🌾": "🍞",
  "🍅+🧅": "🍝",
  "🥕+🥔": "🍛",
  "🌽+🧄": "🌮",
  "🥕+🧄": "🌯",
  "🥔+🧅": "🥧",
  "🥬+🧅": "🍜",
  "🥕+🧅": "🥘"
};

const allHarvestEmojis = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄", "🍄", "🌾", "🧅"];

const MAX_COUNT = 10;

const DURATION_REDUCTION_KEY = "nextDurationReduction";
const HARVEST_TARGET_SECONDS_KEY = "harvestTargetSeconds";
const dishValues = {
  "🥗": 3,
  "🍕": 5,
  "🍜": 6,
  "🍞": 2,
  "🍝": 5,
  "🍛": 4,
  "🌮": 6,
  "🌯": 6,
  "🥘": 4,
  "🥧": 3
};

function craft(a, b) {
  const key = [a, b].sort().join("+");
  return recipes[key] || "❓";
}

function getNextDurationReduction() {
  const stored = localStorage.getItem(DURATION_REDUCTION_KEY);
  return stored ? Number(stored) : 0;
}

function clearNextDurationReduction() {
  localStorage.removeItem(DURATION_REDUCTION_KEY);
}

let harvestStats = {};
let cookedDishes = {};
let currentTargetSeconds = MAX_COUNT;

let ingredient1, ingredient2, cookButton, eatButton, dishSelect, cookResult, eatStatus, inventoryContainer;

function getStoredHarvestStats() {
  const stored = localStorage.getItem("harvestCount_stats");
  return stored ? JSON.parse(stored) : {};
}

function saveHarvestStats() {
  localStorage.setItem("harvestCount_stats", JSON.stringify(harvestStats));
}

function saveState() {
  localStorage.setItem("harvestCount_stats", JSON.stringify(harvestStats));
  localStorage.setItem("cookedDishes", JSON.stringify(cookedDishes));
  localStorage.setItem(HARVEST_TARGET_SECONDS_KEY, String(currentTargetSeconds));
}

function getStoredCookedDishes() {
  const stored = localStorage.getItem("cookedDishes");
  return stored ? JSON.parse(stored) : {};
}

function saveCookedDishes() {
  localStorage.setItem("cookedDishes", JSON.stringify(cookedDishes));
}

function renderCookedDishes() {
  const dishesContainer = document.getElementById("dishesContainer");
  if (!dishesContainer) return;

  const dishSelect = document.getElementById("dishSelect");
  if (dishSelect) {
    dishSelect.innerHTML = "";
  }

  console.log("Rendering cooked dishes:", cookedDishes);
  if (Object.keys(cookedDishes).length === 0) {
    dishesContainer.innerHTML = "<p>まだ料理がありません。</p>";
    if (dishSelect) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "なし";
      dishSelect.appendChild(emptyOption);
    }
    return;
  }

  dishesContainer.innerHTML = "";
  for (const dish in cookedDishes) {
    const count = cookedDishes[dish];
    const line = document.createElement("p");
    const power = dishValues[dish] || 0;
    line.textContent = `${dish} × ${count} (効果: ${power}秒短縮)`;
    dishesContainer.appendChild(line);

    if (dishSelect) {
      const option = document.createElement("option");
      option.value = dish;
      option.textContent = `${dish} × ${count}`;
      dishSelect.appendChild(option);
    }
  }
  console.log("Dish select options:", dishSelect ? dishSelect.innerHTML : "dishSelect not found");
}

function recordCookedDish(dish) {
  if (!cookedDishes[dish]) {
    cookedDishes[dish] = 0;
  }
  cookedDishes[dish]++;
  saveCookedDishes();
}

function showEatStatus(message) {
  if (!eatStatus) return;
  eatStatus.textContent = message;
}

function eatDish() {
  const dish = dishSelect ? dishSelect.value : "";
  if (!dish || !cookedDishes[dish]) {
    showEatStatus("食べる料理を選択してください。");
    return;
  }

  const value = dishValues[dish] || 0;
  cookedDishes[dish]--;
  if (cookedDishes[dish] <= 0) {
    delete cookedDishes[dish];
  }

  saveCookedDishes();
  renderCookedDishes();

  if (value > 0) {
    localStorage.setItem(DURATION_REDUCTION_KEY, String(value));
    showEatStatus(`食べた！次の1回のみ ${value} 秒短縮されます。`);
  } else {
    showEatStatus("食べた！効果はありませんでした。");
  }
}

function normalizeRecipeKey(itemA, itemB) {
  return [itemA, itemB].sort().join("+");
}

function renderInventory() {
  if (!inventoryContainer) return;

  inventoryContainer.innerHTML = "";
  const sortedEmojis = [...allHarvestEmojis];

  sortedEmojis.forEach((emoji) => {
    const count = harvestStats[emoji] || 0;
    const line = document.createElement("p");
    line.textContent = `${emoji} × ${count}`;
    inventoryContainer.appendChild(line);
  });
}

function populateIngredientSelects() {
  if (!ingredient1 || !ingredient2) return;

  console.log("Populating ingredient selects with available emojis");
  const availableEmojis = allHarvestEmojis.filter(emoji => (harvestStats[emoji] || 0) > 0);
  console.log("Available emojis:", availableEmojis);
  
  const optionsHTML = availableEmojis.map(emoji => `<option value="${emoji}">${emoji}</option>`).join('');

  ingredient1.innerHTML = optionsHTML;
  ingredient2.innerHTML = optionsHTML;
  console.log("Ingredient1 options:", ingredient1.innerHTML);
  console.log("Ingredient2 options:", ingredient2.innerHTML);
}

function showCookResult(message, emoji = "") {
  if (emoji) {
    cookResult.textContent = `${message} ${emoji}`;
  } else {
    cookResult.textContent = message;
  }
}

function cook() {
  const itemA = ingredient1.value;
  const itemB = ingredient2.value;
  const countA = harvestStats[itemA] || 0;
  const countB = harvestStats[itemB] || 0;

  if (itemA === itemB && countA < 2) {
    showCookResult("失敗！");
    return;
  }

  if (itemA !== itemB && (countA < 1 || countB < 1)) {
    showCookResult("失敗！");
    return;
  }

  const result = craft(itemA, itemB);

  if (result === "❓") {
    showCookResult("失敗！");
    return;
  }

  harvestStats[itemA] = countA - 1;
  harvestStats[itemB] = countB - 1;

  if (harvestStats[itemA] <= 0) {
    delete harvestStats[itemA];
  }
  if (harvestStats[itemB] <= 0) {
    delete harvestStats[itemB];
  }

  saveHarvestStats();
  recordCookedDish(result);
  renderInventory();
  renderCookedDishes();
  showCookResult("できあがり！", result);
}

function initializeCookingPage() {
  console.log("Initializing cooking page");
  ingredient1 = document.getElementById("ingredient1");
  ingredient2 = document.getElementById("ingredient2");
  cookButton = document.getElementById("cookButton");
  eatButton = document.getElementById("eatButton");
  dishSelect = document.getElementById("dishSelect");
  cookResult = document.getElementById("cookResult");
  eatStatus = document.getElementById("eatStatus");
  inventoryContainer = document.getElementById("inventoryContainer");

  console.log("Elements found:", { ingredient1, ingredient2, dishSelect });
  harvestStats = getStoredHarvestStats();
  cookedDishes = getStoredCookedDishes();
  console.log("Loaded data:", { harvestStats, cookedDishes });
  populateIngredientSelects();
  renderInventory();
  renderCookedDishes();
  cookButton.addEventListener("click", cook);
  if (eatButton) {
    eatButton.addEventListener("click", eatDish);
  }
}

window.addEventListener("DOMContentLoaded", initializeCookingPage);
