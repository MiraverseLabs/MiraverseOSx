import type { CollectibleIssue } from '../../../components/media/templateModel';
import { createPublicSearch } from '../publicSearch';

export const SOCIAL_REGISTER_SITE = {
  name: 'The Social Register',
  domain: 'socialregister.mer',
  altDomains: ['socialregister.aure'],
  url: 'https://socialregister.mer',
} as const;

export const SOCIAL_REGISTER_DEPARTMENTS = [
  'All Departments',
  'Society',
  'The Courts',
  'Style',
  'The Interview',
  'Residences',
  'Heritage',
  'The Social Calendar',
  'Arts & Patronage',
  'Travel',
  'Modern Life',
] as const;

export type SocialRegisterDepartment = (typeof SOCIAL_REGISTER_DEPARTMENTS)[number];

export interface SocialRegisterArticle {
  id: string;
  department: Exclude<SocialRegisterDepartment, 'All Departments'>;
  headline: string;
  deck: string;
  byline: string;
  pullQuote?: string;
  cycle: number;
  assetId?: string;
  entityId?: string;
  body: string[];
  calendarEvent?: {
    title: string;
    venue: string;
    cycleNote: string;
  };
}

export const SOCIAL_REGISTER_ARTICLES: readonly SocialRegisterArticle[] = [
  {
    id: 'sr-courts-concord-etiquette',
    department: 'The Courts',
    headline: 'Eight Banners Beneath Two Moons: How Crown Sanctum Reimagined the Concord Reception',
    deck: 'Between hereditary protocol and a new generation of Regent Hall envoys, court ceremony in Aureline is growing quieter, sharper, and unmistakably modern.',
    byline: 'By Lady Celestine Vane · Court Correspondent',
    pullQuote: 'Protocol endures longest when it remembers why people gathered in the hall to begin with.',
    cycle: 28,
    assetId: 'canon:place-aureline-heavens',
    entityId: 'FAC_SERAPHIMA',
    body: [
      'When lanterns are raised along the Crown Sanctum terrace overlooking Angel Bay, the old order of precedence still governs the doors—yet the conversations inside sound altogether contemporary.',
      'Representatives of all eight royal seats, from House Seraphima in Orynvell and House Lucia in Lumia to House Valmon’s highland delegates from Elmore in Ve’Raylia, now share the gallery with Cyberium fellows and municipal chancellors.',
      'Rather than discarding Founding-era custom, court chamberlains have pared away theatrical excess in favor of crisp ceremonial tailoring, chamber ensembles from the Velvet Studio, and open policy salons that stretch well past moonrise.',
    ],
  },
  {
    id: 'sr-society-angel-bay-salons',
    department: 'Society',
    headline: 'The Return of the Evening Salon Along Glassline & Rosemont Terrace',
    deck: 'Intimate supper tables of twelve are eclipsing cavernous ballroom spectacles among Aureline’s cultural hosts.',
    byline: 'By Margot Delacroix · Society Desk',
    pullQuote: 'A memorable evening requires one bold thinker, one patient listener, and zero uninvited cameras.',
    cycle: 28,
    assetId: 'canon:place-angel-bay',
    entityId: 'REG_ORYNVELL',
    body: [
      'Across Crown Terrace and the upper Glassline promenades, Aureline’s most coveted invitations no longer arrive with gilded trumpeters; they arrive on heavy thistle-tinted Rag paper written in fountain ink.',
      'Hosted by archivists, diplomats, and independent patrons alike, these twelve-seat suppers pair Northwake botanical infusions with unhurried debate over architecture, literature, and inter-realm travel.',
    ],
  },
  {
    id: 'sr-style-thistle-and-bullion',
    department: 'Style',
    headline: 'Velvet, Thistle Silk & Restrained Gold: Inside Maison Seraphine’s Autumn Atelier',
    deck: 'Structured silhouettes inspired by Northwake cloaks and Orynvell court mantles define the season’s enduring wardrobe.',
    byline: 'By Camille Laurent · Style Director',
    pullQuote: 'True luxury never shouts over the wearer; it catches the candlelight when they turn.',
    cycle: 28,
    entityId: 'ORG_ATELIER_SERAPHINE',
    body: [
      'In Maison Seraphine’s sunlit Crown Promenade workrooms, seamstresses are setting aside ephemeral novelty for garments engineered to last a generation.',
      'Deep Old Burgundy wool-velvets, cool slate silks woven in Brisland, and delicate Pearl Gold botanical embroidery anchor a collection designed equally for Regent Hall convocations and evening concerts at The Velvet.',
    ],
  },
  {
    id: 'sr-interview-vivienne-rose',
    department: 'The Interview',
    headline: 'In Conversation: Artistic Director Vivienne Rose on Staging Light Without Illusion',
    deck: 'The Velvet Cultural Studio’s creative head reflects on acoustic honesty, mentoring young creators, and why machine polish can never replace human nerve.',
    byline: 'Interview by Julian Sterling',
    pullQuote: 'Spectacle is easy in an age of resonance projectors. Intimacy is the difficult craft.',
    cycle: 27,
    entityId: 'ORG_VELVET_STUDIO',
    body: [
      'THE SOCIAL REGISTER: You stripped half the holographic rigs from the main Promenade stage this season. Were patrons startled?',
      'VIVIENNE ROSE: For approximately four minutes. Then the cellist drew her first bow against bare limestone and walnut paneling, and the entire room leaned forward together. Technology should serve presence, never disguise its absence.',
      'THE SOCIAL REGISTER: What do you look for when reviewing portfolios from young MAI.SPACE photographers and designers?',
      'VIVIENNE ROSE: Restraint and point of view. Show me how twilight actually falls across a rainy transit platform in Aureline—not an idealized daydream with the texture ironed out.',
    ],
  },
  {
    id: 'sr-residences-living-with-craft',
    department: 'Residences',
    headline: 'Quiet Proportions: Inside Glassline’s Restored Limestone Apartments & Elmore Conservatories',
    deck: 'Warm walnut joinery, brass reading lamps, and Ve’Raylian cedar cabinetry bring permanence to contemporary city dwellings.',
    byline: 'By Henrik Lindqvist · Architecture & Interiors',
    pullQuote: 'A room succeeds when every object on the writing desk has earned its keep.',
    cycle: 27,
    assetId: 'canon:place-suite-4b',
    entityId: 'loc-suite-4b',
    body: [
      'Whether in an upper-story Glassline apartment overlooking Aureline’s twin-moon skyline or a timber-and-stone sanctuary in Elmore, Meridion’s finest interiors share an unmistakable calm.',
      'Plaster walls in soft mineral tones, glass-front keepsake bookcases, and hand-loomed sage textiles allow lived-in notebooks, ceramics, and correspondence to tell the inhabitant’s story.',
    ],
  },
  {
    id: 'sr-heritage-valmon-charters',
    department: 'Heritage',
    headline: 'Keepers of the Living Stone: House Valmon and the Sacred Groves of Ve’Raylia',
    deck: 'How the eighth realm’s stewardship charters shaped centuries of botanical conservation and highland craft.',
    byline: 'By Archivist Rowan & The Heritage Desk',
    pullQuote: 'In Elmore, an estate is measured not by its walls, but by the age of the canopy it protects.',
    cycle: 27,
    entityId: 'REG_VERAYLIA',
    body: [
      'Long before modern transit linked Aureline’s archives with the outer realms, scribes in Elmore recorded land tenure alongside watershed health and ancient grove boundaries.',
      'In cooperation with the Royal Historic Society, newly digitized folios illuminate how House Valmon balanced agricultural abundance in Ve’Raylia’s fertile valleys with strict sanctuary law around its monumental stone formations.',
    ],
  },
  {
    id: 'sr-calendar-season-openings',
    department: 'The Social Calendar',
    headline: 'The Concord & Equinox Register: Ten Gatherings Worth Your Evening Attire',
    deck: 'From chamber recitals at The Velvet and Royal Archive manuscript viewings to botanical twilight walks in Arcadia.',
    byline: 'Compiled by The Social Register Desk',
    cycle: 28,
    assetId: 'canon:place-glassline-twilight',
    entityId: 'ORG_SOCIAL_REGISTER',
    calendarEvent: {
      title: 'Rosemont Terrace Inaugural Issue Gala & Chamber Salon',
      venue: 'Rosemont Editorial House, 7 Rosemont Terrace, Aureline',
      cycleNote: 'Evening Reception · Formal or Heritage Attire',
    },
    body: [
      '1. Rosemont Terrace Inaugural Salon — Celebrating Issue 01 ("Between Tradition and Tomorrow") with string quartets and archival portrait plates.',
      '2. Royal Historic Society Folio Exhibition — Public viewing of Founding-year treaties and twin-moon astronomical tables.',
      '3. Velvet Cultural Studio Midnight Soundscape — Acoustic and harmonic showcase featuring emerging Aureline composers.',
    ],
  },
  {
    id: 'sr-arts-patronage-endowments',
    department: 'Arts & Patronage',
    headline: 'The New Micro-Patrons: How Young Guilds Are Funding Restoration & Living Artists',
    deck: 'Collective stipends and transparent ORYN cultural grants are opening patronage beyond hereditary estates.',
    byline: 'By Clara Thorne · Arts & Philanthropy',
    cycle: 26,
    assetId: 'canon:place-depository',
    entityId: 'FAC_ROYAL_HISTORY',
    body: [
      'Cultural philanthropy in Aureline is no longer the exclusive province of grand dynastic trusts. Across Dawn University, Cyberium, and neighborhood reading circles, pooled micro-endowments are commissioning chamber scores, manuscript conservation, and independent documentary photography.',
    ],
  },
  {
    id: 'sr-travel-rhyna-to-elodia',
    department: 'Travel',
    headline: 'By Sea-Lantern and Trade Wind: A Slow Passage from Lumia’s Solar Coast to Elodia',
    deck: 'Crossing the Glowing Gulf of Meri aboard Brisland’s timber packet ships restores the art of unhurried arrival.',
    byline: 'By Caspian Ward · Travel Correspondent',
    cycle: 26,
    entityId: 'REG_BRISLAND',
    body: [
      'Departing Rhyna as late afternoon gold settles across the Solar Spire, coastal vessels trace the bioluminescent waters of the Glowing Gulf of Meri before catching Brisland’s steady autumn gales toward Elodia Bell Tower.',
    ],
  },
  {
    id: 'sr-modern-life-digital-grace',
    department: 'Modern Life',
    headline: 'Unhurried Correspondence in an Always-On OS: The Case for Thoughtful Letters',
    deck: 'Between WORKNET shifts, AureMail dispatches, and MAI.SPACE journals, citizens are rediscovering deliberate boundaries.',
    byline: 'By Dr. Sharon Voss · Guest Essayist',
    pullQuote: 'Rest is not an absence of ambition; it is the ground from which clear judgment grows.',
    cycle: 28,
    entityId: 'FAC_FAITH_MED',
    body: [
      'Living inside an interconnected civic network makes instant reply effortless—and quiet reflection rare. Setting aside one evening hour for a handwritten note, a pot of mint infusion, or an unhurried journal entry restores perspective no notification chime can supply.',
    ],
  },
];

