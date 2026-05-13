const ADVENTURE_ITEMS_KEY = "adventureItems";
const weapons = ["剣", "杖", "矢"];
const armors = ["盾", "鎧", "小手"];
const accessories = ["指輪", "棒きれ", "猫じゃらし"];
const prefixList = [
  { label: "疾風迅雷の", value: 8 },
  { label: "明鏡止水な", value: 9 },
  { label: "しろたえの", value: 12 }, 
  { label: "射干玉の", value: 13 },
  { label: "凍てつく", value: 8 },
  { label: "たまゆら", value: 10 },
  { label: "無垢なる", value: 7 }
];
const itemStrengths = {
    "剣": 6,
    "杖": 7,
    "矢": 5,
    "盾": 6,
    "鎧": 5,
    "小手": 4,
    "指輪": 4,
    "小瓶": 3,
    "棒きれ": 2,
    "猫じゃらし": 10
};
const allItems = [...weapons, ...armors, ...accessories];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getStoredAdventureItems() {
  const stored = localStorage.getItem(ADVENTURE_ITEMS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveAdventureItems(items) {
  localStorage.setItem(ADVENTURE_ITEMS_KEY, JSON.stringify(items));
}

function getStoredCoins() {
  if (window.getStoredCoins && window.getStoredCoins !== getStoredCoins) {
    return window.getStoredCoins();
  }
  const stored = localStorage.getItem("coinTotal");
  return stored ? Number(stored) : 0;
}

function updateCoinUI() {
  const coinTotalElement = document.getElementById("coinTotal");
  if (coinTotalElement) {
    coinTotalElement.textContent = getStoredCoins();
  }
}

function renderItemList() {
  const items = getStoredAdventureItems();
  const container = document.getElementById("itemList");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = "<p>アイテムがありません。</p>";
    return;
  }

  const groups = {};
  items.forEach(item => {
    const key = `${item.name}|${item.power}`;
    if (!groups[key]) groups[key] = { name: item.name, power: item.power, count: 0 };
    groups[key].count++;
  });

  container.innerHTML = Object.values(groups).map(group =>
    `<div>${group.name} (強さ: ${group.power}) × ${group.count}</div>`
  ).join("");
}

function appraiseTreasure() {
  const items = getStoredAdventureItems();
  const muddyIndex = items.findIndex(item => item.name === "泥まみれの宝");
  if (muddyIndex === -1) {
    document.getElementById("appraiseStatus").textContent = "泥まみれの宝がありません。";
    return;
  }

  // 1つ消費
  const newItems = [...items];
  newItems.splice(muddyIndex, 1);

  // ランダムにプレフィックスとアイテムを選ぶ
  const prefix = pickRandom(prefixList);
  const randomItem = pickRandom(allItems);
  const itemPower = itemStrengths[randomItem];
  const totalPower = prefix.value + itemPower + 3;
  const newItem = { name: `輝く${prefix.label}${randomItem}`, power: totalPower };

  newItems.push(newItem);
  saveAdventureItems(newItems);

  document.getElementById("appraiseStatus").textContent = `鑑定完了！${newItem.name} (強さ: ${newItem.power}) を獲得しました。`;
  renderItemList();
  updateCoinUI();
}

function initializeWorkshop() {
  updateCoinUI();
  renderItemList();
  const appraiseButton = document.getElementById("appraiseButton");
  if (appraiseButton) {
    appraiseButton.addEventListener("click", appraiseTreasure);
  }
}

window.addEventListener("DOMContentLoaded", initializeWorkshop);