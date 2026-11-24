import placesCatalog from './places/places.json' with { type: 'json' };
import organizationsCatalog from './organizations/organizations.json' with { type: 'json' };
import objectsCatalog from './objects/objects.json' with { type: 'json' };
import historyCatalog from './history/history.json' with { type: 'json' };
import brandKitsCatalog from './media-assets/brand-kits.json' with { type: 'json' };
import mediaManifest from './media-assets/manifest.json' with { type: 'json' };
import { CHARACTER_IDENTITIES, getCharacterById, findCharactersByName, type CharacterIdentity } from './characters/registry';
import { getProfiles as getSocialPeople } from './characters/collections/PEOPLE';

export type WorldDomain = 'people' | 'places' | 'organizations' | 'objects' | 'history';

export interface AssetProvenance {
  origin: 'authored_svg' | 'miraverse_original' | 'ai_generated_original' | 'admin_upload' | 'player_upload' | 'npc_generated';
  creator: string;
  license: string;
  approvalStatus: 'approved' | 'pending_qa' | 'held_pending_license' | 'player_sandbox';
  createdAt: string;
  notes?: string;
}

export interface MediaAssetRecord {
  id: string;
  src: string;
  mimeType: string;
  slotRole: string;
  entityIds: string[];
  caption: string;
  provenance: AssetProvenance;
  scope?: 'canon' | 'admin_canon' | 'player_work' | 'npc_generated';
  width?: number;
  height?: number;
}

export interface BrandTokens {
  bgSurface: string;
  bgElevated: string;
  bgHero: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  accentPrimary: string;
  accentSecondary: string;
  accentBreaking?: string;
  accentHighlight?: string;
  borderOrnament: string;
  fontDisplay: string;
  fontBody: string;
  fontAccent: string;
  fontQuote: string;
}

export interface BrandKitDefinition {
  id: string;
  name: string;
  organizationId?: string;
  tokens: BrandTokens;
  assets: Record<string, string>;
}

export interface ResolvedMediaSlot {
  mode: 'exact_slot' | 'entity_primary' | 'brand_ornament' | 'typographic_fallback';
  asset?: MediaAssetRecord;
  src?: string;
  caption: string;
  monogramText: string;
}

// Authoritative World Asset Library Collections
export const WORLD_PLACES = {
  realms: placesCatalog.realms,
  landmarks: placesCatalog.landmarks,
  venues: placesCatalog.venues,
} as const;

export const WORLD_ORGANIZATIONS = {
  royalLineages: organizationsCatalog.royalLineages,
  colorHouses: organizationsCatalog.colorHouses,
  institutions: organizationsCatalog.institutions,
  mediaAndBrands: organizationsCatalog.mediaAndBrands,
} as const;

export const WORLD_OBJECTS = objectsCatalog.objects;
export const WORLD_HISTORY = {
  eras: historyCatalog.eras,
  loreEntries: historyCatalog.loreEntries,
} as const;

export const COLOR_PALETTES = brandKitsCatalog.palettes;
export const EDITORIAL_FONTS = brandKitsCatalog.fonts;
export const BRAND_KITS: Record<string, BrandKitDefinition> = brandKitsCatalog.brandKits as Record<string, BrandKitDefinition>;
export const CANON_MEDIA_ASSETS: readonly MediaAssetRecord[] = mediaManifest.assets as MediaAssetRecord[];

// In-memory mirror of runtime assets loaded from C# /api/media (or offline session uploads)
const runtimeMediaRegistry = new Map<string, MediaAssetRecord>();

export function registerRuntimeMediaAsset(record: MediaAssetRecord): MediaAssetRecord {
  const normalized: MediaAssetRecord = {
    ...record,
    id: record.id.startsWith('runtime:') || record.id.startsWith('canon:') ? record.id : `runtime:${record.id}`,
    entityIds: Array.isArray(record.entityIds) ? [...record.entityIds] : [],
  };
  runtimeMediaRegistry.set(normalized.id, normalized);
  return normalized;
}

export function listAllMediaAssets(includeUnapproved = false): MediaAssetRecord[] {
  const combined = [...CANON_MEDIA_ASSETS, ...runtimeMediaRegistry.values()];
  return includeUnapproved
    ? combined
    : combined.filter(a => a.provenance.approvalStatus === 'approved' || a.provenance.approvalStatus === 'player_sandbox');
}

