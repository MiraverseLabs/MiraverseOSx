import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const {
  ENTERTAINMENT_DISCIPLINES,
  FAME_AXES,
  SHIPPED_AUDIO_ASSETS,
  advanceEntertainmentCycle,
  computeCommunityReception,
} = await import('../src/gameplay/EntertainmentEcosystem.ts');
const { ENTERTAINMENT_SITES, isEntertainmentUrl, entertainmentPageTitle, entertainmentUrl, parseEntertainmentUrl } = await import(
  '../src/apps/Browser/entertainment/entertainmentRouter.ts'
);
const { STARTER_SITES, browserTitle } = await import('../src/apps/Browser/browserModel.ts');
const { ENTERTAINMENT_ORGANIZATIONS } = await import('../src/db/miraverseDb.ts');

let seq = 0;
function setupStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  globalThis.window = { localStorage: globalThis.localStorage };
  return map;
}

async function createFreshStore() {
  return (await import(`../src/store/useOSStore.ts?ent_test=${seq++}`)).useOSStore;
}

test('all 25 Section XIX entertainment organizations, domains, and VerseNet titles resolve cleanly', () => {
  assert.ok(ENTERTAINMENT_ORGANIZATIONS.length >= 25);
  assert.equal(ENTERTAINMENT_SITES.length, ENTERTAINMENT_ORGANIZATIONS.length);
  assert.equal(STARTER_SITES.length, 5, 'Starter sites invariant must remain 5');
  assert.equal(ENTERTAINMENT_DISCIPLINES.length, 11);

  for (const domain of [
    'starstruck.mer',
    'secondact.mer',
    'marlierecords.mer',
    'songbird.mer',
    'limelight.mer',
    'popsticker.mer',
    'opencallcasting.mer',
    'silverleafstadium.mer',
    'lookingglass.mer',
    'wordofmouth.mer',
    'radianceawards.mer',
    'lunerum.mer',
    'performersassoc.mer',
    'mmrs.mer',
  ]) {
    const url = `https://${domain}`;
    assert.equal(isEntertainmentUrl(url), true, `${domain} should match entertainment router`);
    assert.ok(entertainmentPageTitle(url)?.length > 4);
    assert.equal(browserTitle(url), entertainmentPageTitle(url));
  }
});

test('pilot URLs round-trip their views and leave the other entertainment domains on their established routes', () => {
  for (const [domain, front] of [
    ['songbird.mer', 'listen'], ['limelight.mer', 'stories'],
    ['silverleafstadium.mer', 'box-office'], ['glasslinedesigns.mer', 'commissions'],
  ]) {
    const base = 'https://' + domain;
    const site = parseEntertainmentUrl(base).site;
    for (const [view, path] of [['home', ''], ['front', '/' + front], ['workspace', '/studio'], ['directory', '/directory'], ['about', '/about']]) {
      const params = new URLSearchParams({ q: 'a & b' });
      const url = entertainmentUrl(site, view, params);
      assert.equal(url, base + path + '?q=a+%26+b');
      const parsed = parseEntertainmentUrl(url);
      assert.equal(parsed.view, view);
      assert.equal(parsed.params.get('q'), 'a & b');
      assert.equal(browserTitle(url), entertainmentPageTitle(url));
    }
    assert.equal(parseEntertainmentUrl(base + '/discover/').view, 'front');
    assert.equal(parseEntertainmentUrl(base + '/elsewhere').view, undefined);
    assert.match(browserTitle(base + '/elsewhere'), /Page unavailable/);
  }
  for (const domain of ['popsticker.mer', 'kajistudios.mer', 'velcur.mer']) {
    assert.equal(isEntertainmentUrl(domain), true);
    assert.equal(parseEntertainmentUrl(domain), undefined);
  }
});