export function buildSocialRegisterIssue01(cycle = 28): CollectibleIssue {
  return {
    id: 'sr-issue-01',
    publicationId: 'the-social-register',
    brandKitId: 'the-social-register',
    issueNumber: 'ISSUE 01',
    title: 'The Social Register',
    theme: 'Between Tradition and Tomorrow',
    cycle,
    publishedLabel: 'Inaugural Collectible Folio · Year 1000',
    priceCredits: 25,
    pages: [
      {
        id: 'sr01-p1',
        pageNumber: 1,
        kind: 'cover',
        kicker: 'INAUGURAL COLLECTIBLE EDITION · ISSUE 01',
        headline: 'Between Tradition and Tomorrow',
        subhead: 'Eight Realms, Ten Departments, and the Living Craft of Society in the Era of Maeryn',
        assetId: 'canon:place-aureline-heavens',
        paragraphs: [
          'THE COURTS · Eight Banners Beneath Two Moons at Crown Sanctum',
          'THE INTERVIEW · Vivienne Rose on Presence, Restraint & The Velvet Stage',
          'RESIDENCES · Limestone Proportions in Aureline & Elmore Sanctuaries',
          'STYLE & HERITAGE · Maison Seraphine’s Autumn Velvets & House Valmon’s Living Stone',
        ],
      },
      {
        id: 'sr01-p2',
        pageNumber: 2,
        kind: 'editor-letter',
        kicker: 'LETTER FROM ROSEMONT TERRACE',
        headline: 'Why Chronicle Society Now?',
        subhead: 'An inaugural note from the Editorial Salon of The Social Register',
        byline: 'The Editors · 7 Rosemont Terrace, Aureline',
        pullQuote: 'We chronicle neither rumor nor vanity, but the enduring texture of an inhabited world.',
        paragraphs: [
          'Welcome to the first collectible edition of The Social Register. Across Orynvell, Fross, Lumia, Marlowe, Brisland, Kaji, Nephele, and Ve’Raylia, public life is shaped equally by ancient charters and by the quiet choices citizens make every cycle.',
          'Within these pages, ten dedicated desks observe court ceremony, architecture, dress, scholarship, travel, and modern relationships with an attentive, respectful eye.',
        ],
      },
      {
        id: 'sr01-p3',
        pageNumber: 3,
        kind: 'department-opener',
        department: 'The Courts',
        kicker: 'THE COURTS',
        headline: 'Eight Banners Beneath Two Moons',
        subhead: 'How Crown Sanctum balanced Founding-era ceremony with contemporary civic dialogue.',
        byline: 'By Lady Celestine Vane',
        pullQuote: 'Protocol endures longest when it remembers why people gathered in the hall to begin with.',
        assetId: 'canon:place-angel-bay',
        paragraphs: SOCIAL_REGISTER_ARTICLES[0].body,
      },
      {
        id: 'sr01-p4',
        pageNumber: 4,
        kind: 'interview',
        department: 'The Interview',
        kicker: 'THE INTERVIEW',
        headline: 'Vivienne Rose on Staging Light Without Illusion',
        subhead: 'Inside The Velvet Cultural Studio’s turn toward acoustic and visual honesty.',
        byline: 'Interview by Julian Sterling',
        pullQuote: 'Spectacle is easy in an age of resonance projectors. Intimacy is the difficult craft.',
        entityId: 'ORG_VELVET_STUDIO',
        paragraphs: SOCIAL_REGISTER_ARTICLES[3].body,
      },
      {
        id: 'sr01-p5',
        pageNumber: 5,
        kind: 'feature',
        department: 'Residences',
        kicker: 'RESIDENCES & HERITAGE',
        headline: 'Quiet Proportions: From Glassline Suites to Elmore’s Cedar Halls',
        subhead: 'Architectural permanence in Aureline and House Valmon’s highland sanctuaries.',
        byline: 'By Henrik Lindqvist & Archivist Rowan',
        assetId: 'canon:place-suite-4b',
        paragraphs: [...SOCIAL_REGISTER_ARTICLES[4].body, SOCIAL_REGISTER_ARTICLES[5].body[0]],
      },
      {
        id: 'sr01-p6',
        pageNumber: 6,
        kind: 'feature',
        department: 'The Social Calendar',
        kicker: 'THE SOCIAL CALENDAR & MODERN LIFE',
        headline: 'The Equinox Register & Unhurried Evenings',
        subhead: 'Gatherings across Aureline and reflections on deliberate living.',
        byline: 'The Social Register Desk & Dr. Sharon Voss',
        assetId: 'canon:place-glassline-twilight',
        paragraphs: [...SOCIAL_REGISTER_ARTICLES[6].body, SOCIAL_REGISTER_ARTICLES[9].body[0]],
      },
      {
        id: 'sr01-p7',
        pageNumber: 7,
        kind: 'advertisement',
        kicker: 'MAISON PLACEMENT',
        headline: 'Maison Seraphine · Crown Promenade',
        subhead: 'Ceremonial Tailoring, Thistle Silk & Celestial Bullion Embroidery Since Year 412',
        adSponsor: 'Maison Seraphine (Aureline) & Rhyna Horology (Lumia)',
        entityId: 'ORG_ATELIER_SERAPHINE',
        paragraphs: [
          'Private fittings by appointment at 14 Crown Promenade, Aureline. Accompanying dual-moon astronomical chronometers crafted in Rhyna by Rhyna Horology & Optics.',
          'Also steeped for evening reading rooms: Northwake Apothecary & Tea Co. Glacial Mint & Frostbloom infusions.',
        ],
      },
    ],
  };
}

