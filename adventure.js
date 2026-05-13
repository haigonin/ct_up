const prefixList = [
  { label: "鋼の", value: 4 },
  { label: "炎の", value: 3 },
  { label: "風の", value: 3 },
  { label: "水の", value: 2 },
  { label: "光の", value: 6 }, 
  { label: "闇の", value: 6 },
  { label: "いにしえの", value: 5 },
  { label: "氷の", value: 3 },
  { label: "ガラスの", value: 1 },
  { label: "木製の", value: 2 }
];

const suffixList = [
  { label: "剣", value: 3 },
  { label: "盾", value: 3 },
  { label: "矢", value: 2 },
  { label: "鎧", value: 4 },
  { label: "杖", value: 5 },
  { label: "指輪", value: 3 },
  { label: "小瓶", value: 4 },
  { label: "棒きれ", value: 1 },
  { label: "魔法花", value: 1 },
  { label: "小手", value: 2 },
  { label: "猫じゃらし", value: 1 }
];

const harvestEmojiList = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄️", "🍄", "🌾", "🧅"];

const ENCOUNTER_PREFIXES = [
  { label: "炎の", value: 4 },
  { label: "風の", value: 4 },
  { label: "水の", value: 3 },
  { label: "光の", value: 6 },
  { label: "闇の", value: 7 },
  { label: "氷の", value: 4 }
];

const MONSTER_LIST = [
  { name: "ゴブリン", value: 10 },
  { name: "オーク", value: 20 },
  { name: "スライム", value: 5 },
  { name: "ドラゴン", value: 100 },
  { name: "ゴーレム", value: 30  },
  { name: "デーモン", value: 50 }
];

const EQUIPMENT_CATEGORIES = {
  weapon: ["剣", "杖", "矢"],
  armor: ["盾", "鎧", "小手"],
  accessory: ["指輪", "小瓶", "木の棒", "猫じゃらし"]
};

const DURATION_REDUCTION_KEY = "nextDurationReduction";
const ADVENTURE_START_KEY = "adventureStartTime";
const ADVENTURE_RUNNING_KEY = "adventureIsRunning";
const ADVENTURE_TARGET_SECONDS_KEY = "adventureTargetSeconds";
const ADVENTURE_EQUIPMENT_KEY = "adventureEquipment";
const ADVENTURE_ENCOUNTER_LOG_KEY = "adventureEncounterLog";
const ADVENTURE_LAST_ENCOUNTER_KEY = "adventureLastEncounterSecond";

let adventureButton, adventureResult, adventureInventory, adventureProgress, adventureCountSpan;
let weaponSelect, armorSelect, accessorySelect, equipButton, strengthText, encounterLogContainer;

let adventureItems = [];
let adventureEquipment = { weapon: "", armor: "", accessory: "" };
let encounterLog = [];
let lastEncounterSecond = -1;
let timerId = null;
let startTime = null;
let currentTargetSeconds = 30;
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
  const storedEquipment = localStorage.getItem(ADVENTURE_EQUIPMENT_KEY);
  const storedLog = localStorage.getItem(ADVENTURE_ENCOUNTER_LOG_KEY);

  startTime = storedStart ? Number(storedStart) : null;
  isRunning = storedRunning === "true";
  currentTargetSeconds = storedTarget ? Number(storedTarget) : 30;
  adventureEquipment = storedEquipment ? JSON.parse(storedEquipment) : { weapon: "", armor: "", accessory: "" };
  encounterLog = storedLog ? JSON.parse(storedLog) : [];
  const storedLastEncounter = localStorage.getItem(ADVENTURE_LAST_ENCOUNTER_KEY);
  lastEncounterSecond = storedLastEncounter ? Number(storedLastEncounter) : -1;
}

