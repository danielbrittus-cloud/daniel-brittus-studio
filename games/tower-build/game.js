const WORLD_WIDTH = 1800;
const GROUND_Y = 840;
const WORLD_TOP = GROUND_Y - 40000;
const BLOCK_WIDTH = 168;
const BLOCK_HEIGHT = 94;
const BLOCK_STACK_STEP = 88;
const STORAGE_KEY = 'tower-build-ranking-v1';
const RESPAWN_DELAY_MS = 170;
const TOWER_COLLAPSE_TILT = 0.9;
const CABLE_LOCAL_X = -128;
const HOUSE_CABLE_GAP = 44;
const CAMERA_TOWER_TOP_RATIO = 0.68;
const CAMERA_CRANE_CLEARANCE = 260;
const CAMERA_DROP_LEAD = 170;
const DYNAMIC_SETTLED_BLOCKS = 2;
const ARCADE_DROP_SPEED = 1380;
const MIN_LANDING_OVERLAP = 0.18;
const SOUND_STORAGE_KEY = 'tower-build-muted-v1';
let hasStartedOnce = false;

const ENCOURAGEMENT_MILESTONES = [
  { height: 120, title: 'Voce pegou o ritmo!', subtitle: 'continue subindo' },
  { height: 260, title: 'Voce esta indo bem!', subtitle: 'a cidade ficou pequena' },
  { height: 460, title: 'Voce e fera!', subtitle: 'a torre esta viva' },
  { height: 720, title: 'Sequencia bonita!', subtitle: 'mira no encaixe perfeito' },
  { height: 1040, title: 'Altitude absurda!', subtitle: 'o vento esta contra voce' },
  { height: 1420, title: 'Nao olha pra baixo!', subtitle: 'a estratosfera vem ai' },
  { height: 1840, title: 'Reta final pro espaco!', subtitle: 'fase boss chegando' },
  { height: 2260, title: 'Voce chegou na Lua!', subtitle: 'agora e outro jogo' },
  { height: 3000, title: 'Lenda da torre!', subtitle: 'so os fortes chegam aqui' },
  { height: 3800, title: 'Infinito desbloqueado!', subtitle: 'vai buscar o recorde' }
];

const HOUSE_ASSETS = [
  { key: 'house-1', url: 'casa_1.png' },
  { key: 'house-2', url: 'casa_2.png' },
  { key: 'house-3', url: 'casa_3.png' },
  { key: 'house-4', url: 'casa_4.png' },
  { key: 'house-5', url: 'casa_5.png' }
];

const WORLD_LAYER_ASSETS = [
  { key: 'crane-tower', url: 'guindaste.png' },
  { key: 'crane-cable', url: 'cabo_guindaste.png' },
  { key: 'cloud', url: 'nuvem.png' },
  { key: 'buildings', url: 'predios.png' },
  { key: 'plane', url: 'aviao.png' },
  { key: 'moon', url: 'lua.png' },
  { key: 'mars', url: 'marte.png' },
  { key: 'jupiter', url: 'jupiter.png' },
  { key: 'saturn', url: 'saturno.png' }
];

const WEATHER_STAGES = [
  { id: 'site', label: 'Canteiro', weather: 'calmo', minHeight: 0, wind: 0, requiredOverlap: 0.18, dropDrift: 0, swingSpeed: 0, swingRange: 0, skyTop: 0x8bd7f5, skyBottom: 0xdff7ff },
  { id: 'buildings', label: 'Predios', weather: 'brisa', minHeight: 180, wind: 0.00025, requiredOverlap: 0.2, dropDrift: 0, swingSpeed: 0.12, swingRange: 10, skyTop: 0x81cbed, skyBottom: 0xd8f4ff },
  { id: 'tall-buildings', label: 'Predios altos', weather: 'chuva', minHeight: 380, wind: 0.00065, requiredOverlap: 0.24, dropDrift: 18, swingSpeed: 0.28, swingRange: 20, skyTop: 0x6f96b6, skyBottom: 0xb9d3e3 },
  { id: 'clouds', label: 'Nuvens', weather: 'vento', minHeight: 640, wind: 0.0011, requiredOverlap: 0.27, dropDrift: 34, swingSpeed: 0.48, swingRange: 36, skyTop: 0x76bce6, skyBottom: 0xe2f8ff },
  { id: 'high-clouds', label: 'Nuvens altas', weather: 'turbulencia', minHeight: 920, wind: 0.00165, requiredOverlap: 0.3, dropDrift: 52, swingSpeed: 0.7, swingRange: 54, skyTop: 0x4d93cf, skyBottom: 0xcceeff, plane: true },
  { id: 'orange-sky', label: 'Ceu alaranjado', weather: 'gelo', minHeight: 1240, wind: 0.0013, requiredOverlap: 0.33, dropDrift: 28, swingSpeed: 0.86, swingRange: 64, skyTop: 0xf28c52, skyBottom: 0xfbd17a },
  { id: 'purple-sky', label: 'Ceu roxo', weather: 'ar rarefeito', minHeight: 1580, wind: 0.0019, requiredOverlap: 0.36, dropDrift: 58, swingSpeed: 1.08, swingRange: 82, skyTop: 0x3c2578, skyBottom: 0xa25aa4 },
  { id: 'space', label: 'Espaco', weather: 'boss', minHeight: 1960, wind: 0.0023, requiredOverlap: 0.4, dropDrift: 74, swingSpeed: 1.34, swingRange: 105, skyTop: 0x070b1e, skyBottom: 0x171b46 },
  { id: 'moon', label: 'Lua', weather: 'orbita', minHeight: 2260, wind: 0.0019, requiredOverlap: 0.42, dropDrift: 84, swingSpeed: 1.5, swingRange: 118, skyTop: 0x050711, skyBottom: 0x111733 },
  { id: 'mars', label: 'Marte', weather: 'poeira', minHeight: 2600, wind: 0.0021, requiredOverlap: 0.44, dropDrift: 92, swingSpeed: 1.68, swingRange: 130, skyTop: 0x18090d, skyBottom: 0x4a1b22 },
  { id: 'jupiter', label: 'Jupiter', weather: 'gravidade', minHeight: 3000, wind: 0.00235, requiredOverlap: 0.46, dropDrift: 105, swingSpeed: 1.86, swingRange: 145, skyTop: 0x080611, skyBottom: 0x201130 },
  { id: 'saturn', label: 'Saturno', weather: 'aneis', minHeight: 3440, wind: 0.00255, requiredOverlap: 0.48, dropDrift: 118, swingSpeed: 2.05, swingRange: 160, skyTop: 0x04050d, skyBottom: 0x17131f }
];

