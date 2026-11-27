// Player <-> Living World synchronization.
// Ownership: player credits/time are authoritative for the player; the linked
// simulation citizen's balance is a one-way projection and WorldClock is the
// authoritative world clock. No link => no synchronization.

export const SEGMENT_MINUTES = 360;
export const SEGMENTS_PER_CYCLE = 4;
const BASE = '/api/livingworld';

export interface LivingWorldRun {
  RunId: string;
  Name: string;
  UpdatedAt: string;
  Revision: number;
  Status: string;
}

export interface RunClock {
  elapsed_minutes: number;
  step_minutes: number;
  tick_count: number;
}

export interface LivingWorldLink {
  runId: string;
  characterId: string;
  canonicalPersonId: string | null;
  displayName: string;
  creditMirrorRevision: number;
}

export interface RunEnvelope {
  run_id: string;
  name: string;
  revision: number;
  calendar: Record<string, unknown>;
  state: { citizens?: Record<string, any> } & Record<string, any>;
}

export interface RunSnapshot {
  run: RunEnvelope;
  clock: RunClock;
  date: string;
  transactions: any[];
}

export interface RunCitizen {
  characterId: string;
  name: string;
  balance?: number;
}

function stepMinutes(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

/** Convert a whole number of player time segments into simulation steps. */
export function segmentsToSteps(step: number, segments: number): number {
  const minutes = stepMinutes(step);
  const steps = Math.round((SEGMENT_MINUTES * Math.max(0, segments)) / minutes);
  return Math.max(1, Math.min(1440, steps));
}

/** Convert simulation steps back into player time segments. */
export function stepsToSegments(step: number, steps: number): number {
  const minutes = stepMinutes(step);
  return Math.max(0, Math.round((Math.max(0, steps) * minutes) / SEGMENT_MINUTES));
}

/** Stable, idempotent request id for a credit mirror attempt. */
export function creditMirrorRequestId(link: LivingWorldLink, cycle: number): string {
  return `player-mirror:${link.runId}:${link.characterId}:${cycle}:${link.creditMirrorRevision}`;
}

export interface ReconciledLink {
  timeCycleCount: number;
  timeSegmentIndex: number;
  creditBaseline: number | null;
}

/**
 * Reconcile player time and the credit baseline from an authoritative run.
 * The run clock is authoritative for elapsed world time; the player's linked
 * citizen balance is only used to seed the one-way credit projection.
 */
export function reconcileLink(
  link: LivingWorldLink,
  clock: RunClock,
  citizenBalance: number | null | undefined,
): ReconciledLink {
  const totalSegments = Math.max(0, Math.round(clock.elapsed_minutes / SEGMENT_MINUTES));
  const timeCycleCount = Math.floor(totalSegments / SEGMENTS_PER_CYCLE);
  const timeSegmentIndex = totalSegments % SEGMENTS_PER_CYCLE;
  const creditBaseline = typeof citizenBalance === 'number' && Number.isFinite(citizenBalance)
    ? citizenBalance
    : null;
  return { timeCycleCount, timeSegmentIndex, creditBaseline };
}

async function call<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Living World request failed (${response.status}).`);
  }
  return data as T;
}

export async function listRuns(): Promise<LivingWorldRun[]> {
  const data = await call<{ runs?: LivingWorldRun[] }>('/runs');
  return Array.isArray(data.runs) ? data.runs : [];
}

export async function getRun(runId: string): Promise<RunSnapshot> {
  return call<RunSnapshot>(`/runs/${encodeURIComponent(runId)}`);
}

export async function advanceRun(
  runId: string,
  steps: number,
  expectedRevision?: number,
): Promise<{ runId: string; revision: number; clock: RunClock; date: string }> {
  return call(`/runs/${encodeURIComponent(runId)}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      steps: Math.max(1, Math.min(1440, Math.round(steps))),
      ...(typeof expectedRevision === 'number' ? { expectedRevision } : {}),
    }),
  });
}