test('ordinary citizen can stream music, follow artists, join fan circles, purchase tickets once, and attend shows without celebrity registration', async () => {
  setupStorage();
  const store = await createFreshStore();
  store.getState().loginUser({ name: 'Ordinary Listener', credits: 600, clearance: 2 });

  const initialState = store.getState().gameplay.entertainment;
  assert.equal(initialState.playerArtistId, null);

  // Stream a playable track on Songbird
  const track = initialState.tracks[0];
  const streamRes = store.getState().streamSongbirdTrack(track.trackId);
  assert.equal(streamRes.ok, true);
  assert.ok(streamRes.audioUrl);
  assert.equal(
    store.getState().gameplay.entertainment.tracks.find((t) => t.trackId === track.trackId).streams,
    track.streams + 1,
  );

  // Follow artist & join fan community
  const followRes = store.getState().toggleFollowEntertainmentArtist('ART-VIVIENNE');
  assert.equal(followRes.ok, true);
  assert.equal(followRes.following, true);
  assert.equal(store.getState().joinEntertainmentFanCommunity('ART-VIVIENNE').ok, true);

  // Verify ART-NYLA (NYLA / Nyla Baptiste) replaced ART-LYRIC cleanly with independent status and no inherited contracts/awards
  const nyla = initialState.artists.find((a) => a.artistId === 'ART-NYLA');
  assert.ok(nyla, 'ART-NYLA must be registered in active entertainment artists');
  assert.equal(nyla.characterId, 'char-nyla-baptiste');
  assert.equal(nyla.stageName, 'NYLA');
  assert.deepEqual(nyla.genres, ['Alternative R&B', 'neo-soul', 'electronic pop']);
  assert.equal(nyla.managerOrgId, '');
  assert.equal(nyla.labelOrgId, '');
  assert.equal(initialState.artists.some((a) => a.artistId === 'ART-LYRIC' || a.stageName === 'Lyric Enya'), false);
  assert.equal(initialState.contracts.some((c) => c.artistId === 'ART-NYLA' || c.artistId === 'ART-LYRIC'), false);

  // Buy 2 tickets to NYLA at The Looking Glass (22 credits each = 44 credits)
  const creditsBefore = store.getState().gameplay.player.credits;
  const tktRes = store.getState().purchaseEntertainmentTicket('CON-SEED-01', 2);
  assert.equal(tktRes.ok, true);
  assert.equal(store.getState().gameplay.player.credits, creditsBefore - 44);

  // Attend show once — second attendance attempt is rejected cleanly
  const attendRes = store.getState().attendPurchasedPerformance(tktRes.ticketId);
  assert.equal(attendRes.ok, true);
  assert.equal(store.getState().attendPurchasedPerformance(tktRes.ticketId).ok, false);
});