const FALLBACK_WORLD_LAYERS = {
  layers: [
    { id: 'city-buildings', key: 'buildings', x: 900, y: 880, originX: 0.5, originY: 1, displayWidth: 1800, depth: -11, parallax: 0.74, alpha: 0.95, maxHeight: 520 },
    { id: 'city-cloud-left', key: 'cloud', x: 190, y: 270, scale: 0.42, depth: -13, parallax: 0.42, alpha: 0.92, sway: 8 },
    { id: 'city-cloud-right', key: 'cloud', x: 920, y: 180, scale: 0.36, depth: -13, parallax: 0.38, alpha: 0.86, sway: -6 },
    { id: 'high-cloud-a', key: 'cloud', x: 330, y: -520, scale: 0.34, depth: -14, parallax: 0.33, alpha: 0.72, sway: 12 },
    { id: 'high-cloud-b', key: 'cloud', x: 830, y: -940, scale: 0.5, depth: -14, parallax: 0.28, alpha: 0.65, sway: -10 },
    { id: 'thin-air-cloud', key: 'cloud', x: 600, y: -1480, scale: 0.7, depth: -15, parallax: 0.2, alpha: 0.38, sway: 5 },
    { id: 'sunset-cloud-left', key: 'cloud', x: 230, y: -2320, scale: 0.46, depth: -15, parallax: 0.16, alpha: 0.28, sway: 7, minHeight: 900, maxHeight: 1700 },
    { id: 'sunset-cloud-right', key: 'cloud', x: 1010, y: -2760, scale: 0.62, depth: -15, parallax: 0.13, alpha: 0.24, sway: -8, minHeight: 1050, maxHeight: 1850 },
    { id: 'moon-space', key: 'moon', x: 850, y: -4050, scale: 0.38, depth: -16, alpha: 0.95 },
    { id: 'mars-space', key: 'mars', x: 330, y: -4910, scale: 0.32, depth: -17, alpha: 0.92 },
    { id: 'jupiter-space', key: 'jupiter', x: 1060, y: -5770, scale: 0.36, depth: -18, alpha: 0.94 },
    { id: 'saturn-space', key: 'saturn', x: 650, y: -6630, scale: 0.38, depth: -19, alpha: 0.95 }
  ]
};

