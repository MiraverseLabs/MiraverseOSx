export type HomeAmbiance = 'warm' | 'morning' | 'lantern' | 'starlight';
export type HomeArea = 'rest' | 'study' | 'lounge' | 'keepsakes';
export type HomePaletteId = 'parchment' | 'indigo' | 'sage' | 'terracotta' | 'slate';
export type HomePlacementZone = 'Bedroom' | 'Window Desk' | 'Sitting Room' | 'Entryway';

export interface HomeMemo { id: string; title: string; body: string }
export interface HomePhoto { id: string; dataUrl: string; caption: string; addedAt: string }
export interface HomeKeepsake { id: string; title: string; story: string; addedAt: string }
export interface HomeFurnishing {
  id: string;
  name: string;
  effect: string;
  cost: number;
  category: 'Rest' | 'Academic' | 'Security' | 'Social';
  defaultZone?: HomePlacementZone;
}

export interface HomePersonalization {
  palette: HomePaletteId;
  suiteNickname: string;
  doorplateNote: string;
  favoriteTeaOrMusic: string;
  placements: Record<string, HomePlacementZone>;
  photos: HomePhoto[];
  customKeepsakes: HomeKeepsake[];
}

export const HOME_PALETTES: Record<HomePaletteId, { name: string; accent: string; surface: string; ink: string; swatch: [string, string, string] }> = {
  parchment: { name: 'Aureline Parchment', accent: '#8e6243', surface: '#faf6ef', ink: '#2f2621', swatch: ['#faf6ef', '#e7d8c5', '#8e6243'] },
  indigo: { name: 'Twilight Indigo', accent: '#4a558c', surface: '#f2f4fb', ink: '#1e2440', swatch: ['#f2f4fb', '#d4dbf2', '#4a558c'] },
  sage: { name: 'Sage Conservatory', accent: '#486b56', surface: '#f3f7f4', ink: '#1f3026', swatch: ['#f3f7f4', '#d4e4da', '#486b56'] },
  terracotta: { name: 'Warm Terracotta', accent: '#a8553a', surface: '#fcf5f2', ink: '#3a231c', swatch: ['#fcf5f2', '#edd4c9', '#a8553a'] },
  slate: { name: 'Moonlit Slate', accent: '#475569', surface: '#f4f6f8', ink: '#1e293b', swatch: ['#f4f6f8', '#d9e0e8', '#475569'] },
};

export const HOME_PLACEMENT_ZONES: readonly HomePlacementZone[] = ['Bedroom', 'Window Desk', 'Sitting Room', 'Entryway'];

export const HOME_FURNISHINGS: HomeFurnishing[] = [
  { id: 'mattress', name: 'Better mattress', effect: 'Adds 20 stamina to the rest recovery calculation, plus room comfort.', cost: 350, category: 'Rest', defaultZone: 'Bedroom' },
  { id: 'storage', name: 'Expanded storage', effect: 'A larger keepsake cabinet for your suite, plus room comfort.', cost: 450, category: 'Rest', defaultZone: 'Entryway' },
  { id: 'desk', name: 'Study desk upgrade', effect: 'Raises quiet-study XP from 120 to 160. Formal coursework remains in AureLearn.', cost: 500, category: 'Academic', defaultZone: 'Window Desk' },
  { id: 'dock', name: 'Secure terminal dock', effect: 'Adds a terminal fixture and room comfort. File access still requires your existing credentials.', cost: 800, category: 'Security', defaultZone: 'Window Desk' },
  { id: 'aura_lamp', name: 'Aura lamp', effect: 'Adds 25 aura to the rest recovery calculation and supports recovery from mild Veilwilt during overnight rest.', cost: 600, category: 'Rest', defaultZone: 'Bedroom' },
  { id: 'banner', name: 'House pride banner', effect: 'A personal touch on your wall, plus room comfort.', cost: 250, category: 'Social', defaultZone: 'Entryway' },
  { id: 'seating', name: 'Guest seating', effect: 'Makes room for visits from Aelita, Jeremie, Odd, and Ulrich.', cost: 400, category: 'Social', defaultZone: 'Sitting Room' },
  { id: 'compartment', name: 'Hidden compartment', effect: 'Adds a concealed cabinet fixture and room comfort. Record permissions remain unchanged.', cost: 1200, category: 'Security', defaultZone: 'Bedroom' },
];

