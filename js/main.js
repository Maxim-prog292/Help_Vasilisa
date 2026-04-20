(function () {
  const canvas = document.getElementById("gameCanvas");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const backToStartButton = document.getElementById("backToStartButton");
  const hud = document.getElementById("hud");
  const tapHint = document.getElementById("tapHint");
  const progressFill = document.getElementById("progressFill");
  const gapValue = document.getElementById("gapValue");
  const overlay = document.getElementById("overlay");

  let introArmed = false;
  let lastPhysicalTapAt = 0;
  let rapidTapStreak = 0;
  let lastTouchAt = 0;
  let tapWarningHideTimer = null;
  const MIN_SAFE_TAP_INTERVAL = 45;

  function createPlaceholder(label) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#fff7df"/>
            <stop offset="100%" stop-color="#d5b06f"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="40" fill="url(#g)"/>
        <rect x="20" y="20" width="760" height="1160" rx="34" fill="none" stroke="#7a5920" stroke-dasharray="18 14" stroke-width="8" opacity="0.45"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="54" font-family="Arial" font-weight="700" fill="#6d4a1a">${label}</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function applyConfiguredImages() {
    const assets = (window.APP_CONFIG && window.APP_CONFIG.assets) || {};

    document.querySelectorAll("img[data-config-key]").forEach((img) => {
      const key = img.dataset.configKey;
      const src = assets[key];
      if (src) {
        img.src = src;
        img.classList.remove("is-placeholder");
      } else if (!img.getAttribute("src")) {
        img.src = createPlaceholder(
          img.getAttribute("data-placeholder") || "PNG",
        );
        img.classList.add("is-placeholder");
      }
    });
  }

  function applyConfiguredOverlayBackground() {
    const assets = (window.APP_CONFIG && window.APP_CONFIG.assets) || {};
    const background = assets.overlayBackground;

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.style.backgroundImage = background
        ? `url("${background}")`
        : "none";
    });
  }

  function ensureTapWarningElement() {
    let warning = document.getElementById("tapSafetyWarning");
    if (warning) return warning;

    warning = document.createElement("div");
    warning.id = "tapSafetyWarning";
    warning.textContent = "Тапайте быстро, но легко. Не стучите по экрану.";
    warning.style.position = "absolute";
    warning.style.left = "50%";
    warning.style.bottom = "88px";
    warning.style.transform = "translateX(-50%)";
    warning.style.zIndex = "11";
    warning.style.padding = "10px 18px";
    warning.style.borderRadius = "999px";
    warning.style.background = "rgba(117, 19, 19, 0.88)";
    warning.style.color = "#fff4e8";
    warning.style.fontFamily = "Vezitsa, Arial, sans-serif";
    warning.style.fontSize = "24px";
    warning.style.lineHeight = "1.2";
    warning.style.boxShadow = "0 10px 26px rgba(0, 0, 0, 0.28)";
    warning.style.opacity = "0";
    warning.style.pointerEvents = "none";
    warning.style.transition = "opacity 0.2s ease";

    const root = canvas.closest(".game-root") || document.body;
    root.appendChild(warning);
    return warning;
  }

  function showTapSafetyWarning(message) {
    const warning = ensureTapWarningElement();
    warning.textContent =
      message || "Тапайте быстро, но легко. Не стучите по экрану.";
    warning.style.opacity = "1";

    if (tapWarningHideTimer) {
      clearTimeout(tapWarningHideTimer);
    }

    tapWarningHideTimer = setTimeout(() => {
      warning.style.opacity = "0";
    }, 1800);
  }

  function shouldIgnoreAggressiveTap(sourceType, event) {
    const now = performance.now();

    if (sourceType === "mouse" && now - lastTouchAt < 650) {
      return true;
    }

    if (sourceType === "touch") {
      lastTouchAt = now;

      const touchCount =
        event && event.touches && typeof event.touches.length === "number"
          ? event.touches.length
          : 1;

      if (touchCount > 1) {
        showTapSafetyWarning("Используйте один палец и лёгкие частые касания.");
        return true;
      }
    }

    const delta = now - lastPhysicalTapAt;
    lastPhysicalTapAt = now;

    if (delta > 0 && delta < MIN_SAFE_TAP_INTERVAL) {
      rapidTapStreak += 1;
      if (rapidTapStreak >= 3) {
        showTapSafetyWarning(
          "Слишком резко. Нужны лёгкие частые тапы, без сильных тычков.",
        );
      }
      return true;
    }

    rapidTapStreak = 0;
    return false;
  }

  function createTapRipple(x, y) {
    const root = canvas.closest(".game-root") || document.body;
    const rootRect = root.getBoundingClientRect();
    const ripple = document.createElement("div");
    ripple.className = "tap-ripple";
    ripple.style.position = "absolute";
    ripple.style.left = `${x - rootRect.left}px`;
    ripple.style.top = `${y - rootRect.top}px`;
    ripple.style.width = "26px";
    ripple.style.height = "26px";
    ripple.style.transform = "translate(-50%, -50%) scale(0.2)";
    ripple.style.borderRadius = "999px";
    ripple.style.pointerEvents = "none";
    ripple.style.zIndex = "10";
    ripple.style.opacity = "0.72";
    ripple.style.border = "2px solid rgba(255, 238, 190, 0.92)";
    ripple.style.background =
      "radial-gradient(circle, rgba(255,248,220,0.34) 0%, rgba(255,235,170,0.14) 45%, rgba(255,235,170,0) 72%)";
    ripple.style.boxShadow = "0 0 24px rgba(255, 232, 160, 0.28)";
    ripple.style.transition =
      "transform 220ms ease-out, opacity 220ms ease-out";
    root.appendChild(ripple);

    requestAnimationFrame(() => {
      ripple.style.transform = "translate(-50%, -50%) scale(4.2)";
      ripple.style.opacity = "0";
    });

    setTimeout(() => {
      ripple.remove();
    }, 240);
  }

  function triggerTapFeedback(event, sourceType) {
    if (!event) return;

    let clientX = 0;
    let clientY = 0;

    if (sourceType === "touch" && event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (
      sourceType === "touch" &&
      event.changedTouches &&
      event.changedTouches.length > 0
    ) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if (
      typeof event.clientX === "number" &&
      typeof event.clientY === "number"
    ) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      const rect = canvas.getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    createTapRipple(clientX, clientY);
  }

  const game = new FairytaleRunGame(canvas, {
    onPauseForItemChoice(message, items, onSelect) {
      GameUI.showItemSelection(message, items, onSelect);
    },
    onResumeFromChoice() {
      GameUI.hideOverlay();
    },
    onLose() {
      hud.classList.add("hidden");
      tapHint.classList.add("hidden");
      GameUI.showLoseScreen();
    },
    onWin() {
      hud.classList.add("hidden");
      tapHint.classList.add("hidden");
      GameUI.showWinScreen();
    },
    onHudUpdate(progress, gap) {
      progressFill.style.width = `${progress}%`;
      gapValue.textContent = Utils.formatMeters(gap / 3.5);
    },
  });

  applyConfiguredImages();
  applyConfiguredOverlayBackground();
  GameUI.updateStartIntro(false);
  GameUI.showStartScreen();

  function launchGame() {
    GameUI.hideOverlay();
    hud.classList.remove("hidden");
    tapHint.classList.remove("hidden");
    game.reset();
    game.start();
  }

  startButton.addEventListener("click", () => {
    if (!introArmed) {
      introArmed = true;
      GameUI.updateStartIntro(true);
      return;
    }
    launchGame();
  });

  retryButton.addEventListener("click", () => {
    launchGame();
  });

  backToStartButton.addEventListener("click", () => {
    introArmed = false;
    game.reset();
    hud.classList.add("hidden");
    tapHint.classList.add("hidden");
    GameUI.updateStartIntro(false);
    GameUI.showStartScreen();
  });

  function registerTapSurface(target) {
    target.addEventListener(
      "touchstart",
      (event) => {
        if (!overlay.classList.contains("overlay--visible")) {
          event.preventDefault();
          if (shouldIgnoreAggressiveTap("touch", event)) return;
          triggerTapFeedback(event, "touch");
          game.tap();
        }
      },
      { passive: false },
    );

    target.addEventListener("mousedown", (event) => {
      if (!overlay.classList.contains("overlay--visible")) {
        if (shouldIgnoreAggressiveTap("mouse", event)) return;
        triggerTapFeedback(event, "mouse");
        game.tap();
      }
    });

    target.addEventListener("click", (event) => {
      if (!overlay.classList.contains("overlay--visible")) {
        if (shouldIgnoreAggressiveTap("mouse", event)) return;
        triggerTapFeedback(event, "mouse");
        game.tap();
      }
    });
  }

  registerTapSurface(canvas);
  registerTapSurface(document.body);
})();
