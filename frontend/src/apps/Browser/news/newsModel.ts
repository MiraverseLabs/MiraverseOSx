import { restoreWorldPublications } from '../../../gameplay/WorldPublications.ts';
import type { CollectibleIssue } from '../../../components/media/templateModel';

export const NEWS_SECTIONS = ['All news', 'Civic', 'Security', 'Health', 'Economy', 'Culture'] as const;
export type NewsSection = typeof NEWS_SECTIONS[number];

export const MERIDIAN_DEPARTMENTS = [
  'All Desks',
  'World',
  'Politics',
  'Economy',
  'Society',
  'Science & Health',
  'Culture',
  'Environment',
  'Opinion',
  'Life',
  'Local Editions',
] as const;
export type MeridianDepartment = typeof MERIDIAN_DEPARTMENTS[number];

export interface NewsArticle {
  id: string;
  section: Exclude<NewsSection, 'All news'>;
  department?: Exclude<MeridianDepartment, 'All Desks'>;
  headline: string;
  summary: string;
  source: string;
  cycle: number;
  body: string[];
  kind: 'Reporting' | 'Service guide' | 'World advisory' | 'Analysis' | 'Opinion';
  link?: { app: string; label: string };
  assetId?: string;
  sourceRef?: { kind: 'work-order'; id: string; definitionId: string };
}

const STORIES: Omit<NewsArticle, 'cycle'>[] = [
  {
    id: 'civic-network',
    section: 'Civic',
    department: 'Local Editions',
    headline: 'One city. A thousand stories.',
    summary: 'The institutions, neighborhoods, and everyday decisions shaping life in Aureline.',
    source: 'The Meridian · Aureline Civic Desk',
    kind: 'Reporting',
    assetId: 'canon:place-aureline-heavens',
    body: [
      'Aureline is more than its command rooms. Behind every institutional dispatch is a resident finding work, a student preparing for study, or a household making room for another day.',
      'The Meridian brings the public life of Meridion into one edition: inter-realm reporting, service information, culture, and advisories drawn from the current state of the world.',
      'Start with Citizen Hub for personal services, WORKNET for employment, and the Royal Historic Archive for the places and histories behind today’s headlines.',
    ],
    link: { app: 'passport', label: 'Open Citizen Hub' },
  },
  {
    id: 'employment-guide',
    section: 'Economy',
    department: 'Economy',
    headline: 'Before your next shift, read the terms',
    summary: 'Employment, assignment pay, and cycle compensation serve different purposes.',
    source: 'The Meridian · Economy Desk',
    kind: 'Service guide',
    assetId: 'canon:place-depository',
    body: [
      'An available assignment is an invitation to review the work. It is not an employment record or a promise that every applicant already meets the requirements.',
      'WORKNET lists responsibilities, clearance requirements, and contract compensation before acceptance. Read the briefing and review the work stages before beginning.',
      'Cycle pay is separate from assignment rewards. Check your current contract for eligibility; reopening completed work does not create another payment.',
    ],
    link: { app: 'jobs', label: 'Explore WORKNET' },
  },
  {
    id: 'faith-recovery',
    section: 'Health',
    department: 'Science & Health',
    headline: 'After field work, make time for recovery',
    summary: 'Faith Medical’s personal tools put aura integrity and active conditions in view.',
    source: 'The Meridian · Science & Health Desk',
    kind: 'Service guide',
    body: [
      'Fatigue and aura integrity are part of everyday life in Meridion. A completed operation does not necessarily mean a resident is ready for another one.',
      'VITALS displays your current aura and active conditions. HOMECRAFT provides rest, while Faith Medical offers condition treatment through its public portal.',
      'World PRISM exposure and personal aura are different readings. Check both before returning to demanding work.',
    ],
    link: { app: 'vitals', label: 'Check your VITALS' },
  },
  {
    id: 'agency-records',
    section: 'Security',
    department: 'Politics',
    headline: 'Behind the bulletin: where public information ends',
    summary: 'Agency information and an investigator’s evidence notebook serve different purposes.',
    source: 'The Meridian · Standards & Governance Desk',
    kind: 'Reporting',
    body: [
      'Public information helps residents navigate institutions. It does not establish the cause of an incident, identify a suspect, or substitute for an authorized investigation.',
      'DGAOS houses agency work and its forensic laboratory. Evidence, working hypotheses, and draft findings belong in the relevant authorized workspace.',
      'The Meridian publishes verified public reporting and world advisories. Personal medical records, sealed case files, and private communications are never used as news copy.',
    ],
  },
  {
    id: 'seven-realms',
    section: 'Culture',
    department: 'World',
    headline: 'Beyond Aureline: a route across the Eight Realms',
    summary: 'Begin with the atlas, then follow the histories connecting the capital to every sovereign seat from Fross to Ve’Raylia.',
    source: 'The Meridian · World Desk',
    kind: 'Reporting',
    assetId: 'canon:place-angel-bay',
    body: [
      'Aureline sits in Orynvell, the celestial seat of Meridion. Its institutions are only one entry point into a wider eight-realm concord.',
      'The Royal Historic Archive brings together regional geography, ruling lineages—from House Seraphima to House Valmon in Elmore—landmarks, and the histories behind the Eight Realms.',
      'Explore a region beyond your current assignment. A familiar place name in a dispatch often carries a much longer history.',
    ],
    link: { app: 'lore', label: 'Explore the Royal Historic Archive' },
  },
  {
    id: 'campus-practice',
    section: 'Culture',
    department: 'Culture',
    headline: 'At Cyberium Academy, code meets spellcraft',
    summary: 'The academic portal brings institutional information and magic practice into one workspace.',
    source: 'The Meridian · Education & Culture Desk',
    kind: 'Reporting',
    assetId: 'canon:place-glassline-twilight',
    body: [
      'The Cyberium Academy connects technical study with the magical systems that shape Meridion.',
      'Its workspace includes an academic portal and a magic practice bench. The compiler combines modules into protocols and records discoveries.',
      'Practice draws on stamina. Review your condition and leave time for recovery between demanding sessions.',
    ],
    link: { app: 'campus', label: 'Visit Cyberium Academy' },
  },
  {
    id: 'neighborhood-pages',
    section: 'Culture',
    department: 'Life',
    headline: 'The neighborhood has a page of its own',
    summary: 'Personal journals, bulletins, official house accounts, and friendships find their home on mai.space.',
    source: 'The Meridian · Life & Society Desk',
    kind: 'Reporting',
    body: [
      'The public daily broadsheet is one way to follow the city. Personal and community expression has another home: mai.space.',
      'Residents, creators, cultural guilds, and public institutions publish updates, journals, and visual dispatches there.',
      'A personal post reflects its author’s perspective. Keep its source and verification tier in mind when following a story across the network.',
    ],
    link: { app: 'maispace', label: 'Visit mai.space' },
  },
];

