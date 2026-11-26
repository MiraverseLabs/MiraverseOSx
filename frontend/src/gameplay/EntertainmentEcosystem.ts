import { WORLD_ORGANIZATIONS } from '../game-content/worldAssetLibrary';

export const FAME_AXES = [
  'recognition',
  'favorability',
  'industryReputation',
  'fanLoyalty',
  'artisticCredibility',
  'commercialInfluence',
  'culturalInfluence',
  'mediaVisibility',
] as const;

export type FameAxis = (typeof FAME_AXES)[number];

export const ENTERTAINMENT_DISCIPLINES = [
  { id: 'music', label: 'Music, Songwriting & Production', skill: 'Creativity', primaryOrgs: ['ORG_MARLIE_RECORDS', 'ORG_STARSTRUCK', 'ORG_KAJI_PUBLISHING', 'ORG_SONGBIRD'] },
  { id: 'dance', label: 'Dance & Choreography', skill: 'Creativity', primaryOrgs: ['ORG_FEMME_FATALE', 'ORG_WONDER_WIND', 'ORG_MARIGOLD_THEATRE'] },
  { id: 'theatre', label: 'Theatre & Performing Arts', skill: 'Communication', primaryOrgs: ['ORG_MARIGOLD_THEATRE', 'ORG_OPEN_CALL', 'ORG_PERFORMERS_ASSOC'] },
  { id: 'acting', label: 'Film, Television & Voice Acting', skill: 'Communication', primaryOrgs: ['ORG_MIRRORA_STUDIOS', 'ORG_STORYLOOM_STUDIOS', 'ORG_OPEN_CALL'] },
  { id: 'modeling', label: 'Modeling & Fashion', skill: 'Creativity', primaryOrgs: ['ORG_WILLOW_WHISPER', 'ORG_GLASSLINE_DESIGNS', 'ORG_ROSEMONT_PORTRAIT', 'ORG_AMRIELLE'] },
  { id: 'influencing', label: 'Digital Creation & Influencing', skill: 'Communication', primaryOrgs: ['ORG_SONGBIRD', 'ORG_AMRIELLE', 'ORG_POP_STICKER'] },
  { id: 'broadcasting', label: 'Radio & Broadcasting', skill: 'Communication', primaryOrgs: ['ORG_POP_STICKER', 'ORG_SONGBIRD', 'ORG_SILVERLEAF_STADIUM'] },
  { id: 'journalism', label: 'Entertainment Journalism', skill: 'Research', primaryOrgs: ['ORG_LIMELIGHT', 'ORG_ROSEMONT_PORTRAIT'] },
  { id: 'talent_management', label: 'Talent Management & Representation', skill: 'Communication', primaryOrgs: ['ORG_STARSTRUCK', 'ORG_SECOND_ACT', 'ORG_WILLOW_WHISPER'] },
  { id: 'public_relations', label: 'Public Relations & Celebrity Strategy', skill: 'Communication', primaryOrgs: ['ORG_WORD_OF_MOUTH', 'ORG_LIMELIGHT'] },
  { id: 'event_production', label: 'Event Production & Live Business', skill: 'Engineering', primaryOrgs: ['ORG_VELVET_CURTAIN', 'ORG_SILVERLEAF_STADIUM', 'ORG_LOOKING_GLASS', 'ORG_LUNERUM_DIST'] },
] as const;

export type EntertainmentDisciplineId = (typeof ENTERTAINMENT_DISCIPLINES)[number]['id'];

export const SHIPPED_AUDIO_ASSETS = [
  { id: 'audio-chime', label: 'Crystal Harbor Chime (Master WAV)', audioUrl: '/sounds/mixkit-crystal-chime-3108.wav', coverArtUrl: '/media/albums/album-marble-lilies.jpg', genre: 'Dream Pop', durationSeconds: 184 },
  { id: 'audio-stillwater', label: 'Stillwater Evening Loop (Synthesized Master)', audioUrl: 'builtin:stillwater', coverArtUrl: '/media/albums/album-meadow-dusk.jpg', genre: 'Harbor Folk', durationSeconds: 196 },
  { id: 'audio-starlight', label: 'Starlight Glassline Sequence (Synthesized Master)', audioUrl: 'builtin:starlight', coverArtUrl: '/media/albums/album-prism-eclipse.jpg', genre: 'Glassline Synth', durationSeconds: 204 },
  { id: 'audio-pulse', label: 'Glassline Engine Pulse (Master WAV)', audioUrl: '/sounds/mixkit-futuristic-tech-engine-glitch-2949.wav', coverArtUrl: '/media/albums/album-neon-starlight.jpg', genre: 'Glassline Synth', durationSeconds: 212 },
  { id: 'audio-rewind', label: 'Velvet Rewind Nocturne (Master WAV)', audioUrl: '/sounds/mixkit-glitch-sci-fi-rewind-transition-1093.wav', coverArtUrl: '/media/albums/album-amber-silhouette.jpg', genre: 'Alt-R&B', durationSeconds: 196 },
  { id: 'audio-overture', label: 'Promenade Broadcast Overture (Master WAV)', audioUrl: '/sounds/mixkit-intro-text-glitch-2950.wav', coverArtUrl: '/media/albums/album-neon-starlight.jpg', genre: 'Electro-Pop', durationSeconds: 175 },
  { id: 'audio-prism', label: 'Aureline Prism Resonance (Master WAV)', audioUrl: '/sounds/mixkit-sci-fi-high-tech-sounds-860.wav', coverArtUrl: '/media/albums/album-prism-eclipse.jpg', genre: 'Experimental', durationSeconds: 228 },
  { id: 'audio-basalt', label: 'Balisya Basalt Sub-Bass (Master WAV)', audioUrl: '/sounds/mixkit-sci-fi-machine-deep-hum-2137.wav', coverArtUrl: '/media/albums/album-chamber-violin.jpg', genre: 'Ambient Score', durationSeconds: 242 },
  { id: 'audio-marlie', label: 'Marlie Sea Tide Signal (Master WAV)', audioUrl: '/sounds/mixkit-water-sci-fi-bleep-902.wav', coverArtUrl: '/media/albums/album-marble-lilies.jpg', genre: 'Indie Acoustic', durationSeconds: 190 },
] as const;

export interface EntertainmentVenueMeta {
  orgId: string;
  name: string;
  district: string;
  capacity: number;
  minRecognition: number;
  rentalCost: number;
  suggestedTicket: number;
  locationId?: string;
}

export const VENUE_CATALOG: readonly EntertainmentVenueMeta[] = [
  { orgId: 'ORG_LOOKING_GLASS', name: 'The Looking Glass', district: 'Glassline District', capacity: 180, minRecognition: 0, rentalCost: 65, suggestedTicket: 18, locationId: 'loc-looking-glass' },
  { orgId: 'ORG_VELVET_STUDIO', name: 'The Velvet Cultural Studio', district: 'Promenade Quarter', capacity: 450, minRecognition: 8, rentalCost: 190, suggestedTicket: 28, locationId: 'loc-velvet-studio' },
  { orgId: 'ORG_MARIGOLD_THEATRE', name: 'The Marigold Theatre', district: 'Promenade Quarter', capacity: 1200, minRecognition: 12, rentalCost: 480, suggestedTicket: 45, locationId: 'loc-marigold-theatre' },
  { orgId: 'ORG_SILVERLEAF_STADIUM', name: 'Silverleaf Stadium', district: 'Silverleaf Park', capacity: 45000, minRecognition: 55, rentalCost: 4500, suggestedTicket: 95, locationId: 'loc-silverleaf-stadium' },
] as const;

export function getEntertainmentVenues(state?: Pick<EntertainmentState, 'venues'> | null): readonly EntertainmentVenueMeta[] {
  return Array.isArray(state?.venues) && state.venues.length > 0 ? state.venues : VENUE_CATALOG;
}

export type FameTier = 'Unlisted' | 'Local' | 'Rising' | 'Established' | 'Headliner' | 'Realm Icon';

export interface CommunityReception {
  generalPublic: number;
  criticsAndPeers: number;
  dedicatedFans: number;
  commercialBrands: number;
  localScene: number;
}

export interface EntertainmentArtist {
  artistId: string;
  characterId: string;
  stageName: string;
  bio: string;
  origin: 'player' | 'npc';
  disciplines: EntertainmentDisciplineId[];
  genres: string[];
  careerStatus: 'active' | 'hiatus' | 'retired' | 'comeback';
  privacyBoundary: 'open' | 'guarded' | 'strict';
  guildMember: boolean;
  managerOrgId: string;
  labelOrgId: string;
  publisherOrgId: string;
  prOrgId: string;
  distributorOrgId: string;
  recognition: number;
  favorability: number;
  industryReputation: number;
  fanLoyalty: number;
  artisticCredibility: number;
  commercialInfluence: number;
  culturalInfluence: number;
  mediaVisibility: number;
  tier: FameTier;
  fanCount: number;
  monthlyListeners: number;
  totalRoyaltiesEarned: number;
  unclaimedPlayerRoyalties: number;
  portfolioArtifactIds: string[];
  collaboratorIds: string[];
  rivalryIds: string[];
  lastActiveCycle: number;
}

export interface EntertainmentTrack {
  trackId: string;
  title: string;
  artistId: string;
  stageName: string;
  kind: 'single' | 'ep_track' | 'album_track' | 'score';
  genre: string;
  durationSeconds: number;
  audioUrl: string;
  coverArtUrl?: string;
  producerOrgId: string;
  publisherOrgId: string;
  collaboratorArtistIds: string[];
  mmrsRegistered: boolean;
  masterOwnedByArtist: boolean;
  quality: number;
  streams: number;
  radioSpins: number;
  stickerEdition: string;
  createdCycle: number;
}

export interface EntertainmentRelease {
  releaseId: string;
  trackId: string;
  trackIds: string[];
  artistId: string;
  stageName: string;
  title: string;
  format: 'Single' | 'EP' | 'Album' | 'Soundtrack';
  platform: string;
  distributorOrgId: string;
  labelOrgId: string;
  royaltyRate: number;
  releaseCycle: number;
  status: 'scheduled' | 'released';
}

export interface EntertainmentConcert {
  concertId: string;
  artistId: string;
  stageName: string;
  title: string;
  venue: string;
  venueOrgId: string;
  promoterOrgId: string;
  scheduledCycle: number;
  slot: 'afternoon' | 'evening' | 'late';
  dateLabel: string;
  ticketPrice: number;
  capacity: number;
  rentalCost: number;
  ticketsSold: number;
  grossRevenue: number;
  netArtistPayout: number;
  audienceReaction: string;
  status: 'scheduled' | 'completed' | 'canceled';
}

export interface EntertainmentAudition {
  auditionId: string;
  title: string;
  orgId: string;
  productionOrgId: string;
  posterUrl?: string;
  discipline: EntertainmentDisciplineId;
  openToUnrepresented: boolean;
  minCredibility: number;
  stipendCredits: number;
  deadlineCycle: number;
  applicants: { artistId: string; stageName: string; score: number; submittedCycle: number }[];
  selectedArtistId: string;
  status: 'open' | 'cast' | 'closed';
}

