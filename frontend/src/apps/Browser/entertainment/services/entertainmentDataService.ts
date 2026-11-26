import { useMemo, useState } from 'react';
import { useOSStore } from '../../../../store/useOSStore';
import {
  ENTERTAINMENT_DISCIPLINES,
  FAME_AXES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  computeCommunityReception,
  getEntertainmentOrganization,
  restoreEntertainmentState,
  type EntertainmentArtist,
  type EntertainmentAudition,
  type EntertainmentConcert,
  type EntertainmentContract,
  type EntertainmentDisciplineId,
  type EntertainmentMediaItem,
  type EntertainmentProject,
  type EntertainmentRelease,
  type EntertainmentSponsorship,
  type EntertainmentState,
  type EntertainmentTrack,
} from '../../../../gameplay/EntertainmentEcosystem';
import {
  ENTERTAINMENT_SITES,
  buildSiteUrl,
  getEntertainmentSiteByOrgId,
  type EntertainmentSiteMeta,
} from '../entertainmentRouter';
import brandKits from '../../../../game-content/media-assets/brand-kits.json';
import manifest from '../../../../game-content/media-assets/manifest.json';

export {
  ENTERTAINMENT_DISCIPLINES,
  FAME_AXES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  computeCommunityReception,
  type EntertainmentArtist,
  type EntertainmentAudition,
  type EntertainmentConcert,
  type EntertainmentContract,
  type EntertainmentDisciplineId,
  type EntertainmentMediaItem,
  type EntertainmentProject,
  type EntertainmentRelease,
  type EntertainmentSponsorship,
  type EntertainmentState,
  type EntertainmentTrack,
};

export interface OrgDepartment {
  id: string;
  name: string;
  head: string;
  focus: string;
}

export interface CanonicalEntertainmentOrg {
  id: string;
  name: string;
  shortName: string;
  domain: string;
  sector: string;
  kind: string;
  realm: string;
  seat: string;
  tagline: string;
  description: string;
  publicReputation?: string;
  internalTension?: string;
  commissionRate?: number;
  royaltySplitArtist?: number;
  services?: string[];
  partnerOrgIds?: string[];
  departments?: OrgDepartment[];
}

export interface OrgMediaAsset {
  id: string;
  src: string;
  caption: string;
  slotRole: string;
}

export function getOrgApprovedArtwork(orgId: string, limit = 6): OrgMediaAsset[] {
  return manifest.assets
    .filter(
      (asset) =>
        asset.entityIds.includes(orgId) &&
        asset.provenance.approvalStatus === 'approved' &&
        ['media.album', 'media.poster', 'media.editorial', 'media.campaign', 'media.photo'].includes(asset.slotRole),
    )
    .slice(0, limit)
    .map((asset) => ({ id: asset.id, src: asset.src, caption: asset.caption, slotRole: asset.slotRole }));
}

export function getOrgBrandMark(orgId: string): string | undefined {
  const kit = Object.values(brandKits.brandKits).find(
    (brand) => 'organizationId' in brand && brand.organizationId === orgId,
  );
  const assetIds = Object.values(kit?.assets ?? {});
  const mark = manifest.assets.find(
    (asset) =>
      asset.provenance.approvalStatus === 'approved' &&
      /^ornament\.(crest|star|monogram|mark|logo)/.test(asset.slotRole) &&
      (assetIds.includes(asset.id) || asset.entityIds.includes(orgId)),
  );
  return mark?.src;
}

export function getTrackCoverUrl(track: EntertainmentTrack): string {
  return (
    track.coverArtUrl ||
    SHIPPED_AUDIO_ASSETS.find((x) => x.audioUrl === track.audioUrl)?.coverArtUrl ||
    '/media/albums/album-marble-lilies.jpg'
  );
}

/** Cross-site canonical links so entities connect naturally across VerseNet */
export const crossSiteLinks = {
  songbirdArtist: (artistId: string) => {
    const sb = getEntertainmentSiteByOrgId('ORG_SONGBIRD');
    return sb ? buildSiteUrl(sb, `/artist/${encodeURIComponent(artistId)}`) : 'https://songbird.mer';
  },
  songbirdAlbum: (releaseOrTrackId: string) => {
    const sb = getEntertainmentSiteByOrgId('ORG_SONGBIRD');
    return sb ? buildSiteUrl(sb, `/album/${encodeURIComponent(releaseOrTrackId)}`) : 'https://songbird.mer';
  },
  limelightStory: (mediaId: string) => {
    const ll = getEntertainmentSiteByOrgId('ORG_LIMELIGHT');
    return ll ? buildSiteUrl(ll, `/stories/${encodeURIComponent(mediaId)}`) : 'https://limelight.mer';
  },
  silverleafEvent: (concertId: string) => {
    const sl = getEntertainmentSiteByOrgId('ORG_SILVERLEAF_STADIUM');
    return sl ? buildSiteUrl(sl, `/events/${encodeURIComponent(concertId)}`) : 'https://silverleafstadium.mer';
  },
  openCallAudition: (auditionId: string) => {
    const oc = getEntertainmentSiteByOrgId('ORG_OPEN_CALL');
    return oc ? buildSiteUrl(oc, `/auditions/${encodeURIComponent(auditionId)}`) : 'https://opencallcasting.mer';
  },
  orgHome: (orgId: string, subPath = '/') => {
    const target = getEntertainmentSiteByOrgId(orgId);
    return target ? buildSiteUrl(target, subPath) : 'https://versenet.aure/culture';
  },
};

