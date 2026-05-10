// 最大カウント値
const MAX_COUNT = 10;

// 野菜絵文字の候補リスト
const vegetables = ["🥕", "🌽", "🥬", "🍅", "🥔", "🧄", "🍄", "🌾", "🧅"];
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
const DURATION_REDUCTION_KEY = "nextDurationReduction";
const HARVEST_TARGET_SECONDS_KEY = "harvestTargetSeconds";
const SEED_INVENTORY_KEY = "seedInventory";
const PENDING_SEED_KEY = "pendingPlantSeed";

// DOM 要素を取得
const countValue = document.getElementById("countValue");
const progressBar = document.getElementById("progressBar");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const emojiDisplay = document.getElementById("emojiDisplay");
const seedSelect = document.getElementById("seedSelect");
const seedInventoryContainer = document.getElementById("seedInventoryContainer");

// 現在の状態を保持する変数
let currentCount = 0;       // 表示するカウント値
let isRunning = false;      // カウント中かどうか
let startTime = null;       // カウント開始時刻（ミリ秒）
let timerId = null;         // setInterval の ID
let currentEmoji = "";      // 収穫可能になったときの絵文字
let harvestStats = {};      // 絵文字ごとの収穫回数
let seedInventory = {};     // たねの在庫
let pendingSeed = "";      // 植えたたね
let harvestMessage = "";   // 収穫メッセージ
let currentTargetSeconds = MAX_COUNT;

/**
 * UI 表示を更新する
 */
function updateUI() {
  // カウント数を画面に反映
  countValue.textContent = currentCount.toString();

  // プログレスバーを 0 〜 100 に合わせる
  progressBar.value = currentCount * 10;

  // 実行中はスタートボタンを無効化
  startButton.disabled = isRunning;

  // 10 に到達したら収穫メッセージを表示
  if (currentCount >= MAX_COUNT) {
    statusText.textContent = harvestMessage || "収穫！";
    emojiDisplay.textContent = currentEmoji;
  } else {
    statusText.textContent = "";
    emojiDisplay.textContent = "";
  }

  // 統計情報を更新
  updateHarvestStats();
  renderSeedInventory();
}

/**
 * localStorage に状態を保存する
 */
function saveState() {
  localStorage.setItem("harvestCount_currentCount", String(currentCount));
  localStorage.setItem("harvestCount_isRunning", String(isRunning));
  localStorage.setItem("harvestCount_startTime", String(startTime));
  localStorage.setItem("harvestCount_emoji", currentEmoji);
  localStorage.setItem("harvestCount_stats", JSON.stringify(harvestStats));
  localStorage.setItem(HARVEST_TARGET_SECONDS_KEY, String(currentTargetSeconds));
  localStorage.setItem(SEED_INVENTORY_KEY, JSON.stringify(seedInventory));
  localStorage.setItem(PENDING_SEED_KEY, pendingSeed);
}

function getNextDurationReduction() {
  const stored = localStorage.getItem(DURATION_REDUCTION_KEY);
  return stored ? Number(stored) : 0;
}

function clearNextDurationReduction() {
  localStorage.removeItem(DURATION_REDUCTION_KEY);
}

/**
 * localStorage から状態を読み込む
 */
function loadState() {
  const storedCount = localStorage.getItem("harvestCount_currentCount");
  const storedRunning = localStorage.getItem("harvestCount_isRunning");
  const storedStartTime = localStorage.getItem("harvestCount_startTime");
  const storedEmoji = localStorage.getItem("harvestCount_emoji");
  const storedStats = localStorage.getItem("harvestCount_stats");

  if (storedCount !== null) {
    currentCount = Number(storedCount);
  }

  if (storedRunning !== null) {
    isRunning = storedRunning === "true";
  }

  if (storedStartTime !== null && storedStartTime !== "null") {
    startTime = Number(storedStartTime);
  } else {
    startTime = null;
  }

  if (storedEmoji !== null) {
    currentEmoji = storedEmoji;
  } else {
    currentEmoji = "";
  }

  if (storedStats !== null) {
    harvestStats = JSON.parse(storedStats);
  } else {
    harvestStats = {};
  }

  const storedTarget = localStorage.getItem(HARVEST_TARGET_SECONDS_KEY);
  if (storedTarget !== null) {
    currentTargetSeconds = Number(storedTarget);
  } else {
    currentTargetSeconds = MAX_COUNT;
  }

  const storedSeeds = localStorage.getItem(SEED_INVENTORY_KEY);
  seedInventory = storedSeeds ? JSON.parse(storedSeeds) : {};

  const storedPendingSeed = localStorage.getItem(PENDING_SEED_KEY);
  pendingSeed = storedPendingSeed || "";
}

/**
 * ランダムな野菜絵文字を選択する
 */
function chooseRandomEmoji() {
  const index = Math.floor(Math.random() * vegetables.length);
  return vegetables[index];
}

/**
 * 収穫統計を更新する
 */
function updateHarvestStats() {
  const statsContainer = document.getElementById("harvestStatsContainer");
  if (!statsContainer) return;

  // 統計情報をHTMLで表示
  let statsHTML = "<div class='stats-title'>収穫統計</div>";
  statsHTML += "<div class='stats-grid'>";

  if (Object.keys(harvestStats).length === 0) {
    statsHTML += "<p class='no-stats'>まだ収穫がありません</p>";
  } else {
    for (const emoji in harvestStats) {
      const count = harvestStats[emoji];
      statsHTML += `<div class='stat-item'><span class='stat-emoji'>${emoji}</span><span class='stat-count'>${count}</span></div>`;
    }
  }

  statsHTML += "</div>";
  statsContainer.innerHTML = statsHTML;
}