export function getMediaAssetById(assetId?: string | null): MediaAssetRecord | undefined {
  if (!assetId) return undefined;
  return runtimeMediaRegistry.get(assetId) || CANON_MEDIA_ASSETS.find(a => a.id === assetId);
}

export async function syncRuntimeMediaFromBackend(fetchImpl: typeof fetch = globalThis.fetch): Promise<MediaAssetRecord[]> {
  if (typeof fetchImpl !== 'function') return [...runtimeMediaRegistry.values()];
  try {
    const res = await fetchImpl('/api/media', { headers: { Accept: 'application/json' } });
    if (!res.ok) return [...runtimeMediaRegistry.values()];
    const payload = await res.json();
    if (Array.isArray(payload?.assets)) {
      for (const item of payload.assets) {
        if (item && typeof item.id === 'string' && typeof item.src === 'string') {
          registerRuntimeMediaAsset(item);
        }
      }
    }
  } catch {
    // Offline/browser-only mode gracefully continues with canon + session assets
  }
  return [...runtimeMediaRegistry.values()];
}

export async function uploadRuntimeMediaToBackend(
  input: {
    name: string;
    mimeType: string;
    dataBase64: string;
    slotRole: string;
    entityIds?: string[];
    caption?: string;
    creator: string;
    scope: 'admin_canon' | 'player_work' | 'npc_generated';
  },
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<{ ok: boolean; asset?: MediaAssetRecord; error?: string }> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(input.mimeType)) {
    return { ok: false, error: `Unsupported media MIME type '${input.mimeType}'.` };
  }
  if (!input.dataBase64 || input.dataBase64.length > 11_500_000) {
    return { ok: false, error: 'Media payload must be non-empty and within the 8 MB limit.' };
  }

  if (typeof fetchImpl === 'function') {
    try {
      const res = await fetchImpl('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.asset) {
          return { ok: true, asset: registerRuntimeMediaAsset(saved.asset) };
        }
      }
    } catch {
      // Fallback to in-memory data URI when backend is offline in standalone preview/tests
    }
  }

  const cleanBase64 = input.dataBase64.replace(/^data:[^;]+;base64,/, '');
  const localAsset = registerRuntimeMediaAsset({
    id: `runtime:local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    src: `data:${input.mimeType};base64,${cleanBase64}`,
    mimeType: input.mimeType,
    slotRole: input.slotRole || 'media.general',
    entityIds: input.entityIds || [],
    caption: input.caption || input.name,
    scope: input.scope,
    provenance: {
      origin: input.scope === 'admin_canon' ? 'admin_upload' : input.scope === 'npc_generated' ? 'npc_generated' : 'player_upload',
      creator: input.creator,
      license: 'User / Studio Session Asset',
      approvalStatus: input.scope === 'admin_canon' ? 'approved' : 'player_sandbox',
      createdAt: new Date().toISOString().slice(0, 10),
    },
  });
  return { ok: true, asset: localAsset };
}

export function getBrandKit(brandKitId?: string): BrandKitDefinition {
  if (brandKitId && Object.hasOwn(BRAND_KITS, brandKitId)) {
    return BRAND_KITS[brandKitId];
  }
  return BRAND_KITS['unbranded-editorial'];
}

export function brandKitCssVariables(brandKitId?: string, overrides?: Partial<BrandTokens>): Record<string, string> {
  const kit = getBrandKit(brandKitId);
  const merged = { ...kit.tokens, ...(overrides || {}) };
  return {
    '--mk-bg-surface': merged.bgSurface,
    '--mk-bg-elevated': merged.bgElevated,
    '--mk-bg-hero': merged.bgHero,
    '--mk-bg-secondary': merged.bgSecondary,
    '--mk-text-primary': merged.textPrimary,
    '--mk-text-secondary': merged.textSecondary,
    '--mk-text-inverse': merged.textInverse,
    '--mk-accent-primary': merged.accentPrimary,
    '--mk-accent-secondary': merged.accentSecondary,
    '--mk-accent-breaking': merged.accentBreaking || merged.bgHero,
    '--mk-accent-highlight': merged.accentHighlight || merged.accentSecondary,
    '--mk-border-ornament': merged.borderOrnament,
    '--mk-font-display': merged.fontDisplay,
    '--mk-font-body': merged.fontBody,
    '--mk-font-accent': merged.fontAccent,
    '--mk-font-quote': merged.fontQuote,
  };
}

/**
 * Graceful Missing-Art Fallback Chain:
 * 1. Explicit assetId (if approved/player_sandbox)
 * 2. Approved asset matching entityId + exact slotRole
 * 3. Approved primary visual for entityId (e.g. place.hero, portrait.primary, masthead.primary)
 * 4. Active Brand Kit emblem/monogram/crest
 * 5. Pure typographic/monogram editorial treatment (never random external stock imagery)
 */
export function resolveEntityMediaSlot(options: {
  assetId?: string;
  entityId?: string;
  slotRole?: string;
  brandKitId?: string;
  fallbackLabel?: string;
}): ResolvedMediaSlot {
  const label = (options.fallbackLabel || options.entityId || 'Miraverse').trim();
  const initials = label
    .replace(/^(The|House|Maison)\s+/i, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || 'MV';

  const explicit = getMediaAssetById(options.assetId);
  if (explicit && (explicit.provenance.approvalStatus === 'approved' || explicit.provenance.approvalStatus === 'player_sandbox')) {
    return { mode: 'exact_slot', asset: explicit, src: explicit.src, caption: explicit.caption, monogramText: initials };
  }

  const available = listAllMediaAssets(false);
  if (options.entityId) {
    if (options.slotRole) {
      const exact = available.find(a => a.entityIds.includes(options.entityId!) && a.slotRole === options.slotRole);
      if (exact) {
        return { mode: 'exact_slot', asset: exact, src: exact.src, caption: exact.caption, monogramText: initials };
      }
    }
    const primary = available.find(a => a.entityIds.includes(options.entityId!) && !a.slotRole.startsWith('ornament.'));
    if (primary) {
      return { mode: 'entity_primary', asset: primary, src: primary.src, caption: primary.caption, monogramText: initials };
    }
  }

  const kit = getBrandKit(options.brandKitId);
  const ornamentId = kit.assets.monogram || kit.assets.crest || kit.assets.star;
  const ornament = getMediaAssetById(ornamentId);
  if (ornament) {
    return {
      mode: 'brand_ornament',
      asset: ornament,
      src: ornament.src,
      caption: options.fallbackLabel || kit.name,
      monogramText: initials,
    };
  }

  return {
    mode: 'typographic_fallback',
    caption: options.fallbackLabel || kit.name,
    monogramText: initials,
  };
}

export interface WorldEntitySummary {
  id: string;
  domain: WorldDomain;
  name: string;
  subtitle: string;
  description: string;
}

export function resolveWorldEntity(idOrName: string): WorldEntitySummary | undefined {
  if (!idOrName) return undefined;
  const q = idOrName.trim();
  const character: CharacterIdentity | undefined = getCharacterById(q) || findCharactersByName(q)[0];
  if (character) {
    const social = getSocialPeople().find((p: any) => p.characterId === character.id || p.id === q);
    return {
      id: character.id,
      domain: 'people',
      name: character.name,
      subtitle: social?.handle ? `@${social.handle}` : character.kind,
      description: social?.bio || `Registered person in Meridion (${character.status}).`,
    };
  }
  const realm = WORLD_PLACES.realms.find(r => r.id === q || r.name.toLowerCase() === q.toLowerCase());
  if (realm) {
    return { id: realm.id, domain: 'places', name: realm.name, subtitle: `${realm.element} Realm · Cap. ${realm.capital}`, description: realm.role };
  }
  const venue = WORLD_PLACES.venues.find(v => v.id === q || v.name.toLowerCase() === q.toLowerCase());
  if (venue) {
    return { id: venue.id, domain: 'places', name: venue.name, subtitle: `${venue.kind} · ${venue.city}`, description: venue.description };
  }
  const landmark = WORLD_PLACES.landmarks.find(l => l.id === q || l.name.toLowerCase() === q.toLowerCase());
  if (landmark) {
    return { id: landmark.id, domain: 'places', name: landmark.name, subtitle: landmark.designation, description: landmark.description };
  }
  const allOrgs = [
    ...WORLD_ORGANIZATIONS.royalLineages.map(o => ({ id: o.id, name: o.name, subtitle: `Royal Lineage · ${o.realm}`, description: o.ideology })),
    ...WORLD_ORGANIZATIONS.colorHouses.map(h => ({ id: h.id, name: h.name, subtitle: 'Color House Affiliation', description: h.domain })),
    ...WORLD_ORGANIZATIONS.institutions.map(i => ({ id: i.id, name: i.name, subtitle: `${i.kind} · ${i.seat}`, description: i.ideology })),
    ...WORLD_ORGANIZATIONS.mediaAndBrands.map(m => ({ id: m.id, name: m.name, subtitle: `${m.kind} · ${m.seat}`, description: m.description })),
  ];
  const org = allOrgs.find(o => o.id === q || o.name.toLowerCase() === q.toLowerCase());
  if (org) return { ...org, domain: 'organizations' };

  const obj = WORLD_OBJECTS.find(o => o.id === q || o.name.toLowerCase() === q.toLowerCase());
  if (obj) return { id: obj.id, domain: 'objects', name: obj.name, subtitle: obj.category, description: obj.description };

  const era = WORLD_HISTORY.eras.find(e => e.id === q || e.title.toLowerCase() === q.toLowerCase());
  if (era) return { id: era.id, domain: 'history', name: era.title, subtitle: era.period, description: era.summary };

  const lore = WORLD_HISTORY.loreEntries.find(l => l.id === q || l.title.toLowerCase() === q.toLowerCase());
  if (lore) return { id: lore.id, domain: 'history', name: lore.title, subtitle: lore.category, description: lore.content };

  return undefined;
}

export function listWorldLibraryByDomain(domain: WorldDomain): WorldEntitySummary[] {
  switch (domain) {
    case 'people':
      return CHARACTER_IDENTITIES.map(c => ({
        id: c.id,
        domain: 'people',
        name: c.name,
        subtitle: c.kind,
        description: c.aliases.length ? `Aliases: ${c.aliases.join(', ')}` : `Canonical character (${c.status})`,
      }));
    case 'places':
      return [
        ...WORLD_PLACES.realms.map(r => ({ id: r.id, domain: 'places' as const, name: r.name, subtitle: `${r.element} · Cap. ${r.capital}`, description: r.role })),
        ...WORLD_PLACES.venues.map(v => ({ id: v.id, domain: 'places' as const, name: v.name, subtitle: `${v.kind} · ${v.city}`, description: v.description })),
        ...WORLD_PLACES.landmarks.map(l => ({ id: l.id, domain: 'places' as const, name: l.name, subtitle: l.designation, description: l.description })),
      ];
    case 'organizations':
      return [
        ...WORLD_ORGANIZATIONS.mediaAndBrands.map(m => ({ id: m.id, domain: 'organizations' as const, name: m.name, subtitle: m.kind, description: m.description })),
        ...WORLD_ORGANIZATIONS.royalLineages.map(r => ({ id: r.id, domain: 'organizations' as const, name: r.name, subtitle: `Royal Seat: ${r.seat}`, description: r.ideology })),
        ...WORLD_ORGANIZATIONS.colorHouses.map(h => ({ id: h.id, domain: 'organizations' as const, name: h.name, subtitle: 'Color House', description: h.domain })),
        ...WORLD_ORGANIZATIONS.institutions.map(i => ({ id: i.id, domain: 'organizations' as const, name: i.name, subtitle: i.kind, description: i.ideology })),
      ];
    case 'objects':
      return WORLD_OBJECTS.map(o => ({ id: o.id, domain: 'objects', name: o.name, subtitle: `${o.category} · ${o.priceCredits} CR`, description: o.description }));
    case 'history':
      return [
        ...WORLD_HISTORY.eras.map(e => ({ id: e.id, domain: 'history' as const, name: e.title, subtitle: e.period, description: e.summary })),
        ...WORLD_HISTORY.loreEntries.map(l => ({ id: l.id, domain: 'history' as const, name: l.title, subtitle: l.category, description: l.content })),
      ];
  }
}
