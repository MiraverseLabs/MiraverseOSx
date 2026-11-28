export type InterfaceAppearance = 'light' | 'dark' | 'system';
export type InterfaceDensity = 'compact' | 'comfortable';
export type InterfaceTextScale = 'small' | 'default' | 'large' | 'xlarge';
export type InterfaceReducedMotion = 'system' | 'reduce' | 'full';
export type InterfaceTransparency = 'full' | 'reduced' | 'solid';
export type NotificationMode = 'all' | 'important' | 'quiet';

export interface InterfacePreferences {
  appearance: InterfaceAppearance;
  density: InterfaceDensity;
  textScale: InterfaceTextScale;
  reducedMotion: InterfaceReducedMotion;
  transparency: InterfaceTransparency;
  musicVolume: number;
  effectsVolume: number;
  notifications: NotificationMode;
}

export const INTERFACE_STORAGE_KEY = 'miraverse-interface-v1';

function clampVolume(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function normalizeInterfacePreferences(value: unknown): InterfacePreferences {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    appearance: ['light', 'dark', 'system'].includes(record.appearance as string) ? record.appearance as InterfaceAppearance : 'system',
    density: record.density === 'comfortable' ? 'comfortable' : 'compact',
    textScale: ['small', 'default', 'large', 'xlarge'].includes(record.textScale as string) ? record.textScale as InterfaceTextScale : 'default',
    reducedMotion: ['system', 'reduce', 'full'].includes(record.reducedMotion as string) ? record.reducedMotion as InterfaceReducedMotion : 'system',
    transparency: ['full', 'reduced', 'solid'].includes(record.transparency as string) ? record.transparency as InterfaceTransparency : 'full',
    musicVolume: clampVolume(record.musicVolume, 45),
    effectsVolume: clampVolume(record.effectsVolume, 70),
    notifications: ['all', 'important', 'quiet'].includes(record.notifications as string) ? record.notifications as NotificationMode : 'all',
  };
}

export function readInterfacePreferences(): InterfacePreferences {
  try { return normalizeInterfacePreferences(JSON.parse(localStorage.getItem(INTERFACE_STORAGE_KEY) || '{}')); }
  catch { return normalizeInterfacePreferences(null); }
}

export function saveInterfacePreferences(value: InterfacePreferences) {
  try { localStorage.setItem(INTERFACE_STORAGE_KEY, JSON.stringify(normalizeInterfacePreferences(value))); }
  catch { /* Preferences still work for this session when browser storage is unavailable. */ }
}

export function resolveInterfaceAppearance(appearance: InterfaceAppearance, systemDark: boolean) {
  return appearance === 'system' ? systemDark ? 'dark' : 'light' : appearance;
}

export function resolveReducedMotion(pref: InterfaceReducedMotion, systemReduce: boolean): boolean {
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return systemReduce;
}

export const TEXT_SCALE_MULTIPLIERS: Record<InterfaceTextScale, string> = {
  small: '0.92',
  default: '1',
  large: '1.12',
  xlarge: '1.24',
};

/** Only device appearance & comfort changes cross tabs; never import gameplay or unrelated storage. */
export function subscribeInterfacePreferences(listener: (preferences: InterfacePreferences) => void, target: Pick<Window, 'addEventListener' | 'removeEventListener'>) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== INTERFACE_STORAGE_KEY && event.key !== null) return;
    let value: unknown = null;
    try { value = JSON.parse(event.newValue || 'null'); } catch { /* Reset malformed appearance preferences safely. */ }
    listener(normalizeInterfacePreferences(value));
  };
  target.addEventListener('storage', onStorage as EventListener);
  return () => target.removeEventListener('storage', onStorage as EventListener);
}
