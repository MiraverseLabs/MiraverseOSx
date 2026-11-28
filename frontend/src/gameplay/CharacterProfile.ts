import speciesIndex from '../game-content/species/identityIndex.json' with { type: 'json' };
const findSpeciesRecord = (id: string) => speciesIndex.find(record => record.id === id || record.name.toLowerCase() === id.toLowerCase());

export interface CharacterProfile {
  version: 1;
  displayName: string;
  alias: string;
  pronouns: string;
  bio: string;
  appearance: string;
  speciesId: string;
  ancestry: string;
  practiceIds: string[];
  affinity: string;
  interests: string[];
  homeDescription: string;
  portrait: string;
}

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function restoreCharacterProfile(value: any): CharacterProfile {
  const record = value && typeof value === 'object' ? value : {};
  const species = findSpeciesRecord(text(record.speciesId, 80));
  const portrait = typeof record.portrait === 'string' && record.portrait.length <= 250_000
    && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(record.portrait) ? record.portrait : '';
  return {
    version: 1, displayName: text(record.displayName, 80), alias: text(record.alias, 40),
    pronouns: text(record.pronouns, 40), bio: text(record.bio, 2000), appearance: text(record.appearance, 1200),
    speciesId: species && species.category !== 'Practices & statuses' ? species.id : '',
    ancestry: text(record.ancestry, 300), affinity: text(record.affinity, 160), portrait,
    practiceIds: [...new Set<string>(Array.isArray(record.practiceIds) ? record.practiceIds.filter((id: unknown) => typeof id === 'string' && findSpeciesRecord(id)?.category === 'Practices & statuses') : [])].slice(0, 12),
    interests: [...new Set<string>(Array.isArray(record.interests) ? record.interests.map((item: unknown) => text(item, 60)).filter(Boolean) : [])].slice(0, 12),
    homeDescription: text(record.homeDescription, 500),
  };
}

export function validateCharacterProfile(value: unknown): { ok: true; profile: CharacterProfile } | { ok: false; message: string } {
  const profile = restoreCharacterProfile(value);
  if (!profile.displayName) return { ok: false, message: 'Add a display name before saving.' };
  const witchTradition = profile.practiceIds.some(id => findSpeciesRecord(id)?.family === 'Witch tradition');
  if (witchTradition && findSpeciesRecord(profile.speciesId)?.name !== 'Witchkind' && !/\bwitchkind\b/i.test(profile.ancestry)) {
    return { ok: false, message: 'Witch traditions require Witchkind heritage. Choose Witchkind as your species or describe your Witchkind ancestry.' };
  }
  return { ok: true, profile };
}

export function personalDisplayName(gameplay: any): string {
  return restoreCharacterProfile(gameplay?.characterProfile).displayName || gameplay?.identity?.profileDisplayName || gameplay?.player?.name || 'Citizen';
}

/** Small, decoded image thumbnails keep personal profile saves portable. */
export async function readCharacterPortrait(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) throw new Error('Choose a PNG, JPEG, or WebP image up to 2 MB.');
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height) throw new Error('The image could not be read.');
    const scale = Math.min(1, 384 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preview is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const portrait = canvas.toDataURL('image/webp', 0.85);
    if (portrait.length > 250_000) throw new Error('Choose a simpler or smaller image.');
    return portrait;
  } finally { image.close(); }
}
