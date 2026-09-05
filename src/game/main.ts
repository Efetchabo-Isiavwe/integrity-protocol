import { AUTO, Events, Game as PhaserGame, Scale, Scene } from 'phaser';

// ---------------------------------------------------------------------------
// AFTERLIGHT — Case 01: The Review
// Phaser Scene: Atmospheric Command Center Canvas
// ---------------------------------------------------------------------------

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 640;

export const COLORS = {
  OBSIDIAN: 0x080B10,
  NAVY: 0x0D1527,
  INDIGO: 0x18233C,
  GOLD: 0xD4AF37,
  BRONZE: 0xCD7F32,
  CRIMSON: 0xE63946,
  CYAN: 0x00F5D4,
  PARCHMENT: 0xEAE6DF,
} as const;

// Event name constants
export const EVT_PHASE_CHANGED = 'phase-changed';
export const EVT_RESOURCE_UPDATED = 'resource-updated';
export const EVT_CRISIS_TRIGGERED = 'crisis-triggered';
export const EVT_CHARACTER_INTERROGATE = 'character-interrogate';
export const EVT_EVIDENCE_UNLOCKED = 'evidence-unlocked';
export const EVT_DECISION_MADE = 'decision-made';
export const EVT_ENDING_TRIGGERED = 'ending-triggered';
export const EVT_ATMOSPHERE_MODE = 'atmosphere-mode';

export const EventBus = new Events.EventEmitter();

// ---------------------------------------------------------------------------
// PHASER GAME SCENE — Atmospheric Background Engine
// ---------------------------------------------------------------------------
export class Game extends Scene {
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private mapNodes: Phaser.GameObjects.Container[] = [];
  private mapLines!: Phaser.GameObjects.Graphics;
  private skyline!: Phaser.GameObjects.Graphics;
  private serverGlows: Phaser.GameObjects.Graphics[] = [];
  private scanBeam!: Phaser.GameObjects.Graphics;
  private glitchOverlay!: Phaser.GameObjects.Graphics;
  private pulsePhase = 0;
  private currentMode = 'prologue';
  private alertFlash!: Phaser.GameObjects.Rectangle;
  private terminalLines: Phaser.GameObjects.Text[] = [];
  private terminalY = 0;

  constructor() {
    super('Game');
  }

  preload() {
    // Audio is handled entirely by the Web Audio AmbientEngine in React.
    // No Phaser audio assets needed.
  }

  create() {
    this.cameras.main.setBackgroundColor('#080B10');

    // Generate particle textures
    this.createParticleTextures();

    // Build atmospheric layers
    this.buildSkyline();
    this.buildRain();
    this.buildDust();
    this.buildTacticalMap();
    this.buildServerGlows();
    this.buildScanBeam();
    this.buildGlitchOverlay();
    this.buildAlertFlash();
    this.buildTerminalFeed();

    // EventBus listeners
    EventBus.on(EVT_ATMOSPHERE_MODE, this.setAtmosphereMode, this);
    EventBus.on(EVT_CRISIS_TRIGGERED, this.onCrisisTriggered, this);
    EventBus.on(EVT_PHASE_CHANGED, this.onPhaseChanged, this);

    // Hand scene to React
    EventBus.emit('current-scene-ready', this);

    // Shutdown cleanup
    this.events.once('shutdown', () => {
      this.time.removeAllEvents();
      this.tweens.killAll();
      this.input.keyboard?.removeAllListeners();
      this.sound.stopAll();
      EventBus.removeListener(EVT_ATMOSPHERE_MODE, this.setAtmosphereMode, this);
      EventBus.removeListener(EVT_CRISIS_TRIGGERED, this.onCrisisTriggered, this);
      EventBus.removeListener(EVT_PHASE_CHANGED, this.onPhaseChanged, this);
    });
  }

  // --- TEXTURE GENERATION ---
  private createParticleTextures() {
    // Rain drop
    const rg = this.add.graphics();
    rg.fillStyle(0x88ccff, 0.6);
    rg.fillRect(0, 0, 1, 8);
    rg.generateTexture('raindrop', 1, 8);
    rg.destroy();

    // Dust particle
    const dg = this.add.graphics();
    dg.fillStyle(0xD4AF37, 0.3);
    dg.fillCircle(2, 2, 2);
    dg.generateTexture('dust', 4, 4);
    dg.destroy();

    // Glow
    const gg = this.add.graphics();
    gg.fillStyle(0x00F5D4, 0.15);
    gg.fillCircle(8, 8, 8);
    gg.fillStyle(0x00F5D4, 0.4);
    gg.fillCircle(8, 8, 4);
    gg.generateTexture('glow', 16, 16);
    gg.destroy();
  }

