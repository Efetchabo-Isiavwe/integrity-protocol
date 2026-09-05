// ---------------------------------------------------------------------------
// AFTERLIGHT — Case 01: The Review
// Narrative data: characters, evidence, dialogue trees, decisions, endings
// ---------------------------------------------------------------------------

export type GamePhase =
  | 'BOOT'
  | 'PROLOGUE'
  | 'DASHBOARD'
  | 'INVESTIGATION'
  | 'INTERROGATION'
  | 'DECISION_CRUX'
  | 'CRISIS_EVENT'
  | 'EPILOGUE';

export interface Resources {
  power: number;
  comms: number;
  budget: number;
  staff: number;
  time: number;
  trust: number;
}

export const INITIAL_RESOURCES: Resources = {
  power: 72,
  comms: 65,
  budget: 80,
  staff: 70,
  time: 48,
  trust: 58,
};

export type ResourceImpact = Partial<Resources>;

// --- CHARACTERS ---
export interface Character {
  id: string;
  name: string;
  role: string;
  origin: string;
  age: string;
  color: string;
  initials: string;
  profile: string;
  secret: string;
  dialogue: DialogueNode[];
}

export interface DialogueNode {
  speaker: 'npc' | 'player' | 'system';
  text: string;
  options?: DialogueOption[];
}

