/**
 * MERIDION WORLD SYSTEM
 * Canonical geography, Eight Realms (reconciling Ve’Raylia / Elmore / House Valmon),
 * historical chronology, celestial calendar & moons.
 * Sources authoritative records from frontend/src/game-content/ while preserving legacy exports.
 */
import placesCatalog from '../game-content/places/places.json' with { type: 'json' };
import historyCatalog from '../game-content/history/history.json' with { type: 'json' };

export interface RealmDefinition {
  id: string;
  name: string;
  element: string;
  season: string;
  capital: string;
  capitalIsStarred: boolean;
  secondaryAnchor?: string;
  rulingLineage: string;
  role: string;
  dangerLevel: number;
  regionCode: string;
  postalPrefix?: string;
  color: string;
  climate: string;
  subregions?: string[];
  landmarks: string[];
}

export const EIGHT_REALMS: RealmDefinition[] = placesCatalog.realms as RealmDefinition[];
/** @deprecated Preserved compatibility alias; returns all 8 canonical realms including Ve’Raylia. */
export const SEVEN_REALMS: RealmDefinition[] = EIGHT_REALMS;

export interface GeographicLandmark {
  id: string;
  name: string;
  designation: 'Ocean' | 'Sea' | 'Bay' | 'Gulf' | 'Subregion' | 'Archipelago' | 'Desert' | 'Volcanic Rift';
  parentRealm?: string;
  description: string;
}

export const GEOGRAPHIC_LANDMARKS: GeographicLandmark[] = placesCatalog.landmarks as GeographicLandmark[];

export interface ChronologyEra {
  id: string;
  period: string;
  title: string;
  summary: string;
  isMilestone?: boolean;
}

export const HISTORICAL_CHRONOLOGY: ChronologyEra[] = historyCatalog.eras as ChronologyEra[];

export interface MoonState {
  name: string;
  description: string;
  visualAspect: string;
  phaseName: string;
  phaseIcon: string;
  illuminationPercent: number;
}

export interface CelestialState {
  radiance: MoonState;
  echo: MoonState;
  alignment: string;
  isEclipsing: boolean;
  cycle: number;
  monthName: string;
  dayOfMonth: number;
  weekday: string;
  isFoundingDay: boolean;
}

const LUNAR_PHASES = [
  { name: 'New Moon', icon: '🌑', illumination: 0 },
  { name: 'Waxing Crescent', icon: '🌒', illumination: 25 },
  { name: 'First Quarter', icon: '🌓', illumination: 50 },
  { name: 'Waxing Gibbous', icon: '🌔', illumination: 75 },
  { name: 'Full Moon', icon: '🌕', illumination: 100 },
  { name: 'Waning Gibbous', icon: '🌖', illumination: 75 },
  { name: 'Last Quarter', icon: '🌗', illumination: 50 },
  { name: 'Waning Crescent', icon: '🌘', illumination: 25 },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Calculates real-time celestial and lunar states for Radiance and Echo based on game cycle count.
 */
export function getCelestialState(cycle: number = 28): CelestialState {
  // Radiance: Outer Moon (Larger, distant, 28-day orbital resonance)
  const radianceIndex = Math.floor(cycle) % 8;
  const radiancePhase = LUNAR_PHASES[radianceIndex];

  // Echo: Inner Moon (Smaller, nearer, faster 18-day orbital resonance)
  const echoIndex = Math.floor(cycle * 1.55) % 8;
  const echoPhase = LUNAR_PHASES[echoIndex];

  // In-universe calendar calculation:
  // Cycle 0 starts on Jan 1, Year 0.
  const dayOfYear = (cycle * 3) % 365;
  let runningDays = dayOfYear;
  let monthIndex = 0;
  const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let m = 0; m < daysInMonths.length; m++) {
    if (runningDays < daysInMonths[m]) {
      monthIndex = m;
      break;
    }
    runningDays -= daysInMonths[m];
  }
  const dayOfMonth = Math.floor(runningDays) + 1;
  const weekday = WEEKDAYS[Math.floor(cycle) % 7];
  const isFoundingDay = monthIndex === 2 && dayOfMonth === 6; // March 6

  let alignment = 'Harmonic Divergence';
  let isEclipsing = false;
  if (radianceIndex === echoIndex) {
    alignment = radianceIndex === 4 ? 'Grand Syzygy of Light' : 'Dual Eclipse Conjunction';
    isEclipsing = true;
  } else if (Math.abs(radianceIndex - echoIndex) === 4) {
    alignment = 'Counter-Phase Opposition';
  }

  return {
    radiance: {
      name: 'Radiance',
      description: 'Outer Moon — physically larger and farther away; appears large and luminous pale white in the sky.',
      visualAspect: 'Pale luminous pearl white with silvery coronal aura',
      phaseName: radiancePhase.name,
      phaseIcon: radiancePhase.icon,
      illuminationPercent: radiancePhase.illumination
    },
    echo: {
      name: 'Echo',
      description: 'Inner Moon — physically smaller and closer; appears smaller with a dark slate obsidian sheen.',
      visualAspect: 'Dark slate obsidian with reflective glassy luster',
      phaseName: echoPhase.name,
      phaseIcon: echoPhase.icon,
      illuminationPercent: echoPhase.illumination
    },
    alignment,
    isEclipsing,
    cycle,
    monthName: MONTHS[monthIndex],
    dayOfMonth,
    weekday,
    isFoundingDay
  };
}

export const REALM_POSTAL_PREFIXES: Record<string, string> = {
  Orynvell: 'OR',
  Fross: 'FR',
  Lumia: 'LM',
  Marlowe: 'MW',
  Brisland: 'BR',
  Kaji: 'KJ',
  Nephele: 'NP',
  'Ve’Raylia': 'VR',
  "Ve'Raylia": 'VR',
};

export const ROAD_CLASSES = [
  'Street',
  'Avenue',
  'Boulevard',
  'Road',
  'Lane',
  'Drive',
  'Court',
  'Way',
  'Crescent',
  'Parkway',
  'Highway',
  'Passage',
  'Quay',
  'Causeway',
  'Terrace',
] as const;

export interface HousingRepresentationTier {
  tier: 'Tier A' | 'Tier B' | 'Tier C';
  name: string;
  functionDescription: string;
}

export const HOUSING_TIERS: HousingRepresentationTier[] = [
  {
    tier: 'Tier A',
    name: 'Fully Interactive',
    functionDescription: 'Visitable, furnished rooms, storage, occupants, and detailed gameplay.',
  },
  {
    tier: 'Tier B',
    name: 'Simplified Visitable',
    functionDescription: 'Exterior/map location and selected interactions; limited interior.',
  },
  {
    tier: 'Tier C',
    name: 'Registered Only',
    functionDescription: 'Stable address and owner/residence records, no fully playable interior.',
  },
];

export interface CanonicalMailingAddress {
  recipient?: string;
  buildingNumberAndStreet: string;
  buildingAndUnit?: string;
  district?: string;
  city: string;
  realm: string;
  postalCode: string;
}

export function formatMailingAddress(addr: CanonicalMailingAddress): string {
  const parts: string[] = [];
  if (addr.recipient) parts.push(addr.recipient);
  parts.push(addr.buildingNumberAndStreet);
  if (addr.buildingAndUnit) parts.push(addr.buildingAndUnit);
  if (addr.district) parts.push(addr.district);
  parts.push(`${addr.city}, ${addr.realm} ${addr.postalCode}`);
  parts.push('Meridion');
  return parts.join(', ');
}
