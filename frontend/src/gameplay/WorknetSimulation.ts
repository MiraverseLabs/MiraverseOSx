import { INSTITUTIONAL_REGISTRY } from '../apps/worknet/worknetData';
import {
  calculateCompensation,
  evaluateNpcDecision,
  type CompensationModel,
  type CompensationStage,
  type ExecutionMode,
  type NpcAutonomyContext,
} from './WorknetCoreSystems';

export interface InstitutionalWorkload {
  stationId: string;
  demandUnits: number;
  processingCapacity: number;
  backlog: number;
  vacancies: number;
  completedBackgroundUnits: number;
}

export interface NpcSimRecord {
  npcId: string;
  name: string;
  stationId: string;
  role: string;
  xp: number;
  completedUnits: number;
  mistakesRecovered: number;
  tier: string;
  lastDecision: 'execute' | 'defer' | 'refer' | 'refuse' | 'request-approval';
  lastAutonomy: NpcAutonomyContext;
  lastActionSummary: string;
  pendingCorrection: boolean;
}

export interface NpcPeerBond {
  pairKey: string;
  npcA: string;
  npcB: string;
  stationId: string;
  cooperation: number;
  lastEvent: string;
}

export interface PayrollEntry {
  id: string;
  claimId: string;
  model: CompensationModel;
  payer: string;
  track: string;
  description: string;
  stage: CompensationStage;
  grossCredits: number;
  civicDeduction: number;
  netCredits: number;
  verifiedUnits?: number;
  ratePerUnit?: number;
  createdAtCycle: number;
  issuedAtCycle?: number;
}

export interface CareerMilestone {
  id: string;
  track: string;
  kind: 'hired' | 'resigned' | 'promoted' | 'transferred' | 'leave' | 'operation' | 'credential';
  title: string;
  detail: string;
  cycle: number;
  timestamp: string;
}

export interface WorknetSimulationState {
  version: number;
  lastTick: number;
  workloads: Record<string, InstitutionalWorkload>;
  npcs: Record<string, NpcSimRecord>;
  peerBonds: Record<string, NpcPeerBond>;
  activityFeed: { id: string; tick: number; stationId: string; actor: string; summary: string }[];
  payrollLedger: PayrollEntry[];
  careerHistory: CareerMilestone[];
}

const DEFAULT_STATIONS = Object.keys(INSTITUTIONAL_REGISTRY);

function npcTierFromXp(xp: number): string {
  if (xp >= 400) return 'Senior Specialist';
  if (xp >= 180) return 'Experienced Associate';
  if (xp >= 60) return 'Practitioner';
  return 'Junior Associate';
}

export function emptyWorknetSimulation(tick = 0): WorknetSimulationState {
  const workloads: Record<string, InstitutionalWorkload> = {};
  const npcs: Record<string, NpcSimRecord> = {};
  const peerBonds: Record<string, NpcPeerBond> = {};

  for (const [stationId, org] of Object.entries(INSTITUTIONAL_REGISTRY)) {
    const staffCount = Math.max(1, org.coworkers.length);
    workloads[stationId] = {
      stationId,
      demandUnits: 4 + staffCount,
      processingCapacity: staffCount * 2 + 2,
      backlog: 3 + (staffCount % 3),
      vacancies: 1,
      completedBackgroundUnits: 0,
    };

    for (const cw of org.coworkers) {
      npcs[cw.id] = {
        npcId: cw.id,
        name: cw.name,
        stationId,
        role: cw.title,
        xp: Math.max(20, Math.round(cw.competence * 1.5)),
        completedUnits: 0,
        mistakesRecovered: 0,
        tier: npcTierFromXp(Math.max(20, Math.round(cw.competence * 1.5))),
        lastDecision: 'execute',
        lastAutonomy: 'routine',
        lastActionSummary: 'Maintaining routine station duties.',
        pendingCorrection: false,
      };
    }

    if (org.coworkers.length >= 2) {
      const a = org.coworkers[0];
      const b = org.coworkers[1];
      const pairKey = `${a.id}::${b.id}`;
      peerBonds[pairKey] = {
        pairKey,
        npcA: a.name,
        npcB: b.name,
        stationId,
        cooperation: Math.round((a.cooperation + b.cooperation) / 2),
        lastEvent: 'Coordinating shift coverage.',
      };
    }
  }

  return {
    version: 1,
    lastTick: Math.max(0, Math.floor(tick)),
    workloads,
    npcs,
    peerBonds,
    activityFeed: [],
    payrollLedger: [],
    careerHistory: [],
  };
}

