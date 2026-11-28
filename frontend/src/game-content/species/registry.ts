import records from './records.json' with { type: 'json' };
import manifest from './manifest.json' with { type: 'json' };

export interface SpeciesRecord {
  id: string;
  name: string;
  realm: string;
  category: string;
  family: string;
  affinity: string;
  description: string;
  status: string;
  lifespan: string;
  profileStatus: string;
  abilities: string;
  physiology: string;
  habitat: string;
  limitations: string;
  passiveAbilities: string;
  activePowers: string;
  techniques: string;
  exceptionalManifestations: string;
  abilityConstraints: string;
  powerReview: string;
  powerReferences: { title: string; url: string; verification: string }[];
}

export const SPECIES_RECORDS: readonly SpeciesRecord[] = records;
export const SPECIES_MANIFEST = manifest;
export const SPECIES_CATEGORIES = [...new Set(records.map(record => record.category))];
export const SPECIES_REALMS = [...new Set(records.map(record => record.realm))];
export const SPECIES_FAMILIES = [...new Set(records.map(record => record.family))].sort();
export const LINEAGE_RECORDS = SPECIES_RECORDS.filter(record => record.category !== 'Practices & statuses');
export const PRACTICE_RECORDS = SPECIES_RECORDS.filter(record => record.category === 'Practices & statuses');
export const ELEMENTAL_HUMAN_RECORDS = SPECIES_RECORDS.filter(record => record.category === 'Elemental humans');

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();
const index = SPECIES_RECORDS.map(record => ({ record, text: normalize([
  record.id, record.name, record.realm, record.category, record.family, record.affinity,
  record.description, record.physiology, record.habitat, record.passiveAbilities,
  record.activePowers, record.techniques, record.exceptionalManifestations, record.abilityConstraints,
].join(' ')) }));

export function findSpeciesRecord(idOrName: string): SpeciesRecord | undefined {
  const key = normalize(idOrName);
  return SPECIES_RECORDS.find(record => normalize(record.id) === key || normalize(record.name) === key);
}

export function searchSpeciesRecords(filters: { query?: string; realm?: string; category?: string; family?: string } = {}): SpeciesRecord[] {
  const terms = normalize(filters.query || '').split(/\s+/).filter(Boolean);
  return index.filter(({ record, text }) =>
    (!filters.realm || record.realm === filters.realm)
    && (!filters.category || record.category === filters.category)
    && (!filters.family || record.family === filters.family)
    && terms.every(term => text.includes(term)),
  ).map(item => item.record);
}
