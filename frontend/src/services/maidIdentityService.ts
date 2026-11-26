import { getProfile as defaultInputsProfile } from '../game-content/characters/collections/defaultInputs';
import {
  getActiveRegisteredCitizens,
  isRetiredCharacterId,
  type CharacterIdentity,
} from '../game-content/characters/registry';
import {
  allocateCanonicalMaidViaApi,
  fetchCanonicalCharacters,
  invalidateCanonicalCaches,
  updateCanonicalCharacter,
} from './canonicalDataClient';
/**
 * MIRAVERSE OS x — Official MAID Identity Registry Service
 * Directives:
 * - MAID is the official, permanent identity number: MAID-<REGISTRATION_REGION_CODE>-<8 DIGITS>
 * - Approved regional codes: OR, FR, LU, MA, BR, KA, NE, VR (all eight Meridion realms).
 * - MAID is immutable once assigned (including identifiers issued outside a character's current HomeRealm).
 * - Retired serials 00481926, 00481927, and 00481928 are permanently reserved and cannot be re-issued.
 * - Authoritative allocation routes through /api/canonical/maids/allocate when connected.
 * - Existing MRD IDs remain permanent legacy aliases and resolve to the same person.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval';
import { generateProceduralPortrait } from './portraitService';
import { authorizeAuraAction, resolveAuraActor, type AuraActorContext } from '../integration/auraPermissions';
import { communicationsAuthority } from '../integration/communicationsAccess';

export type RegistrationRegionCode = 'OR' | 'FR' | 'LU' | 'MA' | 'BR' | 'KA' | 'NE' | 'VR';

export const AUTHORIZED_REGISTRATION_REGION_CODES: readonly RegistrationRegionCode[] = Object.freeze([
  'OR', 'FR', 'LU', 'MA', 'BR', 'KA', 'NE', 'VR',
]);

export const RETIRED_MAID_SERIALS: ReadonlySet<number> = new Set([481926, 481927, 481928]);

export const CONFIRMED_REGISTRATION_REGIONS: Record<string, { code: RegistrationRegionCode; name: string }> = {
  Orynvell: { code: 'OR', name: 'Orynvell (Celestial Crown Center)' },
  Fross: { code: 'FR', name: 'Fross (Northern Glacial Reach)' },
  Lumia: { code: 'LU', name: 'Lumia (Sprawl of Starlight)' },
  Marlowe: { code: 'MA', name: 'Marlowe (Tidal Springs & Coast)' },
  Brisland: { code: 'BR', name: 'Brisland (Verdant Highlands)' },
  Kaji: { code: 'KA', name: 'Kaji (Forge-Rift & Hearthlands)' },
  Nephele: { code: 'NE', name: 'Nephele (Cloud-Spire Sanctuary)' },
  'Ve’Raylia': { code: 'VR', name: 'Ve’Raylia (Elmore Astral Seat)' },
  "Ve'Raylia": { code: 'VR', name: 'Ve’Raylia (Elmore Astral Seat)' },
};

const REGION_CODE_TO_REALM: Record<RegistrationRegionCode, string> = {
  OR: 'Orynvell',
  FR: 'Fross',
  LU: 'Lumia',
  MA: 'Marlowe',
  BR: 'Brisland',
  KA: 'Kaji',
  NE: 'Nephele',
  VR: 'Ve’Raylia',
};

export function resolveRegistrationRegionCode(region?: string | null): RegistrationRegionCode | null {
  if (!region || typeof region !== 'string') return null;
  const trimmed = region.trim();
  const upper = trimmed.toUpperCase();
  if ((AUTHORIZED_REGISTRATION_REGION_CODES as readonly string[]).includes(upper)) {
    return upper as RegistrationRegionCode;
  }
  const normalized = trimmed.toLowerCase().replace(/['’]/g, '');
  for (const [label, meta] of Object.entries(CONFIRMED_REGISTRATION_REGIONS)) {
    if (label.toLowerCase().replace(/['’]/g, '') === normalized) {
      return meta.code;
    }
  }
  return null;
}

export function isRetiredMaidSerial(maidOrSerial: string | number | null | undefined): boolean {
  if (typeof maidOrSerial === 'number') return RETIRED_MAID_SERIALS.has(maidOrSerial);
  if (!maidOrSerial || typeof maidOrSerial !== 'string') return false;
  const trimmed = maidOrSerial.trim().toUpperCase();
  const match = trimmed.match(/^MAID-[A-Z]{2}-(\d{8})$/);
  const numeric = match ? parseInt(match[1], 10) : parseInt(trimmed, 10);
  return Number.isFinite(numeric) && RETIRED_MAID_SERIALS.has(numeric);
}

export interface VerifiedEmailAccount {
  address: string;
  accountType: 'personal' | 'academic' | 'work' | 'institutional';
  institution: string;
  roleLabel: string;
  verified: boolean;
  status: 'active' | 'suspended' | 'revoked';
  maid: string | null;
  requiredClearance?: number;
}

export interface CanonicalPerson {
  id: string; // Internal stable UUID or canonical CharacterId
  characterId?: string; // Stable canonical character ID from miraverse.db (e.g. "char-kieran-vesper")
  maid: string | null; // e.g. "MAID-OR-00481929" or null if pending migration
  maidStatus: 'active' | 'pending_migration';
  registrationRegionCode: RegistrationRegionCode | null;
  registrationDate: string;
  legacyAliases: string[]; // e.g. ["MRD-8492-319"]
  legacyRecord: string; // For backward compatibility with older components

  // Master Identity Attributes
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  homeRealm?: string | null; // Current canonical home realm (distinct from birthplace & MAID issuing region)
  dob: string;
  place: string; // Birthplace
  home: string; // Current residence
  address: string;
  phone: string;
  email: string;
  emailAccounts?: VerifiedEmailAccount[];
  district: string;
  passport: string;
  alias?: string;

  // Biometrics & Physical Descriptors
  height: string;
  eyes: string;
  hair: string;
  build: string;
  blood: string;
  mark: string;
  biometricSeed: string; // Seed for deterministic 10-prints
  portraitData?: string;

  // World & Lineage
  species: string;
  ancestry: string;
  abilities: string;
  powerSource: string;
  affinity: string;
  faction?: string;
  lore?: string;

  // Civic & Institutional
  category: string;
  affiliation: string;
  occupation: string;
  clearance: string;
  aura?: string;
  medical: string;
  residency: string;
  history: string;
  status: string;
  links: string;
  relationships?: string;
  relationshipIds?: { id: string; type: string; notes?: string }[];
  household?: string;
  timeline?: string;
  origin?: string;
  storyMode?: string;
  isRestricted?: boolean;
}

export interface LookupResult {
  status: 'found' | 'not_found' | 'pending_migration' | 'restricted';
  person: CanonicalPerson | null;
  matchedBy: 'maid' | 'legacy_alias' | 'name' | null;
  matchedQuery: string;
  message?: string;
}

export interface NewPersonInput {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  homeRealm?: string | null;
  registrationRegion: RegistrationRegionCode | keyof typeof CONFIRMED_REGISTRATION_REGIONS | string;
  dob: string;
  place: string;
  home: string;
  species: string;
  ancestry: string;
  abilities: string;
  powerSource: string;
  affinity: string;
  faction?: string;
  lore?: string;
  category?: string;
  affiliation?: string;
  occupation?: string;
  clearance?: string;
  address?: string;
  phone?: string;
  email?: string;
  emailAccounts?: VerifiedEmailAccount[];
  district?: string;
  passport?: string;
  alias?: string;
  height?: string;
  eyes?: string;
  hair?: string;
  build?: string;
  blood?: string;
  mark?: string;
  portraitData?: string;
  storyMode?: string;
  status?: string;
  links?: string;
  relationships?: string;
  relationshipIds?: { id: string; type: string; notes?: string }[];
  household?: string;
  timeline?: string;
  aura?: string;
  medical?: string;
  residency?: string;
  history?: string;
  legacyRecordId?: string; // Optional legacy MRD ID if transitioning
}

export type CharacterArchetype = 'ordinary' | 'cyacademy' | 'faithmed' | 'dgaos' | 'civic';

export interface PopulationSearchFilters {
  query?: string;
  species?: string;
  affiliation?: string;
  maidStatus?: 'all' | 'active' | 'pending_migration';
  category?: string;
}

export interface BiometricFingerSummary {
  fingerIndex: number;
  label: string;
  pattern: 'WHORL' | 'LOOP-U' | 'LOOP-R' | 'ARCH' | 'TENTED';
  ridgeCount: number;
  minutiaeScore: number;
  henryCode: string;
}

/**
 * Deterministic 10-print dermal ridge classification preview from biometric seed or MAID.
 */