export function restoreWorknetSimulation(raw: unknown, tick = 0): WorknetSimulationState {
  const base = emptyWorknetSimulation(tick);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const saved = raw as Partial<WorknetSimulationState>;

  const workloads: Record<string, InstitutionalWorkload> = { ...base.workloads };
  if (saved.workloads && typeof saved.workloads === 'object') {
    for (const stationId of DEFAULT_STATIONS) {
      const w = saved.workloads[stationId];
      if (!w || typeof w !== 'object') continue;
      workloads[stationId] = {
        stationId,
        demandUnits: Math.max(1, Number.isFinite(w.demandUnits) ? Math.floor(w.demandUnits) : base.workloads[stationId].demandUnits),
        processingCapacity: Math.max(1, Number.isFinite(w.processingCapacity) ? Math.floor(w.processingCapacity) : base.workloads[stationId].processingCapacity),
        backlog: Math.max(0, Number.isFinite(w.backlog) ? Math.floor(w.backlog) : base.workloads[stationId].backlog),
        vacancies: Math.max(0, Number.isFinite(w.vacancies) ? Math.floor(w.vacancies) : 1),
        completedBackgroundUnits: Math.max(0, Number.isFinite(w.completedBackgroundUnits) ? Math.floor(w.completedBackgroundUnits) : 0),
      };
    }
  }

  const npcs: Record<string, NpcSimRecord> = { ...base.npcs };
  if (saved.npcs && typeof saved.npcs === 'object') {
    for (const [id, item] of Object.entries(saved.npcs)) {
      if (!npcs[id] || !item || typeof item !== 'object') continue;
      const xp = Math.max(0, Number.isFinite(item.xp) ? Math.floor(item.xp) : npcs[id].xp);
      npcs[id] = {
        ...npcs[id],
        xp,
        completedUnits: Math.max(0, Number.isFinite(item.completedUnits) ? Math.floor(item.completedUnits) : 0),
        mistakesRecovered: Math.max(0, Number.isFinite(item.mistakesRecovered) ? Math.floor(item.mistakesRecovered) : 0),
        tier: npcTierFromXp(xp),
        lastDecision: item.lastDecision || npcs[id].lastDecision,
        lastAutonomy: item.lastAutonomy || npcs[id].lastAutonomy,
        lastActionSummary: typeof item.lastActionSummary === 'string' ? item.lastActionSummary : npcs[id].lastActionSummary,
        pendingCorrection: Boolean(item.pendingCorrection),
      };
    }
  }

  const peerBonds: Record<string, NpcPeerBond> = { ...base.peerBonds };
  if (saved.peerBonds && typeof saved.peerBonds === 'object') {
    for (const [key, bond] of Object.entries(saved.peerBonds)) {
      if (!peerBonds[key] || !bond || typeof bond !== 'object') continue;
      peerBonds[key] = {
        ...peerBonds[key],
        cooperation: Math.max(0, Math.min(100, Number.isFinite(bond.cooperation) ? Math.floor(bond.cooperation) : peerBonds[key].cooperation)),
        lastEvent: typeof bond.lastEvent === 'string' ? bond.lastEvent : peerBonds[key].lastEvent,
      };
    }
  }

  const payrollLedger = Array.isArray(saved.payrollLedger)
    ? saved.payrollLedger.filter(
        (entry): entry is PayrollEntry =>
          Boolean(entry && typeof entry.id === 'string' && typeof entry.claimId === 'string' && Number.isFinite(entry.netCredits)),
      )
    : [];

  const careerHistory = Array.isArray(saved.careerHistory)
    ? saved.careerHistory.filter(
        (item): item is CareerMilestone => Boolean(item && typeof item.id === 'string' && typeof item.title === 'string'),
      )
    : [];

  const activityFeed = Array.isArray(saved.activityFeed)
    ? saved.activityFeed
        .filter(item => item && typeof item.id === 'string' && typeof item.summary === 'string')
        .slice(0, 24)
    : [];

  return {
    version: 1,
    lastTick: Number.isFinite(saved.lastTick) ? Math.max(0, Math.floor(saved.lastTick!)) : Math.max(0, Math.floor(tick)),
    workloads,
    npcs,
    peerBonds,
    activityFeed,
    payrollLedger,
    careerHistory,
  };
}

