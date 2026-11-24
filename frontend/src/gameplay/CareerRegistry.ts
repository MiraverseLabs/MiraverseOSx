import careers from '../data/careers.json' with { type: 'json' };
import { WORKNET_ASSIGNMENTS } from './MissionCatalog';

const CAREER_ALIASES: Record<string, string> = { enforcer: 'dga', faithmed: 'medical', archives: 'archivist' };
export const canonicalCareerId = (id: string): string => Object.hasOwn(CAREER_ALIASES, id) ? CAREER_ALIASES[id] : id;
export const CAREER_REGISTRY: Record<string, (typeof careers)[number]> = Object.assign(Object.create(null), Object.fromEntries(careers.map(c => [c.id, c])));
export const CAREER_CATALOG = Object.values(CAREER_REGISTRY);
export const careerStation = (track: string): string => CAREER_REGISTRY[canonicalCareerId(track)]?.stationId || track;
export const stationCareer = (station: string): string => canonicalCareerId(station);

export function careerXP(player: any, track: string): number {
  track = canonicalCareerId(track);
  const value = player?.careers?.[track]?.xp ?? player?.careerTrackXp?.[track] ?? 0;
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function completedCareerAssignments(player: any, track: string): string[] {
  return [...new Set<string>(Array.isArray(player?.completedWorknetMissionIds) ? player.completedWorknetMissionIds : [])]
    .filter(id => WORKNET_ASSIGNMENTS[id]?.track === canonicalCareerId(track));
}

/** Existing signed pay terms survive catalog changes. */
export function contractSalary(contract: any, track: string): number {
  const amount = contract?.baseSalaryCredits;
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : CAREER_REGISTRY[canonicalCareerId(track)]?.baseSalaryCredits ?? 0;
}