export interface EntertainmentContract {
  contractId: string;
  artistId: string;
  orgId: string;
  orgName: string;
  contractType: 'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild' | 'ensemble';
  commissionRate: number;
  royaltySplitArtist: number;
  advanceCredits: number;
  obligationCount: number;
  completedObligations: number;
  startCycle: number;
  expiresCycle: number;
  status: 'active' | 'terminated' | 'replaced' | 'expired';
}

export interface EntertainmentProject {
  projectId: string;
  artistId: string;
  title: string;
  kind: 'single' | 'album' | 'film' | 'series' | 'choreography' | 'stage_play' | 'fashion_campaign' | 'promo_kit';
  discipline: EntertainmentDisciplineId;
  partnerOrgId: string;
  collaboratorArtistId: string;
  budgetCredits: number;
  deadlineCycle: number;
  progress: number;
  quality: number;
  masterOwnedByArtist: boolean;
  audioUrl?: string;
  genre?: string;
  status: 'in_production' | 'completed' | 'released';
}

export interface EntertainmentSponsorship {
  sponsorshipId: string;
  artistId: string;
  stageName: string;
  sponsorOrgId: string;
  sponsorName: string;
  campaignTitle: string;
  feeCredits: number;
  startCycle: number;
  status: 'offered' | 'active' | 'completed';
}

export interface EntertainmentMediaItem {
  mediaId: string;
  orgId: string;
  outletName: string;
  kind: 'feature' | 'review' | 'interview' | 'radio_premiere' | 'gossip' | 'statement' | 'award_news';
  headline: string;
  summary: string;
  subjectArtistIds: string[];
  sentiment: 'positive' | 'mixed' | 'critical';
  cycle: number;
}

export interface EntertainmentControversy {
  controversyId: string;
  artistId: string;
  stageName: string;
  topic: string;
  severity: number;
  status: 'active' | 'addressed' | 'faded';
  responseStrategy?: string;
  cycle: number;
}

export interface RadianceAwardCycle {
  awardCycleId: string;
  cycle: number;
  ceremonyCycle: number;
  status: 'open' | 'completed';
  nominees: { artistId: string; stageName: string; category: string; workTitle: string; score: number }[];
  winners: { artistId: string; stageName: string; category: string; workTitle: string; score: number }[];
}

export interface FanCommunity {
  communityId: string;
  artistId: string;
  stageName: string;
  name: string;
  memberIds: string[];
  loyaltyScore: number;
  recentActivity: string;
}

export interface EventTicketReceipt {
  ticketId: string;
  concertId: string;
  concertTitle: string;
  venue: string;
  artistId: string;
  stageName: string;
  scheduledCycle: number;
  quantity: number;
  pricePaid: number;
  purchasedCycle: number;
  attended: boolean;
}

export interface EntertainmentState {
  version: 1;
  authorityMode?: 'standalone' | 'living_world';
  lastLivingWorldSyncAt?: string;
  venues?: EntertainmentVenueMeta[];
  lastSimulatedCycle: number;
  playerArtistId: string | null;
  disciplineProgress: Record<EntertainmentDisciplineId, { xp: number; level: number; completedWorks: number }>;
  followedArtistIds: string[];
  collectedStickers: string[];
  playedTrackIds: string[];
  receiptIds: string[];
  artists: EntertainmentArtist[];
  tracks: EntertainmentTrack[];
  releases: EntertainmentRelease[];
  concerts: EntertainmentConcert[];
  auditions: EntertainmentAudition[];
  contracts: EntertainmentContract[];
  projects: EntertainmentProject[];
  sponsorships: EntertainmentSponsorship[];
  mediaItems: EntertainmentMediaItem[];
  controversies: EntertainmentControversy[];
  awards: RadianceAwardCycle[];
  fanCommunities: FanCommunity[];
  tickets: EventTicketReceipt[];
}

