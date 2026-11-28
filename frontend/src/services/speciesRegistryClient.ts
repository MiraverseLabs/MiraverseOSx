/**
 * Frontend client for the authoritative Meridion Species Registry backend APIs
 * (/api/canonical/species/* backed by miraverse.db).
 * Falls back cleanly to the static snapshot only when the local backend is unreachable
 * (e.g. offline preview or Node unit tests).
 */
import {
  SPECIES_RECORDS,
  SPECIES_CATEGORIES,
  SPECIES_REALMS,
  SPECIES_FAMILIES,
  searchSpeciesRecords,
  findSpeciesRecord,
  type SpeciesRecord,
} from '../game-content/species/registry';

export interface SpeciesAssetItem {
  assetId: string;
  speciesId: string | null;
  realm: string | null;
  kind: 'specimen' | 'study' | 'realm_art' | 'realm_plate' | 'cover' | 'comparative_plate';
  title: string;
  url: string;
  mimeType: string;
  fileSizeBytes?: number;
}

export interface ApiSpeciesRecord extends SpeciesRecord {
  slug?: string;
  familyId?: string;
  classificationType?: string;
  isBiologicalSpecies?: boolean;
  isSapient?: boolean;
  isFauna?: boolean;
  isPlayableLineage?: boolean;
  isProvisional?: boolean | null;
  assets?: SpeciesAssetItem[];
}

export interface SpeciesFacetsResponse {
  total: number;
  realms: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  families: { name: string; count: number }[];
  classifications: { name: string; count: number }[];
  affinities: { name: string; count: number }[];
  assets: SpeciesAssetItem[];
  fromBackend: boolean;
}

export interface SpeciesDetailResponse {
  record: ApiSpeciesRecord;
  abilities: {
    type: string;
    name: string;
    description: string;
    isInnate: boolean;
    isLearned: boolean;
    isHereditaryRestricted: boolean;
    constraints: string;
  }[];
  affinities: {
    affinity: string;
    realmAlignment: string | null;
    isPrimary: boolean;
    inheritanceMode: string;
  }[];
  physiology: {
    summary: string;
    lifespan: string;
    skinTraits: string[];
    hairTraits: string[];
    eyeTraits: string[];
    earTraits: string[];
    morphologicalFeatures: string[];
    regionalGenetics: Record<string, string>;
    alternativeForms: string[];
    environmentalRequirements: string;
  } | null;
  inheritance: {
    model: string;
    supportsDominant: boolean;
    supportsDual: boolean;
    supportsComposite: boolean;
    supportsDormant: boolean;
    supportsAncestral: boolean;
    supportsMultiple: boolean;
    regionalVariants: Record<string, string>;
    hereditaryRestrictions: string;
    pureNetherCapPct: number | null;
    notes: string;
  } | null;
  habitats: {
    realm: string;
    summary: string;
    biomes: string[];
    isNative: boolean;
    domesticationStatus: string | null;
    ecologicalRole: string | null;
    conservationStatus: string | null;
    migrationPattern: string | null;
  }[];
  references: { title: string; url: string; sourceType: string; verification: string }[];
  assets: SpeciesAssetItem[];
  related: {
    id: string;
    name: string;
    slug: string;
    realm: string;
    category: string;
    family: string;
    classificationType: string;
    affinity: string;
  }[];
  fromBackend: boolean;
}

export interface CelestialRegistryResponse {
  note: string;
  choirs: {
    speciesId: string;
    name: string;
    sphere: string;
    sphereOrder: number;
    affinity: string;
    description: string;
    separateFromAncestry: boolean;
  }[];
  celestialAndHybridLineages: {
    id: string;
    name: string;
    realm: string;
    family: string;
    classificationType: string;
    affinity: string;
    description: string;
  }[];
}

export interface DisciplinesRegistryResponse {
  witchcraftRule: string;
  practitioners: {
    speciesId: string;
    name: string;
    disciplineId: string | null;
    genderRestriction: string | null;
    speciesRestriction: string | null;
    description: string;
  }[];
  witchTraditions: {
    speciesId: string;
    name: string;
    realm: string;
    affinity: string;
    witchkindExclusive: boolean;
    description: string;
  }[];
  supernaturalStatuses: {
    speciesId: string;
    name: string;
    attainmentKind: string;
    autoAssignAllowed: boolean;
    description: string;
  }[];
}

export interface WildlifePopulationItem {
  populationId: string;
  speciesId: string;
  name: string;
  family: string;
  affinity: string;
  realm: string;
  habitatZone: string;
  faunaClass: string;
  ecologicalRole: string;
  domesticationStatus: string;
  transportCapable: boolean;
  companionCapable: boolean;
  familiarCapable: boolean;
  workingCapable: boolean;
  estimatedPopulation: number;
  conservationStatus: string;
  migrationStatus: string;
}

export interface CharacterSpeciesValidationResult {
  valid: boolean;
  resolvedSpecies: string | null;
  resolvedClassification: string | null;
  errors: string[];
  warnings: string[];
}