const EXPANDED_DESK_STORIES: Omit<NewsArticle, 'cycle'>[] = [
  {
    id: 'meridian-environment-arcadia',
    section: 'Health',
    department: 'Environment',
    headline: 'Arcadia Biosphere Domes Report Clear Canopy Ionization Across Autumn Assays',
    summary: 'Ecological Wardens confirm stable mineral hydrology between Aureline’s perimeter domes and Ve’Raylia’s highland watersheds.',
    source: 'The Meridian · Environment Desk',
    kind: 'Reporting',
    body: [
      'Routine C14 soil and canopy assays conducted by the Arcadia Ecological Reserve show balanced ionization readings across Aureline’s botanical domes.',
      'Wardens credited coordinated watershed protocols shared with Elmore Heritage Conservatory stewards in Ve’Raylia.',
    ],
  },
  {
    id: 'meridian-society-concord',
    section: 'Culture',
    department: 'Society',
    headline: 'Regent Hall & Rosemont Salons Open Autumn Public Lecture Calendar',
    summary: 'Cross-realm civic forums and The Social Register’s inaugural folio highlight an active cultural season in Aureline.',
    source: 'The Meridian · Society Desk',
    kind: 'Reporting',
    assetId: 'canon:place-aureline-heavens',
    body: [
      'Public lectures on inter-realm treaty law, architectural conservation, and contemporary letters open this week across Regent Hall’s public portico and Rosemont Terrace.',
    ],
  },
  {
    id: 'meridian-opinion-civic-pace',
    section: 'Civic',
    department: 'Opinion',
    headline: 'Editorial: Reliable Institutions Depend on Transparent Records, Not Haste',
    summary: 'Why careful verification in Orynvell’s registries and newsrooms protects public trust across all eight realms.',
    source: 'The Meridian Editorial Board · Opinion',
    kind: 'Opinion',
    body: [
      'In a connected operating environment where notices travel in seconds, accuracy matters more than speed. A public record earns authority because its provenance, custodian, and scope remain clear.',
    ],
  },
];

