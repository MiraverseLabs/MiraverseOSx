export const SEGMENTS_PER_CYCLE = 4;
export const worldWorkTick = (game: any): number => Math.max(0, Math.floor(
  (Number.isFinite(game?.timeCycleCount) ? game.timeCycleCount : 0) * SEGMENTS_PER_CYCLE +
  (Number.isFinite(game?.timeSegmentIndex) ? game.timeSegmentIndex : 0)));
export const workOrderId = (missionId: string, cycle: number, repeatable: boolean) => `WORK:${missionId}:${repeatable ? cycle : 'once'}`;

/** Availability is shared by delegation and background work; urgent work cannot double-book an actor. */
export function actorHasCommitment(state: any, actorId: string): boolean {
  return Boolean(state?.delegatedTasks?.some((d: any) => d.assigneeId === actorId && d.status !== 'Approved'));
}

export function actorStatus(initial: string, originTick: number, tick: number, actorId: string, state: any): 'Desk' | 'In Meeting' | 'In Field' | 'On Break' {
  if (state?.subordinateLeaves?.some((l: any) => l.subordinateId === actorId && l.status === 'Approved' && tick < l.untilTick)) return 'On Break';
  const statuses = ['Desk', 'In Meeting', 'In Field', 'On Break'] as const;
  return statuses[(Math.max(0, statuses.indexOf(initial as typeof statuses[number])) + Math.max(0, tick - originTick)) % SEGMENTS_PER_CYCLE];
}
