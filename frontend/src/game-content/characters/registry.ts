import peopleData from './people.json' with { type: 'json' };
import linkData from './legacy-links.json' with { type: 'json' };
import idAliases from './id-aliases.json' with { type: 'json' };
import retiredData from './retired-characters.json' with { type: 'json' };

export interface CharacterIdentity {
  readonly id: string;
  readonly name: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly title: string | null;
  readonly occupation: string | null;
  readonly homeRealm: string | null;
  readonly maid: string | null;
  readonly kind: string;
  readonly aliases: readonly string[];
  readonly status: string;
  readonly notes: readonly string[];
  readonly legacyIds: readonly string[];
}

export interface CharacterLink {
  readonly collection: string;
  readonly key: string;
  readonly characterId: string;
  readonly archivedSubject?: boolean;
}

export interface RetiredCharacterRecord {
  readonly id: string;
  readonly name: string;
  readonly folder: string | null;
  readonly reason: string;
  readonly historicalContext: string | null;
}

// Authoritative canonical character identities synchronized from miraverse.db.
// This catalog does not authorize access, reveal secrets, or overwrite player saves.
export const CHARACTER_IDENTITIES: readonly CharacterIdentity[] = Object.freeze(
  (peopleData as any[]).map(person =>
    Object.freeze({
      id: person.id,
      name: person.name,
      firstName: person.firstName ?? null,
      lastName: person.lastName ?? null,
      title: person.title ?? null,
      occupation: person.occupation ?? null,
      homeRealm: person.homeRealm ?? null,
      maid: person.maid ?? null,
      kind: person.kind,
      aliases: Object.freeze([...(person.aliases || [])]),
      status: person.status,
      notes: Object.freeze([...(person.notes || [])]),
      legacyIds: Object.freeze([...(person.legacyIds || [])]),
    })
  )
);

export const RETIRED_CHARACTERS: readonly RetiredCharacterRecord[] = Object.freeze(
  (retiredData as any[]).map(r => Object.freeze({ ...r }))
);

export const RETIRED_CHARACTER_IDS: ReadonlySet<string> = new Set(RETIRED_CHARACTERS.map(r => r.id));

export const CHARACTER_LINKS: readonly CharacterLink[] = Object.freeze(
  (linkData as any[]).map(link => Object.freeze({ ...link }))
);

const byId = new Map(CHARACTER_IDENTITIES.map(person => [person.id, person]));
const byMaid = new Map(
  CHARACTER_IDENTITIES.filter(p => p.maid).map(p => [p.maid!.trim().toUpperCase(), p])
);
const redirects = new Map(Object.entries(idAliases));
const referenceKey = (collection: string, key: string) => JSON.stringify([collection, key]);
const byReference = new Map(CHARACTER_LINKS.map(link => [referenceKey(link.collection, link.key), link]));

export function isRetiredCharacterId(id: string): boolean {
  return RETIRED_CHARACTER_IDS.has(id);
}

export function getCharacterById(id: string): CharacterIdentity | undefined {
  return byId.get(redirects.get(id) || id);
}

export function getCharacterByMaid(maid: string): CharacterIdentity | undefined {
  if (!maid) return undefined;
  return byMaid.get(maid.trim().toUpperCase());
}

export function getActiveRegisteredCitizens(): readonly CharacterIdentity[] {
  return CHARACTER_IDENTITIES.filter(p => p.kind === 'person' && p.status === 'existing');
}

export function resolveCharacterReference(collection: string, key: string): CharacterIdentity | undefined {
  const link = byReference.get(referenceKey(collection, key));
  if (!link || link.archivedSubject) return undefined;
  return byId.get(link.characterId);
}

export function isArchivedSubjectReference(collection: string, key: string): boolean {
  return Boolean(byReference.get(referenceKey(collection, key))?.archivedSubject);
}

export function findCharactersByName(name: string): readonly CharacterIdentity[] {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return [];
  return CHARACTER_IDENTITIES.filter(person =>
    [person.name, ...person.aliases].some(value => value.toLowerCase().replace(/\s+/g, ' ') === normalized)
  );
}

export function attachCharacterIds<T extends { id: string }>(
  collection: string,
  records: readonly T[]
): (T & { characterId?: string })[] {
  return records.map(record => ({ ...record, characterId: resolveCharacterReference(collection, record.id)?.id }));
}