  // --- SKYLINE ---
  private buildSkyline() {
    this.skyline = this.add.graphics();
    this.skyline.setDepth(1);
    this.skyline.setAlpha(0.7);

    // Procedural Lagos skyline silhouette
    const buildings = [
      { x: 50, w: 40, h: 180 }, { x: 100, w: 30, h: 220 }, { x: 140, w: 50, h: 160 },
      { x: 200, w: 35, h: 250 }, { x: 245, w: 55, h: 200 }, { x: 310, w: 25, h: 280 },
      { x: 345, w: 45, h: 190 }, { x: 400, w: 60, h: 240 }, { x: 470, w: 30, h: 300 },
      { x: 510, w: 50, h: 210 }, { x: 570, w: 40, h: 260 }, { x: 620, w: 55, h: 180 },
      { x: 685, w: 35, h: 290 }, { x: 730, w: 45, h: 220 }, { x: 785, w: 60, h: 250 },
      { x: 855, w: 30, h: 200 }, { x: 895, w: 50, h: 270 }, { x: 955, w: 40, h: 190 },
    ];

    // Back layer (darker, taller)
    this.skyline.fillStyle(0x0D1527, 0.8);
    buildings.forEach(b => {
      this.skyline.fillRect(b.x, GAME_HEIGHT - b.h - 60, b.w, b.h + 60);
    });

    // Front layer (slightly lighter)
    this.skyline.fillStyle(0x18233C, 0.6);
    const frontBuildings = [
      { x: 80, w: 50, h: 120 }, { x: 180, w: 40, h: 140 }, { x: 280, w: 55, h: 100 },
      { x: 380, w: 45, h: 130 }, { x: 500, w: 50, h: 110 }, { x: 620, w: 40, h: 150 },
      { x: 740, w: 55, h: 120 }, { x: 860, w: 45, h: 100 }, { x: 940, w: 50, h: 140 },
    ];
    frontBuildings.forEach(b => {
      this.skyline.fillRect(b.x, GAME_HEIGHT - b.h - 20, b.w, b.h + 20);
    });

    // Window lights (amber dots)
    this.skyline.fillStyle(0xD4AF37, 0.4);
    for (let i = 0; i < 120; i++) {
      const wx = Math.random() * GAME_WIDTH;
      const wy = GAME_HEIGHT - 80 - Math.random() * 250;
      this.skyline.fillRect(wx, wy, 2, 2);
    }
  }

  // --- RAIN ---
  private buildRain() {
    this.rain = this.add.particles(0, 0, 'raindrop', {
      x: { min: 0, max: GAME_WIDTH },
      y: -20,
      speedY: { min: 400, max: 600 },
      speedX: { min: -30, max: -10 },
      lifespan: 1200,
      alpha: { start: 0.6, end: 0 },
      quantity: 3,
      emitting: true,
    });
    this.rain.setDepth(10);
    this.rain.setAlpha(0.4);
  }

