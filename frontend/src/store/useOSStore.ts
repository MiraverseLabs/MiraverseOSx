import { CAREER_REGISTRY, canonicalCareerId } from '../gameplay/CareerRegistry';
import { restoreWorknetPlayer } from '../gameplay/WorknetPersistence';
import { WORK_PAY_RULES } from '../gameplay/WorkRewards';
import { createBankingActions, type BankingActions } from './bankingActions';
import { journalBalanceChange, restoreBanking } from '../gameplay/Banking';
import { createProcessActions, type ProcessActions } from './processActions';
import { restoreProcessMonitor } from '../gameplay/ProcessMonitor';
import { createAcademicActions, recordAcademicCompilation, type AcademicActions } from './academicActions';
import { emptyAcademics } from '../gameplay/Academics';
import { HOME_FURNISHINGS, HOME_GUESTS } from '../gameplay/Housing';
import { createBrowserActions } from './browserActions';
import { createSocialActions, type SocialActions } from './socialActions';
import { grantLocalCredentials, isLocalWorld } from '../gameplay/localCredentials';
import { createSiteActions, type SiteActions } from './siteActions';
import { emptyVersenetSites, restoreVersenetSites, type VersenetSites } from '../apps/Browser/interactiveSites';
import { createVersenetActions, type VersenetActions } from './versenetActions';
import { emptyVersenetContent, restoreVersenetContent, type VersenetContent } from '../apps/Browser/searchCatalog';
import {
  emptyFyloState,
  restoreFyloState,
  createFyloFolder,
  createPersonalNote,
  updateFyloNote,
  renameFyloFile,
  moveFyloFile,
  copyFyloFile,
  toggleFyloFavorite,
  retainAttachmentInFylo,
  trashFyloFile,
  restoreFyloFile,
  deleteFyloFilePermanently,
  emptyFyloTrash,
  type FyloState,
} from '../apps/files/fyloStore';
import { restoreDesktopPreferences, changeDesktop, type DesktopAction, type DesktopPreferences } from './desktopPreferences';
import { resolveAppDestination, retiredWindowDestination, type WorkspaceRequest } from './appNavigation';
import { canAcceptInvitation, invitationForOrganization, membershipSource, organization, registerCommunicationsAuthority } from '../integration/communicationsAccess';
import { advanceDynamicMedia, restoreMediaStudio } from '../gameplay/MediaStudio';
import { createMediaStudioActions, type MediaStudioActions } from './mediaStudioActions';
import { processPublicReactions } from '../gameplay/WorldPublicationFlow';
import { restoreWorldPublications } from '../gameplay/WorldPublications';
import { worldWorkTick } from '../gameplay/WorkSchedule';
import { isWorldPaused } from '../integration/worldStateManager';
import { BROWSER_HOME, initialBrowserState, restoreBrowserState, restartBrowserSession, type BrowserState } from '../apps/Browser/browserModel';
export type { BrowserState, BrowserTab, TabHistory } from '../apps/Browser/browserModel';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { NOTICES, evaluateNoticeObjective } from '../data/notices';
import { mergeSavedProgress, osStorage } from './osPersistence';
import { createWorknetActions } from './worknetActions';
import {
  emptyWorknetSimulation,
  restoreWorknetSimulation,
  advanceWorknetSimulation,
  recordEarnedPayroll,
  issueEarnedPayroll,
  appendCareerMilestone,
  type WorknetSimulationState,
} from '../gameplay/WorknetSimulation';
import { workTick, restoreWorkplace } from '../apps/worknet/workplaceModel';
import {
  emptyLibraryState,
  restoreLibraryState,
  issueOrRenewLibraryCard,
  borrowCatalogItem,
  updateLoanProgress,
  returnCatalogItem,
  type LibraryState,
} from '../apps/library/libraryModel';
import {
  emptyOrynvellRecordsState,
  restoreOrynvellRecordsState,
  advanceOrynvellRequests,
  submitOrynvellRequest,
  staffDecideOrynvellRequest,
  canAccessStaffWorkspace,
  type OrynvellRecordsState,
} from '../apps/Browser/records/orynvellRecordsModel';
import { createFieldActions } from './fieldActions';
import { createBroadStreetActions, type BroadStreetActions } from './broadStreetActions';
import { createAssignmentActions, type AssignmentFlowActions } from './assignmentActions';
import { emptyAssignmentJournal } from '../gameplay/AssignmentFlow';
import { createProgressionActions, type ProgressionActions } from './progressionActions';
import { emptyWorldJournal } from '../gameplay/ProgressionEngine';
import { createEntertainmentActions, type EntertainmentActions } from './entertainmentActions';
import { initialEntertainmentState, restoreEntertainmentState, advanceEntertainmentCycle } from '../gameplay/EntertainmentEcosystem';
import type { WorkOrder, WorkValues, TaskResult } from '../gameplay/ActivityEngine';
import {
  worldEventEngine,
  PATIENT_CARE_ASSIGNMENTS,
  CAREER_TRACK_SPECS,
  calculateRestOutcome,
  evaluateCareerPromotion,
  type SleepDuration,
  type WorldNarrativeEvent,
  type WorldEventCategory,
} from '../gameplay/WorldEventEngine';
import {
  advanceWithRetry,
  citizenBalance,
  creditMirrorRequestId,
  enqueue,
  getRun,
  reconcileLink,
  segmentsToSteps,
  transact,
  type LivingWorldLink,
} from '../integration/livingWorldLink';

// Activities / missions — seeded by MissionDirector TypeScript engine or future DataGrip pipeline.
const missionsData: any[] = [];


const MENU_BAR_HEIGHT = 70;
const DEFAULT_WINDOW_SIZE = { width: 960, height: 640 };

const spawnPosition = (count: number) => ({
  x: 140 + (count % 6) * 32,
  y: MENU_BAR_HEIGHT + 32 + (count % 6) * 32,
});

export interface OSWindow {
  id: string;
  title: string;
  contentKey: string;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  windowOffset: { x: number; y: number };
  size: { width: number; height: number };
  [key: string]: any;
}

export interface OSStoreState extends MediaStudioActions, BankingActions, ProcessActions, AcademicActions, AssignmentFlowActions, ProgressionActions, VersenetActions, SiteActions, BroadStreetActions, SocialActions, EntertainmentActions {
  isLoggedIn: boolean;
  isSanctuary: boolean;
  toggleSanctuary: () => void;
  windows: OSWindow[];
  activeWindowId: string | null;
  wallpaper: string;
  desktopPreferences: DesktopPreferences;
  desktopAction: (action: DesktopAction) => void;
  hiddenDesktopWindows: string[];
  toggleShowDesktop: () => void;
  workspaceRequests: Record<string, WorkspaceRequest>;
  workspaceRequestSequence: number;
  openAppWorkspace: (id: string, section?: string) => void;
  openWindow: (id: string) => void;
  consumeWorkspaceRequest: (id: string, revision: number) => void;
  linkCitizenHubIdentity: (id: string) => Promise<{ ok: boolean; message: string }>;
  setOrganizationMembership: (id: string, status: 'active' | 'suspended' | 'revoked') => { ok: boolean; message: string };
  inviteToOrganization: (id: string, note?: string) => { ok: boolean; message: string };
  acceptOrganizationInvitation: (id: string) => { ok: boolean; message: string };
  declineOrganizationInvitation: (id: string) => { ok: boolean; message: string };
  removeOrganizationMembership: (id: string, reason?: string) => { ok: boolean; message: string };
  leaveOrganizationMembership: (id: string) => { ok: boolean; message: string };
  setDesktopShortcuts: (ids: string[]) => void;
  resetDesktopShortcuts: () => void;
  setDesktopTheme: (id: string) => void;
  browserUrl: string | null;
  browserState: BrowserState;
  versenetContent: VersenetContent;
  versenetSites: VersenetSites;
  worknetSim: WorknetSimulationState;
  library: LibraryState;
  orynvellRecords: OrynvellRecordsState;
  orynvellAction: (
    action: 'saveDraft' | 'submitRequest' | 'staffDecide' | 'toggleSaveRecord' | 'saveSearch',
    payload?: any,
  ) => { ok: boolean; message: string; request?: any; issuedDoc?: any };
  libraryAction: (
    action: 'issueCard' | 'borrow' | 'read' | 'return' | 'toggleReadingList' | 'viewGuide' | 'saveReflections',
    payload?: any,
  ) => { ok: boolean; message: string; card?: any };
  syncWorknetSimulation: () => void;
  logHourlyShiftTime: (track: string, units: number, ratePerUnit?: number) => { ok: boolean; message: string };
  issuePendingPayroll: (entryId?: string) => { ok: boolean; message: string; netCredits: number };
  resignEmployment: (track: string) => { ok: boolean; message: string };
  settleInterruptedOrder: (missionId: string) => { ok: boolean; message: string };
  fylo: FyloState;
  fyloAction: (
    action:
      | 'createFolder'
      | 'createNote'
      | 'updateNote'
      | 'rename'
      | 'move'
      | 'copy'
      | 'toggleFavorite'
      | 'retainAttachment'
      | 'trash'
      | 'restore'
      | 'deletePermanent'
      | 'emptyTrash',
    payload?: any,
  ) => { ok: boolean; file?: any; dir?: string; pinned?: boolean; alreadyRetained?: boolean; removedCount?: number; message?: string; reason?: string };

  setBrowserUrl: (url: string | null) => void;
  openBrowserTab: (url?: string, title?: string) => void;
  closeBrowserTab: (id: number) => void;
  setActiveBrowserTab: (id: number) => void;
  navigateBrowserTab: (url: string, title?: string) => void;
  goBrowserBack: () => void;
  goBrowserForward: () => void;
  toggleBrowserBookmark: () => void;
  removeBrowserBookmark: (url: string) => void;
  clearBrowserHistory: () => void;
  goBrowserHome: () => void;
  createBrowserTabGroup: (name: string) => { ok: boolean; message: string };
  setBrowserTabGroup: (tabId: number, groupId?: string) => { ok: boolean; message: string };
  renameBrowserTabGroup: (id: string, name: string) => { ok: boolean; message: string };
  removeBrowserTabGroup: (id: string) => void;

  loginUser: (userData: any) => void;
  grantLocalFullAccess: () => { ok: boolean; message: string };
  logoutUser: () => void;

  gameplay: any;

  linkLivingWorldCitizen: (runId: string, characterId: string, displayName?: string) => Promise<{ ok: boolean; message: string }>;
  unlinkLivingWorldCitizen: () => { ok: boolean; message: string };
  bumpCreditMirrorRevision: () => void;
  reconcileLivingWorldLink: () => Promise<void>;

  advanceTime: () => void;
  restInDorm: (duration?: SleepDuration) => {
    ok: boolean;
    staminaRecovered: number;
    auraRecovered: number;
    unlockedSpecialDream: any;
    message: string;
  };
  studyInHousing: () => { ok: boolean; message: string };
  purchaseHousingUpgrade: (upgradeId: string, cost: number, bitCost?: number) => { ok: boolean; message: string };
  inviteHousingGuest: (guestId: string) => { ok: boolean; message: string };
  advanceWorknetMissionStep: (missionId: string, stepKey: string) => void;
  completeWorknetDomainTask: (missionId: string, selectedOptionId: string) => { ok: boolean; message: string };
  acceptEmployment: (track: string) => { ok: boolean; message: string };
  openWorknetOrder: (missionId: string) => { ok: boolean; message: string };
  fieldAction: (action: 'move' | 'interact' | 'record', payload?: any) => { ok: boolean; message: string };
  saveWorknetDraft: (missionId: string, stageId: string, values: WorkValues) => void;
  submitWorknetStage: (missionId: string, stageId: string, values: WorkValues) => { ok: boolean; message: string };
  remediateWorknetOrder: (missionId: string, note: string) => { ok: boolean; message: string };
  completeWorknetMission: (mission: { id: string; track: string; rewardCredits: number; rewardBits?: number; rewardXP: number; primaryAttribute?: string }) => { ok: boolean; reason?: string };
  resetWorknetMissionsAdmin: () => void;
  worknetWorkplaceAction: (action: any) => { ok: boolean; message: string };
  claimCycleStipends: () => { ok: boolean; message: string; creditsClaimed?: number };
  setCareerPathwayChoice: (track: string, pathway: 'specialist' | 'supervisor') => { ok: boolean; message: string };
  compileSpellProtocol: (spell: { name: string; combo?: string; comboLabel?: string; type: string; desc: string; power: number; isCanonical: boolean; regions?: string[] }) => { ok: boolean; isNewDiscovery: boolean; status: 'mastered_new' | 'recast' | 'insufficient_stamina'; message: string };
  quarantineProcess: (pid: number) => boolean;
  recordFileInspection: (mockKey: string) => void;
  discoverRegionalShrine: (regionName: string) => boolean;
  recordWorldEvent: (params: { category: WorldEventCategory; title: string; summary: string; institution: string; citizenMaid?: string; tags?: string[]; impact?: WorldNarrativeEvent['impact'] }) => WorldNarrativeEvent;
  runFaithDiagnosticScan: () => { ok: boolean; message: string };
  treatFaithCondition: (conditionName: string) => { ok: boolean; message: string };
  completePatientCareAssignment: (patientCaseId: string, diagnosisId: string, treatmentId: string) => { ok: boolean; message: string };
  acceptMaiSpaceFriend: (friendId: string) => { ok: boolean; message: string };
  updateMaiSpaceProfile: (updates: { handle?: string; statusThought?: string; headerFont?: string }) => void;
  postMaiSpaceBulletin: (content: string) => { ok: boolean; message: string };
  pingMaiSpaceFriend: (friendId: string) => { ok: boolean; message: string };
  claimPortalAction: (actionId: string, rewardCredits: number, rewardBits?: number, rewardXP?: number, label?: string) => { ok: boolean; message: string };
  submitInvestigationCase: (caseId: string, selectedEvidenceIds: string[], hypothesisId: string) => { ok: boolean; verified: boolean; message: string };
  updateNPCVector: (npcId: string, vectorName: string, delta: number) => void;
  updateReputationTrack: (trackName: string, delta: number) => void;
  startSession: (gameId: string, initialState?: Record<string, any>) => void;
  updateSession: (gameId: string, sessionData: Record<string, any>) => void;
  endSession: (gameId: string) => void;
  addCredits: (amount: number) => void;
  addBits: (amount: number) => void;
  addXP: (amount: number) => void;
  completeActivity: (id: string) => void;
  completeNotice: (id: string) => boolean;
  claimCommsAttachment: (commId: string, credits?: number, xp?: number) => void;
  advanceAppRank: (appKey: string) => void;
  completeStarterLoop: (loopKey: string) => void;
  purgePrismCorruption: (amount: number) => void;
  verifyDGAIdentity: () => void;
  unlockApp: (appId: string) => void;
  completeIdentityScan: (data: any) => void;
  selectMAITone: (tone: string) => void;
  completeQuest: (questId: string) => void;
  incrementHackedNodes: () => void;
  damageAura: (amount: number) => void;
  healAura: (amount: number) => void;
  addCondition: (name: string) => void;
  removeCondition: (name: string) => void;
  clearConditions: () => void;
  addForgedSpell: (name: string) => void;
  decryptLineage: () => void;
  addSkillXP: (skillName: string, amount: number) => void;
  addCareerXP: (track: string, amount: number) => void;
  requestCareerPromotion: (track: string) => {
    ok: boolean;
    newRankIndex?: number;
    newTitle?: string;
    pathwayLabel?: string;
    message: string;
  };
  advanceStarterPhase: (targetPhase?: number) => void;
  setHouseAffiliation: (house: string) => void;
  updateActivityStatus: (activityId: string, status: string) => void;
  setMonth: (monthIndex: number) => void;
  advanceMonth: () => void;
  claimDailyReward: () => void;
  joinWorldEvent: (eventId: string) => void;
  incrementAppRank: (appName: string) => void;

