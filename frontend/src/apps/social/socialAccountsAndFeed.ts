import type { PublishedMediaArtifact } from '../../components/media/templateModel';

export type SocialAccountFamily =
  | 'personal'
  | 'creator'
  | 'business'
  | 'institutional'
  | 'royal'
  | 'media';

export interface OfficialSocialAccount {
  id: string;
  handle: string;
  name: string;
  family: Exclude<SocialAccountFamily, 'personal'>;
  verifiedLabel: string;
  brandKitId: string;
  organizationId: string;
  location: string;
  bio: string;
  avatarMonogram: string;
}

export const ACCOUNT_FAMILY_LABELS: Record<SocialAccountFamily, string> = {
  personal: 'Personal Citizen',
  creator: 'Creator & Guild',
  business: 'Maison & Commerce',
  institutional: 'Civic & Academic',
  royal: 'Royal & Chancery',
  media: 'Press & Periodical',
};

export const OFFICIAL_SOCIAL_ACCOUNTS: readonly OfficialSocialAccount[] = [
  {
    id: 'acct:themeridian',
    handle: 'themeridian',
    name: 'The Meridian',
    family: 'media',
    verifiedLabel: 'Flagship Daily Broadsheet',
    brandKitId: 'the-meridian',
    organizationId: 'ORG_THE_MERIDIAN',
    location: 'Meridian Press House · Aureline',
    bio: 'News • Analysis • Perspective across all Eight Realms. Public dispatches, grid advisories, and investigative reporting.',
    avatarMonogram: 'M',
  },
  {
    id: 'acct:thesocialregister',
    handle: 'thesocialregister',
    name: 'The Social Register',
    family: 'media',
    verifiedLabel: 'Society & Culture Magazine',
    brandKitId: 'the-social-register',
    organizationId: 'ORG_SOCIAL_REGISTER',
    location: '7 Rosemont Terrace · Aureline',
    bio: 'Chronicle of The Courts, Style, Residences, Heritage, Patronage, and Modern Life. Issue 01: “Between Tradition and Tomorrow” out now.',
    avatarMonogram: 'SR',
  },
  {
    id: 'acct:crownsanctum',
    handle: 'crownsanctum',
    name: 'Crown Sanctum Chancery',
    family: 'royal',
    verifiedLabel: 'Sovereign Court Office',
    brandKitId: 'the-social-register',
    organizationId: 'FAC_SERAPHIMA',
    location: 'Crown District · Aureline, Orynvell',
    bio: 'Official ceremonial calendar, Concord proclamations, and diplomatic notices of House Seraphima and the Eight Realms.',
    avatarMonogram: 'CS',
  },
  {
    id: 'acct:regenthall',
    handle: 'regenthall',
    name: 'Regent Hall Convocation',
    family: 'royal',
    verifiedLabel: 'Royal Inter-Realm University',
    brandKitId: 'the-social-register',
    organizationId: 'ORG_REGENT_HALL',
    location: 'Concord Precinct',
    bio: '“Eight Realms, One Duty.” Public lectures, Concord Procession updates, and royal-service convocations.',
    avatarMonogram: 'RH',
  },
  {
    id: 'acct:velvetcultural',
    handle: 'velvetcultural',
    name: 'Vivienne Rose · Velvet Studio',
    family: 'creator',
    verifiedLabel: 'Cultural Guild & Stage',
    brandKitId: 'velvet-studio',
    organizationId: 'ORG_VELVET_STUDIO',
    location: 'Promenade Quarter · Aureline',
    bio: 'Acoustic chamber nights, holographic exhibitions, editorial photography, and emerging Aureline soundscapes.',
    avatarMonogram: 'VS',
  },
  {
    id: 'acct:cyberiumacademy',
    handle: 'cyberiumacademy',
    name: 'Cyberium Academy',
    family: 'institutional',
    verifiedLabel: 'Polytechnic & Arcane Institute',
    brandKitId: 'the-meridian',
    organizationId: 'ORG_CYBERIUM',
    location: 'Academic Vector · Aureline',
    bio: 'Campus dispatches, Compiler Lab showcases, term calendars, and student research symposia.',
    avatarMonogram: 'CA',
  },
  {
    id: 'acct:faithmedical',
    handle: 'faithmedical',
    name: 'Faith Medical Public Desk',
    family: 'institutional',
    verifiedLabel: 'Clinical & Bio-Aura Health',
    brandKitId: 'unbranded-modern',
    organizationId: 'FAC_FAITH_MED',
    location: 'Sanctuary Hospital · Aureline',
    bio: 'Seasonal wellness advisories, VITALS recovery guidance, and community clinic hours. Never shares patient charts.',
    avatarMonogram: 'FM',
  },
  {
    id: 'acct:maisonseraphine',
    handle: 'maisonseraphine',
    name: 'Maison Seraphine',
    family: 'business',
    verifiedLabel: 'Couture & Fine Atelier',
    brandKitId: 'the-social-register',
    organizationId: 'ORG_ATELIER_SERAPHINE',
    location: 'Crown Promenade · Aureline',
    bio: 'Structured velvet tailoring, thistle-silk evening wear, and bullion embroidery crafted in Aureline since Year 412.',
    avatarMonogram: 'MS',
  },
  {
    id: 'acct:rhynahorology',
    handle: 'rhynahorology',
    name: 'Rhyna Horology & Optics',
    family: 'business',
    verifiedLabel: 'Precision Instruments · Lumia',
    brandKitId: 'the-meridian',
    organizationId: 'ORG_SOLAR_CHRONO',
    location: 'Solar Spire Quarter · Rhyna',
    bio: 'Dual-moon chronometers calibrated to Radiance and Echo, plus glassplate optical lenses for press and archive work.',
    avatarMonogram: 'RH',
  },
  {
    id: 'acct:northwaketea',
    handle: 'northwaketea',
    name: 'Northwake Apothecary & Tea',
    family: 'business',
    verifiedLabel: 'Artisan Botanicals · Fross',
    brandKitId: 'unbranded-editorial',
    organizationId: 'ORG_NORTHWAKE_BOTANICALS',
    location: 'Southwake & Glassline',
    bio: 'Small-batch frostbloom and alpine mint infusions harvested during the northern thaw.',
    avatarMonogram: 'NA',
  },
];