export function generateTenPrintPreview(seedStr: string): BiometricFingerSummary[] {
  const cleanSeed = (seedStr || 'MAID-OR-00481926').trim();
  let hash = 2166136261;
  for (let i = 0; i < cleanSeed.length; i++) {
    hash ^= cleanSeed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const fingerLabels = [
    '1. R. Thumb', '2. R. Index', '3. R. Middle', '4. R. Ring', '5. R. Little',
    '6. L. Thumb', '7. L. Index', '8. L. Middle', '9. L. Ring', '10. L. Little'
  ];
  const patterns: BiometricFingerSummary['pattern'][] = ['WHORL', 'LOOP-U', 'LOOP-R', 'ARCH', 'TENTED'];

  return fingerLabels.map((label, idx) => {
    const subHash = Math.abs(Math.imul(hash ^ (idx * 7919), 1597334677));
    const pattern = patterns[subHash % patterns.length];
    const ridgeCount = 11 + (subHash % 14);
    const minutiaeScore = 88 + (subHash % 12);
    const henryCode = `${pattern.charAt(0)}-${ridgeCount}-${(subHash % 9) + 1}`;
    return {
      fingerIndex: idx + 1,
      label,
      pattern,
      ridgeCount,
      minutiaeScore,
      henryCode
    };
  });
}

const STORAGE_KEY_CANONICAL = 'miraverse-canonical-identities-v1';
const STORAGE_KEY_LEGACY = 'miraverse-identity-registry-v3';
const STORAGE_KEY_BACKUP = 'miraverse-identity-registry-v3-backup-pre-maid';
const STORAGE_KEY_COUNTER_OR = 'miraverse-maid-counter-OR';

/**
 * Validates the official MAID format: MAID-<REGISTRATION_REGION_CODE>-<8 DIGITS>
 * Supports all 8 authorized Meridion regional codes: OR, FR, LU, MA, BR, KA, NE, VR.
 */
export function validateMaidFormat(maid: string): {
  valid: boolean;
  region?: RegistrationRegionCode;
  sequence?: string;
  retired?: boolean;
  error?: string;
} {
  if (!maid || typeof maid !== 'string') {
    return { valid: false, error: 'MAID cannot be empty.' };
  }
  const match = maid.trim().toUpperCase().match(/^MAID-([A-Z]{2})-(\d{8})$/);
  if (!match) {
    return { valid: false, error: 'Invalid MAID format. Must follow MAID-<REGION>-<8 DIGITS> (e.g. MAID-OR-00481929).' };
  }
  const rawRegion = match[1];
  const sequence = match[2];

  if (!(AUTHORIZED_REGISTRATION_REGION_CODES as readonly string[]).includes(rawRegion)) {
    return {
      valid: false,
      sequence,
      error: `Registration region code '${rawRegion}' is not authorized. Allowed codes: ${AUTHORIZED_REGISTRATION_REGION_CODES.join(', ')}.`,
    };
  }

  const region = rawRegion as RegistrationRegionCode;
  const retired = RETIRED_MAID_SERIALS.has(parseInt(sequence, 10));
  return { valid: true, region, sequence, retired };
}

/**
 * Offline fallback allocator for sequential 8-digit MAIDs across any of the 8 realms.
 * Respects retired serials (00481926, 00481927, 00481928) and canonical high-water mark (481974).
 * When connected to the backend, addPerson / confirmPendingRegistration call /api/canonical/maids/allocate first.
 */
export function allocateNextMaid(
  existingPersons: CanonicalPerson[],
  regionInput: RegistrationRegionCode | string = 'OR'
): string {
  const region = resolveRegistrationRegionCode(regionInput) || 'OR';
  const usedSerials = new Set<number>(RETIRED_MAID_SERIALS);

  // Start above canonical DB high-water mark (00481981) so offline allocations never collide with canon.
  let maxSeq = 481981;
  try {
    const storedCounter = localStorage.getItem(STORAGE_KEY_COUNTER_OR);
    if (storedCounter) {
      const parsed = parseInt(storedCounter, 10);
      if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  } catch {
    // fallback
  }

  existingPersons.forEach(p => {
    if (!p.maid) return;
    const match = p.maid.trim().toUpperCase().match(/^MAID-[A-Z]{2}-(\d{8})$/);
    if (match) {
      const seqNum = parseInt(match[1], 10);
      if (!isNaN(seqNum)) {
        usedSerials.add(seqNum);
        if (seqNum > maxSeq) maxSeq = seqNum;
      }
    }
  });

  let nextSeq = maxSeq + 1;
  while (usedSerials.has(nextSeq)) {
    nextSeq++;
  }
  const maid = `MAID-${region}-${String(nextSeq).padStart(8, '0')}`;

  try {
    localStorage.setItem(STORAGE_KEY_COUNTER_OR, String(nextSeq));
  } catch {
    // localStorage fallback
  }

  return maid;
}

/**
 * Helper to safely read from IndexedDB or localStorage
 */
async function loadStoredCanonicalList(): Promise<CanonicalPerson[]> {
  // The bootstrap restores the database snapshot here before apps initialize.
  // Prefer this mirror so a stale IndexedDB copy cannot replace restored identities.
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANONICAL);
    if (raw !== null) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; }
  } catch { /* IndexedDB remains the fallback if device storage is unavailable. */ }
  try {
    if (typeof indexedDB !== 'undefined') { const stored = await idbGet<CanonicalPerson[]>(STORAGE_KEY_CANONICAL); if (Array.isArray(stored)) return stored; }
  } catch { /* Keep a new session usable. */ }
  return [];
}

/**
 * Helper to persist canonical persons to both IndexedDB and localStorage
 */
