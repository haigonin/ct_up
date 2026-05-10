const prefixList = [
  { label: "鋼の", value: 4 },
  { label: "炎の", value: 3 },
  { label: "風の", value: 3 },
  { label: "水の", value: 2 },
  { label: "光の", value: 6 }, 
  { label: "闇の", value: 6 },
  { label: "いにしえの", value: 0 },
  { label: "氷の", value: 3 },
  { label: "ガラスの", value: 1 },
  { label: "泥まみれの", value: 0 },
  { label: "木製の", value: 2 }
];

const suffixList = [
  { label: "剣", value: 3 },
  { label: "盾", value: 2 },
  { label: "矢", value: 2 },
  { label: "鎧", value: 4 },
  { label: "杖", value: 5 },
  { label: "指輪", value: 2 },
  { label: "小瓶", value: 3 },
  { label: "木の棒", value: 1 },
  { label: "魔法花", value: 1 },
  { label: "小手", value: 1 },
  { label: "猫じゃらし", value: 1 }
];

const harvestEmojiList = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄️", "🍄", "🌾", "🧅"];

const DURATION_REDUCTION_KEY = "nextDurationReduction";
const ADVENTURE_START_KEY = "adventureStartTime";
const ADVENTURE_RUNNING_KEY = "adventureIsRunning";
const ADVENTURE_TARGET_SECONDS_KEY = "adventureTargetSeconds";

let adventureButton, adventureResult, adventureInventory, adventureProgress, adventureCountSpan;

let adventureItems = [];
let timerId = null;
let startTime = null;
let currentTargetSeconds = 10;
let isRunning = false;

function getStoredAdventureItems() {
  const stored = localStorage.getItem("adventureItems");
  return stored ? JSON.parse(stored) : [];
}

function saveAdventureItems() {
  localStorage.setItem("adventureItems", JSON.stringify(adventureItems));
}

function getStoredAdventureState() {
  const storedStart = localStorage.getItem(ADVENTURE_START_KEY);
  const storedRunning = localStorage.getItem(ADVENTURE_RUNNING_KEY);
  const storedTarget = localStorage.getItem(ADVENTURE_TARGET_SECONDS_KEY);

  startTime = storedStart ? Number(storedStart) : null;
  isRunning = storedRunning === "true";
  currentTargetSeconds = storedTarget ? Number(storedTarget) : 10;
}

function saveAdventureState() {
  localStorage.setItem(ADVENTURE_START_KEY, String(startTime));
  localStorage.setItem(ADVENTURE_RUNNING_KEY, String(isRunning));
  localStorage.setItem(ADVENTURE_TARGET_SECONDS_KEY, String(currentTargetSeconds));
}

function getDurationReduction() {
  const stored = localStorage.getItem(DURATION_REDUCTION_KEY);
  return stored ? Number(stored) : 0;
}

function clearDurationReduction() {
  localStorage.removeItem(DURATION_REDUCTION_KEY);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function renderAdventureItems() {
  if (!adventureInventory) return;

  // 野菜以外のアイテムのみを表示
  const nonVegetableItems = adventureItems.filter(item => !harvestEmojiList.includes(item.name));

  if (nonVegetableItems.length === 0) {
    adventureInventory.innerHTML = "<p>まだ冒険で獲得したアイテムがありません。</p>";
    return;
  }

  const itemMap = {};
  nonVegetableItems.forEach((item) => {
    if (!itemMap[item.name]) {
      itemMap[item.name] = { count: 0, power: item.power };
    }
    itemMap[item.name].count++;
  });

  adventureInventory.innerHTML = "";
  for (const name in itemMap) {
    const entry = itemMap[name];
    const line = document.createElement("p");
    line.textContent = `${name} × ${entry.count}`;
    adventureInventory.appendChild(line);
  }
}

function showAdventureResult(message) {
  adventureResult.textContent = message;
}

function updateAdventureUI(count) {
  adventureProgress.value = count * 10;
  adventureCountSpan.textContent = count.toString();
}

function completeAdventure() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  saveAdventureState();

  // ランダムに野菜またはアイテムを獲得
  let itemName, itemPower, itemCount = 1;
  if (Math.random() < 0.3) {
    // 30%の確率で野菜を獲得
    itemName = pickRandom(harvestEmojiList);
    itemPower = 0;

    // 野菜は harvestStats に加算する
    const harvestStats = JSON.parse(localStorage.getItem("harvestCount_stats") || "{}");
    harvestStats[itemName] = (harvestStats[itemName] || 0) + 1;
    localStorage.setItem("harvestCount_stats", JSON.stringify(harvestStats));
  } else {
    // 70%の確率でアイテムを獲得
    const prefix = pickRandom(prefixList);
    const suffix = pickRandom(suffixList);
    itemName = `${prefix.label}${suffix.label}`;
    itemPower = prefix.value + suffix.value;

    // 2%の確率で2個獲得
    if (Math.random() < 0.02) {
      itemCount = 2;
    }

    // アイテムは adventureItems に加算する
    for (let i = 0; i < itemCount; i++) {
      adventureItems.push({ name: itemName, power: itemPower });
    }
    saveAdventureItems();
  }

  renderAdventureItems();
  const countText = itemCount > 1 ? ` × ${itemCount}` : "";
  showAdventureResult(`${itemName}${countText} を手に入れた！`);
  adventureButton.disabled = false;
}

function restoreAdventureFromTime() {
  if (!isRunning || startTime === null) return;

  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const count = Math.min(Math.floor(elapsedSeconds * 10 / currentTargetSeconds), 10);
  updateAdventureUI(count);

  if (count >= 10) {
    completeAdventure();
  }
}

function onAdventureTick() {
  if (!startTime) return;
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const count = Math.min(Math.floor(elapsedSeconds * 10 / currentTargetSeconds), 10);
  updateAdventureUI(count);

  if (count >= 10) {
    completeAdventure();
  }
}

function startAdventure() {
  if (timerId !== null) {
    return;
  }

  const reduction = getDurationReduction();
  if (reduction > 0) {
    currentTargetSeconds = Math.max(1, 10 - reduction);
    clearDurationReduction();
  } else {
    currentTargetSeconds = 10;
  }

  startTime = Date.now();
  isRunning = true;
  saveAdventureState();

  updateAdventureUI(0);
  showAdventureResult("冒険中...");
  adventureButton.disabled = true;
  timerId = setInterval(onAdventureTick, 250);
}

function initializeAdventurePage() {
  adventureButton = document.getElementById("adventureButton");
  adventureResult = document.getElementById("adventureResult");
  adventureInventory = document.getElementById("adventureInventory");
  adventureProgress = document.getElementById("adventureProgress");
  adventureCountSpan = document.getElementById("adventureCount");

  adventureItems = getStoredAdventureItems();
  getStoredAdventureState();
  renderAdventureItems();
  updateAdventureUI(0);
  showAdventureResult("");
  if (isRunning) {
    restoreAdventureFromTime();
    if (isRunning) {
      adventureButton.disabled = true;
      timerId = setInterval(onAdventureTick, 250);
    }
  }
  adventureButton.addEventListener("click", startAdventure);
}

window.addEventListener("DOMContentLoaded", initializeAdventurePage);