/**
 * Advances autonomous NPC decisions, institutional backlogs, NPC-to-NPC collaboration,
 * and independent NPC career progression strictly in step with session-based ticks.
 * Authored player missions are never completed by background simulation.
 */
export function advanceWorknetSimulation(
  raw: unknown,
  currentTick: number,
  workplaceState?: {
    coworkerStats?: Record<string, { trust: number; competence: number; cooperation: number; status: 'Desk' | 'In Meeting' | 'In Field' | 'On Break' }>;
    divisionBudgets?: Record<string, { equipment: number; training: number; surge: number }>;
    delegatedTasks?: { assigneeId: string; status: string }[];
  },
): WorknetSimulationState {
  const state = restoreWorknetSimulation(raw, currentTick);
  const targetTick = Math.max(0, Math.floor(currentTick));
  if (targetTick <= state.lastTick) return state;

  // Cap catch-up steps per tick advance to keep simulation bounded and deterministic
  const steps = Math.min(4, targetTick - state.lastTick);
  const workloads = { ...state.workloads };
  const npcs = { ...state.npcs };
  const peerBonds = { ...state.peerBonds };
  const feed = [...state.activityFeed];

  for (let step = 1; step <= steps; step++) {
    const tick = state.lastTick + step;

    for (const [stationId, org] of Object.entries(INSTITUTIONAL_REGISTRY)) {
      const w = { ...workloads[stationId] };
      const budget = workplaceState?.divisionBudgets?.[stationId];
      const equipmentFunded = !budget || budget.equipment >= 500;
      const trainingBoost = budget ? Math.floor((budget.training || 0) / 1000) : 0;

      // Incoming institutional demand fluctuates modestly with segment cadence
      const incoming = 1 + ((tick + stationId.length) % 3);
      w.demandUnits = incoming + Math.max(1, org.coworkers.length);
      w.backlog = Math.min(25, w.backlog + incoming);
      w.vacancies = w.backlog >= 10 ? 2 : 1;

      const activeWorkers: string[] = [];

      for (const cw of org.coworkers) {
        const record = { ...npcs[cw.id] };
        const liveStats = workplaceState?.coworkerStats?.[cw.id];
        const status = liveStats?.status || cw.status;
        const competence = Math.min(100, (liveStats?.competence ?? cw.competence) + trainingBoost * 2);
        const hasOpenDelegation = Boolean(
          workplaceState?.delegatedTasks?.some(d => d.assigneeId === cw.id && d.status !== 'Approved'),
        );

        const decision = evaluateNpcDecision({
          npcId: cw.id,
          role: cw.title,
          autonomy: record.pendingCorrection ? 'situational' : 'routine',
          authorizedForTask: true,
          withinRoleRemit: true,
          hasRequiredInformation: true,
          trust: liveStats?.trust ?? cw.trust,
          cooperation: liveStats?.cooperation ?? cw.cooperation,
          status,
          hasOpenCommitment: hasOpenDelegation,
          safetyCompliant: equipmentFunded,
          urgent: w.backlog >= 12,
        });

        record.lastDecision = decision.decision;
        record.lastAutonomy = decision.autonomyUsed;

        if (decision.decision === 'execute' && w.backlog > 0) {
          // Plausible procedural slip if competence < 72 on a periodic cadence; NPC self-corrects on next execution
          const proceduralSlip = !record.pendingCorrection && competence < 72 && (tick + cw.id.length) % 5 === 0;
          if (proceduralSlip) {
            record.pendingCorrection = true;
            record.lastActionSummary = `Logged a procedural discrepancy in ${org.shortOrg} backlog; preparing self-correction.`;
          } else {
            const cleared = Math.min(w.backlog, competence >= 85 ? 2 : 1);
            w.backlog = Math.max(0, w.backlog - cleared);
            w.completedBackgroundUnits += cleared;
            record.completedUnits += cleared;
            record.xp += cleared * 6;
            if (record.pendingCorrection) {
              record.mistakesRecovered += 1;
              record.pendingCorrection = false;
              record.lastActionSummary = `Self-corrected prior discrepancy and cleared ${cleared} ${org.shortOrg} backlog unit(s).`;
            } else {
              record.lastActionSummary = `Cleared ${cleared} routine ${org.shortOrg} backlog unit(s) under ${decision.autonomyUsed} autonomy.`;
            }
            record.tier = npcTierFromXp(record.xp);
            activeWorkers.push(cw.id);
          }
        } else if (decision.decision === 'refuse') {
          record.lastActionSummary = 'Paused non-essential equipment tasks until maintenance funding is restored.';
        } else {
          record.lastActionSummary = decision.reason;
        }

        npcs[cw.id] = record;
      }

      // NPC-to-NPC peer bond growth when two colleagues both process station workload in the same segment
      if (activeWorkers.length >= 2) {
        const pairKey = `${activeWorkers[0]}::${activeWorkers[1]}`;
        if (peerBonds[pairKey]) {
          peerBonds[pairKey] = {
            ...peerBonds[pairKey],
            cooperation: Math.min(100, peerBonds[pairKey].cooperation + 1),
            lastEvent: `Collaborated on ${org.shortOrg} workload at segment ${tick}.`,
          };
        }
      }

      if (activeWorkers.length > 0 && (step === steps || w.backlog >= 10)) {
        const lead = npcs[activeWorkers[0]];
        feed.unshift({
          id: `sim:${stationId}:${tick}`,
          tick,
          stationId,
          actor: lead.name,
          summary: lead.lastActionSummary,
        });
      }

      workloads[stationId] = w;
    }
  }

  return {
    ...state,
    lastTick: targetTick,
    workloads,
    npcs,
    peerBonds,
    activityFeed: feed.slice(0, 24),
  };
}