  // --- DUST PARTICLES ---
  private buildDust() {
    this.dust = this.add.particles(0, 0, 'dust', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 100, max: GAME_HEIGHT },
      speedX: { min: -10, max: 10 },
      speedY: { min: -20, max: -5 },
      lifespan: 4000,
      alpha: { start: 0.3, end: 0 },
      scale: { start: 1, end: 0.3 },
      quantity: 1,
      emitting: true,
    });
    this.dust.setDepth(8);
  }

  // --- TACTICAL MAP ---
  private buildTacticalMap() {
    this.mapLines = this.add.graphics();
    this.mapLines.setDepth(5);
    this.mapLines.setAlpha(0);

    const nodes = [
      { id: 'hq', label: 'IKEJA HQ', x: 200, y: 280 },
      { id: 'lekki', label: 'LEKKI SUB', x: 700, y: 200 },
      { id: 'marina', label: 'MARINA CORE', x: 500, y: 380 },
      { id: 'epe', label: 'EPE GRID', x: 820, y: 400 },
    ];

    // Connection lines
    this.mapLines.lineStyle(1, 0x00F5D4, 0.3);
    this.mapLines.lineBetween(nodes[0].x, nodes[0].y, nodes[2].x, nodes[2].y);
    this.mapLines.lineBetween(nodes[2].x, nodes[2].y, nodes[1].x, nodes[1].y);
    this.mapLines.lineBetween(nodes[1].x, nodes[1].y, nodes[3].x, nodes[3].y);
    this.mapLines.lineBetween(nodes[2].x, nodes[2].y, nodes[3].x, nodes[3].y);
    this.mapLines.lineBetween(nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y);

    // Node containers
    nodes.forEach(n => {
      const container = this.add.container(n.x, n.y);
      container.setDepth(6);
      container.setAlpha(0);

      // Outer ring
      const ring = this.add.graphics();
      ring.lineStyle(2, 0xD4AF37, 0.8);
      ring.strokeCircle(0, 0, 20);
      ring.lineStyle(1, 0x00F5D4, 0.4);
      ring.strokeCircle(0, 0, 28);

      // Inner dot
      const dot = this.add.graphics();
      dot.fillStyle(0xD4AF37, 1);
      dot.fillCircle(0, 0, 6);

      // Label
      const text = this.add.text(0, 38, n.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00F5D4',
      }).setOrigin(0.5);

      container.add([ring, dot, text]);
      container.setData('nodeId', n.id);
      this.mapNodes.push(container);

      // Pulse animation
      this.tweens.add({
        targets: ring,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 0.8, to: 0.2 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // --- SERVER GLOWS ---
  private buildServerGlows() {
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics();
      g.setDepth(3);
      g.fillStyle(0xD4AF37, 0.1 + Math.random() * 0.1);
      const sx = 100 + Math.random() * 800;
      const sy = 400 + Math.random() * 150;
      g.fillCircle(sx, sy, 20 + Math.random() * 30);
      this.serverGlows.push(g);

      this.tweens.add({
        targets: g,
        alpha: { from: 0.3, to: 0.8 },
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // --- SCAN BEAM ---
  private buildScanBeam() {
    this.scanBeam = this.add.graphics();
    this.scanBeam.setDepth(7);
    this.scanBeam.setAlpha(0);
  }

  // --- GLITCH OVERLAY ---
  private buildGlitchOverlay() {
    this.glitchOverlay = this.add.graphics();
    this.glitchOverlay.setDepth(20);
    this.glitchOverlay.setAlpha(0);
  }

  // --- ALERT FLASH ---
  private buildAlertFlash() {
    this.alertFlash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xE63946, 0.1);
    this.alertFlash.setDepth(25);
    this.alertFlash.setAlpha(0);
  }

  // --- TERMINAL FEED ---
  private buildTerminalFeed() {
    const lines = [
      '> SYSTEM INITIALIZED...',
      '> APEX COMMISSION TERMINAL v4.2.1',
      '> ENCRYPTION: AES-512 ACTIVE',
      '> AUTH LEVEL: DIRECTOR GENERAL',
      '> WARNING: ANOMALOUS AUDIT FLAGS DETECTED',
      '> INCOMING TRANSMISSION...',
      `> "DON'T TRUST THE PERFORMANCE REPORT"`,
      '> SOURCE: ANONYMOUS',
      '> STATUS: CRISIS PROTOCOL ENGAGED',
    ];

    lines.forEach((line, i) => {
      const txt = this.add.text(40, 80 + i * 22, line, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: i >= 5 ? '#E63946' : '#00F5D4',
      }).setDepth(15).setAlpha(0);
      this.terminalLines.push(txt);

      this.tweens.add({
        targets: txt,
        alpha: 1,
        delay: i * 400 + 500,
        duration: 200,
      });
    });
    this.terminalY = 80 + lines.length * 22;
  }

  // --- ATMOSPHERE MODE SWITCHING ---
  private setAtmosphereMode(mode: string) {
    this.currentMode = mode;

    switch (mode) {
      case 'prologue':
        this.rain.setAlpha(0.4);
        this.mapLines.setAlpha(0);
        this.mapNodes.forEach(n => n.setAlpha(0));
        this.scanBeam.setAlpha(0);
        this.terminalLines.forEach(t => t.setAlpha(1));
        break;
      case 'dashboard':
        this.rain.setAlpha(0.2);
        this.mapLines.setAlpha(0.8);
        this.mapNodes.forEach(n => n.setAlpha(1));
        this.scanBeam.setAlpha(0.3);
        this.terminalLines.forEach(t => t.setAlpha(0.15));
        this.addTerminalLine('> COMMAND CENTER ACTIVE');
        break;
      case 'investigation':
        this.rain.setAlpha(0.1);
        this.mapLines.setAlpha(0.3);
        this.mapNodes.forEach(n => n.setAlpha(0.4));
        this.scanBeam.setAlpha(0.6);
        this.terminalLines.forEach(t => t.setAlpha(0.1));
        break;
      case 'interrogation':
        this.rain.setAlpha(0.15);
        this.mapLines.setAlpha(0.2);
        this.mapNodes.forEach(n => n.setAlpha(0.3));
        this.scanBeam.setAlpha(0);
        this.terminalLines.forEach(t => t.setAlpha(0.08));
        break;
      case 'crisis':
        this.rain.setAlpha(0.6);
        this.mapLines.setAlpha(1);
        this.mapNodes.forEach(n => n.setAlpha(1));
        this.triggerGlitch();
        this.triggerAlert();
        break;
      case 'ending':
        this.rain.setAlpha(0.3);
        this.mapLines.setAlpha(0.5);
        this.mapNodes.forEach(n => n.setAlpha(0.6));
        this.scanBeam.setAlpha(0);
        break;
    }
  }

  private addTerminalLine(text: string) {
    const txt = this.add.text(40, this.terminalY, text, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00F5D4',
    }).setDepth(15).setAlpha(0);
    this.terminalLines.push(txt);
    this.terminalY += 20;
    this.tweens.add({ targets: txt, alpha: 0.6, duration: 300 });

    // Keep max 15 lines visible
    if (this.terminalLines.length > 15) {
      const old = this.terminalLines.shift();
      if (old) old.destroy();
    }
  }

  private triggerGlitch() {
    this.glitchOverlay.setAlpha(0.3);
    for (let i = 0; i < 10; i++) {
      const y = Math.random() * GAME_HEIGHT;
      const h = 2 + Math.random() * 4;
      const x = Math.random() * 200 - 100;
      this.glitchOverlay.fillStyle(0xE63946, 0.3);
      this.glitchOverlay.fillRect(x, y, GAME_WIDTH + 200, h);
    }
    this.tweens.add({
      targets: this.glitchOverlay,
      alpha: 0,
      duration: 200,
      onComplete: () => this.glitchOverlay.clear(),
    });
  }

  private triggerAlert() {
    this.tweens.add({
      targets: this.alertFlash,
      alpha: { from: 0.3, to: 0 },
      duration: 600,
      repeat: 3,
      yoyo: true,
    });
  }

  private onCrisisTriggered() {
    this.triggerGlitch();
    this.triggerAlert();
    this.addTerminalLine('> ⚠ CRISIS EVENT DETECTED');
    this.safePlay('sfx_hit');
  }

  private onPhaseChanged(data: { phase: string }) {
    if (data.phase === 'PROLOGUE') this.setAtmosphereMode('prologue');
    if (data.phase === 'DASHBOARD') this.setAtmosphereMode('dashboard');
    if (data.phase === 'INVESTIGATION') this.setAtmosphereMode('investigation');
    if (data.phase === 'INTERROGATION') this.setAtmosphereMode('interrogation');
    if (data.phase === 'CRISIS_EVENT') this.setAtmosphereMode('crisis');
    if (data.phase === 'EPILOGUE') this.setAtmosphereMode('ending');
  }

  private safePlay(key: string) {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 0.5 });
    }
  }

  update(_time: number, _delta: number) {
    this.pulsePhase += _delta * 0.001;

    // Scan beam sweep
    if (this.scanBeam.alpha > 0) {
      this.scanBeam.clear();
      const bx = (Math.sin(this.pulsePhase * 0.5) * 0.5 + 0.5) * GAME_WIDTH;
      this.scanBeam.lineStyle(2, 0x00F5D4, 0.4);
      this.scanBeam.lineBetween(bx, 100, bx, GAME_HEIGHT - 50);
      this.scanBeam.fillStyle(0x00F5D4, 0.05);
      this.scanBeam.fillRect(bx - 30, 100, 60, GAME_HEIGHT - 150);
    }
  }
}

// ---------------------------------------------------------------------------
// GAME FACTORY
// ---------------------------------------------------------------------------
const StartGame = (parent: string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#080B10',
    scale: {
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [Game],
  };

  const game = new PhaserGame(config);
  if (typeof window !== 'undefined') {
    (window as any).__PHASER_GAME__ = game;
    (window as any).__PHASER_EVENT_BUS__ = EventBus;
  }
  return game;
};

export default StartGame;