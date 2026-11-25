// Player -> Living World bridge for WORKNET completions.
// Player state stays authoritative; this only records the completed work in the
// linked run (event + optional employment) and never invents player rewards.

import {
  addEvent,
  assignCareer,
  enqueue,
  getRun,
  listCareers,
  type LivingWorldLink,
  type RunCareer,
} from './livingWorldLink';

export interface WorknetCompletionInput {
  missionId: string;
  track: string;
  orderId: string;
  subject: string;
  evaluation: number;
  credits: number;
  xp: number;
  institution: string;
  position: string;
}

/** Pure payload builder so the event shape is testable without the network. */
export function buildWorknetEvent(input: WorknetCompletionInput): {
  kind: string;
  title: string;
  description: string;
} {
  return {
    kind: 'worknet',
    title: `WORKNET ${input.orderId}`,
    description: `${input.subject} accepted (evaluation ${input.evaluation}/100). `
      + `+${input.credits} credits, +${input.xp} career XP via ${input.institution}.`,
  };
}

/** Pure predicate: only assign employment when the citizen has no career yet. */
export function shouldAssignCareer(careers: RunCareer[], characterId: string): boolean {
  return !careers.some((career) => career.characterId === characterId);
}

/**
 * Record a completed WORKNET assignment in the linked run. Idempotency comes from
 * the store's one-time completion receipt; the event title is unique per order.
 */
export async function recordWorknetCompletion(
  link: LivingWorldLink | null,
  input: WorknetCompletionInput,
): Promise<void> {
  if (!link) return;
  await enqueue(async () => {
    const snapshot = await getRun(link.runId);
    await addEvent(link.runId, { ...buildWorknetEvent(input), expectedRevision: snapshot.run.revision });

    const careers = await listCareers(link.runId);
    if (!shouldAssignCareer(careers.careers, link.characterId)) return;

    const fresh = await getRun(link.runId);
    await assignCareer(link.runId, {
      characterId: link.characterId,
      title: input.position || input.track,
      employer: input.institution,
      salary: 0,
      schedule: 'flexible',
      expectedRevision: fresh.run.revision,
    });
  });
}