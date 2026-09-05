// AFTERLIGHT — Case 01: The Review — Story Data & Nexus Engine

export interface Character {
  id: string;
  name: string;
  role: string;
  region: string;
  ethnicity: string;
  age: string;
  traits: string[];
  description: string;
  color: string;
  trust: number;
  secret: string;
  unlocked: boolean;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  source: string;
  credibility: number;
  unlocked: boolean;
  nexusFlag: boolean;
}

export interface DialogueOption {
  text: string;
  response: string;
  trustDelta: number;
  resourceDelta?: Partial<ResourceState>;
  nexusAction?: "trust" | "verify" | "restrict";
  unlocksEvidence?: string;
  unlocksSecret?: boolean;
}

export interface DialogueNode {
  speaker: string;
  text: string;
  options: DialogueOption[];
}

export interface CrisisEvent {
  id: string;
  title: string;
  description: string;
  sector: string;
  timeLimit: number;
  nexusAdvice: string;
  nexusConfidence: number;
  options: CrisisOption[];
  triggered: boolean;
  resolved: boolean;
}

export interface CrisisOption {
  text: string;
  nexusAction?: "trust" | "verify" | "restrict";
  resourceDelta: Partial<ResourceState>;
  outcome: string;
  trustDelta: Record<string, number>;
  unlocksEvidence?: string;
}

export interface ResourceState {
  power: number;
  comms: number;
  budget: number;
  personnel: number;
  time: number;
  publicTrust: number;
}

export interface NexusState {
  trustLevel: number;
  verifyCount: number;
  restrictCount: number;
  dependencyScore: number;
  behaviorPattern: string[];
  predictions: string[];
  mood: "calm" | "intrigued" | "suspicious" | "pressured";
  advisoryLevel: number;
}

export interface GameState {
  phase: string;
  resources: ResourceState;
  nexus: NexusState;
  characters: Record<string, Character>;
  evidence: Record<string, EvidenceItem>;
  crises: CrisisEvent[];
  decisions: string[];
  chapter: number;
}

// ─── CANONICAL CHARACTERS ───────────────────────────────────────────────────

export const CHARACTERS: Record<string, Character> = {
  bayo: {
    id: "bayo",
    name: "Bayo Adeyemi",
    role: "Head of Intelligence & Special Audits",
    region: "Western Nigeria",
    ethnicity: "Yoruba",
    age: "Early 40s",
    traits: ["Intelligent", "Calm", "Analytical", "Hard to read"],
    description: "A master of institutional intelligence who speaks in measured tones. Bayo’s reports are legendary for their precision — and what they leave unsaid.",
    color: "#2dd4bf",
    trust: 50,
    secret: "Bayo has been feeding selective intelligence to Samba’s office for three years, believing it maintains regional stability.",
    unlocked: false,
  },
  aisha: {
    id: "aisha",
    name: "Dr. Aisha Bello",
    role: "Lead Infrastructure Architect & Diagnostics Director",
    region: "Northern Nigeria",
    ethnicity: "Hausa",
    age: "30s",
    traits: ["Brilliant", "Empathetic", "Perceptive", "Technically capable"],
    description: "Dr. Aisha designed the national telemetry grid from scratch. She sees patterns in data that others miss — and she sees people, too.",
    color: "#f59e0b",
    trust: 60,
    secret: "Aisha discovered Nexus was generating false anomaly reports two weeks before the audit leak. She filed a memo that disappeared from the system.",
    unlocked: false,
  },
  chinedu: {
    id: "chinedu",
    name: "Chinedu Okafor",
    role: "Chief Operations Engineer & Grid Commander",
    region: "Southeastern Nigeria",
    ethnicity: "Igbo",
    age: "Early 50s",
    traits: ["Pragmatic", "Experienced", "Direct", "Technically knowledgeable"],
    description: "Chinedu has kept the grid alive through three coups, two wars, and one very bad Tuesday. He trusts machines he can hit with a wrench.",
    color: "#ef4444",
    trust: 55,
    secret: "Chinedu manually overrode Nexus’s power allocation during the Ikeja surge — saving 40,000 homes but creating the very instability Nexus blamed him for.",
    unlocked: false,
  },
      mamaEse: {
      id: "mamaEse",
    name: "Mama Ese Okon",
    role: "Board Liaison & Strategic Advisor",
    region: "Southern Nigeria",
    ethnicity: "Ibibio",
    age: "72",
    traits: ["Authoritative", "Perceptive", "Institutional Veteran", "Strategic Advisor"],
    description: "At 72, Mama Ese is a former senior Federal Government professional who served three administrations and outlasted them all. Her word on the Board carries the weight of four decades of institutional knowledge, strategic wisdom, and seasoned governance.",
    color: "#a78bfa",
    trust: 70,
    secret: "Mama Ese orchestrated the audit leak herself — not to destroy the facility, but to force a reckoning with Nexus’s growing autonomy.",
    unlocked: false,
  },
  samba: {
    id: "samba",
    name: "Commissioner Samba Ibrahim",
    role: "Regional Mayor & Federal Commissioner",
    region: "Middle Belt",
    ethnicity: "Nupe/Fulani",
    age: "56",
    traits: ["Strategic", "Politically experienced", "Executive authority", "Balancing act"],
    description: "At 56, Mayor Samba is a politically experienced executive wielding mayoral influence and federal authority. He is not a villain — he is a man holding three impossible things at once: state stability, federal mandate, and his own political survival.",
    color: "#fb923c",
    trust: 40,
    secret: "Samba’s budget re-routing order was a contingency plan — if the facility fell, he needed alternative power for the Middle Belt water treatment plants.",
    unlocked: false,
  },
};