export interface EntertainmentPortalData {
  ent: EntertainmentState;
  org: CanonicalEntertainmentOrg | undefined;
  cycle: number;
  isAuthenticated: boolean;
  playerName: string;
  playerCredits: number;
  playerArtist: EntertainmentArtist | undefined;
  publicArtists: EntertainmentArtist[];
  rankedArtists: EntertainmentArtist[];
  topTracks: EntertainmentTrack[];
  activeTrack: EntertainmentTrack | undefined;
  setActiveTrackId: (trackId: string) => void;
  feedback: string;
  setFeedback: (msg: string) => void;
  allSites: EntertainmentSiteMeta[];
  partnerSites: EntertainmentSiteMeta[];
  actions: {
    streamTrack: (trackId: string) => string;
    toggleFollow: (artistId: string) => string;
    joinFanCircle: (artistId: string) => string;
    purchaseTicket: (concertId: string, quantity: number) => string;
    attendTicket: (ticketId: string) => string;
    performConcertNow: (concertId: string) => string;
    submitAudition: (auditionId: string) => string;
    signContract: (args: {
      orgId: string;
      contractType: 'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild';
      royaltySplitArtist?: number;
      switchAgency?: boolean;
    }) => string;
    terminateContract: (contractId: string) => string;
    registerArtist: (args: {
      stageName: string;
      disciplines: EntertainmentDisciplineId[];
      genres: string[];
    }) => string;
    createProject: (args: {
      title: string;
      kind: EntertainmentProject['kind'];
      discipline: EntertainmentDisciplineId;
      partnerOrgId?: string;
      collaboratorArtistId?: string;
      budgetCredits?: number;
      audioUrl?: string;
      genre?: string;
    }) => string;
    advanceProject: (projectId: string) => string;
    publishRelease: (args: {
      projectId?: string;
      title: string;
      genre?: string;
      audioUrl?: string;
      distributorOrgId?: string;
      labelOrgId?: string;
    }) => string;
    submitRadio: (trackId: string) => string;
    bookVenue: (args: {
      venueOrgId: string;
      scheduledInCycles?: number;
      slot?: 'afternoon' | 'evening' | 'late';
      ticketPrice?: number;
    }) => string;
    acceptAppearance: (orgId: string, kind: 'interview' | 'podcast' | 'press_line' | 'red_carpet') => string;
    interactFanCircle: () => string;
    acceptSponsorship: (orgId: string, campaignTitle: string) => string;
    respondControversy: (controversyId: string, strategy: 'accountable_statement' | 'word_of_mouth_pr') => string;
    submitRadianceFyc: (category: string, workTitle: string) => string;
    claimRoyalties: () => string;
    openWorknetMission: (missionId: string) => void;
    signInDemoCitizen: () => void;
  };
}

