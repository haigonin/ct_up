// 最大カウント値
const MAX_COUNT = 10;
const BASE_PLOT_COUNT = 1; // 基本畑数
const MAX_ADDITIONAL_PLOTS = 2; // 追加可能畑数
const MAX_AUTO_COUNT = 50;

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
const SEED_INVENTORY_KEY = "seedInventory";
const HARVEST_LOG_KEY = "harvestLog";
const PENDING_SEEDS_KEY = "pendingPlantSeeds";
const ADDITIONAL_PLOTS_KEY = "additionalPlots";

// DOM 要素を取得
const seedSelect = document.getElementById("seedSelect");
const seedInventoryContainer = document.getElementById("seedInventoryContainer");
const autoCountInput = document.getElementById("autoCountInput");

// 現在の状態を保持する変数
let additionalPlots = 0; // 追加された畑数
let plotCurrentCounts = [];
let plotIsRunning = [];
let plotStartTimes = [];
let plotTimerIds = [];
let plotCurrentEmojis = [];
let plotPendingSeeds = [];
let plotHarvestMessages = [];
let plotTargetSeconds = [];
let plotAutoCounts = []; // 自動回数
let plotCurrentAutoCount = []; // 現在の自動回数
let harvestStats = {};
let seedInventory = {};
let harvestLog = [];

// 総畑数を計算
function getTotalPlotCount() {
  return BASE_PLOT_COUNT + additionalPlots;
}

// 配列を初期化
function initializePlotArrays() {
  const total = getTotalPlotCount();
  plotCurrentCounts = Array(total).fill(0);
  plotIsRunning = Array(total).fill(false);
  plotStartTimes = Array(total).fill(null);
  plotTimerIds = Array(total).fill(null);
  plotCurrentEmojis = Array(total).fill("");
  plotPendingSeeds = Array(total).fill("");
  plotHarvestMessages = Array(total).fill("");
  plotTargetSeconds = Array(total).fill(MAX_COUNT);
  plotAutoCounts = Array(total).fill(1);
  plotCurrentAutoCount = Array(total).fill(0);
}

/**
 * UI 表示を更新する
 */
function updatePlotUI(index) {
  const count = plotCurrentCounts[index];
  const isRunning = plotIsRunning[index];
  const harvestMessage = plotHarvestMessages[index];
  const currentEmoji = plotCurrentEmojis[index];

  const countValue = document.getElementById(`countValue${index}`);
  const progressBar = document.getElementById(`progressBar${index}`);
  const button = document.getElementById(`startButton${index}`);
  const statusText = document.getElementById(`statusText${index}`);
  const emojiDisplay = document.getElementById(`emojiDisplay${index}`);

  if (countValue) {
    countValue.textContent = count.toString();
  }
  if (progressBar) {
    progressBar.value = count * 10;
  }
  if (button) {
    button.disabled = isRunning;
  }
  if (statusText) {
    if (count >= MAX_COUNT) {
      statusText.textContent = harvestMessage || "収穫！";
    } else if (isRunning) {
      statusText.textContent = "成長中...";
    } else {
      statusText.textContent = "準備完了";
    }
  }
  if (emojiDisplay) {
    emojiDisplay.textContent = count >= MAX_COUNT ? currentEmoji : "";
  }
}

function updateUI() {
  const plotsContainer = document.querySelector('.plots');
  if (plotsContainer) {
    plotsContainer.innerHTML = '';
    const total = getTotalPlotCount();
    for (let index = 0; index < total; index += 1) {
      const plotDiv = document.createElement('div');
      plotDiv.className = 'plot';
      plotDiv.innerHTML = `
        <div class="plot-label">畑 ${index + 1}</div>
        <div class="count-box">
          <span id="countValue${index}">0</span>
          <span> / 10</span>
        </div>
        <progress id="progressBar${index}" value="0" max="100"></progress>
        <label>自動回数 (1-50): <input type="number" id="autoCountInput${index}" min="1" max="50" value="${plotAutoCounts[index]}" /></label>
        <button id="startButton${index}" class="startButton">耕す</button>
        <div id="emojiDisplay${index}" class="emoji"></div>
        <p id="statusText${index}" class="status"></p>
      `;
      plotsContainer.appendChild(plotDiv);
    }
  }

  for (let index = 0; index < getTotalPlotCount(); index += 1) {
    updatePlotUI(index);
  }
  updateHarvestStats();
  renderSeedInventory();
  populateSeedSelect();
}

