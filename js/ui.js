(function () {
  const state = { currentScreen: 'startScreen' };

  const overlay = document.getElementById('overlay');
  const startScreen = document.getElementById('startScreen');
  const itemScreen = document.getElementById('itemScreen');
  const loseScreen = document.getElementById('loseScreen');
  const winScreen = document.getElementById('winScreen');
  const screens = [startScreen, itemScreen, loseScreen, winScreen];

  const startText = document.getElementById('startText');
  const startButtonLabel = document.getElementById('startButtonLabel');
  const itemMessage = document.getElementById('itemMessage');
  const itemChoices = document.getElementById('itemChoices');

  function showOverlay(screenId) {
    overlay.classList.add('overlay--visible');
    screens.forEach((screen) => {
      screen.classList.toggle('screen--active', screen.id === screenId);
    });
    state.currentScreen = screenId;
  }

  function hideOverlay() {
    overlay.classList.remove('overlay--visible');
    screens.forEach((screen) => screen.classList.remove('screen--active'));
  }

  function updateStartIntro(isReady) {
    startText.textContent = isReady ? APP_CONFIG.startTextAfter : APP_CONFIG.startTextBefore;
    startButtonLabel.textContent = isReady ? 'Помочь' : 'Старт';
  }

  function getItemSprite(item) {
    return item && item.sprite
      ? `<img class="item-card__sprite" src="${item.sprite}" alt="${item.title}">`
      : '';
  }

  function buildItemChoices(items, onSelect) {
    itemChoices.innerHTML = '';
    items.forEach((item) => {
      const button = document.createElement('button');
      button.className = 'item-card';
      button.type = 'button';
      button.innerHTML = `
        <div class="item-card__media">
          ${getItemSprite(item) || `<div class="item-card__icon">${item.icon}</div>`}
        </div>
        <div class="item-card__title">${item.title}</div>
        <div class="item-card__description">${item.description}</div>
      `;
      button.addEventListener('click', () => onSelect(item));
      itemChoices.appendChild(button);
    });
  }

  function showItemSelection(message, items, onSelect) {
    itemMessage.textContent = message || APP_CONFIG.itemPrompt;
    buildItemChoices(items, onSelect);
    showOverlay('itemScreen');
  }

  window.GameUI = {
    state,
    showOverlay,
    hideOverlay,
    updateStartIntro,
    showItemSelection,
    showStartScreen() {
      showOverlay('startScreen');
    },
    showLoseScreen() {
      showOverlay('loseScreen');
    },
    showWinScreen() {
      showOverlay('winScreen');
    }
  };
})();
