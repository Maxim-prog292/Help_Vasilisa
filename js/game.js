(function () {
  class FairytaleRunGame {
    constructor(canvas, hooks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.hooks = hooks;
      this.config = APP_CONFIG;
      this.assets = this.createAssetMap();
      this.decorSeed = Array.from({ length: 40 }, (_, i) => ({
        x: i * 280 + (i % 5) * 55,
        y: 510 + (i % 7) * 30,
        h: 80 + (i % 4) * 20,
      }));
      this.reset();
    }

    createAssetMap() {
      const map = {};
      const assets = (this.config && this.config.assets) || {};
      const layers = (this.config && this.config.layers) || [];

      Object.entries(assets).forEach(([key, src]) => {
        map[key] = this.loadImage(src);
      });

      layers.forEach((layer) => {
        map[`layer:${layer.id}`] = this.loadImage(layer.src);
      });

      (this.config.items || []).forEach((item) => {
        map[`item:${item.id}`] = this.loadImage(item.sprite);
      });

      return map;
    }

    loadImage(src) {
      if (!src || typeof src !== "string" || !src.trim()) return null;
      const image = new Image();
      image.src = src;
      return image;
    }

    getAsset(key) {
      const image = this.assets[key];
      if (!image || !image.complete || !image.naturalWidth) return null;
      return image;
    }

    hasConfiguredLayers() {
      return (this.config.layers || []).some((layer) =>
        this.getAsset(`layer:${layer.id}`),
      );
    }

    reset() {
      this.hero = { x: 200, y: 720 };
      this.chaser = { x: -160, y: 735 };
      this.viewportX = 0;
      this.tapEnergy = 0;
      this.timeSinceTap = 0;
      this.tapFatigue = 0;
      this.lastTapAt = 0;
      this.heroAnimTime = 0;
      this.chaserAnimTime = 0;
      this.itemsUsed = 0;
      this.triggeredCheckpoints = new Set();
      this.activeObstacle = null;
      this.running = false;
      this.pausedForChoice = false;
      this.lastTime = 0;
      this.winAnnounced = false;
      this.loseAnnounced = false;
      this.updateHud();
      this.draw();
    }

    start() {
      this.running = true;
      this.pausedForChoice = false;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    tap() {
      if (
        !this.running ||
        this.pausedForChoice ||
        this.winAnnounced ||
        this.loseAnnounced
      )
        return;
      const now = performance.now();
      const delta = now - this.lastTapAt;
      const isSpam = delta > 0 && delta < 95;
      const isRhythm = delta >= 125 && delta <= 280;
      const efficiency = isSpam ? 0.42 : isRhythm ? 1.12 : 0.9;

      this.tapEnergy = Math.min(
        this.tapEnergy + this.config.tapBoost * efficiency,
        260,
      );
      this.tapFatigue = Math.min(1, this.tapFatigue + (isSpam ? 0.17 : 0.07));
      this.timeSinceTap = 0;
      this.lastTapAt = now;
    }

    loop(timestamp) {
      if (!this.running) return;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05) || 0.016;
      this.lastTime = timestamp;

      if (!this.pausedForChoice && !this.winAnnounced && !this.loseAnnounced) {
        this.update(dt);
      }

      this.draw();
      if (this.running) requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      this.timeSinceTap += dt;
      this.tapEnergy = Math.max(
        0,
        this.tapEnergy - this.config.tapDecayPerSecond * dt,
      );
      this.tapFatigue = Math.max(0, this.tapFatigue - 0.15 * dt);

      const progress = Utils.clamp(this.hero.x / this.config.finishX, 0, 1);
      const gap = this.hero.x - this.chaser.x;
      const pressure = Utils.clamp((640 - gap) / 640, 0, 1);
      const leadPenalty = Utils.clamp((gap - 520) / 520, 0, 1);
      const noTapPenalty =
        this.timeSinceTap > 0.8
          ? Math.min((this.timeSinceTap - 0.8) * 120, 115)
          : 0;
      const fatiguePenalty = this.tapFatigue * 46;
      const heroSpeed = Math.max(
        112,
        this.config.heroBaseSpeed +
          this.tapEnergy -
          noTapPenalty -
          fatiguePenalty -
          (progress > 0.82 ? (progress - 0.82) * 90 : 0),
      );

      let chaserSpeed =
        this.config.chaserBaseSpeed +
        progress * 18 +
        pressure * 42 +
        leadPenalty * 26;

      if (this.activeObstacle) {
        this.activeObstacle.timeLeft -= dt;
        if (this.activeObstacle.timeLeft <= 0) {
          this.activeObstacle = null;
        } else {
          chaserSpeed *= this.activeObstacle.slowMultiplier;
        }
      }

      this.hero.x += heroSpeed * dt;
      this.chaser.x += chaserSpeed * dt;
      this.viewportX = Utils.clamp(
        this.hero.x - 480,
        0,
        this.config.worldLength - this.config.width,
      );
      this.heroAnimTime += heroSpeed * dt * 0.016;
      this.chaserAnimTime += chaserSpeed * dt * 0.014;

      this.config.checkpoints.forEach((checkpoint, index) => {
        if (
          !this.triggeredCheckpoints.has(index) &&
          progress >= checkpoint &&
          index >= this.itemsUsed
        ) {
          this.pauseForItemChoice(index);
        }
      });

      if (this.hero.x >= this.config.finishX) {
        this.win();
        return;
      }

      if (gap <= this.config.loseDistance) {
        this.lose();
      }

      this.updateHud();
    }

    pauseForItemChoice(index) {
      this.pausedForChoice = true;
      this.triggeredCheckpoints.add(index);
      this.hooks.onPauseForItemChoice(
        APP_CONFIG.itemPrompt,
        APP_CONFIG.items,
        (item) => {
          this.applyItem(item);
        },
      );
    }

    applyItem(item) {
      this.itemsUsed += 1;
      this.activeObstacle = {
        ...item,
        timeLeft: item.duration,
        anchorX: this.chaser.x + 460,
      };
      this.pausedForChoice = false;
      this.timeSinceTap = 0.35;
      this.hooks.onResumeFromChoice();
    }

    lose() {
      if (this.loseAnnounced) return;
      this.loseAnnounced = true;
      this.running = false;
      this.hooks.onLose();
    }

    win() {
      if (this.winAnnounced) return;
      this.winAnnounced = true;
      this.running = false;
      this.hooks.onWin();
    }

    updateHud() {
      const progress = Utils.clamp(
        (this.hero.x / this.config.finishX) * 100,
        0,
        100,
      );
      const gap = this.hero.x - this.chaser.x;
      this.hooks.onHudUpdate(progress, gap);
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.hasConfiguredLayers()) {
        this.drawConfiguredLayers();
      } else {
        const backgroundImage = this.getAsset("gameplayBackground");
        if (backgroundImage) {
          this.drawBackgroundImage(backgroundImage);
        } else {
          this.drawSky();
          this.drawFarWorld();
          this.drawMidWorld();
          this.drawGround();
        }
      }

      if (this.activeObstacle) this.drawObstacle(this.activeObstacle);
      this.drawCharacters();

      if (!this.hasConfiguredLayers() && !this.getAsset("gameplayBackground")) {
        this.drawForeground();
      }
    }

    drawConfiguredLayers() {
      (this.config.layers || []).forEach((layer) => {
        const image = this.getAsset(`layer:${layer.id}`);
        if (!image) return;

        const speed = typeof layer.speed === "number" ? layer.speed : 0;
        const repeatX = layer.repeatX !== false;
        const drawWidth = layer.width || image.naturalWidth;
        const drawHeight = layer.height || image.naturalHeight;
        const y = typeof layer.y === "number" ? layer.y : 0;
        const extraOffsetX =
          typeof layer.offsetX === "number" ? layer.offsetX : 0;

        if (!repeatX) {
          const x = Math.round(-this.viewportX * speed + extraOffsetX);
          this.ctx.drawImage(image, x, y, drawWidth, drawHeight);
          return;
        }

        const startX =
          -((this.viewportX * speed - extraOffsetX) % drawWidth) - drawWidth;
        for (
          let x = startX;
          x < this.canvas.width + drawWidth;
          x += drawWidth
        ) {
          this.ctx.drawImage(image, Math.round(x), y, drawWidth, drawHeight);
        }
      });
    }

    drawBackgroundImage(image) {
      const ctx = this.ctx;
      const canvasRatio = this.canvas.width / this.canvas.height;
      const imageRatio = image.naturalWidth / image.naturalHeight;

      let drawWidth;
      let drawHeight;
      let dx;
      let dy;

      if (imageRatio > canvasRatio) {
        drawHeight = this.canvas.height;
        drawWidth = drawHeight * imageRatio;
        dx = (this.canvas.width - drawWidth) / 2;
        dy = 0;
      } else {
        drawWidth = this.canvas.width;
        drawHeight = drawWidth / imageRatio;
        dx = 0;
        dy = (this.canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
    }

    wx(x) {
      return x - this.viewportX;
    }

    drawSky() {
      const ctx = this.ctx;
      const gradient = ctx.createLinearGradient(0, 0, 0, 500);
      gradient.addColorStop(0, "#89d0ff");
      gradient.addColorStop(1, "#d9f0ff");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, 560);

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 7; i++) {
        const x = (i * 310 - this.viewportX * 0.18) % 2200;
        const y = 90 + (i % 3) * 55;
        this.drawCloud(x, y, 1 + (i % 2) * 0.25);
      }
    }

    drawCloud(x, y, s) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.arc(x, y, 42 * s, 0, Math.PI * 2);
      ctx.arc(x + 44 * s, y - 12 * s, 36 * s, 0, Math.PI * 2);
      ctx.arc(x + 90 * s, y, 46 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    drawFarWorld() {
      const ctx = this.ctx;
      ctx.fillStyle = "#8bb783";
      for (let i = 0; i < 8; i++) {
        const baseX = (i * 360 - this.viewportX * 0.24) % 2500;
        ctx.beginPath();
        ctx.moveTo(baseX, 520);
        ctx.quadraticCurveTo(baseX + 140, 390 - (i % 3) * 35, baseX + 300, 520);
        ctx.closePath();
        ctx.fill();
      }

      for (let i = 0; i < 6; i++) {
        const x = this.wx(i * 1500 + 820);
        ctx.fillStyle = "#d6c188";
        ctx.fillRect(x, 390, 28, 120);
        ctx.fillStyle = "#9c6a2c";
        ctx.beginPath();
        ctx.moveTo(x - 55, 408);
        ctx.lineTo(x + 14, 338);
        ctx.lineTo(x + 82, 408);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawMidWorld() {
      const ctx = this.ctx;
      ctx.fillStyle = "#73a6dd";
      for (let i = 0; i < 5; i++) {
        const x = (i * 680 - this.viewportX * 0.42 + 200) % 2800;
        ctx.beginPath();
        ctx.moveTo(x, 760);
        ctx.quadraticCurveTo(x + 80, 710, x + 180, 740);
        ctx.quadraticCurveTo(x + 260, 760, x + 340, 720);
        ctx.quadraticCurveTo(x + 410, 700, x + 520, 760);
        ctx.lineTo(x + 520, 790);
        ctx.lineTo(x, 790);
        ctx.closePath();
        ctx.fill();
      }

      this.decorSeed.forEach((tree, i) => {
        const x = this.wx(tree.x);
        const y = tree.y;
        ctx.fillStyle = "#64421f";
        ctx.fillRect(x + 10, y, 15, tree.h);
        ctx.fillStyle = i % 4 === 0 ? "#2f6c34" : "#3b7d3f";
        ctx.beginPath();
        ctx.arc(x + 18, y - 10, 34, 0, Math.PI * 2);
        ctx.arc(x + 45, y + 8, 30, 0, Math.PI * 2);
        ctx.arc(x - 8, y + 12, 28, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    drawGround() {
      const ctx = this.ctx;
      const gradient = ctx.createLinearGradient(0, 770, 0, this.canvas.height);
      gradient.addColorStop(0, "#95c668");
      gradient.addColorStop(1, "#4e7f39");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 760, this.canvas.width, 320);

      ctx.fillStyle = "#d2ba75";
      ctx.beginPath();
      ctx.moveTo(0, 822);
      for (let x = 0; x <= this.canvas.width; x += 120) {
        ctx.quadraticCurveTo(x + 50, 815 + ((x / 120) % 2) * 12, x + 120, 822);
      }
      ctx.lineTo(this.canvas.width, 940);
      ctx.lineTo(0, 940);
      ctx.closePath();
      ctx.fill();
    }

    drawObstacle(obstacle) {
      const x = this.wx(obstacle.anchorX);
      const ctx = this.ctx;
      const sprite = this.getAsset(`item:${obstacle.id}`);

      if (sprite) {
        this.drawItemSprite(sprite, obstacle);
        return;
      }

      if (obstacle.obstacleType === "forest") {
        for (let i = 0; i < 10; i++) {
          const tx = x + i * 34;
          ctx.fillStyle = "#56351a";
          ctx.fillRect(tx + 10, 705, 14, 110);
          ctx.fillStyle = "#1f5e29";
          ctx.beginPath();
          ctx.moveTo(tx - 18, 735);
          ctx.lineTo(tx + 18, 650);
          ctx.lineTo(tx + 56, 735);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(tx - 10, 700);
          ctx.lineTo(tx + 18, 628);
          ctx.lineTo(tx + 44, 700);
          ctx.closePath();
          ctx.fill();
        }
      } else if (obstacle.obstacleType === "mountains") {
        ctx.fillStyle = "#8d95a6";
        for (let i = 0; i < 4; i++) {
          const mx = x + i * 120;
          ctx.beginPath();
          ctx.moveTo(mx, 810);
          ctx.lineTo(mx + 100, 560 + (i % 2) * 60);
          ctx.lineTo(mx + 210, 810);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.42)";
          ctx.beginPath();
          ctx.moveTo(mx + 76, 610 + (i % 2) * 60);
          ctx.lineTo(mx + 100, 560 + (i % 2) * 60);
          ctx.lineTo(mx + 124, 610 + (i % 2) * 60);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#8d95a6";
        }
      } else if (obstacle.obstacleType === "river") {
        const gradient = ctx.createLinearGradient(x, 700, x + 520, 840);
        gradient.addColorStop(0, "#6bd7ff");
        gradient.addColorStop(1, "#2e83e9");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x, 760);
        ctx.bezierCurveTo(x + 140, 710, x + 250, 860, x + 520, 760);
        ctx.lineTo(x + 520, 860);
        ctx.lineTo(x, 860);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawItemSprite(image, obstacle) {
      const spriteLayout = this.config.spriteLayout || {};
      const legacyKey =
        obstacle.id === "brush"
          ? "itemBrush"
          : obstacle.id === "comb"
            ? "itemComb"
            : obstacle.id === "towel"
              ? "itemTowel"
              : "";

      const layout =
        spriteLayout[obstacle.id] ||
        (legacyKey ? spriteLayout[legacyKey] : {}) ||
        {};
      const width = layout.width || 120;
      const height = layout.height || 120;
      const offsetX = layout.offsetX || 160;
      const offsetY = layout.offsetY || 610;

      this.ctx.save();
      this.ctx.globalAlpha = 0.96;
      this.ctx.drawImage(
        image,
        this.wx(obstacle.anchorX) + offsetX,
        offsetY,
        width,
        height,
      );
      this.ctx.restore();
    }

    drawCharacters() {
      this.drawHeroPair(this.wx(this.hero.x), this.hero.y);
      this.drawChasers(this.wx(this.chaser.x), this.chaser.y);
    }

    drawHeroPair(x, y) {
      const ivanImage = this.getAsset("heroIvan");
      const vasilisaImage = this.getAsset("heroVasilisa");

      if (ivanImage || vasilisaImage) {
        if (vasilisaImage) {
          this.drawSpriteFromLayout(
            vasilisaImage,
            x,
            y,
            "heroVasilisa",
            this.heroAnimTime,
          );
        } else {
          this.drawSimpleRunner(
            -22 + x,
            y,
            "#b94141",
            "#f5dbbd",
            false,
            this.heroAnimTime,
          );
        }

        if (ivanImage) {
          this.drawSpriteFromLayout(
            ivanImage,
            x,
            y,
            "heroIvan",
            this.heroAnimTime + 0.35,
          );
        } else {
          this.drawSimpleRunner(
            32 + x,
            y - 8,
            "#406ed4",
            "#f5dbbd",
            true,
            this.heroAnimTime + 0.7,
          );
        }
        return;
      }

      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      this.drawSimpleRunner(
        -22,
        0,
        "#b94141",
        "#f5dbbd",
        false,
        this.heroAnimTime,
      );
      this.drawSimpleRunner(
        32,
        -8,
        "#406ed4",
        "#f5dbbd",
        true,
        this.heroAnimTime + 0.7,
      );
      ctx.restore();
    }

    drawSpriteFromLayout(image, anchorX, anchorY, layoutKey, animSeed = 0) {
      const layout = (this.config.spriteLayout || {})[layoutKey] || {};
      const width = layout.width || image.naturalWidth;
      const height = layout.height || image.naturalHeight;
      const offsetX = layout.offsetX || 0;
      const offsetY = layout.offsetY || 0;
      const bobSize = typeof layout.bob === "number" ? layout.bob : 6;
      const bob = Math.sin(animSeed * 1.7) * bobSize;

      this.ctx.drawImage(
        image,
        anchorX + offsetX - width / 2,
        anchorY + offsetY + bob,
        width,
        height,
      );
    }

    drawSimpleRunner(x, y, cloth, skin, dress = false, animSeed = 0) {
      const ctx = this.ctx;
      const swing = Math.sin(animSeed) * 10;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, -82, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cloth;
      ctx.fillRect(-18, -58, 36, 60);
      if (dress) {
        ctx.beginPath();
        ctx.moveTo(-30, -8);
        ctx.lineTo(0, 48);
        ctx.lineTo(30, -8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "#3f2a18";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-20, 50 + swing);
      ctx.moveTo(10, 2);
      ctx.lineTo(24, 52 - swing);
      ctx.moveTo(-16, -44);
      ctx.lineTo(-38, -10 - swing * 0.45);
      ctx.moveTo(16, -44);
      ctx.lineTo(38, -12 + swing * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    drawChasers(x, y) {
      const mainImage = this.getAsset("chaserMain");
      const leftImage = this.getAsset("chaserLeft");
      const rightImage = this.getAsset("chaserRight");

      if (mainImage || leftImage || rightImage) {
        if (leftImage) {
          this.drawSpriteFromLayout(
            leftImage,
            x,
            y,
            "chaserLeft",
            this.chaserAnimTime + 0.5,
          );
        } else {
          this.drawSimpleRider(
            x - 76,
            y + 8,
            "#704024",
            this.chaserAnimTime + 0.5,
          );
        }

        if (mainImage) {
          this.drawSpriteFromLayout(
            mainImage,
            x,
            y,
            "chaserMain",
            this.chaserAnimTime,
          );
        } else {
          this.drawSimpleRider(x, y, "#6a2220", this.chaserAnimTime);
        }

        if (rightImage) {
          this.drawSpriteFromLayout(
            rightImage,
            x,
            y,
            "chaserRight",
            this.chaserAnimTime + 1.0,
          );
        } else {
          this.drawSimpleRider(
            x + 76,
            y + 8,
            "#704024",
            this.chaserAnimTime + 1.0,
          );
        }
        return;
      }

      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, y);
      this.drawSimpleRider(0, 0, "#6a2220", this.chaserAnimTime);
      this.drawSimpleRider(-76, 8, "#704024", this.chaserAnimTime + 0.5);
      this.drawSimpleRider(76, 8, "#704024", this.chaserAnimTime + 1.0);
      ctx.restore();
    }

    drawSimpleRider(x, y, cloth, animSeed = 0) {
      const ctx = this.ctx;
      const bob = Math.sin(animSeed) * 6;
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.fillStyle = "#5b3a1a";
      ctx.beginPath();
      ctx.ellipse(0, 20, 50, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-45, 12, 16, 34);
      ctx.fillRect(28, 12, 16, 34);
      ctx.fillStyle = "#f2cfaf";
      ctx.beginPath();
      ctx.arc(0, -52, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cloth;
      ctx.fillRect(-16, -36, 32, 42);
      ctx.restore();
    }

    drawForeground() {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(26, 77, 31, 0.45)";
      for (let i = 0; i < 14; i++) {
        const x = (i * 170 - this.viewportX * 0.9) % 2500;
        ctx.beginPath();
        ctx.moveTo(x, 1080);
        ctx.quadraticCurveTo(x + 40, 920, x + 80, 1080);
        ctx.fill();
      }
    }
  }

  window.FairytaleRunGame = FairytaleRunGame;
})();