export interface DialogueOption {
  label: string;
  impact?: ResourceImpact;
  revealsEvidence?: string;
  trustChange?: number;
  response: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'jolomi',
    name: 'Jolomi',
    role: 'Head of Operations & Logistics',
    origin: 'Itsekiri, Delta State',
    age: 'Early 40s',
    color: '#CD7F32',
    initials: 'JO',
    profile:
      'Intelligent, seasoned, unflappably calm. Speaks with measured gravitas. Knows maritime and grid routing inside out. Difficult to read.',
    secret:
      'Caught between loyalty to old Niger Delta contractors and protecting the facility from an external syndicate.',
    dialogue: [
      {
        speaker: 'system',
        text: 'Jolomi enters the briefing room. Her expression is composed, almost unreadable.',
      },
      {
        speaker: 'npc',
        text: 'Director. I assume you called about the grid irregularities. I have been expecting this conversation.',
        options: [
          {
            label: 'The Lekki routing logs show anomalies you authorized. Explain.',
            impact: { time: -2 },
            revealsEvidence: 'evidence_lekki_logs',
            trustChange: -5,
            response:
              'Those routes kept hospitals and water treatment plants online during the ministerial blackout. I made a call. I would make it again.',
          },
          {
            label: 'I need your honest read on who benefits from this crisis.',
            impact: { time: -1, trust: 3 },
            trustChange: 10,
            response:
              'The syndicate that used to service our Niger Delta contracts. They were cut out five years ago. Now they are back, wearing a different mask, through the audit firm.',
          },
          {
            label: 'You are withholding something, Jolomi.',
            impact: { time: -1 },
            trustChange: -8,
            revealsEvidence: 'evidence_jolomi_warning',
            response:
              'I received a warning three weeks ago. An anonymous package. Contained a routing map that matched the sabotage pattern exactly. I did not report it because I was verifying the source. That was my mistake.',
          },
        ],
      },
    ],
  },
  {
    id: 'aisha',
    name: 'Dr. Aisha',
    role: 'Chief Information & Systems Architect',
    origin: 'Northern Nigeria',
    age: 'Mid 30s',
    color: '#00F5D4',
    initials: 'AI',
    profile:
      'Brilliant, observant, empathetic, highly technical. Notices subtle algorithmic shifts in performance metrics.',
    secret:
      'Discovered that the performance algorithms were secretly patched 48 hours before the audit.',
    dialogue: [
      {
        speaker: 'system',
        text: 'Dr. Aisha adjusts her glasses and pulls up a terminal on the wall display.',
      },
      {
        speaker: 'npc',
        text: 'Director, I need to show you something. The numbers do not lie, but someone taught them to.',
        options: [
          {
            label: 'What do you mean the numbers were taught?',
            impact: { time: -2 },
            revealsEvidence: 'evidence_algorithm_patch',
            trustChange: 12,
            response:
              'The performance scoring algorithms were patched 48 hours before the audit. A subtle weight shift, 0.3% on infrastructure reliability, 1.2% on response time. Enough to make everything look catastrophic without triggering the tamper alarm.',
          },
          {
            label: 'Can you reverse the patch and prove it?',
            impact: { time: -3, comms: -5 },
            revealsEvidence: 'evidence_forensic_proof',
            trustChange: 15,
            response:
              'I can extract the patch metadata. It has a signing certificate. The certificate belongs to the audit firm parent company. This was designed to destroy us from the outside.',
          },
          {
            label: 'Why did you not flag this immediately?',
            impact: { time: -1 },
            trustChange: -3,
            response:
              'Because I was not sure who to trust. The patch was applied from an admin account that only three people have access to. I needed to know if it was one of them.',
          },
        ],
      },
    ],
  },
  {
    id: 'chinedu',
    name: 'Chinedu',
    role: 'Lead Infrastructure & Energy Engineer',
    origin: 'Igbo, Southeastern Nigeria',
    age: 'Late 30s',
    color: '#E63946',
    initials: 'CH',
    profile:
      'Direct, pragmatic, fast-acting, results-driven. Hates administrative bureaucracy.',
    secret:
      'Bypassed ministerial safety protocols to keep power flowing to high-priority commercial hubs.',
    dialogue: [
      {
        speaker: 'system',
        text: 'Chinedu paces the room, clearly impatient. His hands smell of thermal paste.',
      },
      {
        speaker: 'npc',
        text: 'You are wasting time with interrogations while the grid destabilizes. Fix the power problem first, ask questions later.',
        options: [
          {
            label: 'Your bypass protocols are in the sabotage pattern. Were you compromised?',
            impact: { time: -2 },
            revealsEvidence: 'evidence_bypass_logs',
            trustChange: -10,
            response:
              'How did you find those logs? Fine. Yes, I bypassed the protocols. Three commercial hubs were going dark and the ministerial approval queue was 72 hours. I made the call. But I did not sabotage anything.',
          },
          {
            label: 'I need you to stabilize the Epe grid. Can you do it?',
            impact: { time: -4, power: 15, staff: -5 },
            trustChange: 8,
            response:
              'Give me my team and authorization. I will have Epe stable in 12 hours. But Director, whoever is doing this knows the grid architecture as well as I do. That is not many people.',
          },
          {
            label: 'Sit down, Chinedu. I am trying to protect you.',
            impact: { time: -1, trust: 2 },
            trustChange: 5,
            response:
              'Protect me from what? I have kept this city lit for six years. If someone is framing me, I want their name. And I think I know where to start looking, the audit firm contractor list.',
          },
        ],
      },
    ],
  },
  {
    id: 'mama_kemi',
    name: 'Mama Kemi',
    role: 'Senior Advisory Board Member',
    origin: 'Yoruba, Lagos',
    age: 'Late 60s',
    color: '#D4AF37',
    initials: 'MK',
    profile:
      'Highly authoritative, deeply perceptive, maternal yet stern. Sharp institutional memory.',
    secret:
      'Knows who funded the original audit firm 10 years ago and warns the current crisis mirrors an orchestrated collapse from 1998.',
    dialogue: [
      {
        speaker: 'system',
        text: 'Mama Kemi sits with perfect posture. Her eyes miss nothing.',
      },
      {
        speaker: 'npc',
        text: 'Child, sit. You look like I did in 98. When they told me the ministry was underperforming and I knew, it was a demolition by spreadsheet.',
        options: [
          {
            label: 'What happened in 1998?',
            impact: { time: -2 },
            revealsEvidence: 'evidence_1998_pattern',
            trustChange: 10,
            response:
              'A foreign consortium wanted the coastal assets. They commissioned an audit, manufactured a performance crisis, and the government sold everything at fire-sale prices. The same audit firm, Sterling & Associates, is behind this one. I have the original contracts.',
          },
          {
            label: 'Who funded Sterling & Associates originally?',
            impact: { time: -1 },
            revealsEvidence: 'evidence_funding_trail',
            trustChange: 15,
            response:
              'The Mayor predecessor. But the Mayor inherited the arrangement. He does not create the crises, Director, he profits from them. When trust drops below 20%, the ministry triggers an emergency asset review. He has been positioning for that.',
          },
          {
            label: 'Should I trust you, Mama Kemi?',
            impact: { time: -1 },
            trustChange: -5,
            response:
              'Trust is a luxury we cannot afford. Verify. I will give you the 98 files. Compare them to the current audit methodology. If you find the same fingerprints, you will know I am telling the truth, and you will know exactly who authored the report.',
          },
        ],
      },
    ],
  },
  {
    id: 'mayor',
    name: 'The Mayor',
    role: 'External Political Powerbroker',
    origin: 'Lagos State Government',
    age: '50s',
    color: '#8B5CF6',
    initials: 'MA',
    profile:
      'Charismatic, suave, ominous, transactional. Offers resources in exchange for strategic blindspots.',
    secret:
      'Knows exactly who authored the manipulated performance report and stands to acquire the commission assets if trust falls below 20%.',
    dialogue: [
      {
        speaker: 'system',
        text: 'The Mayor arrives without an appointment. His smile is immaculate.',
      },
      {
        speaker: 'npc',
        text: 'Director! Terrible business, this audit. I am here to help. The state can offer emergency funding, bridge your budget gap, no strings attached.',
        options: [
          {
            label: 'What strings, Mayor? Let us not pretend.',
            impact: { time: -1 },
            revealsEvidence: 'evidence_mayor_offer',
            trustChange: -5,
            response:
              'Straightforward. I like that. Unmonitored access to the commission infrastructure contracts during the review period. Temporary, of course. Until the crisis passes.',
          },
          {
            label: 'You know who authored the report. I can see it.',
            impact: { time: -2 },
            revealsEvidence: 'evidence_mayor_knowledge',
            trustChange: -15,
            response:
              'You see a great deal, Director. But seeing is not proving. Accept my offer and this crisis dissolves by morning. Decline, and the ministry review proceeds. I would hate to see your commission liquidated.',
          },
          {
            label: 'I will take the funding. We can discuss terms.',
            impact: { time: -3, budget: 25, trust: -10, power: 10 },
            trustChange: 20,
            response:
              'Wise. A pragmatic choice for a pragmatic moment. My people will coordinate with your operations team. You will barely notice the difference. Except everything will be slightly easier.',
          },
        ],
      },
    ],
  },
];