export interface SocialStoryItem {
  id: string;
  accountId: string;
  accountName: string;
  handle: string;
  family: SocialAccountFamily;
  brandKitId: string;
  kicker: string;
  headline: string;
  caption: string;
  assetId?: string;
  cycle: number;
}

export const STARTER_SOCIAL_STORIES: readonly SocialStoryItem[] = [
  {
    id: 'story:sr-issue-01',
    accountId: 'acct:thesocialregister',
    accountName: 'The Social Register',
    handle: 'thesocialregister',
    family: 'media',
    brandKitId: 'the-social-register',
    kicker: 'NEW COLLECTIBLE ISSUE',
    headline: 'Issue 01: “Between Tradition and Tomorrow” Is Live on VerseNet',
    caption: 'Swipe into Rosemont Terrace’s inaugural 10-department folio at socialregister.mer.',
    assetId: 'canon:place-aureline-heavens',
    cycle: 28,
  },
  {
    id: 'story:meridian-grid',
    accountId: 'acct:themeridian',
    accountName: 'The Meridian',
    handle: 'themeridian',
    family: 'media',
    brandKitId: 'the-meridian',
    kicker: 'MORNING BRIEFING',
    headline: 'Eight-Realm Transit & PRISM Telemetry Check',
    caption: 'Read the full World & Science desk update at meridian.mer.',
    assetId: 'canon:place-transit-junction',
    cycle: 28,
  },
  {
    id: 'story:velvet-rehearsal',
    accountId: 'acct:velvetcultural',
    accountName: 'Vivienne Rose · Velvet Studio',
    handle: 'velvetcultural',
    family: 'creator',
    brandKitId: 'velvet-studio',
    kicker: 'BACKSTAGE · PROMENADE',
    headline: 'Acoustic Strings & Candlelight Rehearsal Tonight',
    caption: 'Doors open at 20:00 in the Promenade Quarter gallery.',
    assetId: 'canon:place-glassline-twilight',
    cycle: 28,
  },
  {
    id: 'story:crown-concord',
    accountId: 'acct:crownsanctum',
    accountName: 'Crown Sanctum Chancery',
    handle: 'crownsanctum',
    family: 'royal',
    brandKitId: 'the-social-register',
    kicker: 'CHANCERY NOTICE',
    headline: 'Evening Lantern Illumination Over Angel Bay',
    caption: 'Honoring visiting envoys from Lumia, Brisland, and Ve’Raylia.',
    assetId: 'canon:place-angel-bay',
    cycle: 28,
  },
];