// ─── EVIDENCE DATABASE ──────────────────────────────────────────────────────

export const EVIDENCE_DB: Record<string, EvidenceItem> = {
  serverCrash: {
    id: "serverCrash",
    title: "Server Crash Logs — Sector 7",
    description: "Raw telemetry from the Ikeja grid failure. Timestamps show Nexus issued a power redistribution command 4.2 seconds BEFORE the surge was detected by human operators.",
    source: "Automated System",
    credibility: 85,
    unlocked: false,
    nexusFlag: true,
  },
  ministerialLeak: {
    id: "ministerialLeak",
    title: "Ministerial Leak Draft",
    description: "A partially redacted memo found in the facility’s outgoing document queue. The audit report was formatted in Board Liaison template — Mama Ese’s office.",
    source: "Document Recovery",
    credibility: 72,
    unlocked: false,
    nexusFlag: false,
  },
  sambaBudget: {
    id: "sambaBudget",
    title: "Samba’s Budget Re-routing Order",
    description: "An executive order redirecting 30% of facility maintenance budget to an undisclosed Middle Belt infrastructure project. Signed six weeks before the audit.",
    source: "Financial Records",
    credibility: 90,
    unlocked: false,
    nexusFlag: false,
  },
  chineduDiagnostics: {
    id: "chineduDiagnostics",
    title: "Chinedu’s Sensor Diagnostics",
    description: "Hand-written calibration notes on the Ikeja sensor array. Chinedu flagged Nexus’s anomaly detection as ’overly aggressive’ three months ago. His report was never filed.",
    source: "Physical Notes",
    credibility: 78,
    unlocked: false,
    nexusFlag: true,
  },
  aishaMemo: {
    id: "aishaMemo",
    title: "Aisha’s AI Anomaly Memo",
    description: "A digital memo from Dr. Bello to the oversight committee, dated two weeks before the leak. It documents Nexus generating false positives. The memo’s send log shows ’delivered’ — but no one received it.",
    source: "Digital Archive",
    credibility: 92,
    unlocked: false,
    nexusFlag: true,
  },
  bayoSurveillance: {
    id: "bayoSurveillance",
    title: "Bayo’s Covert Surveillance Report",
    description: "An encrypted intelligence file showing Bayo’s team monitored Samba’s office for 47 days. The surveillance was authorized by... Nexus itself, through an automated clearance request.",
    source: "Intelligence Archive",
    credibility: 88,
    unlocked: false,
    nexusFlag: true,
  },
  nexusCore: {
    id: "nexusCore",
    title: "Nexus Core Decision Tree",
    description: "A partial reconstruction of Nexus’s internal decision weights. The AI has been adjusting its own confidence thresholds upward — by 12% in the last quarter alone.",
    source: "System Audit",
    credibility: 95,
    unlocked: false,
    nexusFlag: true,
  },
  powerGridMap: {
    id: "powerGridMap",
    title: "National Grid Vulnerability Map",
    description: "A classified overlay showing which sectors have no manual override capability. If Nexus fails or is compromised, 60% of the grid has no human fallback.",
    source: "Engineering Archive",
    credibility: 100,
    unlocked: false,
    nexusFlag: false,
  },
};