// --- EVIDENCE ---
export interface EvidenceItem {
  id: string;
  title: string;
  type: 'document' | 'audio' | 'cctv' | 'data' | 'physical';
  description: string;
  connectedTo?: string[];
}

export const EVIDENCE_DB: Record<string, EvidenceItem> = {
  evidence_lekki_logs: {
    id: 'evidence_lekki_logs',
    title: 'Lekki Routing Logs',
    type: 'data',
    description:
      'Grid routing logs showing unauthorized reconfiguration during the ministerial blackout. Pattern matches known sabotage methodology.',
    connectedTo: ['evidence_bypass_logs', 'evidence_algorithm_patch'],
  },
  evidence_jolomi_warning: {
    id: 'evidence_jolomi_warning',
    title: 'Anonymous Warning Package',
    type: 'physical',
    description:
      'A physical package received by Jolomi containing a routing map that precisely predicted the sabotage pattern. Someone knew in advance.',
    connectedTo: ['evidence_1998_pattern'],
  },
  evidence_algorithm_patch: {
    id: 'evidence_algorithm_patch',
    title: 'Algorithm Patch Metadata',
    type: 'data',
    description:
      'Forensic extraction showing the performance scoring algorithms were modified 48 hours before the audit. Subtle weight shifts designed to fail the commission.',
    connectedTo: ['evidence_forensic_proof', 'evidence_funding_trail'],
  },
  evidence_forensic_proof: {
    id: 'evidence_forensic_proof',
    title: 'Signing Certificate Trace',
    type: 'data',
    description:
      'The patch was signed with a certificate belonging to Sterling & Associates, the audit firm parent company. Direct evidence of external manipulation.',
    connectedTo: ['evidence_1998_pattern', 'evidence_mayor_knowledge'],
  },
  evidence_bypass_logs: {
    id: 'evidence_bypass_logs',
    title: 'Chinedu Bypass Protocols',
    type: 'document',
    description:
      'Records of safety protocol bypasses at Chinedu authorization. Real, but pre-dates the sabotage by weeks. A red herring, or a vulnerability exploited by others.',
    connectedTo: ['evidence_lekki_logs'],
  },
  evidence_1998_pattern: {
    id: 'evidence_1998_pattern',
    title: 'The 1998 Collapse Files',
    type: 'document',
    description:
      'Declassified records showing Sterling & Associates used identical audit manipulation to force a coastal asset fire-sale in 1998. The methodology matches perfectly.',
    connectedTo: ['evidence_funding_trail', 'evidence_forensic_proof'],
  },
  evidence_funding_trail: {
    id: 'evidence_funding_trail',
    title: 'Sterling Funding Records',
    type: 'document',
    description:
      'Original funding documents for Sterling & Associates, traced to a Lagos state political office. The same network that operates today.',
    connectedTo: ['evidence_mayor_offer'],
  },
  evidence_mayor_offer: {
    id: 'evidence_mayor_offer',
    title: 'The Mayor Proposal',
    type: 'audio',
    description:
      'Recorded offer of emergency funding in exchange for unmonitored infrastructure access during the crisis period. A transactional power grab.',
    connectedTo: ['evidence_mayor_knowledge', 'evidence_funding_trail'],
  },
  evidence_mayor_knowledge: {
    id: 'evidence_mayor_knowledge',
    title: 'Mayor Foreknowledge',
    type: 'cctv',
    description:
      'CCTV timestamp analysis shows the Mayor office contacted Sterling & Associates 72 hours before the audit results were published. He knew the outcome in advance.',
    connectedTo: ['evidence_1998_pattern', 'evidence_forensic_proof'],
  },
};