  addWindow: (app: any) => void;
  toggleApp: (app: any) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, position: { x: number; y: number }) => void;
  clearActive: () => void;
  setWallpaper: (url: string) => void;
}

export const useOSStore = create<OSStoreState>()(persist((rawSet, get) => {
  const set: typeof rawSet = (update: any) => rawSet(state => {
    const patch = typeof update === 'function' ? update(state) : update;
    if (!patch?.gameplay?.player) return patch;
    const player = journalBalanceChange(state.gameplay.player, patch.gameplay.player);
    const nextPatch = player === patch.gameplay.player ? patch : { ...patch, gameplay: { ...patch.gameplay, player } };
    // Money is a one-way projection: player credits are authoritative, and the
    // linked simulation citizen's balance mirrors the delta idempotently.
    const link = state.gameplay?.livingWorldLink;
    const before = state.gameplay?.player?.credits ?? 0;
    const after = player.credits ?? 0;
    if (link && after !== before && Number.isSafeInteger(after - before)) {
      const delta = after - before;
      const cycle = nextPatch.gameplay?.timeCycleCount ?? state.gameplay?.timeCycleCount ?? 0;
      const requestId = creditMirrorRequestId(link, cycle);
      enqueue(() => transact(link.runId, {
        characterId: link.characterId,
        kind: 'player_mirror',
        amount: delta,
        description: 'Player credit mirror',
        requestId,
      }).then((result) => { if (!result?.alreadyApplied) get().bumpCreditMirrorRevision(); }));
    }
    return nextPatch;
  });
  const queueAdvanceLinkedRun = (previousTotal: number, nextTotal: number) => {
    const link = get().gameplay.livingWorldLink;
    if (!link || nextTotal === previousTotal) return;
    const segments = Math.abs(nextTotal - previousTotal);
    enqueue(async () => {
      const snapshot = await getRun(link.runId);
      const steps = segmentsToSteps(snapshot.clock.step_minutes, segments);
      await advanceWithRetry(link.runId, steps, snapshot.run.revision);
      await get().syncEntertainmentFromLivingWorld();
    });
  };
  return ({
  isLoggedIn: false,
  isSanctuary: false,
  toggleSanctuary: () => set((s) => ({ isSanctuary: !s.isSanctuary })),
  windows: [],
  activeWindowId: null,
  wallpaper: '',
  desktopPreferences: restoreDesktopPreferences(undefined),
  desktopAction: (action) => set(s => ({desktopPreferences:changeDesktop(s.desktopPreferences,action)})),
  hiddenDesktopWindows: [],
  toggleShowDesktop: () => set(s => {
    if(s.hiddenDesktopWindows.length) return {windows:s.windows.map(w=>s.hiddenDesktopWindows.includes(w.id)?{...w,isMinimized:false}:w),hiddenDesktopWindows:[],activeWindowId:s.hiddenDesktopWindows.filter(id=>s.windows.some(w=>w.id===id)).at(-1)||s.activeWindowId};
    const visible=s.windows.filter(w=>!w.isMinimized).map(w=>w.id);
    return {hiddenDesktopWindows:visible,windows:s.windows.map(w=>visible.includes(w.id)?{...w,isMinimized:true}:w)};
  }),
  workspaceRequests: {},
  workspaceRequestSequence: 0,
  setOrganizationMembership: (id, status) => {
    const current = get();
    if (!current.isLoggedIn || !current.gameplay.player.isAdmin) return { ok: false, message: 'Membership changes require the signed-in world administrator.' };
    const institution = organization(id);
    if (!institution || !['active', 'suspended', 'revoked'].includes(status)) return { ok: false, message: 'Unknown organization or membership status.' };
    set(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, organizationMemberships: {
      ...s.gameplay.player.organizationMemberships,
      [id]: { status, issuedAt: new Date().toISOString(), issuedBy: s.gameplay.player.name },
    } } } }));
    return { ok: true, message: `${institution.name} membership ${status}. Email issuance is separate.` };
  },
  inviteToOrganization: (id, note) => {
    const current = get();
    if (!current.isLoggedIn || !current.gameplay.player.isAdmin) return { ok: false, message: 'Organization invitations require the signed-in world administrator.' };
    const institution = organization(id);
    if (!institution) return { ok: false, message: 'Unknown organization.' };
    if (membershipSource(current.gameplay.player, id)) return { ok: false, message: `${institution.name} membership is already active.` };
    const invitation = {
      id: `INV:${institution.id}:${Date.now()}`,
      organizationId: institution.id,
      status: 'pending' as const,
      invitedAt: new Date().toISOString(),
      invitedBy: current.gameplay.player.name || 'World Administrator',
      note: typeof note === 'string' && note.trim() ? note.trim() : `Official channel membership invitation from ${institution.name}.`,
    };
    set(s => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          organizationInvitations: {
            ...(s.gameplay.player.organizationInvitations || {}),
            [institution.id]: invitation,
          },
        },
      },
    }));
    return { ok: true, message: `Invitation issued for ${institution.name}. The player must accept the invitation to activate Comms access.` };
  },
  acceptOrganizationInvitation: (id) => {
    const current = get();
    if (!current.isLoggedIn) return { ok: false, message: 'Sign in to accept an organization invitation.' };
    const institution = organization(id);
    if (!institution) return { ok: false, message: 'Unknown organization.' };
    const invite = invitationForOrganization(current.gameplay.player, id);
    if (!invite || !canAcceptInvitation(current.gameplay.player, id)) {
      return { ok: false, message: `No pending invitation found for ${institution.name}.` };
    }
    const now = new Date().toISOString();
    set(s => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          organizationInvitations: {
            ...(s.gameplay.player.organizationInvitations || {}),
            [institution.id]: { ...invite, status: 'accepted', respondedAt: now },
          },
          organizationMemberships: {
            ...(s.gameplay.player.organizationMemberships || {}),
            [institution.id]: { status: 'active', issuedAt: now, issuedBy: invite.invitedBy, via: 'invitation' },
          },
        },
      },
    }));
    return { ok: true, message: `Joined ${institution.name}. Organization Comms channels are now accessible; institutional email requires separate issuance.` };
  },
  declineOrganizationInvitation: (id) => {
    const current = get();
    if (!current.isLoggedIn) return { ok: false, message: 'Sign in to respond to an organization invitation.' };
    const institution = organization(id);
    if (!institution) return { ok: false, message: 'Unknown organization.' };
    const invite = invitationForOrganization(current.gameplay.player, id);
    if (!invite || invite.status !== 'pending') {
      return { ok: false, message: `No pending invitation found for ${institution.name}.` };
    }
    const now = new Date().toISOString();
    set(s => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          organizationInvitations: {
            ...(s.gameplay.player.organizationInvitations || {}),
            [institution.id]: { ...invite, status: 'declined', respondedAt: now },
          },
        },
      },
    }));
    return { ok: true, message: `Declined ${institution.name} invitation.` };
  },
  removeOrganizationMembership: (id, reason) => {
    const current = get();
    if (!current.isLoggedIn || !current.gameplay.player.isAdmin) return { ok: false, message: 'Removing a member from an organization requires the signed-in world administrator.' };
    const institution = organization(id);
    if (!institution) return { ok: false, message: 'Unknown organization.' };
    const now = new Date().toISOString();
    const existingInvite = invitationForOrganization(current.gameplay.player, id);
    set(s => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          organizationInvitations: existingInvite
            ? { ...(s.gameplay.player.organizationInvitations || {}), [institution.id]: { ...existingInvite, status: 'revoked', respondedAt: now } }
            : s.gameplay.player.organizationInvitations,
          organizationMemberships: {
            ...(s.gameplay.player.organizationMemberships || {}),
            [institution.id]: { status: 'revoked', issuedAt: now, issuedBy: s.gameplay.player.name, via: 'admin', ...(reason ? { reason } : {}) },
          },
        },
      },
    }));
    return { ok: true, message: `Removed from ${institution.name}. Channel and institutional sender access closed; existing work and history remain intact.` };
  },
  leaveOrganizationMembership: (id) => {
    const current = get();
    if (!current.isLoggedIn) return { ok: false, message: 'Sign in to leave an organization.' };
    const institution = organization(id);
    if (!institution) return { ok: false, message: 'Unknown organization.' };
    if (!membershipSource(current.gameplay.player, id)) {
      return { ok: false, message: `You do not have an active membership with ${institution.name}.` };
    }
    const now = new Date().toISOString();
    set(s => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          organizationMemberships: {
            ...(s.gameplay.player.organizationMemberships || {}),
            [institution.id]: { status: 'revoked', issuedAt: now, issuedBy: s.gameplay.player.name || 'Player Citizen', via: 'self_left' },
          },
        },
      },
    }));
    return { ok: true, message: `Left ${institution.name}. Organization Comms channels are now locked.` };
  },
  linkCitizenHubIdentity: async (id) => {
    const before = get();
    if (!before.isLoggedIn || !before.gameplay.player.isAdmin) return { ok: false, message: 'Only the signed-in world administrator can link a player to an AURA identity.' };
    const { MaidIdentityService } = await import('../services/maidIdentityService');
    const persons = await MaidIdentityService.readExistingPersons();
    const matches = persons.filter(candidate => candidate && typeof candidate.id === 'string' && candidate.id === id && !candidate.isRestricted);
    const person = matches.length === 1 ? matches[0] : undefined;
    if (!person) return { ok: false, message: 'Choose an existing unrestricted AURA identity.' };
    const current = get();
    if (!current.isLoggedIn || !current.gameplay.player.isAdmin || current.gameplay.identity !== before.gameplay.identity || current.gameplay.player.name !== before.gameplay.player.name) {
      return { ok: false, message: 'The player identity changed. Review the link again.' };
    }
    set(s => ({ gameplay: { ...s.gameplay, identity: { ...s.gameplay.identity, canonicalPersonId: person.id } } }));
    return { ok: true, message: `Citizen Hub linked to ${person.name}. AURA records and issued documents are unchanged.` };
  },
  openWindow: (id) => get().openAppWorkspace(id),
  openAppWorkspace: (id, section) => {
    const destination = resolveAppDestination(id);
    const target = section || destination.section;
    if (target) set(s => ({
      workspaceRequestSequence: s.workspaceRequestSequence + 1,
      workspaceRequests: {
        ...s.workspaceRequests,
        [destination.appId]: { section: target, revision: s.workspaceRequestSequence + 1 },
      },
    }));
    if (get().windows.some(window => window.id === destination.appId)) get().focusWindow(destination.appId);
    else get().addWindow({ id: destination.appId, contentKey: destination.appId });
  },
  consumeWorkspaceRequest: (id, revision) => set(s => {
    if (s.workspaceRequests[id]?.revision !== revision) return {};
    const workspaceRequests = { ...s.workspaceRequests };
    delete workspaceRequests[id];
    return { workspaceRequests };
  }),
  setDesktopShortcuts: (ids) => set(s => { const p=restoreDesktopPreferences({ ...s.desktopPreferences, shortcutIds: ids }); const g=p.layouts.everyday.groups.find(g=>g.id==='apps'); if(g)g.shortcuts=p.shortcutIds.map(target=>({id:`app:${target}`,kind:'app',target})); return {desktopPreferences:p}; }),
  resetDesktopShortcuts: () => get().setDesktopShortcuts(restoreDesktopPreferences(undefined).shortcutIds),
  setDesktopTheme: (themeId) => set(s => ({ desktopPreferences: restoreDesktopPreferences({ ...s.desktopPreferences, themeId }) })),
  browserUrl: null,
  browserState: initialBrowserState(),
  versenetContent: emptyVersenetContent(),
  versenetSites: emptyVersenetSites(),
  worknetSim: emptyWorknetSimulation(),
  library: emptyLibraryState(),
  orynvellRecords: emptyOrynvellRecordsState(),
  orynvellAction: (action, payload) => {
    const state = get();
    const current = state.orynvellRecords;
    const cycle = state.gameplay.timeCycleCount ?? 0;
    if (action === 'saveDraft') {
      set({
        orynvellRecords: {
          ...current,
          draftForm: {
            serviceType: payload?.serviceType || current.draftForm.serviceType,
            recordId: typeof payload?.recordId === 'string' ? payload.recordId : current.draftForm.recordId,
            details: typeof payload?.details === 'string' ? payload.details.slice(0, 2000) : current.draftForm.details,
          },
        },
      });
      return { ok: true, message: 'Draft saved.' };
    }
    if (action === 'submitRequest') {
      if (!state.isLoggedIn) return { ok: false, message: 'Sign in with your AURA citizen account to submit a formal request.' };
      const res = submitOrynvellRequest(current, {
        serviceType: payload?.serviceType,
        recordId: payload?.recordId,
        details: payload?.details,
        applicantName: state.gameplay.player.name || 'Citizen',
        applicantMaid: state.gameplay.identity?.maid || 'MAID-OR-CITIZEN',
        cycle,
      });
      if (!res.ok) return { ok: false, message: res.reason };
      const fee = res.request?.feeCredits || 0;
      if (fee > 0 && (state.gameplay.player.credits || 0) < fee) {
        return { ok: false, message: `Insufficient credits for the ${fee} ₢ statutory administrative fee.` };
      }
      set(s => ({
        orynvellRecords: res.state,
        ...(fee > 0
          ? { gameplay: { ...s.gameplay, player: { ...s.gameplay.player, credits: (s.gameplay.player.credits || 0) - fee } } }
          : {}),
      }));
      return { ok: true, message: fee > 0 ? `${res.reason} (${fee} ₢ fee processed via ORYN.)` : res.reason, request: res.request };
    }
    if (action === 'staffDecide') {
      if (!canAccessStaffWorkspace(state.gameplay.player, state.isLoggedIn)) {
        return { ok: false, message: 'Authorized Orynvell records staff credentials are required.' };
      }
      const res = staffDecideOrynvellRequest(current, {
        requestId: payload?.requestId,
        decision: payload?.decision,
        actorName: state.gameplay.player.name || 'Records Officer',
        note: payload?.note || '',
        cycle,
      });
      if (res.ok) set({ orynvellRecords: res.state });
      return { ok: res.ok, message: res.reason, issuedDoc: res.issuedDoc };
    }
    if (action === 'toggleSaveRecord') {
      const id = String(payload?.recordId || '');
      if (!id) return { ok: false, message: 'Invalid record ID.' };
      const exists = current.savedRecordIds.includes(id);
      const savedRecordIds = exists ? current.savedRecordIds.filter(x => x !== id) : [...current.savedRecordIds, id];
      set({ orynvellRecords: { ...current, savedRecordIds } });
      return { ok: true, message: exists ? 'Removed record from saved list.' : 'Saved record reference.' };
    }
    if (action === 'saveSearch') {
      const query = String(payload?.query || '').trim();
      const category = String(payload?.category || 'All');
      if (!query && category === 'All') return { ok: false, message: 'Enter a search term or category first.' };
      const next = [{ id: `SRCH-${crypto.randomUUID()}`, query, category }, ...current.savedSearches].slice(0, 12);
      set({ orynvellRecords: { ...current, savedSearches: next } });
      return { ok: true, message: 'Saved search to My Requests.' };
    }
    return { ok: false, message: 'Unknown Orynvell Records action.' };
  },
  libraryAction: (action, payload) => {
    const state = get();
    const current = state.library;
    const cycle = state.gameplay.timeCycleCount ?? 0;
    if (action === 'issueCard') {
      const res = issueOrRenewLibraryCard(current, {
        holderName: payload?.holderName || state.gameplay.player.name || 'Citizen Reader',
        maid: payload?.maid || state.gameplay.identity?.maid || 'MAID-OR-00481926',
        homeBranch: payload?.homeBranch,
        tier: payload?.tier || 'citizen',
        clearance: state.gameplay.player.clearanceLevel ?? 2,
        cycle,
      });
      if (res.ok) set({ library: res.state });
      return { ok: res.ok, message: res.reason, card: res.card };
    }
    if (action === 'borrow') {
      const res = borrowCatalogItem(current, payload?.itemId, cycle);
      if (res.ok) set({ library: res.state });
      return { ok: res.ok, message: res.reason };
    }
    if (action === 'read') {
      const res = updateLoanProgress(current, payload?.itemId, payload?.delta ?? 35);
      if (res.ok) set({ library: res.state });
      return { ok: res.ok, message: res.reason };
    }
    if (action === 'return') {
      const res = returnCatalogItem(current, payload?.itemId);
      if (res.ok) set({ library: res.state });
      return { ok: res.ok, message: res.reason };
    }
    if (action === 'toggleReadingList') {
      const id = String(payload?.itemId || '');
      if (!id) return { ok: false, message: 'Invalid catalog item.' };
      const exists = current.savedReadingListIds.includes(id);
      const next = exists
        ? current.savedReadingListIds.filter(x => x !== id)
        : [...current.savedReadingListIds, id];
      set({ library: { ...current, savedReadingListIds: next } });
      return { ok: true, message: exists ? 'Removed from reading list.' : 'Saved to your reading list.' };
    }
    if (action === 'viewGuide') {
      const id = String(payload?.guideId || '');
      if (id && !current.viewedGuideIds.includes(id)) {
        set({ library: { ...current, viewedGuideIds: [...current.viewedGuideIds, id] } });
      }
      return { ok: true, message: 'Guide opened.' };
    }
    if (action === 'saveReflections') {
      const text = typeof payload?.text === 'string' ? payload.text.slice(0, 4000) : '';
      set({ library: { ...current, reflections: text } });
      return { ok: true, message: 'Reading reflections saved.' };
    }
    return { ok: false, message: 'Unknown library action.' };
  },
  syncWorknetSimulation: () =>
    set(state => {
      if (isWorldPaused()) return state;
      const tick = workTick(state.gameplay);
      const workplace = restoreWorkplace(state.gameplay.player.worknetWorkplace, state.worknetSim.lastTick, state.gameplay.player);
      return {
        worknetSim: advanceWorknetSimulation(state.worknetSim, tick, workplace),
        gameplay: { ...state.gameplay, player: { ...state.gameplay.player, worknetWorkplace: restoreWorkplace(workplace, tick, state.gameplay.player) } },
      };
    }),
  logHourlyShiftTime: (track, units, _ratePerUnit = WORK_PAY_RULES.hourlyRate) => {
    track = canonicalCareerId(track);
    const state = get();
    if (isWorldPaused()) return { ok: false, message: 'Resume the world before logging shift time.' };
    const contract = state.gameplay.player.employmentContracts?.[track];
    if (!contract) return { ok: false, message: 'An active employment contract is required to log hourly shift time.' };
    if (!Number.isSafeInteger(units) || units < 1 || units > 4) return { ok: false, message: 'Log between 1 and 4 verified work units.' };
    const elapsed = Math.max(0, workTick(state.gameplay) - (contract.signedAtTick ?? workTick(state.gameplay)));
    if (units > elapsed) return { ok: false, message: 'Advance the world clock before logging additional shift units.' };
    const cycle = state.gameplay.timeCycleCount ?? 0;
    let nextSim = state.worknetSim;
    for (let offset = 1; offset <= units; offset++) {
      const res = recordEarnedPayroll(nextSim, {
        claimId: `HOURLY:player:${workTick(state.gameplay) - offset}`,
        model: 'hourly', payer: `Oryn Department of Finance (${contract.position})`, track,
        description: `Verified work segment — ${contract.position}`, verifiedUnits: 1,
        ratePerUnit: WORK_PAY_RULES.hourlyRate, verified: true, cycle,
      });
      if (!res.ok) return { ok: false, message: 'These shift units already have a payroll receipt.' };
      nextSim = res.state;
    }
    set({ worknetSim: nextSim });
    return { ok: true, message: `Recorded ${units} verified work segment(s) for payroll.` };
  },
  issuePendingPayroll: (entryId) => {
    const state = get();
    if (isWorldPaused()) return { ok: false, message: 'Resume the world before issuing payroll.', netCredits: 0 };
    const cycle = state.gameplay.timeCycleCount ?? 0;
    const issued = issueEarnedPayroll(state.worknetSim, cycle, entryId);
    if (issued.issuedCount === 0) {
      return { ok: false, message: 'No earned payroll entries are awaiting issuance.', netCredits: 0 };
    }
    set(s => ({
      worknetSim: issued.state,
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          credits: (s.gameplay.player.credits || 0) + issued.totalNetCredits,
        },
      },
    }));
    return {
      ok: true,
      netCredits: issued.totalNetCredits,
      message: `Issued ${issued.totalNetCredits.toLocaleString()} ₢ net across ${issued.issuedCount} payroll obligation(s) via Oryn Department of Finance.`,
    };
  },
  resignEmployment: (track) => {
    const state = get();
    const contract = state.gameplay.player.employmentContracts?.[track];
    if (!contract) return { ok: false, message: 'No active employment contract for this career track.' };
    const nextContracts = { ...(state.gameplay.player.employmentContracts || {}) };
    delete nextContracts[track];
    const nextSim = appendCareerMilestone(state.worknetSim, {
      track,
      kind: 'resigned',
      title: `Resigned: ${contract.position}`,
      detail: 'Employment ended cleanly. All skills, credentials, and prior career history remain preserved.',
      cycle: state.gameplay.timeCycleCount ?? 0,
    });
    set(s => ({
      worknetSim: nextSim,
      gameplay: {
        ...s.gameplay,
        player: { ...s.gameplay.player, employmentContracts: nextContracts },
      },
    }));
    return { ok: true, message: `Resigned from ${contract.position}. Your career history and skills remain intact.` };
  },
  settleInterruptedOrder: (missionId) => {
    const state = get();
    const order = state.gameplay.player.worknetOrders?.[missionId];
    if (!order || order.status !== 'active') return { ok: false, message: 'No active work order to settle.' };
    const completedStages = new Set(order.resultIds?.filter(id => { const result = state.gameplay.player.taskResults?.[id]; return result?.workOrderId === order.id && !result.compensationPaid; }) || []).size;
    const cycle = state.gameplay.timeCycleCount ?? 0;
    let nextSim = state.worknetSim;
    let notice = 'Work order closed without completion fee.';
    if (completedStages > 0) {
      const res = recordEarnedPayroll(nextSim, {
        claimId: `PARTIAL:${order.id}`,
        model: 'hourly',
        payer: 'WORKNET Partial Settlement',
        track: order.employmentContractId?.replace('EMP:', '') || 'dga',
        description: `Partial settlement for ${order.subject} (${completedStages} verified stage output${completedStages === 1 ? '' : 's'})`,
        verifiedUnits: completedStages,
        ratePerUnit: WORK_PAY_RULES.partialStageRate,
        verified: true,
        cycle,
      });
      if (res.ok) {
        nextSim = res.state;
        notice = `Work order closed early. ${res.reason}`;
      }
    }
    const nextOrders = { ...(state.gameplay.player.worknetOrders || {}) };
    delete nextOrders[missionId];
    set(s => ({
      worknetSim: nextSim,
      gameplay: { ...s.gameplay, player: { ...s.gameplay.player, worknetOrders: nextOrders, compensationReceiptIds: [...new Set([...(s.gameplay.player.compensationReceiptIds || []), order.id])], rewardedWorkOrderIds: [...new Set([...(s.gameplay.player.rewardedWorkOrderIds || []), order.id])] } },
    }));
    return { ok: true, message: notice };
  },
  fylo: emptyFyloState(),
  fyloAction: (action, payload) => {
    const current = get().fylo;
    if (action === 'createFolder') {
      const res = createFyloFolder(current, payload?.name, payload?.parentDir);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, dir: res.dir, message: res.ok ? `Created folder ${res.dir}.` : res.reason, reason: res.reason };
    }
    if (action === 'createNote') {
      const res = createPersonalNote(current, payload || {});
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, file: res.file, message: res.ok ? `Saved ${res.file?.name} in Fylo.` : res.reason, reason: res.reason };
    }
    if (action === 'updateNote') {
      const res = updateFyloNote(current, payload?.id, payload || {});
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, file: res.file, message: res.ok ? `Updated ${res.file?.name}.` : res.reason, reason: res.reason };
    }
    if (action === 'rename') {
      const res = renameFyloFile(current, payload?.id, payload?.name);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, file: res.file, message: res.ok ? `Renamed to ${res.file?.name}.` : res.reason, reason: res.reason };
    }
    if (action === 'move') {
      const res = moveFyloFile(current, payload?.id, payload?.dir);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, file: res.file, message: res.ok ? `Moved ${res.file?.name} to ${res.file?.dir}.` : res.reason, reason: res.reason };
    }
    if (action === 'copy') {
      const res = copyFyloFile(current, payload?.source, payload?.dir);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, file: res.file, message: res.ok ? `Created personal copy ${res.file?.name}.` : res.reason, reason: res.reason };
    }
    if (action === 'toggleFavorite') {
      const res = toggleFyloFavorite(current, payload?.key);
      set({ fylo: res.state });
      return { ok: true, pinned: res.pinned, message: res.pinned ? 'Pinned to Favorites.' : 'Removed from Favorites.' };
    }
    if (action === 'retainAttachment') {
      const res = retainAttachmentInFylo(current, payload || {});
      set({ fylo: res.state });
      return {
        ok: true,
        file: res.file,
        alreadyRetained: res.alreadyRetained,
        message: res.alreadyRetained ? `${res.file.name} is already retained in Fylo.` : `${res.file.name} saved as an independent file in Fylo.`,
      };
    }
    if (action === 'trash') {
      const res = trashFyloFile(current, payload?.id);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, message: res.ok ? 'Moved file to Trash.' : res.reason, reason: res.reason };
    }
    if (action === 'restore') {
      const res = restoreFyloFile(current, payload?.id);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, message: res.ok ? 'Restored file from Trash.' : res.reason, reason: res.reason };
    }
    if (action === 'deletePermanent') {
      const res = deleteFyloFilePermanently(current, payload?.id);
      if (res.ok) set({ fylo: res.state });
      return { ok: res.ok, message: res.ok ? 'File permanently deleted.' : res.reason, reason: res.reason };
    }
    if (action === 'emptyTrash') {
      const res = emptyFyloTrash(current);
      set({ fylo: res.state });
      return { ok: true, removedCount: res.removedCount, message: `Removed ${res.removedCount} trashed item${res.removedCount === 1 ? '' : 's'}.` };
    }
    return { ok: false, reason: 'Unknown Fylo action.' };
  },
  ...createSiteActions(set, get),
  ...createVersenetActions(set, get),
  ...createBrowserActions(set, get),
  ...createSocialActions(set, get),
  ...createMediaStudioActions(set, get),

  grantLocalFullAccess: () => {
    const current = get();
    if (!current.isLoggedIn || !isLocalWorld(globalThis.location?.hostname || '')) return { ok: false, message: 'Full-access credentials are available in your signed-in local world.' };
    set(s => ({ gameplay: grantLocalCredentials(s.gameplay, new Date().toISOString()) }));
    return { ok: true, message: 'Full access enabled. Clearance 5, all institutions, DGAOS and TRACE are available. Your progress is preserved.' };
  },
  loginUser: (userData) =>
    set((s) => {
      const localHost = isLocalWorld(globalThis.location?.hostname || '');
      // Login resumes this browser's saved character without reapplying starter rewards.
      if (s.gameplay.player.name && s.gameplay.player.name.toLowerCase() === userData.name?.trim().toLowerCase()) {
        return {
          isLoggedIn: true,
          gameplay: localHost ? grantLocalCredentials(s.gameplay, new Date().toISOString()) : s.gameplay,
        };
      }
      const isAdmin = !!(
        localHost ||
        userData.isAdmin ||
        userData.name?.toLowerCase().includes('admin') ||
        (userData.clearance && userData.clearance >= 4)
      );

      if (isAdmin) {
        return {
          isLoggedIn: true,
          gameplay: {
            ...s.gameplay,
            lockedApps: [], // ALL apps completely unlocked
            onboardingPhase: 6, // Completed onboarding
            identity: {
              fingerprint: true,
              facial: true,
              auraBaseline: true,
              citizenId: 'CIT-ROOT-0001',
              barcode: 'AURE-SYS-ROOT-001',
              signalSignature: 'Root-Resonance-Omni (Master)',
              profileTags: ['#RootAdmin', '#Netrunner', '#MasterArchivist', '#SystemsArchitect', '#TacticalShield'],
              declaredRegion: 'Orynvell Upper Sanctum',
            },
            player: {
              ...s.gameplay.player,
              name: userData.name || 'ADMINISTRATOR',
              isAdmin: true,
              clearanceLevel: 5,
              level: userData.level !== undefined ? userData.level : 99,
              credits: userData.credits !== undefined ? userData.credits : 99999,
              bits: userData.bits !== undefined ? userData.bits : 9999,
              xp: 99999,
              dgaVerified: true,
              lineageDecrypted: true,
              auraHealth: 100,
              conditions: [], // No debuffs or Veilwilt
              hackedNodes: 99,
              starterPhase: 5,
              dormComfort: 100,
              reputation: {
                campus: 100,
                dga: 100,
                faith: 100,
                archive: 100,
                vector: 100,
                delegation: 100,
                orynvell: 100,
              },
              skills: {
                Programming: { level: 10, xp: 9999 },
                Networking: { level: 10, xp: 9999 },
                Spellcasting: { level: 10, xp: 9999 },
                Engineering: { level: 10, xp: 9999 },
                Communication: { level: 10, xp: 9999 },
                Creativity: { level: 10, xp: 9999 },
                Research: { level: 10, xp: 9999 },
                CyberSecurity: { level: 10, xp: 9999 },
                Cryptography: { level: 10, xp: 9999 },
              },
              careers: Object.fromEntries(Object.values(CAREER_REGISTRY).map(c => [c.id, { rankIndex: 5, xp: 100, title: c.tierTitles[5] }])),
              npcVectors: {
                jeremie: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                sissi: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                aelita: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                odd: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                voss: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                riven: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                mara: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                tali: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                liora: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                ember: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                ulrich: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                franz: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                rowan: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                ilyra: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                maris: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                kael: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                nyx: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
                null: { friendship: 100, trust: 100, rivalry: 0, sync: 100, corruption: 0 },
              },
              rewardItems: [
                'Master Root Security Key',
                'DGA Level 5 High Clearance Card',
                'AETHERCORE Prime Crystal',
                'Royal Seal of Orynvell Archive',
                'Faith Medical Bio-Aura Master Caduceus',
                'Universal Hex Debugger',
                'Arcadia Master Seed Vault Pass'
              ],
            },
          },
        };
      }

      return {
        isLoggedIn: true,
        gameplay: {
          ...s.gameplay,
          player: {
            ...s.gameplay.player,
            name: userData.name || s.gameplay.player.name,
            clearanceLevel: userData.clearance || 1,
            credits: userData.credits !== undefined ? userData.credits : s.gameplay.player.credits,
            bits: userData.bits !== undefined ? userData.bits : s.gameplay.player.bits,
            level: userData.level !== undefined ? userData.level : s.gameplay.player.level,
          },
        },
      };
    }),

  logoutUser: () => set(state => {
    const workspaceRequests = { ...state.workspaceRequests };
    delete workspaceRequests.browser;
    return { isLoggedIn: false, browserState: restartBrowserSession(state.browserState), browserUrl: BROWSER_HOME, workspaceRequests };
  }),

  // ------------------------------------------------------------------
  // Gameplay State Lane (Cross-App Progression & Mechanics)
  // ------------------------------------------------------------------
  gameplay: {
    academics: emptyAcademics(),
    sessions: {},
    activeGameId: null,
    prismCorruptionLevel: 14.8,
    claimedComms: [],
    worldPublications: restoreWorldPublications(null),
    mediaStudio: restoreMediaStudio(null),
    entertainment: initialEntertainmentState(28),
    worldEventLog: [
      {
        id: 'EVT-BOOT-01',
        category: 'civic',
        title: 'Aureline Municipal Grid Synchronized',
        summary: 'Directive 14-B biometric telemetry and citizen registry links initialized across all 9 institutions.',
        institution: 'Aureline Civic Grid',
        cycle: 28,
        timestamp: '2026-03-06T08:00:00.000Z',
        tags: ['civic', 'boot'],
      },
    ],
    timeSegmentIndex: 2, // 0: Morning, 1: Afternoon, 2: Evening, 3: Night
    timeCycleCount: 28,
    livingWorldLink: null as LivingWorldLink | null,
    onboardingPhase: 1, // 1: Boot, 2: Emails Read, 3: Identity Verified, 4: Comms Unlocked, 6: Completed
    lockedApps: ['passport', 'comms'], // Apps locked until onboarding steps are completed
    identity: {
      fingerprint: false,
      facial: false,
      auraBaseline: false,
      citizenId: null,
      canonicalPersonId: null,
      barcode: null,
      signalSignature: 'Aura-Code-Alpha',
      profileTags: ['#Netrunner', '#Scholar'],
      declaredRegion: 'Aureline Central',
    },
    maiTone: null, // 'friendly' | 'neutral' | 'cold'
    player: {
      level: 1,
      credits: 500,
      bits: 25,
      xp: 0,
      stamina: 85,
      rewardItems: [],
      completedQuests: [],
      completedNoticeIds: NOTICES.filter((notice) => notice.completed).map((notice) => notice.id),
      completedWorknetMissionIds: [],
      worknetMissionProgress: {},
      employmentContracts: {},
      compensationReceiptIds: [] as string[],
      organizationMemberships: {},
      organizationInvitations: {},
      worknetOrders: {},
      assignmentJournal: emptyAssignmentJournal(),
      worldJournal: emptyWorldJournal(),
      rewardedWorkOrderIds: [],
      taskResults: {},
      unlockedHousingUpgrades: ['banner'],
      housingCalibrated: false,
      unlockedDreamIds: [],
      dreamLogs: [
        'DREAM_ENTRY #04: A mirrored cathedral under coastal rain. A woman with silver hair whispers: "The code was never code, it was memory."',
        'DREAM_ENTRY #03: Falling through the Supercomputer factory floor. Glowing blue lines trace my pulse.',
      ],
      hackedNodes: 0,
      quarantinedProcessPids: [],
      inspectedFiles: [],
      discoveredShrines: [],
      auraHealth: 100,
      conditions: ['Veilwilt'],
      faithDiagnosed: false,
      lastFaithDiagnosticCycle: 0,
      treatedConditionsHistory: [],
      completedPatientCareIds: [],
      maiSpaceProfile: {
        handle: 'Aureline_Netrunner',
        statusThought: 'Exploring the digital conduits of Aureline Central ✨',
        headerFont: 'Cookie',
        acceptedFriends: [],
        pingedFriendsCycle: {},
        lastBulletinPostCycle: 0,
        bulletinPosts: [
          { id: 1, author: 'Odd Della Robbia', time: '12m ago', content: 'Who replaced the cafeteria synth-juice with cryogenic coolant? My mouth is glowing blue.', likes: 14 },
          { id: 2, author: 'Jeremie Belpois', time: '34m ago', content: 'Observing unusual spectral noise in the Sub-Conduit frequency band (88.2 MHz). Keep your firewall up.', likes: 29 },
          { id: 3, author: 'Elisabeth Delmas (Sissi)', time: '1h ago', content: 'Reminder: Cyberium Academy Gala dress code is strictly Silver & Obsidian. Do not embarrass us.', likes: 8 },
          { id: 4, author: 'Aelita Schaeffer', time: '3h ago', content: 'The melody in the Veil towers sounds like a pre-Collapse lullaby...', likes: 45 },
        ],
      },
      claimedPortalActionIds: [],
      solvedInvestigationCaseIds: [],
      investigationCaseDrafts: {},
      forgedSpells: ['Reflect Shield'],
      forgedSpellHistory: [
        { name: 'Reflect Shield', combo: 'Firewall.mod + Routing.mod', type: 'Combat Defense', power: 120, date: 'Cycle 28', mastered: true },
      ],
      lineageDecrypted: false,
      dgaVerified: false,
      npcVectors: {
        jeremie: { friendship: 60, trust: 75, rivalry: 10, sync: 80, corruption: 0 },
        sissi: { friendship: 30, trust: 40, rivalry: 75, sync: 40, corruption: 0 },
        aelita: { friendship: 85, trust: 90, rivalry: 5, sync: 85, corruption: 5 },
        odd: { friendship: 95, trust: 85, rivalry: 15, sync: 80, corruption: 0 },
        voss: { friendship: 50, trust: 80, rivalry: 20, sync: 90, corruption: 0 },
        riven: { friendship: 65, trust: 60, rivalry: 45, sync: 75, corruption: 10 },
        mara: { friendship: 55, trust: 75, rivalry: 30, sync: 65, corruption: 0 },
        tali: { friendship: 80, trust: 70, rivalry: 10, sync: 70, corruption: 0 },
        liora: { friendship: 40, trust: 50, rivalry: 65, sync: 55, corruption: 0 },
        ember: { friendship: 45, trust: 45, rivalry: 70, sync: 60, corruption: 0 },
        ulrich: { friendship: 50, trust: 55, rivalry: 80, sync: 70, corruption: 0 },
        franz: { friendship: 60, trust: 85, rivalry: 0, sync: 90, corruption: 15 },
        rowan: { friendship: 70, trust: 90, rivalry: 5, sync: 65, corruption: 0 },
        ilyra: { friendship: 75, trust: 85, rivalry: 0, sync: 75, corruption: 0 },
        maris: { friendship: 65, trust: 70, rivalry: 10, sync: 60, corruption: 0 },
        kael: { friendship: 55, trust: 65, rivalry: 25, sync: 70, corruption: 5 },
        nyx: { friendship: 20, trust: 40, rivalry: 50, sync: 45, corruption: 60 },
        null: { friendship: 10, trust: 30, rivalry: 60, sync: 30, corruption: 85 },
      },
      reputation: {
        campus: 50,
        dga: 40,
        faith: 50,
        archive: 30,
        vector: 35,
        delegation: 25,
        orynvell: 10,
      },
      skills: {
        Programming: { level: 1, xp: 0 },
        Networking: { level: 1, xp: 0 },
        Spellcasting: { level: 1, xp: 0 },
        Engineering: { level: 1, xp: 0 },
        Communication: { level: 1, xp: 0 },
        Creativity: { level: 1, xp: 0 },
        Research: { level: 1, xp: 0 },
        CyberSecurity: { level: 1, xp: 0 },
        Cryptography: { level: 1, xp: 0 },
      },
      careers: Object.fromEntries(Object.values(CAREER_REGISTRY).map(c => [c.id, { rankIndex: 0, xp: 0, title: c.tierTitles[0] }])),
      starterPhase: 0,
      houseAffiliation: null,
      dormComfort: 50,
      roomComfort: 50,
      starterCompletedLoops: [],
      currentMonthIndex: 2, // Default: March (Early Spring / Founding Day)
      dailyRewardLastClaimed: 0,
      worldEvents: [
        { id: 'EVT-MAR6', name: 'Founding Day Protocol (March 6)', monthReq: 'March', active: true, desc: 'Unlocks Orynvell archives, coronation lore, ceremonial quests, and hidden AETHERCORE records.', reward: 'Orynvell Key + 500 Credits' },
        { id: 'EVT-FLUX', name: 'Aura Flux Outbreak', monthReq: 'July', active: true, desc: 'Faith Medical diagnostic emergency. Triage student aura profiles and collect recovery materials.', reward: 'Faith Medical Commendation + 300 XP' },
        { id: 'EVT-HACK', name: 'Cyberium Academy Netrunner Hackathon', monthReq: 'All', active: true, desc: 'Competitive coding event with Credit prizes, Programming XP, and rare exploit tools.', reward: '400 Credits + Rare Exploit' },
        { id: 'EVT-LEAK', name: 'Purge Archive Leak', monthReq: 'November', active: true, desc: 'Lightborn genealogy history leak. Encrypted files appear in Central Library archives.', reward: 'Lineage Fragment #09' },
        { id: 'EVT-EXCH', name: 'Regional Exchange Week', monthReq: 'September', active: true, desc: 'Delegates from Fross, Lumia, Marlowe, Brisland, and Kaji visit Cyberium Academy.', reward: 'Regional Reputation Boost' }
      ],
      activities: missionsData,
      appRanks: {
        explorer: 1,
        weaver: 1,
        investigator: 1,
        research: 1,
        influence: 1,
        clearance: 1,
      },
    },
  },

  linkLivingWorldCitizen: async (runId, characterId, displayName) => {
    const state = get();
    if (!state.isLoggedIn) return { ok: false, message: 'Sign in before linking a Living World citizen.' };
    try {
      const snapshot = await getRun(runId);
      const citizen = snapshot.run.state?.citizens?.[characterId];
      if (!citizen) return { ok: false, message: 'That citizen is not part of the selected run.' };
      const link: LivingWorldLink = {
        runId,
        characterId,
        canonicalPersonId: state.gameplay.identity?.canonicalPersonId ?? null,
        displayName: displayName || (typeof citizen.name === 'string' ? citizen.name : characterId),
        creditMirrorRevision: 0,
      };
      set(s => ({ gameplay: { ...s.gameplay, livingWorldLink: link } }));
      await get().reconcileLivingWorldLink();
      return { ok: true, message: `Linked to ${link.displayName} in the Living World.` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Living World service unavailable.' };
    }
  },
  unlinkLivingWorldCitizen: () => {
    set(s => ({
      gameplay: {
        ...s.gameplay,
        livingWorldLink: null,
        entertainment: s.gameplay.entertainment
          ? { ...s.gameplay.entertainment, authorityMode: 'standalone' as const }
          : s.gameplay.entertainment,
      },
    }));
    return { ok: true, message: 'Living World link removed. Player progress is unchanged.' };
  },
  bumpCreditMirrorRevision: () => {
    set(s => {
      const link = s.gameplay.livingWorldLink;
      if (!link) return {};
      return { gameplay: { ...s.gameplay, livingWorldLink: { ...link, creditMirrorRevision: link.creditMirrorRevision + 1 } } };
    });
  },
  reconcileLivingWorldLink: async () => {
    const link = get().gameplay.livingWorldLink;
    if (!link) return;
    try {
      const snapshot = await getRun(link.runId);
      const reconciled = reconcileLink(link, snapshot.clock, citizenBalance(snapshot, link.characterId));
      const playerTotal = (get().gameplay.timeCycleCount ?? 0) * 4 + (get().gameplay.timeSegmentIndex ?? 0);
      const runTotal = reconciled.timeCycleCount * 4 + reconciled.timeSegmentIndex;
      if (runTotal < playerTotal) {
        // The player advanced while the run was behind: bring the run forward
        // instead of rolling player time back.
        const steps = segmentsToSteps(snapshot.clock.step_minutes, playerTotal - runTotal);
        enqueue(() => advanceWithRetry(link.runId, steps, snapshot.run.revision));
      }
      set(s => {
        const current = s.gameplay.livingWorldLink;
        if (!current || current.runId !== link.runId || current.characterId !== link.characterId) return {};
        const patch: any = {
          gameplay: {
            ...s.gameplay,
            ...(runTotal > playerTotal
              ? { timeCycleCount: reconciled.timeCycleCount, timeSegmentIndex: reconciled.timeSegmentIndex }
              : {}),
          },
        };
        // Seed the one-way credit projection from the citizen balance once. The
        // store's set wrapper enqueues the idempotent mirror transaction.
        if (current.creditMirrorRevision === 0 && reconciled.creditBaseline !== null
          && reconciled.creditBaseline !== (s.gameplay.player.credits ?? 0)) {
          patch.gameplay.player = { ...s.gameplay.player, credits: reconciled.creditBaseline };
        }
        return patch;
      });
      await get().syncEntertainmentFromLivingWorld();
    } catch {
      // Living World unavailable: player state stays authoritative; retry later.
    }
  },

  advanceTime: () => {
    const previous = get().gameplay;
    const previousTotal = (previous.timeCycleCount ?? 0) * 4 + (previous.timeSegmentIndex ?? 0);
    set((state) => {
      if (isWorldPaused()) return state;
      const nextIndex = (state.gameplay.timeSegmentIndex + 1) % 4;
      const isNight = nextIndex === 3;
      const nextCycle = nextIndex === 0 ? state.gameplay.timeCycleCount + 1 : state.gameplay.timeCycleCount;
      const newCorruption = isNight
        ? Number((state.gameplay.prismCorruptionLevel + 5.0).toFixed(1))
        : state.gameplay.prismCorruptionLevel;
      const newAura = isNight
        ? Math.max(20, state.gameplay.player.auraHealth - 5)
        : state.gameplay.player.auraHealth;

      const nextTick = nextCycle * 4 + nextIndex;
      const isLinkedToLivingWorld = Boolean(state.gameplay.livingWorldLink?.runId);
      return {
        worknetSim: advanceWorknetSimulation(state.worknetSim, nextTick, state.gameplay.player.worknetWorkplace),
        orynvellRecords: advanceOrynvellRequests(state.orynvellRecords, nextTick),
        gameplay: {
          ...state.gameplay,
          timeSegmentIndex: nextIndex,
          timeCycleCount: nextCycle,
          prismCorruptionLevel: newCorruption,
          // When connected to the Living World, Python's step_entertainment() is authoritative;
          // advanceEntertainmentCycle() runs only in standalone/offline mode.
          entertainment: isLinkedToLivingWorld
            ? (state.gameplay.entertainment
                ? { ...state.gameplay.entertainment, authorityMode: 'living_world' as const }
                : state.gameplay.entertainment)
            : advanceEntertainmentCycle(state.gameplay.entertainment, nextCycle),
          player: {
            ...state.gameplay.player,
            auraHealth: newAura,
          },
        },
      };
    });
    const next = get().gameplay;
    queueAdvanceLinkedRun(previousTotal, (next.timeCycleCount ?? 0) * 4 + (next.timeSegmentIndex ?? 0));
  },

  restInDorm: (duration = 'full') => {
    const state = get();
    const player = state.gameplay.player;
    const currentDreams = Array.isArray(player.dreamLogs) ? player.dreamLogs : [];
    const outcome = calculateRestOutcome(state.gameplay, duration);
    const previousTotal = (state.gameplay.timeCycleCount ?? 0) * 4 + (state.gameplay.timeSegmentIndex ?? 0);

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        timeSegmentIndex: outcome.nextTimeSegmentIndex,
        timeCycleCount: outcome.nextTimeCycleCount,
        prismCorruptionLevel: outcome.nextCorruption,
        // Python's Living World simulation is authoritative when linked; run local simulation only in standalone mode.
        entertainment: s.gameplay.livingWorldLink?.runId
          ? (s.gameplay.entertainment
              ? { ...s.gameplay.entertainment, authorityMode: 'living_world' as const }
              : s.gameplay.entertainment)
          : advanceEntertainmentCycle(s.gameplay.entertainment, outcome.nextTimeCycleCount),
        player: {
          ...s.gameplay.player,
          auraHealth: outcome.nextAuraHealth,
          stamina: outcome.nextStamina,
          housingCalibrated: true,
          conditions: outcome.nextConditions,
          unlockedDreamIds: outcome.nextUnlockedDreamIds,
          dreamLogs: [outcome.dreamText, ...currentDreams.slice(0, 14)],
        },
      },
    }));

    if (outcome.unlockedSpecialDream) {
      get().recordWorldEvent({
        category: 'veil',
        title: `Special Lore Dream: ${outcome.unlockedSpecialDream.title}`,
        summary: outcome.unlockedSpecialDream.loreSummary,
        institution: 'HOMECRAFT // Subconscious Veil',
      });
    }

    queueAdvanceLinkedRun(previousTotal, (outcome.nextTimeCycleCount ?? 0) * 4 + (outcome.nextTimeSegmentIndex ?? 0));

    return {
      ok: true,
      staminaRecovered: outcome.staminaRecovered,
      auraRecovered: outcome.auraRecovered,
      unlockedSpecialDream: outcome.unlockedSpecialDream,
      message: outcome.summaryMessage,
    };
  },

  studyInHousing: () => {
    const state = get();
    const player = state.gameplay.player;
    const unlocked = Array.isArray(player.unlockedHousingUpgrades) ? player.unlockedHousingUpgrades : ['banner'];
    const staminaCost = unlocked.includes('mattress') ? 15 : 20;
    const currentStamina = typeof player.stamina === 'number' ? player.stamina : 85;
    if (currentStamina < staminaCost) {
      return { ok: false, message: `Too exhausted to study! Requires ${staminaCost} Stamina. Rest in your bed first.` };
    }

    const xpGain = unlocked.includes('desk') ? 160 : 120;
    const newXP = player.xp + xpGain;
    const newLevel = Math.floor(newXP / 100) + 1;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          stamina: Math.max(0, currentStamina - staminaCost),
          housingCalibrated: true,
          xp: newXP,
          level: newLevel,
        },
      },
    }));
    get().addSkillXP('Research', 25);
    get().addSkillXP('Programming', 20);
    return { ok: true, message: `Quiet independent study completed (-${staminaCost} stamina, +${xpGain} XP). Formal coursework is tracked in AureLearn.` };
  },

  purchaseHousingUpgrade: (upgradeId) => {
    const state = get();
    const player = state.gameplay.player;
    const furnishing = HOME_FURNISHINGS.find(item => item.id === upgradeId);
    if (!furnishing) return { ok: false, message: 'That furnishing is not available.' };
    const unlocked: string[] = Array.isArray(player.unlockedHousingUpgrades) ? player.unlockedHousingUpgrades : ['banner'];
    if (unlocked.includes(upgradeId)) return { ok: false, message: 'This furnishing is already installed.' };
    if (!Number.isFinite(player.credits) || player.credits < furnishing.cost) return { ok: false, message: `You need ${furnishing.cost} credits for this furnishing.` };
    const comfort = player.roomComfort ?? player.dormComfort ?? 50;
    const nextComfort = Math.min(100, Math.max(0, Number.isFinite(comfort) ? comfort : 50) + 10);
    const xp = player.xp + 40;
    set(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player,
      credits: player.credits - furnishing.cost, unlockedHousingUpgrades: [...unlocked, upgradeId],
      roomComfort: nextComfort, dormComfort: nextComfort, housingCalibrated: true, xp, level: Math.floor(xp / 100) + 1,
    } } }));
    get().recordWorldEvent({ category: 'housing', title: `Installed ${furnishing.name}`,
      summary: `Suite 4B received ${furnishing.name}. Room comfort: ${nextComfort}.`,
      institution: 'HOMECRAFT // Housing', impact: { reputationTrack: 'campus', reputationDelta: 2 } });
    return { ok: true, message: `${furnishing.name} installed. +40 XP. Room comfort: ${nextComfort}/100.` };
  },

  inviteHousingGuest: guestId => {
    const state = get();
    const player = state.gameplay.player;
    const guest = HOME_GUESTS.find(item => item.id === guestId);
    if (!guest) return { ok: false, message: 'That guest is not available.' };
    if (!player.unlockedHousingUpgrades?.includes('seating')) return { ok: false, message: 'Install guest seating before inviting a friend.' };
    const cycle = state.gameplay.timeCycleCount;
    const visits: { guestId: string; cycle: number }[] = Array.isArray(player.housingGuestVisits) ? player.housingGuestVisits : [];
    if (visits.some(visit => visit.guestId === guestId && visit.cycle === cycle)) return { ok: true, message: `${guest.name} has already visited this cycle. You can revisit your conversation.` };
    const xp = player.xp + 15;
    set(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player,
      housingGuestVisits: [...visits.filter(visit => visit.cycle === cycle), { guestId, cycle }],
      xp, level: Math.floor(xp / 100) + 1,
    } } }));
    return { ok: true, message: `${guest.name} stopped by. +15 XP for this cycle's visit.` };
  },

  advanceWorknetMissionStep: (missionId, stepKey) =>
    set((state) => {
      const player = state.gameplay.player;
      const progressMap: Record<string, string[]> = { ...(player.worknetMissionProgress || {}) };
      const existingSteps = Array.isArray(progressMap[missionId]) ? progressMap[missionId] : [];
      if (existingSteps.includes(stepKey)) return state;
      progressMap[missionId] = [...existingSteps, stepKey];

      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...player,
            worknetMissionProgress: progressMap,
          },
        },
      };
    }),

  ...createBankingActions(set, get),
  ...createProcessActions(set, get),
  ...createAcademicActions(set, get),
  ...createWorknetActions(set, get),
  ...createFieldActions(set, get),
  ...createBroadStreetActions(set, get),
  ...createAssignmentActions(set, get),
  ...createProgressionActions(set, get),
  ...createEntertainmentActions(set, get),

  compileSpellProtocol: (spell) => {
    const state = get();
    const player = state.gameplay.player;
    const currentStamina = typeof player.stamina === 'number' ? player.stamina : 85;
    if (currentStamina < 15) {
      return {
        ok: false,
        isNewDiscovery: false,
        status: 'insufficient_stamina',
        message: 'Insufficient Stamina (requires 15 Stamina). Rest in HOMECRAFT // Housing to recover.',
      };
    }

    const forgedSpells: string[] = Array.isArray(player.forgedSpells) ? player.forgedSpells : [];
    const history = Array.isArray(player.forgedSpellHistory) ? player.forgedSpellHistory : [];
    const alreadyForged = forgedSpells.includes(spell.name);
    const comboStr = spell.comboLabel || spell.combo || 'Module Synthesis';

    const discoveredShrines: string[] = Array.isArray(player.discoveredShrines) ? [...player.discoveredShrines] : [];
    if (Array.isArray(spell.regions)) {
      for (const reg of spell.regions) {
        if (reg && !discoveredShrines.includes(reg)) {
          discoveredShrines.push(reg);
        }
      }
    }

    if (!alreadyForged) {
      const xpGain = spell.isCanonical ? 150 : 60;
      const creditGain = spell.isCanonical ? 200 : 50;
      const newXP = player.xp + xpGain;
      const newLevel = Math.floor(newXP / 100) + 1;
      const nextCorruption = Math.max(2.0, Number((state.gameplay.prismCorruptionLevel - 2.0).toFixed(1)));

      set((s) => ({
        gameplay: {
          ...s.gameplay,
          prismCorruptionLevel: nextCorruption,
          player: {
            ...s.gameplay.player,
            stamina: Math.max(0, currentStamina - 15),
            credits: s.gameplay.player.credits + creditGain,
            xp: newXP,
            level: newLevel,
            forgedSpells: [...forgedSpells, spell.name],
            discoveredShrines,
            forgedSpellHistory: [
              { name: spell.name, combo: comboStr, type: spell.type, power: spell.power, date: `Cycle ${s.gameplay.timeCycleCount}`, mastered: true },
              ...history.slice(0, 14),
            ],
          },
        },
      }));
      recordAcademicCompilation(set, get);
      get().addSkillXP('Spellcasting', 35);
      get().recordWorldEvent({
        category: 'veil',
        title: `Synthesized New Spell Protocol: ${spell.name}`,
        summary: `Compiled ${comboStr} (${spell.power} PWR) in SpellForge, reducing PRISM corruption.`,
        institution: 'SpellForge Compiler',
      });
      return {
        ok: true,
        isNewDiscovery: true,
        status: 'mastered_new',
        message: `First-Time Protocol Discovery! +${creditGain} ₢, +${xpGain} XP, -2.0% PRISM Corruption.`,
      };
    } else {
      const nextCorruption = Math.max(2.0, Number((state.gameplay.prismCorruptionLevel - 1.0).toFixed(1)));
      set((s) => ({
        gameplay: {
          ...s.gameplay,
          prismCorruptionLevel: nextCorruption,
          player: {
            ...s.gameplay.player,
            stamina: Math.max(0, currentStamina - 15),
            auraHealth: Math.min(100, (s.gameplay.player.auraHealth || 100) + 5),
            discoveredShrines,
          },
        },
      }));
      recordAcademicCompilation(set, get);
      get().addSkillXP('Spellcasting', 15);
      return {
        ok: true,
        isNewDiscovery: false,
        status: 'recast',
        message: `Channeled mastered protocol "${spell.name}" (-15 Stamina). Stabilized Veil (-1.0% PRISM Corruption, +5 Aura, +15 Spellcasting XP).`,
      };
    }
  },

  quarantineProcess: pid => get().processAction({ type: 'isolate', pid }).ok,

  recordFileInspection: (mockKey) =>
    set((state) => {
      if (!mockKey) return state;
      const player = state.gameplay.player;
      const inspected: string[] = Array.isArray(player.inspectedFiles) ? player.inspectedFiles : [];
      const alreadyInspected = inspected.includes(mockKey);
      const nextInspected = alreadyInspected ? inspected : [...inspected, mockKey];
      const unlocksLineage = mockKey === 'purge-archive';
      const xpGain = alreadyInspected ? 0 : 25;
      const newXP = player.xp + xpGain;

      const currentEvents: WorldNarrativeEvent[] = Array.isArray(state.gameplay.worldEventLog) ? state.gameplay.worldEventLog : [];
      const nextEvents = alreadyInspected
        ? currentEvents
        : [
            worldEventEngine.createEvent({
              category: unlocksLineage ? 'archive' : 'forensic',
              title: `Inspected Archive File: ${mockKey}`,
              summary: unlocksLineage
                ? `Decrypted restricted pre-Collapse lineage file (${mockKey}).`
                : `Reviewed system record (${mockKey}) in Fylo.`,
              institution: 'Fylo // Archives',
              cycle: state.gameplay.timeCycleCount,
            }),
            ...currentEvents.slice(0, 29),
          ];

      return {
        gameplay: {
          ...state.gameplay,
          worldEventLog: nextEvents,
          player: {
            ...player,
            inspectedFiles: nextInspected,
            lineageDecrypted: player.lineageDecrypted || unlocksLineage,
            xp: newXP,
            level: Math.floor(newXP / 100) + 1,
          },
        },
      };
    }),

  discoverRegionalShrine: (regionName) => {
    if (!regionName) return false;
    const state = get();
    const player = state.gameplay.player;
    const shrines: string[] = Array.isArray(player.discoveredShrines) ? player.discoveredShrines : [];
    if (shrines.includes(regionName)) return false;

    const newXP = player.xp + 35;
    const newLevel = Math.floor(newXP / 100) + 1;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          discoveredShrines: [...shrines, regionName],
          xp: newXP,
          level: newLevel,
        },
      },
    }));
    get().addSkillXP('Research', 15);
    get().recordWorldEvent({
      category: 'veil',
      title: `Attuned ${regionName} Elemental Shrine`,
      summary: `Synchronized regional resonance node for ${regionName} (${shrines.length + 1}/8 Shrines).`,
      institution: 'Reality Registry // Shrines',
    });
    return true;
  },

  recordWorldEvent: (params) => {
    const state = get();
    const evt = worldEventEngine.createEvent({
      ...params,
      cycle: state.gameplay.timeCycleCount ?? 28,
    });
    set((s) => {
      const existing: WorldNarrativeEvent[] = Array.isArray(s.gameplay.worldEventLog) ? s.gameplay.worldEventLog : [];
      const currentCorruption = s.gameplay.prismCorruptionLevel ?? 14.8;
      const nextCorruption = params.impact?.corruptionDelta
        ? Math.max(2.0, Math.min(100, Number((currentCorruption + params.impact.corruptionDelta).toFixed(1))))
        : currentCorruption;

      const currentRep = s.gameplay.player.reputation || {};
      const nextRep =
        params.impact?.reputationTrack && params.impact?.reputationDelta
          ? {
              ...currentRep,
              [params.impact.reputationTrack]: Math.max(
                0,
                Math.min(100, (currentRep[params.impact.reputationTrack] || 50) + params.impact.reputationDelta)
              ),
            }
          : currentRep;

      return {
        gameplay: {
          ...s.gameplay,
          prismCorruptionLevel: nextCorruption,
          worldEventLog: [evt, ...existing.slice(0, 29)],
          player: {
            ...s.gameplay.player,
            reputation: nextRep,
          },
        },
      };
    });
    return evt;
  },

  runFaithDiagnosticScan: () => {
    const state = get();
    const player = state.gameplay.player;
    const currentCycle = state.gameplay.timeCycleCount ?? 28;
    if (player.faithDiagnosed && player.lastFaithDiagnosticCycle === currentCycle) {
      return {
        ok: false,
        message: `Personal bio-aura diagnostic already completed for Cycle ${currentCycle}. Rest or advance cycle before rescanning.`,
      };
    }

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          faithDiagnosed: true,
          lastFaithDiagnosticCycle: currentCycle,
          auraHealth: Math.min(100, (s.gameplay.player.auraHealth || 100) + 20),
        },
      },
    }));

    const activeConds: string[] = Array.isArray(player.conditions) ? player.conditions : [];
    get().recordWorldEvent({
      category: 'medical',
      title: `Faith Medical Personal Bio-Aura Diagnostic (Cycle ${currentCycle})`,
      summary: activeConds.length
        ? `Personal telemetry scan confirmed active condition(s): ${activeConds.join(', ')}. Personal treatment protocols unlocked.`
        : 'Personal telemetry scan confirmed stable bio-aura baseline (+20% Aura Integrity).',
      institution: 'Faith Medical Group',
    });

    return {
      ok: true,
      message: 'Personal Bio-Aura Diagnostic Complete (+20% Aura Integrity). Active personal conditions calibrated for targeted treatment.',
    };
  },

  treatFaithCondition: (conditionName) => {
    const state = get();
    const player = state.gameplay.player;
    if (!player.faithDiagnosed) {
      return {
        ok: false,
        message: 'Clinical prerequisite unmet: Run your Personal Baseline Aura Diagnostic scan before administering personal treatment.',
      };
    }

    const currentConditions: string[] = Array.isArray(player.conditions) ? player.conditions : [];
    if (!currentConditions.includes(conditionName)) {
      return {
        ok: false,
        message: `No active "${conditionName}" detected in your personal bio-aura telemetry. Treatment unnecessary.`,
      };
    }

    const history: string[] = Array.isArray(player.treatedConditionsHistory) ? player.treatedConditionsHistory : [];
    const currentStamina = typeof player.stamina === 'number' ? player.stamina : 85;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          conditions: currentConditions.filter((c) => c !== conditionName),
          treatedConditionsHistory: [...history, `${conditionName}@Cycle${s.gameplay.timeCycleCount}`],
          auraHealth: Math.min(100, (s.gameplay.player.auraHealth || 100) + 25),
          stamina: Math.min(100, currentStamina + 10),
        },
      },
    }));

    get().recordWorldEvent({
      category: 'medical',
      title: `Personal Healthcare: Treated ${conditionName}`,
      summary: `Faith Medical personal care cleared ${conditionName} from citizen bio-aura (+25% Aura Integrity, +10 Stamina).`,
      institution: 'Faith Medical Group',
      impact: { corruptionDelta: -0.5 },
    });

    return {
      ok: true,
      message: `Personal clinical treatment applied! Cleared "${conditionName}" and restored +25% Aura Integrity & +10 Stamina.`,
    };
  },

  completePatientCareAssignment: (patientCaseId, diagnosisId, treatmentId) => {
    const state = get();
    const player = state.gameplay.player;
    const completedCare: string[] = Array.isArray(player.completedPatientCareIds) ? player.completedPatientCareIds : [];
    if (completedCare.includes(patientCaseId)) {
      return {
        ok: false,
        message: `Patient chart ${patientCaseId} has already been treated and signed off.`,
      };
    }

    const caseDef = PATIENT_CARE_ASSIGNMENTS.find((p) => p.id === patientCaseId);
    if (!caseDef) {
      return { ok: false, message: `Unknown patient chart ID: ${patientCaseId}.` };
    }

    const diagObj = caseDef.diagnoses.find((d) => d.id === diagnosisId);
    const txObj = caseDef.treatments.find((t) => t.id === treatmentId);
    if (!diagObj?.isCorrect || !txObj?.isCorrect) {
      return {
        ok: false,
        message: `Clinical mismatch for ${caseDef.patientName}: Re-evaluate presenting vitals (${caseDef.presentingVitals}) before administering treatment.`,
      };
    }

    const newXP = player.xp + caseDef.rewardXP;
    const newLevel = Math.floor(newXP / 100) + 1;
    const missionId = caseDef.linkedWorknetMissionId;
    const workOrder: WorkOrder | undefined = missionId ? player.worknetOrders?.[missionId] : undefined;
    const careReceipt: TaskResult | undefined = missionId ? {
      id: `WORK:${missionId}:once:care`, workOrderId: `WORK:${missionId}:once`,
      definitionId: missionId, stageId: 'care', subject: patientCaseId, mechanic: 'diagnostics',
      output: { diagnosis: diagObj.label, treatment: txObj.label }, completedAt: new Date().toISOString(), compensationPaid: true,
    } : undefined;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          completedPatientCareIds: [...completedCare, patientCaseId],
          taskResults: careReceipt ? { ...player.taskResults, [careReceipt.id]: careReceipt } : player.taskResults,
          worknetOrders: workOrder && careReceipt && missionId ? { ...player.worknetOrders, [missionId]: {
            ...workOrder, resultIds: [...new Set([...workOrder.resultIds, careReceipt.id])], timeRemaining: workOrder.timeRemaining - 1,
          } } : player.worknetOrders,
          credits: s.gameplay.player.credits + caseDef.rewardCredits,
          xp: newXP,
          level: newLevel,
        },
      },
    }));

    get().addCareerXP('medical', caseDef.rewardCareerXP);
    get().addSkillXP('Communication', 20);
    get().recordWorldEvent({
      category: 'medical',
      title: `Completed Inpatient Care: ${caseDef.patientName}`,
      summary: `Diagnosed "${diagObj.label}" and administered "${txObj.label}" (+${caseDef.rewardCareerXP} Medical Career XP, +${caseDef.rewardCredits} ₢).`,
      institution: 'Faith Medical Group // Clinical Care',
      citizenMaid: caseDef.patientMaid,
      impact: { reputationTrack: 'faith', reputationDelta: 10, corruptionDelta: -0.5 },
    });

    return {
      ok: true,
      message: `✓ Patient Care Completed for ${caseDef.patientName}! Earned +${caseDef.rewardCareerXP} Medical Career XP, +${caseDef.rewardCredits} ₢, and +10 Faith Medical Reputation.`,
    };
  },

  acceptMaiSpaceFriend: (friendId) => get().socialAction({ type: 'friend', person: friendId, decision: 'accept' }),
  updateMaiSpaceProfile: (updates) => set(state => ({ gameplay: { ...state.gameplay, player: { ...state.gameplay.player, maiSpaceProfile: { ...state.gameplay.player.maiSpaceProfile,
    ...(typeof updates.handle === 'string' ? { handle: updates.handle.slice(0, 80) } : {}),
    ...(typeof updates.statusThought === 'string' ? { statusThought: updates.statusThought.slice(0, 300) } : {}),
    ...(['Cookie', 'Yeseva One', 'Esteban'].includes(updates.headerFont) ? { headerFont: updates.headerFont } : {}),
  } } } })),
  postMaiSpaceBulletin: content => get().socialAction({ type: 'post', kind: 'bulletin', title: 'Bulletin', html: `<p>${String(content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`, audience: 'public' }),
  pingMaiSpaceFriend: () => ({ ok: false, message: 'Friendship grows through conversations and shared experiences. Open a profile or personal Messages.' }),

  claimPortalAction: (actionId, rewardCredits, rewardBits = 0, rewardXP = 0, label = 'Institutional Portal Action') => {
    const state = get();
    const player = state.gameplay.player;
    const claimed: string[] = Array.isArray(player.claimedPortalActionIds) ? player.claimedPortalActionIds : [];
    if (claimed.includes(actionId)) {
      return { ok: false, message: 'This institutional directive or stipend has already been claimed.' };
    }

    const newXP = player.xp + rewardXP;
    const newLevel = Math.floor(newXP / 100) + 1;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          claimedPortalActionIds: [...claimed, actionId],
          credits: s.gameplay.player.credits + rewardCredits,
          bits: (s.gameplay.player.bits || 0) + rewardBits,
          xp: newXP,
          level: newLevel,
        },
      },
    }));

    get().recordWorldEvent({
      category: 'civic',
      title: label,
      summary: `Verified portal action (${actionId}) for +${rewardCredits} ₢.`,
      institution: 'Aureline Intranet Portal',
    });

    return { ok: true, message: `${label} verified (+${rewardCredits} ₢).` };
  },

  submitInvestigationCase: (caseId, selectedEvidenceIds, hypothesisId) => {
    const state = get();
    const player = state.gameplay.player;
    const solvedIds: string[] = Array.isArray(player.solvedInvestigationCaseIds) ? player.solvedInvestigationCaseIds : [];
    if (solvedIds.includes(caseId)) {
      return { ok: false, verified: true, message: `Case ${caseId} has already been formally validated and closed.` };
    }

    const evalRes = worldEventEngine.evaluateCaseSubmission(caseId, selectedEvidenceIds, hypothesisId);
    if (!evalRes.ok || !evalRes.verified || !evalRes.caseDef) {
      return { ok: false, verified: false, message: evalRes.message };
    }

    const caseDef = evalRes.caseDef;
    const newXP = player.xp + caseDef.rewardXP;
    const newLevel = Math.floor(newXP / 100) + 1;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          solvedInvestigationCaseIds: [...solvedIds, caseId],
          credits: s.gameplay.player.credits + caseDef.rewardCredits,
          bits: (s.gameplay.player.bits || 0) + caseDef.rewardBits,
          xp: newXP,
          level: newLevel,
        },
      },
    }));

    get().addSkillXP('Research', 35);
    get().recordWorldEvent({
      category: 'forensic',
      title: `Validated Case Resolution: ${caseDef.title}`,
      summary: evalRes.message,
      institution: caseDef.institution,
      citizenMaid: caseDef.subjectMaid,
      impact: {
        reputationTrack: caseDef.reputationTrack,
        reputationDelta: 12,
        corruptionDelta: -1.5,
      },
    });

    return {
      ok: true,
      verified: true,
      message: `${evalRes.message} Awarded +${caseDef.rewardCredits} ₢, +${caseDef.rewardBits} ◈, and +${caseDef.rewardXP} XP.`,
    };
  },

  updateNPCVector: (npcId, vectorName, delta) =>
    set((state) => {
      const current = state.gameplay.player.npcVectors[npcId] || { friendship: 50, trust: 50, rivalry: 0, sync: 50, corruption: 0 };
      const val = Math.max(0, Math.min(100, (current[vectorName] || 0) + delta));
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            npcVectors: {
              ...state.gameplay.player.npcVectors,
              [npcId]: {
                ...current,
                [vectorName]: val,
              },
            },
          },
        },
      };
    }),

  updateReputationTrack: (trackName, delta) =>
    set((state) => {
      const currentReps = state.gameplay.player.reputation || { campus: 50, dga: 40, faith: 50, archive: 30, vector: 35, delegation: 25, orynvell: 10 };
      const val = Math.max(0, Math.min(100, (currentReps[trackName] || 0) + delta));
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            reputation: {
              ...currentReps,
              [trackName]: val,
            },
          },
        },
      };
    }),

  startSession: (gameId, initialState = {}) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        activeGameId: gameId,
        sessions: {
          ...state.gameplay.sessions,
          [gameId]: state.gameplay.sessions[gameId] || {
            startedAt: Date.now(),
            score: 0,
            ...initialState,
          },
        },
      },
    })),

  updateSession: (gameId, sessionData) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        sessions: {
          ...state.gameplay.sessions,
          [gameId]: {
            ...(state.gameplay.sessions[gameId] || {}),
            ...sessionData,
            updatedAt: Date.now(),
          },
        },
      },
    })),

  endSession: (gameId) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        activeGameId: state.gameplay.activeGameId === gameId ? null : state.gameplay.activeGameId,
      },
    })),

  addCredits: (amount) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          credits: Math.max(0, state.gameplay.player.credits + amount),
        },
      },
    })),

  addBits: (amount) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          bits: Math.max(0, (state.gameplay.player.bits || 0) + amount),
        },
      },
    })),

  addXP: (amount) =>
    set((state) => {
      const newXP = state.gameplay.player.xp + amount;
      const newLevel = Math.floor(newXP / 100) + 1;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            xp: newXP,
            level: newLevel,
          },
        },
      };
    }),

  completeActivity: (id) =>
    set((state) => {
      const activities = state.gameplay.player.activities || [];
      const item = activities.find((a: any) => a.id === id);
      if (!item || item.status !== 'IN_PROGRESS') return state;

      const newActivities = activities.map((a: any) =>
        a.id === id ? { ...a, status: 'COMPLETED' } : a
      );

      const addedCredits = Number(item.rewards?.credits ?? item.credits ?? 0);
      const addedXP = Number(item.rewards?.xp ?? item.xp ?? 0);
      const rewardItem = item.rewards?.item ?? item.item;
      const rewardItems = state.gameplay.player.rewardItems || [];
      const newXP = state.gameplay.player.xp + addedXP;
      const newLevel = Math.floor(newXP / 100) + 1;

      let newLocked = state.gameplay.lockedApps || [];
      const unlockApp = item.rewards?.unlockApp ?? item.unlockApp;
      if (unlockApp && newLocked.includes(unlockApp)) {
        newLocked = newLocked.filter((app: string) => app !== unlockApp);
      }

      return {
        gameplay: {
          ...state.gameplay,
          lockedApps: newLocked,
          player: {
            ...state.gameplay.player,
            credits: state.gameplay.player.credits + addedCredits,
            xp: newXP,
            level: newLevel,
            rewardItems: rewardItem && !rewardItems.includes(rewardItem)
              ? [...rewardItems, rewardItem]
              : rewardItems,
            activities: newActivities,
          },
        },
      };
    }),

  completeNotice: (id) => {
    const state = get();
    const notice = NOTICES.find((candidate) => candidate.id === id);
    const player = state.gameplay.player;
    const completedIds = player.completedNoticeIds || [];
    if (!notice || notice.completed || completedIds.includes(id)) return false;

    const evaluation = evaluateNoticeObjective(player, id);
    if (!evaluation.met) return false;

    const xp = player.xp + (notice.rewardXP || 0);
    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          completedNoticeIds: [...completedIds, id],
          credits: s.gameplay.player.credits + (notice.rewardCredits || 0),
          bits: s.gameplay.player.bits + (notice.rewardBits || 0),
          xp,
          level: Math.floor(xp / 100) + 1,
        },
      },
    }));
    return true;
  },

  claimCommsAttachment: (commId, credits, xp) =>
    set((state) => {
      if (!commId || state.gameplay.claimedComms.includes(commId)) return state;
      const addedCredits = typeof credits === 'number' && credits > 0 ? credits : 0;
      const addedXP = typeof xp === 'number' && xp > 0 ? xp : 0;
      if (addedCredits <= 0 && addedXP <= 0) return state;
      const newXP = state.gameplay.player.xp + addedXP;
      const newLevel = Math.floor(newXP / 100) + 1;
      return {
        gameplay: {
          ...state.gameplay,
          claimedComms: [...state.gameplay.claimedComms, commId],
          player: {
            ...state.gameplay.player,
            credits: state.gameplay.player.credits + addedCredits,
            xp: newXP,
            level: newLevel,
          },
        },
      };
    }),

  advanceAppRank: (appKey) =>
    set((state) => {
      const currentRanks = state.gameplay.appRanks || { explorer: 1, weaver: 1, investigator: 1, research: 1, influence: 1, clearance: 1 };
      const currentRank = currentRanks[appKey] || 1;
      if (currentRank >= 5) return state;
      const nextRank = currentRank + 1;
      const addedXP = nextRank * 50;
      const newXP = state.gameplay.player.xp + addedXP;
      const newLevel = Math.floor(newXP / 100) + 1;

      return {
        gameplay: {
          ...state.gameplay,
          appRanks: {
            ...currentRanks,
            [appKey]: nextRank,
          },
          player: {
            ...state.gameplay.player,
            xp: newXP,
            level: newLevel,
          },
        },
      };
    }),

  completeStarterLoop: (loopKey) =>
    set((state) => {
      const completed = state.gameplay.starterCompletedLoops || [];
      if (completed.includes(loopKey)) return state;
      const addedCredits = 150;
      const addedXP = 100;
      const newXP = state.gameplay.player.xp + addedXP;
      const newLevel = Math.floor(newXP / 100) + 1;

      return {
        gameplay: {
          ...state.gameplay,
          starterCompletedLoops: [...completed, loopKey],
          player: {
            ...state.gameplay.player,
            credits: state.gameplay.player.credits + addedCredits,
            xp: newXP,
            level: newLevel,
          },
        },
      };
    }),

  purgePrismCorruption: (amount) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        prismCorruptionLevel: Math.max(2.0, Number((state.gameplay.prismCorruptionLevel - amount).toFixed(1))),
      },
    })),

  verifyDGAIdentity: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        lockedApps: state.gameplay.lockedApps.filter((a: string) => a !== 'passport' && a !== 'comms'),
        player: {
          ...state.gameplay.player,
          dgaVerified: true,
          starterPhase: Math.max(1, state.gameplay.player.starterPhase),
        },
      },
    })),

  unlockApp: (appId) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        lockedApps: state.gameplay.lockedApps.filter((a: string) => a !== appId),
      },
    })),

  completeIdentityScan: (data) =>
    set((state) => {
      if (state.gameplay.player.dgaVerified) return state;
      const newLocked = state.gameplay.lockedApps.filter((a: string) => a !== 'passport' && a !== 'comms');
      return {
        gameplay: {
          ...state.gameplay,
          lockedApps: newLocked,
          onboardingPhase: Math.max(3, state.gameplay.onboardingPhase),
          identity: {
            ...state.gameplay.identity,
            ...data,
            citizenId: state.gameplay.identity.citizenId || data.citizenId || `CY-${Math.floor(1000 + Math.random() * 9000)}-CITIZEN`,
            barcode: state.gameplay.identity.barcode || data.barcode || `||| |||| || ||| ${Math.floor(100000 + Math.random() * 900000)}`,
            canonicalPersonId: state.gameplay.identity.canonicalPersonId,
          },
          player: {
            ...state.gameplay.player,
            dgaVerified: true,
            credits: state.gameplay.player.credits + 150,
            xp: state.gameplay.player.xp + 100,
            activities: state.gameplay.player.activities.map((act: any) => {
              if (act.id === 'Q_DAY1_3') return { ...act, status: 'COMPLETED' };
              if (act.id === 'Q_DAY1_4') return { ...act, status: 'IN_PROGRESS' };
              return act;
            }),
          },
        },
      };
    }),

  selectMAITone: (tone) =>
    set((state) => {
      let trustDelta = 0;
      let friendshipDelta = 0;
      let rivalryDelta = 0;
      if (tone === 'friendly') { trustDelta = 15; friendshipDelta = 20; }
      else if (tone === 'neutral') { trustDelta = 5; }
      else if (tone === 'cold') { rivalryDelta = 25; trustDelta = -10; }

      return {
        gameplay: {
          ...state.gameplay,
          maiTone: tone,
          onboardingPhase: Math.max(5, state.gameplay.onboardingPhase),
          player: {
            ...state.gameplay.player,
            xp: state.gameplay.player.xp + 100,
            npcVectors: {
              ...state.gameplay.player.npcVectors,
              jeremie: {
                ...state.gameplay.player.npcVectors.jeremie,
                trust: Math.min(100, Math.max(0, state.gameplay.player.npcVectors.jeremie.trust + trustDelta)),
                friendship: Math.min(100, Math.max(0, state.gameplay.player.npcVectors.jeremie.friendship + friendshipDelta)),
                rivalry: Math.min(100, Math.max(0, state.gameplay.player.npcVectors.jeremie.rivalry + rivalryDelta)),
              },
            },
            activities: state.gameplay.player.activities.map((act: any) => {
              if (act.id === 'Q_DAY1_5') return { ...act, status: 'COMPLETED' };
              return act;
            }),
          },
        },
      };
    }),

  completeQuest: (questId) =>
    set((state) => {
      if (state.gameplay.player.completedQuests.includes(questId)) return state;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            completedQuests: [...state.gameplay.player.completedQuests, questId],
          },
        },
      };
    }),

  incrementHackedNodes: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          hackedNodes: state.gameplay.player.hackedNodes + 1,
        },
      },
    })),

  damageAura: (amount) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          auraHealth: Math.max(0, state.gameplay.player.auraHealth - amount),
        },
      },
    })),

  healAura: (amount) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          auraHealth: Math.min(100, state.gameplay.player.auraHealth + amount),
        },
      },
    })),

  addCondition: (name) =>
    set((state) => {
      if (state.gameplay.player.conditions.includes(name)) return state;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            conditions: [...state.gameplay.player.conditions, name],
          },
        },
      };
    }),

  removeCondition: (name) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          conditions: state.gameplay.player.conditions.filter((c: string) => c !== name),
        },
      },
    })),

  clearConditions: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          conditions: [],
        },
      },
    })),

  addForgedSpell: (name) =>
    set((state) => {
      if (state.gameplay.player.forgedSpells.includes(name)) return state;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            forgedSpells: [...state.gameplay.player.forgedSpells, name],
          },
        },
      };
    }),

  decryptLineage: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          lineageDecrypted: true,
        },
      },
    })),

  addSkillXP: (skillName, amount) =>
    set((state) => {
      const current = state.gameplay.player.skills[skillName] || { level: 1, xp: 0 };
      let newXP = current.xp + amount;
      const nextLevelXP = current.level * 150;
      let newLevel = current.level;
      if (newXP >= nextLevelXP) {
        newXP -= nextLevelXP;
        newLevel += 1;
      }
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            skills: {
              ...state.gameplay.player.skills,
              [skillName]: { level: newLevel, xp: newXP },
            },
          },
        },
      };
    }),

  // GAMEPLAY-013: Career XP measures experience & professional development.
  // Promotions are never automatically granted just for accumulating XP; they require
  // profession-specific qualifications evaluated via requestCareerPromotion(track).
  addCareerXP: (track, amount) =>
    set((state) => {
      track = canonicalCareerId(track);
      if (!CAREER_REGISTRY[track] || !Number.isFinite(amount)) return {};
      const current = state.gameplay.player.careers[track] || {
        rankIndex: 0,
        xp: 0,
        title: CAREER_TRACK_SPECS[track]?.rankTitles?.[0] || track,
      };
      const newXP = Math.max(0, (current.xp || 0) + amount);
      const canonicalTitle =
        CAREER_TRACK_SPECS[track]?.rankTitles?.[current.rankIndex || 0] || current.title || track;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            careers: {
              ...state.gameplay.player.careers,
              [track]: {
                ...current,
                rankIndex: current.rankIndex || 0,
                xp: newXP,
                title: canonicalTitle,
              },
            },
          },
        },
      };
    }),

  requestCareerPromotion: (track) => {
    track = canonicalCareerId(track);
    const state = get();
    const player = state.gameplay.player;
    const evalRes = evaluateCareerPromotion(track, player);
    if (!evalRes.canPromote || evalRes.nextRankIndex === null || !evalRes.nextTitle) {
      return {
        ok: false,
        message: evalRes.reason,
      };
    }

    const current = player.careers?.[track] || { rankIndex: 0, xp: 0 };
    const newPlayerXP = player.xp + 50;
    const newLevel = Math.floor(newPlayerXP / 100) + 1;

    set((s) => ({
      gameplay: {
        ...s.gameplay,
        player: {
          ...s.gameplay.player,
          credits: s.gameplay.player.credits + 150,
          xp: newPlayerXP,
          level: newLevel,
          careers: {
            ...s.gameplay.player.careers,
            [track]: {
              ...current,
              rankIndex: evalRes.nextRankIndex!,
              xp: current.xp || 0,
              title: evalRes.nextTitle!,
            },
          },
        },
      },
    }));

    get().recordWorldEvent({
      category: 'worknet',
      title: `Career Promotion: ${evalRes.nextTitle}`,
      summary: `${evalRes.reason} Promoted to Rank ${evalRes.nextRankIndex} (${evalRes.nextTitle}) in ${track.toUpperCase()}.`,
      institution: `WORKNET // ${track.toUpperCase()}`,
    });

    return {
      ok: true,
      newRankIndex: evalRes.nextRankIndex,
      newTitle: evalRes.nextTitle,
      pathwayLabel: evalRes.qualifiedPathway?.label,
      message: `Promoted to ${evalRes.nextTitle} (Rank ${evalRes.nextRankIndex}) via ${evalRes.qualifiedPathway?.label}! (+150 ₢ Stipend, +50 XP)`,
    };
  },

  advanceStarterPhase: (targetPhase) =>
    set((state) => {
      const current = state.gameplay.player.starterPhase || 0;
      const nextPhase = targetPhase !== undefined ? targetPhase : Math.min(5, current + 1);
      if (nextPhase <= current) return state;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            starterPhase: nextPhase,
            credits: state.gameplay.player.credits + 100,
            xp: state.gameplay.player.xp + 50,
          },
        },
      };
    }),

  setHouseAffiliation: (house) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          houseAffiliation: house,
        },
      },
    })),

  updateActivityStatus: (activityId, status) =>
    set((state) => {
      const allowedStatuses = ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED'];
      if (!allowedStatuses.includes(status)) return state;

      const activities = state.gameplay.player.activities || [];
      const activity = activities.find((act: any) => act.id === activityId);
      if (!activity || activity.status === 'COMPLETED' || status === 'COMPLETED') return state;

      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            activities: activities.map((act: any) =>
              act.id === activityId ? { ...act, status } : act
            ),
          },
        },
      };
    }),

  setMonth: (monthIndex) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          currentMonthIndex: (monthIndex + 12) % 12,
        },
      },
    })),

  advanceMonth: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          currentMonthIndex: ((state.gameplay.player.currentMonthIndex || 0) + 1) % 12,
        },
      },
    })),

  claimDailyReward: () =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          credits: state.gameplay.player.credits + 200,
          xp: state.gameplay.player.xp + 100,
          dailyRewardLastClaimed: Date.now(),
        },
      },
    })),

  joinWorldEvent: (_eventId) =>
    set((state) => ({
      gameplay: {
        ...state.gameplay,
        player: {
          ...state.gameplay.player,
          credits: state.gameplay.player.credits + 300,
          xp: state.gameplay.player.xp + 150,
        },
      },
    })),

  incrementAppRank: (appName) =>
    set((state) => {
      const currentRanks = state.gameplay.player.appRanks || {
        explorer: 1,
        weaver: 1,
        investigator: 1,
        research: 1,
        influence: 1,
        clearance: 1,
      };
      const newRank = (currentRanks[appName] || 1) + 1;
      return {
        gameplay: {
          ...state.gameplay,
          player: {
            ...state.gameplay.player,
            appRanks: {
              ...currentRanks,
              [appName]: newRank,
            },
          },
        },
      };
    }),

  // ------------------------------------------------------------------
  // Window Management & OS Controls
  // ------------------------------------------------------------------
  addWindow: (app) => {
    const destination = retiredWindowDestination(app);
    if (destination) { get().openAppWorkspace(destination.appId, destination.section); return; }
    set((state) => {
    const maxZ = Math.max(100, ...state.windows.map((w) => w.zIndex || 100));
    const existing = state.windows.find((w) => w.id === app.id);
    if (existing) {
      return {
        windows: state.windows.map((w) =>
          w.id === app.id ? { ...w, size: DEFAULT_WINDOW_SIZE, zIndex: maxZ + 1, isMinimized: false } : w
        ),
        activeWindowId: app.id,
      };
    }

    const newWindow: OSWindow = {
      title: app.title,
      contentKey: app.contentKey,
      ...app,
      id: app.id || Math.random().toString(36).substr(2, 9),
      zIndex: maxZ + 1,
      isMinimized: false,
      isMaximized: app.isMaximized ?? false,
      position: app.position || spawnPosition(state.windows.length),
      windowOffset: { x: 0, y: 0 },
      size: app.size || DEFAULT_WINDOW_SIZE,
    };
    return {
      windows: [...state.windows, newWindow],
      activeWindowId: newWindow.id,
    };
    });
  },

  toggleApp: (appOrId: any) => {
    const destination = retiredWindowDestination(appOrId);
    if (destination) { get().openAppWorkspace(destination.appId, destination.section); return; }
    set((state) => {
    const appId = typeof appOrId === 'string' ? appOrId : appOrId?.id;
    if (!appId) return state;
    const appObj = typeof appOrId === 'object' ? appOrId : {};
    
    const maxZ = Math.max(100, ...state.windows.map((w) => w.zIndex || 100));
    const existing = state.windows.find((w) => w.id === appId);
    if (existing) {
      if (state.activeWindowId === appId && !existing.isMinimized) {
        return {
          windows: state.windows.map((w) =>
            w.id === appId ? { ...w, isMinimized: true } : w
          ),
          activeWindowId: state.windows.filter((w) => w.id !== appId && !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null,
        };
      }
      return {
        windows: state.windows.map((w) =>
          w.id === appId ? { ...w, zIndex: maxZ + 1, isMinimized: false } : w
        ),
        activeWindowId: appId,
      };
    }

    const appTitles: Record<string, string> = {
      dgaos: 'DGAOS Command Center',
      documentStudio: 'Document Studio (Nine Documents)',
      meridionRegistry: 'AURA Citizen Registry',
      traceForensics: 'TRACE Forensic Workstation',
      jobs: 'Career Workstation',
      board: 'Master Notice Board',
      process: 'Process Monitor',
      housing: 'HOMECRAFT // Housing',
      spellforge: 'SpellForge Matrix',
      browser: 'Net Browser',
      mail: 'AureMail Mailbox',
      comms: 'Comms Portal',
      passport: 'Citizen Hub',
      maispace: 'mai.space',
      files: 'Fylo',
      lore: 'Royal Archive & Library',
      terminal: 'System Terminal',
      settings: 'System Settings',
    };

    const newWindow: OSWindow = {
      title: appObj.title || appTitles[appId] || appId,
      contentKey: appObj.contentKey || appId,
      ...appObj,
      id: appId,
      zIndex: maxZ + 1,
      isMinimized: false,
      isMaximized: appObj.isMaximized ?? false,
      position: appObj.position || spawnPosition(state.windows.length),
      windowOffset: { x: 0, y: 0 },
      size: appObj.size || DEFAULT_WINDOW_SIZE,
    };
    return {
      windows: [...state.windows, newWindow],
      activeWindowId: newWindow.id,
    };
    });
  },

  closeWindow: (id) => set((state) => {
    const remaining = state.windows.filter((w) => w.id !== id);
    const workspaceRequests = { ...state.workspaceRequests };
    if (id === 'browser') delete workspaceRequests.browser;
    return {
      windows: remaining,
      ...(id === 'browser' ? { browserState: restartBrowserSession(state.browserState), browserUrl: BROWSER_HOME, workspaceRequests } : {}),
      activeWindowId:
        state.activeWindowId === id
          ? (remaining.slice().sort((a, b) => b.zIndex - a.zIndex)[0]?.id || null)
          : state.activeWindowId,
    };
  }),

  focusWindow: (id) => set((state) => {
    const maxZ = Math.max(100, ...state.windows.map((w) => w.zIndex || 100));
    return {
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, size: DEFAULT_WINDOW_SIZE, zIndex: maxZ + 1, isMinimized: false } : w
      ),
      activeWindowId: id,
    };
  }),

  toggleMinimize: (id) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
    ),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
  })),

  toggleMaximize: (id) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
    ),
  })),

  moveWindow: (id, position) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, windowOffset: position } : w
    ),
  })),

  clearActive: () => set({ activeWindowId: null }),

  setWallpaper: (url) => set({ wallpaper: url }),
}); }, {
  name: 'miraverse-os-progress',
  version: 1,
  storage: createJSONStorage(() => osStorage),
  // Window metadata can contain React icons; recreate windows rather than serializing them.
  partialize: ({ gameplay, wallpaper, isLoggedIn, browserState, desktopPreferences, versenetContent, versenetSites, fylo, worknetSim, library, orynvellRecords }) => ({ gameplay, wallpaper, isLoggedIn, browserState: restartBrowserSession(browserState), desktopPreferences, versenetContent, versenetSites, fylo, worknetSim, library, orynvellRecords }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<OSStoreState> | null;
    const browserState = restoreBrowserState(saved?.browserState);
    return {
      ...current,
      desktopPreferences: restoreDesktopPreferences(saved?.desktopPreferences),
      versenetContent: restoreVersenetContent(saved?.versenetContent),
      versenetSites: restoreVersenetSites(saved?.versenetSites),
      fylo: restoreFyloState(saved?.fylo),
      worknetSim: restoreWorknetSimulation(saved?.worknetSim, workTick(saved?.gameplay || current.gameplay)),
      library: restoreLibraryState(saved?.library),
      orynvellRecords: restoreOrynvellRecordsState(saved?.orynvellRecords, workTick(saved?.gameplay || current.gameplay)),
      browserState,
      browserUrl: browserState.tabs.find(tab => tab.id === browserState.activeTabId)!.url,
      gameplay: (() => {
        const merged = mergeSavedProgress(current.gameplay, saved?.gameplay);
        const restored = { ...merged, mediaStudio: restoreMediaStudio(merged.mediaStudio, merged.timeCycleCount), worldPublications: restoreWorldPublications(merged.worldPublications), entertainment: restoreEntertainmentState(merged.entertainment, merged.timeCycleCount), player: { ...restoreWorknetPlayer(merged.player, workTick(merged)), banking: restoreBanking(merged.player.banking), processMonitor: restoreProcessMonitor(merged.player.processMonitor) } };
        return isLocalWorld(globalThis.location?.hostname || '')
          ? grantLocalCredentials(restored, new Date().toISOString())
          : restored;
      })(),
      wallpaper: typeof saved?.wallpaper === 'string' ? saved.wallpaper : current.wallpaper,
      isLoggedIn: typeof saved?.isLoggedIn === 'boolean' ? saved.isLoggedIn : current.isLoggedIn,
    };
  },
}));

registerCommunicationsAuthority(() => {
  const state = useOSStore.getState();
  return { player: state.gameplay.player, identity: state.gameplay.identity, isLoggedIn: state.isLoggedIn };
});

// Automatically grant full admin credentials on localhost without requiring manual activation.
if (isLocalWorld(globalThis.location?.hostname || '')) {
  const current = useOSStore.getState();
  if (!current.gameplay.player.isAdmin || (current.gameplay.player.clearanceLevel ?? 1) < 5) {
    useOSStore.setState({ gameplay: grantLocalCredentials(current.gameplay, new Date().toISOString()) });
  }
}

// Consequences advance with the shared game clock, never with rendering or offline wall time.
let restoringPublications = false;
useOSStore.persist.onHydrate(() => { restoringPublications = true; });
useOSStore.persist.onFinishHydration(() => { restoringPublications = false; });
useOSStore.subscribe((state, previous) => {
  if (restoringPublications || !state.isLoggedIn || isWorldPaused() || worldWorkTick(state.gameplay) <= worldWorkTick(previous.gameplay)) return;
  const gameplay = advanceDynamicMedia(processPublicReactions(state.gameplay));
  if (gameplay !== state.gameplay) useOSStore.setState({ gameplay });
});