export function clampFame(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

export function computeFameTier(a: Pick<EntertainmentArtist, FameAxis>): FameTier {
  const composite =
    a.recognition * 0.34 +
    a.mediaVisibility * 0.16 +
    a.commercialInfluence * 0.16 +
    a.artisticCredibility * 0.14 +
    a.culturalInfluence * 0.1 +
    a.fanLoyalty * 0.1;
  if (composite >= 80) return 'Realm Icon';
  if (composite >= 62) return 'Headliner';
  if (composite >= 42) return 'Established';
  if (composite >= 24) return 'Rising';
  if (composite >= 8) return 'Local';
  return 'Unlisted';
}

export function computeCommunityReception(a: Pick<EntertainmentArtist, FameAxis>): CommunityReception {
  return {
    generalPublic: clampFame(a.recognition * 0.45 + a.favorability * 0.55),
    criticsAndPeers: clampFame(a.artisticCredibility * 0.6 + a.industryReputation * 0.4),
    dedicatedFans: clampFame(a.fanLoyalty * 0.7 + a.favorability * 0.3),
    commercialBrands: clampFame(a.commercialInfluence * 0.55 + a.recognition * 0.25 + a.favorability * 0.2),
    localScene: clampFame(a.artisticCredibility * 0.5 + a.fanLoyalty * 0.35 + (100 - Math.min(60, a.commercialInfluence * 0.4)) * 0.15),
  };
}

export function adjustArtistFame(
  artist: EntertainmentArtist,
  deltas: Partial<Record<FameAxis, number>>,
  cycle?: number,
): EntertainmentArtist {
  const next = { ...artist };
  for (const axis of FAME_AXES) {
    if (typeof deltas[axis] === 'number') {
      next[axis] = clampFame(next[axis] + deltas[axis]!);
    }
  }
  if (typeof cycle === 'number') next.lastActiveCycle = cycle;
  next.tier = computeFameTier(next);
  next.fanCount = Math.max(next.fanCount, Math.round(next.recognition * 32 + next.fanLoyalty * 22));
  return next;
}

export function getEntertainmentOrganization(orgId: string): any | undefined {
  return (WORLD_ORGANIZATIONS.entertainmentIndustry || []).find((o: any) => o.id === orgId);
}

function emptyDisciplineProgress(): EntertainmentState['disciplineProgress'] {
  const entries = ENTERTAINMENT_DISCIPLINES.map((d) => [d.id, { xp: 0, level: 1, completedWorks: 0 }]);
  return Object.fromEntries(entries) as EntertainmentState['disciplineProgress'];
}

function makeSeedArtist(partial: Partial<EntertainmentArtist> & { artistId: string; stageName: string; characterId: string }): EntertainmentArtist {
  const base: EntertainmentArtist = {
    artistId: partial.artistId,
    characterId: partial.characterId,
    stageName: partial.stageName,
    bio: partial.bio || '',
    origin: partial.origin || 'npc',
    disciplines: partial.disciplines || ['music'],
    genres: partial.genres || ['Dream Pop'],
    careerStatus: partial.careerStatus || 'active',
    privacyBoundary: partial.privacyBoundary || 'guarded',
    guildMember: partial.guildMember ?? true,
    managerOrgId: partial.managerOrgId || '',
    labelOrgId: partial.labelOrgId || '',
    publisherOrgId: partial.publisherOrgId || '',
    prOrgId: partial.prOrgId || '',
    distributorOrgId: partial.distributorOrgId || '',
    recognition: partial.recognition ?? 18,
    favorability: partial.favorability ?? 62,
    industryReputation: partial.industryReputation ?? 48,
    fanLoyalty: partial.fanLoyalty ?? 34,
    artisticCredibility: partial.artisticCredibility ?? 46,
    commercialInfluence: partial.commercialInfluence ?? 28,
    culturalInfluence: partial.culturalInfluence ?? 24,
    mediaVisibility: partial.mediaVisibility ?? 26,
    tier: 'Local',
    fanCount: partial.fanCount ?? 950,
    monthlyListeners: partial.monthlyListeners ?? 2400,
    totalRoyaltiesEarned: partial.totalRoyaltiesEarned ?? 420,
    unclaimedPlayerRoyalties: partial.unclaimedPlayerRoyalties ?? 0,
    portfolioArtifactIds: partial.portfolioArtifactIds || [],
    collaboratorIds: partial.collaboratorIds || [],
    rivalryIds: partial.rivalryIds || [],
    lastActiveCycle: partial.lastActiveCycle ?? 28,
  };
  base.tier = computeFameTier(base);
  return base;
}

export function initialEntertainmentState(cycle = 28): EntertainmentState {
  const artists: EntertainmentArtist[] = [
    makeSeedArtist({
      artistId: 'ART-VIVIENNE',
      characterId: 'CHAR-VIVIENNE-ROSE',
      stageName: 'Vivienne Rose',
      bio: 'Starstruck flagship vocalist and Amrielle fragrance ambassador balancing stadium pop brilliance with late-night acoustic roots.',
      disciplines: ['music', 'modeling', 'acting'],
      genres: ['Electro-Pop', 'Dream Pop'],
      managerOrgId: 'ORG_STARSTRUCK',
      labelOrgId: 'ORG_STARSTRUCK',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      prOrgId: 'ORG_WORD_OF_MOUTH',
      recognition: 84,
      favorability: 76,
      industryReputation: 79,
      fanLoyalty: 82,
      artisticCredibility: 68,
      commercialInfluence: 88,
      culturalInfluence: 78,
      mediaVisibility: 89,
      fanCount: 46200,
      monthlyListeners: 128400,
      totalRoyaltiesEarned: 18450,
      collaboratorIds: ['ART-SORA'],
      rivalryIds: ['ART-ROXANNE'],
      lastActiveCycle: cycle,
    }),
    makeSeedArtist({
      artistId: 'ART-NYLA',
      characterId: 'char-nyla-baptiste',
      stageName: 'NYLA',
      bio: 'Independent emerging recording artist and songwriter from Marlowe blending Alternative R&B, neo-soul, and electronic pop.',
      disciplines: ['music'],
      genres: ['Alternative R&B', 'neo-soul', 'electronic pop'],
      privacyBoundary: 'guarded',
      recognition: 26,
      favorability: 76,
      industryReputation: 52,
      fanLoyalty: 62,
      artisticCredibility: 74,
      commercialInfluence: 18,
      culturalInfluence: 34,
      mediaVisibility: 22,
      fanCount: 3400,
      monthlyListeners: 11200,
      totalRoyaltiesEarned: 820,
      collaboratorIds: [],
      rivalryIds: [],
      lastActiveCycle: cycle,
    }),
    makeSeedArtist({
      artistId: 'ART-LEO',
      characterId: 'CHAR-LEO-STERLING',
      stageName: 'Leo Sterling',
      bio: 'Lead dramatic actor across Mirrora Studios prestige serials and Marigold Theatre repertory seasons, represented by Second Act.',
      disciplines: ['acting', 'theatre', 'modeling'],
      genres: ['Prestige Drama', 'Stage Revival'],
      managerOrgId: 'ORG_SECOND_ACT',
      prOrgId: 'ORG_WORD_OF_MOUTH',
      recognition: 72,
      favorability: 74,
      industryReputation: 83,
      fanLoyalty: 68,
      artisticCredibility: 81,
      commercialInfluence: 69,
      culturalInfluence: 73,
      mediaVisibility: 74,
      fanCount: 24500,
      monthlyListeners: 4100,
      totalRoyaltiesEarned: 9800,
      lastActiveCycle: cycle,
    }),
    makeSeedArtist({
      artistId: 'ART-AELITA',
      characterId: 'char-aelita-hopper',
      stageName: 'Aelita',
      bio: 'Independent electronic composer and sound designer distributing atmospheric Glassline synth suites through Lunerum Dist.',
      disciplines: ['music', 'influencing'],
      genres: ['Glassline Synth', 'Experimental'],
      distributorOrgId: 'ORG_LUNERUM_DIST',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      recognition: 34,
      favorability: 81,
      industryReputation: 66,
      fanLoyalty: 72,
      artisticCredibility: 83,
      commercialInfluence: 29,
      culturalInfluence: 52,
      mediaVisibility: 31,
      fanCount: 6400,
      monthlyListeners: 21900,
      totalRoyaltiesEarned: 2680,
      collaboratorIds: [],
      lastActiveCycle: cycle,
    }),
    makeSeedArtist({
      artistId: 'ART-SORA',
      characterId: 'CHAR-SORA-TAKAHASHI',
      stageName: 'Sora Takahashi',
      bio: 'Balisya sound producer and Wonder-Wind guest movement composer bridging Kaji acoustic chambers and cross-realm dance stages.',
      disciplines: ['dance', 'music', 'theatre'],
      genres: ['Ambient Score', 'Contemporary Dance'],
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      managerOrgId: 'ORG_SECOND_ACT',
      recognition: 51,
      favorability: 79,
      industryReputation: 86,
      fanLoyalty: 66,
      artisticCredibility: 91,
      commercialInfluence: 44,
      culturalInfluence: 71,
      mediaVisibility: 47,
      fanCount: 9800,
      monthlyListeners: 28500,
      totalRoyaltiesEarned: 6100,
      collaboratorIds: ['ART-VIVIENNE'],
      lastActiveCycle: cycle,
    }),
    makeSeedArtist({
      artistId: 'ART-ROXANNE',
      characterId: 'CHAR-ROXANNE-DELACROIX',
      stageName: 'Roxanne Delacroix',
      bio: 'Artistic director and principal choreographer at Femme Fatale Dance Company, styled exclusively by Glassline Designs.',
      disciplines: ['dance', 'theatre', 'modeling', 'event_production'],
      genres: ['Theatrical Cabaret', 'Commercial Choreography'],
      managerOrgId: 'ORG_STARSTRUCK',
      prOrgId: 'ORG_WORD_OF_MOUTH',
      recognition: 64,
      favorability: 67,
      industryReputation: 82,
      fanLoyalty: 73,
      artisticCredibility: 84,
      commercialInfluence: 71,
      culturalInfluence: 75,
      mediaVisibility: 72,
      fanCount: 18400,
      monthlyListeners: 6200,
      totalRoyaltiesEarned: 7400,
      rivalryIds: ['ART-VIVIENNE'],
      lastActiveCycle: cycle,
    }),
  ];

  const tracks: EntertainmentTrack[] = [
    {
      trackId: 'TRK-SEED-01',
      title: 'Neon Over Silverleaf',
      artistId: 'ART-VIVIENNE',
      stageName: 'Vivienne Rose',
      kind: 'single',
      genre: 'Electro-Pop',
      durationSeconds: 175,
      audioUrl: '/sounds/mixkit-intro-text-glitch-2950.wav',
      coverArtUrl: '/media/albums/album-neon-starlight.jpg',
      producerOrgId: 'ORG_STARSTRUCK',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      collaboratorArtistIds: ['ART-SORA'],
      mmrsRegistered: true,
      masterOwnedByArtist: false,
      quality: 89,
      streams: 84200,
      radioSpins: 312,
      stickerEdition: 'Pop Sticker #01: Vivienne Rose Silver Foil',
      createdCycle: cycle - 4,
    },
    {
      trackId: 'TRK-SEED-02',
      title: 'Midnight Over Marlowe',
      artistId: 'ART-NYLA',
      stageName: 'NYLA',
      kind: 'single',
      genre: 'Alternative R&B',
      durationSeconds: 192,
      audioUrl: 'builtin:stillwater',
      coverArtUrl: '/media/albums/album-meadow-dusk.jpg',
      producerOrgId: '',
      publisherOrgId: '',
      collaboratorArtistIds: [],
      mmrsRegistered: true,
      masterOwnedByArtist: true,
      quality: 84,
      streams: 4800,
      radioSpins: 18,
      stickerEdition: '',
      createdCycle: cycle - 1,
    },
    {
      trackId: 'TRK-SEED-03',
      title: 'Conduit Lullaby (Suite 4B)',
      artistId: 'ART-AELITA',
      stageName: 'Aelita',
      kind: 'single',
      genre: 'Glassline Synth',
      durationSeconds: 204,
      audioUrl: 'builtin:starlight',
      coverArtUrl: '/media/albums/album-prism-eclipse.jpg',
      producerOrgId: 'ORG_KAJI_PUBLISHING',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      collaboratorArtistIds: [],
      mmrsRegistered: true,
      masterOwnedByArtist: true,
      quality: 87,
      streams: 19850,
      radioSpins: 74,
      stickerEdition: 'Pop Sticker #03: Glassline Prism',
      createdCycle: cycle - 2,
    },
    {
      trackId: 'TRK-SEED-04',
      title: 'Basalt & Breath (Wonder-Wind Score)',
      artistId: 'ART-SORA',
      stageName: 'Sora Takahashi',
      kind: 'score',
      genre: 'Ambient Score',
      durationSeconds: 242,
      audioUrl: '/sounds/mixkit-sci-fi-machine-deep-hum-2137.wav',
      coverArtUrl: '/media/albums/album-chamber-violin.jpg',
      producerOrgId: 'ORG_KAJI_PUBLISHING',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      collaboratorArtistIds: [],
      mmrsRegistered: true,
      masterOwnedByArtist: true,
      quality: 94,
      streams: 16400,
      radioSpins: 52,
      stickerEdition: '',
      createdCycle: cycle - 1,
    },
    {
      trackId: 'TRK-SEED-05',
      title: 'Crystal Arcade Afterhours',
      artistId: 'ART-VIVIENNE',
      stageName: 'Vivienne Rose',
      kind: 'single',
      genre: 'Dream Pop',
      durationSeconds: 184,
      audioUrl: '/sounds/mixkit-crystal-chime-3108.wav',
      coverArtUrl: '/media/albums/album-marble-lilies.jpg',
      producerOrgId: 'ORG_STARSTRUCK',
      publisherOrgId: 'ORG_KAJI_PUBLISHING',
      collaboratorArtistIds: [],
      mmrsRegistered: true,
      masterOwnedByArtist: false,
      quality: 85,
      streams: 49100,
      radioSpins: 195,
      stickerEdition: 'Pop Sticker #04: Rosemont Dusk',
      createdCycle: cycle - 1,
    },
  ];

  const releases: EntertainmentRelease[] = tracks.map((t, idx) => ({
    releaseId: `REL-SEED-0${idx + 1}`,
    trackId: t.trackId,
    trackIds: [t.trackId],
    artistId: t.artistId,
    stageName: t.stageName,
    title: t.title,
    format: t.kind === 'album_track' ? 'Album' : t.kind === 'score' ? 'Soundtrack' : 'Single',
    platform: 'Songbird',
    distributorOrgId: t.masterOwnedByArtist ? 'ORG_LUNERUM_DIST' : 'ORG_STARSTRUCK',
    labelOrgId: t.producerOrgId,
    royaltyRate: t.masterOwnedByArtist ? 0.92 : 0.55,
    releaseCycle: t.createdCycle,
    status: 'released',
  }));

  const concerts: EntertainmentConcert[] = [
    {
      concertId: 'CON-SEED-01',
      artistId: 'ART-NYLA',
      stageName: 'NYLA',
      title: 'NYLA: Afterglow Electronic Soul Showcase',
      venue: 'The Looking Glass',
      venueOrgId: 'ORG_LOOKING_GLASS',
      promoterOrgId: '',
      scheduledCycle: cycle + 1,
      slot: 'evening',
      dateLabel: `Cycle ${cycle + 1} · Evening`,
      ticketPrice: 22,
      capacity: 180,
      rentalCost: 65,
      ticketsSold: 76,
      grossRevenue: 1672,
      netArtistPayout: 0,
      audienceReaction: 'Growing local buzz for an independent Marlowe vocalist.',
      status: 'scheduled',
    },
    {
      concertId: 'CON-SEED-02',
      artistId: 'ART-ROXANNE',
      stageName: 'Roxanne Delacroix',
      title: 'Femme Fatale: Crimson Mirrors Premiere',
      venue: 'The Marigold Theatre',
      venueOrgId: 'ORG_MARIGOLD_THEATRE',
      promoterOrgId: 'ORG_VELVET_CURTAIN',
      scheduledCycle: cycle + 2,
      slot: 'evening',
      dateLabel: `Cycle ${cycle + 2} · Evening`,
      ticketPrice: 48,
      capacity: 1200,
      rentalCost: 480,
      ticketsSold: 890,
      grossRevenue: 42720,
      netArtistPayout: 0,
      audienceReaction: 'Glassline Designs custom stage wardrobe unveiled.',
      status: 'scheduled',
    },
    {
      concertId: 'CON-SEED-03',
      artistId: 'ART-VIVIENNE',
      stageName: 'Vivienne Rose',
      title: 'Vivienne Rose: Eight Realms Radiance Bowl',
      venue: 'Silverleaf Stadium',
      venueOrgId: 'ORG_SILVERLEAF_STADIUM',
      promoterOrgId: 'ORG_VELVET_CURTAIN',
      scheduledCycle: cycle + 3,
      slot: 'evening',
      dateLabel: `Cycle ${cycle + 3} · Evening`,
      ticketPrice: 95,
      capacity: 45000,
      rentalCost: 4500,
      ticketsSold: 38400,
      grossRevenue: 3648000,
      netArtistPayout: 0,
      audienceReaction: 'Near-capacity stadium bowl with Pop Sticker live broadcast.',
      status: 'scheduled',
    },
  ];

  const auditions: EntertainmentAudition[] = [
    {
      auditionId: 'AUD-SEED-01',
      title: 'Open Call: Mirrora Serial “Glassline Harbor” Supporting Role',
      orgId: 'ORG_OPEN_CALL',
      productionOrgId: 'ORG_MIRRORA_STUDIOS',
      discipline: 'acting',
      posterUrl: '/media/posters/poster-last-witness-noir.jpg',
      openToUnrepresented: true,
      minCredibility: 10,
      stipendCredits: 320,
      deadlineCycle: cycle + 4,
      applicants: [],
      selectedArtistId: '',
      status: 'open',
    },
    {
      auditionId: 'AUD-SEED-02',
      title: 'The Looking Glass: New Voices Thursday Opener Slot',
      orgId: 'ORG_LOOKING_GLASS',
      productionOrgId: 'ORG_MARLIE_RECORDS',
      discipline: 'music',
      posterUrl: '/media/posters/poster-coastal-escapade.jpg',
      openToUnrepresented: true,
      minCredibility: 5,
      stipendCredits: 185,
      deadlineCycle: cycle + 3,
      applicants: [],
      selectedArtistId: '',
      status: 'open',
    },
    {
      auditionId: 'AUD-SEED-03',
      title: 'Wonder-Wind & Marigold Theatre: Spatial Movement Ensemble',
      orgId: 'ORG_WONDER_WIND',
      productionOrgId: 'ORG_MARIGOLD_THEATRE',
      discipline: 'dance',
      posterUrl: '/media/posters/poster-wind-archive-collage.jpg',
      openToUnrepresented: true,
      minCredibility: 14,
      stipendCredits: 290,
      deadlineCycle: cycle + 5,
      applicants: [],
      selectedArtistId: '',
      status: 'open',
    },
    {
      auditionId: 'AUD-SEED-04',
      title: 'Willow Whisper × Amrielle: Autumn Botanical Campaign Face',
      orgId: 'ORG_WILLOW_WHISPER',
      productionOrgId: 'ORG_AMRIELLE',
      discipline: 'modeling',
      posterUrl: '/media/posters/poster-promenade-sunset.jpg',
      openToUnrepresented: false,
      minCredibility: 24,
      stipendCredits: 540,
      deadlineCycle: cycle + 5,
      applicants: [],
      selectedArtistId: '',
      status: 'open',
    },
    {
      auditionId: 'AUD-SEED-05',
      title: 'Storyloom Studios: Illustrated Feature Voice & Song Call',
      orgId: 'ORG_OPEN_CALL',
      productionOrgId: 'ORG_STORYLOOM_STUDIOS',
      discipline: 'acting',
      posterUrl: '/media/posters/poster-citadel-of-echoes.jpg',
      openToUnrepresented: true,
      minCredibility: 12,
      stipendCredits: 360,
      deadlineCycle: cycle + 4,
      applicants: [],
      selectedArtistId: '',
      status: 'open',
    },
  ];

  const contracts: EntertainmentContract[] = [
    {
      contractId: 'CNT-SEED-01',
      artistId: 'ART-VIVIENNE',
      orgId: 'ORG_STARSTRUCK',
      orgName: 'Starstruck Entertainment',
      contractType: 'management',
      commissionRate: 0.22,
      royaltySplitArtist: 0.55,
      advanceCredits: 2500,
      obligationCount: 4,
      completedObligations: 2,
      startCycle: cycle - 8,
      expiresCycle: cycle + 22,
      status: 'active',
    },

  ];

  const mediaItems: EntertainmentMediaItem[] = [
    {
      mediaId: 'MED-SEED-01',
      orgId: 'ORG_LIMELIGHT',
      outletName: 'Limelight',
      kind: 'feature',
      headline: 'Starstruck’s Golden Cage or Launchpad? Inside Aureline’s Showcase Machine',
      summary: 'Sloane Vesper examines how Starstruck’s full-service contracts compare against Second Act and Marlie Records’ master-retention deals.',
      subjectArtistIds: ['ART-VIVIENNE'],
      sentiment: 'mixed',
      cycle,
    },
    {
      mediaId: 'MED-SEED-02',
      orgId: 'ORG_POP_STICKER',
      outletName: 'Pop Sticker Radio',
      kind: 'radio_premiere',
      headline: 'Countdown #1: Vivienne Rose & Sora Takahashi Hold Top Booth Rotation',
      summary: 'Limited foil artist stickers for “Neon Over Silverleaf” are now dropping at Glassline record counters.',
      subjectArtistIds: ['ART-VIVIENNE', 'ART-SORA'],
      sentiment: 'positive',
      cycle,
    },
    {
      mediaId: 'MED-SEED-03',
      orgId: 'ORG_LIMELIGHT',
      outletName: 'Limelight',
      kind: 'feature',
      headline: 'Emerging Independent Spotlight: NYLA Brings Alternative R&B and Neo-Soul to The Looking Glass',
      summary: 'Unrepresented Marlowe songwriter Nyla Baptiste steps onto the Glassline club circuit with self-produced electronic pop textures.',
      subjectArtistIds: ['ART-NYLA'],
      sentiment: 'positive',
      cycle: cycle - 1,
    },
  ];

  const awards: RadianceAwardCycle[] = [
    {
      awardCycleId: `RADIANCE-C${cycle}`,
      cycle,
      ceremonyCycle: cycle + 6,
      status: 'open',
      nominees: [
        { artistId: 'ART-VIVIENNE', stageName: 'Vivienne Rose', category: 'Recorded Music of the Year', workTitle: 'Neon Over Silverleaf', score: 86.4 },
        { artistId: 'ART-LEO', stageName: 'Leo Sterling', category: 'Screen & Stage Performance', workTitle: 'Glassline Harbor (Season II)', score: 85.2 },
        { artistId: 'ART-SORA', stageName: 'Sora Takahashi', category: 'Choreography & Sound Craft', workTitle: 'Basalt & Breath', score: 88.1 },
      ],
      winners: [],
    },
  ];

  const fanCommunities: FanCommunity[] = [
    {
      communityId: 'fanclub:ART-VIVIENNE',
      artistId: 'ART-VIVIENNE',
      stageName: 'Vivienne Rose',
      name: 'Roselight Collective',
      memberIds: ['CHAR-MINA-VANCE'],
      loyaltyScore: 82,
      recentActivity: 'Trading Pop Sticker #01 foil editions ahead of the Silverleaf Stadium bowl.',
    },
    {
      communityId: 'fanclub:ART-NYLA',
      artistId: 'ART-NYLA',
      stageName: 'NYLA',
      name: 'NYLA Afterglow Circle',
      memberIds: [],
      loyaltyScore: 62,
      recentActivity: 'Early listeners sharing clips from NYLA’s independent Marlowe sessions.',
    },
  ];

  const sponsorships: EntertainmentSponsorship[] = [
    {
      sponsorshipId: 'SPON-SEED-01',
      artistId: 'ART-VIVIENNE',
      stageName: 'Vivienne Rose',
      sponsorOrgId: 'ORG_AMRIELLE',
      sponsorName: 'Amrielle',
      campaignTitle: 'Nocturne de Verre Signature Fragrance',
      feeCredits: 1800,
      startCycle: cycle - 2,
      status: 'active',
    },
  ];

  return {
    version: 1,
    lastSimulatedCycle: cycle,
    playerArtistId: null,
    disciplineProgress: emptyDisciplineProgress(),
    followedArtistIds: ['ART-NYLA', 'ART-AELITA'],
    collectedStickers: ['Pop Sticker #02: Marlie Sea Woodcut'],
    playedTrackIds: [],
    receiptIds: [],
    artists,
    tracks,
    releases,
    concerts,
    auditions,
    contracts,
    projects: [],
    sponsorships,
    mediaItems,
    controversies: [],
    awards,
    fanCommunities,
    tickets: [],
  };
}

export function restoreEntertainmentState(raw: any, cycle = 28): EntertainmentState {
  const base = initialEntertainmentState(cycle);
  if (!raw || typeof raw !== 'object') return base;
  const prog = emptyDisciplineProgress();
  if (raw.disciplineProgress && typeof raw.disciplineProgress === 'object') {
    for (const d of ENTERTAINMENT_DISCIPLINES) {
      const saved = raw.disciplineProgress[d.id];
      if (saved && typeof saved === 'object') {
        prog[d.id] = {
          xp: Number.isFinite(saved.xp) ? Math.max(0, Math.round(saved.xp)) : 0,
          level: Number.isFinite(saved.level) ? Math.max(1, Math.round(saved.level)) : 1,
          completedWorks: Number.isFinite(saved.completedWorks) ? Math.max(0, Math.round(saved.completedWorks)) : 0,
        };
      }
    }
  }
  return {
    version: 1,
    authorityMode: raw.authorityMode === 'living_world' ? 'living_world' : 'standalone',
    ...(typeof raw.lastLivingWorldSyncAt === 'string' ? { lastLivingWorldSyncAt: raw.lastLivingWorldSyncAt } : {}),
    ...(Array.isArray(raw.venues) && raw.venues.length > 0 ? { venues: raw.venues } : {}),
    lastSimulatedCycle: Number.isFinite(raw.lastSimulatedCycle) ? raw.lastSimulatedCycle : cycle,
    playerArtistId: typeof raw.playerArtistId === 'string' ? raw.playerArtistId : null,
    disciplineProgress: prog,
    followedArtistIds: Array.isArray(raw.followedArtistIds) ? raw.followedArtistIds.filter((x: any) => typeof x === 'string') : base.followedArtistIds,
    collectedStickers: Array.isArray(raw.collectedStickers) ? raw.collectedStickers.filter((x: any) => typeof x === 'string') : base.collectedStickers,
    playedTrackIds: Array.isArray(raw.playedTrackIds) ? raw.playedTrackIds.filter((x: any) => typeof x === 'string') : [],
    receiptIds: Array.isArray(raw.receiptIds) ? raw.receiptIds.filter((x: any) => typeof x === 'string') : [],
    artists: Array.isArray(raw.artists) && raw.artists.length > 0 ? raw.artists : base.artists,
    tracks: Array.isArray(raw.tracks) && raw.tracks.length > 0 ? raw.tracks : base.tracks,
    releases: Array.isArray(raw.releases) && raw.releases.length > 0 ? raw.releases : base.releases,
    concerts: Array.isArray(raw.concerts) && raw.concerts.length > 0 ? raw.concerts : base.concerts,
    auditions: Array.isArray(raw.auditions) && raw.auditions.length > 0 ? raw.auditions : base.auditions,
    contracts: Array.isArray(raw.contracts) ? raw.contracts : base.contracts,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    sponsorships: Array.isArray(raw.sponsorships) ? raw.sponsorships : base.sponsorships,
    mediaItems: Array.isArray(raw.mediaItems) && raw.mediaItems.length > 0 ? raw.mediaItems : base.mediaItems,
    controversies: Array.isArray(raw.controversies) ? raw.controversies : [],
    awards: Array.isArray(raw.awards) && raw.awards.length > 0 ? raw.awards : base.awards,
    fanCommunities: Array.isArray(raw.fanCommunities) && raw.fanCommunities.length > 0 ? raw.fanCommunities : base.fanCommunities,
    tickets: Array.isArray(raw.tickets) ? raw.tickets : [],
  };
}

export function awardDisciplineXP(
  progress: EntertainmentState['disciplineProgress'],
  discipline: EntertainmentDisciplineId,
  xpDelta: number,
  completedWork = false,
): EntertainmentState['disciplineProgress'] {
  const current = progress[discipline] || { xp: 0, level: 1, completedWorks: 0 };
  const nextXp = current.xp + Math.max(0, Math.round(xpDelta));
  const nextLevel = Math.max(1, Math.floor(nextXp / 120) + 1);
  return {
    ...progress,
    [discipline]: {
      xp: nextXp,
      level: nextLevel,
      completedWorks: current.completedWorks + (completedWork ? 1 : 0),
    },
  };
}

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/**
 * Deterministically advances Meridion's entertainment industry on OS cycle ticks:
 * streaming & radio spins, scheduled releases, scheduled concerts & box office,
 * NPC releases/auditions, inactivity fame decay, controversies, and Radiance Awards.
 */
export function advanceEntertainmentCycle(rawState: EntertainmentState | undefined, nextCycle: number): EntertainmentState {
  const state = restoreEntertainmentState(rawState, nextCycle);
  if (nextCycle <= state.lastSimulatedCycle) return state;

  let artists = state.artists.map((a) => ({ ...a }));
  let tracks = state.tracks.map((t) => ({ ...t }));
  let releases = state.releases.map((r) => ({ ...r }));
  let concerts = state.concerts.map((c) => ({ ...c }));
  let auditions = state.auditions.map((a) => ({ ...a, applicants: [...a.applicants] }));
  let projects = state.projects.map((p) => ({ ...p }));
  const contracts = state.contracts.map((c) => ({ ...c }));
  const mediaItems = [...state.mediaItems];
  const controversies = state.controversies.map((c) => ({ ...c }));
  const awards = state.awards.map((aw) => ({ ...aw, nominees: [...aw.nominees], winners: [...aw.winners] }));

  for (let cyc = state.lastSimulatedCycle + 1; cyc <= nextCycle; cyc++) {
    // 1. Activate scheduled releases due this cycle
    for (const rel of releases) {
      if (rel.status === 'scheduled' && rel.releaseCycle <= cyc) {
        rel.status = 'released';
        const artIdx = artists.findIndex((a) => a.artistId === rel.artistId);
        if (artIdx >= 0) {
          artists[artIdx] = adjustArtistFame(
            artists[artIdx],
            { recognition: 3.2, mediaVisibility: 3.8, artisticCredibility: 2.0, commercialInfluence: 2.2 },
            cyc,
          );
          mediaItems.unshift({
            mediaId: `MED-REL-${rel.releaseId}-${cyc}`,
            orgId: 'ORG_SONGBIRD',
            outletName: 'Songbird Editorial',
            kind: 'review',
            headline: `New Release on Songbird: “${rel.title}” by ${rel.stageName}`,
            summary: `Distributed via ${getEntertainmentOrganization(rel.distributorOrgId)?.shortName || 'Songbird'} (${rel.format}). Now streaming across all Eight Realms.`,
            subjectArtistIds: [rel.artistId],
            sentiment: 'positive',
            cycle: cyc,
          });
        }
      }
    }

    // 2. Organic Songbird streaming + Pop Sticker Radio spins + royalty accrual
    for (const trk of tracks) {
      const artIdx = artists.findIndex((a) => a.artistId === trk.artistId);
      const art = artIdx >= 0 ? artists[artIdx] : undefined;
      const rec = art?.recognition ?? 20;
      const loy = art?.fanLoyalty ?? 25;
      const jitter = (deterministicHash(`${trk.trackId}:${cyc}`) % 45) + 15;
      const newStreams = Math.max(8, Math.round((rec * 4.2 + loy * 2.8 + trk.quality * 1.4) + jitter));
      const newSpins = trk.stickerEdition ? Math.max(2, Math.round(rec * 0.18 + (jitter % 9))) : Math.round(rec * 0.06);
      trk.streams += newStreams;
      trk.radioSpins += newSpins;

      if (art) {
        const split = contracts.find((c) => c.artistId === art.artistId && c.contractType === 'label' && c.status === 'active')?.royaltySplitArtist
          ?? (trk.masterOwnedByArtist ? 0.92 : 0.72);
        const grossRoyalty = newStreams * 0.04 + newSpins * 0.45;
        const netArtistRoyalty = Math.round(grossRoyalty * split * 100) / 100;
        const updated = {
          ...art,
          monthlyListeners: Math.max(art.monthlyListeners, Math.round(art.monthlyListeners * 0.94 + newStreams * 1.6)),
          totalRoyaltiesEarned: Math.round((art.totalRoyaltiesEarned + netArtistRoyalty) * 100) / 100,
          unclaimedPlayerRoyalties:
            art.origin === 'player'
              ? Math.round((art.unclaimedPlayerRoyalties + netArtistRoyalty) * 100) / 100
              : art.unclaimedPlayerRoyalties,
        };
        artists[artIdx] = adjustArtistFame(updated, { recognition: 0.3, commercialInfluence: 0.25 }, art.lastActiveCycle);
      }
    }

    // 3. Execute scheduled concerts & live productions due on this cycle
    for (const con of concerts) {
      if (con.status === 'scheduled' && con.scheduledCycle <= cyc) {
        const artIdx = artists.findIndex((a) => a.artistId === con.artistId);
        const art = artIdx >= 0 ? artists[artIdx] : undefined;
        const demandRatio = Math.min(1, ((art?.recognition ?? 20) * 0.0085 + (art?.fanLoyalty ?? 25) * 0.006 + 0.25));
        const finalSold = Math.min(con.capacity, Math.max(con.ticketsSold, Math.round(con.capacity * demandRatio)));
        const gross = Math.round(finalSold * con.ticketPrice);
        const promoterCut = con.promoterOrgId ? Math.round(gross * 0.15) : 0;
        const mgrContract = contracts.find((c) => c.artistId === con.artistId && c.contractType === 'management' && c.status === 'active');
        const mgrCut = mgrContract ? Math.round(gross * mgrContract.commissionRate) : 0;
        const net = Math.max(0, gross - con.rentalCost - promoterCut - mgrCut);

        con.ticketsSold = finalSold;
        con.grossRevenue = gross;
        con.netArtistPayout = net;
        con.status = 'completed';
        const fillPct = Math.round((finalSold / Math.max(1, con.capacity)) * 100);
        con.audienceReaction =
          fillPct >= 85
            ? `Sold-out electricity (${fillPct}% capacity) — standing ovation!`
            : fillPct >= 55
              ? `Warm, attentive crowd (${fillPct}% capacity) and strong word-of-mouth.`
              : `Intimate turnout (${fillPct}% capacity); loyal listeners stayed late.`;

        if (art) {
          const updated: EntertainmentArtist = {
            ...art,
            totalRoyaltiesEarned: Math.round((art.totalRoyaltiesEarned + net) * 100) / 100,
            unclaimedPlayerRoyalties:
              art.origin === 'player'
                ? Math.round((art.unclaimedPlayerRoyalties + net) * 100) / 100
                : art.unclaimedPlayerRoyalties,
          };
          artists[artIdx] = adjustArtistFame(
            updated,
            {
              recognition: fillPct >= 75 ? 4.2 : 2.1,
              fanLoyalty: 3.4,
              artisticCredibility: 2.2,
              commercialInfluence: fillPct >= 80 ? 3.5 : 1.2,
              mediaVisibility: 2.8,
            },
            cyc,
          );
          mediaItems.unshift({
            mediaId: `MED-CON-${con.concertId}-${cyc}`,
            orgId: 'ORG_LIMELIGHT',
            outletName: 'Limelight Live Desk',
            kind: 'review',
            headline: `${con.stageName} Wraps ${con.venue} (${finalSold.toLocaleString()} Attended)`,
            summary: con.audienceReaction,
            subjectArtistIds: [con.artistId],
            sentiment: fillPct >= 50 ? 'positive' : 'mixed',
            cycle: cyc,
          });
        }
      }
    }

    // Autonomous organization lifecycles: NPC work moves through real production partners,
    // representation, rights, distribution, media and portfolio stages without player action.
    const npcArtists = artists.filter((artist) => artist.origin === 'npc' && artist.careerStatus === 'active');
    const activeNpcProjects = projects.filter((project) => project.status === 'in_production' &&
      npcArtists.some((artist) => artist.artistId === project.artistId));

    for (const contract of contracts) {
      if (contract.status === 'active' && contract.expiresCycle <= cyc) {
        contract.status = 'expired';
        const artistIndex = artists.findIndex((artist) => artist.artistId === contract.artistId);
        if (artistIndex >= 0) {
          const artist = artists[artistIndex];
          if (contract.contractType === 'management' && artist.managerOrgId === contract.orgId) artists[artistIndex] = { ...artist, managerOrgId: '' };
          if (contract.contractType === 'label' && artist.labelOrgId === contract.orgId) artists[artistIndex] = { ...artists[artistIndex], labelOrgId: '' };
          if (contract.contractType === 'publishing' && artist.publisherOrgId === contract.orgId) artists[artistIndex] = { ...artists[artistIndex], publisherOrgId: '' };
          if (contract.contractType === 'publicity' && artist.prOrgId === contract.orgId) artists[artistIndex] = { ...artists[artistIndex], prOrgId: '' };
          if (contract.contractType === 'distribution' && artist.distributorOrgId === contract.orgId) artists[artistIndex] = { ...artists[artistIndex], distributorOrgId: '' };
        }
      }
    }
    for (const artist of npcArtists) {
      if (cyc % 7 !== deterministicHash(artist.artistId) % 7) continue;
      const activeManagement = contracts.find((contract) =>
        contract.artistId === artist.artistId && contract.contractType === 'management' && contract.status === 'active');
      if (!activeManagement) {
        const agencyId = artist.recognition >= 55 ? 'ORG_STARSTRUCK' : 'ORG_SECOND_ACT';
        const agency = getEntertainmentOrganization(agencyId);
        if (agency) {
          contracts.unshift({
            contractId: `CNT-NPC-${cyc}-${artist.artistId}`,
            artistId: artist.artistId,
            orgId: agencyId,
            orgName: agency.name,
            contractType: 'management',
            commissionRate: typeof agency.commissionRate === 'number' ? agency.commissionRate : 0.12,
            royaltySplitArtist: typeof agency.royaltySplitArtist === 'number' ? agency.royaltySplitArtist : 0.82,
            advanceCredits: 0,
            obligationCount: 2,
            completedObligations: 0,
            startCycle: cyc,
            expiresCycle: cyc + 24,
            status: 'active',
          });
          const index = artists.findIndex((candidate) => candidate.artistId === artist.artistId);
          if (index >= 0) {
            artists[index] = adjustArtistFame(
              { ...artists[index], managerOrgId: agencyId },
              { industryReputation: 1.5, mediaVisibility: 1.2 },
              cyc,
            );
          }
        }
      }
    }

    if (npcArtists.length > 0 && activeNpcProjects.length < 3) {
      const artist = npcArtists[cyc % npcArtists.length];
      const disciplineIndex = deterministicHash(`${artist.artistId}:${cyc}`) % 3;
      const template = [
        {
          kind: 'single' as const,
          discipline: 'music' as EntertainmentDisciplineId,
          title: `${artist.stageName}: Independent Meridian Session`,
          partnerOrgId: 'ORG_KAJI_PUBLISHING',
        },
        {
          kind: 'series' as const,
          discipline: 'acting' as EntertainmentDisciplineId,
          title: `${artist.stageName}: Open-Call Production`,
          partnerOrgId: 'ORG_MIRRORA_STUDIOS',
        },
        {
          kind: 'fashion_campaign' as const,
          discipline: 'modeling' as EntertainmentDisciplineId,
          title: `${artist.stageName}: Meridian Look Campaign`,
          partnerOrgId: artist.recognition > 40 ? 'ORG_GLASSLINE_DESIGNS' : 'ORG_AMRIELLE',
        },
      ][disciplineIndex];
      if (!projects.some((project) => project.status === 'in_production' && project.artistId === artist.artistId && project.kind === template.kind)) {
        projects.unshift({
          projectId: `PRJ-NPC-${cyc}-${artist.artistId}`,
          artistId: artist.artistId,
          title: template.title,
          kind: template.kind,
          discipline: template.discipline,
          partnerOrgId: template.partnerOrgId,
          collaboratorArtistId: '',
          budgetCredits: 80 + (artist.recognition * 4),
          deadlineCycle: cyc + 4,
          progress: 25,
          quality: Math.round(55 + artist.artisticCredibility * 0.35 + artist.industryReputation * 0.2),
          masterOwnedByArtist: !artist.labelOrgId,
          status: 'in_production',
        });
      }
    }

    for (const project of projects) {
      if (project.status !== 'in_production') continue;
      const artistIndex = artists.findIndex((artist) => artist.artistId === project.artistId);
      if (artistIndex < 0 || artists[artistIndex].origin !== 'npc') continue;
      project.progress = Math.min(100, project.progress + 25);
      if (project.progress < 100) continue;

      project.status = 'completed';
      const artist = artists[artistIndex];
      if (project.discipline === 'music') {
        const trackId = `TRK-NPC-${cyc}-${artist.artistId}`;
        const distributorOrgId = artist.labelOrgId ? 'ORG_SONGBIRD' : 'ORG_LUNERUM_DIST';
        tracks.unshift({
          trackId,
          title: project.title,
          artistId: artist.artistId,
          stageName: artist.stageName,
          kind: 'single',
          genre: artist.genres[0] || 'Independent Pop',
          durationSeconds: 180 + (deterministicHash(trackId) % 90),
          audioUrl: SHIPPED_AUDIO_ASSETS[deterministicHash(trackId) % SHIPPED_AUDIO_ASSETS.length].audioUrl,
          coverArtUrl: '/media/albums/album-neon-starlight.jpg',
          producerOrgId: project.partnerOrgId,
          publisherOrgId: artist.publisherOrgId || 'ORG_KAJI_PUBLISHING',
          collaboratorArtistIds: [],
          mmrsRegistered: true,
          masterOwnedByArtist: project.masterOwnedByArtist,
          quality: project.quality,
          streams: 0,
          radioSpins: 0,
          stickerEdition: '',
          createdCycle: cyc,
        });
        releases.unshift({
          releaseId: `REL-NPC-${cyc}-${artist.artistId}`,
          trackId,
          trackIds: [trackId],
          artistId: artist.artistId,
          stageName: artist.stageName,
          title: project.title,
          format: 'Single',
          platform: 'Songbird',
          distributorOrgId,
          labelOrgId: artist.labelOrgId,
          royaltyRate: project.masterOwnedByArtist ? 0.92 : 0.55,
          releaseCycle: cyc + 1,
          status: 'scheduled',
        });
        mediaItems.unshift({
          mediaId: `MED-NPC-MUSIC-${cyc}-${artist.artistId}`,
          orgId: 'ORG_MARLIE_RECORDS',
          outletName: 'Marlie Records Dispatch',
          kind: 'feature',
          headline: `${artist.stageName} Completes a New Independent Session`,
          summary: `${project.partnerOrgId === 'ORG_KAJI_PUBLISHING' ? 'Kaji Publishing' : 'A Meridion studio'} registered the production for ${artist.stageName}; MMRS rights and Songbird distribution are being prepared.`,
          subjectArtistIds: [artist.artistId],
          sentiment: 'positive',
          cycle: cyc,
        });
      } else if (project.discipline === 'modeling') {
        const sponsorOrgId = project.partnerOrgId === 'ORG_GLASSLINE_DESIGNS' ? 'ORG_AMRIELLE' : 'ORG_ROSEMONT_PORTRAIT';
        mediaItems.unshift({
          mediaId: `MED-NPC-FASHION-${cyc}-${artist.artistId}`,
          orgId: 'ORG_GLASSLINE_DESIGNS',
          outletName: 'Glassline Look Desk',
          kind: 'review',
          headline: `${artist.stageName} Debuts a New ${project.partnerOrgId === 'ORG_GLASSLINE_DESIGNS' ? 'Glassline' : 'Amrielle'} Campaign`,
          summary: `Willow Whisper cast the campaign, ${getEntertainmentOrganization(sponsorOrgId)?.shortName || 'Rosemont'} delivered portfolio photography, and the collection entered public promotion.`,
          subjectArtistIds: [artist.artistId],
          sentiment: 'positive',
          cycle: cyc,
        });
      } else {
        mediaItems.unshift({
          mediaId: `MED-NPC-PRODUCTION-${cyc}-${artist.artistId}`,
          orgId: 'ORG_OPEN_CALL',
          outletName: 'Open Call Casting',
          kind: 'review',
          headline: `${artist.stageName} Wraps ${project.title}`,
          summary: `Casting, rehearsals and production wrapped with ${getEntertainmentOrganization(project.partnerOrgId)?.shortName || 'the studio'}; premiere promotion and audience response are now entering the cultural cycle.`,
          subjectArtistIds: [artist.artistId],
          sentiment: 'positive',
          cycle: cyc,
        });
      }
      artists[artistIndex] = adjustArtistFame(
        artist,
        {
          recognition: 1.8,
          artisticCredibility: 2.4,
          industryReputation: 1.6,
          mediaVisibility: 2.2,
          commercialInfluence: 1.2,
        },
        cyc,
      );
    }

    // 4. Autonomous NPC concert scheduling & open audition replenishment
    const scheduledCount = concerts.filter((c) => c.status === 'scheduled').length;
    if (scheduledCount < 3 && artists.length > 0) {
      const npcArtists = artists.filter((a) => a.origin === 'npc' && a.careerStatus === 'active');
      if (npcArtists.length > 0) {
        const pickArt = npcArtists[cyc % npcArtists.length];
        const venue = pickArt.recognition >= 60 ? VENUE_CATALOG[2] : VENUE_CATALOG[0];
        const targetCycle = cyc + 2;
        if (!concerts.some((c) => c.venueOrgId === venue.orgId && c.scheduledCycle === targetCycle && c.slot === 'evening')) {
          concerts.push({
            concertId: `CON-AUTO-${cyc}-${pickArt.artistId}`,
            artistId: pickArt.artistId,
            stageName: pickArt.stageName,
            title: `${pickArt.stageName} Live at ${venue.name}`,
            venue: venue.name,
            venueOrgId: venue.orgId,
            promoterOrgId: venue.capacity >= 1000 ? 'ORG_VELVET_CURTAIN' : '',
            scheduledCycle: targetCycle,
            slot: 'evening',
            dateLabel: `Cycle ${targetCycle} · Evening`,
            ticketPrice: venue.suggestedTicket,
            capacity: venue.capacity,
            rentalCost: venue.rentalCost,
            ticketsSold: Math.round(venue.capacity * 0.25),
            grossRevenue: Math.round(venue.capacity * 0.25 * venue.suggestedTicket),
            netArtistPayout: 0,
            audienceReaction: 'Advance box office open.',
            status: 'scheduled',
          });
        }
      }
    }

    // Close expired auditions & spawn fresh Open Call breakdowns
    for (const aud of auditions) {
      if (aud.status === 'open' && aud.applicants.length < 3 && npcArtists.length > 0) {
        const applicant = npcArtists[(cyc + aud.applicants.length) % npcArtists.length];
        if (!aud.applicants.some((applicantEntry) => applicantEntry.artistId === applicant.artistId)) {
          const score = Math.round(
            applicant.artisticCredibility * 0.35 +
            applicant.industryReputation * 0.25 +
            (45 + (deterministicHash(`${aud.auditionId}:${applicant.artistId}:${cyc}`) % 40)) * 0.4,
          );
          aud.applicants.push({
            artistId: applicant.artistId,
            stageName: applicant.stageName,
            score,
            submittedCycle: cyc,
          });
        }
      }
      if (aud.status === 'open' && aud.deadlineCycle <= cyc) {
        if (aud.applicants.length > 0) {
          const best = [...aud.applicants].sort((a, b) => b.score - a.score)[0];
          aud.selectedArtistId = best.artistId;
          aud.status = 'cast';
          const selectedIndex = artists.findIndex((artist) => artist.artistId === best.artistId);
          if (selectedIndex >= 0) {
            projects.unshift({
              projectId: `PRJ-CAST-NPC-${cyc}-${aud.auditionId}`,
              artistId: best.artistId,
              title: aud.title,
              kind: aud.discipline === 'acting' ? 'series' : aud.discipline === 'dance' ? 'choreography' : aud.discipline === 'modeling' ? 'fashion_campaign' : 'stage_play',
              discipline: aud.discipline,
              partnerOrgId: aud.productionOrgId,
              collaboratorArtistId: '',
              budgetCredits: aud.stipendCredits * 4,
              deadlineCycle: cyc + 3,
              progress: 50,
              quality: Math.min(98, Math.round(best.score + 12)),
              masterOwnedByArtist: false,
              status: 'in_production',
            });
            artists[selectedIndex] = adjustArtistFame(
              artists[selectedIndex],
              { industryReputation: 2.5, artisticCredibility: 2.0, recognition: 1.5 },
              cyc,
            );
          }
        } else {
          aud.status = 'closed';
        }
      }
    }
    if (auditions.filter((a) => a.status === 'open').length < 4) {
      const templates: Array<{ title: string; orgId: string; prodOrg: string; disc: EntertainmentDisciplineId; open: boolean; cred: number; pay: number }> = [
        { title: 'Mirrora Night-Shoot Episodic Guest Lead', orgId: 'ORG_OPEN_CALL', prodOrg: 'ORG_MIRRORA_STUDIOS', disc: 'acting', open: true, cred: 12, pay: 340 },
        { title: 'Pop Sticker Booth 88 Acoustic Guest Session', orgId: 'ORG_POP_STICKER', prodOrg: 'ORG_POP_STICKER', disc: 'music', open: true, cred: 8, pay: 210 },
        { title: 'Femme Fatale Cabaret Revival Principal', orgId: 'ORG_FEMME_FATALE', prodOrg: 'ORG_MARIGOLD_THEATRE', disc: 'dance', open: true, cred: 16, pay: 380 },
        { title: 'Glassline Designs Atelier Runway Lookbook', orgId: 'ORG_WILLOW_WHISPER', prodOrg: 'ORG_GLASSLINE_DESIGNS', disc: 'modeling', open: true, cred: 15, pay: 420 },
      ];
      const tpl = templates[cyc % templates.length];
      auditions.push({
        auditionId: `AUD-AUTO-${cyc}`,
        title: tpl.title,
        orgId: tpl.orgId,
        productionOrgId: tpl.prodOrg,
        discipline: tpl.disc,
        openToUnrepresented: tpl.open,
        minCredibility: tpl.cred,
        stipendCredits: tpl.pay,
        deadlineCycle: cyc + 4,
        applicants: [],
        selectedArtistId: '',
        status: 'open',
      });
    }

    // 5. Inactivity & hiatus fame decay (artisticCredibility holds steady; visibility & commercial cool off)
    artists = artists.map((art) => {
      const idleCycles = cyc - (art.lastActiveCycle ?? cyc);
      if (art.careerStatus === 'hiatus' || art.careerStatus === 'retired' || idleCycles >= 4) {
        return adjustArtistFame(art, {
          mediaVisibility: -1.4,
          commercialInfluence: -0.8,
          recognition: -0.4,
        });
      }
      return art;
    });

    // 6. Radiance Awards ceremony resolution & new cycle opening
    for (const aw of awards) {
      if (aw.status === 'open' && cyc >= aw.ceremonyCycle) {
        aw.status = 'completed';
        const byCat = new Map<string, RadianceAwardCycle['nominees']>();
        for (const nom of aw.nominees) {
          const list = byCat.get(nom.category) || [];
          list.push(nom);
          byCat.set(nom.category, list);
        }
        aw.winners = [];
        for (const [, list] of byCat.entries()) {
          const winner = [...list].sort((a, b) => b.score - a.score)[0];
          if (winner) {
            aw.winners.push(winner);
            const idx = artists.findIndex((a) => a.artistId === winner.artistId);
            if (idx >= 0) {
              artists[idx] = adjustArtistFame(
                artists[idx],
                {
                  industryReputation: 8.5,
                  artisticCredibility: 6.5,
                  recognition: 6.0,
                  culturalInfluence: 7.0,
                  mediaVisibility: 7.5,
                },
                cyc,
              );
            }
          }
        }
        if (aw.winners.length > 0) {
          mediaItems.unshift({
            mediaId: `MED-RADIANCE-${aw.awardCycleId}`,
            orgId: 'ORG_RADIANCE_AWARDS',
            outletName: 'The Radiance Awards',
            kind: 'award_news',
            headline: `Radiance Hall Honors Winners: ${aw.winners.map((w) => w.stageName).join(', ')}`,
            summary: `Academy peers concluded voting across ${aw.winners.length} categories at Radiance Hall.`,
            subjectArtistIds: aw.winners.map((w) => w.artistId),
            sentiment: 'positive',
            cycle: cyc,
          });
        }
      }
    }
    if (!awards.some((a) => a.status === 'open')) {
      const sorted = [...artists].sort((a, b) => b.artisticCredibility + b.recognition - (a.artisticCredibility + a.recognition)).slice(0, 4);
      awards.unshift({
        awardCycleId: `RADIANCE-C${cyc}`,
        cycle: cyc,
        ceremonyCycle: cyc + 8,
        status: 'open',
        nominees: sorted.map((a, i) => ({
          artistId: a.artistId,
          stageName: a.stageName,
          category: i % 2 === 0 ? 'Recorded Music of the Year' : 'Screen & Stage Performance',
          workTitle: tracks.find((t) => t.artistId === a.artistId)?.title || `${a.stageName} Showcase`,
          score: Math.round((a.artisticCredibility * 0.5 + a.culturalInfluence * 0.3 + a.industryReputation * 0.2) * 10) / 10,
        })),
        winners: [],
      });
    }
  }

  return {
    ...state,
    lastSimulatedCycle: nextCycle,
    artists,
    tracks,
    releases,
    concerts,
    auditions,
    projects,
    contracts,
    mediaItems: mediaItems.slice(0, 40),
    controversies: controversies.slice(0, 25),
    awards: awards.slice(0, 8),
  };
}

function normalizeRemoteProduction(raw: any, existing: EntertainmentProject | undefined, cycle: number): EntertainmentProject {
  const projectId = String(raw.projectId || raw.productionId || existing?.projectId || '');
  const rawKind = String(raw.kind || existing?.kind || 'film').toLowerCase();
  const kindMap: Record<string, EntertainmentProject['kind']> = {
    single: 'single',
    album: 'album',
    film: 'film',
    series: 'series',
    animation: 'film',
    dance: 'choreography',
    choreography: 'choreography',
    theatre: 'stage_play',
    stage_play: 'stage_play',
    modeling: 'fashion_campaign',
    fashion_campaign: 'fashion_campaign',
    promo_kit: 'promo_kit',
  };
  const disciplineMap: Record<string, EntertainmentDisciplineId> = {
    single: 'music',
    album: 'music',
    film: 'acting',
    series: 'acting',
    animation: 'acting',
    dance: 'dance',
    choreography: 'dance',
    theatre: 'theatre',
    stage_play: 'theatre',
    modeling: 'modeling',
    fashion_campaign: 'modeling',
    promo_kit: 'public_relations',
  };
  const statusMap: Record<string, EntertainmentProject['status']> = {
    in_production: 'in_production',
    pre_production: 'in_production',
    development: 'in_production',
    post_production: 'in_production',
    completed: 'completed',
    wrapped: 'completed',
    released: 'released',
  };
  const mappedKind = kindMap[rawKind] ?? existing?.kind ?? 'film';
  const mappedDiscipline = (raw.discipline as EntertainmentDisciplineId) || disciplineMap[rawKind] || existing?.discipline || 'acting';
  const mappedStatus = statusMap[String(raw.status || '').toLowerCase()] ?? existing?.status ?? 'in_production';
  return {
    projectId,
    artistId: String(raw.artistId || (Array.isArray(raw.castArtistIds) && raw.castArtistIds[0]) || existing?.artistId || ''),
    title: String(raw.title || existing?.title || 'Untitled Production'),
    kind: mappedKind,
    discipline: mappedDiscipline,
    partnerOrgId: String(raw.partnerOrgId || raw.studioOrgId || existing?.partnerOrgId || ''),
    collaboratorArtistId: String(raw.collaboratorArtistId || existing?.collaboratorArtistId || ''),
    budgetCredits: Number.isFinite(Number(raw.budgetCredits)) ? Number(raw.budgetCredits) : (existing?.budgetCredits ?? 0),
    deadlineCycle: Number.isFinite(Number(raw.deadlineCycle ?? raw.deadlineDay)) ? Number(raw.deadlineCycle ?? raw.deadlineDay) : (existing?.deadlineCycle ?? cycle + 4),
    progress: Number.isFinite(Number(raw.progress)) ? Number(raw.progress) : (mappedStatus === 'released' || mappedStatus === 'completed' ? 100 : (existing?.progress ?? 25)),
    quality: Number.isFinite(Number(raw.quality)) ? Number(raw.quality) : (existing?.quality ?? 70),
    masterOwnedByArtist: typeof raw.masterOwnedByArtist === 'boolean' ? raw.masterOwnedByArtist : (existing?.masterOwnedByArtist ?? false),
    audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : existing?.audioUrl,
    genre: typeof raw.genre === 'string' ? raw.genre : existing?.genre,
    status: mappedStatus,
  };
}

function normalizeRemoteVenue(raw: any): EntertainmentVenueMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const orgId = String(raw.orgId || raw.venueOrgId || raw.OrganizationId || '').trim();
  const name = String(raw.name || raw.Name || '').trim();
  if (!orgId || !name) return null;
  const fallback = VENUE_CATALOG.find((v) => v.orgId === orgId);
  return {
    orgId,
    name,
    district: String(raw.district || fallback?.district || 'Aureline'),
    capacity: Number.isFinite(Number(raw.capacity)) ? Number(raw.capacity) : (fallback?.capacity ?? 180),
    minRecognition: Number.isFinite(Number(raw.minRecognition)) ? Number(raw.minRecognition) : (fallback?.minRecognition ?? 0),
    rentalCost: Number.isFinite(Number(raw.rentalCost)) ? Number(raw.rentalCost) : (fallback?.rentalCost ?? 65),
    suggestedTicket: Number.isFinite(Number(raw.suggestedTicket ?? raw.defaultTicket))
      ? Number(raw.suggestedTicket ?? raw.defaultTicket)
      : (fallback?.suggestedTicket ?? 18),
    locationId: typeof raw.locationId === 'string' ? raw.locationId : fallback?.locationId,
  };
}

