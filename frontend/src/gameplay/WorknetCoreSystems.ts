import { CAREER_CATALOG, CAREER_REGISTRY, canonicalCareerId, careerXP, completedCareerAssignments } from './CareerRegistry';
import type { InteractionMechanic } from './ActivityEngine';

/** Part I — Section 2: Activity Hierarchy */
export type ActivityScope = 'task' | 'quest' | 'mission' | 'adventure' | 'journey';

export const ACTIVITY_HIERARCHY: Record<ActivityScope, string> = {
  task: 'A concrete action or objective',
  quest: 'A directed goal involving objectives',
  mission: 'A purposeful operation, often institutional',
  adventure: 'An extended exploration or discovery experience',
  journey: 'A longer personal, professional, or narrative path',
};

/** Part I — Section 3: WORKNET Activity Categories */
export const WORKNET_ACTIVITY_CATEGORIES = [
  'Work Shifts',
  'Special Assignments',
  'Career Development',
  'Field Operations',
  'QUESTNOTICE',
] as const;

export type WorknetActivityCategory = (typeof WORKNET_ACTIVITY_CATEGORIES)[number];

/** Part I — Section 4: Established Career Paths */
export interface CareerDefinition {
  id: string;
  title: string;
  specialistLabel: string;
  supervisoryLabel: string;
}

export const ESTABLISHED_CAREERS: readonly CareerDefinition[] = CAREER_CATALOG.map(c => ({ ...c, title: c.name }));

/** Part I — Section 5: Mission Action Vocabulary (16 logical operations) */
export const MISSION_ACTION_VOCABULARY = [
  'Observe',
  'Interact',
  'Collect',
  'Communicate',
  'Investigate',
  'Analyze',
  'Create',
  'Modify',
  'Transport',
  'Navigate',
  'Operate',
  'Verify',
  'Decide',
  'Submit',
  'Manage',
  'Practice',
] as const;

export type MissionActionType = (typeof MISSION_ACTION_VOCABULARY)[number];

/** Map existing WORKNET mechanics onto the canonical 16-action vocabulary */
export const MECHANIC_ACTION_MAP: Record<InteractionMechanic, readonly MissionActionType[]> = {
  evidence: ['Observe', 'Collect', 'Verify'],
  documents: ['Create', 'Modify', 'Submit'],
  diagnostics: ['Analyze', 'Operate', 'Verify'],
  equipment: ['Operate', 'Modify', 'Interact'],
  investigation: ['Investigate', 'Observe', 'Analyze'],
  dialogue: ['Communicate', 'Interact', 'Decide'],
  logistics: ['Transport', 'Navigate', 'Manage'],
  creative: ['Create', 'Practice', 'Submit'],
};

export function mapMechanicToActions(mechanic: InteractionMechanic): readonly MissionActionType[] {
  return MECHANIC_ACTION_MAP[mechanic] || ['Interact'];
}

/** Part I — Section 6 & 8: Execution Modes & Objective Patterns */
export type ExecutionMode = 'direct' | 'guided' | 'assisted' | 'delegated';
export type ObjectivePattern = 'sequential' | 'alternative-path' | 'convergent' | 'conditional' | 'open-ended';

export const EXECUTION_MODES: readonly ExecutionMode[] = ['direct', 'guided', 'assisted', 'delegated'];
export const OBJECTIVE_PATTERNS: readonly ObjectivePattern[] = [
  'sequential',
  'alternative-path',
  'convergent',
  'conditional',
  'open-ended',
];

/** Part I — Section 7 & 10: Hybrid Outcome Evaluation */
export interface OutcomeEvaluationInput {
  action: MissionActionType;
  mode: ExecutionMode;
  authorized: boolean;
  validInput: boolean;
  evidenceSufficient: boolean;
  institutionalApprovalRequired?: boolean;
  institutionalApproved?: boolean;
  skillLevel?: number;
  difficulty?: number;
  /** Optional deterministic roll (0..1) for testable contextual probability */
  contextRoll?: number;
}

export interface OutcomeEvaluationResult {
  actionValid: boolean;
  resultQuality: number;
  objectiveSatisfied: boolean;
  institutionallyAccepted: boolean;
  reason: string;
}