export interface CharacterSpeciesReviewItem {
  characterId: string;
  name: string;
  title: string | null;
  occupation: string | null;
  homeRealm: string | null;
  maid: string | null;
  kind: string;
  speciesId: string | null;
  speciesName: string | null;
  subspeciesId: string | null;
  biologicalAncestry: string[];
  mixedAncestry: string[];
  nativeRealm: string | null;
  citizenship: string | null;
  primaryAffinity: string | null;
  regionalLineage: string | null;
  magicalSpecializations: string[];
  angelicChoirId: string | null;
  supernaturalStatuses: string[];
  classificationReviewNeeded: boolean;
  reviewNotes: string | null;
  updatedAt: string | null;
}

function canUseBackend(): boolean {
  return typeof fetch === 'function' && typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || '');
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  if (!canUseBackend()) return null;
  try {
    const res = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSpeciesFacets(): Promise<SpeciesFacetsResponse> {
  const data = await fetchJson<Omit<SpeciesFacetsResponse, 'fromBackend'>>('/api/canonical/species/facets');
  if (data) return { ...data, fromBackend: true };

  // Fallback when running offline without backend
  const countBy = (fn: (r: SpeciesRecord) => string) => {
    const counts = new Map<string, number>();
    for (const r of SPECIES_RECORDS) {
      const k = fn(r);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  };
  return {
    total: SPECIES_RECORDS.length,
    realms: SPECIES_REALMS.map(name => ({ name, count: SPECIES_RECORDS.filter(r => r.realm === name).length })),
    categories: SPECIES_CATEGORIES.map(name => ({ name, count: SPECIES_RECORDS.filter(r => r.category === name).length })),
    families: SPECIES_FAMILIES.map(name => ({ name, count: SPECIES_RECORDS.filter(r => r.family === name).length })),
    classifications: [],
    affinities: countBy(r => r.affinity),
    assets: [],
    fromBackend: false,
  };
}

export async function fetchSpeciesList(filters: {
  q?: string;
  realm?: string;
  category?: string;
  family?: string;
  classification?: string;
  affinity?: string;
  includeCanonMeta?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ total: number; records: ApiSpeciesRecord[]; fromBackend: boolean }> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.realm) params.set('realm', filters.realm);
  if (filters.category) params.set('category', filters.category);
  if (filters.family) params.set('family', filters.family);
  if (filters.classification) params.set('classification', filters.classification);
  if (filters.affinity) params.set('affinity', filters.affinity);
  if (filters.includeCanonMeta) params.set('includeCanonMeta', 'true');
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const data = await fetchJson<{ total: number; records: ApiSpeciesRecord[] }>(
    `/api/canonical/species${params.size ? `?${params.toString()}` : ''}`,
  );
  if (data) return { total: data.total, records: data.records, fromBackend: true };

  // Fallback
  let list = searchSpeciesRecords({
    query: filters.q,
    realm: filters.realm,
    category: filters.category,
    family: filters.family,
  });
  if (filters.affinity) {
    const aff = filters.affinity.toLowerCase();
    list = list.filter(r => r.affinity.toLowerCase().includes(aff));
  }
  if (filters.classification === 'fauna') {
    list = list.filter(r => r.category === 'Ordinary fauna' || r.category === 'Magical fauna');
  } else if (filters.classification === 'sapient') {
    list = list.filter(r => r.category !== 'Ordinary fauna' && r.category !== 'Magical fauna' && r.category !== 'Practices & statuses');
  }
  return { total: list.length, records: list, fromBackend: false };
}

export async function fetchSpeciesDetail(idOrSlug: string, includeCanonMeta = false): Promise<SpeciesDetailResponse | null> {
  const qs = includeCanonMeta ? '?includeCanonMeta=true' : '';
  const data = await fetchJson<Omit<SpeciesDetailResponse, 'fromBackend'>>(
    `/api/canonical/species/${encodeURIComponent(idOrSlug)}${qs}`,
  );
  if (data) return { ...data, fromBackend: true };

  const local = findSpeciesRecord(idOrSlug);
  if (!local) return null;
  return {
    record: local,
    abilities: [],
    affinities: [{ affinity: local.affinity, realmAlignment: local.realm, isPrimary: true, inheritanceMode: 'hybrid' }],
    physiology: {
      summary: local.physiology,
      lifespan: local.lifespan,
      skinTraits: [],
      hairTraits: [],
      eyeTraits: [],
      earTraits: [],
      morphologicalFeatures: [],
      regionalGenetics: {},
      alternativeForms: [],
      environmentalRequirements: local.habitat,
    },
    inheritance: null,
    habitats: [{ realm: local.realm, summary: local.habitat, biomes: [], isNative: true, domesticationStatus: null, ecologicalRole: null, conservationStatus: null, migrationPattern: null }],
    references: local.powerReferences.map(r => ({ ...r, sourceType: 'powerlisting' })),
    assets: [],
    related: SPECIES_RECORDS.filter(r => r.id !== local.id && (r.family === local.family || (r.realm === local.realm && r.category === local.category)))
      .slice(0, 10)
      .map(r => ({ id: r.id, name: r.name, slug: r.id.toLowerCase(), realm: r.realm, category: r.category, family: r.family, classificationType: r.category, affinity: r.affinity })),
    fromBackend: false,
  };
}

export async function fetchCelestialRegistry(): Promise<CelestialRegistryResponse | null> {
  const data = await fetchJson<CelestialRegistryResponse>('/api/canonical/species/celestial');
  if (data) return data;
  const choirs = SPECIES_RECORDS.filter(r => r.category === 'Angelic choirs').map((r, i) => ({
    speciesId: r.id,
    name: r.name,
    sphere: r.family,
    sphereOrder: r.family === 'First sphere' ? 1 : r.family === 'Second sphere' ? 2 : 3,
    affinity: r.affinity,
    description: r.description,
    separateFromAncestry: true,
  }));
  const lineages = SPECIES_RECORDS.filter(r => r.category === 'Celestial & ancestry').map(r => ({
    id: r.id, name: r.name, realm: r.realm, family: r.family, classificationType: r.family, affinity: r.affinity, description: r.description,
  }));
  return {
    note: 'Angelic choirs are separate from biological ancestry, royal dynasties, and ancient ancestral Houses.',
    choirs,
    celestialAndHybridLineages: lineages,
  };
}

export async function fetchDisciplinesRegistry(): Promise<DisciplinesRegistryResponse | null> {
  const data = await fetchJson<DisciplinesRegistryResponse>('/api/canonical/species/disciplines');
  if (data) return data;
  return {
    witchcraftRule: 'Witchcraft is exclusive to Witchkind. Other species may learn general magic and other magical crafts. Warlocks are male practitioners of the Dark Arts or Black Magic, not a separate biological species.',
    practitioners: SPECIES_RECORDS.filter(r => r.family === 'Practitioner').map(r => ({
      speciesId: r.id, name: r.name, disciplineId: null, genderRestriction: r.name === 'Warlock' ? 'Male' : null, speciesRestriction: r.name === 'Witch' ? 'Witchkind' : null, description: r.description,
    })),
    witchTraditions: SPECIES_RECORDS.filter(r => r.family === 'Witch tradition').map(r => ({
      speciesId: r.id, name: r.name, realm: r.realm, affinity: r.affinity, witchkindExclusive: true, description: r.description,
    })),
    supernaturalStatuses: SPECIES_RECORDS.filter(r => r.family === 'Existential status').map(r => ({
      speciesId: r.id, name: r.name, attainmentKind: 'Attained / Existential', autoAssignAllowed: false, description: r.description,
    })),
  };
}

export async function fetchWildlifePopulations(filters: { realm?: string; transportOnly?: boolean } = {}): Promise<{ count: number; populations: WildlifePopulationItem[] }> {
  const params = new URLSearchParams();
  if (filters.realm) params.set('realm', filters.realm);
  if (filters.transportOnly) params.set('transportOnly', 'true');
  const data = await fetchJson<{ count: number; populations: WildlifePopulationItem[] }>(
    `/api/canonical/species/wildlife${params.size ? `?${params.toString()}` : ''}`,
  );
  return data || { count: 0, populations: [] };
}

export async function validateCharacterSpecies(payload: {
  speciesId?: string;
  species?: string;
  practice?: string;
  gender?: string;
  angelicChoir?: string;
  supernaturalStatus?: string;
  nativeRealm?: string;
}): Promise<CharacterSpeciesValidationResult> {
  const data = await fetchJson<CharacterSpeciesValidationResult>('/api/canonical/species/validate-character', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (data) return data;
  return { valid: true, resolvedSpecies: payload.species || payload.speciesId || null, resolvedClassification: null, errors: [], warnings: [] };
}

export async function fetchCharacterSpeciesReviews(): Promise<{
  total: number;
  flaggedCount: number;
  characters: CharacterSpeciesReviewItem[];
  fromBackend: boolean;
}> {
  const data = await fetchJson<{
    total: number;
    flaggedCount: number;
    characters: CharacterSpeciesReviewItem[];
  }>('/api/canonical/species/character-reviews');
  if (data) return { ...data, fromBackend: true };
  return { total: 0, flaggedCount: 0, characters: [], fromBackend: false };
}

export async function saveCharacterSpeciesReview(
  characterId: string,
  payload: {
    speciesId?: string | null;
    primaryAffinity?: string | null;
    regionalLineage?: string | null;
    nativeRealm?: string | null;
    angelicChoirId?: string | null;
    magicalSpecializations?: string[];
    supernaturalStatuses?: string[];
    mixedAncestry?: string[];
    classificationReviewNeeded?: boolean;
    reviewNotes?: string | null;
  },
): Promise<{ saved: boolean; error?: string; updatedAt?: string }> {
  if (!canUseBackend()) {
    return { saved: false, error: 'Backend server unavailable. Start the MiraverseOSx backend to save canonical species reviews.' };
  }
  try {
    const res = await fetch(`/api/canonical/species/character-reviews/${encodeURIComponent(characterId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) return { saved: false, error: body?.error || `HTTP ${res.status}` };
    return { saved: true, updatedAt: body?.updatedAt };
  } catch (err: any) {
    return { saved: false, error: err?.message || 'Network error while saving review.' };
  }
}
