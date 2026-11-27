/**
 * Shared frontend client for authoritative backend canonical APIs (/api/canonical/*).
 * Falls back cleanly to reconciled static snapshots when the local backend is unavailable
 * (e.g., offline static preview or Node unit tests), and broadcasts cache invalidation
 * events whenever authoritative records change.
 */
import {
  CHARACTER_IDENTITIES,
  RETIRED_CHARACTERS,
  type CharacterIdentity,
  type RetiredCharacterRecord,
} from '../game-content/characters/registry';
import { CAREER_CATALOG } from '../gameplay/CareerRegistry';
import { MISSION_CATALOG } from '../gameplay/MissionCatalog';
import { WORLD_ORGANIZATIONS } from '../game-content/worldAssetLibrary';

export interface CanonicalCharacterRecord {
  characterId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  occupation: string | null;
  homeRealm: string | null;
  kind: string;
  status: string;
  maid: string | null;
  folder?: string;
  profileCount?: number;
  notes: string[];
  aliases: string[];
  legacyIds: string[];
}

export interface CanonicalMaidEntry {
  maid: string;
  regionCode: string;
  serialNumber: number;
  characterId: string | null;
  characterName: string | null;
  homeRealm: string | null;
  status: 'active' | 'retired' | 'reserved';
  issuedAt: string;
  retiredAt: string | null;
  notes: string | null;
}

export interface CanonicalMaidCatalog {
  authorizedRegions: string[];
  entries: CanonicalMaidEntry[];
  retiredSerials: { serialNumber: number; serialPadded: string; maid: string | null; reason: string }[];
  sequences: Record<string, number>;
}

export interface CanonicalCareerRecord {
  canonicalId: string;
  id: string;
  frontendId: string | null;
  name: string;
  archetype: string;
  category: string;
  description: string;
  primaryStat: string;
  primaryAttribute: string;
  baseSalaryCredits: number;
  stationId: string;
  reputationKey: string;
  specialistLabel: string;
  supervisoryLabel: string;
  requirements: string;
  gameplayConnections: string;
  primaryWorkplaces: string[];
  duties: string[];
  tierTitles: string[];
  relevantSkills: string[];
  xpThresholds: number[];
  qualificationMissionIds: string[];
}

export interface CanonicalMissionRecord {
  id: string;
  title: string;
  type: string;
  tier?: string;
  difficulty?: string;
  description: string;
  objectives?: string[];
  rewardXP: number;
  rewardCredits: number;
  rewardBits: number;
  track: string;
  careerId?: string | null;
  worknetCategory?: string;
  activityScope?: string;
  department: string;
  location: string;
  workplace: string;
  severity: string;
  targetSubject?: string;
  threatOrSymptom?: string;
  requiredAction?: string;
  primaryAttribute?: string;
  permittedTools: string[];
  prerequisites?: string[];
  evidenceRequirements?: string[];
  status?: string;
}

export const CANONICAL_UPDATE_EVENT = 'miraverse:canonical-data-updated';

type CacheBucket<T> = { data: T; fetchedAt: number; fromBackend: boolean };

let charactersCache: CacheBucket<{ characters: CanonicalCharacterRecord[]; retiredCharacters: RetiredCharacterRecord[] }> | null = null;
let careersCache: CacheBucket<CanonicalCareerRecord[]> | null = null;
let missionsCache: CacheBucket<CanonicalMissionRecord[]> | null = null;
let organizationsCache: CacheBucket<{ entertainmentOrganizations: any[]; worldOrganizations: any[] }> | null = null;
let maidsCache: CacheBucket<CanonicalMaidCatalog> | null = null;

const CACHE_TTL_MS = 30_000;

function isFresh<T>(bucket: CacheBucket<T> | null): bucket is CacheBucket<T> {
  return Boolean(bucket && Date.now() - bucket.fetchedAt < CACHE_TTL_MS);
}

function canUseBackendFetch(): boolean {
  return typeof fetch === 'function' && typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || '');
}

export function invalidateCanonicalCaches(scope: 'all' | 'characters' | 'maids' | 'careers' | 'missions' | 'organizations' = 'all'): void {
  if (scope === 'all' || scope === 'characters') charactersCache = null;
  if (scope === 'all' || scope === 'maids') maidsCache = null;
  if (scope === 'all' || scope === 'careers') careersCache = null;
  if (scope === 'all' || scope === 'missions') missionsCache = null;
  if (scope === 'all' || scope === 'organizations') organizationsCache = null;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(CANONICAL_UPDATE_EVENT, { detail: { scope, timestamp: Date.now() } }));
  }
}

