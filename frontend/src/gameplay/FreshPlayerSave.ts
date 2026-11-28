/**
 * Fresh-Player Save, Administrator Archival, and Guided Character Onboarding.
 *
 * Ensures starting a new character NEVER leaks Administrator skills, clearance,
 * inventory, or root identity into the new player save, while preserving a
 * restorable archive of the prior world (including Administrator progress).
 */
import { createWorldBackup } from '../backend/worldBackup';
type WorldBackup = ReturnType<typeof createWorldBackup>;
import { CAREER_REGISTRY } from './CareerRegistry';
import { restoreCharacterProfile, type CharacterProfile } from './CharacterProfile';
import { findSpeciesRecord } from '../game-content/species/registry';

export const ARCHIVED_SAVES_INDEX_KEY = 'miraverse-archived-saves-v1';

export interface ArchivedWorldSummary {
  archiveId: string;
  storageKey: string;
  label: string;
  characterName: string;
  wasAdmin: boolean;
  archivedAt: string;
  storeCount: number;
}

export interface StarterResidenceOption {
  id: string;
  name: string;
  building: string;
  unit: string;
  city: string;
  realm: string;
  formattedAddress: string;
  description: string;
}

export interface StarterBackgroundOption {
  id: string;
  label: string;
  credits: number;
  bits: number;
  tagline: string;
  welcomeNote: string;
}

export const STARTER_RESIDENCES: readonly StarterResidenceOption[] = [
  {
    id: 'vector-4b',
    name: 'Vector House · Suite 4B',
    building: 'Vector House',
    unit: 'Suite 4B',
    city: 'Aureline',
    realm: 'Orynvell',
    formattedAddress: 'Suite 4B, Vector House, Aureline, Orynvell OR-1042, Meridion',
    description: 'Fourth-floor corner suite overlooking Broad Street with quiet study light.',
  },
  {
    id: 'glassline-2a',
    name: 'Glassline Lofts · Unit 2A',
    building: 'Glassline Lofts',
    unit: 'Unit 2A',
    city: 'Aureline',
    realm: 'Orynvell',
    formattedAddress: 'Unit 2A, Glassline Lofts, Glassline District, Aureline, Orynvell OR-1108, Meridion',
    description: 'Bright studio loft near transit relays, studios, and the evening markets.',
  },
  {
    id: 'dawnson-12',
    name: 'Dawnson Scholar Quarters · Room 12',
    building: 'Dawnson Hall',
    unit: 'Room 12',
    city: 'Dawnson',
    realm: 'Orynvell',
    formattedAddress: 'Room 12, Dawnson Hall, Dawnson, Aureline, Orynvell OR-1204, Meridion',
    description: 'Peaceful collegiate room steps from Dawn University and the open reading gardens.',
  },
];

export const STARTER_BACKGROUNDS: readonly StarterBackgroundOption[] = [
  {
    id: 'citizen',
    label: 'Aureline Resident',
    credits: 500,
    bits: 25,
    tagline: 'Balanced starting stipend for everyday city life, transit, and local work.',
    welcomeNote: 'Your municipal stipend and Aureline citizen transit pass are active.',
  },
  {
    id: 'scholar',
    label: 'Academy Scholar',
    credits: 420,
    bits: 40,
    tagline: 'Modest credits with extra Research Bits for SpellForge and academic coursework.',
    welcomeNote: 'Your AureLearn study desk and initial research bit allocation are ready.',
  },
  {
    id: 'artisan',
    label: 'Independent Artisan',
    credits: 650,
    bits: 20,
    tagline: 'Higher starting savings for suite furnishings, supplies, and guild contracts.',
    welcomeNote: 'Your workshop ledger and WORKNET independent contractor profile are active.',
  },
];

export const REALM_REGION_CODES: Record<string, string> = {
  Orynvell: 'OR',
  Fross: 'FR',
  Lumia: 'LU',
  Marlowe: 'MA',
  Brisland: 'BR',
  Kaji: 'KA',
  Nephele: 'NE',
  'Ve’Raylia': 'VR',
};

