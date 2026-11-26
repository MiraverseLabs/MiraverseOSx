import missions from '../data/missions.json' with { type: 'json' };
import broadStreet from '../data/broad-street-assignment.json' with { type: 'json' };
import type { WorknetMission } from '../types';

export type MissionActivityScope = 'shift' | 'investigation' | 'certification' | 'field_operation' | 'gig' | 'task';

export type CanonicalWorknetMission = WorknetMission & {
  careerId?: string;
  activityScope?: MissionActivityScope;
  objectives?: string[];
  prerequisites?: string[];
  evidenceRequirements?: string[];
};

const WORKNET_TYPE_TO_SCOPE: Record<string, MissionActivityScope> = {
  'Work Shifts': 'shift',
  'Special Assignments': 'investigation',
  'Career Development': 'certification',
  'Field Operations': 'field_operation',
  QUESTNOTICE: 'gig',
};

const TRACK_TO_CAREER_ID: Record<string, string> = {
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
};

function enrichMission(raw: any): CanonicalWorknetMission {
  return {
    ...raw,
    careerId: raw.careerId || TRACK_TO_CAREER_ID[raw.track] || undefined,
    activityScope: raw.activityScope || WORKNET_TYPE_TO_SCOPE[raw.type] || 'task',
    objectives: Array.isArray(raw.objectives) && raw.objectives.length
      ? raw.objectives
      : raw.requiredAction
      ? [raw.requiredAction]
      : [],
  };
}

/** Authored metadata and compensation reconciled with miraverse.db Missions + MissionCatalogMeta. */
export const MISSION_CATALOG: CanonicalWorknetMission[] = [...missions, broadStreet].map(enrichMission);
export const WORKNET_ASSIGNMENTS: Record<string, CanonicalWorknetMission> = Object.fromEntries(
  MISSION_CATALOG.map(m => [m.id, m])
);

/**
 * Hydrates authored mission catalog from authoritative /api/canonical/missions when connected,
 * preserving completion state and avoiding any secondary mission engine.
 */
export async function syncMissionsFromCanonicalBackend(): Promise<CanonicalWorknetMission[]> {
  if (typeof fetch !== 'function' || typeof window === 'undefined' || !/^https?:$/i.test(window.location?.protocol || '')) {
    return MISSION_CATALOG;
  }
  try {
    const res = await fetch('/api/canonical/missions', { cache: 'no-store' });
    if (!res.ok) return MISSION_CATALOG;
    const payload = await res.json();
    if (!Array.isArray(payload.missions) || payload.missions.length === 0) return MISSION_CATALOG;
    for (const remote of payload.missions) {
      if (!remote?.id) continue;
      const merged = enrichMission({ ...(WORKNET_ASSIGNMENTS[remote.id] || {}), ...remote });
      WORKNET_ASSIGNMENTS[remote.id] = merged;
    }
    MISSION_CATALOG.splice(0, MISSION_CATALOG.length, ...Object.values(WORKNET_ASSIGNMENTS));
  } catch {
    // Offline fallback retains bundled reconciled definitions
  }
  return MISSION_CATALOG;
}
