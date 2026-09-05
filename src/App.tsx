import { useEffect, useRef, useState, useCallback } from "react";
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

  // Crisis auto-trigger based on time
  useEffect(() => {
    if (gameState.phase !== "DASHBOARD") return;
    const unresolvedCrises = gameState.crises.filter((c) => !c.triggered && !c.resolved);
    if (unresolvedCrises.length === 0) return;
    const nextCrisis = unresolvedCrises[0];
    if (gameState.resources.time <= (nextCrisis.triggered ? 0 : gameState.resources.time - 8)) {
      triggerCrisis(nextCrisis.id);
    }
  }, [gameState.resources.time, gameState.phase]);

  const triggerCrisis = (crisisId: string) => {
    const crisis = gameState.crises.find((c) => c.id === crisisId);
    if (!crisis || crisis.resolved) return;
    setGameState((prev) => ({
      ...prev,
      crises: prev.crises.map((c) => (c.id === crisisId ? { ...c, triggered: true } : c)),
    }));
    setActiveCrisis({ ...crisis, triggered: true });
    EventBus.emit("trigger-crisis", { sector: crisis.sector });
    EventBus.emit("sector-update", { id: crisis.sector, status: "critical", health: 25 });
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
      const nexus = { ...prev.nexus };
      if (option.nexusAction === "trust") {
        nexus.trustLevel = Math.min(100, nexus.trustLevel + 15);
        nexus.dependencyScore = Math.min(100, nexus.dependencyScore + 12);
      } else if (option.nexusAction === "verify") {
        nexus.verifyCount += 1;
        nexus.dependencyScore = Math.max(0, nexus.dependencyScore - 8);
      } else if (option.nexusAction === "restrict") {
        nexus.restrictCount += 1;
        nexus.dependencyScore = Math.max(0, nexus.dependencyScore - 15);
      }
      return { ...prev, characters, evidence, resources, nexus, decisions: [...prev.decisions, option.nexusAction || "dialogue"] };
    });

    // Advance dialogue or close
    const dialogues = DIALOGUES[activeDialogue.charId];
    const currentIdx = dialogues.indexOf(activeDialogue.node);
    if (currentIdx < dialogues.length - 1) {
      setActiveDialogue({ charId: activeDialogue.charId, node: dialogues[currentIdx + 1], history: newHistory });
    } else {
      setActiveDialogue(null);
    }

    if (option.nexusAction === "trust") audio.playNexusTone();
    else audio.playClick();
  };

  const advancePrologue = () => {
    audio.init();
    audio.playClick();
    if (prologueIndex < PROLOGUE_LINES.length - 1) {
      setPrologueIndex((p) => p + 1);
    } else {
      setGameState((prev) => ({ ...prev, phase: "DASHBOARD" }));
    }
  };

  const startGame = () => {
    audio.init();
    audio.playClick();
    setGameState((prev) => ({ ...prev, phase: "PROLOGUE" }));
    setPrologueIndex(0);
  };

  const presentToBoard = () => {
    const resolvedCrises = gameState.crises.filter((c) => c.resolved).length;
    const unlockedEvidence = Object.values(gameState.evidence).filter((e) => e.unlocked).length;
    if (resolvedCrises < 2 && unlockedEvidence < 3) {
      showNotification("Insufficient evidence or unresolved crises. Continue investigating.");
      return;
    }
    const result = determineEnding(gameState);
    setEnding(result);
    setGameState((prev) => ({ ...prev, phase: "EPILOGUE" }));
    audio.playSuccess();
  };

  const restartGame = () => {
    setGameState(createInitialState());
    setEnding(null);
    setActiveDialogue(null);
    setActiveCrisis(null);
    setShowEvidence(false);
    setShowCharacters(false);
    setPrologueIndex(0);
    setNexusMessage("");
    setNotification(null);
    EventBus.emit("game-restart");
    audio.playClick();
  };

  const checkGameEnd = () => {
    setGameState((prev) => {
      if (prev.resources.power < 20 || prev.resources.budget < 10 || prev.resources.time <= 0) {
        const result = determineEnding(prev);
        setEnding(result);
        return { ...prev, phase: "EPILOGUE" };
      }
      return prev;
    });
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleMute = () => {
    setMuted(audio.toggleMute());
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-root" onClick={initAudio}>
      <PhaserBridge onSceneReady={setScene} />

      {/* CRT Overlay */}
      <div className="crt-overlay" />

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

          {/* Action Buttons */}
          <div className="action-bar">
            <button className="btn-action" onClick={() => setShowEvidence(true)}>
              <span>📁</span> EVIDENCE
            </button>
            <button className="btn-action" onClick={() => setShowCharacters(true)}>
              <span>👤</span> PERSONNEL
            </button>
            <button className="btn-action btn-crisis" onClick={() => {
              const next = gameState.crises.find((c) => !c.triggered && !c.resolved);
              if (next) triggerCrisis(next.id);
              else showNotification("All crises resolved. Present findings to the Board.");
            }}>
              <span>⚡</span> CRISIS
            </button>
            <button className="btn-action btn-present" onClick={presentToBoard}>
              <span>🏛</span> PRESENT TO BOARD
            </button>
            <button className="btn-action btn-mute" onClick={toggleMute}>
              <span>{muted ? "🔇" : "🔊"}</span> {muted ? "UNMUTE" : "MUTE"}
            </button>
          </div>

          {/* Sector Status */}
          <div className="sector-panel">
            <h3>SECTOR STATUS</h3>
            {gameState.crises.map((c) => (
              <div key={c.id} className={`sector-item ${c.resolved ? "resolved" : c.triggered ? "active" : "pending"}`}>
                <span className="sector-dot" />
                <span className="sector-name">{c.sector}</span>
                <span className="sector-status">{c.resolved ? "RESOLVED" : c.triggered ? "ACTIVE" : "PENDING"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EVIDENCE PANEL */}
      {showEvidence && (
        <div className="overlay panel-overlay">
          <div className="panel">
            <div className="panel-header">
              <h2>EVIDENCE FILES</h2>
              <button className="btn-close" onClick={() => setShowEvidence(false)}>✕</button>
            </div>
            <div className="evidence-grid">
              {Object.values(gameState.evidence).map((ev) => (
                <div key={ev.id} className={`evidence-card ${ev.unlocked ? "unlocked" : "locked"}`}>
                  <div className="ev-header">
                    <span className={`ev-status ${ev.unlocked ? "found" : "sealed"}`}>
                      {ev.unlocked ? "✓" : "🔒"}
                    </span>
                    <h4>{ev.title}</h4>
                  </div>
                  {ev.unlocked ? (
                    <>
                      <p className="ev-desc">{ev.description}</p>
                      <div className="ev-meta">
                        <span>SOURCE: {ev.source}</span>
                        <span>CREDIBILITY: {ev.credibility}%</span>
                        {ev.nexusFlag && <span className="nexus-flag">NEXUS FLAGGED</span>}
                      </div>
                    </>
                  ) : (
                    <p className="ev-locked">[ SEALED — Requires investigation ]</p>
                  )}
                  {!ev.unlocked && (
                    <button className="btn-investigate" onClick={() => startInvestigation(ev.id)}>
                      INVESTIGATE
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHARACTERS PANEL */}
      {showCharacters && (
        <div className="overlay panel-overlay">
          <div className="panel">
            <div className="panel-header">
              <h2>PERSONNEL DOSSIERS</h2>
              <button className="btn-close" onClick={() => setShowCharacters(false)}>✕</button>
            </div>
            <div className="characters-grid">
              {Object.values(gameState.characters).map((char) => (
                <div key={char.id} className="character-card" style={{ borderColor: char.color }}>
                  <div className="char-header">
                    <div className="char-avatar" style={{ background: char.color + "22", borderColor: char.color }}>
                      {char.name[0]}
                    </div>
                    <div>
                      <h4>{char.name}</h4>
                      <p className="char-role">{char.role}</p>
                      <p className="char-region">{char.ethnicity} • {char.region}</p>
                    </div>
                  </div>
                  <p className="char-desc">{char.description}</p>
                  <div className="char-traits">
                    {char.traits.map((t) => <span key={t} className="trait-tag">{t}</span>)}
                  </div>
                  <div className="char-trust">
                    <span>TRUST</span>
                    <div className="trust-bar">
                      <div className="trust-fill" style={{ width: `${char.trust}%`, background: char.color }} />
                    </div>
                    <span>{char.trust}%</span>
                  </div>
                  {char.unlocked && (
                    <div className="char-secret">
                      <span className="secret-label">SECRET REVEALED</span>
                      <p>{char.secret}</p>
                    </div>
                  )}
                  <button className="btn-interrogate" onClick={() => { setShowCharacters(false); startInterrogation(char.id); }}>
                    INTERROGATE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTERROGATION OVERLAY */}
      {activeDialogue && (
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