/** Oryn Department of Finance payroll lifecycle: earn → verify → issue without duplicate payouts */
export function recordEarnedPayroll(
  state: WorknetSimulationState,
  input: {
    claimId: string;
    model: CompensationModel;
    payer: string;
    track: string;
    description: string;
    verifiedUnits?: number;
    ratePerUnit?: number;
    agreedFee?: number;
    authorizedPremiums?: number;
    verified: boolean;
    cycle: number;
  },
): { state: WorknetSimulationState; entry?: PayrollEntry; ok: boolean; reason: string } {
  const priorIds = state.payrollLedger.map(e => e.claimId);
  const calc = calculateCompensation({
    claimId: input.claimId,
    model: input.model,
    payer: input.payer,
    actorId: 'player',
    verifiedUnits: input.verifiedUnits,
    ratePerUnit: input.ratePerUnit,
    agreedFee: input.agreedFee,
    authorizedPremiums: input.authorizedPremiums,
    verified: input.verified,
    priorReceiptIds: priorIds,
  });

  if (!calc.ok) {
    return { state, ok: false, reason: calc.reason };
  }

  // Oryn Department of Finance 5% civic levy on positive gross wages
  const civicDeduction = calc.grossCredits > 0 ? Math.floor(calc.grossCredits * 0.05) : 0;
  const netCredits = Math.max(0, calc.grossCredits - civicDeduction);

  const entry: PayrollEntry = {
    id: `PAY-${crypto.randomUUID()}`,
    claimId: input.claimId,
    model: input.model,
    payer: input.payer,
    track: input.track,
    description: input.description,
    stage: 'earned',
    grossCredits: calc.grossCredits,
    civicDeduction,
    netCredits,
    verifiedUnits: input.verifiedUnits,
    ratePerUnit: input.ratePerUnit,
    createdAtCycle: input.cycle,
  };

  return {
    state: { ...state, payrollLedger: [entry, ...state.payrollLedger] },
    entry,
    ok: true,
    reason: `Payable recorded: ${netCredits} ₢ net (${calc.grossCredits} ₢ gross − ${civicDeduction} ₢ Oryn levy).`,
  };
}