export interface FreshCharacterOnboardingInput {
  displayName: string;
  alias?: string;
  pronouns?: string;
  homeRealm: string;
  speciesId?: string;
  ancestry?: string;
  affinity?: string;
  bio?: string;
  residenceId: string;
  backgroundId: string;
}

export function listArchivedSaves(storage: Storage = localStorage): ArchivedWorldSummary[] {
  try {
    const raw = JSON.parse(storage.getItem(ARCHIVED_SAVES_INDEX_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function readArchivedSavePayload(storageKey: string, storage: Storage = localStorage): WorldBackup | null {
  try {
    const raw = JSON.parse(storage.getItem(storageKey) || 'null');
    return raw && typeof raw === 'object' && raw.entries ? (raw as WorldBackup) : null;
  } catch {
    return null;
  }
}

export function deleteArchivedSave(archiveId: string, storage: Storage = localStorage): ArchivedWorldSummary[] {
  const list = listArchivedSaves(storage);
  const target = list.find(item => item.archiveId === archiveId);
  if (target) {
    try { storage.removeItem(target.storageKey); } catch {}
  }
  const next = list.filter(item => item.archiveId !== archiveId);
  try { storage.setItem(ARCHIVED_SAVES_INDEX_KEY, JSON.stringify(next)); } catch {}
  return next;
}

/**
 * Snapshots the current browser world (including Administrator progress) into a named,
 * restorable archive before starting a fresh player save.
 */
export function archiveCurrentWorld(
  label: string,
  characterName: string,
  wasAdmin: boolean,
  storage: Storage = localStorage,
): ArchivedWorldSummary | null {
  try {
    const backup = createWorldBackup(storage);
    const storeCount = Object.keys(backup.entries).length;
    if (storeCount === 0) return null;
    const archiveId = `archive-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const storageKey = `miraverse-world-archive-${archiveId}`;
    storage.setItem(storageKey, JSON.stringify(backup));
    const entry: ArchivedWorldSummary = {
      archiveId,
      storageKey,
      label,
      characterName: characterName || (wasAdmin ? 'ADMINISTRATOR' : 'Previous Citizen'),
      wasAdmin,
      archivedAt: new Date().toISOString(),
      storeCount,
    };
    const existing = listArchivedSaves(storage);
    const updated = [entry, ...existing].slice(0, 12);
    storage.setItem(ARCHIVED_SAVES_INDEX_KEY, JSON.stringify(updated));
    return entry;
  } catch {
    return null;
  }
}

export async function allocateFreshMaid(homeRealm: string): Promise<string> {
  const code = REALM_REGION_CODES[homeRealm] || 'OR';
  if (typeof fetch === 'function' && typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || '')) {
    try {
      const res = await fetch('/api/canonical/maids/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ regionCode: code, notes: 'Fresh player onboarding allocation' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.maid === 'string' && data.maid.startsWith('MAID-')) {
          return data.maid;
        }
      }
    } catch {
      // Fall back cleanly to deterministic offline MAID
    }
  }
  const serial = String(Math.floor(50000000 + Math.random() * 49999999));
  return `MAID-${code}-${serial}`;
}

export function buildFreshGameplayPatch(
  input: FreshCharacterOnboardingInput,
  allocatedMaid: string,
) {
  const displayName = input.displayName.trim() || 'New Citizen';
  const alias = (input.alias || '').trim().replace(/^@/, '') || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  const residence = STARTER_RESIDENCES.find(r => r.id === input.residenceId) || STARTER_RESIDENCES[0];
  const background = STARTER_BACKGROUNDS.find(b => b.id === input.backgroundId) || STARTER_BACKGROUNDS[0];
  const species = input.speciesId ? findSpeciesRecord(input.speciesId) : undefined;
  const affinity = (input.affinity || '').trim() || species?.affinity || 'Unassessed';

  const characterProfile: CharacterProfile = restoreCharacterProfile({
    displayName,
    alias,
    pronouns: (input.pronouns || '').trim(),
    speciesId: species?.id || '',
    ancestry: (input.ancestry || '').trim(),
    affinity,
    bio: (input.bio || '').trim(),
    homeDescription: residence.description,
    practiceIds: [],
    interests: [],
    appearance: '',
    portrait: '',
  });

  const freshSkills = {
    Programming: { level: 1, xp: 0 },
    Networking: { level: 1, xp: 0 },
    Spellcasting: { level: 1, xp: 0 },
    Engineering: { level: 1, xp: 0 },
    Communication: { level: 1, xp: 0 },
    Creativity: { level: 1, xp: 0 },
    Research: { level: 1, xp: 0 },
    CyberSecurity: { level: 1, xp: 0 },
    Cryptography: { level: 1, xp: 0 },
  };

  const freshCareers = Object.fromEntries(
    Object.values(CAREER_REGISTRY).map(c => [c.id, { rankIndex: 0, xp: 0, title: c.tierTitles[0] }]),
  );

  const freshIdentity = {
    fingerprint: true,
    facial: true,
    auraBaseline: true,
    citizenId: allocatedMaid,
    maid: allocatedMaid,
    profileDisplayName: displayName,
    profileAlias: alias,
    barcode: `AURE-${allocatedMaid.slice(-8)}`,
    signalSignature: `${affinity} · Citizen Baseline`,
    profileTags: [`#${input.homeRealm.replace(/[^A-Za-z0-9]/g, '')}`, `#${background.id}`],
    declaredRegion: input.homeRealm,
    registeredAddress: residence.formattedAddress,
    residenceId: residence.id,
    residenceName: residence.name,
  };

  const freshPlayer = {
    name: displayName,
    alias,
    isAdmin: false,
    creatorMode: false,
    clearanceLevel: 1,
    level: 1,
    xp: 0,
    credits: background.credits,
    bits: background.bits,
    stamina: 95,
    auraHealth: 100,
    conditions: [],
    dgaVerified: false,
    lineageDecrypted: false,
    hackedNodes: 0,
    starterPhase: 1,
    roomComfort: 50,
    dormComfort: 50,
    unlockedHousingUpgrades: ['banner'],
    residenceId: residence.id,
    residenceAddress: residence.formattedAddress,
    residenceLabel: residence.name,
    backgroundId: background.id,
    dreamLogs: [],
    forgedSpells: [],
    rewardItems: [],
    completedMissions: [],
    discoveredShrines: [],
    worknetOrders: {},
    reputation: {
      campus: 10,
      dga: 10,
      faith: 10,
      archive: 10,
      vector: 5,
      delegation: 10,
      orynvell: 15,
    },
    skills: freshSkills,
    careers: freshCareers,
    npcVectors: {},
  };

  const welcomeEvent = {
    id: `EVT-ONBOARD-${Date.now()}`,
    category: 'civic' as const,
    title: `AURA Citizen Onboarding Completed — ${displayName}`,
    summary: `Issued ${allocatedMaid}, registered residence at ${residence.name}, initialized ${background.credits} cr / ${background.bits} bits (${background.label}), and connected personal communications (@${alias}).`,
    institution: 'Orynvell Civic Registry & AURA',
    cycle: 1,
    timestamp: new Date().toISOString(),
    tags: ['onboarding', 'aura', 'fresh-save'],
  };

  return {
    characterProfile,
    identity: freshIdentity,
    player: freshPlayer,
    residence,
    background,
    welcomeEvent,
    welcomeEmail: {
      id: `MAIL-WELCOME-${Date.now()}`,
      sender: 'Aureline Civic & AURA Desk',
      senderAddress: 'registry@orynvell.gov',
      subject: `Welcome to Meridion, ${displayName} (${allocatedMaid})`,
      preview: `Your AURA identity, residence at ${residence.name}, and starting stipend are ready.`,
      body: [
        `Welcome to Aureline, ${displayName} (@${alias}).`,
        '',
        `• AURA Identity: ${allocatedMaid} (${input.homeRealm})`,
        `• Registered Residence: ${residence.formattedAddress}`,
        `• Starting Finances: ${background.credits.toLocaleString()} credits · ${background.bits} bits (${background.label})`,
        species ? `• Recorded Lineage: ${species.name} (${species.id})` : '• Recorded Lineage: You may choose or update your heritage anytime in Settings → My Character.',
        '',
        background.welcomeNote,
      ].join('\n'),
      timestamp: new Date().toISOString(),
      read: false,
      category: 'Inbox',
    },
  };
}
