// Central map of the shipped visual assets to the apps that use them.
// Paths are public-root URLs (Vite serves frontend/public at /).

export type AssetCategory = 'icon' | 'ornament' | 'brand' | 'wallpaper' | 'image' | 'sound';

export interface AssetEntry {
  key: string;
  src: string;
  category: AssetCategory;
  label: string;
  tone?: string;
}

const ICON = '/icons/Icon set 1/Dark Icons/1x';
const ICON8 = '/icons/Icons8';

export const APP_ICON_ASSETS: Record<string, string> = {
  dgaos: `${ICON}/Lock x512.png`,
  meridionRegistry: `${ICON8}/icons8-male-user-16.svg`,
  documentStudio: `${ICON8}/icons8-opened-folder-16.svg`,
  creativeStudio: `${ICON}/Musick note x512.png`,
  passport: `${ICON8}/icons8-user-female-16.svg`,
  housing: `${ICON}/House x512.png`,
  jobs: `${ICON}/Market x512.png`,
  comms: `${ICON}/Message x512.png`,
  finance: `${ICON}/Money  x512.png`,
  browser: `${ICON}/Network  x512.png`,
  process: `${ICON}/Monitor x512.png`,
  vitals: `${ICON}/Plus x512.png`,
  campus: `${ICON8}/icons8-bookmark-16.svg`,
  study: `${ICON8}/icons8-bookmark-16.svg`,
  spellforge: `${ICON}/Wrench 1 x512.png`,
  fieldOperations: `${ICON}/Map x512.png`,
  maispace: '/images/icons8-speech-bubble-50.png',
  mail: `${ICON}/Mail x512.png`,
  post: `${ICON}/Download  x512.png`,
  files: `${ICON8}/icons8-folder-16.svg`,
  lore: `${ICON}/Star x512.png`,
  terminal: '/images/command line.png',
  settings: `${ICON}/Setting 1 x512.png`,
};

export const APP_ORNAMENTS: Record<string, string> = {
  documentStudio: '/media/ornaments/ornate-plaque.svg',
  creativeStudio: '/media/ornaments/floral-crest.svg',
  lore: '/media/ornaments/celestial-star.svg',
  passport: '/media/ornaments/botanical-corner.svg',
  maispace: '/media/ornaments/editorial-divider.svg',
};

export const BRAND_MARKS = {
  meridianMasthead: '/media/brands/meridian-masthead.svg',
  meridianMonogram: '/media/brands/meridian-monogram.svg',
  socialRegisterMasthead: '/media/brands/social-register-masthead.svg',
  socialRegisterMonogram: '/media/brands/social-register-monogram.svg',
};

export function iconAssetFor(appId: string): string | undefined {
  return APP_ICON_ASSETS[appId];
}

export function ornamentFor(appId: string): string | undefined {
  return APP_ORNAMENTS[appId];
}

// Apps that intentionally keep a Lucide glyph (no shipped art yet).
export const NO_CUSTOM_ICON: string[] = [];

export const ASSETS: AssetEntry[] = [
  ...Object.entries(APP_ICON_ASSETS).map(([key, src]) => ({
    key,
    src,
    category: 'icon' as const,
    label: key,
  })),
  ...Object.entries(APP_ORNAMENTS).map(([key, src]) => ({
    key: `ornament-${key}`,
    src,
    category: 'ornament' as const,
    label: `${key} ornament`,
  })),
  ...Object.entries(BRAND_MARKS).map(([key, src]) => ({
    key: `brand-${key}`,
    src,
    category: 'brand' as const,
    label: key.replace(/([A-Z])/g, ' $1').trim(),
  })),
  { key: 'wallpaper-aureline-city', src: '/images/wallpapers/aureline-city-beneath-the-heavens.png', category: 'wallpaper', label: 'City beneath the heavens' },
  { key: 'wallpaper-angel-bay', src: '/images/wallpapers/aureline-across-angel-bay.png', category: 'wallpaper', label: 'Across Angel Bay' },
  { key: 'wallpaper-glassline', src: '/images/wallpapers/aureline-glassline-twilight.png', category: 'wallpaper', label: 'Glassline twilight' },
  { key: 'image-terminal-output', src: '/images/TerminalOutput.svg', category: 'image', label: 'Terminal output' },
  { key: 'image-comms-window', src: '/images/comms_window.svg', category: 'image', label: 'Comms window' },
  { key: 'image-id-card-back', src: '/images/back_id_card.svg', category: 'image', label: 'ID card back' },
];