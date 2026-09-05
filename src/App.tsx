import { useLayoutEffect, useRef, useState, useCallback, useEffect } from 'react';
import StartGame, {
  EventBus,
  EVT_PHASE_CHANGED,
  EVT_ATMOSPHERE_MODE,
  EVT_CRISIS_TRIGGERED,
} from './game/main';
import {
  INITIAL_RESOURCES,
  CHARACTERS,
  EVIDENCE_DB,
  DECISIONS,
  CRISES,
  PROLOGUE_LINES,
  TICKER_MESSAGES,
  applyImpact,
  resolveEnding,
  getCharacter,
} from './game/story';
import type { Resources, GamePhase, Character, DialogueNode, Ending } from './game/story';

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

// ---------------------------------------------------------------------------
// Inline Web Audio ambient engine (procedural — no audio files needed)
// ---------------------------------------------------------------------------
class AmbientEngine {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private started = false;
  muted = false;

  private ensure() {
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (AC) this.ctx = new AC();
    }
    return this.ctx;
  }

  startDrone() {
    const ctx = this.ensure();
    if (!ctx || this.started) return;
    this.started = true;
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.04;
    gain.connect(ctx.destination);
    this.droneGain = gain;
    const freqs = [55, 82.4, 110];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = i === 2 ? 0.25 : 0.5;
      osc.connect(og);
      og.connect(gain);
      osc.start();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain);
      lfoGain.connect(og.gain);
      lfo.start();
    });
  }

  blip(kind: 'click' | 'alert' | 'good' = 'click') {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    if (kind === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (kind === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(784, now + 0.1);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(m ? 0 : 0.04, this.ctx.currentTime, 0.2);
    }
  }
}

const audio = new AmbientEngine();

// ---------------------------------------------------------------------------
// HUD resource bar
// ---------------------------------------------------------------------------
const RES_META: { key: keyof Resources; label: string; unit: string; critical: number }[] = [
  { key: 'power', label: 'Power', unit: 'MW', critical: 30 },
  { key: 'comms', label: 'Comms', unit: '%', critical: 25 },
  { key: 'budget', label: 'Budget', unit: '₦M', critical: 20 },
  { key: 'staff', label: 'Personnel', unit: '', critical: 25 },
  { key: 'time', label: 'Time', unit: 'h', critical: 6 },
  { key: 'trust', label: 'Public Trust', unit: '%', critical: 20 },
];

