/** Saved, explicitly released public copy. Private narrative logs are never a news feed. */
export interface PublicWorkStory {
  id: string;
  sourceEventId: string;
  sourceRef: { kind: 'work-order'; id: string; definitionId: 'ms-shift-04' };
  occurredAtTick: number;
  cycle: number;
  headline: string;
  summary: string;
  body: string[];
  assetId: string;
}
export interface WorldPublications {
  version: 1;
  stories: PublicWorkStory[];
  reactionReceipts: Record<string, { status: 'delivered' | 'skipped'; tick: number; actorId?: string }>;
}
export const publicationId = (orderId: string) => `glassline-service:${orderId}`;

export function restoreWorldPublications(raw: any): WorldPublications {
  const stories: PublicWorkStory[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(raw?.stories) ? raw.stories : []) {
    if (s?.sourceRef?.kind !== 'work-order' || s.sourceRef.definitionId !== 'ms-shift-04' ||
      typeof s.sourceRef.id !== 'string' || !s.sourceRef.id.startsWith('WORK:ms-shift-04:') ||
      s.id !== publicationId(s.sourceRef.id) || seen.has(s.id) ||
      s.sourceEventId !== `PUBLIC:${s.sourceRef.id}` || !Number.isSafeInteger(s.occurredAtTick) || s.occurredAtTick < 0 ||
      !Number.isSafeInteger(s.cycle) || s.cycle < 0 ||
      ![s.headline, s.summary, s.assetId].every(v => typeof v === 'string' && v.length > 0 && v.length < 2000) ||
      !Array.isArray(s.body) || !s.body.length || s.body.length > 10 || !s.body.every((v: any) => typeof v === 'string' && v.length < 10000)) continue;
    seen.add(s.id);
    stories.push({ id: s.id, sourceEventId: s.sourceEventId, sourceRef: { kind: 'work-order', id: s.sourceRef.id, definitionId: 'ms-shift-04' },
      occurredAtTick: s.occurredAtTick, cycle: s.cycle, headline: s.headline, summary: s.summary, body: [...s.body], assetId: s.assetId });
  }
  const reactionReceipts: WorldPublications['reactionReceipts'] = {};
  for (const s of stories) {
    const r = raw?.reactionReceipts?.[s.id];
    if (r && ['delivered', 'skipped'].includes(r.status) && Number.isSafeInteger(r.tick) && r.tick > s.occurredAtTick &&
      (r.status === 'skipped' || r.actorId === 'char-jeremie-belpois')) {
      reactionReceipts[s.id] = { status: r.status, tick: r.tick, ...(r.status === 'delivered' ? { actorId: r.actorId } : {}) };
    }
  }
  return { version: 1, stories, reactionReceipts };
}

/** The only authorized release template in this pilot; no interpolation of procedure text. */
export function glasslineRelease(orderId: string, tick: number, cycle: number): PublicWorkStory {
  return {
    id: publicationId(orderId), sourceEventId: `PUBLIC:${orderId}`,
    sourceRef: { kind: 'work-order', id: orderId, definitionId: 'ms-shift-04' }, occurredAtTick: tick, cycle,
    headline: 'Glassline relay maintenance accepted after verification',
    summary: 'WORKNET has accepted a completed Glassline relay repair following its required verification checks.',
    body: [
      'A Glassline relay maintenance order has completed its required inspection, repair, verification and reporting stages. WORKNET has accepted the completed work.',
      'This service update confirms acceptance of this maintenance order. It does not establish the cause of other signal incidents or certify the condition of the entire network.',
      'Residents can consult Field Bulletins for public service updates. Private procedure records and personnel information remain with the responsible institution.',
    ], assetId: 'canon:place-transit-junction',
  };
}