export function issueEarnedPayroll(
  state: WorknetSimulationState,
  cycle: number,
  entryId?: string,
): { state: WorknetSimulationState; totalNetCredits: number; issuedCount: number } {
  let totalNetCredits = 0;
  let issuedCount = 0;
  const nextLedger = state.payrollLedger.map(entry => {
    if (entry.stage !== 'earned') return entry;
    if (entryId && entry.id !== entryId) return entry;
    totalNetCredits += entry.netCredits;
    issuedCount += 1;
    return { ...entry, stage: 'issued' as const, issuedAtCycle: cycle };
  });
  return {
    state: { ...state, payrollLedger: nextLedger },
    totalNetCredits,
    issuedCount,
  };
}

export function appendCareerMilestone(
  state: WorknetSimulationState,
  milestone: Omit<CareerMilestone, 'id' | 'timestamp'>,
): WorknetSimulationState {
  const entry: CareerMilestone = {
    ...milestone,
    id: `HIST-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
  };
  return {
    ...state,
    careerHistory: [entry, ...state.careerHistory].slice(0, 60),
  };
}

/** Determine which of the 4 Hybrid Execution Modes are available for a player on a work stage */
export function availableExecutionModes(
  player: any,
  track: string,
  hasDeskCoworker = false,
): { mode: ExecutionMode; label: string; enabled: boolean; reason: string }[] {
  const clearance = Number(player?.clearanceLevel ?? 1);
  const contract = player?.employmentContracts?.[track];
  const isSupervisor = contract?.pathwayChoice === 'supervisor';
  const careerXp = Number(player?.careerTrackXp?.[track] ?? player?.xp ?? 0);

  return [
    {
      mode: 'direct',
      label: 'Direct',
      enabled: true,
      reason: 'Perform every step and verification directly.',
    },
    {
      mode: 'guided',
      label: 'Guided',
      enabled: true,
      reason: 'Follow the structured institutional workflow with explicit choices.',
    },
    {
      mode: 'assisted',
      label: 'Assisted',
      enabled: clearance >= 2 || careerXp >= 100,
      reason:
        clearance >= 2 || careerXp >= 100
          ? 'Condense routine telemetry verification while retaining player review.'
          : 'Requires Clearance 2 or 100 career XP.',
    },
    {
      mode: 'delegated',
      label: 'Delegated',
      enabled: Boolean(isSupervisor && hasDeskCoworker),
      reason:
        isSupervisor && hasDeskCoworker
          ? 'Assign stage execution to an available desk colleague under supervisory review.'
          : 'Requires Supervisor pathway and an available desk colleague.',
    },
  ];
}
