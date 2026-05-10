const COIN_KEY = "coinTotal";

function getStoredCoins() {
  const stored = localStorage.getItem(COIN_KEY);
  return stored ? Number(stored) : 0;
}

function saveCoins(amount) {
  localStorage.setItem(COIN_KEY, String(amount));
  updateCoinUI();
}

function addCoins(amount) {
  const total = getStoredCoins() + amount;
  saveCoins(total);
  return total;
}

function updateCoinUI() {
  const coinDisplay = document.getElementById("coinDisplay");
  if (!coinDisplay) return;
  coinDisplay.textContent = `コイン: ${getStoredCoins()}`;
}

window.addCoins = addCoins;
window.getStoredCoins = getStoredCoins;
window.updateCoinUI = updateCoinUI;

window.addEventListener("DOMContentLoaded", updateCoinUI);
