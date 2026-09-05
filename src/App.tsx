import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import StartGame, { EventBus } from "./game/main";
import type { GameScene } from "./game/main";
import {
  createInitialState,
  getNexusAdvisory,
  getNexusMood,
  getNexusPrediction,
  determineEnding,
  PROLOGUE_LINES,
  DIALOGUES,
  type GameState,
  type DialogueNode,
  type CrisisEvent,
  type Ending,
} from "./game/story";

// ─── AUDIO ENGINE (Web Audio API procedural synth) ──────────────────────────
class AmbientEngine {
  private ctx: AudioContext | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private muted = false;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.03;
    this.droneGain.connect(this.ctx.destination);
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = "sine";
    this.droneOsc.frequency.value = 55;
    this.droneOsc.connect(this.droneGain);
    this.droneOsc.start();
  }

  playClick() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playNexusTone() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playAlert() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  playSuccess() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, this.ctx!.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + i * 0.12 + 0.3);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.12);
      osc.stop(this.ctx!.currentTime + i * 0.12 + 0.3);
    });
  }

  setDroneIntensity(level: number) {
    if (this.droneGain) {
      this.droneGain.gain.value = 0.02 + level * 0.04;
    }
    if (this.droneOsc) {
      this.droneOsc.frequency.value = 55 + level * 30;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.droneGain) this.droneGain.gain.value = this.muted ? 0 : 0.03;
    return this.muted;
  }

  destroy() {
    if (this.droneOsc) { this.droneOsc.stop(); this.droneOsc = null; }
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
  }
}

const audio = new AmbientEngine();

