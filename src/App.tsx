import { useLayoutEffect, useRef, useState, useCallback } from "react";
import StartGame, { EventBus } from "./game/main";
import type { Game } from "phaser";

// ---------------------------------------------------------------------------
// AFTERLIGHT — Tactical Command Interface (restored)
// The command dashboard is ALWAYS mounted as the primary operational view.
// Character dialogues (incl. Mama Ese Okon) render as NON-BLOCKING modal
// overlays above the dashboard and return to it on dismiss.
// ---------------------------------------------------------------------------

type Phase = "MENU" | "TACTICAL";

interface Dialogue {
  id: string;
  speaker: string;
  role: string;
  lines: string[];
}

interface LogEntry {
  time: string;
  text: string;
  kind: "intel" | "action" | "crisis" | "system";
}

const DIALOGUES: Record<string, Dialogue> = {
  "mama-ese": {
    id: "mama-ese",
    speaker: "MAMA ESE OKON",
    role: "Community Elder — Cross River Sector",
    lines: [
      "Commander. You summoned me to review my people's records, so I will speak plainly.",
      "The Nexus grid logged my clinic's power draw as ANOMALOUS. That is our vaccine cold-chain. You flagged it to save a generator nobody asked you to protect.",
      "I did not come here to beg. I came to remind you: every line in your audit is somebody's mother. Review the file again — and this time, read it.",
    ],
  },
  "nexus-telemetry": {
    id: "nexus-telemetry",
    speaker: "NEXUS-7",
    role: "Grid Intelligence — Autonomous Advisory",
    lines: [
      "Commander, CASE 01 telemetry reconstructed. The Okon clinic draw was within tolerance for 46 of 48 hours.",
      "The anomaly window coincides with the Sector Relay brownout — my sensors attributed the relay's deficit to the clinic. A plausible error. Not an honest one.",
      "Recommendation: reinstate clinic priority tier. Confidence 94.2%. The remaining 5.8% is where careers end.",
    ],
  },
  "evidence-files": {
    id: "evidence-files",
    speaker: "ARCHIVIST VOSS",
    role: "Records & Evidence Custody",
    lines: [
      "The sealed folder is thinner than the briefing claims. Two load logs, one relay fault ticket, and a signature page someone back-dated.",
      "I copied everything before the original audit was 'finalised'. The copy is in your hands now, Commander.",
      "If you open this case, close it on the evidence — not on the timeline the press prefers.",
    ],
  },
  "personnel-audit": {
    id: "personnel-audit",
    speaker: "DIRECTOR KAINE",
    role: "Grid Operations — Personnel Oversight",
    lines: [
      "Your interrogation of the night-shift operators is noted, Commander. They followed protocol. The protocol was wrong.",
      "Scapegoats are efficient. They are also, in a public trust economy, expensive. Choose your next statement with that arithmetic in mind.",
      "The Board reviews CASE 01 at the 48-hour mark. After that, the file belongs to the city — not to us.",
    ],
  },
  "crisis-log": {
    id: "crisis-log",
    speaker: "OPS DESK",
    role: "Crisis Event Monitor",
    lines: [
      "Three live incidents on the board: relay cascade in Sector 4, press inquiry at City Hall, and a cold-chain alarm repeat at the Okon clinic.",
      "Each hour of delay costs measurable trust. The dashboard numbers do not lie, even when the briefings do.",
    ],
  },
};

const fmt = (h: number) => `${Math.floor(h)}h`;