/**
 * localStorage に状態を保存する
 */
function saveState() {
  localStorage.setItem("harvestCount_currentCounts", JSON.stringify(plotCurrentCounts));
  localStorage.setItem("harvestCount_isRunning", JSON.stringify(plotIsRunning));
  localStorage.setItem("harvestCount_startTimes", JSON.stringify(plotStartTimes));
  localStorage.setItem("harvestCount_emojis", JSON.stringify(plotCurrentEmojis));
  localStorage.setItem("harvestCount_messages", JSON.stringify(plotHarvestMessages));
  localStorage.setItem("harvestCount_targets", JSON.stringify(plotTargetSeconds));
  localStorage.setItem("harvestCount_autoCounts", JSON.stringify(plotAutoCounts));
  localStorage.setItem("harvestCount_currentAutoCounts", JSON.stringify(plotCurrentAutoCount));
  localStorage.setItem(PENDING_SEEDS_KEY, JSON.stringify(plotPendingSeeds));
  localStorage.setItem("harvestCount_stats", JSON.stringify(harvestStats));
  localStorage.setItem(HARVEST_LOG_KEY, JSON.stringify(harvestLog));
  localStorage.setItem(SEED_INVENTORY_KEY, JSON.stringify(seedInventory));
  localStorage.setItem(ADDITIONAL_PLOTS_KEY, String(additionalPlots));
}

function getNextDurationReduction() {
  const stored = localStorage.getItem(DURATION_REDUCTION_KEY);
  return stored ? Number(stored) : 0;
}

function clearNextDurationReduction() {
  localStorage.removeItem(DURATION_REDUCTION_KEY);
}

function loadArrayState(key, defaultArray) {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return defaultArray.slice();
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length === defaultArray.length) {
      return parsed;
    }
  } catch (error) {
    // ignore
  }
  return defaultArray.slice();
}

/**
 * localStorage から状態を読み込む
 */
