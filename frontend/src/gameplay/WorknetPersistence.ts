import { CAREER_REGISTRY, canonicalCareerId } from './CareerRegistry';

/** Idempotent migration: retain outputs and receipts, merge alias progress by maximum, never add duplicate XP. */
export function restoreWorknetPlayer(player: any, tick = 0): any {
  const careers: Record<string, any> = { ...player.careers };
  for (const [rawTrack, record] of Object.entries(player.careers || {}) as [string, any][]) {
    const track = canonicalCareerId(rawTrack);
    const current = careers[track] || {};
    const rankIndex = Math.max(0, Math.min(5, Math.max(current.rankIndex || 0, record?.rankIndex || 0)));
    careers[track] = { ...record, ...current, rankIndex, xp: Math.max(0, current.xp || 0, record?.xp || 0), title: CAREER_REGISTRY[track]?.tierTitles[rankIndex] || record?.title || track };
    if (track !== rawTrack) delete careers[rawTrack];
  }
  for (const [rawTrack, xp] of Object.entries(player.careerTrackXp || {})) {
    const track = canonicalCareerId(rawTrack);
    if (!Number.isFinite(xp)) continue;
    careers[track] = { rankIndex: 0, title: CAREER_REGISTRY[track]?.tierTitles[0] || track, ...careers[track], xp: Math.max(careers[track]?.xp || 0, xp as number) };
  }
  const employmentContracts: Record<string, any> = {};
  for (const [rawTrack, value] of Object.entries(player.employmentContracts || {}) as [string, any][]) {
    if (!value || typeof value !== 'object') continue;
    const track = canonicalCareerId(rawTrack);
    const prior = employmentContracts[track];
    employmentContracts[track] = {
      ...value, ...prior, track, id: `EMP:${track}`,
      // Saves created before structured terms used the 150-credit contract policy.
      baseSalaryCredits: prior?.baseSalaryCredits ?? value.baseSalaryCredits ?? 150,
      signedAtTick: prior?.signedAtTick ?? value.signedAtTick ?? tick,
      lastStipendClaimedCycle: Math.max(prior?.lastStipendClaimedCycle ?? -1, value.lastStipendClaimedCycle ?? -1),
    };
  }
  const rewardedWorkOrderIds = [...new Set<string>((Array.isArray(player.rewardedWorkOrderIds) ? player.rewardedWorkOrderIds : []).filter(id => typeof id === 'string'))];
  const compensationReceiptIds = [...new Set<string>([...(Array.isArray(player.compensationReceiptIds) ? player.compensationReceiptIds.filter(id => typeof id === 'string') : []), ...rewardedWorkOrderIds, ...Object.entries(employmentContracts).filter(([, c]) => c.lastStipendClaimedCycle >= 0).map(([track, c]) => `SALARY:${track}:${c.lastStipendClaimedCycle}`)])];
  const { careerTrackXp: _legacyXp, ...retained } = player;
  const workplace = player.worknetWorkplace ?? player.workplace;
  return { ...retained, compensationReceiptIds, careers, employmentContracts, rewardedWorkOrderIds,
    ...(workplace === undefined ? {} : { worknetWorkplace: workplace }), worknetDataVersion: 2 };
}