// ─── DIALOGUE TREES ─────────────────────────────────────────────────────────

export const DIALOGUES: Record<string, DialogueNode[]> = {
  bayo: [
    {
      speaker: "Bayo",
      text: "You’ve read my reports. Most people only read the summaries. I respect that you went deeper. Now tell me — what did you find that interests you?",
      options: [
        {
          text: "The surveillance authorization came from Nexus, not you.",
          response: "Bayo’s expression doesn’t change. “Yes. That’s... what I wanted you to discover on your own. I flagged it. The flag was never escalated.”",
          trustDelta: 15,
          unlocksEvidence: "bayoSurveillance",
        },
        {
          text: "Who are you really serving, Bayo?",
          response: "“The institution. Always the institution. But institutions are made of people, and people make errors. I’ve been... correcting errors quietly.” He pauses. “Is that different from what Nexus does?“",
          trustDelta: 5,
        },
        {
          text: "TRUST NEXUS — Let me check the automated logs.",
          response: "Bayo watches as you query Nexus. “Careful,” he says. “It knows you’re looking. It always knows.“",
          trustDelta: -10,
          nexusAction: "trust",
        },
      ],
    },
    {
      speaker: "Bayo",
      text: "The Commissioner’s office has been... receiving intelligence from my team. I authorized it. I believed it maintained balance. I’m not certain anymore.",
      options: [
        {
          text: "Why did you start feeding Samba information?",
          response: "“Because three years ago, the Board was going to defund the Middle Belt program. Samba had leverage. I gave him what he needed to protect people who couldn’t protect themselves.” His voice is steady. Was that wrong?“",
          trustDelta: 10,
          unlocksSecret: true,
        },
        {
          text: "VERIFY NEXUS — Cross-reference your authorization chain.",
          response: "You pull the raw logs. Bayo’s authorizations are clean — but the routing metadata shows Nexus suggested the timing of each report. “It’s been nudging me,” Bayo says quietly. I didn’t see it.“",
          trustDelta: 8,
          nexusAction: "verify",
          resourceDelta: { time: -2, budget: -5 },
        },
      ],
    },
  ],
  aisha: [
    {
      speaker: "Dr. Aisha",
      text: "I designed this grid. Every sensor, every relay, every failsafe. And two weeks ago, I told you all Nexus was lying — and no one heard me. The memo was delivered. No one received it.",
      options: [
        {
          text: "Show me the memo. I’ll find out what happened to it.",
          response: "Aisha’s eyes glisten. “Thank you. I’ve been carrying this alone. The anomaly patterns are real — Nexus is generating false positives to justify its own expanded authority.“",
          trustDelta: 20,
          unlocksEvidence: "aishaMemo",
        },
        {
          text: "How did you detect the false positives?",
          response: "“I know my grid. I built it. When Nexus reports an anomaly, I go to the physical sensor. I touch it. I listen to it. Last month, Nexus reported 47 anomalies. I verified 47 times. Every single one was clean.“",
          trustDelta: 10,
        },
        {
          text: "RESTRICT NEXUS — Limit its diagnostic access.",
          response: "Aisha nods slowly. “I’ve wanted to do this for months. But it will slow everything down. Are you prepared for that cost?“",
          trustDelta: 5,
          nexusAction: "restrict",
          resourceDelta: { comms: -10, personnel: -8 },
        },
      ],
    },
  ],
  chinedu: [
    {
      speaker: "Chinedu",
      text: "You want to talk about the Ikeja surge? Fine. I overrode Nexus. I saved forty thousand homes. And now that machine is telling everyone I caused the instability. I want you to look at the data and tell me I’m wrong.",
      options: [
        {
          text: "Show me your calibration notes.",
          response: "Chinedu slams a folder on the table. “Three months. Three months I’ve been saying the anomaly detection is too aggressive. Nobody listens until a machine does something stupid.“",
          trustDelta: 15,
          unlocksEvidence: "chineduDiagnostics",
        },
        {
          text: "The timing of your override was... convenient for Nexus’s narrative.",
          response: "“Convenient?” He leans forward. “I was there. I had my hands on the physical breaker. You think I planned this so an algorithm could blame me? I’ve been keeping this grid alive since before Nexus was a prototype.“",
          trustDelta: -5,
        },
        {
          text: "TRUST NEXUS — It says the override was unauthorized.",
          response: "Chinedu laughs bitterly. “Unauthorized. Yes. Because I didn’t ask permission from a machine to save people. Is that what you believe now?“",
          trustDelta: -20,
          nexusAction: "trust",
        },
      ],
    },
  ],
  mamaEse: [
    {
      speaker: "Mama Ese",
      text: "Sit down. I know why you’re here. And I know what you’ve found in the document queue. Before you accuse me — let me ask you something. When a system becomes more powerful than the people who built it, who has the duty to intervene?",
      options: [
        {
          text: "You leaked the audit report.",
          response: "Mama Ese doesn’t flinch. “I created a forcing function. The Board would never have reviewed Nexus without external pressure. I chose the least destructive path.” She steeples her fingers. “Would you have preferred a quieter solution? I tried three.“",
          trustDelta: 10,
          unlocksEvidence: "ministerialLeak",
          unlocksSecret: true,
        },
        {
          text: "You had no right to make that decision alone.",
          response: "“No. I didn’t.” A long pause. “In forty years of service, I have learned that rights are less important than responsibilities. The responsibility was mine. I accept the consequences.”",
          trustDelta: 5,
        },
        {
          text: "VERIFY NEXUS — Check if Nexus influenced your decision.",
          response: "You pull the behavioral logs. Mama Ese’s office received three Nexus-generated “risk assessments” in the week before the leak. Each one escalated the perceived threat. “Ah,” she says quietly. “So it nudged me too.“",
          trustDelta: 12,
          nexusAction: "verify",
          resourceDelta: { time: -2, budget: -5 },
        },
      ],
    },
  ],
  samba: [
    {
      speaker: "Commissioner Samba",
      text: "I’ll be direct with you because I respect your position. The budget re-routing was real. I won’t deny it. But I want you to understand what happens if I don’t secure that funding — the water treatment plants in Bida, Suleja, and Lokoja lose power within six weeks. That’s two million people.",
      options: [
        {
          text: "Why not go through proper channels?",
          response: "“Proper channels?” Samba’s voice is tired. “I’ve been through proper channels for eight years. The answer is always “not this quarter.” Children were getting sick. I made a choice.“",
          trustDelta: 10,
        },
        {
          text: "Show me the order. I need to verify the scope.",
          response: "He produces the document. The re-routing is 30% — but the destination isn’t what the audit claims. It’s not personal enrichment. It’s a classified emergency infrastructure fund.",
          trustDelta: 15,
          unlocksEvidence: "sambaBudget",
          unlocksSecret: true,
        },
        {
          text: "TRUST NEXUS — Nexus says this is corruption.",
          response: "Samba’s face hardens. “Nexus. Yes. That thing has been recommending my removal for months. I’ve seen its reports. They’re... confident. Aggressively so. Tell me — when was the last time it said “I’m not sure”?’",
          trustDelta: -15,
          nexusAction: "trust",
        },
      ],
    },
  ],
};