export const HOME_GUESTS = [
  { id: 'aelita', name: 'Aelita Hopper', role: 'Cyberium Academy', note: 'Aelita settles in with a cup of tea and offers to review a SpellForge protocol with you.' },
  { id: 'jeremie', name: 'Jeremie Belpois', role: 'Compiler Lab 4', note: 'Jeremie brings his relay notes. You compare a few diagrams, then put the work away for the evening.' },
  { id: 'odd', name: 'Odd Della Robia', role: 'Vector Hall', note: 'Odd arrives with snacks and plenty of stories. The quiet suite feels a little livelier.' },
  { id: 'ulrich', name: 'Ulrich Stern', role: 'Vector Hall', note: 'Ulrich takes a seat and catches up with you, glad for a moment away from the busy Quadrangle.' },
] as const;

export function restoreHomeAmbiance(value: unknown): HomeAmbiance {
  return ['warm', 'morning', 'lantern', 'starlight'].includes(value as string) ? value as HomeAmbiance : 'warm';
}

export function restoreHomeMemos(value: unknown, fallback: HomeMemo[] = []): HomeMemo[] {
  if (!Array.isArray(value)) return fallback.map(memo => ({ ...memo }));
  const result: HomeMemo[] = [];
  for (const memo of value) {
    if (!memo || typeof memo.id !== 'string' || !memo.id || typeof memo.title !== 'string' || !memo.title.trim() || typeof memo.body !== 'string' || !memo.body.trim() || result.some(item => item.id === memo.id)) continue;
    result.push({ id: memo.id.slice(0, 128), title: memo.title.trim().slice(0, 80), body: memo.body.trim().slice(0, 1200) });
    if (result.length === 50) break;
  }
  return result;
}

export function restoreHomePersonalization(value: unknown): HomePersonalization {
  const defaultPlacements: Record<string, HomePlacementZone> = {};
  for (const f of HOME_FURNISHINGS) defaultPlacements[f.id] = f.defaultZone || 'Sitting Room';

  const rec = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const palette = (typeof rec.palette === 'string' && rec.palette in HOME_PALETTES)
    ? rec.palette as HomePaletteId
    : 'parchment';

  const placements: Record<string, HomePlacementZone> = { ...defaultPlacements };
  if (rec.placements && typeof rec.placements === 'object') {
    for (const [k, v] of Object.entries(rec.placements as Record<string, unknown>)) {
      if (typeof v === 'string' && (HOME_PLACEMENT_ZONES as readonly string[]).includes(v)) {
        placements[k] = v as HomePlacementZone;
      }
    }
  }

  const photos: HomePhoto[] = Array.isArray(rec.photos)
    ? rec.photos
        .filter((p: any) => p && typeof p.id === 'string' && typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/'))
        .slice(0, 12)
        .map((p: any) => ({
          id: p.id.slice(0, 64),
          dataUrl: p.dataUrl,
          caption: typeof p.caption === 'string' ? p.caption.slice(0, 120) : '',
          addedAt: typeof p.addedAt === 'string' ? p.addedAt : new Date().toISOString(),
        }))
    : [];

  const customKeepsakes: HomeKeepsake[] = Array.isArray(rec.customKeepsakes)
    ? rec.customKeepsakes
        .filter((k: any) => k && typeof k.id === 'string' && typeof k.title === 'string' && k.title.trim())
        .slice(0, 30)
        .map((k: any) => ({
          id: k.id.slice(0, 64),
          title: k.title.trim().slice(0, 80),
          story: typeof k.story === 'string' ? k.story.trim().slice(0, 400) : '',
          addedAt: typeof k.addedAt === 'string' ? k.addedAt : new Date().toISOString(),
        }))
    : [];

  return {
    palette,
    suiteNickname: typeof rec.suiteNickname === 'string' ? rec.suiteNickname.slice(0, 60) : '',
    doorplateNote: typeof rec.doorplateNote === 'string' ? rec.doorplateNote.slice(0, 100) : '',
    favoriteTeaOrMusic: typeof rec.favoriteTeaOrMusic === 'string' ? rec.favoriteTeaOrMusic.slice(0, 100) : '',
    placements,
    photos,
    customKeepsakes,
  };
}