class Hud {
  constructor() {
    this.scoreValue = document.querySelector('#score-value');
    this.heightValue = document.querySelector('#height-value');
    this.comboValue = document.querySelector('#combo-value');
    this.weatherLabel = document.querySelector('#weather-label');
    this.weatherValue = document.querySelector('#weather-value');
    this.ranking = document.querySelector('#ranking');
    this.rankingList = document.querySelector('#ranking-list');
    this.rankingToggle = document.querySelector('#ranking-toggle');
    this.message = document.querySelector('#message');
    this.gameOver = document.querySelector('#game-over');
    this.gameOverTitle = document.querySelector('#game-over-title');
    this.gameOverReason = document.querySelector('#game-over-reason');
    this.restartButton = document.querySelector('#restart-button');
    this.startMenu = document.querySelector('#start-menu');
    this.startButton = document.querySelector('#start-button');
    this.muteButton = document.querySelector('#mute-button');
    this.menuRankingList = document.querySelector('#menu-ranking-list');

    this.rankingToggle?.addEventListener('click', () => {
      const collapsed = this.ranking?.classList.toggle('collapsed');
      this.rankingToggle.textContent = collapsed ? 'Mostrar' : 'Ocultar';
      this.rankingToggle.setAttribute('aria-expanded', String(!collapsed));
    });

    this.restartButton.addEventListener('click', () => window.dispatchEvent(new CustomEvent('tower-build-restart')));
    this.startButton?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('tower-build-start')));
    this.muteButton?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('tower-build-toggle-sound')));
    this.gameOver.addEventListener('click', (event) => {
      if (event.target === this.gameOver) {
        window.dispatchEvent(new CustomEvent('tower-build-restart'));
      }
    });
  }

  updateScore(snapshot) {
    this.scoreValue.textContent = snapshot.score.toLocaleString('pt-BR');
    this.heightValue.textContent = `${Math.floor(snapshot.height)} m`;
    this.comboValue.textContent = `x${snapshot.combo}`;
  }

  updateWeather(stage) {
    this.weatherLabel.textContent = stage.label;
    this.weatherValue.textContent = stage.weather;
  }

  updateRanking(entries) {
    if (!this.rankingList) {
      return;
    }

    [this.rankingList, this.menuRankingList].filter(Boolean).forEach((list) => {
      list.innerHTML = '';

      if (entries.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'Sem jogadas ainda';
        list.appendChild(empty);
        return;
      }

      entries.slice(0, 5).forEach((entry) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${entry.score.toLocaleString('pt-BR')}</strong><span>${Math.floor(entry.height)} m</span>`;
        list.appendChild(item);
      });
    });
  }

  flashMessage(text) {
    this.message.textContent = text;
    this.message.classList.remove('pop');
    window.requestAnimationFrame(() => this.message.classList.add('pop'));
  }

  showGameOver(title, reason) {
    this.gameOverTitle.textContent = title;
    this.gameOverReason.textContent = reason;
    this.gameOver.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOver.classList.add('hidden');
  }

  showStartMenu() {
    this.startMenu?.classList.remove('hidden');
  }

  hideStartMenu() {
    this.startMenu?.classList.add('hidden');
  }

  updateSoundButton(muted) {
    if (!this.muteButton) {
      return;
    }

    this.muteButton.textContent = muted ? 'Som desligado' : 'Som ligado';
    this.muteButton.setAttribute('aria-pressed', String(muted));
  }
}

class RankingStore {
  get entries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return [];
      }

      return JSON.parse(raw)
        .filter((entry) => Number.isFinite(entry.score) && Number.isFinite(entry.height))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  saveScore(score, height) {
    const entries = [
      ...this.entries,
      { score, height, date: new Date().toLocaleDateString('pt-BR') }
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      return entries;
    }

    return entries;
  }
}

class ScoreSystem {
  constructor(ranking) {
    this.ranking = ranking;
    this.score = 0;
    this.combo = 0;
    this.maxHeight = 0;
  }

  registerDrop(precision, height) {
    const clampedPrecision = Phaser.Math.Clamp(precision, 0, 1);
    const perfect = clampedPrecision > 0.88;
    this.combo = perfect ? this.combo + 1 : 0;
    this.maxHeight = Math.max(this.maxHeight, height);

    this.score += Math.round(Math.max(1, height) * 0.15) + Math.round(100 * clampedPrecision) + this.combo * 35;
    this.ranking.saveScore(this.score, this.maxHeight);
    return this.snapshot;
  }

  updateHeight(height) {
    this.maxHeight = Math.max(this.maxHeight, height);
    return this.snapshot;
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxHeight = 0;
    return this.snapshot;
  }

  get snapshot() {
    return {
      score: this.score,
      height: this.maxHeight,
      combo: this.combo
    };
  }
}

class AudioSystem {
  constructor() {
    this.context = null;
    this.muted = this.getStoredMuted();
  }

  getStoredMuted() {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  async unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    this.context = new AudioContextClass();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      return;
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name) {
    if (this.muted || !this.context) {
      return;
    }

    const sounds = {
      start: [[330, 0.03, 0.1], [495, 0.08, 0.12], [660, 0.16, 0.16]],
      drop: [[148, 0, 0.09]],
      land: [[92, 0, 0.08], [184, 0.04, 0.07]],
      perfect: [[440, 0, 0.08], [660, 0.07, 0.08], [880, 0.14, 0.12]],
      stage: [[392, 0, 0.07], [523, 0.05, 0.1], [784, 0.12, 0.18]],
      gameover: [[180, 0, 0.12], [116, 0.1, 0.18]]
    };

    (sounds[name] || sounds.land).forEach(([frequency, delay, duration]) => {
      this.tone(frequency, delay, duration, name === 'gameover' ? 'sawtooth' : 'sine');
    });
  }

  tone(frequency, delay, duration, type) {
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }
}

class WorldLayerSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.layers = (config.layers || []).map((layer, index) => {
      const image = scene.add.image(layer.x, layer.y, layer.key);
      image.setOrigin(layer.originX ?? 0.5, layer.originY ?? 0.5);
      image.setDepth(layer.depth ?? -10);
      image.setAlpha(layer.alpha ?? 1);
      image.setScrollFactor(1);

      if (layer.displayWidth) {
        image.displayWidth = layer.displayWidth;
        image.scaleY = image.scaleX;
      } else if (layer.displayHeight) {
        image.displayHeight = layer.displayHeight;
        image.scaleX = image.scaleY;
      } else {
        image.setScale(layer.scale ?? 1);
      }

      return {
        image,
        baseX: layer.x,
        baseAlpha: layer.alpha ?? 1,
        sway: layer.sway ?? 0,
        phase: index * 0.73,
        destroyed: false,
        everVisible: false
      };
    });
  }

  update(height, time) {
    const camera = this.scene.cameras.main;
    const margin = 420;
    const viewTop = camera.scrollY - margin;
    const viewBottom = camera.scrollY + camera.height + margin;

    for (const layer of this.layers) {
      if (layer.destroyed) {
        continue;
      }

      const halfHeight = layer.image.displayHeight * 0.5;
      const layerTop = layer.image.y - halfHeight;
      const layerBottom = layer.image.y + halfHeight;
      const inViewportBand = layerBottom >= viewTop && layerTop <= viewBottom;
      layer.everVisible = layer.everVisible || inViewportBand;

      if (layer.everVisible && layerTop > viewBottom) {
        layer.image.destroy();
        layer.destroyed = true;
        continue;
      }

      layer.image.visible = inViewportBand;
      layer.image.alpha = layer.baseAlpha;

      if (layer.sway !== 0) {
        layer.image.x = layer.baseX + Math.sin(time * 0.00045 + layer.phase) * layer.sway;
      }
    }
  }
}

class GameScene extends Phaser.Scene {
  constructor(hud) {
    super('game');
    this.hud = hud;
    this.ranking = new RankingStore();
    this.score = new ScoreSystem(this.ranking);
    this.blocks = [];
    this.nextHouseIndex = 0;
    this.anchor = new Phaser.Math.Vector2(WORLD_WIDTH / 2, 210);
    this.swingPhase = 0;
    this.bestTowerY = GROUND_Y;
    this.currentHeight = 0;
    this.cameraLeadY = GROUND_Y;
    this.towerInstability = 0;
    this.isGameOver = false;
    this.settledTowerBaseY = GROUND_Y;
    this.nextEncouragementIndex = 0;
    this.restartHandler = () => this.restartGame();
    this.startHandler = () => this.startRun();
    this.soundToggleHandler = () => this.toggleSound();
    this.audio = new AudioSystem();
    this.waitingForStart = true;
    this.lastViewportWidth = 0;
    this.lastViewportHeight = 0;
  }

  preload() {
    HOUSE_ASSETS.forEach((asset) => this.load.image(asset.key, asset.url));
    WORLD_LAYER_ASSETS.forEach((asset) => this.load.image(asset.key, asset.url));
  }

  create() {
    this.resetRunState();
    this.sky = this.add.graphics().setScrollFactor(0).setDepth(-20);
    this.cityLayer = this.add.graphics().setDepth(-10);
    this.groundLayer = this.add.graphics().setDepth(-7);
    this.createBackdrop();
    this.worldLayers = new WorldLayerSystem(this, FALLBACK_WORLD_LAYERS);
    this.cameras.main.setBounds(0, WORLD_TOP, WORLD_WIDTH, GROUND_Y - WORLD_TOP + this.scale.height);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.centerOn(WORLD_WIDTH / 2, GROUND_Y - 310);
    this.createCrane();
    this.createParticles();
    this.createScreenFx();
    this.createPlane();
    this.createWeatherFx();

    this.currentStage = this.getStage(0);
    this.applyStage(this.currentStage);
    this.lastViewportWidth = this.scale.width;
    this.lastViewportHeight = this.scale.height;
    this.hud.hideGameOver();
    if (hasStartedOnce) {
      this.waitingForStart = false;
      this.hud.hideStartMenu();
    } else {
      this.hud.showStartMenu();
    }
    this.hud.updateSoundButton(this.audio.muted);
    this.hud.updateScore(this.score.snapshot);
    this.hud.updateWeather(this.currentStage);
    this.hud.updateRanking(this.ranking.entries);

    this.spawnCarriedBlock();
    this.input.on('pointerdown', () => (this.isGameOver ? this.restartGame() : this.dropBlock()));
    this.input.keyboard.on('keydown-SPACE', () => (this.isGameOver ? this.restartGame() : this.dropBlock()));
    this.input.keyboard.on('keydown-R', () => this.restartGame());
    window.addEventListener('tower-build-restart', this.restartHandler);
    window.addEventListener('tower-build-start', this.startHandler);
    window.addEventListener('tower-build-toggle-sound', this.soundToggleHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  resetRunState() {
    this.score.reset();
    this.blocks = [];
    this.activeBlock = undefined;
    this.carriedBlock = undefined;
    this.nextHouseIndex = 0;
    this.anchor = new Phaser.Math.Vector2(WORLD_WIDTH / 2, 210);
    this.swingPhase = 0;
    this.bestTowerY = GROUND_Y;
    this.currentHeight = 0;
    this.cameraLeadY = GROUND_Y;
    this.towerInstability = 0;
    this.isGameOver = false;
    this.settledTowerBaseY = GROUND_Y;
    this.waitingForStart = true;
    this.nextEncouragementIndex = 0;
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.handleViewportResize();
    this.swingPhase += dt * this.getSwingSpeed();
    this.updateCraneAnchor();
    this.updateCrane();
    this.updateTowerState(dt);
    this.worldLayers.update(this.currentHeight, this.time.now);
    this.applyWind();
    this.updatePlane(dt);
    this.updateWeatherFx();
    this.pruneSleepingBlocks();
  }

  createBackdrop() {
    this.cityLayer.clear();
    this.cityLayer.fillStyle(0x74a9c7, 0.34);

    for (let i = 0; i < 16; i += 1) {
      const width = 70 + (i % 4) * 30;
      const height = 160 + (i % 5) * 38;
      const x = i * 116 + 10;
      this.cityLayer.fillRect(x, GROUND_Y - height, width, height);
      this.cityLayer.fillTriangle(x + width * 0.5, GROUND_Y - height - 54, x, GROUND_Y - height, x + width, GROUND_Y - height);
    }

    this.drawConstructionGround();
  }

  drawConstructionGround() {
    this.groundLayer.clear();
    this.groundLayer.fillGradientStyle(0xd9dde0, 0xd9dde0, 0xaeb7be, 0xaeb7be, 1);
    this.groundLayer.fillRect(0, GROUND_Y, WORLD_WIDTH, 72);
    this.groundLayer.fillStyle(0x8d6a4b, 1);
    this.groundLayer.fillRect(0, GROUND_Y + 72, WORLD_WIDTH, 230);
    this.groundLayer.fillStyle(0x6f533c, 0.7);

    for (let i = 0; i < 18; i += 1) {
      const x = i * 112 + 24;
      const y = GROUND_Y + 100 + (i % 4) * 28;
      this.groundLayer.fillEllipse(x, y, 70 + (i % 3) * 28, 13 + (i % 2) * 8);
    }

    this.groundLayer.fillStyle(0x2a2f35, 1);
    this.groundLayer.fillRect(0, GROUND_Y - 14, WORLD_WIDTH, 14);
    this.groundLayer.fillStyle(0xf4c542, 1);

    for (let x = -36; x < WORLD_WIDTH; x += 84) {
      this.groundLayer.fillTriangle(x, GROUND_Y - 14, x + 44, GROUND_Y - 14, x + 16, GROUND_Y);
      this.groundLayer.fillTriangle(x + 44, GROUND_Y, x + 84, GROUND_Y, x + 68, GROUND_Y - 14);
    }

    this.groundLayer.lineStyle(3, 0xf4f7fa, 0.85);
    this.groundLayer.lineBetween(0, GROUND_Y, WORLD_WIDTH, GROUND_Y);
    this.groundLayer.lineStyle(2, 0x87929b, 0.38);

    for (let x = 70; x < WORLD_WIDTH; x += 140) {
      this.groundLayer.lineBetween(x, GROUND_Y + 8, x + 52, GROUND_Y + 8);
    }

    this.drawGroundCone(118, GROUND_Y - 3, 1);
    this.drawGroundCone(1515, GROUND_Y - 3, 0.82);
    this.drawGroundBarrier(260, GROUND_Y - 8, 1);
    this.drawGroundBarrier(1260, GROUND_Y - 8, 0.92);
  }

  drawGroundCone(x, y, scale) {
    this.groundLayer.fillStyle(0xf06b2f, 1);
    this.groundLayer.fillTriangle(x, y - 44 * scale, x - 22 * scale, y, x + 22 * scale, y);
    this.groundLayer.fillStyle(0xffffff, 0.9);
    this.groundLayer.fillRect(x - 13 * scale, y - 22 * scale, 26 * scale, 7 * scale);
    this.groundLayer.fillStyle(0x2a2f35, 1);
    this.groundLayer.fillRect(x - 29 * scale, y, 58 * scale, 9 * scale);
  }

  drawGroundBarrier(x, y, scale) {
    this.groundLayer.fillStyle(0x25313a, 1);
    this.groundLayer.fillRect(x, y - 42 * scale, 10 * scale, 48 * scale);
    this.groundLayer.fillRect(x + 150 * scale, y - 42 * scale, 10 * scale, 48 * scale);
    this.groundLayer.fillStyle(0xffd24a, 1);
    this.groundLayer.fillRect(x + 8 * scale, y - 38 * scale, 150 * scale, 20 * scale);
    this.groundLayer.fillStyle(0x1f2a32, 1);

    for (let i = 0; i < 5; i += 1) {
      const sx = x + (16 + i * 28) * scale;
      this.groundLayer.fillTriangle(sx, y - 38 * scale, sx + 18 * scale, y - 38 * scale, sx, y - 18 * scale);
    }
  }

  createCrane() {
    this.updateCraneAnchor();
    this.crane = this.add.container(this.anchor.x, this.anchor.y).setDepth(15);
    this.mast = this.add.image(0, 0, 'crane-tower').setOrigin(0.5, 0).setAlpha(0.98);
    this.cable = this.add.image(CABLE_LOCAL_X, 34, 'crane-cable').setOrigin(0.5, 0).setDisplaySize(82, 160);
    this.hook = this.add.circle(CABLE_LOCAL_X, 190, 5, 0xffffff, 0);
    this.crane.add([this.mast, this.cable, this.hook]);
  }

  createParticles() {
    this.particles = this.add.particles(0, 0, 'house-1', {
      lifespan: 620,
      speed: { min: 90, max: 260 },
      scale: { start: 0.045, end: 0 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: -80, max: 80 },
      emitting: false
    }).setDepth(30);
  }

  createScreenFx() {
    this.fxLayer = this.add.graphics().setScrollFactor(0).setDepth(34);
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(33);
    this.encouragementLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(37);
    this.drawVignette(0.16);
  }

  drawVignette(alpha) {
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, alpha);
    this.vignette.fillRect(0, 0, this.scale.width, 18);
    this.vignette.fillRect(0, this.scale.height - 24, this.scale.width, 24);
    this.vignette.fillRect(0, 0, 22, this.scale.height);
    this.vignette.fillRect(this.scale.width - 22, 0, 22, this.scale.height);
  }

  handleViewportResize() {
    if (this.scale.width === this.lastViewportWidth && this.scale.height === this.lastViewportHeight) {
      return;
    }

    this.lastViewportWidth = this.scale.width;
    this.lastViewportHeight = this.scale.height;
    this.applyStage(this.currentStage || this.getStage(this.currentHeight));
    this.drawVignette(0.16);
  }

  createPlane() {
    this.plane = this.add.image(-220, 150, 'plane');
    this.plane.setScrollFactor(0);
    this.plane.setDepth(-4);
    this.plane.setDisplaySize(260, 145);
    this.plane.setVisible(false);
  }

  createWeatherFx() {
    this.weatherFx = this.add.graphics().setScrollFactor(0).setDepth(24);
  }

  async startRun() {
    if (!this.waitingForStart) {
      return;
    }

    await this.audio.unlock();
    this.waitingForStart = false;
    hasStartedOnce = true;
    this.hud.hideStartMenu();
    this.hud.flashMessage('Clique ou aperte espaco para soltar');
    this.audio.play('start');
    this.pulseScreen(0xffe07a, 0.2);
  }

  toggleSound() {
    const muted = this.audio.toggleMuted();
    this.hud.updateSoundButton(muted);
  }

  spawnCarriedBlock() {
    if (this.isGameOver) {
      return;
    }

    const key = HOUSE_ASSETS[this.nextHouseIndex % HOUSE_ASSETS.length].key;
    this.nextHouseIndex += 1;
    this.carriedBlock = this.add.image(this.anchor.x, this.anchor.y + 190, key).setDisplaySize(BLOCK_WIDTH, BLOCK_HEIGHT).setDepth(10);
  }

  updateCraneAnchor() {
    const viewportCenter = this.cameras.main.scrollX + this.scale.width * 0.5;
    const x = Phaser.Math.Clamp(viewportCenter - CABLE_LOCAL_X, 260, WORLD_WIDTH - 70);
    this.anchor.set(x, this.cameras.main.scrollY + 6);
  }

  updateCrane() {
    const climbDifficulty = this.getClimbDifficulty();
    const swingRange = 132 + climbDifficulty * 92 + (this.currentStage?.swingRange ?? 0);
    const swing = Math.sin(this.swingPhase) * swingRange;
    const sway = Math.cos(this.swingPhase * 1.6) * 7;
    const hookY = 152 + Math.abs(Math.sin(this.swingPhase)) * 18;
    const mastHeight = Math.max(560, this.scale.height + 70);
    const mastWidth = mastHeight * (368 / 720);

    this.crane.setPosition(this.anchor.x, this.anchor.y);
    this.mast.setDisplaySize(mastWidth, mastHeight);
    this.mast.setPosition(8, -18);
    this.hook.setPosition(CABLE_LOCAL_X + swing, hookY);
    this.cable.setPosition(CABLE_LOCAL_X + swing, 24);
    this.cable.setDisplaySize(72, Math.max(132, hookY + 20));
    this.cable.setRotation(Math.sin(this.swingPhase + 0.4) * 0.055);

    if (this.carriedBlock) {
      this.carriedBlock.setPosition(this.anchor.x + CABLE_LOCAL_X + swing, this.anchor.y + hookY + HOUSE_CABLE_GAP);
      this.carriedBlock.setRotation(Math.sin(this.swingPhase + 0.8) * 0.065 + sway * 0.002);
    }
  }

  getSwingSpeed() {
    return 1.48 + this.getClimbDifficulty() * 2.05 + (this.currentStage?.swingSpeed ?? 0);
  }

  getClimbDifficulty() {
    return Phaser.Math.Clamp(this.currentHeight / 980, 0, 1);
  }

  getRequiredLandingOverlap() {
    return this.currentStage?.requiredOverlap ?? MIN_LANDING_OVERLAP;
  }

  getDropDrift() {
    const drift = this.currentStage?.dropDrift ?? 0;
    return Math.sin(this.time.now * 0.0047) * drift;
  }

  dropBlock() {
    if (this.waitingForStart || this.isGameOver || !this.carriedBlock) {
      return;
    }

    const textureKey = this.carriedBlock.texture.key;
    const x = this.carriedBlock.x;
    const y = this.carriedBlock.y;
    const rotation = this.carriedBlock.rotation;
    this.carriedBlock.destroy();
    this.carriedBlock = undefined;

    const block = this.add.image(x, y, textureKey);
    block.setDisplaySize(BLOCK_WIDTH, BLOCK_HEIGHT);
    block.setRotation(rotation * 0.22);
    block.setDepth(8);
    block.arcadeFalling = true;
    block.arcadeDropSpeed = ARCADE_DROP_SPEED + Phaser.Math.Clamp(this.currentHeight / 900, 0, 1) * 240;

    this.activeBlock = block;
    this.blocks.push(block);
    this.cameraLeadY = Math.min(this.cameraLeadY, this.getSettledTowerTopY() - CAMERA_DROP_LEAD);
    this.hud.flashMessage('Soltou!');
    this.audio.play('drop');
    this.time.delayedCall(RESPAWN_DELAY_MS, () => this.spawnCarriedBlock());
  }

  updateTowerState(dt) {
    const fallingBlocks = this.blocks.filter((item) => !item.scored);

    for (const block of fallingBlocks) {
      if (block.arcadeFalling) {
        block.x += this.getDropDrift() * dt;
        block.y += block.arcadeDropSpeed * dt;
        block.setPosition(block.x, block.y);
        block.setRotation(Phaser.Math.Linear(block.rotation, 0, 0.16));
      }

      if (this.shouldAssistSettle(block)) {
        this.assistSettleBlock(block);
        continue;
      }

      if (this.didMissLanding(block)) {
        this.endRun('Casa fora da torre', 'O bloco passou pela pilha sem encaixar. Clique ou aperte R para reiniciar.');
        return;
      }

      if (block.y > GROUND_Y + 300 || block.x < -160 || block.x > WORLD_WIDTH + 160) {
        this.endRun('Casa fora da torre', 'O bloco caiu longe demais. Clique ou aperte R para reiniciar.');
        return;
      }
    }

    this.detectTowerCollapse();

    const towerTopY = Math.min(this.getSettledTowerTopY(), this.cameraLeadY);
    this.bestTowerY = Math.min(this.bestTowerY, towerTopY);
    this.currentHeight = Math.max(0, (GROUND_Y - towerTopY) / 2.15);
    const carriedBlockY = this.carriedBlock ? this.carriedBlock.y : towerTopY - CAMERA_CRANE_CLEARANCE;
    const towerFramingY = towerTopY - this.scale.height * CAMERA_TOWER_TOP_RATIO;
    const craneClearanceY = carriedBlockY - this.scale.height * 0.22;
    const targetCameraY = Phaser.Math.Clamp(
      Math.min(towerFramingY, craneClearanceY),
      WORLD_TOP,
      GROUND_Y - this.scale.height + 220
    );
    this.cameras.main.scrollY = Math.round(Phaser.Math.Linear(this.cameras.main.scrollY, targetCameraY, 0.032));

    const stage = this.getStage(this.currentHeight);
    if (stage.id !== this.currentStage.id) {
      this.applyStage(stage);
      this.hud.flashMessage(`${stage.label}!`);
      this.audio.play('stage');
      this.pulseScreen(stage.skyBottom, 0.16);
    }

    this.updateEncouragements();
    this.hud.updateScore(this.score.updateHeight(this.currentHeight));
  }

  updateEncouragements() {
    const milestone = ENCOURAGEMENT_MILESTONES[this.nextEncouragementIndex];

    if (!milestone || this.currentHeight < milestone.height || this.isGameOver) {
      return;
    }

    this.nextEncouragementIndex += 1;
    this.showEncouragement(milestone);
  }

  showEncouragement(milestone) {
    const x = Math.min(this.scale.width - 22, Math.max(230, this.scale.width * 0.78));
    const y = this.scale.height < 620 ? 104 : 132;
    const group = this.add.container(x, y).setScrollFactor(0).setDepth(38);
    const title = this.add.text(0, 0, milestone.title, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: this.scale.width < 680 ? '20px' : '25px',
      fontStyle: '900',
      color: '#fff4a8',
      stroke: '#101820',
      strokeThickness: 5,
      align: 'right'
    }).setOrigin(1, 0);
    const subtitle = this.add.text(0, 30, milestone.subtitle, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: this.scale.width < 680 ? '12px' : '14px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#101820',
      strokeThickness: 4,
      align: 'right'
    }).setOrigin(1, 0).setAlpha(0.88);
    const sparkle = this.add.graphics();

    sparkle.fillStyle(0xffe56a, 0.85);
    for (let i = 0; i < 9; i += 1) {
      const px = -Phaser.Math.Between(18, 210);
      const py = Phaser.Math.Between(-14, 62);
      sparkle.fillCircle(px, py, 2 + (i % 3));
    }

    group.add([sparkle, title, subtitle]);
    group.setAlpha(0);
    group.setScale(0.94);

    this.tweens.add({
      targets: group,
      alpha: 1,
      scale: 1,
      x: x - 10,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: group,
          alpha: 0,
          y: y - 28,
          delay: 1450,
          duration: 520,
          ease: 'Cubic.easeIn',
          onComplete: () => group.destroy()
        });
      }
    });

    this.pulseScreen(0xffe56a, 0.08);
    this.audio.play('stage');
  }

  shouldAssistSettle(block) {
    const landingY = this.getLandingY(block);

    if (block.y < landingY) {
      return false;
    }

    return this.getLandingOverlap(block) >= this.getRequiredLandingOverlap();
  }

  didMissLanding(block) {
    const landingY = this.getLandingY(block);
    return block.y >= landingY && this.getLandingOverlap(block) < this.getRequiredLandingOverlap();
  }

  assistSettleBlock(block) {
    const landingY = this.getLandingY(block);
    block.arcadeFalling = false;
    block.setPosition(block.x, landingY);
    block.setRotation(0);
    this.scoreBlock(block);
  }

  getLandingY(block) {
    const previous = this.getPreviousScoredBlock(block);
    return previous ? previous.scoredY - BLOCK_STACK_STEP : GROUND_Y - BLOCK_HEIGHT * 0.5;
  }

  getLandingOverlap(block) {
    const previous = this.getPreviousScoredBlock(block);

    if (!previous) {
      return 1;
    }

    const offset = Math.abs(block.x - previous.scoredX);
    return Phaser.Math.Clamp((BLOCK_WIDTH - offset) / BLOCK_WIDTH, 0, 1);
  }

  getPreviousScoredBlock(block) {
    const index = this.blocks.indexOf(block);

    for (let i = index - 1; i >= 0; i -= 1) {
      if (this.blocks[i]?.scored) {
        return this.blocks[i];
      }
    }

    return undefined;
  }

  getSettledTowerTopY() {
    return this.blocks
      .filter((item) => item.scored)
      .reduce((min, item) => Math.min(min, item.y), GROUND_Y);
  }

  scoreBlock(block) {
    block.scored = true;
    block.scoredX = block.x;
    block.scoredY = block.y;
    if (this.activeBlock === block) {
      this.activeBlock = undefined;
    }

    const previous = this.getPreviousScoredBlock(block);
    const targetX = previous ? previous.x : block.x;
    const offset = Math.abs(block.x - targetX);
    const precision = 1 - offset / BLOCK_WIDTH;
    const height = Math.max(0, (GROUND_Y - block.y) / 2.15);

    if (previous && offset > BLOCK_WIDTH * (1 - this.getRequiredLandingOverlap())) {
      this.endRun('Casa fora da torre', 'O bloco pousou fora da pilha. Clique ou aperte R para reiniciar.');
      return;
    }

    const snapshot = this.score.registerDrop(precision, height);
    this.towerInstability = Phaser.Math.Clamp(
      this.towerInstability + (1 - Phaser.Math.Clamp(precision, 0, 1)) * 0.34 - Phaser.Math.Clamp(precision, 0, 1) * 0.1,
      0,
      2.4
    );
    this.cameraLeadY = Math.min(this.cameraLeadY, block.y - CAMERA_DROP_LEAD);
    this.stabilizeSettledBlocks();

    this.hud.updateScore(snapshot);
    this.hud.updateRanking(this.ranking.entries);
    this.playLandingFeedback(block, precision, snapshot);

    if (precision > 0.88) {
      this.hud.flashMessage(`Perfeito x${snapshot.combo}!`);
    } else if (precision > 0.55) {
      this.hud.flashMessage('Bom encaixe');
    } else {
      this.hud.flashMessage('Segura essa torre...');
    }
  }

  playLandingFeedback(block, precision, snapshot) {
    const clampedPrecision = Phaser.Math.Clamp(precision, 0, 1);
    const color = clampedPrecision > 0.88 ? 0xfff06a : clampedPrecision > 0.55 ? 0xffffff : 0xff965f;
    const ring = this.add.graphics().setDepth(31);
    ring.lineStyle(4, color, 0.9);
    ring.strokeCircle(0, 0, BLOCK_WIDTH * 0.42);
    ring.setPosition(block.x, block.y);
    ring.setScale(0.48);

    this.tweens.add({
      targets: ring,
      scale: clampedPrecision > 0.88 ? 1.55 : 1.05,
      alpha: 0,
      duration: clampedPrecision > 0.88 ? 420 : 240,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });

    const text = this.add.text(block.x, block.y - 54, `+${Math.round(100 * clampedPrecision + snapshot.combo * 35)}`, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: clampedPrecision > 0.88 ? '26px' : '20px',
      fontStyle: '900',
      color: clampedPrecision > 0.88 ? '#ffe76b' : '#ffffff',
      stroke: '#172029',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(32);

    this.tweens.add({
      targets: text,
      y: text.y - 46,
      alpha: 0,
      duration: 680,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });

    this.particles.explode(clampedPrecision > 0.88 ? 34 : 12, block.x, block.y + BLOCK_HEIGHT * 0.35);
    this.cameras.main.shake(clampedPrecision > 0.88 ? 130 : 70, clampedPrecision > 0.88 ? 0.004 : 0.002);
    this.audio.play(clampedPrecision > 0.88 ? 'perfect' : 'land');
  }

  pulseScreen(color, alpha) {
    const pulse = this.add.rectangle(0, 0, this.scale.width, this.scale.height, color, alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(36);

    this.tweens.add({
      targets: pulse,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy()
    });
  }

  detectTowerCollapse() {
    if (this.isGameOver || this.blocks.length < 3) {
      return;
    }

    const settledBlocks = this.blocks.filter((block) => block.scored);

    for (const block of settledBlocks) {
      const tooTilted = Math.abs(block.rotation) > TOWER_COLLAPSE_TILT && block.y < GROUND_Y - 70;
      const driftedAfterSettling = block.scoredX !== undefined && Math.abs(block.x - block.scoredX) > BLOCK_WIDTH * 1.45;
      const outOfLane = block.x < -120 || block.x > WORLD_WIDTH + 120;

      if (tooTilted || driftedAfterSettling || outOfLane || this.towerInstability > 2.25) {
        this.endRun('A torre desabou', 'A estrutura perdeu estabilidade. Clique ou aperte R para tentar de novo.');
        return;
      }
    }
  }

  stabilizeSettledBlocks() {
    this.blocks
      .filter((block) => block.scored)
      .forEach((block) => {
        block.setPosition(block.scoredX, block.scoredY);
        block.setRotation(0);
      });
  }

  getStage(height) {
    return WEATHER_STAGES.reduce((current, stage) => (height >= stage.minHeight ? stage : current), WEATHER_STAGES[0]);
  }

  applyStage(stage) {
    this.currentStage = stage;
    this.hud.updateWeather(stage);
    this.sky.clear();
    this.sky.fillGradientStyle(stage.skyTop, stage.skyTop, stage.skyBottom, stage.skyBottom, 1);
    this.sky.fillRect(0, 0, this.scale.width, this.scale.height);

    if (stage.minHeight >= 1960) {
      this.drawStars();
    }
  }

  drawStars() {
    this.sky.fillStyle(0xffffff, 0.78);

    for (let i = 0; i < 80; i += 1) {
      this.sky.fillCircle((i * 97) % this.scale.width, (i * 53) % this.scale.height, 1 + (i % 3) * 0.6);
    }
  }

  applyWind() {
    if (this.currentStage.wind === 0 && this.towerInstability <= 0) {
      return;
    }

    const settledBlocks = this.blocks.filter((block) => block.scored);
    const dynamicStart = Math.max(0, settledBlocks.length - DYNAMIC_SETTLED_BLOCKS);
    const climatePush = this.currentStage.wind * 4200;
    const baseAmplitude = Phaser.Math.Clamp(this.towerInstability * 9 + climatePush, 0, 28);

    settledBlocks.forEach((block, index) => {
      if (index < dynamicStart) {
        block.setPosition(block.scoredX, block.scoredY);
        block.setRotation(0);
        return;
      }

      const influence = (index - dynamicStart + 1) / DYNAMIC_SETTLED_BLOCKS;
      const sway = Math.sin(this.time.now * 0.003 + index * 0.65) * baseAmplitude * influence;
      block.setPosition(block.scoredX + sway, block.scoredY);
      block.setRotation((sway / BLOCK_WIDTH) * 0.18);
    });
  }

  updatePlane(dt) {
    if (!this.plane) {
      return;
    }

    if (!this.currentStage?.plane) {
      this.plane.setVisible(false);
      return;
    }

    this.plane.setVisible(true);
    const nextX = this.plane.x + dt * 260;
    const wrappedX = nextX > this.scale.width + 230 ? -240 : nextX;
    this.plane.setPosition(wrappedX, 150 + Math.sin(this.time.now * 0.002) * 18);
  }

  updateWeatherFx() {
    if (!this.weatherFx || !this.currentStage) {
      return;
    }

    this.weatherFx.clear();

    switch (this.currentStage.id) {
      case 'tall-buildings':
        this.drawRainFx(42, 0x98d7ff, 0.58);
        break;
      case 'clouds':
        this.drawWindFx(18, 0xffffff, 0.34);
        break;
      case 'high-clouds':
        this.drawWindFx(28, 0xffffff, 0.42);
        this.drawRainFx(20, 0xd6f0ff, 0.36);
        break;
      case 'orange-sky':
        this.drawIceFx(46, 0xeaffff, 0.64);
        break;
      case 'purple-sky':
        this.drawWindFx(34, 0xdcc7ff, 0.42);
        this.drawIceFx(18, 0xf2f6ff, 0.42);
        break;
      case 'space':
      case 'moon':
        this.drawSpaceDustFx(48, 0xdfe7ff, 0.46);
        break;
      case 'mars':
        this.drawDustFx(58, 0xd76a36, 0.36);
        break;
      case 'jupiter':
        this.drawWindFx(42, 0xf0d5a8, 0.36);
        this.drawSpaceDustFx(34, 0xfff2c8, 0.32);
        break;
      case 'saturn':
        this.drawSpaceDustFx(72, 0xf2dca8, 0.5);
        this.drawWindFx(24, 0xe9d1a4, 0.28);
        break;
      default:
        break;
    }
  }

  drawRainFx(count, color, alpha) {
    this.weatherFx.lineStyle(2, color, alpha);

    for (let i = 0; i < count; i += 1) {
      const x = (i * 83 + this.time.now * 0.44) % (this.scale.width + 120) - 60;
      const y = (i * 47 + this.time.now * 0.72) % (this.scale.height + 120) - 60;
      this.weatherFx.lineBetween(x, y, x - 18, y + 54);
    }
  }

  drawWindFx(count, color, alpha) {
    this.weatherFx.lineStyle(2, color, alpha);

    for (let i = 0; i < count; i += 1) {
      const x = (i * 101 + this.time.now * 0.26) % (this.scale.width + 220) - 110;
      const y = (i * 61 + Math.sin(this.time.now * 0.001 + i) * 42) % this.scale.height;
      const width = 64 + (i % 4) * 24;
      this.weatherFx.beginPath();
      this.weatherFx.moveTo(x, y);
      this.weatherFx.lineTo(x + width, y - 8);
      this.weatherFx.strokePath();
    }
  }

  drawIceFx(count, color, alpha) {
    this.weatherFx.fillStyle(color, alpha);
    this.weatherFx.lineStyle(1, color, alpha * 0.9);

    for (let i = 0; i < count; i += 1) {
      const x = (i * 71 + Math.sin(this.time.now * 0.0017 + i) * 38) % this.scale.width;
      const y = (i * 53 + this.time.now * 0.19) % (this.scale.height + 40) - 20;
      const radius = 1.5 + (i % 3);
      this.weatherFx.fillCircle(x, y, radius);
      this.weatherFx.lineBetween(x - radius * 2, y, x + radius * 2, y);
      this.weatherFx.lineBetween(x, y - radius * 2, x, y + radius * 2);
    }
  }

  drawDustFx(count, color, alpha) {
    this.weatherFx.fillStyle(color, alpha);

    for (let i = 0; i < count; i += 1) {
      const x = (i * 89 + this.time.now * 0.31) % (this.scale.width + 140) - 70;
      const y = (i * 37 + Math.sin(this.time.now * 0.002 + i) * 50) % this.scale.height;
      this.weatherFx.fillCircle(x, y, 1.5 + (i % 4));
    }
  }

  drawSpaceDustFx(count, color, alpha) {
    this.weatherFx.fillStyle(color, alpha);

    for (let i = 0; i < count; i += 1) {
      const x = (i * 113 + Math.sin(this.time.now * 0.0009 + i) * 24) % this.scale.width;
      const y = (i * 67 + this.time.now * 0.045) % this.scale.height;
      this.weatherFx.fillCircle(x, y, 1 + (i % 3) * 0.7);
    }
  }

  pruneSleepingBlocks() {
  }

  endRun(title = 'A torre desabou', reason = 'Aperte R ou clique para tentar de novo.') {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.hud.flashMessage('Fim da rodada');
    this.hud.showGameOver(title, reason);
    this.audio.play('gameover');
    if (this.carriedBlock) {
      this.carriedBlock.destroy();
      this.carriedBlock = undefined;
    }
  }

  restartGame() {
    this.hud.hideGameOver();
    this.scene.restart();
  }

  shutdown() {
    window.removeEventListener('tower-build-restart', this.restartHandler);
    window.removeEventListener('tower-build-start', this.startHandler);
    window.removeEventListener('tower-build-toggle-sound', this.soundToggleHandler);
  }
}

const hud = new Hud();

window.addEventListener('keydown', (event) => {
  if ([' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }
});
window.addEventListener('wheel', (event) => event.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (event) => event.preventDefault());

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#8bd7f5',
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoRound: true
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  scene: [new GameScene(hud)]
});