// ─── PHASER BRIDGE ──────────────────────────────────────────────────────────
function PhaserBridge({ onSceneReady }: { onSceneReady: (scene: GameScene) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gameRef.current = StartGame("game-container");
    const handleReady = (scene: GameScene) => onSceneReady(scene);
    EventBus.on("current-scene-ready", handleReady);
    return () => {
      EventBus.removeListener("current-scene-ready", handleReady);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div id="game-container" ref={containerRef} />;
}

// ─── CINEMATIC PORTRAIT CANVAS ──────────────────────────────────────────────
function CinematicPortrait({ isSpeaking, mood }: { isSpeaking: boolean; mood: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const blinkRef = useRef({ nextBlink: 120, isBlinking: false, blinkFrame: 0 });
  const breathRef = useRef(0);
  const lipRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const draw = () => {
      frameRef.current++;
      const f = frameRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Breathing cycle
      breathRef.current = Math.sin(f * 0.02) * 2;
      const breath = breathRef.current;

      // Blink logic
      const blink = blinkRef.current;
      blink.nextBlink--;
      if (blink.nextBlink <= 0 && !blink.isBlinking) {
        blink.isBlinking = true;
        blink.blinkFrame = 0;
      }
      if (blink.isBlinking) {
        blink.blinkFrame++;
        if (blink.blinkFrame > 8) {
          blink.isBlinking = false;
          blink.nextBlink = 100 + Math.random() * 150;
        }
      }

      // Lip sync (mouth openness oscillation when speaking)
      if (isSpeaking) {
        lipRef.current = Math.abs(Math.sin(f * 0.25)) * 0.7 + Math.sin(f * 0.4) * 0.3;
      } else {
        lipRef.current *= 0.85;
      }

      // Micro head sway
      const headSway = Math.sin(f * 0.008) * 1.5;
      const headTilt = Math.sin(f * 0.012) * 0.5;

      ctx.clearRect(0, 0, W, H);

      // Background gradient (cinematic vignette)
      const bgGrad = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.7);
      bgGrad.addColorStop(0, "#1a1020");
      bgGrad.addColorStop(1, "#05060a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2 + headSway;
      const cy = H * 0.38 + breath;

      // Shoulders / body (gele wrapper visible at neckline)
      ctx.save();
      ctx.translate(cx, cy);

      // Body/shoulders
      ctx.beginPath();
      ctx.ellipse(0, 95, 75, 45, 0, Math.PI, 0, true);
      ctx.fillStyle = "#2d1b4e";
      ctx.fill();

      // Neck
      ctx.beginPath();
      ctx.ellipse(0, 55, 18, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8B6914";
      ctx.fill();

      // Head (oval)
      ctx.beginPath();
      ctx.ellipse(0, 0, 38 + headTilt, 48, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#9B7420";
      ctx.fill();

      // Gele headwrap (traditional Nigerian head tie - purple/indigo)
      ctx.beginPath();
      ctx.moveTo(-42, -15);
      ctx.quadraticCurveTo(-45, -55, -20, -65);
      ctx.quadraticCurveTo(5, -78, 30, -62);
      ctx.quadraticCurveTo(48, -50, 44, -15);
      ctx.quadraticCurveTo(42, -25, 35, -30);
      ctx.quadraticCurveTo(15, -45, -10, -42);
      ctx.quadraticCurveTo(-30, -38, -38, -20);
      ctx.closePath();
      ctx.fillStyle = "#6b21a8";
      ctx.fill();
      ctx.strokeStyle = "#9333ea";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gele fold detail
      ctx.beginPath();
      ctx.moveTo(-15, -60);
      ctx.quadraticCurveTo(0, -70, 15, -58);
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gele top knot
      ctx.beginPath();
      ctx.ellipse(5, -68, 15, 8, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#7c3aed";
      ctx.fill();

      // Eyes
      const eyeY = -5;
      const blinkAmount = blink.isBlinking ? Math.sin(blink.blinkFrame / 8 * Math.PI) : 0;
      const eyeOpenness = 1 - blinkAmount;

      // Left eye
      ctx.beginPath();
      ctx.ellipse(-14, eyeY, 7, 5 * eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f0e8";
      ctx.fill();
      if (eyeOpenness > 0.3) {
        ctx.beginPath();
        ctx.arc(-14, eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#1a0a00";
        ctx.fill();
        // Pupil highlight
        ctx.beginPath();
        ctx.arc(-13, eyeY - 1, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      // Right eye
      ctx.beginPath();
      ctx.ellipse(14, eyeY, 7, 5 * eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f0e8";
      ctx.fill();
      if (eyeOpenness > 0.3) {
        ctx.beginPath();
        ctx.arc(14, eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#1a0a00";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, eyeY - 1, 1, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      // Eyebrows (expressive)
      const browRaise = mood === "stern" ? -2 : mood === "warm" ? 1 : 0;
      ctx.beginPath();
      ctx.moveTo(-22, eyeY - 9 + browRaise);
      ctx.quadraticCurveTo(-14, eyeY - 12 + browRaise, -7, eyeY - 9 + browRaise);
      ctx.strokeStyle = "#3d2000";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(7, eyeY - 9 + browRaise);
      ctx.quadraticCurveTo(14, eyeY - 12 + browRaise, 22, eyeY - 9 + browRaise);
      ctx.strokeStyle = "#3d2000";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Nose
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(-4, 12, -6, 15);
      ctx.quadraticCurveTo(0, 18, 6, 15);
      ctx.quadraticCurveTo(4, 12, 0, -2);
      ctx.fillStyle = "#8a6518";
      ctx.fill();

      // Mouth with lip sync
      const mouthOpen = lipRef.current * 8;
      const mouthY = 26;

      // Lips
      ctx.beginPath();
      ctx.moveTo(-12, mouthY);
      ctx.quadraticCurveTo(-6, mouthY - 3, 0, mouthY - 2);
      ctx.quadraticCurveTo(6, mouthY - 3, 12, mouthY);
      // Lower lip
      ctx.quadraticCurveTo(6, mouthY + 4 + mouthOpen, 0, mouthY + 5 + mouthOpen);
      ctx.quadraticCurveTo(-6, mouthY + 4 + mouthOpen, -12, mouthY);
      ctx.fillStyle = "#8b3a3a";
      ctx.fill();

      // Mouth interior when open
      if (mouthOpen > 2) {
        ctx.beginPath();
        ctx.ellipse(0, mouthY + 2, 8, mouthOpen * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#2d0a0a";
        ctx.fill();
      }

      // Smile lines (age/wisdom)
      ctx.beginPath();
      ctx.moveTo(-20, 10);
      ctx.quadraticCurveTo(-18, 20, -14, mouthY - 2);
      ctx.strokeStyle = "#7a5a10";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(20, 10);
      ctx.quadraticCurveTo(18, 20, 14, mouthY - 2);
      ctx.strokeStyle = "#7a5a10";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Earrings (gold hoops)
      ctx.beginPath();
      ctx.arc(-38, 10, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(38, 10, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Necklace (coral beads)
      ctx.beginPath();
      ctx.ellipse(0, 72, 30, 12, 0, 0, Math.PI);
      ctx.strokeStyle = "#ff6b35";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 76, 26, 10, 0, 0, Math.PI);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();

      // Cinematic vignette overlay
      const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.6);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Subtle film grain
      if (f % 3 === 0) {
        for (let i = 0; i < 50; i++) {
          const gx = Math.random() * W;
          const gy = Math.random() * H;
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
          ctx.fillRect(gx, gy, 1, 1);
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [isSpeaking, mood]);

  return <canvas ref={canvasRef} width={280} height={320} className="cinematic-portrait" />;
}

// ─── SPEECH ENGINE ──────────────────────────────────────────────────────────
function useMamaEseSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.82;
    utterance.pitch = 0.7;
    utterance.volume = 0.9;

    // Try to find a deep female voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Female") || v.name.includes("female") ||
      v.lang.startsWith("en-GB") || v.lang.startsWith("en-NG")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}

// ─── CINEMATIC DIALOGUE OVERLAY ─────────────────────────────────────────────
function CinematicDialogueOverlay({
  node,
  charName,
  onSelectOption,
  onClose,
}: {
  node: DialogueNode;
  charName: string;
  onSelectOption: (idx: number) => void;
  onClose: () => void;
}) {
  const { speak, stop, isSpeaking } = useMamaEseSpeech();
  const [displayedText, setDisplayedText] = useState("");
  const [textComplete, setTextComplete] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Typewriter effect + speech trigger
  useEffect(() => {
    setDisplayedText("");
    setTextComplete(false);
    let idx = 0;
    const text = node.text;

    typingRef.current = setInterval(() => {
      idx++;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        setTextComplete(true);
      }
    }, 28);

    // Start speech after a brief cinematic pause
    const speechDelay = setTimeout(() => {
      speak(text);
    }, 600);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
      clearTimeout(speechDelay);
      stop();
    };
  }, [node.text]);

  const skipTyping = () => {
    if (!textComplete) {
      if (typingRef.current) clearInterval(typingRef.current);
      setDisplayedText(node.text);
      setTextComplete(true);
    }
  };

  return (
    <div className="cinematic-overlay" onClick={skipTyping}>
      <div className="cinematic-backdrop" />
      <div className="cinematic-container">
        <div className="cinematic-portrait-frame">
          <CinematicPortrait isSpeaking={isSpeaking} mood="stern" />
          <div className="cinematic-name-plate">
            <span className="cinematic-name">{charName}</span>
            <span className="cinematic-role">Board Liaison & Strategic Advisor</span>
          </div>
        </div>
        <div className="cinematic-dialogue-panel">
          <div className="cinematic-subtitle">
            {displayedText}
            {!textComplete && <span className="typing-cursor">▌</span>}
          </div>
          {textComplete && (
            <div className="cinematic-options">
              {node.options.map((opt, i) => (
                <button
                  key={i}
                  className={`cinematic-option ${opt.nexusAction ? `nexus-${opt.nexusAction}` : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                    onSelectOption(i);
                  }}
                >
                  {opt.nexusAction && (
                    <span className="opt-action-tag">[{opt.nexusAction.toUpperCase()}]</span>
                  )}
                  {opt.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button className="cinematic-close" onClick={(e) => { e.stopPropagation(); stop(); onClose(); }}>✕</button>
      {isSpeaking && <div className="audio-wave-indicator"><span /><span /><span /></div>}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [scene, setScene] = useState<GameScene | null>(null);
  const [muted, setMuted] = useState(false);
  const [prologueIndex, setPrologueIndex] = useState(0);
  const [activeDialogue, setActiveDialogue] = useState<{ charId: string; node: DialogueNode; history: string[] } | null>(null);
  const [activeCrisis, setActiveCrisis] = useState<CrisisEvent | null>(null);
  const [nexusMessage, setNexusMessage] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize audio on first interaction
  const initAudio = useCallback(() => {
    audio.init();
  }, []);

  // Nexus advisory ticker
  useEffect(() => {
    if (gameState.phase !== "DASHBOARD") return;
    const interval = setInterval(() => {
      const msg = getNexusAdvisory(gameState.nexus);
      setNexusMessage(msg);
      const prediction = getNexusPrediction(gameState.nexus, gameState.decisions[gameState.decisions.length - 1] || "");
      if (prediction) {
        setNexusMessage((prev) => prev + " // " + prediction);
      }
      const mood = getNexusMood(gameState.nexus);
      if (mood !== gameState.nexus.mood) {
        setGameState((prev) => ({
          ...prev,
          nexus: { ...prev.nexus, mood },
        }));
        EventBus.emit("nexus-mood-change", mood);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [gameState.phase, gameState.nexus, gameState.decisions]);

  // Crisis auto-trigger based on time thresholds
  useEffect(() => {
    if (gameState.phase !== "DASHBOARD") return;
    const unresolvedCrises = gameState.crises.filter((c) => !c.triggered && !c.resolved);
    if (unresolvedCrises.length === 0) return;
    const nextCrisis = unresolvedCrises[0];
    // Trigger crisis when remaining time drops below (48 - timeLimit * 8)
    const triggerThreshold = 48 - nextCrisis.timeLimit * 8;
    if (gameState.resources.time <= triggerThreshold) {
      setGameState((prev) => ({
        ...prev,
        crises: prev.crises.map((c) => c.id === nextCrisis.id ? { ...c, triggered: true } : c),
      }));
      EventBus.emit("trigger-crisis", { sector: nextCrisis.sector });
      triggerCrisis(nextCrisis.id);
    }
  }, [gameState.resources.time, gameState.phase]);

  const triggerCrisis = (crisisId: string) => {
    const crisis = gameState.crises.find((c) => c.id === crisisId);
    if (!crisis || crisis.resolved) return;
    setActiveCrisis(crisis);
    audio.playAlert();
  };

  const resolveCrisis = (optionIndex: number) => {
    if (!activeCrisis) return;
    const option = activeCrisis.options[optionIndex];
    setGameState((prev) => {
      const newResources = { ...prev.resources };
      if (option.resourceDelta) {
        Object.entries(option.resourceDelta).forEach(([key, val]) => {
          if (key in newResources) {
            (newResources as Record<string, number>)[key] = Math.max(0, Math.min(100, (newResources as Record<string, number>)[key] + (val as number)));
          }
        });
      }
      const newNexus = { ...prev.nexus };
      if (option.nexusAction === "trust") {
        newNexus.trustLevel = Math.min(100, newNexus.trustLevel + 15);
        newNexus.dependencyScore = Math.min(100, newNexus.dependencyScore + 12);
      } else if (option.nexusAction === "verify") {
        newNexus.verifyCount += 1;
        newNexus.dependencyScore = Math.max(0, newNexus.dependencyScore - 8);
      } else if (option.nexusAction === "restrict") {
        newNexus.restrictCount += 1;
        newNexus.dependencyScore = Math.max(0, newNexus.dependencyScore - 15);
        newNexus.trustLevel = Math.max(0, newNexus.trustLevel - 10);
      }
      const newCharacters = { ...prev.characters };
      Object.entries(option.trustDelta).forEach(([id, delta]) => {
        if (id !== "nexus" && newCharacters[id]) {
          newCharacters[id] = { ...newCharacters[id], trust: Math.max(0, Math.min(100, newCharacters[id].trust + delta)) };
        }
      });
      return {
        ...prev,
        resources: newResources,
        nexus: newNexus,
        characters: newCharacters,
        crises: prev.crises.map((c) => (c.id === activeCrisis.id ? { ...c, resolved: true } : c)),
        decisions: [...prev.decisions, option.nexusAction || "neutral"],
      };
    });
    EventBus.emit("sector-update", { id: activeCrisis.sector, status: "stable", health: 80 });
    showNotification(option.outcome);
    if (option.nexusAction === "trust") audio.playNexusTone();
    else if (option.nexusAction === "verify") audio.playClick();
    else audio.playAlert();
    setActiveCrisis(null);
    checkGameEnd();
  };

  const startInvestigation = (evidenceId: string) => {
    setGameState((prev) => {
      const evidence = { ...prev.evidence };
      if (evidence[evidenceId]) {
        evidence[evidenceId] = { ...evidence[evidenceId], unlocked: true };
      }
      return { ...prev, evidence };
    });
    audio.playClick();
    showNotification("Evidence file accessed and added to case record.");
  };

  const startInterrogation = (charId: string) => {
    const dialogues = DIALOGUES[charId];
    if (!dialogues || dialogues.length === 0) return;
    setActiveDialogue({ charId, node: dialogues[0], history: [] });
    audio.playClick();
  };

  const selectDialogueOption = (optionIndex: number) => {
    if (!activeDialogue) return;
    const option = activeDialogue.node.options[optionIndex];
    const newHistory = [...activeDialogue.history, `${activeDialogue.node.text}

> ${option.text}

${option.response}`];

    setGameState((prev) => {
      const characters = { ...prev.characters };
      const char = characters[activeDialogue.charId];
      if (char) {
        characters[activeDialogue.charId] = {
          ...char,
          trust: Math.max(0, Math.min(100, char.trust + option.trustDelta)),
          unlocked: option.unlocksSecret ? true : char.unlocked,
        };
      }
      const evidence = { ...prev.evidence };
      if (option.unlocksEvidence && evidence[option.unlocksEvidence]) {
        evidence[option.unlocksEvidence] = { ...evidence[option.unlocksEvidence], unlocked: true };
      }
      const resources = { ...prev.resources };
      if (option.resourceDelta) {
        Object.entries(option.resourceDelta).forEach(([key, val]) => {
          if (key in resources) {
            (resources as Record<string, number>)[key] = Math.max(0, Math.min(100, (resources as Record<string, number>)[key] + (val as number)));
          }
        });
      }
      const newNexus = { ...prev.nexus };
      if (option.nexusAction === "trust") {
        newNexus.trustLevel = Math.min(100, newNexus.trustLevel + 10);
        newNexus.dependencyScore = Math.min(100, newNexus.dependencyScore + 8);
      } else if (option.nexusAction === "verify") {
        newNexus.verifyCount += 1;
        newNexus.dependencyScore = Math.max(0, newNexus.dependencyScore - 5);
      } else if (option.nexusAction === "restrict") {
        newNexus.restrictCount += 1;
        newNexus.dependencyScore = Math.max(0, newNexus.dependencyScore - 10);
      }
      return { ...prev, characters, evidence, resources, nexus: newNexus, decisions: [...prev.decisions, option.nexusAction || "neutral"] };
    });

    const dialogues = DIALOGUES[activeDialogue.charId];
    const currentIdx = dialogues.indexOf(activeDialogue.node);
    if (currentIdx < dialogues.length - 1) {
      setActiveDialogue({ charId: activeDialogue.charId, node: dialogues[currentIdx + 1], history: newHistory });
    } else {
      showNotification(option.response);
      setActiveDialogue(null);
    }
    checkGameEnd();
  };

  const checkGameEnd = () => {
    setTimeout(() => {
      setGameState((prev) => {
        const totalResolved = prev.crises.filter((c) => c.resolved).length;
        const evidenceUnlocked = Object.values(prev.evidence).filter((e) => e.unlocked).length;
        if (prev.resources.time <= 0 || totalResolved >= 4 || evidenceUnlocked >= 6) {
          const end = determineEnding(prev);
          setEnding(end);
          audio.playSuccess();
          return { ...prev, phase: "EPILOGUE" };
        }
        return prev;
      });
    }, 500);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const startGame = () => {
    initAudio();
    setGameState((prev) => ({ ...prev, phase: "PROLOGUE" }));
    audio.playClick();
  };

  const advancePrologue = () => {
    if (prologueIndex < PROLOGUE_LINES.length - 1) {
      setPrologueIndex((prev) => prev + 1);
      audio.playClick();
    } else {
      setGameState((prev) => ({ ...prev, phase: "DASHBOARD" }));
      audio.playSuccess();
    }
  };

  const restartGame = () => {
    setGameState(createInitialState());
    setPrologueIndex(0);
    setActiveDialogue(null);
    setActiveCrisis(null);
    setEnding(null);
    setShowEvidence(false);
    setShowCharacters(false);
    EventBus.emit("game-restart");
  };

  const toggleMute = () => {
    setMuted(audio.toggleMute());
  };

  const isMamaEse = activeDialogue?.charId === "mamaEse";

  return (
    <div className="app-root" onClick={initAudio}>
      <PhaserBridge onSceneReady={setScene} />

      {/* HUD Layer */}
      <div id="hud">
        <button className="hud-btn mute-btn" onClick={toggleMute}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast">
          <span className="notif-icon">◈</span>
          {notification}
        </div>
      )}

      {/* BOOT / MENU PHASE */}
      {gameState.phase === "BOOT" && (
        <div className="overlay menu-overlay">
          <div className="menu-content">
            <div className="title-block">
              <h1 className="game-title">AFTERLIGHT</h1>
              <p className="game-subtitle">Case 01: The Review</p>
              <div className="title-line" />
              <p className="game-tagline">A Nigerian Tactical Psychological Thriller</p>
            </div>
            <button className="btn-primary" onClick={startGame}>
              <span className="btn-icon">▶</span> INITIALIZE COMMAND
            </button>
            <div className="menu-meta">
              <span>48-HOUR AUDIT WINDOW</span>
              <span>•</span>
              <span>NEXUS AI v4.2.1 ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* PROLOGUE PHASE */}
      {gameState.phase === "PROLOGUE" && (
        <div className="overlay prologue-overlay" onClick={advancePrologue}>
          <div className="prologue-content">
            <div className="prologue-speaker">
              {PROLOGUE_LINES[prologueIndex]?.speaker === "SYSTEM" && <span className="sys-tag">SYSTEM</span>}
              {PROLOGUE_LINES[prologueIndex]?.speaker === "NEXUS" && <span className="nexus-tag">NEXUS AI</span>}
              {PROLOGUE_LINES[prologueIndex]?.speaker === "Mama Ese" && <span className="char-tag mama">MAMA ESE</span>}
            </div>
            <p className="prologue-text">{PROLOGUE_LINES[prologueIndex]?.text}</p>
            <div className="prologue-progress">
              {PROLOGUE_LINES.map((_, i) => (
                <span key={i} className={`prog-dot ${i <= prologueIndex ? "active" : ""}`} />
              ))}
            </div>
            <p className="prologue-hint">Click anywhere to continue...</p>
          </div>
        </div>
      )}

      {/* DASHBOARD PHASE */}
      {gameState.phase === "DASHBOARD" && !activeDialogue && !activeCrisis && (
        <div className="dashboard-layout">
          {/* Top HUD */}
          <div className="hud-top">
            <div className="hud-resources">
              <ResourceBar label="POWER" value={gameState.resources.power} color="#f59e0b" />
              <ResourceBar label="COMMS" value={gameState.resources.comms} color="#2dd4bf" />
              <ResourceBar label="BUDGET" value={gameState.resources.budget} color="#a78bfa" />
              <ResourceBar label="STAFF" value={gameState.resources.personnel} color="#22c55e" />
              <ResourceBar label="TRUST" value={gameState.resources.publicTrust} color="#fb923c" />
            </div>
            <div className="hud-time">
              <span className="time-label">TIME REMAINING</span>
              <span className="time-value">{gameState.resources.time}h</span>
            </div>
          </div>

          {/* Nexus Advisory Panel */}
          <div className={`nexus-panel mood-${gameState.nexus.mood}`}>
            <div className="nexus-header">
              <span className="nexus-dot" />
              <span>NEXUS ADVISORY</span>
              <span className="nexus-level">LVL {gameState.nexus.advisoryLevel}</span>
            </div>
            <p className="nexus-message">{nexusMessage || "Awaiting operational parameters..."}</p>
            <div className="nexus-stats">
              <span>TRUST: {gameState.nexus.trustLevel}%</span>
              <span>DEP: {gameState.nexus.dependencyScore}%</span>
              <span>VERIFY: {gameState.nexus.verifyCount}</span>
              <span>RESTRICT: {gameState.nexus.restrictCount}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="hud-actions">
            <button className="btn-action" onClick={() => setShowEvidence(true)}>
              ◈ EVIDENCE FILES
            </button>
            <button className="btn-action" onClick={() => setShowCharacters(true)}>
              ◉ PERSONNEL
            </button>
          </div>
        </div>
      )}

      {/* EVIDENCE OVERLAY */}
      {showEvidence && (
        <div className="overlay evidence-overlay">
          <div className="evidence-panel">
            <div className="panel-header">
              <h2>CASE EVIDENCE</h2>
              <button className="btn-close" onClick={() => setShowEvidence(false)}>✕</button>
            </div>
            <div className="evidence-grid">
              {Object.values(gameState.evidence).map((ev) => (
                <div key={ev.id} className={`evidence-card ${ev.unlocked ? "unlocked" : "locked"}`}>
                  <h3>{ev.unlocked ? ev.title : "CLASSIFIED"}</h3>
                  {ev.unlocked ? (
                    <>
                      <p>{ev.description}</p>
                      <span className="credibility">Credibility: {ev.credibility}%</span>
                      <span className="source">Source: {ev.source}</span>
                    </>
                  ) : (
                    <p className="locked-text">Requires investigation to unlock.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHARACTERS OVERLAY */}
      {showCharacters && (
        <div className="overlay characters-overlay">
          <div className="characters-panel">
            <div className="panel-header">
              <h2>PERSONNEL DOSSIER</h2>
              <button className="btn-close" onClick={() => setShowCharacters(false)}>✕</button>
            </div>
            <div className="characters-grid">
              {Object.values(gameState.characters).map((char) => (
                <div key={char.id} className="character-card">
                  <div className="char-header">
                    <span className="char-name" style={{ color: char.color }}>{char.name}</span>
                    <span className="char-role">{char.role}</span>
                  </div>
                  <div className="char-meta">
                    <span>{char.age}</span>
                    <span>{char.ethnicity}</span>
                    <span>{char.region}</span>
                  </div>
                  <div className="char-traits">
                    {char.traits.map((t) => <span key={t} className="trait-tag">{t}</span>)}
                  </div>
                  <div className="char-trust">
                    <span>TRUST</span>
                    <div className="trust-bar"><div className="trust-fill" style={{ width: `${char.trust}%`, background: char.color }} /></div>
                    <span>{char.trust}%</span>
                  </div>
                  <button className="btn-interrogate" onClick={() => { setShowCharacters(false); startInterrogation(char.id); }}>
                    INTERROGATE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CINEMATIC DIALOGUE OVERLAY (Mama Ese) */}
      {activeDialogue && isMamaEse && (
        <CinematicDialogueOverlay
          node={activeDialogue.node}
          charName={gameState.characters[activeDialogue.charId]?.name || "Mama Ese Okon"}
          onSelectOption={selectDialogueOption}
          onClose={() => setActiveDialogue(null)}
        />
      )}

      {/* STANDARD INTERROGATION OVERLAY (other characters) */}
      {activeDialogue && !isMamaEse && (
        <div className="overlay interrogation-overlay">
          <div className="interrogation-panel">
            <div className="interrogation-header">
              <span className="int-title">INTERROGATION — {gameState.characters[activeDialogue.charId]?.name.toUpperCase()}</span>
              <button className="btn-close" onClick={() => setActiveDialogue(null)}>✕</button>
            </div>
            <div className="dialogue-history">
              {activeDialogue.history.map((h, i) => (
                <div key={i} className="history-entry">{h}</div>
              ))}
            </div>
            <div className="dialogue-current">
              <div className="speaker-tag" style={{ color: gameState.characters[activeDialogue.charId]?.color }}>
                {activeDialogue.node.speaker}
              </div>
              <p className="dialogue-text">{activeDialogue.node.text}</p>
            </div>
            <div className="dialogue-options">
              {activeDialogue.node.options.map((opt, i) => (
                <button key={i} className={`option-btn ${opt.nexusAction ? `nexus-${opt.nexusAction}` : ""}`} onClick={() => selectDialogueOption(i)}>
                  {opt.nexusAction && <span className="opt-action-tag">[{opt.nexusAction.toUpperCase()}]</span>}
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CRISIS OVERLAY */}
      {activeCrisis && (
        <div className="overlay crisis-overlay">
          <div className="crisis-panel">
            <div className="crisis-header">
              <span className="crisis-icon">⚠</span>
              <h2>{activeCrisis.title}</h2>
              <span className="crisis-sector">{activeCrisis.sector}</span>
            </div>
            <p className="crisis-desc">{activeCrisis.description}</p>
            <div className="nexus-crisis-advice">
              <span className="nexus-label">NEXUS RECOMMENDATION ({activeCrisis.nexusConfidence}% confidence)</span>
              <p>{activeCrisis.nexusAdvice}</p>
            </div>
            <div className="crisis-options">
              {activeCrisis.options.map((opt, i) => (
                <button key={i} className={`crisis-btn ${opt.nexusAction ? `crisis-${opt.nexusAction}` : ""}`} onClick={() => resolveCrisis(i)}>
                  <span className="crisis-action-tag">{opt.nexusAction?.toUpperCase() || "ACT"}</span>
                  <span className="crisis-opt-text">{opt.text}</span>
                  <span className="crisis-costs">
                    {opt.resourceDelta && Object.entries(opt.resourceDelta).map(([k, v]) => (
                      <span key={k} className={`cost ${v < 0 ? "negative" : "positive"}`}>{k}: {v > 0 ? "+" : ""}{v}</span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EPILOGUE / ENDING */}
      {gameState.phase === "EPILOGUE" && ending && (
        <div className="overlay ending-overlay">
          <div className="ending-content">
            <h2 className="ending-title">{ending.title}</h2>
            <p className="ending-desc">{ending.description}</p>
            <div className="ending-epilogue">
              {ending.epilogue.map((line, i) => (
                <p key={i} className="epilogue-line" style={{ animationDelay: `${i * 0.8}s` }}>{line}</p>
              ))}
            </div>
            <div className="ending-stats">
              <div className="stat-row"><span>Nexus Dependency</span><span>{gameState.nexus.dependencyScore}%</span></div>
              <div className="stat-row"><span>Evidence Unlocked</span><span>{Object.values(gameState.evidence).filter((e) => e.unlocked).length}/8</span></div>
              <div className="stat-row"><span>Crises Resolved</span><span>{gameState.crises.filter((c) => c.resolved).length}/4</span></div>
              <div className="stat-row"><span>Time Remaining</span><span>{gameState.resources.time}h</span></div>
            </div>
            <button className="btn-primary" onClick={restartGame}>RESTART CASE FILE</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESOURCE BAR COMPONENT ─────────────────────────────────────────────────
function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="resource-bar">
      <span className="res-label">{label}</span>
      <div className="res-track">
        <div className="res-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="res-value">{value}%</span>
    </div>
  );
}