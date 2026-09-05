import * as Phaser from "phaser";
import { Scene, Game as PhaserGame, AUTO, Events, Scale } from "phaser";
import { EventBus } from "./EventBus";
import { SECTORS, type Sector } from "./story";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;
const COLORS = {
  bg: 0x0a0f1a,
  amber: 0xf59e0b,
  teal: 0x2dd4bf,
  slate: 0x334155,
  brass: 0xd4a853,
  red: 0xef4444,
  green: 0x22c55e,
  nexus: 0x7c3aed,
  radar: 0x0f2027,
};

// ─── EVENT BUS ──────────────────────────────────────────────────────────────
export { EventBus };

// ─── GAME SCENE ─────────────────────────────────────────────────────────────
export class GameScene extends Scene {
  private nexusOrb!: Phaser.GameObjects.Arc;
  private nexusGlow!: Phaser.GameObjects.Arc;
  private scanline!: Phaser.GameObjects.Rectangle;
  private sectorNodes: Map<string, Phaser.GameObjects.Container> = new Map();
  private radarRing!: Phaser.GameObjects.Graphics;
  private nexusMood: string = "calm";
  private nexusPulseSpeed: number = 0.002;
  private ambientParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Game");
  }

  preload() {
    // Load pre-packaged audio
    this.load.audio("bgm_chill", "assets/audio/bgm_chill.mp3");
    this.load.audio("bgm_action", "assets/audio/bgm_action.mp3");
    this.load.audio("sfx_button", "assets/audio/sfx_button.mp3");
    this.load.audio("sfx_powerup", "assets/audio/sfx_powerup.mp3");
    this.load.audio("sfx_hit", "assets/audio/sfx_hit.mp3");
    this.load.audio("sfx_win", "assets/audio/sfx_win.mp3");
    this.load.audio("sfx_gameover", "assets/audio/sfx_gameover.mp3");
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Radar grid background
    this.drawRadarGrid();

    // Nigerian sector radar nodes
    this.drawSectorNodes();

    // Nexus AI Core Orb (center)
    this.createNexusCore();

    // Scanline effect
    this.createScanline();

    // Ambient particles
    this.createAmbientParticles();

    // Event listeners
    EventBus.on("nexus-mood-change", this.handleNexusMood, this);
    EventBus.on("sector-update", this.handleSectorUpdate, this);
    EventBus.on("trigger-crisis", this.handleCrisisTrigger, this);
    EventBus.on("game-restart", this.handleRestart, this);

    // Register shutdown cleanup
    this.events.once("shutdown", () => {
      EventBus.off("nexus-mood-change", this.handleNexusMood, this);
      EventBus.off("sector-update", this.handleSectorUpdate, this);
      EventBus.off("trigger-crisis", this.handleCrisisTrigger, this);
      EventBus.off("game-restart", this.handleRestart, this);
    });

    EventBus.emit("current-scene-ready", this);
  }

  update(time: number, _delta: number) {
    // Nexus orb pulsing
    if (this.nexusOrb) {
      const pulse = Math.sin(time * this.nexusPulseSpeed) * 0.3 + 1;
      this.nexusOrb.setScale(pulse);
      if (this.nexusGlow) {
        this.nexusGlow.setScale(pulse * 1.4);
        this.nexusGlow.setAlpha(0.2 + Math.sin(time * 0.001) * 0.1);
      }
    }

    // Scanline movement
    if (this.scanline) {
      this.scanline.y = (this.scanline.y + 1) % GAME_HEIGHT;
    }

    // Radar ring rotation
    if (this.radarRing) {
      this.radarRing.rotation += 0.005;
    }

    // Sector node pulse
    this.sectorNodes.forEach((container, id) => {
      const sector = SECTORS.find((s) => s.id === id);
      if (sector && sector.status === "critical") {
        const blink = Math.sin(time * 0.005) > 0 ? 1 : 0.3;
        container.setAlpha(blink);
      } else {
        container.setAlpha(1);
      }
    });
  }

  private drawRadarGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.slate, 0.3);

    // Concentric circles
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    for (let r = 80; r <= 350; r += 60) {
      g.strokeCircle(cx, cy, r);
    }

    // Radial lines
    for (let a = 0; a < 360; a += 45) {
      const rad = (a * Math.PI) / 180;
      g.lineBetween(cx, cy, cx + Math.cos(rad) * 350, cy + Math.sin(rad) * 350);
    }

    // Cross-hairs
    g.lineStyle(1, COLORS.teal, 0.15);
    g.lineBetween(cx, 0, cx, GAME_HEIGHT);
    g.lineBetween(0, cy, GAME_WIDTH, cy);

    g.setDepth(0);

    // Radar sweep ring
    this.radarRing = this.add.graphics();
    this.radarRing.lineStyle(2, COLORS.teal, 0.2);
    this.radarRing.strokeCircle(cx, cy, 200);
    this.radarRing.setDepth(1);
  }

  private drawSectorNodes() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const radius = 280;

    SECTORS.forEach((sector) => {
      const x = cx + (sector.x - 0.5) * radius * 2;
      const y = cy + (sector.y - 0.5) * radius * 2;

      const container = this.add.container(x, y);
      container.setDepth(5);

      // Node circle
      const nodeColor = sector.status === "critical" ? COLORS.red :
        sector.status === "warning" ? COLORS.amber : COLORS.green;
      const circle = this.add.circle(0, 0, 12, nodeColor, 0.8);
      container.add(circle);

      // Outer ring
      const ring = this.add.circle(0, 0, 18, 0x000000, 0);
      ring.setStrokeStyle(2, nodeColor, 0.5);
      container.add(ring);

      // Label
      const label = this.add.text(0, 28, sector.name.split("/")[0].trim(), {
        fontSize: "10px",
        fontFamily: "monospace",
        color: "#94a3b8",
      }).setOrigin(0.5);
      container.add(label);

      // Connection line to center
      const lineG = this.add.graphics();
      lineG.lineStyle(1, nodeColor, 0.15);
      lineG.lineBetween(x, y, cx, cy);
      lineG.setDepth(2);

      this.sectorNodes.set(sector.id, container);
    });
  }

  private createNexusCore() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Glow layer
    this.nexusGlow = this.add.circle(cx, cy, 50, COLORS.nexus, 0.3);
    this.nexusGlow.setDepth(8);
    this.nexusGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Core orb
    this.nexusOrb = this.add.circle(cx, cy, 28, COLORS.nexus, 0.9);
    this.nexusOrb.setStrokeStyle(3, 0xa78bfa, 1);
    this.nexusOrb.setDepth(9);

    // Nexus label
    const nexusLabel = this.add.text(cx, cy + 50, "NEXUS", {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#a78bfa",
      fontStyle: "bold",
    }).setOrigin(0.5);
    nexusLabel.setDepth(9);

    // Orbiting dots
    for (let i = 0; i < 6; i++) {
      const dot = this.add.circle(cx, cy, 3, COLORS.teal, 0.7);
      dot.setDepth(8);
      this.tweens.add({
        targets: dot,
        x: { from: cx - 40, to: cx + 40 },
        y: {
          from: cy + Math.sin((i / 6) * Math.PI * 2) * 40,
          to: cy + Math.sin(((i + 1) / 6) * Math.PI * 2) * 40,
        },
        duration: 3000 + i * 500,
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  private createScanline() {
    this.scanline = this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 2, COLORS.teal, 0.05);
    this.scanline.setDepth(20);
    this.scanline.setBlendMode(Phaser.BlendModes.ADD);
  }

  private createAmbientParticles() {
    // Create a tiny particle texture
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture("particle", 4, 4);
    g.destroy();

    this.ambientParticles = this.add.particles(0, 0, "particle", {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      lifespan: 4000,
      alpha: { start: 0.3, end: 0 },
      scale: { start: 0.5, end: 0 },
      speedY: { min: -10, max: -5 },
      frequency: 200,
      quantity: 1,
    });
    this.ambientParticles.setDepth(3);
  }

  private handleNexusMood(mood: string) {
    this.nexusMood = mood;
    const colorMap: Record<string, number> = {
      calm: COLORS.nexus,
      intrigued: 0x3b82f6,
      suspicious: COLORS.amber,
      pressured: COLORS.red,
    };
    const speedMap: Record<string, number> = {
      calm: 0.002,
      intrigued: 0.003,
      suspicious: 0.005,
      pressured: 0.008,
    };
    if (this.nexusOrb) {
      this.nexusOrb.setFillStyle(colorMap[mood] || COLORS.nexus, 0.9);
      this.nexusOrb.setStrokeStyle(3, colorMap[mood] || 0xa78bfa, 1);
    }
    if (this.nexusGlow) {
      this.nexusGlow.setFillStyle(colorMap[mood] || COLORS.nexus, 0.3);
    }
    this.nexusPulseSpeed = speedMap[mood] || 0.002;
  }

  private handleSectorUpdate(data: { id: string; status: string; health: number }) {
    const sector = SECTORS.find((s) => s.id === data.id);
    if (sector) {
      sector.status = data.status as Sector["status"];
      sector.health = data.health;
    }
    const container = this.sectorNodes.get(data.id);
    if (container) {
      const nodeColor = data.status === "critical" ? COLORS.red :
        data.status === "warning" ? COLORS.amber : COLORS.green;
      const circle = container.list[0] as Phaser.GameObjects.Arc;
      if (circle) circle.setFillStyle(nodeColor, 0.8);
      const ring = container.list[1] as Phaser.GameObjects.Arc;
      if (ring) ring.setStrokeStyle(2, nodeColor, 0.5);
    }
  }

  private handleCrisisTrigger(_data: { sector: string }) {
    // Flash the relevant sector node
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const flash = this.add.circle(cx, cy, 300, COLORS.red, 0.1);
    flash.setDepth(15);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      onComplete: () => flash.destroy(),
    });
    this.cameras.main.shake(200, 0.005);
  }

  private handleRestart() {
    this.scene.restart();
  }

  // Public method for React to trigger Nexus mood
  public setNexusMood(mood: string) {
    this.handleNexusMood(mood);
  }
}

// ─── PHASER GAME FACTORY ────────────────────────────────────────────────────
const StartGame = (parent: string) => {
  const game = new PhaserGame({
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#0a0f1a",
    scale: {
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [GameScene],
  });
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__PHASER_GAME__ = game;
    (window as unknown as Record<string, unknown>).__PHASER_EVENT_BUS__ = EventBus;
  }
  return game;
};

export default StartGame;
export { GameScene as Game };