/**
 * 絵文字の収穫回数を記録する
 */
function recordHarvest(emoji) {
  if (!harvestStats[emoji]) {
    harvestStats[emoji] = 0;
  }
  harvestStats[emoji]++;
  saveState();
  updateHarvestStats();
}

function renderSeedInventory() {
  if (!seedInventoryContainer) return;
  seedInventoryContainer.innerHTML = "";

  const availableSeeds = Object.keys(seedInventory).filter((emoji) => seedInventory[emoji] > 0);
  if (availableSeeds.length === 0) {
    seedInventoryContainer.innerHTML = "<p class='no-stats'>たねがありません</p>";
    return;
  }

  availableSeeds.forEach((emoji) => {
    const count = seedInventory[emoji] || 0;
    const line = document.createElement("p");
    line.textContent = `${emoji} のたね × ${count}`;
    seedInventoryContainer.appendChild(line);
  });
}

function populateSeedSelect() {
  if (!seedSelect) return;

  const availableSeeds = Object.keys(seedInventory).filter((emoji) => seedInventory[emoji] > 0);
  const options = ["<option value=''>なし</option>"];
  availableSeeds.forEach((emoji) => {
    options.push(`<option value="${emoji}">${emoji} × ${seedInventory[emoji]}</option>`);
  });

  seedSelect.innerHTML = options.join("");
}

/**
 * 経過時間を使ってカウント値を再計算する
 */
function restoreCountFromTime() {
  if (!isRunning || startTime === null) {
    return;
  }

  // 現在ミリ秒 - 開始時刻ミリ秒
  const elapsedMs = Date.now() - startTime;

  // 経過秒数を整数で求める
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // 目標時間に合わせてカウント値を計算
  currentCount = Math.min(Math.floor(elapsedSeconds * MAX_COUNT / currentTargetSeconds), MAX_COUNT);

  // 10 に達したら停止して絵文字を決定
  if (currentCount >= MAX_COUNT) {
    currentCount = MAX_COUNT;
    isRunning = false;
    clearInterval(timerId);
    timerId = null;

    if (!currentEmoji) {
      currentEmoji = chooseRandomEmoji();
    }
  }
}

/**
 * タイマーを開始する
 */
function startTimer() {
  // すでに動いている場合は何もしない
  if (timerId !== null) {
    return;
  }

  // 1秒ごとに onTick を呼び出す
  timerId = setInterval(onTick, 1000);
}

/**
 * タイマーの1秒ごとの処理
 */
function onTick() {
  if (!isRunning || startTime === null) {
    return;
  }

  // 経過秒数を再計算して currentCount を更新
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  currentCount = Math.min(Math.floor(elapsedSeconds * MAX_COUNT / currentTargetSeconds), MAX_COUNT);

  // 10 になったら停止して絵文字を表示
  if (currentCount >= MAX_COUNT) {
    currentCount = MAX_COUNT;
    isRunning = false;
    clearInterval(timerId);
    timerId = null;

    if (!currentEmoji) {
      if (pendingSeed) {
        currentEmoji = pendingSeed;
        pendingSeed = "";
        localStorage.removeItem(PENDING_SEED_KEY);
        const harvestAmount = Math.random() < 0.62 ? 2 : 1;
        for (let i = 0; i < harvestAmount; i++) {
          recordHarvest(currentEmoji);
        }
        harvestMessage = harvestAmount === 2 ? "たねの野菜を2個収穫！" : "たねの野菜を1個収穫";
      } else {
        currentEmoji = chooseRandomEmoji();
        recordHarvest(currentEmoji);
        harvestMessage = "収穫！";
      }
    }
  }

  updateUI();
  saveState();
}

/**
 * スタートボタン押下時の処理
 */
function onStartButtonClick() {
  // カウントを最初から開始
  currentCount = 0;
  startTime = Date.now();
  isRunning = true;
  currentEmoji = "";

  const reduction = getNextDurationReduction();
  if (seedSelect && seedSelect.value && seedInventory[seedSelect.value] > 0) {
    pendingSeed = seedSelect.value;
    seedInventory[pendingSeed]--;
    saveState();
    renderSeedInventory();
    populateSeedSelect();
  } else {
    pendingSeed = "";
  }

  if (reduction > 0) {
    currentTargetSeconds = Math.max(1, MAX_COUNT - reduction);
    clearNextDurationReduction();
  } else {
    currentTargetSeconds = MAX_COUNT;
  }

  harvestMessage = "";
  updateUI();
  saveState();
  startTimer();
}

/**
 * 初期化処理
 */
function initialize() {
  // 保存された状態を読み込む
  loadState();

  // たね選択リストを初期化
  populateSeedSelect();

  // 前回の開始時刻があれば、経過時間からカウントを復元
  restoreCountFromTime();

  // もしカウント中ならタイマーを再開
  if (isRunning) {
    startTimer();
  }

  updateUI();
}

// ボタンにクリックイベントを登録
startButton.addEventListener("click", onStartButtonClick);

// ページ読み込み時に初期化
window.addEventListener("DOMContentLoaded", initialize);