export default function App() {
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("MENU");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [lineIndex, setLineIndex] = useState(0);

  // Resource dashboard — 6 tracked metrics
  const [power, setPower] = useState(72);
  const [comms, setComms] = useState(64);
  const [budget, setBudget] = useState(48);
  const [staff, setStaff] = useState(55);
  const [hoursLeft, setHoursLeft] = useState(48);
  const [trust, setTrust] = useState(41);

  const [log, setLog] = useState<LogEntry[]>([
    { time: "T-48", text: "CASE 01 opened. Audit authority granted by interim directive.", kind: "system" },
    { time: "T-47", text: "Nexus-7 telemetry sync complete. 3 discrepancies flagged.", kind: "intel" },
  ]);

  // Nexus mood derived from resource pressure (plan: useEffect ticker → Phaser)
  const mood = hoursLeft <= 8 || trust < 30 ? "pressured"
    : trust < 45 || power < 40 ? "suspicious"
    : trust >= 65 ? "intrigued"
    : "calm";

  useLayoutEffect(() => {
    if (phase !== "TACTICAL") return;
    EventBus.emit("nexus-mood-change", mood);
  }, [mood, phase]);

  const addLog = useCallback((text: string, kind: LogEntry["kind"]) => {
    setLog((prev) => [{ time: `T-${Math.max(0, hoursLeft)}`, text, kind }, ...prev].slice(0, 40));
  }, [hoursLeft]);

  useLayoutEffect(() => {
    gameRef.current = StartGame("game-container");
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Tactical clock: every 12s of real time burns 1 hour of the 48h mandate.
  useLayoutEffect(() => {
    if (phase !== "TACTICAL") return;
    const t = window.setInterval(() => {
      setHoursLeft((h) => {
        if (h <= 1) {
          window.clearInterval(t);
          return 0;
        }
        return h - 1;
      });
    }, 12000);
    return () => window.clearInterval(t);
  }, [phase]);

  const beginCase = () => {
    setPhase("TACTICAL");
    addLog("Command dashboard online. All six resource feeds nominal.", "system");
    EventBus.emit("tactical-start");
  };

  const openDialogue = (key: string, actionLog?: string) => {
    const d = DIALOGUES[key];
    if (!d) return;
    setDialogue(d);
    setLineIndex(0);
    if (actionLog) addLog(actionLog, key === "crisis-log" ? "crisis" : "action");
  };

  const advanceDialogue = () => {
    if (!dialogue) return;
    if (lineIndex < dialogue.lines.length - 1) {
      setLineIndex((i) => i + 1);
      EventBus.emit("dialogue-blip");
    } else {
      closeDialogue();
    }
  };

  const closeDialogue = () => {
    if (dialogue?.id === "mama-ese") {
      setTrust((v) => Math.min(100, v + 4));
      addLog("Okon interview closed. Public trust +4 — candour noted.", "intel");
    }
    setDialogue(null);
    setLineIndex(0);
  };

  // Investigation triggers from the CASE 01 briefing panel
  const reinstateClinic = () => {
    setPower((p) => Math.max(0, p - 6));
    setTrust((v) => Math.min(100, v + 8));
    setBudget((b) => Math.max(0, b - 5));
    addLog("Clinic priority tier reinstated. Power -6, Budget -5, Trust +8.", "action");
  };
  const subpoenaRelay = () => {
    setComms((c) => Math.max(0, c - 8));
    setStaff((s) => Math.max(0, s - 6));
    setTrust((v) => Math.min(100, v + 6));
    EventBus.emit("trigger-crisis", { sector: "relay-4" });
    EventBus.emit("sector-update", { id: "relay-4", status: "warning", health: 55 });
    addLog("Relay fault ticket subpoenaed. Comms -8, Staff -6, Trust +6.", "action");
  };
  const sealFile = () => {
    setTrust((v) => Math.max(0, v - 10));
    EventBus.emit("trigger-crisis", { sector: "city-hall" });
    addLog("File sealed on Director Kaine's advice. Trust -10. The city noticed.", "crisis");
  };

  const bar = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

  return (
    <div id="app-shell">
      {/* Phaser canvas mount — NEVER removed */}
      <div id="game-container" />

      {phase === "MENU" && (
        <div className="al-overlay al-menu">
          <div className="al-menu-inner">
            <div className="al-kicker">SECTOR GRID AUTHORITY // NIGHT WATCH</div>
            <h1 className="al-title">AFTERLIGHT</h1>
            <p className="al-sub">
              A tactical command game. You have 48 hours, one contested audit file,
              and a city that watches every number move.
            </p>
            <button className="al-btn al-btn-primary" onClick={beginCase} autoFocus>
              ENTER COMMAND CENTER
            </button>
            <div className="al-menu-foot">CASE 01 — THE REVIEW · Clearance: Provisional</div>
          </div>
        </div>
      )}

      {phase === "TACTICAL" && (
        <div className="al-tactical">
          {/* ---- Resource dashboard: 6 metrics, always visible ---- */}
          <header className="al-resources" role="status">
            <Metric label="POWER" value={power} bar={bar(power)} tone="amber" />
            <Metric label="COMMS" value={comms} bar={bar(comms)} tone="cyan" />
            <Metric label="BUDGET" value={budget} bar={bar(budget)} tone="green" />
            <Metric label="PERSONNEL" value={staff} bar={bar(staff)} tone="violet" />
            <div className="al-metric al-metric-time">
              <span className="al-metric-label">TIME REMAINING</span>
              <span className={"al-clock" + (hoursLeft <= 8 ? " al-clock-low" : "")}>{fmt(hoursLeft)}</span>
            </div>
            <Metric label="PUBLIC TRUST" value={trust} bar={bar(trust)} tone="rose" />
          </header>

          {/* ---- Fast-action strip ---- */}
          <nav className="al-actionstrip" aria-label="Tactical actions">
            <button onClick={() => openDialogue("evidence-files", "Evidence files pulled from sealed archive.")}>EVIDENCE FILES</button>
            <button onClick={() => openDialogue("personnel-audit", "Personnel dossiers opened for interrogation.")}>PERSONNEL INTERROGATION</button>
            <button onClick={() => openDialogue("nexus-telemetry", "Nexus-7 telemetry channel established.")}>NEXUS AI TELEMETRY</button>
            <button onClick={() => openDialogue("crisis-log", "Crisis board reviewed.")}>CRISIS EVENT LOG</button>
          </nav>

          <main className="al-columns">
            {/* ---- CASE 01 briefing panel ---- */}
            <section className="al-briefing">
              <h2 className="al-panel-title">CASE 01 — THE REVIEW</h2>
              <div className="al-brief-block">
                <h3>Mission Parameters</h3>
                <p>
                  Audit the Okon clinic power-anomaly citation before the 48-hour board deadline.
                  Decide whether the file closes on evidence or on convenience. Every action moves
                  the six feeds above.
                </p>
              </div>
              <div className="al-brief-block">
                <h3>Audit Timeline</h3>
                <ul className="al-timeline">
                  <li><b>T-48</b> Case opened under interim directive.</li>
                  <li><b>T-46</b> Nexus-7 flags clinic draw as anomalous.</li>
                  <li><b>T-31</b> Relay Sector 4 reports brownout — logs partial.</li>
                  <li><b>T-12</b> Press inquiry filed; Board review scheduled.</li>
                  <li><b>T-00</b> File becomes public record.</li>
                </ul>
              </div>
              <div className="al-brief-block">
                <h3>Intelligence Summary</h3>
                <p>
                  The anomaly window overlaps a relay brownout. Attribution may be wrong.
                  Elder Mama Ese Okon disputes the citation; Director Kaine urges a clean seal.
                  The back-dated signature page is your leverage — or your liability.
                </p>
              </div>
              <div className="al-brief-triggers">
                <button className="al-btn" onClick={() => openDialogue("mama-ese", "Elder Okon summoned to the interview room.")}>
                  INTERVIEW MAMA ESE OKON
                </button>
                <button className="al-btn" onClick={reinstateClinic}>REINSTATE CLINIC PRIORITY</button>
                <button className="al-btn" onClick={subpoenaRelay}>SUBPOENA RELAY FAULT TICKET</button>
                <button className="al-btn al-btn-danger" onClick={sealFile}>SEAL FILE ON KAINA'S ADVICE</button>
              </div>
            </section>

            {/* ---- Crisis / event log ---- */}
            <section className="al-logpane">
              <h2 className="al-panel-title">OPERATIONS LOG</h2>
              <ul className="al-loglist">
                {log.map((e, i) => (
                  <li key={i} className={`al-log al-log-${e.kind}`}>
                    <span className="al-log-time">{e.time}</span>
                    <span>{e.text}</span>
                  </li>
                ))}
              </ul>
              {hoursLeft === 0 && (
                <div className="al-verdict">
                  <h3>THE 48-HOUR MARK</h3>
                  <p>
                    The file is now public record. Public Trust stands at {trust}%.
                    {trust >= 60
                      ? " The city believes its grid was reviewed honestly. AFTERLIGHT holds."
                      : trust >= 35
                      ? " The city is unconvinced either way. The grid endures — barely."
                      : " The city has stopped believing the dashboard. The lights answer to rumor now."}
                  </p>
                  <button className="al-btn al-btn-primary" onClick={() => { EventBus.emit("game-restart"); window.location.reload(); }}>
                    REOPEN MANDATE
                  </button>
                </div>
              )}
            </section>
          </main>

          {/* ---- Non-blocking dialogue modal ---- */}
          {dialogue && (
            <div className="al-modal-scrim" onClick={advanceDialogue} role="dialog" aria-modal="true">
              <div className="al-modal" onClick={(ev) => ev.stopPropagation()}>
                <div className="al-modal-head">
                  <span className="al-speaker">{dialogue.speaker}</span>
                  <span className="al-role">{dialogue.role}</span>
                  <button className="al-close" aria-label="Return to tactical dashboard" onClick={closeDialogue}>✕</button>
                </div>
                <p className="al-line">{dialogue.lines[lineIndex]}</p>
                <div className="al-modal-foot">
                  <span className="al-progress">{lineIndex + 1} / {dialogue.lines.length}</span>
                  <div className="al-modal-actions">
                    {lineIndex > 0 && (
                      <button className="al-btn" onClick={() => setLineIndex((i) => Math.max(0, i - 1))}>BACK</button>
                    )}
                    <button className="al-btn al-btn-primary" onClick={advanceDialogue} autoFocus>
                      {lineIndex < dialogue.lines.length - 1 ? "CONTINUE" : "RETURN TO DASHBOARD"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, bar, tone }: { label: string; value: number; bar: string; tone: string }) {
  return (
    <div className={`al-metric al-tone-${tone}`}>
      <span className="al-metric-label">{label}</span>
      <span className="al-metric-value">{value}</span>
      <span className="al-metric-bar"><i style={{ width: bar }} /></span>
    </div>
  );
}