function loadState() {
  additionalPlots = Number(localStorage.getItem(ADDITIONAL_PLOTS_KEY) || 0);
  initializePlotArrays();

  plotCurrentCounts = loadArrayState("harvestCount_currentCounts", Array(getTotalPlotCount()).fill(0));
  plotIsRunning = loadArrayState("harvestCount_isRunning", Array(getTotalPlotCount()).fill(false));
  plotStartTimes = loadArrayState("harvestCount_startTimes", Array(getTotalPlotCount()).fill(null));
  plotCurrentEmojis = loadArrayState("harvestCount_emojis", Array(getTotalPlotCount()).fill(""));
  plotHarvestMessages = loadArrayState("harvestCount_messages", Array(getTotalPlotCount()).fill(""));
  plotTargetSeconds = loadArrayState("harvestCount_targets", Array(getTotalPlotCount()).fill(MAX_COUNT));
  plotAutoCounts = loadArrayState("harvestCount_autoCounts", Array(getTotalPlotCount()).fill(1));
  plotCurrentAutoCount = loadArrayState("harvestCount_currentAutoCounts", Array(getTotalPlotCount()).fill(0));
  plotPendingSeeds = loadArrayState(PENDING_SEEDS_KEY, Array(getTotalPlotCount()).fill(""));

  const storedStats = localStorage.getItem("harvestCount_stats");
  harvestStats = storedStats ? JSON.parse(storedStats) : {};

  const storedLog = localStorage.getItem(HARVEST_LOG_KEY);
  harvestLog = storedLog ? JSON.parse(storedLog) : [];

  const storedSeeds = localStorage.getItem(SEED_INVENTORY_KEY);
  seedInventory = storedSeeds ? JSON.parse(storedSeeds) : {};
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

function renderHarvestLog() {
  const logContainer = document.getElementById("harvestLogContainer");
  if (!logContainer) return;

  if (harvestLog.length === 0) {
    logContainer.innerHTML = "<p class='no-stats'>収穫ログはありません</p>";
    return;
  }

  const lines = harvestLog.slice().reverse().map((entry) => `<li>${entry}</li>`);
  logContainer.innerHTML = `<div class='stats-title'>収穫ログ</div><ul class='harvest-log-list'>${lines.join("")}</ul>`;
}

/**
 * 絵文字の収穫回数を記録する
 */
function recordHarvest(emoji) {
  if (!harvestStats[emoji]) {
    harvestStats[emoji] = 0;
  }
  harvestStats[emoji]++;
  const timestamp = new Date().toLocaleTimeString();
  harvestLog.push(`${timestamp} - ${emoji} を収穫しました`);
  saveState();
  updateHarvestStats();
  renderHarvestLog();
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
function restoreCountFromTime(index) {
  if (!plotIsRunning[index] || plotStartTimes[index] === null) {
    return;
  }

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - plotStartTimes[index]) / 1000);
  const targetSeconds = plotTargetSeconds[index] || MAX_COUNT;
  const totalCycles = plotAutoCounts[index] || 1;
  const completedCycles = Math.floor(elapsedSeconds / targetSeconds);
  const secondsIntoCycle = elapsedSeconds % targetSeconds;

  if (completedCycles >= 1) {
    plotPendingSeeds[index] = "";
  }

  if (completedCycles >= totalCycles) {
    plotCurrentAutoCount[index] = totalCycles;
    plotCurrentCounts[index] = MAX_COUNT;
    plotIsRunning[index] = false;
    clearInterval(plotTimerIds[index]);
    plotTimerIds[index] = null;

    if (!plotCurrentEmojis[index]) {
      if (plotPendingSeeds[index]) {
        plotCurrentEmojis[index] = plotPendingSeeds[index];
        plotPendingSeeds[index] = "";
        const harvestAmount = Math.random() < 0.62 ? 2 : 1;
        for (let i = 0; i < harvestAmount; i += 1) {
          recordHarvest(plotCurrentEmojis[index]);
        }
        plotHarvestMessages[index] = harvestAmount === 2 ? "たねの野菜を2個収穫！" : "たねの野菜を1個収穫";
      } else {
        plotCurrentEmojis[index] = chooseRandomEmoji();
        recordHarvest(plotCurrentEmojis[index]);
        plotHarvestMessages[index] = "収穫！";
      }
    }
  } else {
    plotCurrentAutoCount[index] = completedCycles;
    if (secondsIntoCycle === 0 && completedCycles > 0) {
      plotCurrentCounts[index] = 0;
      plotStartTimes[index] = now;
      plotCurrentEmojis[index] = "";
      plotHarvestMessages[index] = "";
    } else {
      plotCurrentCounts[index] = Math.min(Math.floor(secondsIntoCycle * MAX_COUNT / targetSeconds), MAX_COUNT);
      plotStartTimes[index] = now - secondsIntoCycle * 1000;
      if (completedCycles > 0) {
        plotCurrentEmojis[index] = "";
        plotHarvestMessages[index] = "";
      }
    }
  }

  saveState();
}

/**
 * タイマーを開始する
 */
function startTimer(index) {
  if (plotTimerIds[index] !== null) {
    return;
  }

  plotTimerIds[index] = setInterval(() => onTick(index), 1000);
}

/**
 * タイマーの1秒ごとの処理
 */