export function evaluateHybridOutcome(input: OutcomeEvaluationInput): OutcomeEvaluationResult {
  if (!input.authorized) {
    return {
      actionValid: false,
      resultQuality: 0,
      objectiveSatisfied: false,
      institutionallyAccepted: false,
      reason: 'Actor lacks institutional authorization for this action.',
    };
  }
  if (!input.validInput) {
    return {
      actionValid: false,
      resultQuality: 0,
      objectiveSatisfied: false,
      institutionallyAccepted: false,
      reason: 'Required procedure or input validation failed.',
    };
  }

  const skill = Math.max(0, input.skillLevel ?? 2);
  const difficulty = Math.max(1, input.difficulty ?? 2);
  const baseQuality = Math.min(100, Math.max(40, Math.round(70 + (skill - difficulty) * 8)));
  const rollAdjustment =
    typeof input.contextRoll === 'number' && Number.isFinite(input.contextRoll)
      ? Math.round((Math.max(0, Math.min(1, input.contextRoll)) - 0.5) * 16)
      : 0;
  const resultQuality = Math.max(0, Math.min(100, baseQuality + rollAdjustment));

  const objectiveSatisfied = Boolean(input.evidenceSufficient) && resultQuality >= 50;
  const institutionallyAccepted = input.institutionalApprovalRequired
    ? objectiveSatisfied && Boolean(input.institutionalApproved)
    : objectiveSatisfied;

  const reason = !objectiveSatisfied
    ? 'Action was valid, but recorded evidence or quality does not yet satisfy the objective.'
    : !institutionallyAccepted
      ? 'Objective satisfied; awaiting institutional acceptance.'
      : 'Action validated, objective satisfied, and accepted.';

  return {
    actionValid: true,
    resultQuality,
    objectiveSatisfied,
    institutionallyAccepted,
    reason,
  };
}

/** Part II — Sections 19–25: NPC Decision-Making Model */
export type NpcAutonomyContext = 'routine' | 'situational' | 'supervised';

export interface NpcDecisionContext {
  npcId: string;
  role: string;
  autonomy: NpcAutonomyContext;
  /** A. Personal Context */
  personalPreferenceWeight?: number; // -10..+10
  /** B. Professional Context */
  authorizedForTask: boolean;
  withinRoleRemit: boolean;
  /** C. Situational Awareness */
  hasRequiredInformation: boolean;
  /** D. Social Context */
  trust: number;
  cooperation: number;
  /** E. Current Needs & Commitments */
  status: 'Desk' | 'In Meeting' | 'In Field' | 'On Break';
  hasOpenCommitment: boolean;
  /** F. Institutional Constraints */
  safetyCompliant: boolean;
  urgent?: boolean;
}

export interface NpcDecisionOutcome {
  decision: 'execute' | 'defer' | 'refer' | 'refuse' | 'request-approval';
  autonomyUsed: NpcAutonomyContext;
  reason: string;
}

export function evaluateNpcDecision(ctx: NpcDecisionContext): NpcDecisionOutcome {
  // Institutional safety and authorization constraints always override urgency and personal preference
  if (!ctx.safetyCompliant) {
    return {
      decision: 'refuse',
      autonomyUsed: ctx.autonomy,
      reason: 'Refused: action violates institutional safety standards.',
    };
  }
  if (!ctx.authorizedForTask) {
    return {
      decision: 'refer',
      autonomyUsed: ctx.autonomy,
      reason: 'Referred: task requires permissions or qualifications outside this employee’s authorization.',
    };
  }
  if (!ctx.hasRequiredInformation) {
    return {
      decision: 'defer',
      autonomyUsed: ctx.autonomy,
      reason: 'Deferred: employee lacks necessary situational information and requests clarification.',
    };
  }
  if (ctx.status === 'On Break' || ctx.hasOpenCommitment) {
    return {
      decision: 'defer',
      autonomyUsed: ctx.autonomy,
      reason: 'Deferred: employee has an active commitment or scheduled break.',
    };
  }
  if (ctx.autonomy === 'supervised' || !ctx.withinRoleRemit) {
    return {
      decision: 'request-approval',
      autonomyUsed: 'supervised',
      reason: 'Requires supervisory review or approval before execution.',
    };
  }
  return {
    decision: 'execute',
    autonomyUsed: ctx.urgent ? 'situational' : 'routine',
    reason: ctx.urgent
      ? 'Accepted under situational autonomy based on workplace priority and authorization.'
      : 'Accepted under routine autonomy within established responsibilities.',
  };
}

/** Part III — Sections 27–35: Five Distinct Professional Dimensions */
export interface FiveProfessionalDimensions {
  track: string;
  careerTitle: string;
  skillsSummary: { count: number; averageLevel: number };
  qualifications: { clearance: number; credentialsCount: number; employed: boolean };
  professionalExperience: { careerXp: number; completedAssignments: number };
  employmentPosition: {
    hasContract: boolean;
    jobTitle: string;
    pathway: 'specialist' | 'supervisor';
    careerDevelopmentTier: string;
  };
  institutionalReputation: { standing: number; label: string };
}