async function saveCanonicalList(list: CanonicalPerson[]): Promise<void> {
  // Sync to localStorage
  try {
    localStorage.setItem(STORAGE_KEY_CANONICAL, JSON.stringify(list));
    // Also sync to legacy storage for complete backward compatibility with older components
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(list.map(p => ({
      ...p,
      record: p.maid || p.legacyRecord,
      maid: p.maid,
      maidStatus: p.maidStatus,
      registrationRegionCode: p.registrationRegionCode,
      legacyAliases: p.legacyAliases
    }))));
  } catch (err) {
    console.error('Failed to sync canonical identities to localStorage:', err);
  }

  // Sync to IndexedDB
  try {
    if (typeof indexedDB !== 'undefined') {
      await idbSet(STORAGE_KEY_CANONICAL, list);
    }
  } catch (err) {
    console.error('Failed to sync canonical identities to IndexedDB:', err);
  }

  // Broadcast event across windows and iframes
  if (typeof window !== 'undefined') {
    window.postMessage({ source: 'meridion-registry', type: 'citizens-changed' }, window.location.origin);
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Generates a stable UUID v4 identifier.
 */
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'urn:uuid:' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildVerifiedEmailAccountsForPerson(person: Partial<CanonicalPerson>): VerifiedEmailAccount[] {
  if (Array.isArray(person.emailAccounts) && person.emailAccounts.length > 0) {
    return person.emailAccounts;
  }
  const slug = (person.name || 'citizen')
    .toLowerCase()
    .replace(/^dr\.\s*/i, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '') || 'citizen';
  const maid = person.maid || null;
  const aff = `${person.affiliation || ''} ${person.category || ''} ${person.occupation || ''}`.toLowerCase();

  const accounts: VerifiedEmailAccount[] = [
    {
      address: `${slug}@auremail.aure`,
      accountType: 'personal',
      institution: 'AureMail Municipal Grid',
      roleLabel: 'Primary Personal Citizen Mailbox',
      verified: true,
      status: 'active',
      maid,
      requiredClearance: 1,
    },
  ];

  if (person.email && !accounts.some((a) => a.address.toLowerCase() === person.email!.toLowerCase())) {
    const lowerEmail = person.email.toLowerCase();
    const isAcademic = lowerEmail.includes('cyacademy');
    const isMedical = lowerEmail.includes('faith');
    const isDga = lowerEmail.includes('dga.gov');
    const isCrown = lowerEmail.includes('orynvell.gov');
    accounts.push({
      address: person.email,
      accountType: isAcademic ? 'academic' : isDga || isMedical || isCrown ? 'institutional' : 'work',
      institution: isAcademic
        ? 'Cyberium Academy'
        : isMedical
        ? 'Faith Medical Group'
        : isDga
        ? 'Department of Global Affairs (DGAOS)'
        : isCrown
        ? 'Orynvell Sovereign Archives'
        : person.affiliation || 'Meridion Civic Network',
      roleLabel: person.occupation || 'Registered Role',
      verified: true,
      status: 'active',
      maid,
      requiredClearance: isDga ? 2 : 1,
    });
  }

  if (aff.includes('cyacademy') || aff.includes('student') || aff.includes('scholar')) {
    const addr = `${slug}@cyberium.edu`;
    if (!accounts.some((a) => a.address.toLowerCase() === addr)) {
      accounts.push({
        address: addr,
        accountType: 'academic',
        institution: 'Cyberium Academy',
        roleLabel: person.occupation || 'Academic Scholar',
        verified: true,
        status: 'active',
        maid,
        requiredClearance: 1,
      });
    }
  }

  if (aff.includes('faith') || aff.includes('clinical') || aff.includes('physician')) {
    const addr = `${slug}@faithmed.aure`;
    if (!accounts.some((a) => a.address.toLowerCase() === addr)) {
      accounts.push({
        address: addr,
        accountType: 'institutional',
        institution: 'Faith Medical Group',
        roleLabel: person.occupation || 'Clinical Staff',
        verified: true,
        status: 'active',
        maid,
        requiredClearance: 1,
      });
    }
  }

  if (aff.includes('dga') || aff.includes('trace') || aff.includes('forensic')) {
    const addr = `${slug}@dga.gov`;
    if (!accounts.some((a) => a.address.toLowerCase() === addr)) {
      accounts.push({
        address: addr,
        accountType: 'institutional',
        institution: 'Department of Global Affairs (DGAOS)',
        roleLabel: person.occupation || 'DGA / TRACE Investigator',
        verified: true,
        status: 'active',
        maid,
        requiredClearance: 2,
      });
    }
  }

  const workAddr = `${slug}@worknet.aure`;
  if (!accounts.some((a) => a.address.toLowerCase() === workAddr)) {
    accounts.push({
      address: workAddr,
      accountType: 'work',
      institution: 'WorkNet Federal Career Relay',
      roleLabel: person.occupation || 'Federal Contractor',
      verified: true,
      status: 'active',
      maid,
      requiredClearance: 1,
    });
  }

  return accounts;
}

export class MaidIdentityService {
  /**
   * Performs an idempotent, non-destructive migration of existing legacy MRD records.
   */
  public static async migrateLegacyRegistry(): Promise<{
    migratedCount: number;
    pendingCount: number;
    alreadyMigratedCount: number;
    backupCreated: boolean;
  }> {
    let rawLegacy: string | null = null;
    try {
      rawLegacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    } catch {
      return { migratedCount: 0, pendingCount: 0, alreadyMigratedCount: 0, backupCreated: false };
    }

    if (!rawLegacy) {
      return { migratedCount: 0, pendingCount: 0, alreadyMigratedCount: 0, backupCreated: false };
    }

    let legacyList: any[] = [];
    try {
      legacyList = JSON.parse(rawLegacy);
      if (!Array.isArray(legacyList)) return { migratedCount: 0, pendingCount: 0, alreadyMigratedCount: 0, backupCreated: false };
    } catch {
      return { migratedCount: 0, pendingCount: 0, alreadyMigratedCount: 0, backupCreated: false };
    }

    // Step 1: Create a safe, permanent pre-migration backup if not already present
    let backupCreated = false;
    try {
      if (!localStorage.getItem(STORAGE_KEY_BACKUP)) {
        localStorage.setItem(STORAGE_KEY_BACKUP, rawLegacy);
        backupCreated = true;
      }
    } catch {
      // backup error
    }

    const currentCanonical = await loadStoredCanonicalList();
    const existingById = new Map<string, CanonicalPerson>();
    const existingByRecord = new Map<string, CanonicalPerson>();
    const existingByMaid = new Map<string, CanonicalPerson>();

    currentCanonical.forEach(p => {
      existingById.set(p.id, p);
      if (p.maid) existingByMaid.set(p.maid, p);
      if (p.legacyRecord) existingByRecord.set(p.legacyRecord, p);
      p.legacyAliases.forEach(alias => existingByRecord.set(alias, p));
    });

    let migratedCount = 0;
    let pendingCount = 0;
    let alreadyMigratedCount = 0;

    for (const legacy of legacyList) {
      const recordKey = String(legacy.record || legacy.legacyRecord || '');
      if (!recordKey) continue;

      // Check if already in canonical registry (Idempotency guarantee)
      if (existingByRecord.has(recordKey) || (legacy.maid && existingByMaid.has(legacy.maid))) {
        alreadyMigratedCount++;
        continue;
      }

      // Check registration region
      // Rule 3: DO NOT derive registration region from home or place.
      // If cannot be confirmed, preserve the person and mark MAID assignment as pending migration.
      let regionCode: RegistrationRegionCode | null = null;
      let maidStatus: 'active' | 'pending_migration' = 'pending_migration';
      let allocatedMaid: string | null = null;

      const resolvedLegacyRegion = resolveRegistrationRegionCode(legacy.registrationRegionCode || legacy.registrationRegion);
      if (resolvedLegacyRegion) {
        regionCode = resolvedLegacyRegion;
        maidStatus = 'active';
        const existingCheck = legacy.maid ? validateMaidFormat(legacy.maid) : null;
        allocatedMaid = existingCheck?.valid && !existingCheck.retired
          ? legacy.maid.trim().toUpperCase()
          : allocateNextMaid(currentCanonical, resolvedLegacyRegion);
        migratedCount++;
      } else {
        // Unknown or unconfirmed registration region: Mark as pending migration
        regionCode = null;
        maidStatus = 'pending_migration';
        allocatedMaid = null;
        pendingCount++;
      }

      const canonicalPerson: CanonicalPerson = {
        id: legacy.id || generateUuid(),
        maid: allocatedMaid,
        maidStatus,
        registrationRegionCode: regionCode,
        registrationDate: legacy.registrationDate || new Date().toISOString(),
        legacyAliases: Array.from(new Set([recordKey, ...(legacy.legacyAliases || [])])),
        legacyRecord: recordKey,

        name: legacy.name || 'Unnamed Citizen',
        dob: legacy.dob || '2000-01-01',
        place: legacy.place || 'Unknown',
        home: legacy.home || 'Unknown',
        address: legacy.address || 'Address on file',
        phone: legacy.phone || '+1 (202) 555-0100',
        email: legacy.email || 'citizen@example.com',
        district: legacy.district || 'Municipal District',
        passport: legacy.passport || 'AUR-000000',
        alias: legacy.alias,

        height: legacy.height || '170 cm',
        eyes: legacy.eyes || 'Dark brown',
        hair: legacy.hair || 'Black',
        build: legacy.build || 'Medium',
        blood: legacy.blood || 'Not verified',
        mark: legacy.mark || 'None recorded',
        biometricSeed: legacy.biometricSeed || recordKey,
        portraitData: legacy.portraitData,

        species: legacy.species || 'Humanoid',
        ancestry: legacy.ancestry || 'Not specified',
        abilities: legacy.abilities || 'None',
        powerSource: legacy.powerSource || 'Not specified',
        affinity: legacy.affinity || 'Undetermined',
        faction: legacy.faction,
        lore: legacy.lore,

        category: legacy.category || 'Everyday civilian',
        affiliation: legacy.affiliation || 'Independent resident',
        occupation: legacy.occupation || 'Resident',
        clearance: legacy.clearance || 'General civic access',
        aura: legacy.aura,
        medical: legacy.medical || 'Faith Medical Group · intake pending',
        residency: legacy.residency || 'Private residence',
        history: legacy.history || 'Migrated from legacy MRD register',
        status: legacy.status || 'ACTIVE',
        links: legacy.links || 'Legacy archive registration',
        relationships: legacy.relationships,
        relationshipIds: legacy.relationshipIds,
        household: legacy.household,
        timeline: legacy.timeline,
        origin: legacy.origin,
        storyMode: legacy.storyMode,
        isRestricted: !!legacy.isRestricted
      };
      canonicalPerson.emailAccounts = buildVerifiedEmailAccountsForPerson(canonicalPerson);

      currentCanonical.push(canonicalPerson);
      existingByRecord.set(recordKey, canonicalPerson);
      if (canonicalPerson.maid) existingByMaid.set(canonicalPerson.maid, canonicalPerson);
    }

    if (migratedCount > 0 || pendingCount > 0) {
      await saveCanonicalList(currentCanonical);
    }

    return { migratedCount, pendingCount, alreadyMigratedCount, backupCreated };
  }

  /** Reads existing identities without creating or migrating records. */
  public static async readExistingPersons(): Promise<CanonicalPerson[]> {
    // Citizen-facing views must not seed, register, or migrate a population on lookup.
    return await loadStoredCanonicalList();
  }

  /** Retrieves the registry population with initialization and email associations. */
  public static async getAllPersons(): Promise<CanonicalPerson[]> {
    let list = await loadStoredCanonicalList();
    if (list.length === 0) {
      await this.migrateLegacyRegistry();
      list = await loadStoredCanonicalList();
    }
    if (list.length === 0) {
      list = await this.ensureDefaultPopulationSeeded();
    }
    return list.map((p) => ({
      ...p,
      emailAccounts: buildVerifiedEmailAccountsForPerson(p),
    }));
  }

  /**
   * Authoritative MAID / Legacy Alias / Name / Email Account Lookup.
   */
  public static async lookupPerson(query: string, options?: { allowRestricted?: boolean; actor?: AuraActorContext; enforceAuth?: boolean }): Promise<LookupResult> {
    const isAuthenticatedOrEnforced = Boolean(options?.actor || options?.enforceAuth || communicationsAuthority().isLoggedIn);
    const canViewRestricted = isAuthenticatedOrEnforced
      ? Boolean(options?.allowRestricted && authorizeAuraAction('lookup_restricted', { actor: options?.actor ?? resolveAuraActor() }).authorized)
      : Boolean(options?.allowRestricted);
    if (!query || typeof query !== 'string') {
      return { status: 'not_found', person: null, matchedBy: null, matchedQuery: '' };
    }

    const trimmed = query.trim();
    const upperQuery = trimmed.toUpperCase();
    const lowerQuery = trimmed.toLowerCase();
    const persons = await this.getAllPersons();

    // 1. Exact MAID Match
    const byMaid = persons.find(p => p.maid && p.maid.toUpperCase() === upperQuery);
    if (byMaid) {
      if (byMaid.isRestricted && !canViewRestricted) {
        return {
          status: 'restricted',
          person: null,
          matchedBy: 'maid',
          matchedQuery: trimmed,
          message: 'Access Restricted: Compartmented classification level required.'
        };
      }
      return { status: 'found', person: byMaid, matchedBy: 'maid', matchedQuery: trimmed };
    }

    // 2. Exact Legacy Alias Match (e.g. MRD-8492-319)
    const byAlias = persons.find(p => 
      p.legacyAliases.some(alias => alias.toUpperCase() === upperQuery) ||
      (p.legacyRecord && p.legacyRecord.toUpperCase() === upperQuery)
    );

    if (byAlias) {
      if (byAlias.isRestricted && !canViewRestricted) {
        return {
          status: 'restricted',
          person: null,
          matchedBy: 'legacy_alias',
          matchedQuery: trimmed,
          message: 'Access Restricted: Classified subject record.'
        };
      }

      if (byAlias.maidStatus === 'pending_migration') {
        return {
          status: 'pending_migration',
          person: byAlias,
          matchedBy: 'legacy_alias',
          matchedQuery: trimmed,
          message: `Record located by legacy alias '${trimmed}'. Official MAID allocation is pending registration region confirmation.`
        };
      }

      return { status: 'found', person: byAlias, matchedBy: 'legacy_alias', matchedQuery: trimmed };
    }

    // 3. Name or Verified Email Account Match (Case-insensitive)
    const byName = persons.find(p =>
      p.name.toLowerCase() === lowerQuery ||
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.email && p.email.toLowerCase() === lowerQuery) ||
      (p.emailAccounts || []).some(acc => acc.address.toLowerCase() === lowerQuery)
    );

    if (byName) {
      if (byName.isRestricted && !canViewRestricted) {
        return {
          status: 'restricted',
          person: null,
          matchedBy: 'name',
          matchedQuery: trimmed,
          message: 'Access Restricted: Record sealed by DGA authority.'
        };
      }

      if (byName.maidStatus === 'pending_migration') {
        return {
          status: 'pending_migration',
          person: byName,
          matchedBy: 'name',
          matchedQuery: trimmed,
          message: `Subject '${byName.name}' located. Official MAID allocation is pending registration region confirmation.`
        };
      }

      return { status: 'found', person: byName, matchedBy: 'name', matchedQuery: trimmed };
    }

    return {
      status: 'not_found',
      person: null,
      matchedBy: null,
      matchedQuery: trimmed,
      message: `No citizen record found matching '${trimmed}'.`
    };
  }

  /**
   * Workflow 1: Add Person
   * Atomically issues a permanent MAID upon successful authoritative save.
   */
  public static async addPerson(input: NewPersonInput, options?: { actor?: AuraActorContext; enforceAuth?: boolean }): Promise<{ success: boolean; person: CanonicalPerson; error?: string }> {
    if (options?.actor || options?.enforceAuth || communicationsAuthority().isLoggedIn) {
      const auth = authorizeAuraAction('register_person', { actor: options?.actor });
      if (!auth.authorized) {
        return { success: false, person: null as any, error: auth.reason };
      }
    }
    // Validate registration region across all 8 authorized Meridion realms
    const resolvedRegionCode = resolveRegistrationRegionCode(input.registrationRegion);
    if (!resolvedRegionCode) {
      return {
        success: false,
        person: null as any,
        error: `Registration region '${input.registrationRegion}' is not authorized for MAID issuance. Allowed codes: ${AUTHORIZED_REGISTRATION_REGION_CODES.join(', ')}.`
      };
    }

    const currentList = await this.getAllPersons();

    // Check for duplicate name + dob combination
    const existing = currentList.find(p => 
      p.name.toLowerCase() === input.name.trim().toLowerCase() && 
      p.dob === input.dob
    );

    if (existing) {
      return {
        success: false,
        person: existing,
        error: `A person named '${existing.name}' with date of birth '${existing.dob}' already exists (${existing.maid || existing.legacyRecord}). Duplicate creation rejected.`
      };
    }

    // Allocate atomic, unique MAID centrally via backend API when online (with retired-serial-safe offline fallback)
    const apiAlloc = await allocateCanonicalMaidViaApi(resolvedRegionCode, { notes: `AURA Registry registration: ${input.name.trim()}` });
    if (!apiAlloc.ok && !apiAlloc.offline) {
      return {
        success: false,
        person: null as any,
        error: apiAlloc.error || 'Authoritative MAID allocation failed.',
      };
    }
    const maid = apiAlloc.ok && apiAlloc.maid ? apiAlloc.maid : allocateNextMaid(currentList, resolvedRegionCode);
    const id = generateUuid();
    const legacyRecord = input.legacyRecordId || `MRD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;

    const newPerson: CanonicalPerson = {
      id,
      maid,
      maidStatus: 'active',
      registrationRegionCode: resolvedRegionCode,
      registrationDate: new Date().toISOString(),
      legacyAliases: [legacyRecord],
      legacyRecord,

      name: input.name.trim(),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      title: input.title ?? null,
      homeRealm: input.homeRealm ?? (REGION_CODE_TO_REALM[resolvedRegionCode] || null),
      dob: input.dob,
      place: input.place,
      home: input.home,
      address: input.address || `${input.place}, Meridion (fictional)`,
      phone: input.phone || '+1 (202) 555-' + Math.floor(1000 + Math.random() * 9000),
      email: input.email || `${input.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`,
      district: input.district || `${input.home} District`,
      passport: input.passport || `AUR-${Math.floor(100000 + Math.random() * 900000)}`,
      alias: input.alias,

      height: input.height || '172 cm',
      eyes: input.eyes || 'Luminous Hazel',
      hair: input.hair || 'Silver-Black',
      build: input.build || 'Medium',
      blood: input.blood || 'A+ (Aura Calibrated)',
      mark: input.mark || 'None recorded',
      biometricSeed: maid,
      portraitData: input.portraitData,

      species: input.species,
      ancestry: input.ancestry,
      abilities: input.abilities,
      powerSource: input.powerSource,
      affinity: input.affinity,
      faction: input.faction,
      lore: input.lore,

      category: input.category || 'Everyday civilian',
      affiliation: input.affiliation || 'Independent resident',
      occupation: input.occupation || 'Resident',
      clearance: input.clearance || 'General civic access',
      aura: input.aura || 'Aura Calibrated Standard',
      medical: input.medical || 'Faith Medical Group · intake verified',
      residency: input.residency || 'Private residence · verified',
      history: input.history || 'Official registration established under Orynvell civic authority.',
      status: input.status || 'ACTIVE / VERIFIED',
      links: input.links || 'Registered citizen in good standing.',
      relationships: input.relationships,
      relationshipIds: input.relationshipIds || [],
      household: input.household,
      timeline: input.timeline,
      origin: 'Authoritative MAID Registration',
      storyMode: input.storyMode || 'Ordinary & Believable',
      isRestricted: false
    };

    if (!newPerson.portraitData) {
      newPerson.portraitData = generateProceduralPortrait({
        name: newPerson.name,
        species: newPerson.species,
        ancestry: newPerson.ancestry,
        eyes: newPerson.eyes,
        hair: newPerson.hair,
        build: newPerson.build,
        height: newPerson.height,
        mark: newPerson.mark,
        home: newPerson.home,
        affinity: newPerson.affinity,
        powerSource: newPerson.powerSource,
        category: newPerson.category,
        dob: newPerson.dob
      });
    }
    newPerson.emailAccounts = buildVerifiedEmailAccountsForPerson(newPerson);

    currentList.push(newPerson);
    await saveCanonicalList(currentList);

    return { success: true, person: newPerson };
  }

  /**
   * Updates a saved person without changing their permanent MAID.
   */
  public static async appendAcademicSummary(citizenId: string, summary: string): Promise<{ success: boolean; person?: CanonicalPerson; error?: string }> {
    const list = await this.getAllPersons();
    const person = list.find(p => p.id === citizenId || p.maid === citizenId || p.legacyRecord === citizenId);
    const actor = resolveAuraActor();
    const self = person && (actor.canonicalPersonId === person.id || actor.citizenId === person.maid || actor.citizenId === person.legacyRecord);
    if (!person || !actor.isLoggedIn || (!self && !actor.roles.includes('admin') && !actor.roles.includes('registrar'))) return { success: false, error: 'Academic summary access denied.' };
    if (!summary.trim()) return { success: false, error: 'Academic summary is empty.' };
    if ((person.history || '').includes(summary)) return { success: true, person };
    const updated = { ...person, history: `${person.history || ''} | [${new Date().toISOString().slice(0, 10)}] CAMPUS academic summary: ${summary}` };
    await saveCanonicalList(list.map(p => p.id === person.id ? updated : p));
    return { success: true, person: updated };
  }

  public static async updatePerson(
    maidOrId: string, 
    updates: Partial<Omit<CanonicalPerson, 'id' | 'maid' | 'registrationRegionCode' | 'legacyAliases'>>,
    options?: { actor?: AuraActorContext; enforceAuth?: boolean }
  ): Promise<{ success: boolean; person: CanonicalPerson; error?: string }> {
    const currentList = await this.getAllPersons();
    const idx = currentList.findIndex(p => p.maid === maidOrId || p.id === maidOrId || p.legacyRecord === maidOrId);

    if (idx < 0) {
      return { success: false, person: null as any, error: `Person '${maidOrId}' not found.` };
    }

    const current = currentList[idx];
    if (options?.actor || options?.enforceAuth || communicationsAuthority().isLoggedIn) {
      const requestedFields = Object.keys(updates || {}).filter(
        key => (updates as any)[key] !== undefined && (updates as any)[key] !== (current as any)[key]
      );
      const auth = authorizeAuraAction('edit_identity_core', {
        actor: options?.actor,
        targetPerson: current,
        requestedFields,
      });
      if (!auth.authorized) {
        return { success: false, person: current, error: auth.reason };
      }
    }

    // Guarantee MAID, region code, and ID are immutable
    const updatedPerson: CanonicalPerson = {
      ...current,
      ...updates,
      id: current.id,
      maid: current.maid,
      registrationRegionCode: current.registrationRegionCode,
      legacyAliases: current.legacyAliases,
      legacyRecord: current.legacyRecord
    };
    updatedPerson.emailAccounts = buildVerifiedEmailAccountsForPerson(updatedPerson);

    currentList[idx] = updatedPerson;
    await saveCanonicalList(currentList);

    // Push validated identity updates to authoritative backend if this record is linked to a canonical DB character
    if (updatedPerson.characterId) {
      await updateCanonicalCharacter(updatedPerson.characterId, {
        name: updatedPerson.name,
        firstName: updatedPerson.firstName ?? undefined,
        lastName: updatedPerson.lastName ?? undefined,
        title: updatedPerson.title ?? undefined,
        occupation: updatedPerson.occupation,
        homeRealm: updatedPerson.homeRealm ?? undefined,
      }).catch(() => {});
      invalidateCanonicalCaches('characters');
    }

    return { success: true, person: updatedPerson };
  }

  /**
   * Confirms registration region for a legacy record marked pending_migration and allocates their official MAID.
   */
  public static async confirmPendingRegistration(
    personIdOrRecord: string,
    region: RegistrationRegionCode | keyof typeof CONFIRMED_REGISTRATION_REGIONS | string,
    options?: { actor?: AuraActorContext; enforceAuth?: boolean }
  ): Promise<{ success: boolean; person: CanonicalPerson; error?: string }> {
    if (options?.actor || options?.enforceAuth || communicationsAuthority().isLoggedIn) {
      const auth = authorizeAuraAction('confirm_migration', { actor: options?.actor });
      if (!auth.authorized) {
        return { success: false, person: null as any, error: auth.reason };
      }
    }
    const resolvedRegionCode = resolveRegistrationRegionCode(region);
    if (!resolvedRegionCode) {
      return {
        success: false,
        person: null as any,
        error: `Registration region '${region}' is not authorized. Allowed codes: ${AUTHORIZED_REGISTRATION_REGION_CODES.join(', ')}.`,
      };
    }

    const currentList = await this.getAllPersons();
    const person = currentList.find(p => p.id === personIdOrRecord || p.legacyRecord === personIdOrRecord);

    if (!person) {
      return { success: false, person: null as any, error: 'Person not found in registry.' };
    }

    if (person.maid && person.maidStatus === 'active') {
      return { success: true, person }; // Already has active MAID
    }

    // Allocate official MAID centrally via backend API when online
    const apiAlloc = await allocateCanonicalMaidViaApi(resolvedRegionCode, {
      characterId: person.characterId,
      notes: `Pending migration confirmation: ${person.name}`,
    });
    if (!apiAlloc.ok && !apiAlloc.offline) {
      return { success: false, person: null as any, error: apiAlloc.error || 'MAID allocation failed.' };
    }
    const maid = apiAlloc.ok && apiAlloc.maid ? apiAlloc.maid : allocateNextMaid(currentList, resolvedRegionCode);
    person.maid = maid;
    person.maidStatus = 'active';
    person.registrationRegionCode = resolvedRegionCode;
    person.biometricSeed = person.biometricSeed || maid;

    await saveCanonicalList(currentList);
    return { success: true, person };
  }

  /**
   * Links two canonical citizens in the registry with a typed relationship.
   */
  public static async linkCitizens(
    sourceMaidOrId: string,
    targetMaidOrId: string,
    relationshipType: string,
    notes?: string,
    bidirectional = true,
    options?: { actor?: AuraActorContext; enforceAuth?: boolean }
  ): Promise<{ success: boolean; source?: CanonicalPerson; target?: CanonicalPerson; error?: string }> {
    if (options?.actor || options?.enforceAuth || communicationsAuthority().isLoggedIn) {
      const auth = authorizeAuraAction('link_relationships', { actor: options?.actor });
      if (!auth.authorized) {
        return { success: false, error: auth.reason };
      }
    }
    const currentList = await this.getAllPersons();
    const sIdx = currentList.findIndex(p => p.maid === sourceMaidOrId || p.id === sourceMaidOrId || p.legacyRecord === sourceMaidOrId);
    const tIdx = currentList.findIndex(p => p.maid === targetMaidOrId || p.id === targetMaidOrId || p.legacyRecord === targetMaidOrId);

    if (sIdx < 0 || tIdx < 0) {
      return { success: false, error: 'One or both citizens could not be found in the canonical registry.' };
    }
    if (sIdx === tIdx) {
      return { success: false, error: 'Cannot link a citizen to themselves.' };
    }

    const source = currentList[sIdx];
    const target = currentList[tIdx];
    const targetRef = target.maid || target.legacyRecord;
    const sourceRef = source.maid || source.legacyRecord;

    const sRels = Array.isArray(source.relationshipIds) ? [...source.relationshipIds] : [];
    const existingS = sRels.findIndex(r => r.id === targetRef || r.id === target.legacyRecord || r.id === target.maid);
    if (existingS >= 0) {
      sRels[existingS] = { id: targetRef, type: relationshipType, notes };
    } else {
      sRels.push({ id: targetRef, type: relationshipType, notes });
    }
    source.relationshipIds = sRels;
    source.relationships = sRels.map(r => `${r.type}: ${r.id}${r.notes ? ` (${r.notes})` : ''}`).join(' · ');

    if (bidirectional) {
      const tRels = Array.isArray(target.relationshipIds) ? [...target.relationshipIds] : [];
      const existingT = tRels.findIndex(r => r.id === sourceRef || r.id === source.legacyRecord || r.id === source.maid);
      if (existingT >= 0) {
        tRels[existingT] = { id: sourceRef, type: relationshipType, notes };
      } else {
        tRels.push({ id: sourceRef, type: relationshipType, notes });
      }
      target.relationshipIds = tRels;
      target.relationships = tRels.map(r => `${r.type}: ${r.id}${r.notes ? ` (${r.notes})` : ''}`).join(' · ');
    }

    await saveCanonicalList(currentList);
    return { success: true, source, target };
  }

  /**
   * Multi-criteria population search across MAID, legacy MRD alias, name, species, affiliation, and status.
   */
  public static async searchPopulation(filters: PopulationSearchFilters): Promise<CanonicalPerson[]> {
    const all = await this.getAllPersons();
    return all.filter(p => {
      if (filters.maidStatus && filters.maidStatus !== 'all') {
        if (p.maidStatus !== filters.maidStatus) return false;
      }
      if (filters.species && filters.species !== 'ALL') {
        if (!p.species.toLowerCase().includes(filters.species.toLowerCase())) return false;
      }
      if (filters.affiliation && filters.affiliation !== 'ALL') {
        const aff = `${p.affiliation || ''} ${p.faction || ''} ${p.category || ''}`.toLowerCase();
        if (!aff.includes(filters.affiliation.toLowerCase())) return false;
      }
      if (filters.category && filters.category !== 'ALL') {
        if ((p.category || '').toLowerCase() !== filters.category.toLowerCase()) return false;
      }
      if (filters.query && filters.query.trim()) {
        const q = filters.query.trim().toLowerCase();
        const haystack = [
          p.maid || '',
          p.legacyRecord || '',
          ...(p.legacyAliases || []),
          p.name || '',
          p.alias || '',
          p.species || '',
          p.ancestry || '',
          p.home || '',
          p.place || '',
          p.occupation || '',
          p.affiliation || '',
          p.abilities || '',
          p.passport || '',
          p.district || ''
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  /**
   * Generates a complete, lore-accurate character draft for the Add Person studio.
   */
  public static generateCharacterDraft(archetype: CharacterArchetype = 'ordinary', seedOverride?: number): NewPersonInput {
    const idx = typeof seedOverride === 'number' ? Math.abs(seedOverride) : Math.floor(Math.random() * 1000);
    const pick = <T,>(arr: T[], offset = 0): T => arr[(idx + offset) % arr.length];

    const firstNames = ['Lyra', 'Caelum', 'Seraphina', 'Valen', 'Isolde', 'Theron', 'Mireille', 'Cassian', 'Aurelia', 'Soren', 'Elowen', 'Dorian'];
    const lastNames = ['Vance', 'Solis', 'Thorne', 'Vesper', 'Kael', 'Marlowe', 'Ashford', 'Valen', 'Lumen', 'Caelis', 'Vey', 'Rostova'];
    const name = `${pick(firstNames)} ${pick(lastNames, 3)}`;
    const year = 1986 + (idx % 20);
    const month = String(1 + (idx % 12)).padStart(2, '0');
    const day = String(1 + (idx % 28)).padStart(2, '0');
    const dob = `${year}-${month}-${day}`;

    const presets: Record<CharacterArchetype, Partial<NewPersonInput>> = {
      ordinary: {
        storyMode: 'Ordinary & Believable',
        category: 'Everyday civilian',
        affiliation: 'Aureline Civic & Guild Network',
        occupation: pick(['Resonance Glass Artisan', 'Aether-Transit Coordinator', 'District Archival Clerk', 'Botanical Conduit Keeper']),
        clearance: 'General Civic Access · Level I',
        species: pick(['Humanoid · Celestial Citizen', 'Luminary', 'Frostborn', 'Merfolk · Undine']),
        ancestry: pick(['Orynvell Municipal Lineage', 'Marlowe Coastal Heritage', 'Lumia Sprawl Lineage']),
        abilities: pick(['Minor aura stabilization, harmonic glasswork', 'Civic conduit tuning, signal relay', 'Hydro-acoustic sensing, calm tide resonance']),
        powerSource: 'Calibrated Ambient Aether',
        affinity: pick(['Blue · calm / structure / clarity', 'Gold · order / warmth / civic harmony', 'Teal · restoration / flow']),
        home: 'Aureline, Orynvell',
        place: pick(['Aureline Central, Orynvell', 'Marlowe Springs', 'Lumia Sprawl']),
        medical: 'Faith Medical Group · annual aura baseline verified (96.4% stability)',
        residency: 'Glassline Housing Cooperative, Suite 2C · Verified',
        household: 'Glassline Residential Housing 2C',
        history: 'Registered Orynvell resident in good standing; completed municipal biometric calibration.'
      },
      cyacademy: {
        storyMode: 'Cyberium Academy Scholar',
        category: 'Student / academy',
        affiliation: 'Cyberium Academy Central Campus',
        occupation: pick(['Senior Resonance Fellow', 'SpellForge Protocol Researcher', 'Aethercore Syntax Scholar', 'Arcane Telemetry Apprentice']),
        clearance: 'General Civic Access · Academic Clearance II',
        species: pick(['Frostborn', 'Lightborn · Seraphic', 'Luminary', 'Humanoid · Celestial']),
        ancestry: pick(['Lightborn · Ellawen Lineage', 'Northwake Cryo-Weaver Heritage', 'Orynvell Academic House']),
        abilities: pick(['Cryo-constructs, SpellForge rune weaving, starlight syntax', 'PRISM harmonic diagnostics, barrier projection', 'Solar-script compilation, memory lattice indexing']),
        powerSource: 'PRISM Resonance & Aether',
        affinity: pick(['Violet · knowledge / illusion / memory', 'Indigo · syntax / arcane logic', 'Silver · starlight / precision']),
        home: 'Aureline, Orynvell',
        place: pick(['Northwake, Fross', 'Aureline Upper Sanctum, Orynvell', 'Kaji High Grounds']),
        medical: 'Faith Medical Group · Cyberium Academy student aura clearance verified',
        residency: 'Cyberium Academy Vector Housing, Suite 4B · Verified Residence',
        household: 'Cyberium Academy Vector Housing Suite 4B',
        history: 'Enrolled at Cyberium Academy; active contributor to SpellForge and Mirror telemetry protocols.'
      },
      faithmed: {
        storyMode: 'Faith Medical Clinician',
        category: 'Clinical / Faith Medical',
        affiliation: 'Faith Medical Group · MEDSTAT Division',
        occupation: pick(['Bio-Aura Trauma Specialist', 'Veilwilt Diagnostic Clinician', 'Senior MEDSTAT Triage Officer', 'Cellular Resonance Pharmacist']),
        clearance: 'Faith Medical Clinical Authority · BCL-3',
        species: pick(['Lightborn · Healer', 'Merfolk · Naiad', 'Luminary', 'Humanoid · Celestial']),
        ancestry: pick(['Seraphima Healer Lineage', 'Marlowe Bio-Harmonic House', 'Orynvell Sanctum Lineage']),
        abilities: pick(['Bio-aura cellular mending, Veilwilt purge stabilization', 'Harmonic pulse restoration, toxin neutralization', 'Luminous tissue synthesis, neural calm']),
        powerSource: 'Sacred Lumen & Bio-Aura Resonance',
        affinity: pick(['Emerald · restoration / vitality / life', 'White-Gold · purification / solace', 'Cyan · cellular clarity']),
        home: 'Aureline, Orynvell',
        place: pick(['Aureline Medical Ward, Orynvell', 'Marlowe Springs', 'Orynvell Crown District']),
        medical: 'Faith Medical Group · Staff Clinician Baseline (99.2% Lumen Integrity)',
        residency: 'Sanctum Physician Housing, Block A-12 · Verified',
        household: 'Sanctum Physician Housing Block A-12',
        history: 'Credentialed clinician at Faith Medical Group; oversees MEDSTAT patient triage and DGA forensic medical consults.'
      },
      dgaos: {
        storyMode: 'DGA / Investigative Subject',
        category: 'DGA / TRACE Operational',
        affiliation: 'Department of Global Affairs (DGAOS // EYES & TRACE)',
        occupation: pick(['TRACE Forensic Criminalist', 'EYES Counter-PRISM Analyst', 'SHIELD Tactical Liaison', 'Cross-Sector Field Investigator']),
        clearance: 'DGA Special Clearance · EYES / TRACE Level IV',
        species: pick(['Shadowborn · Umbral', 'Humanoid · Celestial', 'Frostborn', 'Lightborn']),
        ancestry: pick(['Obsidian Watch Lineage', 'Orynvell Crown Intelligence', 'Fross Sub-Conduit Lineage']),
        abilities: pick(['Spectral trace reconstruction, cipher decryption, dermal resonance scan', 'Umbral stealth cloaking, signal interception', 'Chrono-ballistic residue analysis, truth-pulse reading']),
        powerSource: 'Hardened Aether-Core & Tactical Cipher',
        affinity: pick(['Obsidian-Violet · counter-intel / forensics', 'Crimson · tactical / vigilance', 'Cobalt · signal analysis']),
        home: 'Aureline, Orynvell',
        place: pick(['Aureline Citadel, Orynvell', 'Brisland Docks', 'Fross Sub-Conduit']),
        medical: 'Faith Medical Group · DGA Tactical Clearance & Veil-Exposure Monitored',
        residency: 'Citadel Secure Officer Housing, Unit 9 · Verified',
        household: 'Citadel Secure Officer Housing Unit 9',
        history: 'Assigned to DGAOS Command Center and TRACE Forensic Workstation; authorized for hybrid forensic transmission.'
      },
      civic: {
        storyMode: 'Orynvell Civic & Archives',
        category: 'Civic / Sovereign Authority',
        affiliation: 'Orynvell Sovereign Registry & Royal Archives',
        occupation: pick(['Crown Identity Registrar', 'First Orynvell Treasury Auditor', 'Royal Historic Society Archivist', 'Municipal Housing Commissioner']),
        clearance: 'Sovereign Civic Authority · Level III',
        species: pick(['Lightborn · Celestial', 'Luminary', 'Humanoid · Celestial']),
        ancestry: pick(['Orynvell Founding House', 'Aureline Crown Lineage', 'High Council Archival Line']),
        abilities: pick(['Holographic seal authentication, lineage ledger verification', 'Crystalline vault resonance, treaty authentication', 'Archival memory restoration, truth-ink inscription']),
        powerSource: 'Crown Crystalline Conduit',
        affinity: pick(['Royal Gold · sovereignty / permanence / truth', 'Lavender · memory / archive', 'Sapphire · law / order']),
        home: 'Aureline, Orynvell',
        place: 'Orynvell Crown Center',
        medical: 'Faith Medical Group · Sovereign Registry Baseline Verified',
        residency: 'Crown Terrace Housing, Suite 7A · Verified',
        household: 'Crown Terrace Housing Suite 7A',
        history: 'Appointed under Orynvell civic authority to maintain canonical MAID records and historical archives.'
      }
    };

    const preset = presets[archetype] || presets.ordinary;
    const heights = ['165 cm', '169 cm', '172 cm', '175 cm', '178 cm', '182 cm', '185 cm'];
    const eyesList = ['Luminous Violet-Gray', 'Radiant Amber-Gold', 'Sea-Glass Emerald', 'Starlight Silver', 'Deep Obsidian-Blue', 'Luminous Hazel'];
    const hairList = ['Silver-Black / Stardust', 'Sun-Spun Gold', 'Deep Raven-Indigo', 'Glacial White-Silver', 'Copper-Ember', 'Ash-Lavender'];
    const builds = ['Slender / Agile', 'Medium / Balanced', 'Athletic / Calibrated', 'Tall / Statuesque'];
    const bloods = ['A+ (Aura Calibrated)', 'O+ (Lumen High-Yield)', 'AB+ (Harmonic Universal)', 'B+ (Cryo-Stable)'];
    const marks = [
      'Faint crystalline frost markings along left wrist',
      'Subtle golden starlight birthmark near right temple',
      'Delicate bio-luminescent dermal line along collarbone',
      'Calibrated DGA neural-link micro-sigil behind left ear',
      'Iridescent sea-glass scale pattern along forearm'
    ];

    const draft: NewPersonInput = {
      name,
      registrationRegion: 'Orynvell',
      dob,
      place: preset.place || 'Aureline, Orynvell',
      home: preset.home || 'Aureline, Orynvell',
      address: `${100 + (idx % 800)} Celestial Promenade, Aureline Central, Orynvell`,
      phone: `+1 (202) 555-${String(1000 + (idx % 8999)).padStart(4, '0')}`,
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@meridion.org`,
      district: 'Aureline Central District, Orynvell',
      passport: `AUR-${String(200000 + (idx * 733) % 799999).padStart(6, '0')}`,
      alias: `${pick(['Starweaver', 'Cipher', 'Frostglass', 'Lumen', 'Vanguard', 'Archivist'])}-${(idx % 90) + 10}`,
      height: pick(heights),
      eyes: pick(eyesList, 1),
      hair: pick(hairList, 2),
      build: pick(builds, 3),
      blood: pick(bloods, 4),
      mark: pick(marks, 5),
      species: preset.species || 'Humanoid · Celestial',
      ancestry: preset.ancestry || 'Orynvell Lineage',
      abilities: preset.abilities || 'Aura stabilization',
      powerSource: preset.powerSource || 'Ambient Aether',
      affinity: preset.affinity || 'Violet · knowledge',
      faction: preset.affiliation,
      lore: preset.history,
      category: preset.category,
      affiliation: preset.affiliation,
      occupation: preset.occupation,
      clearance: preset.clearance,
      aura: 'Calibrated Harmonic Tier III',
      medical: preset.medical,
      residency: preset.residency,
      history: preset.history,
      status: 'ACTIVE / VERIFIED',
      links: `Active cross-application record synchronized across ${preset.affiliation}.`,
      household: preset.household,
      timeline: `Origin: ${preset.place}; registered in Orynvell (${dob.slice(0, 4)}–Present)`,
      storyMode: preset.storyMode
    };

    draft.portraitData = generateProceduralPortrait({
      name: draft.name,
      species: draft.species,
      ancestry: draft.ancestry,
      eyes: draft.eyes || 'Luminous Hazel',
      hair: draft.hair || 'Silver-Black',
      build: draft.build || 'Medium',
      height: draft.height,
      mark: draft.mark,
      home: draft.home,
      affinity: draft.affinity,
      powerSource: draft.powerSource,
      category: draft.category || 'Citizen',
      dob: draft.dob
    }, idx + 42);

    return draft;
  }

  /**
   * Builds a CanonicalPerson entry from an authoritative canonical character record,
   * enriching with any retained rich biometric seed profile from defaultInputs when present.
   */
  private static buildPersonFromCanonicalRecord(
    record: {
      id: string;
      name: string;
      firstName?: string | null;
      lastName?: string | null;
      title?: string | null;
      occupation?: string | null;
      homeRealm?: string | null;
      maid?: string | null;
      aliases?: readonly string[];
    },
    idx: number,
    richSeed?: (NewPersonInput & { fixedMaid?: string; fixedLegacy?: string; characterId?: string }) | null
  ): CanonicalPerson {
    const maid = record.maid ? record.maid.trim().toUpperCase() : null;
    const validated = maid ? validateMaidFormat(maid) : null;
    const regCode: RegistrationRegionCode | null = validated?.valid && validated.region ? validated.region : null;
    const homeRealm = record.homeRealm || (regCode ? REGION_CODE_TO_REALM[regCode] : 'Orynvell');
    const legacyRecord = richSeed?.fixedLegacy || `MRD-CANON-${String(idx + 1).padStart(4, '0')}`;
    const name = record.name;
    const occupation = record.occupation || richSeed?.occupation || 'Registered Citizen';
    const species = richSeed?.species || 'Humanoid · Celestial Citizen';
    const ancestry = richSeed?.ancestry || `${homeRealm} Lineage`;
    const dob = richSeed?.dob || '2000-01-01';
    const place = richSeed?.place || `${homeRealm} Realm`;
    const home = richSeed?.home || homeRealm;

    const portrait = generateProceduralPortrait({
      name,
      species,
      ancestry,
      eyes: richSeed?.eyes || 'Luminous Hazel',
      hair: richSeed?.hair || 'Silver-Black',
      build: richSeed?.build || 'Medium',
      height: richSeed?.height || '172 cm',
      mark: richSeed?.mark || 'None recorded',
      home,
      affinity: richSeed?.affinity || 'Gold · civic harmony',
      powerSource: richSeed?.powerSource || 'Ambient Aether',
      category: richSeed?.category || 'Registered Citizen',
      dob,
    }, 100 + idx * 17);

    const person: CanonicalPerson = {
      id: record.id,
      characterId: record.id,
      maid,
      maidStatus: maid ? 'active' : 'pending_migration',
      registrationRegionCode: regCode,
      registrationDate: new Date(Date.now() - (46 - idx) * 86400000 * 15).toISOString(),
      legacyAliases: Array.from(new Set([legacyRecord, ...(record.aliases || [])])),
      legacyRecord,
      name,
      firstName: record.firstName ?? null,
      lastName: record.lastName ?? null,
      title: record.title ?? null,
      homeRealm: record.homeRealm ?? null,
      dob,
      place,
      home,
      address: richSeed?.address || `${homeRealm} Municipal Registry`,
      phone: richSeed?.phone || `+1 (202) 555-${String(2100 + idx).padStart(4, '0')}`,
      email: richSeed?.email || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@auremail.aure`,
      district: richSeed?.district || `${homeRealm} District`,
      passport: richSeed?.passport || `${regCode || 'OR'}-${String(480000 + idx).padStart(6, '0')}`,
      alias: richSeed?.alias || record.aliases?.[0],
      height: richSeed?.height || '172 cm',
      eyes: richSeed?.eyes || 'Luminous Hazel',
      hair: richSeed?.hair || 'Silver-Black',
      build: richSeed?.build || 'Medium',
      blood: richSeed?.blood || 'A+ (Aura Calibrated)',
      mark: richSeed?.mark || 'None recorded',
      biometricSeed: maid || record.id,
      portraitData: portrait,
      species,
      ancestry,
      abilities: richSeed?.abilities || 'Standard Resonance',
      powerSource: richSeed?.powerSource || 'Ambient Aether',
      affinity: richSeed?.affinity || 'Calibrated Civic Resonance',
      faction: richSeed?.faction,
      lore: richSeed?.lore,
      category: richSeed?.category || 'Registered Citizen',
      affiliation: richSeed?.affiliation || `${homeRealm} Civic Registry`,
      occupation,
      clearance: richSeed?.clearance || 'General civic access',
      aura: richSeed?.aura || 'Aura Calibrated Standard',
      medical: richSeed?.medical || 'Faith Medical Group · intake verified',
      residency: richSeed?.residency || `${homeRealm} · verified`,
      history: richSeed?.history || `Authoritative canonical citizen record (${homeRealm}).`,
      status: richSeed?.status || 'ACTIVE / VERIFIED',
      links: richSeed?.links || 'Canonical miraverse.db citizen identity.',
      relationships: richSeed?.relationships,
      relationshipIds: richSeed?.relationshipIds || [],
      household: richSeed?.household,
      timeline: richSeed?.timeline,
      origin: 'Authoritative Canonical Registry (miraverse.db)',
      storyMode: richSeed?.storyMode || 'Ordinary & Believable',
      isRestricted: false,
    };
    person.emailAccounts = buildVerifiedEmailAccountsForPerson(person);
    return person;
  }

  /**
   * Reconciles cached browser registry entries with the authoritative miraverse.db roster
   * without allowing stale browser snapshots or counters to overwrite canonical identities.
   */
  public static async syncWithCanonicalRegistry(forceRefresh = false): Promise<CanonicalPerson[]> {
    const { characters } = await fetchCanonicalCharacters(forceRefresh);
    const activeRegistered = characters.filter(c => c.kind === 'person' && c.status === 'existing');
    const cached = await loadStoredCanonicalList();

    const richSeedsByMaid = new Map<string, any>();
    for (const seedMaid of ['MAID-OR-00481929', 'MAID-OR-00481930', 'MAID-OR-00481931']) {
      try {
        richSeedsByMaid.set(seedMaid, defaultInputsProfile(seedMaid));
      } catch {
        // Optional rich profile
      }
    }

    const cachedByCharId = new Map<string, CanonicalPerson>();
    const cachedByMaid = new Map<string, CanonicalPerson>();
    const playerCustomPersons: CanonicalPerson[] = [];

    for (const p of cached) {
      // Exclude retired seed entries (e.g. former Elara Vale / Dr. Julian Paul Vance defaults)
      if ((p.characterId && isRetiredCharacterId(p.characterId)) || isRetiredMaidSerial(p.maid)) {
        continue;
      }
      if (p.characterId) cachedByCharId.set(p.characterId, p);
      if (p.maid) cachedByMaid.set(p.maid.trim().toUpperCase(), p);
      if (!p.characterId && !activeRegistered.some(c => c.maid && p.maid && c.maid.toUpperCase() === p.maid.toUpperCase())) {
        playerCustomPersons.push(p);
      }
    }

    let highestSerial = 481981;
    const reconciled: CanonicalPerson[] = activeRegistered.map((c, idx) => {
      const normalizedMaid = c.maid ? c.maid.trim().toUpperCase() : null;
      if (normalizedMaid) {
        const m = normalizedMaid.match(/^MAID-[A-Z]{2}-(\d{8})$/);
        if (m) highestSerial = Math.max(highestSerial, parseInt(m[1], 10));
      }
      const existing = cachedByCharId.get(c.characterId) || (normalizedMaid ? cachedByMaid.get(normalizedMaid) : undefined);
      if (existing) {
        const validated = normalizedMaid ? validateMaidFormat(normalizedMaid) : null;
        const merged: CanonicalPerson = {
          ...existing,
          characterId: c.characterId,
          name: c.name,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          occupation: c.occupation || existing.occupation,
          homeRealm: c.homeRealm,
          maid: normalizedMaid ?? existing.maid,
          maidStatus: (normalizedMaid ?? existing.maid) ? 'active' : 'pending_migration',
          registrationRegionCode: validated?.valid && validated.region ? validated.region : existing.registrationRegionCode,
        };
        merged.emailAccounts = buildVerifiedEmailAccountsForPerson(merged);
        return merged;
      }
      const richSeed = normalizedMaid ? richSeedsByMaid.get(normalizedMaid) : null;
      return this.buildPersonFromCanonicalRecord(
        {
          id: c.characterId,
          name: c.name,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          occupation: c.occupation,
          homeRealm: c.homeRealm,
          maid: normalizedMaid,
          aliases: c.aliases,
        },
        idx,
        richSeed
      );
    });

    const combined = [...reconciled, ...playerCustomPersons];
    try {
      const storedCounter = parseInt(localStorage.getItem(STORAGE_KEY_COUNTER_OR) || '0', 10);
      if (!Number.isFinite(storedCounter) || storedCounter < highestSerial) {
        localStorage.setItem(STORAGE_KEY_COUNTER_OR, String(highestSerial));
      }
    } catch {
      // ignore
    }

    await saveCanonicalList(combined);
    return combined;
  }

  /**
   * Seeds the canonical population database from the authoritative 46 registered citizens
   * (enriched with rich biometric profiles where available) — never reintroducing retired serials.
   */
  public static async ensureDefaultPopulationSeeded(): Promise<CanonicalPerson[]> {
    const existing = await loadStoredCanonicalList();
    if (existing.length > 0) {
      return existing
        .filter(p => !isRetiredMaidSerial(p.maid) && !(p.characterId && isRetiredCharacterId(p.characterId)))
        .map((p) => ({
          ...p,
          emailAccounts: buildVerifiedEmailAccountsForPerson(p),
        }));
    }

    const richSeedsByMaid = new Map<string, any>();
    for (const seedMaid of ['MAID-OR-00481929', 'MAID-OR-00481930', 'MAID-OR-00481931']) {
      try {
        richSeedsByMaid.set(seedMaid, defaultInputsProfile(seedMaid));
      } catch {
        // Optional rich profile
      }
    }

    const canonicalCitizens: readonly CharacterIdentity[] = getActiveRegisteredCitizens();
    const seededList: CanonicalPerson[] = canonicalCitizens.map((c, idx) => {
      const richSeed = c.maid ? richSeedsByMaid.get(c.maid.trim().toUpperCase()) : null;
      return this.buildPersonFromCanonicalRecord(c, idx, richSeed);
    });

    try {
      localStorage.setItem(STORAGE_KEY_COUNTER_OR, '481981');
    } catch {}

    await saveCanonicalList(seededList);
    return seededList;
  }
}