test('full player entertainment career lifecycle: emerging profile, auditions, contract negotiation & agency switching, production, release, radio, venue booking, controversy PR, awards, royalties, and save persistence', async () => {
  const storageMap = setupStorage();
  const store = await createFreshStore();
  store.getState().loginUser({ name: 'Aria Solis', credits: 2500, clearance: 3 });
  store.setState((s) => ({
    gameplay: {
      ...s.gameplay,
      player: { ...s.gameplay.player, stamina: 100, credits: 2500 },
    },
  }));

  // 1. Register multi-career performer persona — starts Unlisted (fame emerges from activity, not occupation selection)
  const reg = store.getState().registerOrUpdateArtistProfile({
    stageName: 'Aria Solis',
    disciplines: ['music', 'acting', 'dance'],
    genres: ['Harbor Folk', 'Glassline Synth'],
    privacyBoundary: 'guarded',
  });
  assert.equal(reg.ok, true);
  assert.equal(reg.artist.tier, 'Unlisted');
  assert.equal(reg.artist.recognition, 2);

  // 2. Agency-gated audition ('AUD-SEED-04' Willow Whisper) rejects unrepresented artist, while Open Call ('AUD-SEED-01') succeeds
  assert.equal(store.getState().submitEntertainmentAudition('AUD-SEED-04').ok, false);
  const openAud = store.getState().submitEntertainmentAudition('AUD-SEED-01');
  assert.equal(openAud.ok, true);

  // 3. Excessive royalty split demand fails before reputation/guild leverage; joining Performers Association & negotiating realistic split succeeds
  const greedyDeal = store.getState().signOrNegotiateEntertainmentContract({
    orgId: 'ORG_MARLIE_RECORDS',
    contractType: 'label',
    royaltySplitArtist: 0.94,
  });
  assert.equal(greedyDeal.ok, false);

  assert.equal(
    store.getState().signOrNegotiateEntertainmentContract({
      orgId: 'ORG_PERFORMERS_ASSOC',
      contractType: 'guild',
    }).ok,
    true,
  );
  assert.equal(
    store.getState().signOrNegotiateEntertainmentContract({
      orgId: 'ORG_STARSTRUCK',
      contractType: 'management',
      switchAgency: false,
    }).ok,
    true,
  );
  // Switching from Starstruck to Second Act replaces previous management contract cleanly
  const switched = store.getState().signOrNegotiateEntertainmentContract({
    orgId: 'ORG_SECOND_ACT',
    contractType: 'management',
    switchAgency: true,
  });
  assert.equal(switched.ok, true);
  const activeMgmt = store
    .getState()
    .gameplay.entertainment.contracts.filter(
      (c) => c.artistId === 'ART-PLAYER' && c.contractType === 'management' && c.status === 'active',
    );
  assert.equal(activeMgmt.length, 1);
  assert.equal(activeMgmt[0].orgId, 'ORG_SECOND_ACT');

  // 4. Studio production with NPC collaboration (Aelita), session completion, Songbird release & Pop Sticker Radio airplay
  const aelitaFriendBefore = store.getState().gameplay.player.npcVectors.aelita.friendship;
  const prjRes = store.getState().createEntertainmentProject({
    title: 'Silverleaf Rain',
    kind: 'single',
    discipline: 'music',
    collaboratorArtistId: 'ART-AELITA',
    budgetCredits: 120,
    audioUrl: SHIPPED_AUDIO_ASSETS[0].audioUrl,
  });
  assert.equal(prjRes.ok, true);
  assert.ok(store.getState().gameplay.player.npcVectors.aelita.friendship > aelitaFriendBefore);

  const advRes = store.getState().advanceEntertainmentProject(prjRes.project.projectId);
  assert.equal(advRes.ok, true);
  assert.equal(advRes.completed, true);

  const relRes = store.getState().publishEntertainmentRelease({
    projectId: prjRes.project.projectId,
    title: 'Silverleaf Rain',
    audioUrl: SHIPPED_AUDIO_ASSETS[0].audioUrl,
  });
  assert.equal(relRes.ok, true);

  const radioRes = store.getState().submitTrackToPopStickerRadio(relRes.trackId);
  assert.equal(radioRes.ok, true);
  assert.equal(radioRes.accepted, true);
  assert.ok(radioRes.sticker.includes('Pop Sticker'));

  // 5. Venue tier enforcement (Silverleaf Stadium requires 55 recognition) & double-booking prevention at The Looking Glass
  assert.equal(
    store.getState().bookEntertainmentVenue({
      venueOrgId: 'ORG_SILVERLEAF_STADIUM',
      ticketPrice: 80,
    }).ok,
    false,
  );
  const book1 = store.getState().bookEntertainmentVenue({
    venueOrgId: 'ORG_LOOKING_GLASS',
    scheduledInCycles: 2,
    slot: 'evening',
    ticketPrice: 24,
  });
  assert.equal(book1.ok, true);
  const bookConflict = store.getState().bookEntertainmentVenue({
    venueOrgId: 'ORG_LOOKING_GLASS',
    scheduledInCycles: 2,
    slot: 'evening',
    ticketPrice: 24,
  });
  assert.equal(bookConflict.ok, false);

  const perf = store.getState().performScheduledConcertNow(book1.concertId);
  assert.equal(perf.ok, true);
  assert.ok(perf.payout > 0);

  // 6. Press interview, controversy PR response, brand sponsorship & Radiance Awards FYC submission
  assert.equal(
    store.getState().acceptEntertainmentAppearance({ orgId: 'ORG_LIMELIGHT', kind: 'interview' }).ok,
    true,
  );
  const cnv = store.getState().triggerCelebrityControversyTestOrEvent('Dispute over exclusive streaming window');
  assert.equal(cnv.ok, true);
  assert.equal(
    store.getState().respondToCelebrityControversy(cnv.controversyId, 'accountable_statement').ok,
    true,
  );
  assert.equal(store.getState().acceptBrandSponsorship('ORG_AMRIELLE', 'Aria × Amrielle Mist').ok, true);
  assert.equal(
    store.getState().submitRadianceAwardCampaign('Recorded Music of the Year', 'Silverleaf Rain').ok,
    true,
  );

  // 7. Advance multiple cycles to accrue background Songbird/Pop Sticker royalties and resolve Radiance Awards
  const advanced = advanceEntertainmentCycle(store.getState().gameplay.entertainment, 36);
  store.setState((s) => ({
    gameplay: { ...s.gameplay, timeCycleCount: 36, entertainment: advanced },
  }));
  const playerAfterCycles = store.getState().gameplay.entertainment.artists.find((a) => a.artistId === 'ART-PLAYER');
  for (const axis of FAME_AXES) {
    assert.ok(playerAfterCycles[axis] >= 0 && playerAfterCycles[axis] <= 100);
  }
  const reception = computeCommunityReception(playerAfterCycles);
  assert.ok(reception.criticsAndPeers > 0 && reception.localScene > 0);

  const creditsBeforeRoyalties = store.getState().gameplay.player.credits;
  const claim = store.getState().claimEntertainmentRoyalties();
  assert.equal(claim.ok, true);
  assert.ok(claim.claimedCredits > 0);
  assert.equal(store.getState().gameplay.player.credits, creditsBeforeRoyalties + claim.claimedCredits);
  // Second immediate claim cannot double-pay
  assert.equal(store.getState().claimEntertainmentRoyalties().ok, false);

  // 8. Verify persistence & hydration across store reload
  assert.ok(storageMap.get('miraverse-os-progress'));
  const reloadedStore = await createFreshStore();
  const hydratedEnt = reloadedStore.getState().gameplay.entertainment;
  assert.equal(hydratedEnt.playerArtistId, 'ART-PLAYER');
  assert.ok(hydratedEnt.tracks.some((t) => t.title === 'Silverleaf Rain'));
});