export function evaluateFiveDimensions(track: string, player: any): FiveProfessionalDimensions {
  track = canonicalCareerId(track);
  const career = ESTABLISHED_CAREERS.find(c => c.id === track) || { id: track, title: track, specialistLabel: 'Unemployed', supervisoryLabel: 'Unemployed' };
  const definition = CAREER_REGISTRY[track];
  const skillsObj = player?.skills || {};
  const skillLevels = (definition?.relevantSkills || []).filter(id => skillsObj[id]).map(id => skillsObj[id])
    .map((s: any) => (typeof s?.level === 'number' ? s.level : 1))
    .filter(n => Number.isFinite(n));
  const avgSkill = skillLevels.length
    ? Math.round((skillLevels.reduce((a, b) => a + b, 0) / skillLevels.length) * 10) / 10
    : 1;

  const contract = player?.employmentContracts?.[track];
  const pathway: 'specialist' | 'supervisor' = contract?.pathwayChoice === 'supervisor' ? 'supervisor' : 'specialist';
  const careerXp = careerXP(player, track);
  const completedCount = completedCareerAssignments(player, track).length;
  const clearance = Number(player?.clearanceLevel ?? 1);
  const credentials = new Set<string>(completedCareerAssignments(player, track).filter(id => definition?.qualificationMissionIds.includes(id)));
  for (const certificate of Array.isArray(player?.certificates) ? player.certificates : []) {
    if (certificate && typeof certificate === 'object' && canonicalCareerId(certificate.track) === track && typeof certificate.id === 'string') credentials.add(certificate.id);
  }
  const credentialsCount = credentials.size;

  // Section 31: Career development tier is distinct from active organizational job title
  const careerDevelopmentTier =
    careerXp >= 800 ? 'Established Veteran' : careerXp >= 350 ? 'Experienced Practitioner' : careerXp >= 100 ? 'Developing Practitioner' : 'Entry Practitioner';

  const standing = Math.min(100, Math.max(0, Number(player?.reputation?.[definition?.reputationKey || track] ?? 50 + Math.min(40, completedCount * 6))));
  const repLabel = standing >= 80 ? 'Highly Trusted' : standing >= 60 ? 'Respected' : standing >= 40 ? 'Established' : 'Unproven';

  return {
    track,
    careerTitle: career.title,
    skillsSummary: { count: skillLevels.length, averageLevel: avgSkill },
    qualifications: { clearance, credentialsCount, employed: Boolean(contract) },
    professionalExperience: { careerXp, completedAssignments: completedCount },
    employmentPosition: {
      hasContract: Boolean(contract),
      jobTitle: contract?.position || 'Unemployed',
      pathway,
      careerDevelopmentTier,
    },
    institutionalReputation: { standing, label: repLabel },
  };
}

/** Part IV — Sections 36–46: Compensation Models & Lifecycle */
export type CompensationModel = 'salaried' | 'hourly' | 'assignment' | 'commission' | 'bonus';
export type CompensationStage = 'performed' | 'verified' | 'earned' | 'issued';

export interface CompensationClaim {
  claimId: string;
  model: CompensationModel;
  payer: string;
  actorId: string;
  verifiedUnits?: number;
  ratePerUnit?: number;
  agreedFee?: number;
  authorizedPremiums?: number;
  verified: boolean;
  priorReceiptIds?: readonly string[];
}

export interface CompensationResolution {
  ok: boolean;
  stage: CompensationStage;
  grossCredits: number;
  duplicate: boolean;
  reason: string;
}

export function calculateCompensation(claim: CompensationClaim): CompensationResolution {
  if (claim.priorReceiptIds?.includes(claim.claimId)) {
    return {
      ok: false,
      stage: 'issued',
      grossCredits: 0,
      duplicate: true,
      reason: 'A compensation receipt already exists for this entitlement.',
    };
  }
  if (!claim.verified) {
    return {
      ok: false,
      stage: 'performed',
      grossCredits: 0,
      duplicate: false,
      reason: 'Deliverable or authorization must be verified before payment is earned.',
    };
  }

  if ([claim.authorizedPremiums, claim.verifiedUnits, claim.ratePerUnit, claim.agreedFee].some(value => value !== undefined && (!Number.isFinite(value) || value < 0))) return { ok: false, stage: 'performed', grossCredits: 0, duplicate: false, reason: 'Compensation amounts must be finite and nonnegative.' };

  const premiums = Math.max(0, Number(claim.authorizedPremiums || 0));
  let grossCredits = 0;

  if (claim.model === 'hourly') {
    const units = Math.max(0, Number(claim.verifiedUnits || 0));
    const rate = Math.max(0, Number(claim.ratePerUnit || 0));
    grossCredits = Math.round(units * rate + premiums);
  } else {
    grossCredits = Math.round(Math.max(0, Number(claim.agreedFee || 0)) + premiums);
  }

  return {
    ok: true,
    stage: 'earned',
    grossCredits,
    duplicate: false,
    reason: `Earned ${grossCredits} credits under ${claim.model} terms (${claim.payer}).`,
  };
}