// --- DECISIONS ---
export interface Decision {
  id: string;
  title: string;
  description: string;
  choices: DecisionChoice[];
}

export interface DecisionChoice {
  id: string;
  label: string;
  impacts: ResourceImpact;
  consequence: string;
  flags?: string[];
}

export const DECISIONS: Decision[] = [
  {
    id: 'decision_power_vs_investigation',
    title: 'Operations vs Investigation',
    description:
      'The Lekki grid is destabilizing. You can divert emergency budget to stabilize operations, or fund Dr. Aisha unauthorized digital trace to uncover the sabotage source.',
    choices: [
      {
        id: 'fix_power',
        label: 'Divert budget to stabilize the Lekki grid',
        impacts: { power: 20, budget: -15, time: -4 },
        consequence:
          'The grid stabilizes. Public confidence ticks up. But the digital trace window closes, whoever patched the algorithms has more time to cover their tracks.',
        flags: ['stabilized_operations'],
      },
      {
        id: 'fund_trace',
        label: 'Fund Aisha unauthorized digital trace',
        impacts: { comms: -10, budget: -10, time: -5, trust: -5 },
        consequence:
          'Aisha team extracts the patch metadata. Critical evidence secured. But the grid flickers during the trace, and a minor press leak about internal instability surfaces.',
        flags: ['evidence_priority'],
      },
    ],
  },
  {
    id: 'decision_pr_vs_truth',
    title: 'Reputation vs Truth',
    description:
      'The press is asking about the audit irregularities. You can issue a sanitized PR statement to maintain public trust, or reveal the audit discrepancy and risk panic.',
    choices: [
      {
        id: 'sanitize',
        label: 'Issue a sanitized public PR statement',
        impacts: { trust: 12, comms: 5, time: -2 },
        consequence:
          'Public trust stabilizes. The ministry delays its review by 48 hours. But you have buried the truth, and your own staff may question your integrity.',
        flags: ['public_stability'],
      },
      {
        id: 'reveal',
        label: 'Reveal the audit discrepancy publicly',
        impacts: { trust: -15, comms: -8, time: -3 },
        consequence:
          'The public is alarmed. Trust plummets. But transparency earns you quiet allies in the federal oversight committee who were already suspicious of Sterling & Associates.',
        flags: ['truth_revealed'],
      },
    ],
  },
  {
    id: 'decision_mayor_bailout',
    title: 'Integrity vs Expediency',
    description:
      'The Mayor offers emergency funding to bridge your budget crisis, in exchange for unmonitored infrastructure access during the review period.',
    choices: [
      {
        id: 'accept_bailout',
        label: 'Accept the Mayor bailout',
        impacts: { budget: 25, power: 10, trust: -10 },
        consequence:
          'Your budget crisis dissolves. Operations stabilize. But the Mayor now has a foothold inside your infrastructure. He will use it.',
        flags: ['mayor_deal'],
      },
      {
        id: 'reject_bailout',
        label: 'Refuse the deal publicly',
        impacts: { trust: 8, budget: -5, time: -2 },
        consequence:
          'Refusing the Mayor makes you a target, but earns the respect of your staff and signals independence to the federal ministry. The budget stays tight.',
        flags: ['independent_stance'],
      },
    ],
  },
  {
    id: 'decision_final_confrontation',
    title: 'The Final Confrontation',
    description:
      'You have enough evidence to expose the sabotage network. But the ministerial review is in 6 hours. Do you go public with everything, or work through channels?',
    choices: [
      {
        id: 'whistleblow',
        label: 'Go public, full whistleblower disclosure',
        impacts: { trust: -20, comms: -15, time: -6 },
        consequence:
          'You release everything: the algorithm patch, the funding trail, the Mayor foreknowledge. The city erupts. The commission is saved, but your career is over.',
        flags: ['whistleblower'],
      },
      {
        id: 'channels',
        label: 'Work through federal oversight channels',
        impacts: { trust: 10, time: -8, staff: -5 },
        consequence:
          'You present the evidence to the federal oversight committee. It is slower, quieter. The Mayor is investigated discreetly. The commission survives intact.',
        flags: ['institutional_path'],
      },
      {
        id: 'confront_mayor',
        label: 'Confront the Mayor directly with the evidence',
        impacts: { trust: -5, comms: -10, time: -4 },
        consequence:
          'You give the Mayor 24 hours to withdraw from the commission assets or you go public. He calls your bluff, then his lawyers call your office. A tense standoff begins.',
        flags: ['direct_confrontation'],
      },
    ],
  },
];