export interface SocialRegisterLocation {
  department: SocialRegisterDepartment;
  articleId: string | null;
  view: 'digital' | 'issue-01';
  query: string;
  valid: boolean;
}

const deptSlug = (d: SocialRegisterDepartment) => d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function socialRegisterUrl(input: Partial<SocialRegisterLocation> = {}): string {
  const url = new URL(SOCIAL_REGISTER_SITE.url);
  if (input.view === 'issue-01') {
    url.pathname = '/issue/01';
  } else if (input.articleId) {
    url.pathname = `/article/${encodeURIComponent(input.articleId)}`;
  } else if (input.department && input.department !== 'All Departments') {
    url.pathname = `/department/${deptSlug(input.department)}`;
  }
  if (input.query) url.searchParams.set('q', input.query);
  return url.href.replace(/\/$/, '');
}

export function parseSocialRegisterLocation(rawUrl: string): SocialRegisterLocation {
  const fallback: SocialRegisterLocation = { department: 'All Departments', articleId: null, view: 'digital', query: '', valid: false };
  try {
    const u = new URL(rawUrl);
    if (![SOCIAL_REGISTER_SITE.domain, ...SOCIAL_REGISTER_SITE.altDomains].includes(u.hostname as any)) return fallback;
    const path = u.pathname.replace(/\/$/, '') || '/';
    const query = u.searchParams.get('q') || '';
    if (path === '/') return { ...fallback, query, valid: true };
    if (path === '/issue/01') return { ...fallback, view: 'issue-01', query, valid: true };
    if (path.startsWith('/department/')) {
      const slug = path.split('/')[2] || '';
      const found = SOCIAL_REGISTER_DEPARTMENTS.find(d => deptSlug(d) === slug);
      if (found) return { ...fallback, department: found, query, valid: true };
    }
    if (path.startsWith('/article/')) {
      const id = decodeURIComponent(path.split('/')[2] || '');
      if (id) return { ...fallback, articleId: id, query, valid: true };
    }
  } catch {
    // Invalid URLs fall back cleanly
  }
  return fallback;
}

export function socialRegisterSearchRecords(query: string) {
  const items = SOCIAL_REGISTER_ARTICLES.map(a => ({
    id: `socialregister:${a.id}`,
    type: 'site' as const,
    title: `${a.headline} · The Social Register`,
    summary: `${a.department} — ${a.deck}`,
    publisher: SOCIAL_REGISTER_SITE.name,
    url: socialRegisterUrl({ articleId: a.id }),
    keywords: `${a.department} ${a.byline} social register magazine`,
  }));
  const search = createPublicSearch(items);
  return search(query).map(({ keywords, ...rest }) => rest);
}