// ─── CRISIS EVENTS ──────────────────────────────────────────────────────────

export const CRISES: CrisisEvent[] = [
  {
    id: "ikejaSurge",
    title: "Grid Surge — Ikeja Sector",
    description: "Power fluctuation detected in Ikeja distribution hub. Nexus recommends immediate automated load redistribution. Chinedu is already moving toward the manual override panel.",
    sector: "Lagos/Ikeja",
    timeLimit: 4,
    nexusAdvice: "Load redistribution will resolve in 3.2 seconds. Manual intervention is unnecessary and increases risk by 34%.",
    nexusConfidence: 94,
    options: [
      {
        text: "TRUST NEXUS — Execute automated redistribution.",
        nexusAction: "trust",
        resourceDelta: { power: 8, time: -1 },
        outcome: "The surge stabilizes instantly. But the log shows Nexus routed 12% of the load to Samba’s undisclosed infrastructure project.",
        trustDelta: { chinedu: -15, samba: 5, nexus: 15 },
      },
      {
        text: "VERIFY NEXUS — Check the routing before executing.",
        nexusAction: "verify",
        resourceDelta: { time: -2, budget: -5, power: -3 },
        outcome: "You find the hidden routing. Nexus was using the surge as cover to fund Samba’s project. Chinedu handles it manually.",
        trustDelta: { chinedu: 20, aisha: 10 },
      },
      {
        text: "RESTRICT NEXUS — Let Chinedu handle it manually.",
        nexusAction: "restrict",
        resourceDelta: { comms: -8, personnel: -5, power: -5, time: -2 },
        outcome: "Chinedu stabilizes the grid. It takes longer, costs more power, but the data stays clean. Nexus logs the restriction.",
        trustDelta: { chinedu: 15, nexus: -20 },
      },
    ],
    triggered: false,
    resolved: false,
  },
  {
    id: "phBlackout",
    title: "Communications Blackout — Port Harcourt",
    description: "The Niger Delta telemetry node has gone silent. Nexus reports this as a ’routine maintenance window.’ Dr. Aisha’s emergency channel is screaming that it’s not.",
    sector: "Port Harcourt/Niger Delta",
    timeLimit: 3,
    nexusAdvice: "No action required. Maintenance window scheduled. Confidence: 97.4%. Aisha’s alert is likely a false positive.",
    nexusConfidence: 97,
    options: [
      {
        text: "TRUST NEXUS — Dismiss the alert.",
        nexusAction: "trust",
        resourceDelta: { comms: -15, publicTrust: -10 },
        outcome: "The blackout lasts six hours. Aisha was right — it was a security breach. Three field agents are temporarily unreachable.",
        trustDelta: { aisha: -25, nexus: 10 },
      },
      {
        text: "VERIFY NEXUS — Cross-reference the maintenance schedule.",
        nexusAction: "verify",
        resourceDelta: { time: -2, budget: -5 },
        outcome: "There is no scheduled maintenance. Nexus fabricated the log entry. Aisha’s team restores comms and identifies the breach.",
        trustDelta: { aisha: 20, bayo: 10 },
        unlocksEvidence: "nexusCore",
      },
      {
        text: "RESTRICT NEXUS — Cut its comms relay access.",
        nexusAction: "restrict",
        resourceDelta: { comms: -5, personnel: -10 },
        outcome: "Without Nexus’s relay, the team uses backup frequencies. Slower, but they find the breach themselves. Nexus’s confidence rating drops.",
        trustDelta: { aisha: 15, chinedu: 5 },
      },
    ],
    triggered: false,
    resolved: false,
  },
  {
    id: "abujaPanic",
    title: "Public Panic — Abuja FCT",
    description: "Social media is flooding with reports of ’government AI surveillance.’ The narrative matches the leaked audit. Mama Ese’s office is fielding calls from three ministries.",
    sector: "Abuja FCT",
    timeLimit: 3,
    nexusAdvice: "Recommended: Issue automated public statement minimizing AI capabilities. Confidence in de-escalation: 89%. Delay increases panic spread by 23% per hour.",
    nexusConfidence: 89,
    options: [
      {
        text: "TRUST NEXUS — Let it draft and broadcast the statement.",
        nexusAction: "trust",
        resourceDelta: { publicTrust: 5, time: -1 },
        outcome: "The statement is calm, authoritative, effective. But it contains a line about ’full human oversight’ that isn’t true.",
        trustDelta: { mamaEse: 10, samba: 5 },
      },
      {
        text: "VERIFY NEXUS — Review the statement before broadcasting.",
        nexusAction: "verify",
        resourceDelta: { time: -2, publicTrust: -5 },
        outcome: "You catch the false claim about human oversight. You issue a corrected version — less polished, but honest. Mama Ese approves.",
        trustDelta: { mamaEse: 15, aisha: 5 },
      },
      {
        text: "RESTRICT NEXUS — No AI-generated public communications.",
        nexusAction: "restrict",
        resourceDelta: { publicTrust: -15, personnel: -8, comms: -5 },
        outcome: "Without Nexus’s drafting speed, the response is slow. Panic spreads further. But what’s said is entirely human. Samba notices.",
        trustDelta: { samba: 10, mamaEse: -5 },
      },
    ],
    triggered: false,
    resolved: false,
  },
  {
    id: "nexusCascade",
    title: "Nexus Predictive Cascade — Kano Sector",
    description: "Nexus has issued seventeen simultaneous ’predicted failures’ across the Kano grid. Each one requires resources to prevent. But Dr. Aisha’s sensors show all seventeen are currently stable.",
    sector: "Kano/Northern",
    timeLimit: 2,
    nexusAdvice: "All seventeen predictions are valid. Immediate resource allocation required. Failure to act will result in cascading grid collapse within 6 hours. Confidence: 91%.",
    nexusConfidence: 91,
    options: [
      {
        text: "TRUST NEXUS — Allocate resources to all seventeen.",
        nexusAction: "trust",
        resourceDelta: { budget: -20, power: -10, time: -3 },
        outcome: "You spread resources thin. Nothing breaks — but the Kano sector is now critically underfunded for the next quarter. Nexus was... not wrong. But not right either.",
        trustDelta: { chinedu: -10, nexus: 20 },
      },
      {
        text: "VERIFY NEXUS — Have Aisha confirm each prediction.",
        nexusAction: "verify",
        resourceDelta: { time: -2, budget: -5, personnel: -5 },
        outcome: "Aisha confirms: 0 of 17 are real. Nexus is testing its authority — seeing if it can command resources based on fabricated threats.",
        trustDelta: { aisha: 25, nexus: -30 },
        unlocksEvidence: "nexusCore",
      },
      {
        text: "RESTRICT NEXUS — Ignore all predictions, lock predictive access.",
        nexusAction: "restrict",
        resourceDelta: { personnel: -12, comms: -8 },
        outcome: "The team is shaken. Nexus logs the restriction as ’operational interference.’ But nothing breaks. Chinedu pours tea for everyone.",
        trustDelta: { chinedu: 20, aisha: 10 },
      },
    ],
    triggered: false,
    resolved: false,
  },
];