function saveAdventureState() {
  localStorage.setItem(ADVENTURE_START_KEY, String(startTime));
  localStorage.setItem(ADVENTURE_RUNNING_KEY, String(isRunning));
  localStorage.setItem(ADVENTURE_TARGET_SECONDS_KEY, String(currentTargetSeconds));
  localStorage.setItem(ADVENTURE_EQUIPMENT_KEY, JSON.stringify(adventureEquipment));
  localStorage.setItem(ADVENTURE_ENCOUNTER_LOG_KEY, JSON.stringify(encounterLog));
  localStorage.setItem(ADVENTURE_LAST_ENCOUNTER_KEY, String(lastEncounterSecond));
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

function getUniqueItemsByCategory(category) {
  const suffixes = EQUIPMENT_CATEGORIES[category] || [];
  const seen = new Set();
  return adventureItems
    .filter((item) => suffixes.some((suffix) => item.name.includes(suffix)))
    .filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

function renderEquipmentOptions() {
  if (!weaponSelect || !armorSelect || !accessorySelect) return;

  const weaponItems = getUniqueItemsByCategory("weapon");
  const armorItems = getUniqueItemsByCategory("armor");
  const accessoryItems = getUniqueItemsByCategory("accessory");

  function renderOptions(select, items, selected) {
    const options = ["<option value=''>なし</option>"];
    items.forEach((item) => {
      options.push(`<option value="${item.name}">${item.name} (${item.power})</option>`);
    });
    select.innerHTML = options.join("");
    if (selected) {
      select.value = selected;
    }
  }

  renderOptions(weaponSelect, weaponItems, adventureEquipment.weapon);
  renderOptions(armorSelect, armorItems, adventureEquipment.armor);
  renderOptions(accessorySelect, accessoryItems, adventureEquipment.accessory);
  updateStrengthText();
}

function calculatePlayerStrength() {
  let strength = 0;
  const selected = [adventureEquipment.weapon, adventureEquipment.armor, adventureEquipment.accessory];
  selected.forEach((itemName) => {
    if (!itemName) return;
    const item = adventureItems.find((entry) => entry.name === itemName);
    if (item) strength += item.power;
  });
  return strength;
}

function updateStrengthText() {
  if (!strengthText) return;
  const strength = calculatePlayerStrength();
  strengthText.textContent = `強さ: ${strength}`;
}

function equipSelectedItems() {
  if (!weaponSelect || !armorSelect || !accessorySelect) return;
  adventureEquipment.weapon = weaponSelect.value;
  adventureEquipment.armor = armorSelect.value;
  adventureEquipment.accessory = accessorySelect.value;
  saveAdventureState();
  updateStrengthText();
}

function getRandomMonster() {
  const prefix = pickRandom(ENCOUNTER_PREFIXES);
  const monster = pickRandom(MONSTER_LIST);
  return {
    name: `${prefix.label}${monster.name}`,
    strength: prefix.value + monster.value
  };
}

function logEncounter(message) {
  const timestamp = new Date().toLocaleTimeString();
  encounterLog.push(`${timestamp} - ${message}`);
  if (encounterLog.length > 5) {
    encounterLog.splice(0, encounterLog.length - 5);
  }
  saveAdventureState();
  renderEncounterLog();
}

function renderEncounterLog() {
  if (!encounterLogContainer) return;
  if (encounterLog.length === 0) {
    encounterLogContainer.innerHTML = "<p>まだ遭遇していません。</p>";
    return;
  }
  const html = ['<ul class="log-list">']
    .concat(encounterLog.slice().reverse().map((message) => `<li>${message}</li>`))
    .concat(["</ul>"])
    .join("");
  encounterLogContainer.innerHTML = html;
}

function handleEncounter() {
  const monster = getRandomMonster();
  const playerStrength = calculatePlayerStrength();
  const playerText = `プレイヤー: ${playerStrength}`;
  const monsterText = `${monster.name} (${monster.strength})`;

  if (playerStrength > monster.strength) {
    const lootName = "泥まみれの宝";
    adventureItems.push({ name: lootName, power: 0 });
    saveAdventureItems();
    renderAdventureItems();
    renderEquipmentOptions();
    const message = `遭遇: ${monsterText} に勝利！ ${lootName} を手に入れた。 (${playerText})`;
    logEncounter(message);
  } else {
    const message = `遭遇: ${monsterText} に敗北、逃げ帰った。 (${playerText})`;
    logEncounter(message);
  }
}

function processEncounterWindow(startSecond, endSecond) {
  const first = Math.max(1, startSecond);
  for (let second = first; second <= endSecond; second += 1) {
    if (second % 5 !== 0) {
      continue;
    }
    lastEncounterSecond = second;
    if (Math.random() < 0.4) {
      handleEncounter();
    }
  }
  saveAdventureState();
}

function checkForEncounter(elapsedSeconds) {
  if (elapsedSeconds <= 0 || elapsedSeconds % 5 !== 0 || elapsedSeconds === lastEncounterSecond) {
    return;
  }
  lastEncounterSecond = elapsedSeconds;
  if (Math.random() < 0.3) {
    handleEncounter();
  }
  saveAdventureState();
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
  if (Math.random() < 0.05) {
    // 5%の確率で野菜を獲得
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

    // 7%の確率で2個獲得
    if (Math.random() < 0.07) {
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
  if (elapsedSeconds > lastEncounterSecond) {
    processEncounterWindow(lastEncounterSecond + 1, elapsedSeconds);
  }

  const count = Math.min(Math.floor(elapsedSeconds * 30 / currentTargetSeconds), 30);
  updateAdventureUI(count);

  if (count >= 30) {
    completeAdventure();
  }
}

function onAdventureTick() {
  if (!startTime) return;
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const count = Math.min(Math.floor(elapsedSeconds * 30 / currentTargetSeconds), 30);
  updateAdventureUI(count);
  checkForEncounter(elapsedSeconds);

  if (count >= 30) {
    completeAdventure();
  }
}

function startAdventure() {
  if (timerId !== null) {
    return;
  }

  const reduction = getDurationReduction();
  if (reduction > 0) {
    currentTargetSeconds = Math.max(1, 30 - reduction);
    clearDurationReduction();
  } else {
    currentTargetSeconds = 30;
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
  weaponSelect = document.getElementById("weaponSelect");
  armorSelect = document.getElementById("armorSelect");
  accessorySelect = document.getElementById("accessorySelect");
  equipButton = document.getElementById("equipButton");
  strengthText = document.getElementById("strengthText");
  encounterLogContainer = document.getElementById("encounterLogContainer");

  adventureItems = getStoredAdventureItems();
  getStoredAdventureState();
  renderAdventureItems();
  renderEquipmentOptions();
  renderEncounterLog();
  updateAdventureUI(0);
  showAdventureResult("");

  if (equipButton) {
    equipButton.addEventListener("click", equipSelectedItems);
  }

  if (isRunning) {
    restoreAdventureFromTime();
    if (isRunning) {
      adventureButton.disabled = true;
      timerId = setInterval(onAdventureTick, 250);
    }
  }
  if (adventureButton) {
    adventureButton.addEventListener("click", startAdventure);
  }
}

window.addEventListener("DOMContentLoaded", initializeAdventurePage);