export async function transact(
  runId: string,
  body: {
    characterId: string;
    kind: string;
    amount: number;
    description?: string;
    requestId?: string;
    expectedRevision?: number;
  },
): Promise<{ alreadyApplied?: boolean; transaction_id?: string }> {
  return call('/finances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function listSchedules(runId: string): Promise<{ schedules: RunCitizen[] }> {
  return call(`/schedules?runId=${encodeURIComponent(runId)}`);
}

export interface RunCareer {
  characterId: string;
  title?: string;
  employer?: string;
  [key: string]: unknown;
}

export async function listCareers(runId: string): Promise<{ careers: RunCareer[] }> {
  return call(`/careers?runId=${encodeURIComponent(runId)}`);
}

export async function addEvent(
  runId: string,
  body: { kind?: string; title: string; description?: string; expectedRevision?: number },
): Promise<{ revision?: number }> {
  return call('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function assignCareer(
  runId: string,
  body: {
    characterId: string;
    title: string;
    employer?: string;
    salary?: number;
    schedule?: string;
    expectedRevision?: number;
  },
): Promise<{ revision?: number }> {
  return call('/careers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

/** Resolve the run to synchronize against: the linked run, else the most recent. */
export async function resolveActiveRun(link: LivingWorldLink | null): Promise<string | null> {
  if (link?.runId) return link.runId;
  const runs = await listRuns();
  return runs.length > 0 ? runs[0].RunId : null;
}

// Serialize synchronization work so time and money updates never race.
let queue: Promise<void> = Promise.resolve();
export function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.then(task).catch((): void => undefined);
  return queue;
}

/** Advance a run with one reload-and-retry on a revision conflict. */
export async function advanceWithRetry(
  runId: string,
  steps: number,
  expectedRevision?: number,
): Promise<void> {
  try {
    await advanceRun(runId, steps, expectedRevision);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/changed|conflict|revision/i.test(message)) throw error;
    const snapshot = await getRun(runId);
    await advanceRun(runId, steps, snapshot.run.revision);
  }
}

/** Find the linked citizen's balance in a run snapshot. */
export function citizenBalance(snapshot: RunSnapshot, characterId: string): number | null {
  const citizen = snapshot.run.state?.citizens?.[characterId];
  const balance = citizen?.balance;
  return typeof balance === 'number' && Number.isFinite(balance) ? balance : null;
}

/** List citizens in a run for the link picker. */
export function runCitizens(snapshot: RunSnapshot): RunCitizen[] {
  const citizens = snapshot.run.state?.citizens ?? {};
  return Object.entries(citizens).map(([characterId, value]: [string, any]) => ({
    characterId,
    name: typeof value?.name === 'string' ? value.name : characterId,
    balance: typeof value?.balance === 'number' ? value.balance : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Entertainment & Celebrity Ecosystem Synchronization API
// ---------------------------------------------------------------------------

export async function getEntertainmentSnapshot(runId: string): Promise<any> {
  return call(`/entertainment?runId=${encodeURIComponent(runId)}`);
}

export async function getFameProfile(runId: string, artistOrCharacterId?: string): Promise<any> {
  const qs = new URLSearchParams({ runId });
  if (artistOrCharacterId) qs.set('artistId', artistOrCharacterId);
  return call(`/fame?${qs.toString()}`);
}

export async function upsertRunArtist(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/artists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function addRunTrack(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function scheduleRunRelease(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function scheduleRunConcert(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/concerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function submitRunAudition(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/auditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function manageRunContract(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function manageRunProduction(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/productions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function purchaseRunTicket(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function postRunPublicity(
  runId: string,
  body: Record<string, unknown>,
): Promise<{ result: any; revision: number }> {
  return call('/publicity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

// ---------------------------------------------------------------------------
// Intelligence, Institutions, Scheduling & Official Document Generation API
// ---------------------------------------------------------------------------

export async function getSimulationNetwork(runId: string, mutual?: [string, string]): Promise<{ runId: string; network: any }> {
  const qs = new URLSearchParams({ runId });
  if (mutual) {
    qs.set('a', mutual[0]);
    qs.set('b', mutual[1]);
  }
  return call(`/network?${qs.toString()}`);
}

export async function getCitizenRecommendations(runId: string, characterId: string): Promise<{ runId: string; recommendations: any }> {
  const qs = new URLSearchParams({ runId, characterId });
  return call(`/recommendations?${qs.toString()}`);
}

export async function getSimulationDiagnostics(runId: string): Promise<any> {
  return call(`/diagnostics?runId=${encodeURIComponent(runId)}`);
}

export async function listInstitutionalWorkflows(runId: string): Promise<{ runId: string; workflows: any[] }> {
  return call(`/workflows?runId=${encodeURIComponent(runId)}`);
}

export async function transitionInstitutionalWorkflow(
  runId: string,
  body: {
    workflowId?: string;
    domain: 'career' | 'application' | 'mission' | 'contract' | 'request' | 'production';
    trigger?: string;
    subjectId?: string;
    institution?: string;
    title?: string;
    actorId?: string;
  },
): Promise<{ result: any; revision: number }> {
  return call('/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function optimizeInstitutionalSchedule(
  runId: string,
  body: {
    institution: string;
    staffIds: string[];
    slots: { slotId: string; label?: string; day?: number; period?: string; requiredStaff?: number }[];
    unavailable?: Record<string, string[]>;
    maxSlotsPerStaff?: number;
  },
): Promise<{ result: any; revision: number }> {
  return call('/schedule/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function spawnProceduralCitizens(
  runId: string,
  body: { count?: number; realm?: string; seed?: number },
): Promise<{ created: any[]; totalProcedural: number; revision: number }> {
  return call('/citizens/procedural', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}

export async function generateOfficialDocument(
  runId: string,
  body: {
    docType: 'employment_contract' | 'institutional_report' | 'official_correspondence' | 'government_record' | 'case_documentation' | 'financial_statement' | 'certificate';
    title: string;
    institution: string;
    recipientName: string;
    recipientId?: string;
    bodyLines?: string[];
    tableRows?: string[][];
  },
): Promise<{ document: { documentId: string; filename: string; pdfBase64: string; sizeBytes: number; fyloMetadata: any }; revision: number }> {
  return call('/documents/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
}