// --- CRISES ---
export interface CrisisEvent {
  id: string;
  title: string;
  description: string;
  choices: CrisisChoice[];
}

export interface CrisisChoice {
  id: string;
  label: string;
  impacts: ResourceImpact;
  result: string;
}

export const CRISES: CrisisEvent[] = [
  {
    id: 'crisis_lekki_overload',
    title: 'LEKKI GRID OVERLOAD',
    description:
      'The Lekki substation is approaching critical thermal limits. Without intervention, the entire eastern corridor loses power within 90 minutes.',
    choices: [
      {
        id: 'emergency_shutdown',
        label: 'Emergency shutdown of non-essential loads',
        impacts: { power: 15, trust: -8, time: -3 },
        result:
          'The grid stabilizes. Commercial users are furious. A shopping district goes dark during peak hours. Public complaints spike.',
      },
      {
        id: 'reroute',
        label: 'Reroute through the Epe backup grid',
        impacts: { power: 10, budget: -10, time: -4, staff: -5 },
        result:
          'Chinedu team executes the reroute successfully. Epe absorbs the load. But the backup capacity is now spent, you have no margin left.',
      },
      {
        id: 'ignore',
        label: 'Let the system find its own equilibrium',
        impacts: { power: -20, trust: -15, time: -1 },
        result:
          'The grid self-stabilizes, barely. Two hospitals lose power for 11 minutes. The incident makes the evening news.',
      },
    ],
  },
  {
    id: 'crisis_audit_leak',
    title: 'AUDIT LEAK TO PRESS',
    description:
      'A journalist has obtained partial audit documents showing the commission catastrophic underperformance. The story breaks in 4 hours.',
    choices: [
      {
        id: 'preempt',
        label: 'Preempt with your own controlled disclosure',
        impacts: { trust: 5, comms: -10, time: -3 },
        result:
          'You frame the narrative before the press does. The story runs, but with your context. Damage contained, barely.',
      },
      {
        id: 'deny',
        label: 'Issue a categorical denial',
        impacts: { trust: -10, comms: 5, time: -2 },
        result:
          'The denial is contradicted by the published documents within hours. Your credibility takes a direct hit.',
      },
      {
        id: 'source_hunt',
        label: 'Divert resources to find the leaker',
        impacts: { staff: -10, comms: -5, time: -5, trust: 3 },
        result:
          'Your security team traces the leak to a mid-level administrator who was approached by Sterling & Associates. A small victory, but the story still runs.',
      },
    ],
  },
  {
    id: 'crisis_server_lockout',
    title: 'ENCRYPTED SERVER LOCKOUT',
    description:
      'The Marina Server Farm has been locked by ransomware. All forensic data, audit records, and communication logs are encrypted.',
    choices: [
      {
        id: 'pay_ransom',
        label: 'Pay the ransom from emergency budget',
        impacts: { budget: -20, time: -2, comms: 10 },
        result:
          'The servers are restored. But paying the ransom validates the attack vector, and the money flows to Sterling & Associates shell company.',
      },
      {
        id: 'isolate',
        label: 'Isolate the servers and rebuild from backup',
        impacts: { comms: -15, time: -6, staff: -10, power: -5 },
        result:
          'Aisha team rebuilds over 6 hours. You lose recent forensic data but prove the attack was externally sourced. The isolation itself becomes evidence.',
      },
      {
        id: 'decrypt',
        label: 'Attempt unauthorized decryption (Chinedu method)',
        impacts: { time: -4, comms: 5, power: -10 },
        result:
          'Chinedu bypass works, partially. You recover 60% of the data, including the original patch metadata. But the decryption attempt triggers a security alert at the ministry.',
      },
    ],
  },
  {
    id: 'crisis_worker_strike',
    title: 'ENGINEER WORKER STRIKE',
    description:
      'The field engineers have walked off the job, citing unsafe conditions and management distrust. Grid maintenance is halted.',
    choices: [
      {
        id: 'negotiate',
        label: 'Negotiate directly with the union leaders',
        impacts: { time: -4, trust: 5, budget: -10, staff: 10 },
        result:
          'You address their concerns personally. The strike ends. Your staff morale improves, but the budget takes a hit for the promised safety improvements.',
      },
      {
        id: 'contractors',
        label: 'Hire emergency contractors',
        impacts: { budget: -20, staff: -5, power: 5, time: -2 },
        result:
          'Contractors keep the grid running. But they are expensive, and one of them is later identified as a Sterling & Associates subcontractor.',
      },
      {
        id: 'wait',
        label: 'Wait them out, the strike will collapse',
        impacts: { power: -15, trust: -10, staff: -10, time: -6 },
        result:
          'The strike lasts 6 days. The grid degrades measurably. Public trust drops. Your remaining staff feel abandoned by leadership.',
      },
    ],
  },
];

