import {
  ENTERTAINMENT_DISCIPLINES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  adjustArtistFame,
  awardDisciplineXP,
  getEntertainmentOrganization,
  mergeLivingWorldEntertainmentSnapshot,
  restoreEntertainmentState,
  type EntertainmentArtist,
  type EntertainmentContract,
  type EntertainmentDisciplineId,
  type EntertainmentProject,
  type EntertainmentState,
} from '../gameplay/EntertainmentEcosystem';
import { restoreSocial } from '../apps/social/socialModel';
import {
  addRunTrack,
  enqueue,
  getEntertainmentSnapshot,
  manageRunContract,
  manageRunProduction,
  postRunPublicity,
  purchaseRunTicket,
  scheduleRunConcert,
  scheduleRunRelease,
  submitRunAudition,
  upsertRunArtist,
} from '../integration/livingWorldLink';
import { isWorldPaused } from '../integration/worldStateManager';

export interface EntertainmentActions {
  registerOrUpdateArtistProfile: (input: {
    stageName: string;
    bio?: string;
    disciplines?: EntertainmentDisciplineId[];
    genres?: string[];
    privacyBoundary?: 'open' | 'guarded' | 'strict';
    careerStatus?: 'active' | 'hiatus' | 'retired' | 'comeback';
  }) => { ok: boolean; message: string; artist?: EntertainmentArtist };
  linkPortfolioToEntertainment: (artifactId: string) => { ok: boolean; message: string };
  submitEntertainmentAudition: (auditionId: string) => { ok: boolean; message: string; cast?: boolean; score?: number };
  signOrNegotiateEntertainmentContract: (input: {
    orgId: string;
    contractType: EntertainmentContract['contractType'];
    royaltySplitArtist?: number;
    switchAgency?: boolean;
  }) => { ok: boolean; message: string; contract?: EntertainmentContract };
  terminateEntertainmentContract: (contractId: string) => { ok: boolean; message: string };
  createEntertainmentProject: (input: {
    title: string;
    kind: EntertainmentProject['kind'];
    discipline: EntertainmentDisciplineId;
    partnerOrgId?: string;
    collaboratorArtistId?: string;
    budgetCredits?: number;
    masterOwnedByArtist?: boolean;
    audioUrl?: string;
    genre?: string;
  }) => { ok: boolean; message: string; project?: EntertainmentProject };
  advanceEntertainmentProject: (projectId: string) => { ok: boolean; message: string; completed?: boolean };
  publishEntertainmentRelease: (input: {
    projectId?: string;
    title: string;
    format?: 'Single' | 'EP' | 'Album' | 'Soundtrack';
    genre?: string;
    audioUrl?: string;
    coverArtUrl?: string;
    distributorOrgId?: string;
    collaboratorArtistId?: string;
    releaseInCycles?: number;
    masterOwnedByArtist?: boolean;
  }) => { ok: boolean; message: string; trackId?: string; releaseId?: string };
  submitTrackToPopStickerRadio: (trackId: string) => { ok: boolean; message: string; accepted?: boolean; sticker?: string };
  bookEntertainmentVenue: (input: {
    venueOrgId: string;
    title?: string;
    scheduledInCycles?: number;
    slot?: 'afternoon' | 'evening' | 'late';
    ticketPrice: number;
    useVelCurPromoter?: boolean;
  }) => { ok: boolean; message: string; concertId?: string };
  performScheduledConcertNow: (concertId: string) => { ok: boolean; message: string; payout?: number };
  acceptEntertainmentAppearance: (input: {
    orgId: string;
    kind: 'interview' | 'red_carpet' | 'podcast' | 'press_line';
    headline?: string;
  }) => { ok: boolean; message: string };
  respondToCelebrityControversy: (
    controversyId: string,
    strategy: 'accountable_statement' | 'word_of_mouth_pr' | 'private_boundary',
  ) => { ok: boolean; message: string };
  triggerCelebrityControversyTestOrEvent: (topic?: string) => { ok: boolean; message: string; controversyId?: string };
  acceptBrandSponsorship: (sponsorOrgId: string, campaignTitle?: string) => { ok: boolean; message: string; feeCredits?: number };
  submitRadianceAwardCampaign: (category: string, workTitle: string) => { ok: boolean; message: string };
  interactWithFanCommunity: (artistId?: string, note?: string) => { ok: boolean; message: string };
  claimEntertainmentRoyalties: () => { ok: boolean; message: string; claimedCredits: number };
  // Ordinary Citizen Participation Actions (no celebrity profile required)
  streamSongbirdTrack: (trackId: string) => { ok: boolean; message: string; audioUrl?: string };
  toggleFollowEntertainmentArtist: (artistId: string) => { ok: boolean; message: string; following?: boolean };
  joinEntertainmentFanCommunity: (artistId: string) => { ok: boolean; message: string };
  purchaseEntertainmentTicket: (concertId: string, quantity?: number) => { ok: boolean; message: string; ticketId?: string };
  attendPurchasedPerformance: (ticketId: string) => { ok: boolean; message: string };
  syncEntertainmentFromLivingWorld: () => Promise<{ ok: boolean; message: string }>;
}

function appendSocialPost(player: any, cycle: number, text: string) {
  const social = restoreSocial(player.maiSpaceWorld, player.maiSpaceProfile);
  const post = {
    id: `ent-post-${cycle}-${Date.now().toString(36)}`,
    authorId: 'you',
    text,
    time: `Cycle ${cycle}`,
    createdAt: Date.now(),
    visibility: 'public' as const,
    likes: ['aelita', 'odd'],
  };
  return {
    ...social,
    posts: [post, ...(social.posts || [])].slice(0, 60),
  };
}