function onTick(index) {
  if (!plotIsRunning[index] || plotStartTimes[index] === null) {
    return;
  }

  const elapsedSeconds = Math.floor((Date.now() - plotStartTimes[index]) / 1000);
  plotCurrentCounts[index] = Math.min(Math.floor(elapsedSeconds * MAX_COUNT / plotTargetSeconds[index]), MAX_COUNT);

  if (plotCurrentCounts[index] >= MAX_COUNT) {
    plotCurrentCounts[index] = MAX_COUNT;
    plotIsRunning[index] = false;
    clearInterval(plotTimerIds[index]);
    plotTimerIds[index] = null;

    if (!plotCurrentEmojis[index]) {
      if (plotPendingSeeds[index]) {
        plotCurrentEmojis[index] = plotPendingSeeds[index];
        plotPendingSeeds[index] = "";
        const harvestAmount = Math.random() < 0.62 ? 2 : 1;
        for (let i = 0; i < harvestAmount; i += 1) {
          recordHarvest(plotCurrentEmojis[index]);
        }
        plotHarvestMessages[index] = harvestAmount === 2 ? "たねの野菜を2個収穫！" : "たねの野菜を1個収穫";
      } else {
        plotCurrentEmojis[index] = chooseRandomEmoji();
        recordHarvest(plotCurrentEmojis[index]);
        plotHarvestMessages[index] = "収穫！";
      }
    }

    // 自動回数をチェック
    plotCurrentAutoCount[index]++;
    if (plotCurrentAutoCount[index] < plotAutoCounts[index]) {
      // 次のサイクルを開始
      setTimeout(() => {
        plotCurrentCounts[index] = 0;
        plotStartTimes[index] = Date.now();
        plotIsRunning[index] = true;
        plotCurrentEmojis[index] = "";
        plotHarvestMessages[index] = "";
        updateUI();
        saveState();
        startTimer(index);
      }, 1000); // 1秒待って次のサイクル
    }
  }

  updateUI();
  saveState();
}

/**
 * スタートボタン押下時の処理
 */
function onStartButtonClick(index) {
  if (plotIsRunning[index]) {
    return;
  }

  const autoCountInput = document.getElementById(`autoCountInput${index}`);
  const autoCount = autoCountInput ? Math.min(Math.max(1, Number(autoCountInput.value)), MAX_AUTO_COUNT) : 1;
  plotAutoCounts[index] = autoCount;
  plotCurrentAutoCount[index] = 0;

  plotCurrentCounts[index] = 0;
  plotStartTimes[index] = Date.now();
  plotIsRunning[index] = true;
  plotCurrentEmojis[index] = "";
  plotHarvestMessages[index] = "";

  if (seedSelect && seedSelect.value && seedInventory[seedSelect.value] > 0) {
    plotPendingSeeds[index] = seedSelect.value;
    seedInventory[seedSelect.value] -= 1;
    renderSeedInventory();
    populateSeedSelect();
  } else {
    plotPendingSeeds[index] = "";
  }

  harvestLog = [];
  renderHarvestLog();

  const reduction = getNextDurationReduction();
  if (reduction > 0) {
    plotTargetSeconds[index] = Math.max(1, MAX_COUNT - reduction);
    clearNextDurationReduction();
  } else {
    plotTargetSeconds[index] = MAX_COUNT;
  }

  updateUI();
  saveState();
  startTimer(index);
}

/**
 * 初期化処理
 */
function initialize() {
  loadState();
  populateSeedSelect();

  updateUI(); // UIを更新して畑を生成
  renderHarvestLog();

  // ボタンにイベントを追加
  for (let index = 0; index < getTotalPlotCount(); index += 1) {
    const button = document.getElementById(`startButton${index}`);
    if (button) {
      button.addEventListener("click", () => onStartButtonClick(index));
    }
    restoreCountFromTime(index);
    updatePlotUI(index);
    if (plotIsRunning[index]) {
      startTimer(index);
    }
  }
}

window.addEventListener("DOMContentLoaded", initialize);