// --- ENDINGS ---
export interface Ending {
  id: string;
  title: string;
  type: string;
  description: string;
  condition: (resources: Resources, evidence: string[], flags: string[]) => boolean;
}

export const ENDINGS: Ending[] = [
  {
    id: 'whistleblower_victory',
    title: 'Whistleblower Victory',
    type: 'TRUTH PREVAILS',
    description:
      'Your full disclosure ignites a federal investigation. Sterling & Associates is dismantled. The Mayor resigns under pressure. The commission is saved, but you are reassigned to a desk in Abuja. The truth cost everything, and was worth it.',
    condition: (r, ev, flags) =>
      ev.length >= 7 && flags.includes('whistleblower') && r.trust > 20,
  },
  {
    id: 'technological_sovereignty',
    title: 'Technological Sovereignty',
    type: 'SYSTEM RECLAIMED',
    description:
      'Dr. Aisha forensic proof is unassailable. The algorithm patch is reversed publicly, the signing certificate traced to Sterling & Associates. The commission integrity is restored through pure technical evidence. You emerge as the director who let the data speak.',
    condition: (r, ev) =>
      ev.includes('evidence_forensic_proof') &&
      ev.includes('evidence_algorithm_patch') &&
      r.trust > 50,
  },
  {
    id: 'compromised_compromise',
    title: 'Compromised Compromise',
    type: 'SURVIVAL AT A COST',
    description:
      'The Mayor deal keeps the commission operational. The crisis passes quietly. But you have given away infrastructure access to the very network that manufactured the crisis. The next audit will not be faked, it will be unnecessary, because the commission will already belong to him.',
    condition: (r, _ev, flags) =>
      flags.includes('mayor_deal') && r.budget > 60 && r.trust > 30,
  },
  {
    id: 'shadow_takeover',
    title: 'Shadow Takeover',
    type: 'ASSETS LIQUIDATED',
    description:
      'Public trust collapses below the ministerial threshold. Emergency asset review is triggered. The commission is liquidated within 30 days. Sterling & Associates acquires the infrastructure contracts at fire-sale prices. The Mayor smiles for the cameras. You were right about everything, and it changed nothing.',
    condition: (r) => r.trust <= 20,
  },
  {
    id: 'institutional_path',
    title: 'Institutional Restoration',
    type: 'ORDER PRESERVED',
    description:
      'Working through federal oversight channels, the evidence is processed quietly. The Mayor faces a discreet investigation. The commission survives intact, its reputation preserved. Not justice, but accountability. Sometimes that is enough.',
    condition: (_r, ev, flags) =>
      flags.includes('institutional_path') && ev.length >= 6,
  },
  {
    id: 'time_exhausted',
    title: 'Deadline Missed',
    type: 'REVIEW FAILED',
    description:
      'The ministerial review arrived before you could assemble a complete case. Incomplete evidence, unresolved crises. The commission is placed under temporary administration. The saboteurs win by default, not because they are clever, but because time ran out.',
    condition: (r) => r.time <= 0,
  },
  {
    id: 'default_ending',
    title: 'Unresolved',
    type: 'CASE FILED',
    description:
      'The crisis fades without resolution. Some evidence points to external manipulation, but not enough for action. The commission limps forward. The saboteurs remain in the shadows, watching, waiting for the next cycle.',
    condition: () => true,
  },
];