function ResourceBar({ resources }: { resources: Resources }) {
  return (
    <div className="resource-bar">
      {RES_META.map((m) => {
        const val = Math.round(resources[m.key]);
        const isCrit = val <= m.critical;
        return (
          <div key={m.key} className={`resource-item${isCrit ? ' critical' : ''}`}>
            <span className="res-label">{m.label}</span>
            <span className="res-value">
              {val}
              {m.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ImpactTags({ impact }: { impact: Partial<Resources> }) {
  const labels: Record<keyof Resources, string> = {
    power: 'PWR',
    comms: 'COMM',
    budget: 'BUD',
    staff: 'STAFF',
    time: 'TIME',
    trust: 'TRUST',
  };
  const entries = Object.entries(impact) as [keyof Resources, number][];
  return (
    <div className="choice-impacts">
      {entries.map(([k, v]) => (
        <span key={k} className={`impact-tag${v < 0 ? ' negative' : ''}`}>
          {labels[k]} {v > 0 ? '+' : ''}
          {v}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
function App() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [phase, setPhase] = useState<GamePhase>('BOOT');
  const [resources, setResources] = useState<Resources>(INITIAL_RESOURCES);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);

  const [activeChar, setActiveChar] = useState<Character | null>(null);
  const [dialogueLog, setDialogueLog] = useState<DialogueNode[]>([]);
  const [currentOptions, setCurrentOptions] = useState<
    NonNullable<DialogueNode['options']> | null
  >(null);

  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<string | null>(null);
  const [activeCrisisId, setActiveCrisisId] = useState<string | null>(null);
  const [crisisResult, setCrisisResult] = useState<string | null>(null);
  const [usedDecisions, setUsedDecisions] = useState<string[]>([]);
  const [usedCrises, setUsedCrises] = useState<string[]>([]);

  const [prologueRevealed, setPrologueRevealed] = useState(0);
  const [ending, setEnding] = useState<Ending | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);

  // --- Phaser mount (DO NOT REMOVE) ---
  useLayoutEffect(() => {
    if (phaserRef.current === null) {
      const game = StartGame('game-container');
      phaserRef.current = { game, scene: null };
    }
    const handler = (scene: Phaser.Scene) => {
      if (phaserRef.current) phaserRef.current.scene = scene;
    };
    EventBus.on('current-scene-ready', handler);
    return () => {
      EventBus.removeListener('current-scene-ready', handler);
      if (phaserRef.current) {
        phaserRef.current.game?.destroy(true);
        phaserRef.current = null;
      }
    };
  }, []);

  // Drive Phaser atmosphere from phase
  useEffect(() => {
    const modeMap: Record<GamePhase, string> = {
      BOOT: 'prologue',
      PROLOGUE: 'prologue',
      DASHBOARD: 'dashboard',
      INVESTIGATION: 'investigation',
      INTERROGATION: 'interrogation',
      DECISION_CRUX: 'investigation',
      CRISIS_EVENT: 'crisis',
      EPILOGUE: 'ending',
    };
    EventBus.emit(EVT_ATMOSPHERE_MODE, modeMap[phase]);
    EventBus.emit(EVT_PHASE_CHANGED, { phase });
  }, [phase]);

  // Prologue typewriter reveal
  useEffect(() => {
    if (phase !== 'PROLOGUE') return;
    if (prologueRevealed >= PROLOGUE_LINES.length) return;
    const t = setTimeout(() => setPrologueRevealed((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [phase, prologueRevealed]);

  // Ticker rotation
  useEffect(() => {
    if (phase !== 'DASHBOARD') return;
    const t = setInterval(() => {
      setTickerIdx((i) => (i + 1) % TICKER_MESSAGES.length);
    }, 8000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = useCallback(() => {
    audio.startDrone();
    audio.blip('click');
    setPhase('PROLOGUE');
    setPrologueRevealed(0);
  }, []);

  const enterDashboard = useCallback(() => {
    audio.blip('click');
    setPhase('DASHBOARD');
  }, []);

  const mutateResources = useCallback((impact: Partial<Resources>) => {
    setResources((prev) => {
      const next = applyImpact(prev, impact);
      EventBus.emit('resource-updated', next);
      return next;
    });
  }, []);

  const unlockEvidence = useCallback((id: string) => {
    setEvidence((prev) => {
      if (prev.includes(id)) return prev;
      EventBus.emit('evidence-unlocked', { evidence: EVIDENCE_DB[id] });
      audio.blip('good');
      return [...prev, id];
    });
  }, []);

  const addFlag = useCallback((f: string[]) => {
    setFlags((prev) => Array.from(new Set([...prev, ...f])));
  }, []);

  // --- INTERROGATION ---
  const openInterrogation = useCallback((charId: string) => {
    audio.blip('click');
    const c = getCharacter(charId);
    if (!c) return;
    setActiveChar(c);
    const firstSystem = c.dialogue[0];
    const firstNpc = c.dialogue[1];
    setDialogueLog([firstSystem, firstNpc]);
    setCurrentOptions(firstNpc.options ?? null);
    setPhase('INTERROGATION');
  }, []);

  const chooseDialogue = useCallback(
    (opt: NonNullable<DialogueNode['options']>[number]) => {
      audio.blip('click');
      if (opt.impact) mutateResources(opt.impact);
      if (opt.revealsEvidence) unlockEvidence(opt.revealsEvidence);
      setDialogueLog((prev) => [
        ...prev,
        { speaker: 'player', text: opt.label },
        { speaker: 'npc', text: opt.response },
      ]);
      setCurrentOptions(null);
    },
    [mutateResources, unlockEvidence]
  );

  const closeInterrogation = useCallback(() => {
    audio.blip('click');
    setActiveChar(null);
    setDialogueLog([]);
    setCurrentOptions(null);
    setPhase('DASHBOARD');
  }, []);

  // --- INVESTIGATION ---
  const openInvestigation = useCallback(() => {
    audio.blip('click');
    setPhase('INVESTIGATION');
  }, []);

  const closeInvestigation = useCallback(() => {
    audio.blip('click');
    setPhase('DASHBOARD');
  }, []);

  // --- EPILOGUE ---
  const triggerEpilogue = useCallback(() => {
    const end = resolveEnding(resources, evidence, flags);
    setEnding(end);
    setPhase('EPILOGUE');
    audio.blip(end.id === 'shadow_takeover' || end.id === 'time_exhausted' ? 'alert' : 'good');
    EventBus.emit('ending-triggered', { endingId: end.id, stats: resources });
  }, [resources, evidence, flags]);

  // --- DECISION ---
  const openDecision = useCallback(() => {
    audio.blip('click');
    const available = DECISIONS.filter((d) => !usedDecisions.includes(d.id));
    if (available.length === 0) {
      triggerEpilogue();
      return;
    }
    setActiveDecisionId(available[0].id);
    setDecisionResult(null);
    setPhase('DECISION_CRUX');
  }, [usedDecisions, triggerEpilogue]);

  const chooseDecision = useCallback(
    (choiceId: string) => {
      const dec = DECISIONS.find((d) => d.id === activeDecisionId);
      if (!dec) return;
      const choice = dec.choices.find((c) => c.id === choiceId);
      if (!choice) return;
      audio.blip('alert');
      mutateResources(choice.impacts);
      if (choice.flags) addFlag(choice.flags);
      setUsedDecisions((prev) => [...prev, dec.id]);
      setDecisionResult(choice.consequence);
      EventBus.emit('decision-made', { choiceId, impacts: choice.impacts });
    },
    [activeDecisionId, mutateResources, addFlag]
  );

  const closeDecision = useCallback(() => {
    audio.blip('click');
    setActiveDecisionId(null);
    setDecisionResult(null);
    setPhase('DASHBOARD');
  }, []);

  // --- CRISIS ---
  const triggerRandomCrisis = useCallback(() => {
    const available = CRISES.filter((c) => !usedCrises.includes(c.id));
    if (available.length === 0) return;
    const crisis = available[Math.floor(Math.random() * available.length)];
    audio.blip('alert');
    setActiveCrisisId(crisis.id);
    setCrisisResult(null);
    setPhase('CRISIS_EVENT');
    EventBus.emit(EVT_CRISIS_TRIGGERED, { crisis });
  }, [usedCrises]);

  const chooseCrisis = useCallback(
    (choiceId: string) => {
      const crisis = CRISES.find((c) => c.id === activeCrisisId);
      if (!crisis) return;
      const choice = crisis.choices.find((c) => c.id === choiceId);
      if (!choice) return;
      mutateResources(choice.impacts);
      setUsedCrises((prev) => [...prev, crisis.id]);
      setCrisisResult(choice.result);
    },
    [activeCrisisId, mutateResources]
  );

  const closeCrisis = useCallback(() => {
    audio.blip('click');
    setActiveCrisisId(null);
    setCrisisResult(null);
    setPhase('DASHBOARD');
  }, []);

  // auto epilogue when time runs out
  useEffect(() => {
    if (phase !== 'DASHBOARD') return;
    if (resources.time <= 0) {
      triggerEpilogue();
    }
  }, [phase, resources.time, triggerEpilogue]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audio.setMuted(!m);
      return !m;
    });
  }, []);

  const totalEvidence = Object.keys(EVIDENCE_DB).length;
  const activeDecision = DECISIONS.find((d) => d.id === activeDecisionId) ?? null;
  const activeCrisis = CRISES.find((c) => c.id === activeCrisisId) ?? null;

  return (
    <div id="app">
      <div id="game-container"></div>

      <div id="hud">
        {/* ============ BOOT / MENU ============ */}
        {phase === 'BOOT' && (
          <div className="prologue-screen">
            <h1 className="prologue-title">AFTERLIGHT</h1>
            <div className="prologue-subtitle">CASE 01 — THE REVIEW</div>
            <p className="prologue-text">
              A high-stakes internal crisis is unfolding at the Apex Energy &amp;
              Infrastructure Commission in Lagos. As Acting Director General, you must
              keep the organization alive while uncovering the sabotage behind the
              crisis. Balance power, communications, budget, personnel, time, and public
              trust — before the ministerial review.
            </p>
            <div className="prologue-transmission">&gt; INCOMING ENCRYPTED TRANSMISSION...</div>
            <button className="btn-primary" onClick={startGame}>
              Begin The Review
            </button>
          </div>
        )}

        {/* ============ PROLOGUE ============ */}
        {phase === 'PROLOGUE' && (
          <div className="prologue-screen">
            <div style={{ maxWidth: 640, padding: '0 24px' }}>
              {PROLOGUE_LINES.slice(0, prologueRevealed).map((line, i) => (
                <p
                  key={i}
                  className={i === 6 ? 'prologue-transmission' : 'prologue-text'}
                  style={{
                    textAlign: 'left',
                    marginBottom: 14,
                    opacity: 0.9,
                    fontSize: i < 2 ? '13px' : undefined,
                    color: i < 2 ? 'var(--cyan)' : undefined,
                  }}
                >
                  {line}
                </p>
              ))}
              {prologueRevealed >= PROLOGUE_LINES.length && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button className="btn-primary" onClick={enterDashboard}>
                    Assume Command
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ RESOURCE BAR (persistent) ============ */}
        {(phase === 'DASHBOARD' ||
          phase === 'INVESTIGATION' ||
          phase === 'INTERROGATION' ||
          phase === 'DECISION_CRUX' ||
          phase === 'CRISIS_EVENT') && <ResourceBar resources={resources} />}

        {phase === 'DASHBOARD' && (
          <div className="game-content">
            <div className="nav-tabs" style={{ marginTop: 4 }}>
              <button className="nav-tab active">Command Center</button>
              <button className="nav-tab" onClick={openInvestigation}>
                Evidence ({evidence.length}/{totalEvidence})
              </button>
              <button className="nav-tab" onClick={toggleMute}>
                {muted ? 'Sound: Off' : 'Sound: On'}
              </button>
            </div>
            <div className="dashboard-grid">
              <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
                <h3>Situation Briefing</h3>
                <p>
                  The quarterly performance review has flagged catastrophic systemic
                  irregularities. An anonymous transmission claims the report itself is
                  manipulated. You have{' '}
                  <strong style={{ color: 'var(--gold)' }}>{Math.round(resources.time)} hours</strong>{' '}
                  before the Federal Ministry triggers an emergency asset review.
                  Stabilize operations and uncover the truth.
                </p>
              </div>

              <div className="dash-card">
                <h3>Investigate Evidence</h3>
                <p>
                  Review collected forensic data, documents, and CCTV transcripts. Connect
                  the clues to understand the sabotage pattern.
                </p>
                <button className="btn-secondary" style={{ marginTop: 10 }} onClick={openInvestigation}>
                  Open Evidence Board
                </button>
              </div>

              <div className="dash-card">
                <h3>Interrogate Staff</h3>
                <p>
                  Question key figures with distinct motives and hidden agendas.
                  Cross-examine with evidence to extract confessions.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {CHARACTERS.map((c) => (
                    <button
                      key={c.id}
                      className="btn-secondary"
                      style={{ borderColor: c.color, color: c.color, padding: '8px 12px' }}
                      onClick={() => openInterrogation(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dash-card">
                <h3>Strategic Decisions</h3>
                <p>
                  Face branching ethical dilemmas. Every choice carries operational and
                  reputational consequences.
                </p>
                <button className="btn-secondary" style={{ marginTop: 10 }} onClick={openDecision}>
                  Review Decision
                </button>
              </div>

              <div className="dash-card">
                <h3>Dispatch Response</h3>
                <p>
                  An operational anomaly is developing. Deploy resources to contain the
                  crisis before it erodes public trust.
                </p>
                <button className="btn-secondary btn-danger" style={{ marginTop: 10 }} onClick={triggerRandomCrisis}>
                  Respond To Crisis
                </button>
              </div>

              <div className="dash-card" style={{ gridColumn: '1 / -1', borderColor: 'var(--gold)' }}>
                <h3>File Terminal Report</h3>
                <p>
                  Conclude the review and present your findings. Your ending is shaped by
                  evidence uncovered, alliances earned, and trust maintained.
                </p>
                <button className="btn-primary" style={{ marginTop: 10 }} onClick={triggerEpilogue}>
                  File Terminal Report
                </button>
              </div>
            </div>
            <div className="crisis-ticker">
              <span className="ticker-content">{TICKER_MESSAGES[tickerIdx]}</span>
            </div>
          </div>
        )}

        {/* ============ INVESTIGATION ============ */}
        {phase === 'INVESTIGATION' && (
          <div className="game-content">
            <div className="nav-tabs" style={{ marginTop: 4 }}>
              <button className="nav-tab" onClick={closeInvestigation}>
                ← Back
              </button>
              <button className="nav-tab active">Evidence Board</button>
            </div>
            <div className="evidence-grid">
              {Object.values(EVIDENCE_DB).map((ev) => {
                const found = evidence.includes(ev.id);
                return (
                  <div key={ev.id} className={`evidence-card${found ? '' : ' locked'}`}>
                    <div className="ev-type">{found ? ev.type : 'ENCRYPTED'}</div>
                    <div className="ev-title">{found ? ev.title : 'Locked File'}</div>
                    <div className="ev-desc">
                      {found
                        ? ev.description
                        : 'Requires interrogation or forensic extraction to unlock.'}
                    </div>
                    {found && ev.connectedTo && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ev.connectedTo
                          .filter((c) => evidence.includes(c))
                          .map((c) => (
                            <span key={c} className="impact-tag">
                              ⛓ {EVIDENCE_DB[c]?.title}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============ INTERROGATION ============ */}
        {phase === 'INTERROGATION' && activeChar && (
          <div className="interrogation-panel">
            <div className="interrogation-header">
              <div
                className="char-portrait"
                style={{ borderColor: activeChar.color, color: activeChar.color }}
              >
                {activeChar.initials}
              </div>
              <div className="char-info">
                <div className="char-name">{activeChar.name}</div>
                <div className="char-role">
                  {activeChar.role} — {activeChar.origin}
                </div>
              </div>
              <button className="btn-secondary" onClick={closeInterrogation}>
                End Session
              </button>
            </div>
            <div className="interrogation-body">
              {dialogueLog.map((line, i) => (
                <div key={i} className={`dialogue-line dialogue-${line.speaker}`}>
                  {line.text}
                </div>
              ))}
              {currentOptions && (
                <div className="dialogue-options">
                  {currentOptions.map((opt, i) => (
                    <button key={i} className="dialogue-option" onClick={() => chooseDialogue(opt)}>
                      {opt.label}
                      {opt.impact && <ImpactTags impact={opt.impact} />}
                    </button>
                  ))}
                </div>
              )}
              {!currentOptions && dialogueLog.length > 2 && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button className="btn-primary" onClick={closeInterrogation}>
                    Return To Command
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ DECISION CRUX ============ */}
        {phase === 'DECISION_CRUX' && activeDecision && (
          <div className="decision-overlay">
            <div className="decision-card">
              <h2>{activeDecision.title}</h2>
              {!decisionResult ? (
                <>
                  <p className="decision-desc">{activeDecision.description}</p>
                  <div className="decision-choices">
                    {activeDecision.choices.map((c) => (
                      <button key={c.id} className="choice-btn" onClick={() => chooseDecision(c.id)}>
                        {c.label}
                        <ImpactTags impact={c.impacts} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="decision-desc" style={{ fontStyle: 'italic' }}>
                    {decisionResult}
                  </p>
                  <button className="btn-primary" onClick={closeDecision}>
                    Continue
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ============ CRISIS EVENT ============ */}
        {phase === 'CRISIS_EVENT' && activeCrisis && (
          <div className="crisis-overlay">
            <div className="crisis-card">
              <h2>{activeCrisis.title}</h2>
              {!crisisResult ? (
                <>
                  <p>{activeCrisis.description}</p>
                  <div className="decision-choices">
                    {activeCrisis.choices.map((c) => (
                      <button key={c.id} className="choice-btn" onClick={() => chooseCrisis(c.id)}>
                        {c.label}
                        <ImpactTags impact={c.impacts} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontStyle: 'italic' }}>{crisisResult}</p>
                  <button className="btn-primary" onClick={closeCrisis}>
                    Acknowledge
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ============ EPILOGUE ============ */}
        {phase === 'EPILOGUE' && ending && (
          <div className="epilogue-screen">
            <div className="ending-type">{ending.type}</div>
            <h1>{ending.title}</h1>
            <p className="epilogue-text">{ending.description}</p>
            <div className="epilogue-stats">
              <div className="stat-box">
                <div className="stat-val">
                  {evidence.length}/{totalEvidence}
                </div>
                <div className="stat-label">Evidence</div>
              </div>
              <div className="stat-box">
                <div className="stat-val">{Math.round(resources.trust)}%</div>
                <div className="stat-label">Public Trust</div>
              </div>
              <div className="stat-box">
                <div className="stat-val">{flags.length}</div>
                <div className="stat-label">Consequences</div>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                audio.blip('click');
                setPhase('BOOT');
                setResources(INITIAL_RESOURCES);
                setEvidence([]);
                setFlags([]);
                setUsedDecisions([]);
                setUsedCrises([]);
                setEnding(null);
                setPrologueRevealed(0);
              }}
            >
              Reopen The Case
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