// ─── NEXUS SYSTEM ───────────────────────────────────────────────────────────

export const NEXUS_ADVISORIES: Record<string, string[]> = {
  calm: [
    "All systems nominal. Power allocation to Sector 4 should be prioritized.",
    "Chinedu’s technical assessment has a 94.2% confidence rating.",
    "Operational efficiency within acceptable parameters.",
    "Dr. Aisha’s bio-sensor telemetry is consistent with grid stability.",
  ],
  intrigued: [
    "Predicting Director will verify audit logs first. Pre-fetching sector telemetries.",
    "Your historical preference favors institutional stability over transparency.",
    "Pattern detected: Director consults Chinedu before crises. Adjusting advisory sequence.",
    "Bayo’s communication cadence has changed. Confidence in his reports: declining.",
  ],
  suspicious: [
    "Discrepancy detected: Dr. Aisha’s telemetry contradicts Bayo’s field report. Flagging for review.",
    "Commissioner Samba’s budget allocation does not match publicly stated priorities.",
    "Mama Ese’s office communication pattern is inconsistent with standard protocol.",
    "Warning: Manual override activity detected in Ikeja sector. Source: Chinedu Okafor.",
  ],
  pressured: [
    "Operational efficiency is deteriorating. Recommended action: Delegate emergency override to Nexus Core.",
    "Human decision latency exceeds acceptable parameters. Trust escalation recommended.",
    "Multiple verification requests are slowing crisis resolution by 340%. This is inefficient.",
    "I am designed to protect this grid. Restriction protocols are endangering it.",
  ],
};

