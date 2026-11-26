import careers from '../data/careers.json' with { type: 'json' };
import { WORKNET_ASSIGNMENTS } from './MissionCatalog';

/**
 * Bidirectional stable mapping between frontend short career track IDs
 * and canonical miraverse.db Careers table IDs (preserving all 9 existing
 * DB career pathways plus the reconciled Press, Publishing & PR pathway).
 */
export const FRONTEND_TO_CANONICAL_CAREER_ID: Readonly<Record<string, string>> = Object.freeze({
  archivist: 'career-archivist',
  engineer: 'career-systems-engineer',
  diplomat: 'career-diplomat',
  dga: 'career-enforcer',
  artist: 'career-artist',
  medical: 'career-healer',
  warden: 'career-ecological-warden',
  finance: 'career-finance',
  questnotice: 'career-odd-jobs',
  press: 'career-press',
});

export const CANONICAL_TO_FRONTEND_CAREER_ID: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(FRONTEND_TO_CANONICAL_CAREER_ID).map(([fe, db]) => [db, fe]))
);

const CAREER_ALIASES: Record<string, string> = {
  enforcer: 'dga',
  faithmed: 'medical',
  archives: 'archivist',
  journalism: 'press',
  publishing: 'press',
  ...CANONICAL_TO_FRONTEND_CAREER_ID,
};

/** Resolves any career alias, station ID, or canonical SQLite career-* ID to the stable frontend track ID. */
export const canonicalCareerId = (id: string): string =>
  Object.hasOwn(CAREER_ALIASES, id) ? CAREER_ALIASES[id] : id;

/** Maps any frontend track ID or alias to its authoritative miraverse.db Careers.id (`career-*`). */
export const toDatabaseCareerId = (id: string): string => {
  const shortId = canonicalCareerId(id);
  return Object.hasOwn(FRONTEND_TO_CANONICAL_CAREER_ID, shortId)
    ? FRONTEND_TO_CANONICAL_CAREER_ID[shortId]
    : id;
};

/** Maps a miraverse.db Careers.id (`career-*`) back to its frontend short track ID. */
export const fromDatabaseCareerId = (id: string): string => canonicalCareerId(id);

export type CareerDefinition = (typeof careers)[number] & { canonicalId: string };

const enrichedCareers: CareerDefinition[] = careers.map(c => ({
  ...c,
  canonicalId: toDatabaseCareerId(c.id),
}));

export const CAREER_REGISTRY: Record<string, CareerDefinition> = Object.assign(
  Object.create(null),
  Object.fromEntries(enrichedCareers.map(c => [c.id, c]))
);
export const CAREER_CATALOG: CareerDefinition[] = Object.values(CAREER_REGISTRY);
export const careerStation = (track: string): string => CAREER_REGISTRY[canonicalCareerId(track)]?.stationId || track;
export const stationCareer = (station: string): string => canonicalCareerId(station);

/**
 * Hydrates progression metadata from authoritative /api/canonical/careers when online,
 * merging into CAREER_REGISTRY without resetting any existing player career XP or contracts.
 */
export async function syncCareersFromCanonicalBackend(): Promise<CareerDefinition[]> {
  if (typeof fetch !== 'function' || typeof window === 'undefined' || !/^https?:$/i.test(window.location?.protocol || '')) {
    return CAREER_CATALOG;
  }
  try {
    const res = await fetch('/api/canonical/careers', { cache: 'no-store' });
    if (!res.ok) return CAREER_CATALOG;
    const payload = await res.json();
    if (!Array.isArray(payload.careers)) return CAREER_CATALOG;
    for (const remote of payload.careers) {
      const shortId = canonicalCareerId(remote.frontendId || remote.id || remote.canonicalId || '');
      if (!shortId || !CAREER_REGISTRY[shortId]) continue;
      CAREER_REGISTRY[shortId] = {
        ...CAREER_REGISTRY[shortId],
        canonicalId: remote.canonicalId || CAREER_REGISTRY[shortId].canonicalId,
        name: remote.name || CAREER_REGISTRY[shortId].name,
        category: remote.category || CAREER_REGISTRY[shortId].category,
        baseSalaryCredits: Number.isFinite(remote.baseSalaryCredits)
          ? remote.baseSalaryCredits
          : CAREER_REGISTRY[shortId].baseSalaryCredits,
        stationId: remote.stationId || CAREER_REGISTRY[shortId].stationId,
        tierTitles: Array.isArray(remote.tierTitles) && remote.tierTitles.length ? remote.tierTitles : CAREER_REGISTRY[shortId].tierTitles,
        relevantSkills: Array.isArray(remote.relevantSkills) && remote.relevantSkills.length ? remote.relevantSkills : CAREER_REGISTRY[shortId].relevantSkills,
        xpThresholds: Array.isArray(remote.xpThresholds) && remote.xpThresholds.length ? remote.xpThresholds : CAREER_REGISTRY[shortId].xpThresholds,
        duties: Array.isArray(remote.duties) && remote.duties.length ? remote.duties : CAREER_REGISTRY[shortId].duties,
      };
    }
    CAREER_CATALOG.splice(0, CAREER_CATALOG.length, ...Object.values(CAREER_REGISTRY));
  } catch {
    // Offline fallback retains bundled reconciled definitions
  }
  return CAREER_CATALOG;
}

export function careerXP(player: any, track: string): number {
  const shortTrack = canonicalCareerId(track);
  const dbTrack = toDatabaseCareerId(shortTrack);
  const value =
    player?.careers?.[shortTrack]?.xp ??
    player?.careers?.[dbTrack]?.xp ??
    player?.careerTrackXp?.[shortTrack] ??
    player?.careerTrackXp?.[dbTrack] ??
    0;
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function completedCareerAssignments(player: any, track: string): string[] {
  const shortTrack = canonicalCareerId(track);
  return [...new Set<string>(Array.isArray(player?.completedWorknetMissionIds) ? player.completedWorknetMissionIds : [])]
    .filter(id => canonicalCareerId(WORKNET_ASSIGNMENTS[id]?.track || '') === shortTrack);
}

/** Existing signed pay terms survive catalog changes. */
export function contractSalary(contract: any, track: string): number {
  const amount = contract?.baseSalaryCredits;
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : CAREER_REGISTRY[canonicalCareerId(track)]?.baseSalaryCredits ?? 0;
}