function staticCharactersFallback(): { characters: CanonicalCharacterRecord[]; retiredCharacters: RetiredCharacterRecord[] } {
  return {
    characters: CHARACTER_IDENTITIES.map((c: CharacterIdentity) => ({
      characterId: c.id,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      title: c.title,
      occupation: c.occupation,
      homeRealm: c.homeRealm,
      kind: c.kind,
      status: c.status,
      maid: c.maid,
      notes: [...c.notes],
      aliases: [...c.aliases],
      legacyIds: [...c.legacyIds],
    })),
    retiredCharacters: [...RETIRED_CHARACTERS],
  };
}

export async function fetchCanonicalCharacters(forceRefresh = false): Promise<{
  characters: CanonicalCharacterRecord[];
  retiredCharacters: RetiredCharacterRecord[];
  fromBackend: boolean;
}> {
  if (!forceRefresh && isFresh(charactersCache)) {
    return { ...charactersCache.data, fromBackend: charactersCache.fromBackend };
  }
  if (canUseBackendFetch()) {
    try {
      const res = await fetch('/api/canonical/characters', { cache: 'no-store' });
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.characters) && payload.characters.length > 0) {
          const data = {
            characters: payload.characters as CanonicalCharacterRecord[],
            retiredCharacters: (payload.retiredCharacters || RETIRED_CHARACTERS) as RetiredCharacterRecord[],
          };
          charactersCache = { data, fetchedAt: Date.now(), fromBackend: true };
          return { ...data, fromBackend: true };
        }
      }
    } catch {
      // Offline / dev fallback
    }
  }
  const fallback = staticCharactersFallback();
  charactersCache = { data: fallback, fetchedAt: Date.now(), fromBackend: false };
  return { ...fallback, fromBackend: false };
}