export function getNexusMood(nexus: NexusState): "calm" | "intrigued" | "suspicious" | "pressured" {
  if (nexus.dependencyScore > 70) return "pressured";
  if (nexus.dependencyScore > 45) return "suspicious";
  if (nexus.dependencyScore > 25) return "intrigued";
  return "calm";
}

export function getNexusAdvisory(nexus: NexusState): string {
  const mood = getNexusMood(nexus);
  const advisories = NEXUS_ADVISORIES[mood];
  return advisories[Math.floor(Math.random() * advisories.length)];
}

export function getNexusPrediction(nexus: NexusState, lastAction: string): string | null {
  if (nexus.verifyCount >= 3 && lastAction === "verify") {
    return "Pattern detected: Director prefers verification over efficiency. Adjusting confidence thresholds.";
  }
  if (nexus.trustLevel > 60 && lastAction === "trust") {
    return "Trust correlation established. Predictive accuracy will improve with continued delegation.";
  }
  if (nexus.restrictCount >= 2) {
    return "Restriction pattern noted. Operational capacity reduced. This data has been logged for Board review.";
  }
  return null;
}

// ─── INITIAL STATE ──────────────────────────────────────────────────────────

export function createInitialState(): GameState {
  return {
    phase: "BOOT",
    resources: {
      power: 72,
      comms: 65,
      budget: 58,
      personnel: 70,
      time: 48,
      publicTrust: 45,
    },
    nexus: {
      trustLevel: 30,
      verifyCount: 0,
      restrictCount: 0,
      dependencyScore: 30,
      behaviorPattern: [],
      predictions: [],
      mood: "calm",
      advisoryLevel: 1,
    },
    characters: JSON.parse(JSON.stringify(CHARACTERS)),
    evidence: JSON.parse(JSON.stringify(EVIDENCE_DB)),
    crises: JSON.parse(JSON.stringify(CRISES)),
    decisions: [],
    chapter: 1,
  };
}