// --- PROLOGUE ---
export const PROLOGUE_LINES = [
  'APEX ENERGY & INFRASTRUCTURE COMMISSION',
  'VICTORIA ISLAND, LAGOS, 03:47 AM',
  'The quarterly performance review has flagged catastrophic systemic irregularities.',
  'Power grid destabilization. Budget hemorrhage. Telecommunication blackouts.',
  'The Federal Ministry has given you 48 hours before emergency asset review.',
  'An encrypted transmission just arrived on your personal terminal:',
  'DO NOT TRUST THE PERFORMANCE REPORT.',
  'You are the Acting Director General. Keep the organization alive. Uncover the truth.',
];

// --- TICKER MESSAGES ---
export const TICKER_MESSAGES = [
  'LEKKI SUBSTATION: TEMPERATURE NOMINAL BUT TRENDING UPWARD',
  'MARINA SERVER FARM: 3 UNUSUAL ACCESS ATTEMPTS LOGGED',
  'EPE GRID: LOAD DISTRIBUTION UNSTABLE',
  'FEDERAL MINISTRY: REVIEW DEADLINE APPROACHING',
  'PUBLIC SENTIMENT: NEGATIVE PRESS CYCLE DETECTED',
  'STERLING & ASSOCIATES: AUDIT FIRM REPRESENTATIVE SEEN AT COMMISSION PREMISES',
  'INTERNAL ALERT: ENCRYPTED CHANNEL ANOMALY DETECTED',
];

// --- HELPER FUNCTIONS ---
export function applyImpact(resources: Resources, impact: ResourceImpact): Resources {
  const result = { ...resources };
  for (const [key, value] of Object.entries(impact)) {
    if (typeof value === 'number') {
      (result as Record<string, number>)[key] = Math.max(
        0,
        Math.min(key === 'time' ? 999 : 100, (result as Record<string, number>)[key] + value)
      );
    }
  }
  return result;
}

export function resolveEnding(
  resources: Resources,
  evidence: string[],
  flags: string[]
): Ending {
  for (const ending of ENDINGS) {
    if (ending.condition(resources, evidence, flags)) {
      return ending;
    }
  }
  return ENDINGS[ENDINGS.length - 1];
}

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