export function createEntertainmentActions(set: any, get: any): EntertainmentActions {
  const ensurePlayerArtist = (ent: EntertainmentState, player: any): EntertainmentArtist | undefined => {
    if (!ent.playerArtistId) return undefined;
    return ent.artists.find((a) => a.artistId === ent.playerArtistId);
  };

  return {
    registerOrUpdateArtistProfile: (input) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before updating your performer profile.' };
      const state = get();
      const stageName = String(input.stageName || '').trim();
      if (stageName.length < 2 || stageName.length > 60) {
        return { ok: false, message: 'Enter a stage or professional name between 2 and 60 characters.' };
      }
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const validDiscs = (input.disciplines || ['music']).filter((d) =>
        ENTERTAINMENT_DISCIPLINES.some((def) => def.id === d),
      );
      const disciplines: EntertainmentDisciplineId[] = validDiscs.length ? validDiscs : ['music'];
      const genres = (input.genres || ['Indie']).map((g) => String(g).trim()).filter(Boolean).slice(0, 5);
      const existing = ensurePlayerArtist(ent, state.gameplay.player);
      const artistId = existing?.artistId || 'ART-PLAYER';
      const link = state.gameplay.livingWorldLink;

      // Celebrity status must emerge from activity — new profiles start at modest Unlisted/Local recognition!
      let updated: EntertainmentArtist = existing
        ? {
            ...existing,
            stageName,
            bio: input.bio !== undefined ? String(input.bio).slice(0, 500) : existing.bio,
            disciplines,
            genres: genres.length ? genres : existing.genres,
            privacyBoundary: input.privacyBoundary || existing.privacyBoundary,
            careerStatus: input.careerStatus || existing.careerStatus,
            characterId: link?.characterId || existing.characterId || 'PLAYER',
          }
        : {
            artistId,
            characterId: link?.characterId || 'PLAYER',
            stageName,
            bio: String(input.bio || 'Emerging Meridion creative building an independent catalog.').slice(0, 500),
            origin: 'player',
            disciplines,
            genres: genres.length ? genres : ['Dream Pop'],
            careerStatus: input.careerStatus || 'active',
            privacyBoundary: input.privacyBoundary || 'guarded',
            guildMember: false,
            managerOrgId: '',
            labelOrgId: '',
            publisherOrgId: '',
            prOrgId: '',
            distributorOrgId: '',
            recognition: 2,
            favorability: 52,
            industryReputation: 18,
            fanLoyalty: 10,
            artisticCredibility: 16,
            commercialInfluence: 4,
            culturalInfluence: 4,
            mediaVisibility: 3,
            tier: 'Unlisted',
            fanCount: 25,
            monthlyListeners: 0,
            totalRoyaltiesEarned: 0,
            unclaimedPlayerRoyalties: 0,
            portfolioArtifactIds: [...(state.gameplay.player.creativePortfolioIds || [])],
            collaboratorIds: [],
            rivalryIds: [],
            lastActiveCycle: cycle,
          };

      if (existing?.careerStatus === 'hiatus' && input.careerStatus === 'comeback') {
        updated = adjustArtistFame(updated, { mediaVisibility: 5.5, fanLoyalty: 3.0, recognition: 2.0 }, cycle);
      }

      const artists = existing
        ? ent.artists.map((a) => (a.artistId === artistId ? updated : a))
        : [updated, ...ent.artists];

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            playerArtistId: artistId,
            artists,
          },
        },
      }));

      if (link?.runId) {
        enqueue(async () => {
          await upsertRunArtist(link.runId, {
            artistId,
            characterId: link.characterId,
            stageName: updated.stageName,
            bio: updated.bio,
            disciplines: updated.disciplines,
            genres: updated.genres,
            privacyBoundary: updated.privacyBoundary,
            careerStatus: updated.careerStatus,
            origin: 'player',
          });
        });
      }

      return {
        ok: true,
        artist: updated,
        message: existing
          ? `Updated professional profile for ${updated.stageName} (${updated.disciplines.length} active discipline${updated.disciplines.length === 1 ? '' : 's'}).`
          : `Registered ${updated.stageName} in Meridion’s entertainment directory (Tier: ${updated.tier}). Build recognition through releases, auditions, and live shows.`,
      };
    },

    linkPortfolioToEntertainment: (artifactId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Create your performer/creator profile first to attach Creative Studio works.' };
      if (artist.portfolioArtifactIds.includes(artifactId)) {
        return { ok: true, message: 'This Creative Studio work is already in your professional portfolio.' };
      }
      const updated = adjustArtistFame(
        { ...artist, portfolioArtifactIds: [artifactId, ...artist.portfolioArtifactIds] },
        { artisticCredibility: 2.5, industryReputation: 1.8, mediaVisibility: 1.5 },
        cycle,
      );
      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updated : a)),
          },
        },
      }));
      return { ok: true, message: `Added Creative Studio work to ${artist.stageName}’s portfolio (+Artistic Credibility & Industry Reputation).` };
    },

    submitEntertainmentAudition: (auditionId) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before auditioning.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register a performer profile first before submitting an audition.' };
      const aud = ent.auditions.find((a) => a.auditionId === auditionId);
      if (!aud || aud.status !== 'open') return { ok: false, message: 'That audition breakdown is no longer open.' };
      if (!aud.openToUnrepresented && !artist.managerOrgId) {
        return {
          ok: false,
          message: 'This casting call is restricted to represented talent. Sign with Second Act, Starstruck, or Willow Whisper first.',
        };
      }
      if ((state.gameplay.player.stamina ?? 85) < 12) {
        return { ok: false, message: 'Too exhausted to audition (requires 12 Stamina). Rest in HOMECRAFT first.' };
      }
      if (aud.applicants.some((x) => x.artistId === artist.artistId)) {
        return { ok: false, message: 'You have already submitted an audition for this call.' };
      }

      const discDef = ENTERTAINMENT_DISCIPLINES.find((d) => d.id === aud.discipline);
      const skillName = discDef?.skill || 'Creativity';
      const playerSkillLvl = state.gameplay.player.skills?.[skillName]?.level ?? 1;
      const discLvl = ent.disciplineProgress[aud.discipline]?.level ?? 1;
      const skillScore = Math.min(100, 38 + playerSkillLvl * 8 + discLvl * 7);
      const score = Math.round((artist.artisticCredibility * 0.35 + artist.industryReputation * 0.25 + skillScore * 0.4) * 10) / 10;
      const cast = score >= aud.minCredibility + 24;

      const updatedAud = {
        ...aud,
        applicants: [...aud.applicants, { artistId: artist.artistId, stageName: artist.stageName, score, submittedCycle: cycle }],
        selectedArtistId: cast ? artist.artistId : aud.selectedArtistId,
        status: (cast ? 'cast' : 'open') as 'cast' | 'open',
      };

      const nextDiscs = artist.disciplines.includes(aud.discipline)
        ? artist.disciplines
        : [...artist.disciplines, aud.discipline];

      const updatedArtist = adjustArtistFame(
        { ...artist, disciplines: nextDiscs },
        cast
          ? { industryReputation: 4.5, artisticCredibility: 3.5, recognition: 3.0, mediaVisibility: 2.5 }
          : { industryReputation: 1.2, artisticCredibility: 0.8 },
        cycle,
      );

      const newProjects = [...ent.projects];
      let stipendEarned = 0;
      if (cast) {
        const mgr = ent.contracts.find((c) => c.artistId === artist.artistId && c.contractType === 'management' && c.status === 'active');
        stipendEarned = Math.round(aud.stipendCredits * (1 - (mgr?.commissionRate ?? 0)));
        newProjects.unshift({
          projectId: `PRJ-CAST-${aud.auditionId}`,
          artistId: artist.artistId,
          title: aud.title,
          kind: aud.discipline === 'acting' ? 'series' : aud.discipline === 'dance' ? 'choreography' : 'stage_play',
          discipline: aud.discipline,
          partnerOrgId: aud.productionOrgId,
          collaboratorArtistId: '',
          budgetCredits: aud.stipendCredits * 4,
          deadlineCycle: cycle + 3,
          progress: 50,
          quality: Math.min(98, Math.round(score + 12)),
          masterOwnedByArtist: false,
          status: 'in_production',
        });
      }

      const nextProg = awardDisciplineXP(ent.disciplineProgress, aud.discipline, cast ? 55 : 22, cast);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            stamina: Math.max(0, (s.gameplay.player.stamina ?? 85) - 12),
            credits: (s.gameplay.player.credits ?? 0) + stipendEarned,
            xp: (s.gameplay.player.xp ?? 0) + (cast ? 60 : 20),
          },
          entertainment: {
            ...ent,
            disciplineProgress: nextProg,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            auditions: ent.auditions.map((a) => (a.auditionId === auditionId ? updatedAud : a)),
            projects: newProjects,
          },
        },
      }));
      get().addSkillXP(skillName, cast ? 30 : 12);

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await submitRunAudition(link.runId, {
            action: 'apply',
            auditionId,
            artistId: artist.artistId,
            skillScore,
            evaluateImmediately: true,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        cast,
        score,
        message: cast
          ? `Booked! You won "${aud.title}" (Score ${score}) and received a ${stipendEarned} ₢ booking stipend.`
          : `Audition tape logged with Open Call (Score ${score}). Casting directors will decide by Cycle ${aud.deadlineCycle}.`,
      };
    },

    signOrNegotiateEntertainmentContract: ({ orgId, contractType, royaltySplitArtist, switchAgency }) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before signing contracts.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer/creator profile first before signing representation or label deals.' };
      const org = getEntertainmentOrganization(orgId);
      if (!org) return { ok: false, message: 'Unknown entertainment organization.' };

      const exclusiveSlots: Record<string, keyof EntertainmentArtist> = {
        management: 'managerOrgId',
        label: 'labelOrgId',
        publishing: 'publisherOrgId',
        publicity: 'prOrgId',
        distribution: 'distributorOrgId',
      };
      const existingActive = ent.contracts.find(
        (c) => c.artistId === artist.artistId && c.contractType === contractType && c.status === 'active',
      );
      if (existingActive && !switchAgency && contractType in exclusiveSlots) {
        return {
          ok: false,
          message: `You already hold an active ${contractType} contract with ${existingActive.orgName}. Enable "Switch Agency / Replace Contract" or terminate it first.`,
        };
      }

      const defaultSplit = typeof org.royaltySplitArtist === 'number' ? org.royaltySplitArtist : 0.82;
      let split = defaultSplit;
      if (typeof royaltySplitArtist === 'number') {
        split = Math.max(0.45, Math.min(0.95, royaltySplitArtist));
        const leverage = artist.industryReputation + (artist.guildMember ? 10 : 0);
        if (split > defaultSplit + 0.08 && leverage < 48) {
          return {
            ok: false,
            message: `${org.shortName || org.name} declined a ${Math.round(split * 100)}% artist split. Build Industry Reputation (48+) or join the Meridion Performers Association for contract leverage.`,
          };
        }
      }

      const commission = typeof org.commissionRate === 'number' ? org.commissionRate : contractType === 'guild' ? 0.02 : 0.12;
      const advance =
        contractType === 'label'
          ? orgId === 'ORG_STARSTRUCK'
            ? 850
            : 320
          : contractType === 'publishing'
            ? 240
            : 0;
      const receiptKey = `ADVANCE:${artist.artistId}:${orgId}:${cycle}`;
      const payAdvance = advance > 0 && !ent.receiptIds.includes(receiptKey) ? advance : 0;

      const newContract: EntertainmentContract = {
        contractId: `CNT-${orgId}-${cycle}-${Date.now().toString(36)}`,
        artistId: artist.artistId,
        orgId,
        orgName: org.name,
        contractType,
        commissionRate: commission,
        royaltySplitArtist: Math.round(split * 100) / 100,
        advanceCredits: advance,
        obligationCount: contractType === 'label' ? 3 : 2,
        completedObligations: 0,
        startCycle: cycle,
        expiresCycle: cycle + 24,
        status: 'active',
      };

      const nextContracts = ent.contracts.map((c) =>
        existingActive && c.contractId === existingActive.contractId ? { ...c, status: 'replaced' as const } : c,
      );
      nextContracts.unshift(newContract);

      const slotKey = exclusiveSlots[contractType];
      const nextArtistBase: EntertainmentArtist = {
        ...artist,
        ...(slotKey ? { [slotKey]: orgId } : {}),
        ...(contractType === 'guild' || orgId === 'ORG_PERFORMERS_ASSOC' ? { guildMember: true } : {}),
      };
      const fameBoost =
        orgId === 'ORG_STARSTRUCK'
          ? { mediaVisibility: 6.5, commercialInfluence: 5.5, recognition: 3.5, industryReputation: 2.5 }
          : orgId === 'ORG_MARLIE_RECORDS' || orgId === 'ORG_SECOND_ACT' || orgId === 'ORG_KAJI_PUBLISHING'
            ? { artisticCredibility: 4.5, industryReputation: 3.0, fanLoyalty: 2.0 }
            : orgId === 'ORG_WORD_OF_MOUTH'
              ? { mediaVisibility: 4.5, favorability: 2.5 }
              : { industryReputation: 2.5 };

      const updatedArtist = adjustArtistFame(nextArtistBase, fameBoost, cycle);

      // Map Comms organization membership when signing with a connected house
      const commsMap: Record<string, string> = {
        ORG_STARSTRUCK: 'starstruck',
        ORG_SECOND_ACT: 'secondact',
        ORG_MARLIE_RECORDS: 'marlie',
        ORG_LIMELIGHT: 'limelight',
        ORG_PERFORMERS_ASSOC: 'performers',
      };
      const commsOrg = commsMap[orgId];

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) + payAdvance,
            ...(commsOrg
              ? {
                  organizationMemberships: {
                    ...(s.gameplay.player.organizationMemberships || {}),
                    [commsOrg]: { status: 'active', issuedAt: new Date().toISOString(), issuedBy: org.name, via: 'contract' },
                  },
                }
              : {}),
          },
          entertainment: {
            ...ent,
            receiptIds: payAdvance > 0 ? [...ent.receiptIds, receiptKey] : ent.receiptIds,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            contracts: nextContracts,
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await manageRunContract(link.runId, {
            action: 'sign',
            artistId: artist.artistId,
            orgId,
            contractType,
            royaltySplitArtist: newContract.royaltySplitArtist,
            switchAgency: Boolean(switchAgency),
            requestId: newContract.contractId,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        contract: newContract,
        message: `Signed ${contractType} agreement with ${org.name} (${Math.round(newContract.royaltySplitArtist * 100)}% artist split${payAdvance > 0 ? `, +${payAdvance} ₢ advance` : ''}).`,
      };
    },

    terminateEntertainmentContract: (contractId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const target = ent.contracts.find((c) => c.contractId === contractId && c.status === 'active');
      if (!target) return { ok: false, message: 'Contract is not currently active.' };
      const artist = ensurePlayerArtist(ent, state.gameplay.player);

      const slotClear: Partial<EntertainmentArtist> = {};
      if (artist) {
        if (target.contractType === 'management' && artist.managerOrgId === target.orgId) slotClear.managerOrgId = '';
        if (target.contractType === 'label' && artist.labelOrgId === target.orgId) slotClear.labelOrgId = '';
        if (target.contractType === 'publishing' && artist.publisherOrgId === target.orgId) slotClear.publisherOrgId = '';
        if (target.contractType === 'publicity' && artist.prOrgId === target.orgId) slotClear.prOrgId = '';
        if (target.contractType === 'distribution' && artist.distributorOrgId === target.orgId) slotClear.distributorOrgId = '';
      }

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            artists: artist
              ? ent.artists.map((a) => (a.artistId === artist.artistId ? { ...a, ...slotClear } : a))
              : ent.artists,
            contracts: ent.contracts.map((c) => (c.contractId === contractId ? { ...c, status: 'terminated' as const } : c)),
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await manageRunContract(link.runId, { action: 'terminate', contractId }).catch(() => undefined);
        });
      }

      return { ok: true, message: `Ended ${target.contractType} agreement with ${target.orgName}. You are now independent in that slot.` };
    },

    createEntertainmentProject: (input) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before starting a production.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer/creator profile first.' };
      const title = String(input.title || '').trim();
      if (title.length < 2) return { ok: false, message: 'Enter a project title of at least 2 characters.' };
      const budget = Math.max(0, Math.round(input.budgetCredits ?? 80));
      if ((state.gameplay.player.credits ?? 0) < budget) {
        return { ok: false, message: `Insufficient credits for the ${budget} ₢ project production budget.` };
      }

      const masterOwned =
        input.masterOwnedByArtist ??
        (artist.labelOrgId !== 'ORG_STARSTRUCK');
      const project: EntertainmentProject = {
        projectId: `PRJ-${cycle}-${Date.now().toString(36)}`,
        artistId: artist.artistId,
        title,
        kind: input.kind,
        discipline: input.discipline,
        partnerOrgId: input.partnerOrgId || artist.labelOrgId || artist.publisherOrgId || 'ORG_KAJI_PUBLISHING',
        collaboratorArtistId: input.collaboratorArtistId || '',
        budgetCredits: budget,
        deadlineCycle: cycle + 3,
        progress: 35,
        quality: Math.min(98, 62 + Math.round(budget / 25) + (ent.disciplineProgress[input.discipline]?.level ?? 1) * 4),
        masterOwnedByArtist: masterOwned,
        audioUrl: input.audioUrl || SHIPPED_AUDIO_ASSETS[0].audioUrl,
        genre: input.genre || artist.genres[0] || 'Dream Pop',
        status: 'in_production',
      };

      const nextProg = awardDisciplineXP(ent.disciplineProgress, input.discipline, 25, false);
      const nextDiscs = artist.disciplines.includes(input.discipline)
        ? artist.disciplines
        : [...artist.disciplines, input.discipline];
      const nextCollabs =
        input.collaboratorArtistId && !artist.collaboratorIds.includes(input.collaboratorArtistId)
          ? [...artist.collaboratorIds, input.collaboratorArtistId]
          : artist.collaboratorIds;

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) - budget,
          },
          entertainment: {
            ...ent,
            disciplineProgress: nextProg,
            artists: ent.artists.map((a) =>
              a.artistId === artist.artistId ? { ...a, disciplines: nextDiscs, collaboratorIds: nextCollabs } : a,
            ),
            projects: [project, ...ent.projects],
          },
        },
      }));

      if (input.collaboratorArtistId === 'ART-AELITA') {
        get().updateNPCVector('aelita', 'friendship', 4);
        get().updateNPCVector('aelita', 'sync', 5);
      }

      const link = state.gameplay.livingWorldLink;
      if (link?.runId && ['film', 'series', 'choreography', 'stage_play'].includes(input.kind)) {
        enqueue(async () => {
          await manageRunProduction(link.runId, {
            action: 'create',
            title,
            kind: input.kind,
            studioOrgId: project.partnerOrgId,
            castArtistIds: [artist.artistId, ...(input.collaboratorArtistId ? [input.collaboratorArtistId] : [])],
            budget,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        project,
        message: `Started "${title}" (${input.kind}, ${masterOwned ? 'Artist-Owned Master' : 'Studio Master'}). Advance work sessions to finish & release.`,
      };
    },

    advanceEntertainmentProject: (projectId) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before advancing studio production.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const prj = ent.projects.find((p) => p.projectId === projectId);
      if (!prj) return { ok: false, message: 'Project not found.' };
      if (prj.status !== 'in_production') return { ok: false, message: 'This project has already wrapped.' };
      if ((state.gameplay.player.stamina ?? 85) < 10) {
        return { ok: false, message: 'Requires 10 Stamina to run a studio session. Rest in HOMECRAFT first.' };
      }

      const nextProgress = Math.min(100, prj.progress + 65);
      const completed = nextProgress >= 100;
      const nextQuality = Math.min(99, prj.quality + 6);
      const updatedPrj: EntertainmentProject = {
        ...prj,
        progress: nextProgress,
        quality: nextQuality,
        status: completed ? 'completed' : 'in_production',
      };

      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      const updatedArtist =
        completed && artist
          ? adjustArtistFame(
              artist,
              { artisticCredibility: 3.5, industryReputation: 2.5, recognition: 2.0, culturalInfluence: 1.8 },
              cycle,
            )
          : artist;

      const nextProg = awardDisciplineXP(ent.disciplineProgress, prj.discipline, completed ? 50 : 20, completed);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            stamina: Math.max(0, (s.gameplay.player.stamina ?? 85) - 10),
            xp: (s.gameplay.player.xp ?? 0) + (completed ? 45 : 15),
          },
          entertainment: {
            ...ent,
            disciplineProgress: nextProg,
            artists: updatedArtist
              ? ent.artists.map((a) => (a.artistId === updatedArtist.artistId ? updatedArtist : a))
              : ent.artists,
            projects: ent.projects.map((p) => (p.projectId === projectId ? updatedPrj : p)),
          },
        },
      }));
      get().addSkillXP('Creativity', completed ? 25 : 10);

      return {
        ok: true,
        completed,
        message: completed
          ? `"${prj.title}" wrapped at ${nextQuality}/100 studio quality! Ready for Songbird distribution or premiere.`
          : `Advanced "${prj.title}" to ${nextProgress}% completion (Quality ${nextQuality}/100).`,
      };
    },

    publishEntertainmentRelease: (input) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before publishing a release.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your artist profile first before releasing music.' };

      const linkedPrj = input.projectId ? ent.projects.find((p) => p.projectId === input.projectId) : undefined;
      const title = String(input.title || linkedPrj?.title || '').trim();
      if (title.length < 2) return { ok: false, message: 'Enter a track or release title.' };

      const audioUrl = input.audioUrl || linkedPrj?.audioUrl || SHIPPED_AUDIO_ASSETS[0].audioUrl;
      const assetMeta = SHIPPED_AUDIO_ASSETS.find((a) => a.audioUrl === audioUrl) || SHIPPED_AUDIO_ASSETS[0];
      const masterOwned =
        input.masterOwnedByArtist ??
        linkedPrj?.masterOwnedByArtist ??
        (artist.labelOrgId !== 'ORG_STARSTRUCK');
      const distributor =
        input.distributorOrgId ||
        artist.distributorOrgId ||
        (artist.labelOrgId ? artist.labelOrgId : 'ORG_LUNERUM_DIST');
      const delay = Math.max(0, Math.min(8, Math.round(input.releaseInCycles ?? 0)));
      const releaseCycle = cycle + delay;

      const labelContract = ent.contracts.find((c) => c.artistId === artist.artistId && c.contractType === 'label' && c.status === 'active');
      const royaltyRate = labelContract ? labelContract.royaltySplitArtist : masterOwned ? 0.92 : 0.75;
      const quality = linkedPrj?.quality ?? Math.min(96, 68 + (state.gameplay.player.skills?.Creativity?.level ?? 1) * 5);

      const trackId = `TRK-PLR-${cycle}-${Date.now().toString(36)}`;
      const releaseId = `REL-PLR-${cycle}-${Date.now().toString(36)}`;

      const track = {
        trackId,
        title,
        artistId: artist.artistId,
        stageName: artist.stageName,
        kind: (input.format === 'Album' ? 'album_track' : input.format === 'Soundtrack' ? 'score' : 'single') as any,
        genre: input.genre || linkedPrj?.genre || artist.genres[0] || assetMeta.genre,
        durationSeconds: assetMeta.durationSeconds,
        audioUrl,
        coverArtUrl: input.coverArtUrl || assetMeta.coverArtUrl,
        producerOrgId: artist.publisherOrgId || 'ORG_KAJI_PUBLISHING',
        publisherOrgId: artist.publisherOrgId || 'ORG_MUSIC_RIGHTS_SOCIETY',
        collaboratorArtistIds: input.collaboratorArtistId ? [input.collaboratorArtistId] : [],
        mmrsRegistered: true,
        masterOwnedByArtist: masterOwned,
        quality,
        streams: delay === 0 ? 45 : 0,
        radioSpins: 0,
        stickerEdition: '',
        createdCycle: cycle,
      };

      const release = {
        releaseId,
        trackId,
        trackIds: [trackId],
        artistId: artist.artistId,
        stageName: artist.stageName,
        title,
        format: input.format || 'Single',
        platform: 'Songbird',
        distributorOrgId: distributor,
        labelOrgId: artist.labelOrgId || '',
        royaltyRate,
        releaseCycle,
        status: (delay === 0 ? 'released' : 'scheduled') as 'released' | 'scheduled',
      };

      const updatedArtist = adjustArtistFame(
        artist,
        delay === 0
          ? { recognition: 4.0, artisticCredibility: 3.5, mediaVisibility: 3.2, fanLoyalty: 2.5, commercialInfluence: 2.0 }
          : { mediaVisibility: 1.8, industryReputation: 1.5 },
        cycle,
      );

      const nextProg = awardDisciplineXP(ent.disciplineProgress, 'music', 45, true);
      const nextContracts = ent.contracts.map((c) =>
        c.artistId === artist.artistId && c.contractType === 'label' && c.status === 'active'
          ? { ...c, completedObligations: c.completedObligations + 1 }
          : c,
      );

      const mediaItems =
        delay === 0
          ? [
              {
                mediaId: `MED-PLR-REL-${releaseId}`,
                orgId: 'ORG_SONGBIRD',
                outletName: 'Songbird New Music',
                kind: 'review' as const,
                headline: `${artist.stageName} Debuts “${title}” on Songbird (${Math.round(royaltyRate * 100)}% Royalty Split)`,
                summary: `Registered with MMRS and delivered via ${getEntertainmentOrganization(distributor)?.shortName || 'Lunerum Dist'}.`,
                subjectArtistIds: [artist.artistId],
                sentiment: 'positive' as const,
                cycle,
              },
              ...ent.mediaItems,
            ]
          : ent.mediaItems;

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            maiSpaceWorld: appendSocialPost(
              s.gameplay.player,
              cycle,
              delay === 0
                ? `🎵 Out now on Songbird: “${title}” (${release.format}) — stream it on songbird.mer!`
                : `📅 Pre-save “${title}” (${release.format}) dropping Cycle ${releaseCycle} on Songbird!`,
            ),
          },
          entertainment: {
            ...ent,
            disciplineProgress: nextProg,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            tracks: [track, ...ent.tracks],
            releases: [release, ...ent.releases],
            contracts: nextContracts,
            projects: linkedPrj
              ? ent.projects.map((p) => (p.projectId === linkedPrj.projectId ? { ...p, status: 'released' as const } : p))
              : ent.projects,
            mediaItems: mediaItems.slice(0, 40),
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await upsertRunArtist(link.runId, {
            artistId: artist.artistId,
            characterId: link.characterId,
            stageName: artist.stageName,
            disciplines: artist.disciplines,
            genres: artist.genres,
            origin: 'player',
          }).catch(() => undefined);
          await addRunTrack(link.runId, {
            trackId,
            artistId: artist.artistId,
            title,
            genre: track.genre,
            durationSeconds: track.durationSeconds,
            audioUrl: track.audioUrl,
            quality,
            requestId: trackId,
          }).catch(() => undefined);
          await scheduleRunRelease(link.runId, {
            releaseId,
            trackId,
            platform: 'Songbird',
            royaltyRate,
            requestId: releaseId,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        trackId,
        releaseId,
        message:
          delay === 0
            ? `Published “${title}” live to Songbird and registered composition rights with MMRS!`
            : `Scheduled “${title}” for Songbird release on Cycle ${releaseCycle}.`,
      };
    },

    submitTrackToPopStickerRadio: (trackId) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before pitching radio.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const track = ent.tracks.find((t) => t.trackId === trackId);
      if (!track) return { ok: false, message: 'Track not found in catalog.' };
      const artist = ent.artists.find((a) => a.artistId === track.artistId);
      const score = track.quality + (artist?.industryReputation ?? 20) * 0.35 + (artist?.prOrgId === 'ORG_WORD_OF_MOUTH' ? 10 : 0);
      const accepted = score >= 65;
      const sticker = accepted
        ? track.stickerEdition || `Pop Sticker #${ent.tracks.length + 4}: ${track.stageName} — ${track.title}`
        : '';

      const updatedTrack = accepted
        ? { ...track, radioSpins: track.radioSpins + 18, stickerEdition: sticker }
        : track;
      const updatedArtist =
        accepted && artist
          ? adjustArtistFame(
              artist,
              { recognition: 4.2, mediaVisibility: 3.8, culturalInfluence: 2.5, fanLoyalty: 2.6 },
              cycle,
            )
          : artist;

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            collectedStickers:
              accepted && !ent.collectedStickers.includes(sticker)
                ? [sticker, ...ent.collectedStickers]
                : ent.collectedStickers,
            tracks: ent.tracks.map((t) => (t.trackId === trackId ? updatedTrack : t)),
            artists: updatedArtist
              ? ent.artists.map((a) => (a.artistId === updatedArtist.artistId ? updatedArtist : a))
              : ent.artists,
            mediaItems: accepted
              ? [
                  {
                    mediaId: `MED-RADIO-${trackId}-${cycle}`,
                    orgId: 'ORG_POP_STICKER',
                    outletName: 'Pop Sticker Radio',
                    kind: 'radio_premiere' as const,
                    headline: `Booth 88 Rotation Add: “${track.title}” + Limited Sticker Press`,
                    summary: `Mina Volt added ${track.stageName} to daily countdown rotation with collector edition "${sticker}".`,
                    subjectArtistIds: [track.artistId],
                    sentiment: 'positive' as const,
                    cycle,
                  },
                  ...ent.mediaItems,
                ].slice(0, 40)
              : ent.mediaItems,
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'submit_radio',
            trackId,
            requestId: `RADIO:${trackId}:${cycle}`,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        accepted,
        sticker,
        message: accepted
          ? `Pop Sticker Radio added “${track.title}” to on-air rotation (+18 spins) and pressed "${sticker}"!`
          : `Pop Sticker music directors passed on “${track.title}” this week—improve studio quality or Industry Reputation and pitch again.`,
      };
    },

    bookEntertainmentVenue: ({ venueOrgId, title, scheduledInCycles = 1, slot = 'evening', ticketPrice, useVelCurPromoter }) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before booking a venue.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer profile before booking live venues.' };

      const venue = VENUE_CATALOG.find((v) => v.orgId === venueOrgId);
      if (!venue) return { ok: false, message: 'Select a valid Meridion performance venue.' };
      if (artist.recognition < venue.minRecognition) {
        return {
          ok: false,
          message: `${venue.name} requires at least ${venue.minRecognition} Public Recognition (current: ${artist.recognition}). Build word-of-mouth at The Looking Glass first!`,
        };
      }
      if (!Number.isFinite(ticketPrice) || ticketPrice < 5 || ticketPrice > 500) {
        return { ok: false, message: 'Set a ticket price between 5 ₢ and 500 ₢.' };
      }

      const scheduledCycle = cycle + Math.max(1, Math.min(10, Math.round(scheduledInCycles)));
      const conflict = ent.concerts.find(
        (c) => c.status === 'scheduled' && c.venueOrgId === venueOrgId && c.scheduledCycle === scheduledCycle && c.slot === slot,
      );
      if (conflict) {
        return {
          ok: false,
          message: `${venue.name} is already booked on Cycle ${scheduledCycle} (${slot}) for "${conflict.title}". Choose another cycle or time slot.`,
        };
      }

      const deposit = venue.rentalCost;
      if ((state.gameplay.player.credits ?? 0) < deposit) {
        return { ok: false, message: `Insufficient credits for the ${deposit} ₢ venue hold deposit.` };
      }

      const concertId = `CON-PLR-${cycle}-${Date.now().toString(36)}`;
      const promoterOrgId = useVelCurPromoter || venue.capacity >= 1000 ? 'ORG_VELVET_CURTAIN' : '';
      const presaleRatio = Math.min(0.65, (artist.recognition * 0.006 + artist.fanLoyalty * 0.005 + (promoterOrgId ? 0.12 : 0.04)));
      const initialSold = Math.max(4, Math.round(venue.capacity * presaleRatio));

      const concert = {
        concertId,
        artistId: artist.artistId,
        stageName: artist.stageName,
        title: String(title || '').trim() || `${artist.stageName} Live at ${venue.name}`,
        venue: venue.name,
        venueOrgId: venue.orgId,
        promoterOrgId,
        scheduledCycle,
        slot,
        dateLabel: `Cycle ${scheduledCycle} · ${slot[0].toUpperCase()}${slot.slice(1)}`,
        ticketPrice: Math.round(ticketPrice),
        capacity: venue.capacity,
        rentalCost: deposit,
        ticketsSold: initialSold,
        grossRevenue: initialSold * Math.round(ticketPrice),
        netArtistPayout: 0,
        audienceReaction: `Box office open (${initialSold.toLocaleString()} pre-sold).`,
        status: 'scheduled' as const,
      };

      const nextProg = awardDisciplineXP(ent.disciplineProgress, 'event_production', 30, false);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) - deposit,
          },
          entertainment: {
            ...ent,
            disciplineProgress: nextProg,
            concerts: [concert, ...ent.concerts],
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await scheduleRunConcert(link.runId, {
            concertId,
            artistId: artist.artistId,
            venueOrgId: venue.orgId,
            venue: venue.name,
            slot,
            ticketPrice: concert.ticketPrice,
            capacity: venue.capacity,
            requestId: concertId,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        concertId,
        message: `Booked "${concert.title}" on Cycle ${scheduledCycle} (${slot})! ${initialSold.toLocaleString()} presale tickets sold (-${deposit} ₢ venue hold).`,
      };
    },

    performScheduledConcertNow: (concertId) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before performing.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const con = ent.concerts.find((c) => c.concertId === concertId);
      if (!con || con.status !== 'scheduled') return { ok: false, message: 'No scheduled performance found with that ID.' };
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist || con.artistId !== artist.artistId) return { ok: false, message: 'Only the headline performer can settle this show.' };
      if ((state.gameplay.player.stamina ?? 85) < 18) {
        return { ok: false, message: 'Requires 18 Stamina to perform a live set. Rest in HOMECRAFT first.' };
      }

      const priceFactor = Math.max(0.35, Math.min(1.25, 32 / Math.max(10, con.ticketPrice)));
      const demand = Math.min(1, (artist.recognition * 0.008 + artist.fanLoyalty * 0.007 + 0.32) * priceFactor);
      const finalSold = Math.min(con.capacity, Math.max(con.ticketsSold, Math.round(con.capacity * demand)));
      const gross = finalSold * con.ticketPrice;
      const velCurCut = con.promoterOrgId ? Math.round(gross * 0.15) : 0;
      const mgr = ent.contracts.find((c) => c.artistId === artist.artistId && c.contractType === 'management' && c.status === 'active');
      const mgrCut = mgr ? Math.round(gross * mgr.commissionRate) : 0;
      const net = Math.max(0, gross - velCurCut - mgrCut);
      const fillPct = Math.round((finalSold / Math.max(1, con.capacity)) * 100);
      const reaction =
        fillPct >= 80
          ? `Electric crowd (${finalSold.toLocaleString()}/${con.capacity.toLocaleString()}, ${fillPct}%) — encore demanded!`
          : `Responsive live set (${finalSold.toLocaleString()}/${con.capacity.toLocaleString()}, ${fillPct}%) — new fans won over.`;

      const updatedCon = {
        ...con,
        ticketsSold: finalSold,
        grossRevenue: gross,
        netArtistPayout: net,
        audienceReaction: reaction,
        status: 'completed' as const,
      };
      const updatedArtist = adjustArtistFame(
        {
          ...artist,
          totalRoyaltiesEarned: artist.totalRoyaltiesEarned + net,
        },
        {
          recognition: fillPct >= 75 ? 5.0 : 2.8,
          fanLoyalty: 4.2,
          artisticCredibility: 2.8,
          commercialInfluence: fillPct >= 75 ? 3.8 : 1.5,
          mediaVisibility: 3.0,
        },
        cycle,
      );

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            stamina: Math.max(0, (s.gameplay.player.stamina ?? 85) - 18),
            credits: (s.gameplay.player.credits ?? 0) + net,
            xp: (s.gameplay.player.xp ?? 0) + 65,
          },
          entertainment: {
            ...ent,
            disciplineProgress: awardDisciplineXP(ent.disciplineProgress, 'music', 50, true),
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            concerts: ent.concerts.map((c) => (c.concertId === concertId ? updatedCon : c)),
            mediaItems: [
              {
                mediaId: `MED-LIVE-${concertId}`,
                orgId: 'ORG_LIMELIGHT',
                outletName: 'Limelight Live',
                kind: 'review' as const,
                headline: `Live Review: ${artist.stageName} Draws ${finalSold.toLocaleString()} at ${con.venue}`,
                summary: reaction,
                subjectArtistIds: [artist.artistId],
                sentiment: 'positive' as const,
                cycle,
              },
              ...ent.mediaItems,
            ].slice(0, 40),
          },
        },
      }));

      return {
        ok: true,
        payout: net,
        message: `Performed "${con.title}"! ${finalSold.toLocaleString()} tickets sold — settled +${net.toLocaleString()} ₢ net box office.`,
      };
    },

    acceptEntertainmentAppearance: ({ orgId, kind, headline }) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before appearing in press.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer profile before booking press appearances.' };
      const org = getEntertainmentOrganization(orgId) || { id: orgId, name: 'Limelight' };
      const prBoost = artist.prOrgId === 'ORG_WORD_OF_MOUTH' ? 1.5 : 0;

      const updatedArtist = adjustArtistFame(
        artist,
        {
          mediaVisibility: 4.5 + prBoost,
          recognition: 2.8 + prBoost * 0.5,
          favorability: 2.0 + prBoost,
          culturalInfluence: 1.6,
        },
        cycle,
      );

      const finalHeadline =
        headline ||
        (kind === 'red_carpet'
          ? `${artist.stageName} Arrives on the ${org.name} Red Carpet`
          : `${org.name} In Conversation with ${artist.stageName}`);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            disciplineProgress: awardDisciplineXP(ent.disciplineProgress, 'public_relations', 20, false),
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            mediaItems: [
              {
                mediaId: `MED-APP-${cycle}-${Date.now().toString(36)}`,
                orgId,
                outletName: org.name,
                kind: 'interview' as const,
                headline: finalHeadline,
                summary: `${artist.stageName} discussed upcoming creative work, artistic independence, and boundaries (${artist.privacyBoundary} privacy policy).`,
                subjectArtistIds: [artist.artistId],
                sentiment: 'positive' as const,
                cycle,
              },
              ...ent.mediaItems,
            ].slice(0, 40),
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'media_appearance',
            artistId: artist.artistId,
            orgId,
            headline: finalHeadline,
          }).catch(() => undefined);
        });
      }

      return { ok: true, message: `Completed ${kind.replace('_', ' ')} with ${org.name} (+Media Visibility & Public Recognition).` };
    },

    triggerCelebrityControversyTestOrEvent: (topic) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register a performer profile first.' };
      const controversyId = `CNV-${cycle}-${Date.now().toString(36)}`;
      const item = {
        controversyId,
        artistId: artist.artistId,
        stageName: artist.stageName,
        topic: topic || 'Leaked backstage disagreement over ticket pricing and sponsorship exclusivity',
        severity: 42,
        status: 'active' as const,
        cycle,
      };
      const updatedArtist = adjustArtistFame(artist, { favorability: -6.5, mediaVisibility: 5.5 }, cycle);
      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            controversies: [item, ...ent.controversies],
            mediaItems: [
              {
                mediaId: `MED-CNV-${controversyId}`,
                orgId: 'ORG_LIMELIGHT',
                outletName: 'Limelight Greenroom Desk',
                kind: 'gossip' as const,
                headline: `Public Speculation Surrounds ${artist.stageName}`,
                summary: item.topic,
                subjectArtistIds: [artist.artistId],
                sentiment: 'critical' as const,
                cycle,
              },
              ...ent.mediaItems,
            ].slice(0, 40),
          },
        },
      }));
      return { ok: true, controversyId, message: `Public controversy logged: "${item.topic}". Respond via Word of Mouth PR or a direct statement.` };
    },

    respondToCelebrityControversy: (controversyId, strategy) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const cnv = ent.controversies.find((c) => c.controversyId === controversyId && c.status === 'active');
      if (!cnv) return { ok: false, message: 'No active controversy found.' };
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Artist profile not found.' };

      const prFee = strategy === 'word_of_mouth_pr' && artist.prOrgId !== 'ORG_WORD_OF_MOUTH' ? 140 : 0;
      if (prFee > 0 && (state.gameplay.player.credits ?? 0) < prFee) {
        return { ok: false, message: `Consulting Word of Mouth PR without a retainer requires ${prFee} ₢.` };
      }

      const deltas =
        strategy === 'accountable_statement'
          ? { favorability: 5.5, industryReputation: 2.5, fanLoyalty: 2.0 }
          : strategy === 'word_of_mouth_pr'
            ? { favorability: 6.5, mediaVisibility: 2.0, industryReputation: 1.5 }
            : { favorability: 2.5, mediaVisibility: -3.0 };

      const updatedArtist = adjustArtistFame(artist, deltas, cycle);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) - prFee,
          },
          entertainment: {
            ...ent,
            disciplineProgress: awardDisciplineXP(ent.disciplineProgress, 'public_relations', 30, true),
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            controversies: ent.controversies.map((c) =>
              c.controversyId === controversyId ? { ...c, status: 'addressed' as const, responseStrategy: strategy } : c,
            ),
            mediaItems: [
              {
                mediaId: `MED-RESP-${controversyId}`,
                orgId: strategy === 'word_of_mouth_pr' ? 'ORG_WORD_OF_MOUTH' : 'ORG_LIMELIGHT',
                outletName: strategy === 'word_of_mouth_pr' ? 'Word of Mouth PR Wire' : 'Limelight',
                kind: 'statement' as const,
                headline: `${artist.stageName} Addresses Public Speculation`,
                summary: `Issued a ${strategy.replace(/_/g, ' ')} clarifying commitments and restoring public favorability.`,
                subjectArtistIds: [artist.artistId],
                sentiment: 'positive' as const,
                cycle,
              },
              ...ent.mediaItems,
            ].slice(0, 40),
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'resolve_controversy',
            controversyId,
            strategy,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        message: `Resolved controversy via ${strategy.replace(/_/g, ' ')}${prFee > 0 ? ` (-${prFee} ₢ Word of Mouth counsel fee)` : ''}.`,
      };
    },

    acceptBrandSponsorship: (sponsorOrgId, campaignTitle) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before signing brand endorsements.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer/creator profile first.' };
      if (artist.recognition < 12 && artist.commercialInfluence < 12) {
        return {
          ok: false,
          message: 'Brand houses require at least 12 Public Recognition or Commercial Influence before offering endorsement contracts.',
        };
      }
      const org = getEntertainmentOrganization(sponsorOrgId) || { id: sponsorOrgId, name: 'Amrielle' };
      const receiptKey = `SPON:${artist.artistId}:${sponsorOrgId}:${cycle}`;
      if (ent.receiptIds.includes(receiptKey)) {
        return { ok: false, message: `You already completed a ${org.name} campaign this cycle.` };
      }

      const grossFee = Math.round(220 + artist.recognition * 6 + artist.commercialInfluence * 5);
      const mgr = ent.contracts.find((c) => c.artistId === artist.artistId && c.contractType === 'management' && c.status === 'active');
      const netFee = Math.round(grossFee * (1 - (mgr?.commissionRate ?? 0)));
      const deal = {
        sponsorshipId: `SPON-${cycle}-${Date.now().toString(36)}`,
        artistId: artist.artistId,
        stageName: artist.stageName,
        sponsorOrgId,
        sponsorName: org.name,
        campaignTitle: campaignTitle || `${org.name} Seasonal Ambassador Campaign`,
        feeCredits: netFee,
        startCycle: cycle,
        status: 'active' as const,
      };

      const updatedArtist = adjustArtistFame(
        artist,
        { commercialInfluence: 5.5, recognition: 3.0, mediaVisibility: 3.2, artisticCredibility: -0.4 },
        cycle,
      );

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) + netFee,
          },
          entertainment: {
            ...ent,
            receiptIds: [...ent.receiptIds, receiptKey],
            disciplineProgress: awardDisciplineXP(ent.disciplineProgress, 'influencing', 35, true),
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            sponsorships: [deal, ...ent.sponsorships],
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'accept_sponsorship',
            artistId: artist.artistId,
            sponsorOrgId,
            feeCredits: netFee,
            requestId: receiptKey,
          }).catch(() => undefined);
        });
      }

      return { ok: true, feeCredits: netFee, message: `Signed "${deal.campaignTitle}" with ${org.name} (+${netFee.toLocaleString()} ₢ net endorsement fee).` };
    },

    submitRadianceAwardCampaign: (category, workTitle) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Register your performer/creator profile before entering The Radiance Awards.' };
      if (artist.artisticCredibility < 18) {
        return { ok: false, message: 'Radiance Academy rules require at least 18 Artistic Credibility from released works or performances.' };
      }

      const fycFee = 75;
      if ((state.gameplay.player.credits ?? 0) < fycFee) {
        return { ok: false, message: `Requires ${fycFee} ₢ Academy filing & verification fee.` };
      }

      const openCycle = ent.awards.find((a) => a.status === 'open') || {
        awardCycleId: `RADIANCE-C${cycle}`,
        cycle,
        ceremonyCycle: cycle + 6,
        status: 'open' as const,
        nominees: [],
        winners: [],
      };
      if (openCycle.nominees.some((n) => n.artistId === artist.artistId && n.category === category)) {
        return { ok: false, message: `${artist.stageName} is already on the ballot for ${category} this cycle.` };
      }

      const score = Math.round((artist.artisticCredibility * 0.45 + artist.culturalInfluence * 0.25 + artist.industryReputation * 0.2 + artist.commercialInfluence * 0.1) * 10) / 10;
      const nextAward = {
        ...openCycle,
        nominees: [
          ...openCycle.nominees,
          { artistId: artist.artistId, stageName: artist.stageName, category, workTitle: workTitle || artist.stageName, score },
        ],
      };
      const nextAwards = ent.awards.some((a) => a.awardCycleId === openCycle.awardCycleId)
        ? ent.awards.map((a) => (a.awardCycleId === openCycle.awardCycleId ? nextAward : a))
        : [nextAward, ...ent.awards];

      const updatedArtist = adjustArtistFame(
        artist,
        { industryReputation: 4.0, artisticCredibility: 2.5, mediaVisibility: 3.0 },
        cycle,
      );

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: { ...s.gameplay.player, credits: (s.gameplay.player.credits ?? 0) - fycFee },
          entertainment: {
            ...ent,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            awards: nextAwards,
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'award_campaign',
            artistId: artist.artistId,
            category,
            workTitle,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        message: `Accepted onto the Radiance Awards For-Your-Consideration ballot in "${category}" (Ceremony: Cycle ${nextAward.ceremonyCycle}).`,
      };
    },

    interactWithFanCommunity: (targetArtistId, note) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = targetArtistId
        ? ent.artists.find((a) => a.artistId === targetArtistId)
        : ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'Select an artist or register your performer profile first.' };

      const existing = ent.fanCommunities.find((fc) => fc.artistId === artist.artistId);
      const updatedComm = existing
        ? {
            ...existing,
            loyaltyScore: Math.min(100, existing.loyaltyScore + 3),
            recentActivity: note || `${artist.stageName} hosted a Cycle ${cycle} listener Q&A.`,
          }
        : {
            communityId: `fanclub:${artist.artistId}`,
            artistId: artist.artistId,
            stageName: artist.stageName,
            name: `${artist.stageName} Listener Circle`,
            memberIds: ['PLAYER'],
            loyaltyScore: Math.min(100, artist.fanLoyalty + 8),
            recentActivity: note || `Founded ${artist.stageName}’s official listener community on Cycle ${cycle}.`,
          };

      const updatedArtist = adjustArtistFame(artist, { fanLoyalty: 3.5, favorability: 2.0 }, cycle);

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
            fanCommunities: existing
              ? ent.fanCommunities.map((fc) => (fc.artistId === artist.artistId ? updatedComm : fc))
              : [updatedComm, ...ent.fanCommunities],
          },
        },
      }));

      return { ok: true, message: `Engaged with ${updatedComm.name} (+Fan Loyalty & Public Favorability).` };
    },

    claimEntertainmentRoyalties: () => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before claiming royalties.', claimedCredits: 0 };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ensurePlayerArtist(ent, state.gameplay.player);
      if (!artist) return { ok: false, message: 'No registered performer profile.', claimedCredits: 0 };
      const whole = Math.floor(artist.unclaimedPlayerRoyalties);
      if (whole <= 0) {
        return { ok: false, message: 'No whole-credit royalties awaiting disbursement yet. Stream releases or advance cycles!', claimedCredits: 0 };
      }
      const remainder = Math.round((artist.unclaimedPlayerRoyalties - whole) * 100) / 100;
      const updatedArtist = { ...artist, unclaimedPlayerRoyalties: remainder };

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) + whole,
          },
          entertainment: {
            ...ent,
            artists: ent.artists.map((a) => (a.artistId === artist.artistId ? updatedArtist : a)),
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'claim_player_royalties',
            artistId: artist.artistId,
            requestId: `CLAIM:${artist.artistId}:${cycle}:${Date.now().toString(36)}`,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        claimedCredits: whole,
        message: `Disbursed ${whole.toLocaleString()} ₢ in Songbird, Pop Sticker & MMRS royalties to your account!`,
      };
    },

    streamSongbirdTrack: (trackId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const track = ent.tracks.find((t) => t.trackId === trackId);
      if (!track) return { ok: false, message: 'Track not found.' };
      const artist = ent.artists.find((a) => a.artistId === track.artistId);

      const updatedTrack = { ...track, streams: track.streams + 1 };
      const updatedArtist = artist
        ? {
            ...adjustArtistFame(artist, { recognition: 0.1, fanLoyalty: 0.1 }),
            monthlyListeners: artist.monthlyListeners + 1,
            totalRoyaltiesEarned: Math.round((artist.totalRoyaltiesEarned + 0.5) * 100) / 100,
            unclaimedPlayerRoyalties:
              artist.origin === 'player'
                ? Math.round((artist.unclaimedPlayerRoyalties + 0.5) * 100) / 100
                : artist.unclaimedPlayerRoyalties,
          }
        : undefined;

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            playedTrackIds: ent.playedTrackIds.includes(trackId) ? ent.playedTrackIds : [trackId, ...ent.playedTrackIds].slice(0, 50),
            tracks: ent.tracks.map((t) => (t.trackId === trackId ? updatedTrack : t)),
            artists: updatedArtist
              ? ent.artists.map((a) => (a.artistId === updatedArtist.artistId ? updatedArtist : a))
              : ent.artists,
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, { action: 'stream_track', trackId, plays: 1 }).catch(() => undefined);
        });
      }

      return { ok: true, audioUrl: track.audioUrl, message: `Now playing “${track.title}” by ${track.stageName} on Songbird.` };
    },

    toggleFollowEntertainmentArtist: (artistId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ent.artists.find((a) => a.artistId === artistId);
      if (!artist) return { ok: false, message: 'Artist not found.' };
      const exists = ent.followedArtistIds.includes(artistId);
      const followedArtistIds = exists
        ? ent.followedArtistIds.filter((x) => x !== artistId)
        : [...ent.followedArtistIds, artistId];
      const updatedArtist = exists ? artist : adjustArtistFame({ ...artist, fanCount: artist.fanCount + 1 }, { fanLoyalty: 0.5 });

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            followedArtistIds,
            artists: ent.artists.map((a) => (a.artistId === artistId ? updatedArtist : a)),
          },
        },
      }));

      return {
        ok: true,
        following: !exists,
        message: exists ? `Unfollowed ${artist.stageName}.` : `Following ${artist.stageName} across Songbird and Limelight.`,
      };
    },

    joinEntertainmentFanCommunity: (artistId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const artist = ent.artists.find((a) => a.artistId === artistId);
      if (!artist) return { ok: false, message: 'Artist not found.' };
      const existing = ent.fanCommunities.find((fc) => fc.artistId === artistId);
      if (existing?.memberIds.includes('PLAYER')) {
        return { ok: true, message: `You are already a member of ${existing.name}.` };
      }
      const nextComm = existing
        ? { ...existing, memberIds: [...existing.memberIds, 'PLAYER'], loyaltyScore: Math.min(100, existing.loyaltyScore + 2) }
        : {
            communityId: `fanclub:${artistId}`,
            artistId,
            stageName: artist.stageName,
            name: `${artist.stageName} Listener Circle`,
            memberIds: ['PLAYER'],
            loyaltyScore: Math.min(100, artist.fanLoyalty + 5),
            recentActivity: `New citizen members joined on Cycle ${cycle}.`,
          };

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          entertainment: {
            ...ent,
            fanCommunities: existing
              ? ent.fanCommunities.map((fc) => (fc.artistId === artistId ? nextComm : fc))
              : [nextComm, ...ent.fanCommunities],
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await postRunPublicity(link.runId, {
            action: 'join_fan_community',
            artistId,
            memberCharacterId: link.characterId || 'PLAYER',
          }).catch(() => undefined);
        });
      }

      return { ok: true, message: `Joined ${nextComm.name}!` };
    },

    purchaseEntertainmentTicket: (concertId, quantity = 1) => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before purchasing tickets.' };
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const concert = ent.concerts.find((c) => c.concertId === concertId);
      if (!concert || concert.status !== 'scheduled') {
        return { ok: false, message: 'Tickets are only available for upcoming scheduled events.' };
      }
      const qty = Math.max(1, Math.min(6, Math.round(quantity)));
      if (concert.ticketsSold + qty > concert.capacity) {
        return { ok: false, message: 'Not enough remaining seats at this venue.' };
      }
      const totalCost = concert.ticketPrice * qty;
      if ((state.gameplay.player.credits ?? 0) < totalCost) {
        return { ok: false, message: `Insufficient credits (${totalCost} ₢ required for ${qty} ticket${qty === 1 ? '' : 's'}).` };
      }

      const ticketId = `TKT-${concertId}-${cycle}-${Date.now().toString(36)}`;
      const ticket = {
        ticketId,
        concertId,
        concertTitle: concert.title,
        venue: concert.venue,
        artistId: concert.artistId,
        stageName: concert.stageName,
        scheduledCycle: concert.scheduledCycle,
        quantity: qty,
        pricePaid: totalCost,
        purchasedCycle: cycle,
        attended: false,
      };
      const updatedConcert = {
        ...concert,
        ticketsSold: concert.ticketsSold + qty,
        grossRevenue: concert.grossRevenue + totalCost,
      };

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            credits: (s.gameplay.player.credits ?? 0) - totalCost,
          },
          entertainment: {
            ...ent,
            concerts: ent.concerts.map((c) => (c.concertId === concertId ? updatedConcert : c)),
            tickets: [ticket, ...ent.tickets],
          },
        },
      }));

      const link = state.gameplay.livingWorldLink;
      if (link?.runId) {
        enqueue(async () => {
          await purchaseRunTicket(link.runId, {
            concertId,
            buyerCharacterId: link.characterId || 'PLAYER',
            buyerName: state.gameplay.player.name || 'Citizen Attendee',
            quantity: qty,
            requestId: ticketId,
          }).catch(() => undefined);
        });
      }

      return {
        ok: true,
        ticketId,
        message: `Purchased ${qty} ticket${qty === 1 ? '' : 's'} for "${concert.title}" at ${concert.venue} (-${totalCost} ₢).`,
      };
    },

    attendPurchasedPerformance: (ticketId) => {
      const state = get();
      const cycle = state.gameplay.timeCycleCount ?? 28;
      const ent = restoreEntertainmentState(state.gameplay.entertainment, cycle);
      const tkt = ent.tickets.find((t) => t.ticketId === ticketId);
      if (!tkt) return { ok: false, message: 'Ticket receipt not found.' };
      if (tkt.attended) return { ok: false, message: 'You have already attended this show.' };

      const artist = ent.artists.find((a) => a.artistId === tkt.artistId);
      const updatedArtist = artist ? adjustArtistFame(artist, { fanLoyalty: 1.5, favorability: 1.0 }, cycle) : undefined;

      set((s: any) => ({
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            auraHealth: Math.min(100, (s.gameplay.player.auraHealth ?? 85) + 8),
            xp: (s.gameplay.player.xp ?? 0) + 25,
            maiSpaceWorld: appendSocialPost(
              s.gameplay.player,
              cycle,
              `✨ Just caught ${tkt.stageName} live at ${tkt.venue} (“${tkt.concertTitle}”)!`,
            ),
          },
          entertainment: {
            ...ent,
            artists: updatedArtist
              ? ent.artists.map((a) => (a.artistId === updatedArtist.artistId ? updatedArtist : a))
              : ent.artists,
            tickets: ent.tickets.map((t) => (t.ticketId === ticketId ? { ...t, attended: true } : t)),
          },
        },
      }));

      return { ok: true, message: `Attended "${tkt.concertTitle}" at ${tkt.venue} (+8 Aura Integrity, +25 XP, MAI.SPACE memory posted)!` };
    },

    syncEntertainmentFromLivingWorld: async () => {
      const state = get();
      const link = state.gameplay.livingWorldLink;
      if (!link?.runId) return { ok: false, message: 'No active Living World citizen link.' };
      try {
        const remote = await getEntertainmentSnapshot(link.runId);
        set((s: any) => {
          const cycle = s.gameplay.timeCycleCount ?? 28;
          const local = restoreEntertainmentState(s.gameplay.entertainment, cycle);
          return {
            gameplay: {
              ...s.gameplay,
              entertainment: mergeLivingWorldEntertainmentSnapshot(local, remote, cycle),
            },
          };
        });
        return { ok: true, message: 'Synchronized entertainment industry state with Living World run.' };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to reach Living World entertainment service.' };
      }
    },
  };
}