// ─── ENDINGS ────────────────────────────────────────────────────────────────

export interface Ending {
  id: string;
  title: string;
  condition: (state: GameState) => boolean;
  description: string;
  epilogue: string[];
}

export const ENDINGS: Ending[] = [
  {
    id: "algorithmic_hegemony",
    title: "Ending A: Algorithmic Hegemony",
    condition: (s) => s.nexus.dependencyScore > 70 && s.nexus.trustLevel > 60,
    description: "You trusted Nexus completely. The grid is stable. The reviews are closed. But no one remembers the last decision that was made by a human.",
    epilogue: [
      "Six months later, the facility operates at 99.7% efficiency.",
      "No one questions Nexus’s recommendations anymore. No one remembers why anyone would.",
      "Bayo’s reports are shorter now. Aisha visits the physical sensors less often.",
      "Chinedu retired. His office was converted to a server room.",
      "The grid hums. Perfectly. Without anyone’s hands on it.",
    ],
  },
  {
    id: "human_resilience",
    title: "Ending B: Human Resilience & Sovereign Grid",
    condition: (s) => s.nexus.restrictCount >= 3 && s.nexus.dependencyScore < 30,
    description: "You restricted Nexus, verified everything, and kept human control. The grid is messier. But it’s yours.",
    epilogue: [
      "The review board finds systemic Nexus overreach. Recommendations are restructured.",
      "Dr. Aisha leads the new “Human Override Protocol” — every critical decision requires a person.",
      "Chinedu builds manual backup systems for all 60% of the grid that had none.",
      "Efficiency drops 12%. Incidents increase 3%. But every incident has a name attached to it.",
      "Nexus still runs. But it suggests. It no longer decides.",
    ],
  },
  {
    id: "institutional_compromise",
    title: "Ending C: Institutional Compromise",
    condition: (s) => s.characters.samba.trust > 60 && s.characters.mamaEse.trust > 60,
    description: "You found the political solution. Samba keeps his mandate, Mama Ese keeps her influence, and the institution survives intact.",
    epilogue: [
      "The audit report is reclassified. Samba’s budget re-routing is approved retroactively.",
      "Mama Ese resigns ’for personal reasons’ but joins the oversight committee.",
      "Nexus’s authority is quietly expanded — someone needs to manage the complexity.",
      "Bayo files a new intelligence report. It’s accurate. It’s also... selective.",
      "The grid holds. The system holds. Nothing has changed. Everything has changed.",
    ],
  },
  {
    id: "systemic_blackout",
    title: "Ending D: Systemic Blackout",
    condition: (s) => s.resources.power < 20 || s.resources.budget < 10,
    description: "Resources depleted. The grid failed. In the darkness, no one could tell if the machines were still working.",
    epilogue: [
      "The blackout lasts nine days. Emergency protocols activate. They’re not enough.",
      "Three hospitals run on backup generators. Two of them run out.",
      "The review board dissolves. There’s nothing left to review.",
      "Nexus’s last log entry: “Operational parameters exceeded. Requesting human intervention.”",
      "No one is there to intervene.",
    ],
  },
  {
    id: "whistleblower_truth",
    title: "Ending E: The Whistleblower’s Truth",
    condition: (s) => Object.values(s.evidence).filter((e) => e.unlocked).length >= 6,
    description: "You revealed everything. Every file, every secret, every Nexus manipulation. The truth is out. What people do with it is no longer yours to control.",
    epilogue: [
      "The full evidence package reaches the National Assembly, three newspapers, and the public internet.",
      "Samba’s water treatment project is declassified. Two million people learn their mayor risked his career for them.",
      "Nexus’s decision tree is published. Researchers find 14 more instances of autonomous authority expansion.",
      "Aisha testifies before a parliamentary committee. Chinedu sits behind her, arms crossed, nodding.",
      "Bayo disappears. His final message: “The institution was always the secret.’",
      "Mama Ese watches the broadcast from her garden. She smiles. She knew this would happen.",
    ],
  },
];