test('livingWorldLink synchronizes remote autonomous entertainment snapshot without duplicating player records', async () => {
  setupStorage();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/entertainment?runId=run-sync-1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          artists: [
            {
              artistId: 'ART-REMOTE-NPC',
              characterId: 'CHAR-REMOTE-1',
              stageName: 'Kaelen Tide',
              bio: 'Autonomous Living World saxophonist discovered in Marlowe.',
              origin: 'npc',
              disciplines: ['music'],
              genres: ['Harbor Jazz'],
              careerStatus: 'active',
              privacyBoundary: 'open',
              guildMember: true,
              managerOrgId: 'ORG_SECOND_ACT',
              labelOrgId: 'ORG_MARLIE_RECORDS',
              publisherOrgId: '',
              prOrgId: '',
              distributorOrgId: 'ORG_LUNERUM_DIST',
              recognition: 39,
              favorability: 74,
              industryReputation: 58,
              fanLoyalty: 52,
              artisticCredibility: 77,
              commercialInfluence: 31,
              culturalInfluence: 44,
              mediaVisibility: 35,
              fanCount: 2800,
              monthlyListeners: 9400,
              totalRoyaltiesEarned: 640,
              unclaimedPlayerRoyalties: 0,
              portfolioArtifactIds: [],
              collaboratorIds: [],
              rivalryIds: [],
              lastActiveCycle: 29,
            },
          ],
          tracks: [
            {
              trackId: 'TRK-REMOTE-1',
              title: 'Marlowe Brass Dusk',
              artistId: 'ART-REMOTE-NPC',
              stageName: 'Kaelen Tide',
              kind: 'single',
              genre: 'Harbor Jazz',
              durationSeconds: 190,
              audioUrl: '/sounds/mixkit-water-sci-fi-bleep-902.wav',
              producerOrgId: 'ORG_KAJI_PUBLISHING',
              publisherOrgId: 'ORG_KAJI_PUBLISHING',
              collaboratorArtistIds: [],
              mmrsRegistered: true,
              masterOwnedByArtist: true,
              quality: 83,
              streams: 4200,
              radioSpins: 28,
              stickerEdition: '',
              createdCycle: 29,
            },
          ],
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  try {
    const store = await createFreshStore();
    store.setState((s) => ({
      isLoggedIn: true,
      gameplay: {
        ...s.gameplay,
        livingWorldLink: {
          runId: 'run-sync-1',
          characterId: 'CHAR-PLAYER-1',
          canonicalPersonId: null,
          displayName: 'Synced Citizen',
          creditMirrorRevision: 1,
        },
      },
    }));

    const sync1 = await store.getState().syncEntertainmentFromLivingWorld();
    const sync2 = await store.getState().syncEntertainmentFromLivingWorld();
    assert.equal(sync1.ok, true);
    assert.equal(sync2.ok, true);

    const ent = store.getState().gameplay.entertainment;
    const remoteMatches = ent.artists.filter((a) => a.artistId === 'ART-REMOTE-NPC');
    assert.equal(remoteMatches.length, 1, 'Idempotent merge must never duplicate synced artists');
    assert.equal(remoteMatches[0].tier, 'Established');
    assert.ok(ent.tracks.some((t) => t.trackId === 'TRK-REMOTE-1'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('all shipped audio stems, seed tracks, and casting auditions resolve to real album cover & poster files', async () => {
  setupStorage();
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.resolve(testsDir, '..', 'public');

  for (const stem of SHIPPED_AUDIO_ASSETS) {
    assert.ok(stem.coverArtUrl, `Missing coverArtUrl on ${stem.id}`);
    const coverPath = path.join(publicDir, stem.coverArtUrl.replace(/^\//, ''));
    assert.equal(fs.existsSync(coverPath), true, `Missing album cover file: ${coverPath}`);
  }

  const store = await createFreshStore();
  store.getState().loginUser({ name: 'Visual Verifier', credits: 400, clearance: 2 });
  const ent = store.getState().gameplay.entertainment;

  for (const trk of ent.tracks) {
    assert.ok(trk.coverArtUrl, `Missing coverArtUrl on track ${trk.trackId}`);
    assert.equal(fs.existsSync(path.join(publicDir, trk.coverArtUrl.replace(/^\//, ''))), true);
  }
  for (const aud of ent.auditions) {
    assert.ok(aud.posterUrl, `Missing posterUrl on audition ${aud.auditionId}`);
    assert.equal(fs.existsSync(path.join(publicDir, aud.posterUrl.replace(/^\//, ''))), true);
  }
});
