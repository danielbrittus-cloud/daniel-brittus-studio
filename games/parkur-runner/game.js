(() => {
  "use strict";

  const WORLD_W = 1376;
  const WORLD_H = 768;
  const CHUNK_W = 1376;
  const PLAYER_SCREEN_X = 224;
  const RUNNER_FRAME_W = 333;
  const RUNNER_FRAME_H = 186;
  const RUNNER_COLUMNS = 5;
  const JUMP_VELOCITY = -860;
  const RISE_GRAVITY = 1900;
  const FALL_GRAVITY = 3200;
  const STAND_HEIGHT = 150;
  const SLIDE_HEIGHT = 46;
  const SLIDE_HITBOX_H = 30;
  const SLIDE_LOCKED_FRAME = "slide_5";
  const SLIDE_SPRITE_W = 310;
  const SLIDE_SPRITE_H = 108;
  const SLIDE_SPRITE_GROUND_OFFSET = 22;
  const TOP_LAND_TOLERANCE = 16;
  const SAFE_EDGE = 220;
  const MIN_ROOF_W = 360;
  const MAX_ROOF_GAP = 96;
  const BASE_SPEED = 390;
  const MAX_SPEED = 910;
  const RAMP_SLIDE_BOOST = 330;
  const FLOW_DISTANCE = 24000;
  const HARDEN_DISTANCE = 64000;
  const STORAGE_KEY = "parkur-runner-rank";
  const LEGACY_STORAGE_KEY = "urban-shadow-run-rank";
  const BACKGROUND_FILES = ["fundo.jpeg", "fundo2.jpeg", "fundo3.jpeg", "fundo4.jpeg", "fundo5.jpeg", "fundo6.jpeg"];
  const MUSIC_FILES = [
    "musica1.mp3",
    "musica2.mp3",
    "musica3.mp3",
    "musica4.mp3",
    "musica5.mp3",
    "musica6.mp3",
    "musica7.mp3",
    "musica8.mp3",
    "musica9.mp3",
    "musica10.mp3",
  ];

  const hudScore = document.getElementById("score");
  const hudSpeed = document.getElementById("speed");
  const hudBest = document.getElementById("best");
  const shell = document.getElementById("shell");
  const panel = document.getElementById("panel");
  const gameOverPanel = document.getElementById("gameOver");
  const finalScore = document.getElementById("finalScore");
  const startButton = document.getElementById("startButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const restartButton = document.getElementById("restartButton");

  const VISUAL_PROGRESS_STEP = 620;
  const districts = [
    { name: "CIANO", color: 0x73e4ff, accent: 0xffd35c },
    { name: "OURO", color: 0xffd35c, accent: 0x73e4ff },
    { name: "ROSA", color: 0xff5d7a, accent: 0x73e4ff },
    { name: "VERDE", color: 0x8df58a, accent: 0xff5d7a },
    { name: "VIOLETA", color: 0xb47cff, accent: 0xffd35c },
    { name: "AZUL", color: 0x4f8dff, accent: 0xffffff },
    { name: "BRANCO", color: 0xffffff, accent: 0x73e4ff },
    { name: "LARANJA", color: 0xff8b3d, accent: 0x8df58a },
  ];

  const runtime = {
    scene: null,
    mode: "boot",
    finalScore: 0,
    scoreSaved: false,
    ready: false,
  };

  const musicPlayer = {
    audio: null,
    lastTrack: "",
    active: false,
    start() {
      this.active = true;
      if (this.audio && !this.audio.paused) return;
      this.playNext();
    },
    pause() {
      this.active = false;
      if (this.audio) this.audio.pause();
    },
    playNext() {
      if (!this.active || MUSIC_FILES.length === 0) return;
      let next = MUSIC_FILES[Math.floor(Math.random() * MUSIC_FILES.length)];
      if (MUSIC_FILES.length > 1) {
        while (next === this.lastTrack) {
          next = MUSIC_FILES[Math.floor(Math.random() * MUSIC_FILES.length)];
        }
      }
      this.lastTrack = next;
      if (this.audio) {
        this.audio.pause();
        this.audio.src = "";
      }
      this.audio = new Audio(next);
      this.audio.volume = 0.42;
      this.audio.preload = "auto";
      const audio = this.audio;
      const jumpToRandomMoment = () => {
        if (this.audio !== audio) return;
        const duration = audio.duration;
        if (!Number.isFinite(duration) || duration <= 24) return;
        const introSkip = duration > 80 ? 8 : 0;
        const outroGuard = Math.min(26, duration * 0.22);
        const maxStart = Math.max(introSkip, duration - outroGuard);
        audio.currentTime = introSkip + Math.random() * Math.max(1, maxStart - introSkip);
      };
      this.audio.addEventListener("loadedmetadata", jumpToRandomMoment, { once: true });
      this.audio.addEventListener("ended", () => this.playNext(), { once: true });
      this.audio.play().catch(() => {
        this.active = false;
      });
    },
  };

  class RunnerScene extends Phaser.Scene {
    constructor() {
      super("runner");
      this.distance = 0;
      this.speed = BASE_SPEED;
      this.score = 0;
      this.nextChunkX = 0;
      this.slideHeld = false;
      this.jumpQueued = false;
      this.frameClock = 0;
      this.lastFrame = "";
      this.chunks = [];
      this.platforms = [];
      this.obstacles = [];
      this.pickups = [];
      this.player = null;
      this.flow = 0;
      this.currentDistrictIndex = 0;
      this.toastTimer = null;
      this.fireworks = [];
      this.fireworkTimer = 0.9;
      this.lastRoofY = 540;
      this.screenGesture = null;
    }

    preload() {
      setStatus("carregando assets");
      this.load.setPath("");
      BACKGROUND_FILES.forEach((file, index) => {
        this.load.image(`bg${index}`, file);
      });
      this.load.image("runnerSheet", "atlas_man.png");
      this.load.on("loaderror", (file) => {
        showBootError(`asset falhou: ${file?.key || file?.src || "desconhecido"}`);
      });
    }

    create() {
      try {
        runtime.scene = this;
        runtime.ready = true;
        setStatus("pronto");

        this.registerRunnerFrames();
        this.cameras.main.setBounds(0, 0, 200000, WORLD_H);

        this.currentBackgroundIndex = 0;
        this.bg = this.add.tileSprite(0, 0, WORLD_W, WORLD_H, "bg0").setOrigin(0).setScrollFactor(0);
        this.worldGraphics = this.add.graphics().setScrollFactor(0);
        this.fx = this.add.graphics().setScrollFactor(0);

        this.playerSprite = this.add.sprite(0, 0, "runnerSheet", "run_0").setOrigin(0.5, 1);
        this.playerSprite.setDepth(20);
        this.playerSprite.setDisplaySize(258, 144);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,S,SPACE");
        this.input.on("pointerdown", (pointer) => this.beginScreenGesture(pointer));
        this.input.on("pointermove", (pointer) => this.updateScreenGesture(pointer));
        this.input.on("pointerup", (pointer) => this.endScreenGesture(pointer));
        this.input.on("pointerupoutside", (pointer) => this.endScreenGesture(pointer));

        this.resetWorld();
        runtime.mode = "menu";
        updateHud(0, this.speed);
      } catch (error) {
        showBootError(error?.message || String(error));
      }
    }

    registerRunnerFrames() {
      const texture = this.textures.get("runnerSheet");
      if (!texture || texture.has("run_0")) return;

      const addFrame = (name, index) => {
        const x = (index % RUNNER_COLUMNS) * RUNNER_FRAME_W;
        const y = Math.floor(index / RUNNER_COLUMNS) * RUNNER_FRAME_H;
        texture.add(name, 0, x, y, RUNNER_FRAME_W, RUNNER_FRAME_H);
      };

      for (let i = 0; i < 17; i += 1) addFrame(`run_${i}`, i);
      [20, 21, 22, 23, 25, 26, 27, 28, 30, 31, 32, 33].forEach((index, i) => addFrame(`slide_${i}`, index));
      for (let i = 0; i < 17; i += 1) addFrame(`jump_${i}`, 35 + i);
    }

    resetWorld() {
      this.distance = 0;
      this.speed = BASE_SPEED;
      this.score = 0;
      this.flow = 0;
      this.currentDistrictIndex = 0;
      this.nextChunkX = 0;
      this.fireworks = [];
      this.fireworkTimer = 0.9;
      this.lastRoofY = 540;
      this.slideHeld = false;
      this.jumpQueued = false;
      this.frameClock = 0;
      this.lastFrame = "";
      this.chunks = [];
      this.platforms = [];
      this.obstacles = [];
      this.pickups = [];
      this.player = {
        y: 390,
        vy: 0,
        w: 78,
        h: STAND_HEIGHT,
        previousBottom: 540,
        grounded: false,
        groundSlope: 0,
        sliding: 0,
      };

      this.addChunk(true);
      this.addChunk(false);
      this.addChunk(false);
      this.cameras.main.scrollX = 0;
      this.chooseBackground();
      this.bg.tilePositionX = 0;
      this.placePlayerSprite();
      this.drawWorld();
    }

    chooseBackground() {
      if (!this.bg || BACKGROUND_FILES.length === 0) return;
      let nextIndex = Phaser.Math.Between(0, BACKGROUND_FILES.length - 1);
      if (BACKGROUND_FILES.length > 1) {
        while (nextIndex === this.currentBackgroundIndex) {
          nextIndex = Phaser.Math.Between(0, BACKGROUND_FILES.length - 1);
        }
      }
      this.currentBackgroundIndex = nextIndex;
      this.bg.setTexture(`bg${nextIndex}`);
    }

    startRun() {
      runtime.mode = "running";
      runtime.finalScore = 0;
      runtime.scoreSaved = false;
      this.resetWorld();
      musicPlayer.start();
      updateHud(this.score, this.speed);
    }

    pauseForMenu() {
      runtime.mode = "menu";
      musicPlayer.pause();
    }

    addChunk(first) {
      const startX = this.nextChunkX;
      this.chunks.push({ x: startX, seed: Math.floor(Math.random() * 10000) });
      const platforms = first ? this.makeIntroRoofs(startX) : this.makeProceduralRoofs(startX);
      platforms.forEach((platform) => this.platforms.push(platform));
      this.populateRoofChunk(platforms, first);

      this.nextChunkX += CHUNK_W;
    }

    makeIntroRoofs(startX) {
      return [
        { kind: "flat", x: startX, y: 555, y2: 555, w: 760, h: 260, accent: 0 },
        { kind: "ramp", x: startX + 848, y: 548, y2: 594, w: 528, h: 280, accent: 1 },
      ];
    }

    makeProceduralRoofs(startX) {
      const roofs = [];
      const challenge = this.challengeAtX(startX);
      const calm = 1 - challenge;
      let localX = Phaser.Math.Between(0, challenge < 0.35 ? 22 : 48);
      let lastY = Phaser.Math.Clamp(this.lastRoofY + Phaser.Math.Between(-34, 22), 430, 585);
      const roofCount = Phaser.Math.Between(3, challenge < 0.45 ? 4 : 5);
      const rampSlots = new Set();
      if (Math.random() < 0.9 - challenge * 0.22) {
        rampSlots.add(Phaser.Math.Between(1, roofCount - 1));
      }
      if (challenge < 0.55 && roofCount > 3 && Math.random() < 0.42) {
        rampSlots.add(Phaser.Math.Between(2, roofCount - 1));
      }

      for (let i = 0; i < roofCount && localX <= CHUNK_W - MIN_ROOF_W; i += 1) {
        const isRamp = rampSlots.has(i);
        const width = isRamp
          ? Phaser.Math.Between(Math.round(560 + calm * 80), Math.round(710 + calm * 130))
          : Phaser.Math.Between(MIN_ROOF_W + Math.round(calm * 70), i === 0 ? 690 : 620);
        const yMin = i < 2 ? Math.round(-48 - challenge * 34) : Math.round(-30 - challenge * 24);
        const yMax = i < 2 ? Math.round(28 + challenge * 12) : Math.round(48 + challenge * 18);
        const y = Phaser.Math.Clamp(lastY + Phaser.Math.Between(yMin, yMax), 415, 590);
        const rampDrop = Phaser.Math.Between(Math.round(62 + challenge * 18), Math.round(116 + challenge * 32));
        const y2 = isRamp ? Phaser.Math.Clamp(y + rampDrop, 475, 610) : y;
        const remaining = CHUNK_W - localX;
        const clampedWidth = remaining < MIN_ROOF_W ? 0 : Math.min(width, remaining);
        if (clampedWidth < MIN_ROOF_W) break;
        roofs.push({
          kind: isRamp ? "ramp" : "flat",
          x: startX + localX,
          y,
          y2,
          w: clampedWidth,
          h: WORLD_H - Math.min(y, y2) + 80,
          accent: Phaser.Math.Between(0, 2),
        });
        lastY = y2;
        localX += clampedWidth + Phaser.Math.Between(Math.round(28 + challenge * 36), Math.round(82 + challenge * 76));
      }

      if (roofs.length === 0 || roofs[roofs.length - 1].x + roofs[roofs.length - 1].w < startX + CHUNK_W - 300) {
        const y = Phaser.Math.Clamp(lastY + Phaser.Math.Between(-28, 42), 455, 595);
        const width = Phaser.Math.Between(MIN_ROOF_W + Math.round((1 - challenge) * 60), 560);
        const lastEnd = roofs.length ? roofs[roofs.length - 1].x + roofs[roofs.length - 1].w : startX;
        const x = Math.max(
          startX + CHUNK_W - width,
          lastEnd + Phaser.Math.Between(Math.round(36 + challenge * 28), Math.round(96 + challenge * 40))
        );
        if (x + width <= startX + CHUNK_W) {
          roofs.push({
            kind: "flat",
            x,
            y,
            y2: y,
            w: width,
            h: WORLD_H - y + 80,
            accent: Phaser.Math.Between(0, 2),
          });
        }
      }

      if (roofs.length) {
        this.keepRoofsJumpable(roofs, startX, challenge);
        this.lastRoofY = roofs[roofs.length - 1].y2;
      }
      return roofs;
    }

    keepRoofsJumpable(roofs, startX, challenge) {
      const maxGap = Math.round(MAX_ROOF_GAP + challenge * 18);
      const chunkEnd = startX + CHUNK_W;
      roofs.sort((a, b) => a.x - b.x);

      for (let i = 1; i < roofs.length; i += 1) {
        const previous = roofs[i - 1];
        const current = roofs[i];
        const previousEnd = previous.x + previous.w;
        const gap = current.x - previousEnd;
        if (gap <= maxGap) continue;

        current.x = previousEnd + maxGap;
        if (current.x + current.w > chunkEnd) {
          current.w = Math.max(MIN_ROOF_W, chunkEnd - current.x);
        }
      }

      const last = roofs[roofs.length - 1];
      const safeEnd = chunkEnd - Math.round(maxGap * 0.55);
      if (last.x + last.w < safeEnd) {
        last.w = Math.min(chunkEnd - last.x, last.w + safeEnd - (last.x + last.w));
      }
    }

    challengeAtX(worldX) {
      return Phaser.Math.Clamp((worldX - FLOW_DISTANCE) / (HARDEN_DISTANCE - FLOW_DISTANCE), 0, 1);
    }

    populateRoofChunk(platforms, first) {
      platforms.forEach((platform, index) => {
        if (platform.kind === "ramp") {
          this.populateRampPickups(platform, first);
          return;
        }

        const safeLeft = platform.x + (first && index === 0 ? 780 : SAFE_EDGE);
        const safeRight = platform.x + platform.w - SAFE_EDGE;
        const usable = safeRight - safeLeft;
        const challenge = this.challengeAtX(platform.x);
        const obstacleChance = 0.05 + challenge * 0.34;

        if (usable > 160 && challenge > 0 && (!first || index > 0) && Math.random() < obstacleChance) {
          const type = Math.random() < 0.72 - challenge * 0.18 ? "beam" : "crate";
          const w = type === "beam" ? 112 : Phaser.Math.Between(56, 76);
          const h = type === "beam" ? 68 : w;
          const x = Phaser.Math.Between(Math.round(safeLeft), Math.round(safeRight - w));
          this.obstacles.push({
            type,
            x,
            y: type === "beam" ? platform.y - 150 : platform.y - h,
            w,
            h,
            passed: false,
          });
        }

        const pickupCount = Phaser.Math.Between(3, 5);
        const start = platform.x + Math.min(platform.w - 90, 110);
        for (let i = 0; i < pickupCount; i += 1) {
          const x = start + i * 44;
          if (x > platform.x + platform.w - 60 || (first && x < platform.x + 690)) continue;
          this.pickups.push({
            x,
            y: platform.y - 76 - Math.sin(i * 0.8) * 20,
            r: 12,
            phase: i * 0.7,
            taken: false,
          });
        }
      });
    }

    populateRampPickups(platform, first) {
      if (first) return;
      const count = Phaser.Math.Between(6, 10);
      for (let i = 0; i < count; i += 1) {
        const t = (i + 1) / (count + 1);
        const x = platform.x + platform.w * t;
        this.pickups.push({
          x,
          y: this.surfaceYAt(platform, x) - 76 - Math.sin(i * 0.9) * 12,
          r: 12,
          phase: i * 0.7,
          taken: false,
        });
      }
    }

    update(_time, deltaMs) {
      const dt = Math.min(0.033, Math.max(0, deltaMs / 1000 || 0));

      if (runtime.mode === "running") {
        this.updateRun(dt);
      }

      this.cameras.main.scrollX = this.distance;
      this.bg.tilePositionX = this.distance * 0.11;
      this.updateFireworks(dt);
      this.drawWorld();
      this.placePlayerSprite();
    }

    updateRun(dt) {
      const warmup = Phaser.Math.Clamp(this.distance / FLOW_DISTANCE, 0, 1);
      const latePush = Phaser.Math.Clamp((this.distance - FLOW_DISTANCE) / (HARDEN_DISTANCE - FLOW_DISTANCE), 0, 1);
      const acceleration = 2.4 + warmup * 4.8 + latePush * 18;
      this.speed = Math.min(this.currentSpeedLimit(), this.speed + dt * acceleration);
      this.distance += this.speed * dt;

      this.handleInput();
      this.updatePlayer(dt);
      this.updateCollectables();
      this.trimWorld();

      this.score += (this.speed * dt) / 8;
      this.flow = Math.max(0, this.flow - dt * 7);
      updateHud(this.score, this.speed);

      if (this.player.y > WORLD_H + 220) {
        this.finishRun();
      }
    }

    handleInput() {
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
        this.jumpQueued;
      this.jumpQueued = false;

      if (this.cursors.down.isDown || this.keys.S.isDown) {
        this.slideHeld = true;
      }

      if (jumpPressed && this.player.grounded) {
        this.player.vy = JUMP_VELOCITY;
        this.player.grounded = false;
        this.makeBurst(this.distance + PLAYER_SCREEN_X + 32, this.player.y + this.player.h, 0x73e4ff, 12);
      }
    }

    updatePlayer(dt) {
      const wantsSlide = this.slideHeld && this.player.grounded;
      const previousHeight = this.player.h;
      const nextHeight = wantsSlide ? SLIDE_HEIGHT : STAND_HEIGHT;
      if (previousHeight !== nextHeight && this.player.grounded) {
        this.player.y += previousHeight - nextHeight;
      }
      this.player.h = nextHeight;
      this.player.sliding = wantsSlide ? 0.2 : Math.max(0, this.player.sliding - dt);

      const previousBottom = this.player.y + this.player.h;
      const wasGrounded = this.player.grounded;
      this.player.previousBottom = previousBottom;
      this.player.vy += (this.player.vy > 0 ? FALL_GRAVITY : RISE_GRAVITY) * dt;
      this.player.y += this.player.vy * dt;
      this.player.grounded = false;
      this.player.groundSlope = 0;

      const worldX = this.distance + PLAYER_SCREEN_X;
      const feetX1 = worldX + 22;
      const feetX2 = worldX + this.player.w - 14;
      const footCenter = worldX + this.player.w * 0.5;

      for (const platform of this.platforms) {
        const overlapsX = feetX2 > platform.x && feetX1 < platform.x + platform.w;
        const surfaceY = this.surfaceYAt(platform, footCenter);
        const currentBottom = this.player.y + this.player.h;
        const crossedTop = previousBottom <= surfaceY + 22 && currentBottom >= surfaceY;
        const stickyRamp = wasGrounded && currentBottom >= surfaceY - 58 && currentBottom <= surfaceY + 34;
        if (overlapsX && (crossedTop || stickyRamp) && this.player.vy >= 0) {
          this.player.y = surfaceY - this.player.h;
          this.player.vy = 0;
          this.player.grounded = true;
          this.player.groundSlope = this.surfaceSlope(platform);
          if (platform.kind === "ramp" && this.slideHeld && this.player.groundSlope > 0) {
            this.speed = Math.min(this.currentSpeedLimit() + 55, this.speed + this.player.groundSlope * RAMP_SLIDE_BOOST * dt);
            this.addFlow(16 * dt);
            if (Math.random() < 0.34) {
              this.makeSpark(this.distance + PLAYER_SCREEN_X + 18, surfaceY - 4, districtFor(this.score).current.color);
            }
          }
          break;
        }
      }
    }

    currentSpeedLimit() {
      const warmup = Phaser.Math.Clamp(this.distance / FLOW_DISTANCE, 0, 1);
      const latePush = Phaser.Math.Clamp((this.distance - FLOW_DISTANCE) / (HARDEN_DISTANCE - FLOW_DISTANCE), 0, 1);
      return BASE_SPEED + warmup * 120 + latePush * (MAX_SPEED - BASE_SPEED - 120);
    }

    surfaceYAt(platform, worldX) {
      if (platform.kind !== "ramp") return platform.y;
      const t = Phaser.Math.Clamp((worldX - platform.x) / platform.w, 0, 1);
      return platform.y + (platform.y2 - platform.y) * t;
    }

    surfaceSlope(platform) {
      if (platform.kind !== "ramp") return 0;
      return (platform.y2 - platform.y) / platform.w;
    }

    updateCollectables() {
      const hitbox = this.playerHitbox();

      for (const obstacle of this.obstacles) {
        if (this.landOnObstacle(obstacle)) {
          obstacle.passed = true;
          continue;
        }

        if (rectsOverlap(hitbox, obstacle)) {
          this.makeBurst(hitbox.x + hitbox.w / 2, hitbox.y + hitbox.h / 2, districtFor(this.score).current.accent, 24);
          this.finishRun();
          return;
        }

        if (!obstacle.passed && obstacle.x + obstacle.w < hitbox.x) {
          obstacle.passed = true;
          this.score += 55;
          this.addFlow(12);
        }
      }

      for (const pickup of this.pickups) {
        if (pickup.taken) continue;
        const dx = pickup.x - (hitbox.x + hitbox.w / 2);
        const dy = pickup.y - (hitbox.y + hitbox.h / 2);
        if (Math.hypot(dx, dy) < 58) {
          pickup.taken = true;
          this.score += 90;
          this.addFlow(18);
          this.makeBurst(pickup.x, pickup.y, districtFor(this.score).current.accent, 12);
        }
      }
    }

    addFlow(amount) {
      this.flow = Math.min(100, this.flow + amount);
    }

    updateFireworks(dt) {
      if (runtime.mode === "running") {
        this.fireworkTimer -= dt;
        if (this.fireworkTimer <= 0) {
          this.spawnFirework();
          this.fireworkTimer = Phaser.Math.FloatBetween(0.55, 1.45);
        }
      }

      this.fireworks.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 18 * dt;
        particle.life -= dt;
      });
      this.fireworks = this.fireworks.filter((particle) => particle.life > 0);
    }

    spawnFirework() {
      const district = districtFor(this.score).current;
      const x = Phaser.Math.Between(690, 1280);
      const y = Phaser.Math.Between(78, 310);
      const amount = Phaser.Math.Between(12, 22);
      for (let i = 0; i < amount; i += 1) {
        const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.28;
        const speed = Phaser.Math.Between(26, 86);
        this.fireworks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Phaser.Math.FloatBetween(0.42, 0.88),
          size: Phaser.Math.FloatBetween(1.5, 3.8),
          color: Math.random() > 0.35 ? district.color : district.accent,
        });
      }
    }

    drawFireworks(graphics) {
      this.fireworks.forEach((particle) => {
        graphics.fillStyle(particle.color, Math.max(0, particle.life));
        graphics.fillCircle(particle.x, particle.y, particle.size);
      });
    }

    landOnObstacle(obstacle) {
      if (this.player.vy < 0) return false;

      const currentBottom = this.player.y + this.player.h;
      const previousBottom = this.player.previousBottom ?? currentBottom;
      const worldX = this.distance + PLAYER_SCREEN_X;
      const feetX1 = worldX + 18;
      const feetX2 = worldX + this.player.w - 10;
      const overlapsFeet = feetX2 > obstacle.x + 8 && feetX1 < obstacle.x + obstacle.w - 8;
      const crossedTop =
        previousBottom <= obstacle.y + TOP_LAND_TOLERANCE &&
        currentBottom >= obstacle.y &&
        currentBottom <= obstacle.y + 36;

      if (!overlapsFeet || !crossedTop) return false;

      this.player.y = obstacle.y - this.player.h;
      this.player.vy = 0;
      this.player.grounded = true;
      return true;
    }

    playerHitbox() {
      const worldX = this.distance + PLAYER_SCREEN_X;
      const sliding = this.player.h < 120;
      const bottom = this.player.y + this.player.h;
      return {
        x: worldX + (sliding ? 0 : 30),
        y: sliding ? bottom - SLIDE_HITBOX_H : this.player.y + 12,
        w: sliding ? 154 : 72,
        h: sliding ? SLIDE_HITBOX_H : 132,
      };
    }

    trimWorld() {
      const keepFrom = this.distance - 760;
      this.chunks = this.chunks.filter((chunk) => {
        return chunk.x + CHUNK_W > keepFrom;
      });
      this.platforms = this.platforms.filter((item) => item.x + item.w > keepFrom);
      this.obstacles = this.obstacles.filter((item) => item.x + item.w > keepFrom);
      this.pickups = this.pickups.filter((item) => !item.taken && item.x + 40 > keepFrom);

      let guard = 0;
      while (this.nextChunkX < this.distance + WORLD_W * 2.1 && guard < 6) {
        this.addChunk(false);
        guard += 1;
      }
    }

    placePlayerSprite() {
      if (!this.playerSprite || !this.player) return;
      const action = this.player.h < 120 ? "slide" : this.player.grounded ? "run" : "jump";
      const frames = action === "slide" ? 12 : 17;
      const rate = action === "run" ? this.speed / 38 : 18;
      if (action !== "slide") {
        this.frameClock += rate * (1 / 60);
      }
      const frame = action === "slide" ? SLIDE_LOCKED_FRAME : `${action}_${Math.floor(this.frameClock) % frames}`;
      if (frame !== this.lastFrame) {
        this.playerSprite.setFrame(frame);
        this.lastFrame = frame;
      }
      this.playerSprite.setDisplaySize(action === "slide" ? SLIDE_SPRITE_W : 258, action === "slide" ? SLIDE_SPRITE_H : 144);
      this.playerSprite.x = this.distance + PLAYER_SCREEN_X + (action === "slide" ? 64 : 47);
      this.playerSprite.y = this.player.y + this.player.h + (action === "slide" ? SLIDE_SPRITE_GROUND_OFFSET : 0);
    }

    triggerMilestone(name) {
      this.makeBurst(this.distance + PLAYER_SCREEN_X + 56, this.player.y + this.player.h - 70, districtFor(this.score).current.color, 26);
      this.addFlow(35);
    }

    drawWorld() {
      const g = this.worldGraphics;
      g.clear();
      const districtInfo = districtFor(this.score);
      const district = districtInfo.current;
      const accentColor = district.accent || 0xffd35c;
      const districtLevel = Math.min(6, districtInfo.index);
      const flowAlpha = 0.08 + (this.flow / 100) * 0.2;
      g.fillStyle(district.color, flowAlpha);
      g.fillCircle(PLAYER_SCREEN_X + 52, this.player.y + this.player.h - 70, 62 + this.flow * 0.42);
      this.drawFireworks(g);

      const streakAlpha = 0.08 + (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED) * 0.16 + this.flow / 700;
      g.lineStyle(2, district.color, streakAlpha);
      for (let i = 0; i < 10; i += 1) {
        const y = 118 + i * 46 + Math.sin(this.time.now * 0.0016 + i) * 12;
        const x = ((-this.distance * 0.32 + i * 137) % 420) - 160;
        g.lineBetween(x, y, x + 132 + this.flow * 0.9, y);
      }

      for (const platform of this.platforms) {
        const x = platform.x - this.distance;
        if (x > WORLD_W + 100 || x + platform.w < -100) continue;
        const isRamp = platform.kind === "ramp";
        const y1 = platform.y;
        const y2 = platform.y2 ?? platform.y;
        const topY = Math.min(y1, y2);

        g.fillStyle(0x050507, 1);
        if (isRamp) {
          g.beginPath();
          g.moveTo(x, y1);
          g.lineTo(x + platform.w, y2);
          g.lineTo(x + platform.w, WORLD_H + 90);
          g.lineTo(x, WORLD_H + 90);
          g.closePath();
          g.fillPath();
        } else {
          g.fillRect(x, platform.y, platform.w, platform.h);
        }

        g.fillStyle(district.color, 0.035 + districtLevel * 0.012);
        if (isRamp) {
          g.beginPath();
          g.moveTo(x, y1 + 10);
          g.lineTo(x + platform.w, y2 + 10);
          g.lineTo(x + platform.w, WORLD_H + 90);
          g.lineTo(x, WORLD_H + 90);
          g.closePath();
          g.fillPath();
        } else {
          g.fillRect(x, platform.y + 10, platform.w, platform.h);
        }

        g.fillStyle(district.color, 0.62);
        if (isRamp) {
          g.lineStyle(4, district.color, 0.72);
          g.lineBetween(x, y1, x + platform.w, y2);
          g.lineStyle(2, accentColor, 0.5);
          g.lineBetween(x + 22, y1 + 9, x + platform.w - 22, y2 + 9);
        } else {
          g.fillRect(x, platform.y, platform.w, 3);
          g.fillStyle(accentColor, 0.48);
          g.fillRect(x + 18, platform.y + 7, Math.max(0, platform.w - 36), 2);
        }

        if (districtLevel >= 1) {
          g.fillStyle(district.color, 0.1 + districtLevel * 0.015);
          g.fillRect(x, topY + 16, platform.w, 12);
        }

        if (districtLevel >= 2) {
          g.lineStyle(2, district.color, 0.24);
          const rows = Math.min(5, 2 + districtLevel);
          for (let row = 0; row < rows; row += 1) {
            const yy = topY + 58 + row * 46;
            if (yy > WORLD_H) break;
            g.lineBetween(x + 18, yy, x + platform.w - 18, yy + (row % 2 ? -8 : 8));
          }
        }

        g.fillStyle(0x0c1117, 0.72);
        const windowGap = Math.max(34, 62 - districtLevel * 4);
        for (let wx = x + 32 + platform.accent * 10; wx < x + platform.w - 30; wx += windowGap) {
          const glow = districtLevel >= 3 && Math.floor((wx + topY) / 50) % 3 === 0;
          g.fillStyle(glow ? district.color : 0x0c1117, glow ? 0.34 : 0.72);
          g.fillRect(wx, topY + 54, 18, 42);
          if (districtLevel >= 4) {
            g.fillRect(wx + 4, topY + 128, 14, 36);
          }
        }

        if (districtLevel >= 3) {
          g.fillStyle(accentColor, 0.38);
          for (let sx = x + 34; sx < x + platform.w - 28; sx += 94) {
            const surfaceY = isRamp ? this.surfaceYAt(platform, this.distance + sx) : platform.y;
            g.fillRect(sx, surfaceY - 9, 38, 5);
          }
        }

        if (platform.w > 410) {
          g.fillStyle(0x050507, 1);
          g.fillRect(x + platform.w - 70, topY - 42, 8, 42);
          g.fillRect(x + platform.w - 86, topY - 46, 40, 5);
          if (districtLevel >= 5) {
            g.lineStyle(2, district.color, 0.62);
            g.lineBetween(x + platform.w - 66, topY - 42, x + platform.w - 42, topY - 74);
            g.lineBetween(x + platform.w - 62, topY - 42, x + platform.w - 91, topY - 68);
          }
        }
      }

      for (const obstacle of this.obstacles) {
        const x = obstacle.x - this.distance;
        if (x > WORLD_W + 140 || x + obstacle.w < -140) continue;
        g.fillStyle(0x050506, 1);
        g.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
        g.lineStyle(3, obstacle.type === "beam" ? district.color : accentColor, 0.75);
        g.strokeRect(x + 4, obstacle.y + 4, obstacle.w - 8, obstacle.h - 8);
        if (obstacle.type === "beam") {
          g.fillStyle(accentColor, 0.78);
          g.fillRect(x - 8, obstacle.y + obstacle.h - 6, obstacle.w + 16, 5);
        } else {
          g.lineBetween(x + 10, obstacle.y + obstacle.h - 10, x + obstacle.w - 10, obstacle.y + 10);
        }
      }

      for (const pickup of this.pickups) {
        const x = pickup.x - this.distance;
        if (x > WORLD_W + 80 || x < -80) continue;
        const pulse = Math.sin(this.time.now * 0.008 + pickup.phase) * 0.25 + 0.78;
        g.fillStyle(accentColor, 0.17);
        g.fillCircle(x, pickup.y, 42 * pulse);
        g.fillStyle(accentColor, 1);
        g.fillCircle(x, pickup.y, pickup.r * pulse);
      }

      g.fillStyle(0x000000, 0.18);
      g.fillRect(0, 0, WORLD_W, 82);
      g.fillStyle(district.color, 0.12);
      g.fillRect(0, WORLD_H - 4, WORLD_W, 4);
    }

    makeBurst(x, y, color, amount) {
      for (let i = 0; i < amount; i += 1) {
        const dot = this.add.rectangle(x, y, 4 + Math.random() * 6, 4 + Math.random() * 6, color).setDepth(30);
        this.tweens.add({
          targets: dot,
          x: x + Phaser.Math.Between(-90, 90),
          y: y + Phaser.Math.Between(-80, 80),
          alpha: 0,
          duration: 300 + Math.random() * 260,
          ease: "Cubic.easeOut",
          onComplete: () => dot.destroy(),
        });
      }
    }

    makeSpark(x, y, color) {
      const dot = this.add.rectangle(x, y, 4, 4, color).setDepth(28);
      this.tweens.add({
        targets: dot,
        x: x - Phaser.Math.Between(40, 92),
        y: y + Phaser.Math.Between(-12, 20),
        alpha: 0,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => dot.destroy(),
      });
    }

    queueJump() {
      this.jumpQueued = true;
    }

    setSlide(active) {
      this.slideHeld = active;
    }

    beginScreenGesture(pointer) {
      if (runtime.mode !== "running") return;
      this.screenGesture = {
        id: pointer.id,
        x: pointer.x,
        y: pointer.y,
        handled: false,
        sliding: false,
        pointerType: pointer.event?.pointerType || "mouse",
      };
    }

    updateScreenGesture(pointer) {
      const gesture = this.screenGesture;
      if (!gesture || gesture.id !== pointer.id || runtime.mode !== "running") return;

      const dx = pointer.x - gesture.x;
      const dy = pointer.y - gesture.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = isLikelyMobile() ? 34 : 44;
      if (gesture.handled || absY < threshold || absY < absX * 1.12) return;

      gesture.handled = true;
      if (dy < 0) {
        this.queueJump();
      } else {
        gesture.sliding = true;
        this.setSlide(true);
      }
    }

    endScreenGesture(pointer) {
      const gesture = this.screenGesture;
      if (!gesture || gesture.id !== pointer.id) return;

      if (gesture.sliding) {
        this.setSlide(false);
      } else if (!gesture.handled && gesture.pointerType === "mouse" && runtime.mode === "running") {
        this.queueJump();
      }
      this.screenGesture = null;
    }

    finishRun() {
      if (runtime.mode !== "running") return;
      runtime.mode = "over";
      runtime.finalScore = Math.max(0, Math.floor(this.score));
      finalScore.textContent = runtime.finalScore.toLocaleString("pt-BR");
      if (!runtime.scoreSaved) {
        addRanking(runtime.finalScore);
        runtime.scoreSaved = true;
      }
      gameOverPanel.classList.add("is-visible");
      launchCelebration();
      musicPlayer.pause();
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function loadRanking() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => {
          const score = typeof entry === "number" ? entry : entry?.score;
          const cleanScore = Math.floor(Number(score));
          return { score: Number.isFinite(cleanScore) ? cleanScore : 0 };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  function saveRanking(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 8)));
  }

  function bestScore() {
    return loadRanking()[0]?.score || 0;
  }

  function districtFor(score) {
    const safeScore = Math.max(0, Number(score) || 0);
    const index = Math.floor(safeScore / VISUAL_PROGRESS_STEP);
    const paletteIndex = index % districts.length;
    const current = districts[paletteIndex];
    const next = districts[(paletteIndex + 1) % districts.length];
    const progress = clampNumber((safeScore % VISUAL_PROGRESS_STEP) / VISUAL_PROGRESS_STEP, 0, 1);
    return { current, next, index, progress };
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function addRanking(score) {
    const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
    if (cleanScore <= 0) return;
    const entries = loadRanking();
    entries.push({ score: cleanScore });
    entries.sort((a, b) => b.score - a.score);
    saveRanking(entries);
  }

  function updateHud(score, speed) {
    const district = districtFor(score);
    const scene = runtime.scene;

    if (scene && runtime.mode === "running" && district.index > scene.currentDistrictIndex) {
      scene.currentDistrictIndex = district.index;
      scene.triggerMilestone(district.current.name);
    }

    hudScore.textContent = Math.floor(score).toLocaleString("pt-BR");
    hudSpeed.textContent = `${(speed / BASE_SPEED).toFixed(1)}x`;
    hudBest.textContent = Math.max(bestScore(), Math.floor(score)).toLocaleString("pt-BR");
  }

  async function startGame(options = {}) {
    if (!runtime.scene || !runtime.ready) {
      setStatus("aguardando phaser");
      return;
    }
    if (options.fullscreen || isLikelyMobile()) {
      await enterFullscreenLandscape();
    }
    panel.classList.remove("is-visible");
    gameOverPanel.classList.remove("is-visible");
    clearCelebration();
    runtime.scene.startRun();
  }

  function bindDomControls() {
    startButton?.addEventListener("click", () => startGame({ fullscreen: isLikelyMobile() }));
    fullscreenButton?.addEventListener("click", () => startGame({ fullscreen: true }));
    restartButton?.addEventListener("click", () => startGame({ fullscreen: isLikelyMobile() }));

    window.addEventListener("keyup", (event) => {
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        runtime.scene?.setSlide(false);
      }
    });
  }

  function clearCelebration() {
    const layer = document.getElementById("celebrationLayer");
    if (layer) layer.innerHTML = "";
  }

  function isLikelyMobile() {
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
  }

  async function enterFullscreenLandscape() {
    const target = shell || document.documentElement;
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
        if (requestFullscreen) {
          await requestFullscreen.call(target);
        }
      }
    } catch {
      // Alguns navegadores mobile só permitem fullscreen em modos específicos.
    }

    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch {
      // iOS/Safari pode ignorar o lock; a tela cheia ainda melhora a experiência.
    }
  }

  function launchCelebration() {
    const layer = document.getElementById("celebrationLayer");
    if (!layer) return;

    layer.innerHTML = "";
    const colors = ["#73e4ff", "#ffd35c", "#ff5d7a", "#ffffff"];

    for (let i = 0; i < 52; i += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 420}ms`;
      piece.style.setProperty("--drift", `${Phaser.Math.Between(-140, 140)}px`);
      piece.style.setProperty("--spin", `${Phaser.Math.Between(260, 720)}deg`);
      layer.append(piece);
    }

    for (let i = 0; i < 7; i += 1) {
      const firework = document.createElement("b");
      firework.className = "screen-firework";
      firework.style.left = `${Phaser.Math.Between(12, 88)}%`;
      firework.style.top = `${Phaser.Math.Between(12, 60)}%`;
      firework.style.color = colors[i % colors.length];
      firework.style.animationDelay = `${i * 150}ms`;
      layer.append(firework);
    }
  }

  function boot() {
    if (!window.Phaser) {
      showBootError("phaser.min.js nao carregou");
      return;
    }

    setStatus("iniciando phaser");
    new Phaser.Game({
      type: Phaser.CANVAS,
      parent: "gameRoot",
      width: WORLD_W,
      height: WORLD_H,
      backgroundColor: "#05070b",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "gameRoot",
        width: WORLD_W,
        height: WORLD_H,
      },
      scene: RunnerScene,
    });
  }

  function setStatus(message) {
    window.__urbanRunnerStatus = message;
    const label = panel.querySelector(".eyebrow");
    if (label) label.textContent = message;
  }

  function showBootError(message) {
    runtime.mode = "error";
    const title = panel.querySelector("h1");
    if (title) title.textContent = "Erro no jogo";
    setStatus(message || "erro desconhecido");
    panel.classList.add("is-visible");
  }

  bindDomControls();
  window.addEventListener("error", (event) => showBootError(event.message));
  window.addEventListener("unhandledrejection", (event) => showBootError(event.reason?.message || String(event.reason)));
  hudBest.textContent = bestScore().toLocaleString("pt-BR");
  boot();
})();