// Only public authored copy and aggregate world conditions enter this edition.
// Never publish arbitrary event logs, private messages, or investigation drafts.
export function newsExposure(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

/**
 * Core 8-story edition preserved for exact backward compatibility with existing
 * saves (`gameplay.pulseNews`) and `pulse-news.test.mjs` verification contracts.
 */
export function buildNewsEdition(input: { cycle?: number; corruption?: number; publications?: unknown }): NewsArticle[] {
  const cycle = Number.isSafeInteger(input.cycle) && input.cycle! >= 0 ? input.cycle! : 28;
  const exposure = newsExposure(input.corruption);
  const elevated = exposure >= 15;
  const advisory: NewsArticle = {
    id: 'prism-watch',
    section: 'Security',
    department: 'World',
    cycle,
    assetId: 'canon:place-transit-junction',
    headline: elevated ? 'PRISM exposure elevated across the world grid' : 'World grid watch: keeping PRISM exposure in view',
    summary: `The current world reading is ${exposure.toFixed(1)}%. ${elevated ? 'Review personal conditions before demanding activity.' : 'Routine monitoring remains part of daily preparation.'}`,
    source: 'The Meridian · World Grid Desk',
    kind: 'World advisory',
    body: [
      `The world grid currently records PRISM exposure at ${exposure.toFixed(1)}%. This advisory follows the current world reading and updates as conditions change.`,
      'The reading describes world conditions, not the health of an individual resident. VITALS provides your personal aura and active conditions.',
      'Rest and review your status before returning to field work. This bulletin does not identify an incident’s cause or publish private investigation findings.',
    ],
    link: { app: 'vitals', label: 'Open personal VITALS' },
  };
  return [
    advisory,
    ...restoreWorldPublications(input.publications).stories.filter(s => s.cycle <= cycle).map(s => ({ ...s, section: 'Civic' as const, department: 'Local Editions' as const, source: 'The Meridian · WORKNET public service release', kind: 'Reporting' as const })),
    ...STORIES.map((story, index) => ({ ...story, cycle: Math.max(0, 28 - Math.floor(index / 3)) })).filter(story => story.cycle <= cycle),
  ];
}

/**
 * Full 10-department Meridian edition uniting the 8 core dispatches, expanded desk
 * coverage, and any published newspaper artifacts from Creative/Dynamic Studio.
 */
export function buildMeridianExpandedEdition(input: {
  cycle?: number;
  corruption?: number;
  publications?: unknown;
  publishedArtifacts?: { id: string; channel: string; publisherOrgId?: string; publishedCycle: number; authorName: string; slotValues: any; verificationTier?: string }[];
}): NewsArticle[] {
  const core = buildNewsEdition(input);
  const cycle = Number.isSafeInteger(input.cycle) && input.cycle! >= 0 ? input.cycle! : 28;
  const studioStories: NewsArticle[] = (input.publishedArtifacts || [])
    .filter(a => a.channel === 'newspaper' && a.publishedCycle <= cycle)
    .map(a => ({
      id: a.id,
      section: 'Civic' as const,
      department: (MERIDIAN_DEPARTMENTS.includes(a.slotValues?.kicker) ? a.slotValues.kicker : 'World') as Exclude<MeridianDepartment, 'All Desks'>,
      headline: a.slotValues?.headline || 'Meridian Dispatch',
      summary: a.slotValues?.subhead || 'Reported for The Meridian.',
      source: a.slotValues?.byline || `${a.authorName} · The Meridian`,
      cycle: a.publishedCycle || cycle,
      body: String(a.slotValues?.body || a.slotValues?.subhead || '').split(/\n+/).filter(Boolean),
      kind: a.verificationTier === 'opinion' || a.verificationTier === 'personal_perspective' ? 'Opinion' as const : a.verificationTier === 'promo' ? 'Service guide' as const : 'Reporting' as const,
      assetId: a.slotValues?.imageAssetId,
    }));
  const extras = EXPANDED_DESK_STORIES.map((s, idx) => ({ ...s, cycle: Math.max(0, cycle - (idx % 2)) }));
  return [...core.slice(0, 1), ...studioStories, ...core.slice(1), ...extras];
}

export function buildMeridianCollectibleIssue(input: { cycle?: number; corruption?: number; publications?: unknown }): CollectibleIssue {
  const edition = buildMeridianExpandedEdition(input);
  const cycle = Number.isSafeInteger(input.cycle) && input.cycle! >= 0 ? input.cycle! : 28;
  const lead = edition[0];
  return {
    id: `meridian-cycle-${cycle}`,
    publicationId: 'the-meridian',
    brandKitId: 'the-meridian',
    issueNumber: `EDITION · CYCLE ${cycle}`,
    title: 'The Meridian',
    theme: 'News • Analysis • Perspective Across the Eight Realms',
    cycle,
    publishedLabel: `Aureline Daily Broadsheet · Cycle ${cycle}`,
    priceCredits: 5,
    pages: [
      {
        id: 'mer-p1',
        pageNumber: 1,
        kind: 'cover',
        department: 'World',
        kicker: `FRONT PAGE · WORLD & GRID DESK`,
        headline: lead.headline,
        subhead: lead.summary,
        byline: lead.source,
        assetId: 'canon:place-transit-junction',
        paragraphs: lead.body,
      },
      {
        id: 'mer-p2',
        pageNumber: 2,
        kind: 'feature',
        department: 'Economy',
        kicker: 'ECONOMY & WORKNET',
        headline: 'Contract Terms, Cycle Stipends & Public Trade Across Aureline',
        subhead: 'Understanding municipal payroll, clearance tiers, and inter-realm freight.',
        byline: 'The Meridian Economy Desk',
        assetId: 'canon:place-depository',
        paragraphs: STORIES[1].body,
      },
      {
        id: 'mer-p3',
        pageNumber: 3,
        kind: 'feature',
        department: 'Environment',
        kicker: 'ENVIRONMENT & THE EIGHT REALMS',
        headline: 'From Arcadia’s Domes to Ve’Raylia’s Groves: Ecological Assays Hold Steady',
        subhead: 'Coordinated stewardship keeps canopy ionization balanced.',
        byline: 'The Meridian Environment & World Desks',
        assetId: 'canon:place-angel-bay',
        paragraphs: [...EXPANDED_DESK_STORIES[0].body, STORIES[4].body[0]],
      },
      {
        id: 'mer-p4',
        pageNumber: 4,
        kind: 'advertisement',
        kicker: 'PUBLIC NOTICES & CLASSIFIEDS',
        headline: 'Classifieds, Academic Admissions & Guild Notices',
        subhead: 'Meridian Press House · 18 Meridian Quay, Glassline District',
        adSponsor: 'Rhyna Horology & Optics · WORKNET Public Commissions',
        paragraphs: [
          'RHYNA HOROLOGY & OPTICS — Dual-phase astronomical chronometers calibrated to Radiance and Echo. Available at Solar Spire Quarter & Aureline Promenade.',
          'MERIDIAN NEWSROOM RECRUITMENT — Seeking correspondents, copy editors, and photojournalists via WORKNET Press & Publishing track.',
        ],
      },
    ],
  };
}

export interface NewsReadingState {
  saved: string[];
  read: string[];
}

export function restoreNewsReading(value: unknown): NewsReadingState {
  const record = value && typeof value === 'object' ? (value as Partial<NewsReadingState>) : {};
  const ids = (items: unknown) =>
    Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === 'string' && id.length <= 160))].slice(-500) : [];
  return { saved: ids(record.saved), read: ids(record.read) };
}

export function filterNews(articles: NewsArticle[], section: NewsSection, query: string, savedOnly: boolean, saved: string[]) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return articles.filter(
    article =>
      (section === 'All news' || article.section === section) &&
      (!savedOnly || saved.includes(article.id)) &&
      words.every(word => `${article.headline} ${article.summary} ${article.source} ${article.body.join(' ')}`.toLowerCase().includes(word)),
  );
}