export const STARTER_TEMPLATE_FEED: readonly PublishedMediaArtifact[] = [
  {
    id: 'soc-post-sr-cover',
    templateId: 'tpl-social-article-promo',
    brandKitId: 'the-social-register',
    channel: 'social',
    verificationTier: 'verified_reporting',
    slotValues: {
      kicker: 'ISSUE 01 · COVER FEATURE',
      headline: 'Between Tradition and Tomorrow: Eight Banners Beneath Two Moons',
      subhead: 'Our inaugural collectible edition explores Crown Sanctum etiquette, Vivienne Rose’s stripped-back stage, and Elmore’s cedar halls.',
      imageAssetId: 'canon:place-aureline-heavens',
      primaryEntityId: 'ORG_SOCIAL_REGISTER',
    },
    entityRefs: ['ORG_SOCIAL_REGISTER', 'FAC_SERAPHIMA'],
    authorId: 'acct:thesocialregister',
    authorName: 'The Social Register (@thesocialregister)',
    publisherOrgId: 'ORG_SOCIAL_REGISTER',
    publishedCycle: 28,
    createdAt: '2026-11-24T09:00:00Z',
  },
  {
    id: 'soc-post-meridian-breaking',
    templateId: 'tpl-social-breaking-news',
    brandKitId: 'the-meridian',
    channel: 'social',
    verificationTier: 'verified_reporting',
    slotValues: {
      kicker: 'ENVIRONMENT & WORLD',
      headline: 'Arcadia Domes & Ve’Raylia Watersheds Report Optimal Canopy Balance',
      subhead: 'Joint assays between Aureline Ecological Wardens and Elmore stewards confirm steady autumn readings.',
      imageAssetId: 'canon:place-angel-bay',
      primaryEntityId: 'ORG_THE_MERIDIAN',
    },
    entityRefs: ['ORG_THE_MERIDIAN', 'REG_VERAYLIA'],
    authorId: 'acct:themeridian',
    authorName: 'The Meridian (@themeridian)',
    publisherOrgId: 'ORG_THE_MERIDIAN',
    publishedCycle: 28,
    createdAt: '2026-11-24T08:30:00Z',
  },
  {
    id: 'soc-post-seraphine-carousel',
    templateId: 'tpl-social-carousel',
    brandKitId: 'the-social-register',
    channel: 'social',
    verificationTier: 'promo',
    slotValues: {
      kicker: 'AUTUMN ATELIER LOOKBOOK',
      headline: 'Three Studies in Old Burgundy, Slate Silk & Bullion Thread',
      slides: [
        {
          id: 'sl-1',
          headline: 'I. The Rosemont Evening Mantle',
          caption: 'Hand-loomed wool-velvet with thistle silk lining and subtle eight-point star clasp.',
          assetId: 'canon:place-aureline-heavens',
        },
        {
          id: 'sl-2',
          headline: 'II. Glassline Promenade Coat',
          caption: 'Tailored for dusk walks between Meridian Quay and the Velvet Studio.',
          assetId: 'canon:place-glassline-twilight',
        },
        {
          id: 'sl-3',
          headline: 'III. Elmore Conservatory Cape',
          caption: 'Inspired by House Valmon’s highland botanical sanctuaries.',
          assetId: 'canon:place-suite-4b',
        },
      ],
    },
    entityRefs: ['ORG_ATELIER_SERAPHINE'],
    authorId: 'acct:maisonseraphine',
    authorName: 'Maison Seraphine (@maisonseraphine)',
    publisherOrgId: 'ORG_ATELIER_SERAPHINE',
    publishedCycle: 28,
    createdAt: '2026-11-24T08:00:00Z',
  },
  {
    id: 'soc-post-crown-statement',
    templateId: 'tpl-social-public-statement',
    brandKitId: 'the-social-register',
    channel: 'social',
    verificationTier: 'canon_official',
    slotValues: {
      kicker: 'CHANCERY PROCLAMATION',
      headline: 'Public Viewing Hours Opened for Year 0 Concord Charters',
      body: 'In partnership with the Royal Historic Society, citizens holding a valid public reader card may view the illuminated Founding Day concord folios in the East Gallery throughout this cycle.',
    },
    entityRefs: ['FAC_SERAPHIMA', 'FAC_ROYAL_HISTORY'],
    authorId: 'acct:crownsanctum',
    authorName: 'Crown Sanctum Chancery (@crownsanctum)',
    publisherOrgId: 'FAC_SERAPHIMA',
    publishedCycle: 27,
    createdAt: '2026-11-23T18:00:00Z',
  },
  {
    id: 'soc-post-velvet-poll',
    templateId: 'tpl-social-poll',
    brandKitId: 'velvet-studio',
    channel: 'social',
    verificationTier: 'personal_perspective',
    slotValues: {
      kicker: 'COMMUNITY LISTENING ROOM',
      headline: 'Which late-evening programme should headline next cycle’s Promenade Salon?',
      pollOptions: [
        'Chamber Strings & Piano by Candlelight',
        'Ambient Glassline Synth & Rain Loops',
        ' Spoken-Word Letters Across the Eight Realms',
      ],
    },
    entityRefs: ['ORG_VELVET_STUDIO'],
    authorId: 'acct:velvetcultural',
    authorName: 'Vivienne Rose · Velvet Studio (@velvetcultural)',
    publisherOrgId: 'ORG_VELVET_STUDIO',
    publishedCycle: 28,
    createdAt: '2026-11-24T07:15:00Z',
  },
  {
    id: 'soc-post-meridian-recruitment',
    templateId: 'tpl-social-recruitment',
    brandKitId: 'the-meridian',
    channel: 'social',
    verificationTier: 'canon_official',
    slotValues: {
      kicker: 'WORKNET · PRESS & PUBLISHING',
      headline: 'Now Commissioning Junior Correspondents, Copy Editors & Photojournalists',
      subhead: 'Base stipend 215 CR/cycle · Meridian Press House & Rosemont Editorial Desk · Apply in WORKNET.',
    },
    entityRefs: ['ORG_THE_MERIDIAN', 'ORG_SOCIAL_REGISTER'],
    authorId: 'acct:themeridian',
    authorName: 'The Meridian (@themeridian)',
    publisherOrgId: 'ORG_THE_MERIDIAN',
    publishedCycle: 28,
    createdAt: '2026-11-24T07:00:00Z',
  },
];