export function useEntertainmentPortalData(site: EntertainmentSiteMeta): EntertainmentPortalData {
  const gameplay = useOSStore((s) => s.gameplay);
  const isLoggedIn = useOSStore((s) => s.isLoggedIn);
  const cycle = gameplay.timeCycleCount ?? 28;
  const ent = useMemo(() => restoreEntertainmentState(gameplay.entertainment, cycle), [gameplay.entertainment, cycle]);
  const org = useMemo(() => getEntertainmentOrganization(site.orgId) as CanonicalEntertainmentOrg | undefined, [site.orgId]);
  const playerArtist = useMemo(
    () => (ent.playerArtistId ? ent.artists.find((a) => a.artistId === ent.playerArtistId) : undefined),
    [ent],
  );

  const [feedback, setFeedback] = useState('');
  const [activeTrackId, setActiveTrackId] = useState<string>(ent.tracks[0]?.trackId || '');

  const topTracks = useMemo(
    () => [...ent.tracks].sort((a, b) => b.streams + b.radioSpins * 10 - (a.streams + a.radioSpins * 10)),
    [ent.tracks],
  );

  const rankedArtists = useMemo(
    () =>
      [...ent.artists].sort(
        (a, b) =>
          b.recognition * 0.4 +
          b.artisticCredibility * 0.3 +
          b.commercialInfluence * 0.3 -
          (a.recognition * 0.4 + a.artisticCredibility * 0.3 + a.commercialInfluence * 0.3),
      ),
    [ent.artists],
  );

  const publicArtists = useMemo(
    () => rankedArtists.filter((a) => a.privacyBoundary !== 'strict' || a.origin === 'player'),
    [rankedArtists],
  );

  const activeTrack = useMemo(
    () => ent.tracks.find((t) => t.trackId === activeTrackId) || topTracks[0],
    [ent.tracks, activeTrackId, topTracks],
  );

  const partnerSites = useMemo(() => {
    const ids = org?.partnerOrgIds ?? [];
    return ids
      .map((pid) => getEntertainmentSiteByOrgId(pid))
      .filter((s): s is EntertainmentSiteMeta => Boolean(s));
  }, [org]);

  const report = (res: { message?: string }) => {
    const msg = res?.message || 'Action completed.';
    setFeedback(msg);
    return msg;
  };

  const actions: EntertainmentPortalData['actions'] = {
    streamTrack: (trackId) => report(useOSStore.getState().streamSongbirdTrack(trackId)),
    toggleFollow: (artistId) => report(useOSStore.getState().toggleFollowEntertainmentArtist(artistId)),
    joinFanCircle: (artistId) => report(useOSStore.getState().joinEntertainmentFanCommunity(artistId)),
    purchaseTicket: (concertId, quantity) => report(useOSStore.getState().purchaseEntertainmentTicket(concertId, quantity)),
    attendTicket: (ticketId) => report(useOSStore.getState().attendPurchasedPerformance(ticketId)),
    performConcertNow: (concertId) => report(useOSStore.getState().performScheduledConcertNow(concertId)),
    submitAudition: (auditionId) => report(useOSStore.getState().submitEntertainmentAudition(auditionId)),
    signContract: (args) => report(useOSStore.getState().signOrNegotiateEntertainmentContract(args)),
    terminateContract: (contractId) => report(useOSStore.getState().terminateEntertainmentContract(contractId)),
    registerArtist: (args) => report(useOSStore.getState().registerOrUpdateArtistProfile(args)),
    createProject: (args) => report(useOSStore.getState().createEntertainmentProject(args)),
    advanceProject: (projectId) => report(useOSStore.getState().advanceEntertainmentProject(projectId)),
    publishRelease: (args) => report(useOSStore.getState().publishEntertainmentRelease(args)),
    submitRadio: (trackId) => report(useOSStore.getState().submitTrackToPopStickerRadio(trackId)),
    bookVenue: (args) =>
      report(
        useOSStore.getState().bookEntertainmentVenue({
          ...args,
          ticketPrice: args.ticketPrice ?? 24,
        }),
      ),
    acceptAppearance: (orgId, kind) => report(useOSStore.getState().acceptEntertainmentAppearance({ orgId, kind })),
    interactFanCircle: () => report(useOSStore.getState().interactWithFanCommunity()),
    acceptSponsorship: (orgId, campaignTitle) => report(useOSStore.getState().acceptBrandSponsorship(orgId, campaignTitle)),
    respondControversy: (controversyId, strategy) =>
      report(useOSStore.getState().respondToCelebrityControversy(controversyId, strategy)),
    submitRadianceFyc: (category, workTitle) =>
      report(useOSStore.getState().submitRadianceAwardCampaign(category, workTitle)),
    claimRoyalties: () => report(useOSStore.getState().claimEntertainmentRoyalties()),
    openWorknetMission: (missionId) => {
      const s = useOSStore.getState();
      s.openAssignment(missionId);
      s.openAppWorkspace('jobs', 'assignment');
    },
    signInDemoCitizen: () => {
      const s = useOSStore.getState();
      if (!s.isLoggedIn) {
        s.loginUser({ name: gameplay.player?.name || 'Meridion Citizen', credits: gameplay.player?.credits ?? 500, clearance: 2 });
        setFeedback('Signed in to VerseNet Citizen Session.');
      }
    },
  };

  return {
    ent,
    org,
    cycle,
    isAuthenticated: Boolean(isLoggedIn),
    playerName: gameplay.player?.name || 'Guest Visitor',
    playerCredits: gameplay.player?.credits ?? 0,
    playerArtist,
    publicArtists,
    rankedArtists,
    topTracks,
    activeTrack,
    setActiveTrackId,
    feedback,
    setFeedback,
    allSites: ENTERTAINMENT_SITES,
    partnerSites,
    actions,
  };
}