/**
 * Reconciles authoritative live simulation records from `GET /api/livingworld/entertainment`
 * into the frontend EntertainmentState.
 *
 * Ownership rules:
 * - When a remote collection is explicitly supplied (including an empty array `[]`),
 *   Python's Living World snapshot is authoritative: obsolete local NPC/auto-generated
 *   records are pruned instead of lingering indefinitely.
 * - Presentation-only fields (album covers, posters, local ticket attendance flags) are
 *   preserved by record ID where the remote record omits them.
 * - Remote `productions` are normalized and mapped into `projects`.
 * - Remote `venues` update the synced database venue catalog.
 * - Local UI preferences (`followedArtistIds`, `collectedStickers`, `playedTrackIds`,
 *   `receiptIds`, `disciplineProgress`) stay client-owned.
 */
export function mergeLivingWorldEntertainmentSnapshot(
  local: EntertainmentState,
  remote: any,
  cycle: number,
): EntertainmentState {
  if (!remote || typeof remote !== 'object') return local;

  const replaceAuthoritative = <T extends Record<string, any>>(
    localArr: T[],
    remoteArr: unknown,
    key: string,
    normalize?: (remoteItem: any, existing: T | undefined) => T,
  ): T[] => {
    if (!Array.isArray(remoteArr)) return localArr;
    const localById = new Map<string, T>();
    for (const item of localArr) {
      if (item && typeof item[key] === 'string') localById.set(item[key], item);
    }
    const seen = new Set<string>();
    const next: T[] = [];
    for (const raw of remoteArr) {
      if (!raw || typeof raw !== 'object') continue;
      const id = String(raw[key] || (key === 'projectId' ? raw.productionId : '') || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const existing = localById.get(id);
      if (normalize) {
        next.push(normalize(raw, existing));
      } else {
        next.push(existing ? ({ ...existing, ...raw } as T) : (raw as T));
      }
    }
    return next;
  };

  let mergedArtists = replaceAuthoritative<EntertainmentArtist>(
    local.artists,
    remote.artists,
    'artistId',
    (r, existing) => {
      const merged: EntertainmentArtist = {
        ...(existing ?? {}),
        ...r,
        disciplines: Array.isArray(r.disciplines) && r.disciplines.length > 0 ? r.disciplines : (existing?.disciplines ?? ['music']),
        genres: Array.isArray(r.genres) ? r.genres : (existing?.genres ?? []),
        portfolioArtifactIds: Array.isArray(r.portfolioArtifactIds) ? r.portfolioArtifactIds : (existing?.portfolioArtifactIds ?? []),
        collaboratorIds: Array.isArray(r.collaboratorIds) ? r.collaboratorIds : (existing?.collaboratorIds ?? []),
        rivalryIds: Array.isArray(r.rivalryIds) ? r.rivalryIds : (existing?.rivalryIds ?? []),
        lastActiveCycle: Number.isFinite(Number(r.lastActiveCycle ?? r.lastActiveDay))
          ? Number(r.lastActiveCycle ?? r.lastActiveDay)
          : (existing?.lastActiveCycle ?? cycle),
      };
      return { ...merged, tier: computeFameTier(merged) };
    },
  );

  // Retain an in-flight local player artist registration if Python has not yet persisted it
  if (local.playerArtistId && !mergedArtists.some((a) => a.artistId === local.playerArtistId)) {
    const localPlayer = local.artists.find((a) => a.artistId === local.playerArtistId && a.origin === 'player');
    if (localPlayer) {
      mergedArtists = [localPlayer, ...mergedArtists];
    }
  }

  const playerArtist =
    (local.playerArtistId && mergedArtists.find((a) => a.artistId === local.playerArtistId)) ||
    mergedArtists.find((a) => a.origin === 'player');

  const mergedTracks = replaceAuthoritative<EntertainmentTrack>(
    local.tracks,
    remote.tracks,
    'trackId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      coverArtUrl: r.coverArtUrl || existing?.coverArtUrl || SHIPPED_AUDIO_ASSETS.find((s) => s.audioUrl === r.audioUrl)?.coverArtUrl,
      createdCycle: Number.isFinite(Number(r.createdCycle ?? r.createdDay))
        ? Number(r.createdCycle ?? r.createdDay)
        : (existing?.createdCycle ?? cycle),
    }),
  );

  const mergedReleases = replaceAuthoritative<EntertainmentRelease>(
    local.releases,
    remote.releases,
    'releaseId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      trackIds: Array.isArray(r.trackIds) ? r.trackIds : (r.trackId ? [r.trackId] : (existing?.trackIds ?? [])),
      format: r.format || (r.kind === 'album' ? 'Album' : r.kind === 'ep_track' ? 'EP' : r.kind === 'score' ? 'Soundtrack' : 'Single'),
      platform: r.platform || (r.platformOrgId ? (getEntertainmentOrganization(r.platformOrgId)?.shortName ?? 'Songbird') : (existing?.platform ?? 'Songbird')),
      royaltyRate: Number.isFinite(Number(r.royaltyRate ?? r.expectedRoyaltyRate))
        ? Number(r.royaltyRate ?? r.expectedRoyaltyRate)
        : (existing?.royaltyRate ?? 0.14),
      releaseCycle: Number.isFinite(Number(r.releaseCycle ?? r.releasedDay ?? r.scheduledDay))
        ? Number(r.releaseCycle ?? r.releasedDay ?? r.scheduledDay)
        : (existing?.releaseCycle ?? cycle),
    }),
  );

  const mergedConcerts = replaceAuthoritative<EntertainmentConcert>(
    local.concerts,
    remote.concerts,
    'concertId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      scheduledCycle: Number.isFinite(Number(r.scheduledCycle ?? r.scheduledDay))
        ? Number(r.scheduledCycle ?? r.scheduledDay)
        : (existing?.scheduledCycle ?? cycle),
      dateLabel: r.dateLabel || r.date || existing?.dateLabel || `Cycle ${cycle}`,
      audienceReaction: r.audienceReaction || existing?.audienceReaction || (r.status === 'completed' ? 'Show concluded.' : 'Advance box office open.'),
    }),
  );

  const mergedAuditions = replaceAuthoritative<EntertainmentAudition>(
    local.auditions,
    remote.auditions,
    'auditionId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      posterUrl: r.posterUrl || existing?.posterUrl,
      deadlineCycle: Number.isFinite(Number(r.deadlineCycle ?? r.deadlineDay))
        ? Number(r.deadlineCycle ?? r.deadlineDay)
        : (existing?.deadlineCycle ?? cycle + 3),
      status: r.status === 'expired' ? 'closed' : (r.status || existing?.status || 'open'),
    }),
  );

  const mergedContracts = replaceAuthoritative<EntertainmentContract>(
    local.contracts,
    remote.contracts,
    'contractId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      orgName: r.orgName || getEntertainmentOrganization(r.orgId)?.name || existing?.orgName || r.orgId,
      startCycle: Number.isFinite(Number(r.startCycle ?? r.startDay))
        ? Number(r.startCycle ?? r.startDay)
        : (existing?.startCycle ?? cycle),
      expiresCycle: Number.isFinite(Number(r.expiresCycle ?? r.expiresDay))
        ? Number(r.expiresCycle ?? r.expiresDay)
        : (existing?.expiresCycle ?? cycle + 12),
    }),
  );

  const remoteProjectsSource = Array.isArray(remote.productions)
    ? remote.productions
    : Array.isArray(remote.projects)
      ? remote.projects
      : undefined;
  const mergedProjects = replaceAuthoritative<EntertainmentProject>(
    local.projects,
    remoteProjectsSource,
    'projectId',
    (r, existing) => normalizeRemoteProduction(r, existing, cycle),
  );

  const mergedSponsorships = replaceAuthoritative<EntertainmentSponsorship>(
    local.sponsorships,
    remote.sponsorships,
    'sponsorshipId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      sponsorName: r.sponsorName || getEntertainmentOrganization(r.sponsorOrgId)?.name || existing?.sponsorName || r.sponsorOrgId,
      startCycle: Number.isFinite(Number(r.startCycle ?? r.startDay))
        ? Number(r.startCycle ?? r.startDay)
        : (existing?.startCycle ?? cycle),
    }),
  );

  const mergedMediaItems = replaceAuthoritative<EntertainmentMediaItem>(
    local.mediaItems,
    remote.mediaItems,
    'mediaId',
    (r, existing) => {
      const kindMap: Record<string, EntertainmentMediaItem['kind']> = {
        release_review: 'review',
        collaboration: 'feature',
        awards: 'award_news',
        feature: 'feature',
        review: 'review',
        interview: 'interview',
        radio_premiere: 'radio_premiere',
        gossip: 'gossip',
        statement: 'statement',
        award_news: 'award_news',
      };
      const sentiment =
        r.sentiment === 'critical' ? 'critical' : r.sentiment === 'mixed' ? 'mixed' : 'positive';
      return {
        ...(existing ?? {}),
        ...r,
        outletName: r.outletName || getEntertainmentOrganization(r.orgId)?.shortName || existing?.outletName || 'Limelight',
        kind: kindMap[String(r.kind || '')] ?? existing?.kind ?? 'feature',
        sentiment,
        cycle: Number.isFinite(Number(r.cycle ?? r.dayIndex)) ? Number(r.cycle ?? r.dayIndex) : (existing?.cycle ?? cycle),
      };
    },
  ).slice(0, 40);

  const mergedControversies = replaceAuthoritative<EntertainmentControversy>(
    local.controversies,
    remote.controversies,
    'controversyId',
    (r, existing) => {
      const sev =
        typeof r.severity === 'number'
          ? r.severity
          : r.severity === 'high'
            ? 75
            : r.severity === 'low'
              ? 25
              : 50;
      const status: EntertainmentControversy['status'] =
        r.status === 'addressed' || r.status === 'resolved'
          ? 'addressed'
          : r.status === 'faded'
            ? 'faded'
            : 'active';
      return {
        ...(existing ?? {}),
        ...r,
        topic: r.topic || r.headline || existing?.topic || 'Public Scrutiny',
        severity: sev,
        status,
        cycle: Number.isFinite(Number(r.cycle ?? r.dayIndex)) ? Number(r.cycle ?? r.dayIndex) : (existing?.cycle ?? cycle),
      };
    },
  ).slice(0, 25);

  const mergedAwards = replaceAuthoritative<RadianceAwardCycle>(
    local.awards,
    remote.awards,
    'awardCycleId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      cycle: Number.isFinite(Number(r.cycle ?? r.dayIndex ?? r.ceremonyDay))
        ? Number(r.cycle ?? r.dayIndex ?? r.ceremonyDay)
        : (existing?.cycle ?? cycle),
      ceremonyCycle: Number.isFinite(Number(r.ceremonyCycle ?? r.ceremonyDay))
        ? Number(r.ceremonyCycle ?? r.ceremonyDay)
        : (existing?.ceremonyCycle ?? cycle + 6),
    }),
  ).slice(0, 8);

  const mergedFanCommunities = replaceAuthoritative<FanCommunity>(
    local.fanCommunities,
    remote.fanCommunities,
    'communityId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      memberIds: Array.isArray(r.memberIds)
        ? r.memberIds
        : Array.isArray(r.memberCharacterIds)
          ? r.memberCharacterIds
          : (existing?.memberIds ?? []),
    }),
  );

  const mergedTickets = replaceAuthoritative<EventTicketReceipt>(
    local.tickets,
    remote.tickets,
    'ticketId',
    (r, existing) => ({
      ...(existing ?? {}),
      ...r,
      scheduledCycle: Number.isFinite(Number(r.scheduledCycle ?? r.scheduledDay))
        ? Number(r.scheduledCycle ?? r.scheduledDay)
        : (existing?.scheduledCycle ?? cycle),
      purchasedCycle: Number.isFinite(Number(r.purchasedCycle ?? r.purchasedDay))
        ? Number(r.purchasedCycle ?? r.purchasedDay)
        : (existing?.purchasedCycle ?? cycle),
      attended: Boolean(existing?.attended || r.attended),
    }),
  );

  const syncedVenues = Array.isArray(remote.venues)
    ? remote.venues.map(normalizeRemoteVenue).filter((v): v is EntertainmentVenueMeta => v !== null)
    : local.venues;

  return {
    ...local,
    authorityMode: 'living_world',
    lastLivingWorldSyncAt: new Date().toISOString(),
    ...(syncedVenues && syncedVenues.length > 0 ? { venues: syncedVenues } : {}),
    lastSimulatedCycle: Math.max(local.lastSimulatedCycle, cycle),
    playerArtistId: playerArtist ? playerArtist.artistId : local.playerArtistId,
    artists: mergedArtists,
    tracks: mergedTracks,
    releases: mergedReleases,
    concerts: mergedConcerts,
    auditions: mergedAuditions,
    contracts: mergedContracts,
    projects: mergedProjects,
    sponsorships: mergedSponsorships,
    mediaItems: mergedMediaItems,
    controversies: mergedControversies,
    awards: mergedAwards,
    fanCommunities: mergedFanCommunities,
    tickets: mergedTickets,
  };
}