export async function updateCanonicalCharacter(
  characterId: string,
  updates: Partial<Pick<CanonicalCharacterRecord, 'name' | 'firstName' | 'lastName' | 'title' | 'occupation' | 'homeRealm' | 'aliases'>>
): Promise<{ ok: boolean; character?: CanonicalCharacterRecord; error?: string }> {
  if (!canUseBackendFetch()) {
    return { ok: false, error: 'Canonical backend API is unavailable in offline mode.' };
  }
  try {
    const res = await fetch(`/api/canonical/characters/${encodeURIComponent(characterId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body.error || `HTTP ${res.status}` };
    }
    invalidateCanonicalCaches('characters');
    return { ok: true, character: body as CanonicalCharacterRecord };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error updating canonical character.' };
  }
}

export async function fetchCanonicalMaids(forceRefresh = false): Promise<{ catalog: CanonicalMaidCatalog; fromBackend: boolean }> {
  if (!forceRefresh && isFresh(maidsCache)) {
    return { catalog: maidsCache.data, fromBackend: maidsCache.fromBackend };
  }
  if (canUseBackendFetch()) {
    try {
      const res = await fetch('/api/canonical/maids', { cache: 'no-store' });
      if (res.ok) {
        const catalog = (await res.json()) as CanonicalMaidCatalog;
        maidsCache = { data: catalog, fetchedAt: Date.now(), fromBackend: true };
        return { catalog, fromBackend: true };
      }
    } catch {
      // fallback
    }
  }
  const entries: CanonicalMaidEntry[] = CHARACTER_IDENTITIES.filter(c => c.maid).map((c): CanonicalMaidEntry => {
    const m = c.maid!.match(/^MAID-([A-Z]{2})-(\d{8})$/);
    return {
      maid: c.maid!,
      regionCode: m ? m[1] : 'OR',
      serialNumber: m ? parseInt(m[2], 10) : 0,
      characterId: c.id,
      characterName: c.name,
      homeRealm: c.homeRealm,
      status: 'active',
      issuedAt: '',
      retiredAt: null,
      notes: null,
    };
  });
  const fallback: CanonicalMaidCatalog = {
    authorizedRegions: ['OR', 'FR', 'LU', 'MA', 'BR', 'KA', 'NE', 'VR'],
    entries,
    retiredSerials: [
      { serialNumber: 481926, serialPadded: '00481926', maid: 'MAID-OR-00481926', reason: 'Retired canonical serial' },
      { serialNumber: 481927, serialPadded: '00481927', maid: 'MAID-OR-00481927', reason: 'Retired canonical serial' },
      { serialNumber: 481928, serialPadded: '00481928', maid: 'MAID-OR-00481928', reason: 'Retired canonical serial' },
    ],
    sequences: { OR: 481982, FR: 481982, LU: 481982, MA: 481982, BR: 481982, KA: 481982, NE: 481982, VR: 481982 },
  };
  maidsCache = { data: fallback, fetchedAt: Date.now(), fromBackend: false };
  return { catalog: fallback, fromBackend: false };
}

export async function allocateCanonicalMaidViaApi(
  regionCode: string,
  options?: { characterId?: string; notes?: string }
): Promise<{ ok: boolean; maid?: string; regionCode?: string; serialNumber?: number; error?: string; offline?: boolean }> {
  if (!canUseBackendFetch()) {
    return { ok: false, offline: true, error: 'Backend unavailable' };
  }
  try {
    const res = await fetch('/api/canonical/maids/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionCode,
        characterId: options?.characterId,
        notes: options?.notes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    invalidateCanonicalCaches('maids');
    if (options?.characterId) invalidateCanonicalCaches('characters');
    return { ok: true, maid: data.maid, regionCode: data.regionCode, serialNumber: data.serialNumber };
  } catch (err: any) {
    return { ok: false, offline: true, error: err?.message || 'Backend unreachable' };
  }
}

export async function fetchCanonicalCareers(forceRefresh = false): Promise<{ careers: CanonicalCareerRecord[]; fromBackend: boolean }> {
  if (!forceRefresh && isFresh(careersCache)) {
    return { careers: careersCache.data, fromBackend: careersCache.fromBackend };
  }
  if (canUseBackendFetch()) {
    try {
      const res = await fetch('/api/canonical/careers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.careers) && data.careers.length > 0) {
          careersCache = { data: data.careers, fetchedAt: Date.now(), fromBackend: true };
          return { careers: data.careers, fromBackend: true };
        }
      }
    } catch {
      // fallback
    }
  }
  const fallback = CAREER_CATALOG.map((c: any) => ({
    ...c,
    canonicalId: c.canonicalId || c.id,
    frontendId: c.id,
    archetype: c.category,
    description: c.gameplayConnections,
    primaryStat: c.primaryAttribute,
  })) as CanonicalCareerRecord[];
  careersCache = { data: fallback, fetchedAt: Date.now(), fromBackend: false };
  return { careers: fallback, fromBackend: false };
}

export async function fetchCanonicalMissions(forceRefresh = false): Promise<{ missions: CanonicalMissionRecord[]; fromBackend: boolean }> {
  if (!forceRefresh && isFresh(missionsCache)) {
    return { missions: missionsCache.data, fromBackend: missionsCache.fromBackend };
  }
  if (canUseBackendFetch()) {
    try {
      const res = await fetch('/api/canonical/missions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.missions) && data.missions.length > 0) {
          missionsCache = { data: data.missions, fetchedAt: Date.now(), fromBackend: true };
          return { missions: data.missions, fromBackend: true };
        }
      }
    } catch {
      // fallback
    }
  }
  const fallback = MISSION_CATALOG as unknown as CanonicalMissionRecord[];
  missionsCache = { data: fallback, fetchedAt: Date.now(), fromBackend: false };
  return { missions: fallback, fromBackend: false };
}

export async function fetchCanonicalOrganizations(forceRefresh = false): Promise<{
  entertainmentOrganizations: any[];
  worldOrganizations: any[];
  fromBackend: boolean;
}> {
  if (!forceRefresh && isFresh(organizationsCache)) {
    return { ...organizationsCache.data, fromBackend: organizationsCache.fromBackend };
  }
  if (canUseBackendFetch()) {
    try {
      const res = await fetch('/api/canonical/organizations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entertainmentOrganizations)) {
          const payload = {
            entertainmentOrganizations: data.entertainmentOrganizations,
            worldOrganizations: data.worldOrganizations || [],
          };
          organizationsCache = { data: payload, fetchedAt: Date.now(), fromBackend: true };
          return { ...payload, fromBackend: true };
        }
      }
    } catch {
      // fallback
    }
  }
  const fallback = {
    entertainmentOrganizations: WORLD_ORGANIZATIONS.entertainmentIndustry,
    worldOrganizations: [
      ...WORLD_ORGANIZATIONS.royalLineages,
      ...WORLD_ORGANIZATIONS.colorHouses,
      ...WORLD_ORGANIZATIONS.institutions,
      ...WORLD_ORGANIZATIONS.mediaAndBrands,
    ],
  };
  organizationsCache = { data: fallback, fetchedAt: Date.now(), fromBackend: false };
  return { ...fallback, fromBackend: false };
}