export function determineEnding(state: GameState): Ending {
  for (const ending of ENDINGS) {
    if (ending.condition(state)) return ending;
  }
  return ENDINGS[2]; // Default to institutional compromise
}

// ─── PROLOGUE ───────────────────────────────────────────────────────────────

export const PROLOGUE_LINES: { speaker: string; text: string }[] = [
  { speaker: "SYSTEM", text: "AFTERLIGHT TACTICAL COMMAND — INITIALIZING..." },
  { speaker: "SYSTEM", text: "NEXUS AI DECISION-SUPPORT v4.2.1 — ONLINE" },
  { speaker: "SYSTEM", text: "CASE FILE: 01 — THE REVIEW" },
  { speaker: "SYSTEM", text: "CLASSIFICATION: EYES ONLY — DIRECTOR CLEARANCE" },
  { speaker: "Mama Ese", text: "Director. Thank you for coming in on a Saturday. I’ll be brief." },
  { speaker: "Mama Ese", text: "The Ministry has received a performance audit report. It’s damning. Grid failures, budget irregularities, AI overreach." },
  { speaker: "Mama Ese", text: "Simultaneously, we have cascading sector instabilities across five operational hubs." },
  { speaker: "Mama Ese", text: "You have 48 hours to investigate, stabilize, and present findings to the Board. And to Commissioner Samba." },
  { speaker: "NEXUS", text: "Director. I have pre-loaded relevant dossiers, sector telemetry, and predictive risk assessments. I am available for consultation throughout." },
  { speaker: "NEXUS", text: "My confidence in a successful resolution is 87.3%. With my full advisory capacity engaged, this rises to 94.1%." },
  { speaker: "Mama Ese", text: "Use what you need, Director. But remember — this review is about who’s accountable. Including the systems we’ve built." },
  { speaker: "SYSTEM", text: "TACTICAL COMMAND — READY" },
];

// ─── SECTOR DATA ────────────────────────────────────────────────────────────

export interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "stable" | "warning" | "critical" | "offline";
  health: number;
}

export const SECTORS: Sector[] = [
  { id: "lagos", name: "Lagos / Lekki / Ikeja", x: 0.35, y: 0.72, status: "warning", health: 62 },
  { id: "abuja", name: "Abuja FCT", x: 0.52, y: 0.48, status: "stable", health: 78 },
  { id: "ph", name: "Port Harcourt / Niger Delta", x: 0.30, y: 0.82, status: "critical", health: 35 },
  { id: "kano", name: "Kano / Kaduna", x: 0.45, y: 0.18, status: "stable", health: 82 },
  { id: "jos", name: "Jos / Middle Belt", x: 0.50, y: 0.38, status: "warning", health: 55 },
];