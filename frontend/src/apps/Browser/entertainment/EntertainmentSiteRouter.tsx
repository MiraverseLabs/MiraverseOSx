import React, { useId, useMemo, useRef, useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Coins,
  Globe,
  Heart,
  Mic2,
  Music,
  Newspaper,
  Radio,
  Shield,
  Sparkles,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import { useOSStore } from '../../../store/useOSStore';
import {
  ENTERTAINMENT_DISCIPLINES,
  FAME_AXES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  computeCommunityReception,
  getEntertainmentOrganization,
  restoreEntertainmentState,
  type EntertainmentDisciplineId,
} from '../../../gameplay/EntertainmentEcosystem';
import { SongbirdAudioPlayer } from '../../../components/media/SongbirdAudioPlayer';
import { ENTERTAINMENT_SITES, matchEntertainmentSite } from './entertainmentRouter';
import './entertainment-sites.css';

interface EntertainmentSiteRouterProps {
  url: string;
  navigateTab: (url: string) => void;
}

export default function EntertainmentSiteRouter({ url, navigateTab }: EntertainmentSiteRouterProps) {
  const site = useMemo(() => matchEntertainmentSite(url), [url]);
  const gameplay = useOSStore((s) => s.gameplay);
  const cycle = gameplay.timeCycleCount ?? 28;
  const ent = useMemo(() => restoreEntertainmentState(gameplay.entertainment, cycle), [gameplay.entertainment, cycle]);
  const org = useMemo(() => (site ? getEntertainmentOrganization(site.orgId) : undefined), [site]);
  const playerArtist = useMemo(
    () => (ent.playerArtistId ? ent.artists.find((a) => a.artistId === ent.playerArtistId) : undefined),
    [ent],
  );

  const [activeTab, setActiveTab] = useState<'front' | 'workspace' | 'directory' | 'about'>('front');
  const [feedback, setFeedback] = useState<string>('');
  const [activeTrackId, setActiveTrackId] = useState<string>(ent.tracks[0]?.trackId || '');

  // Controlled form inputs with deferred validation
  const [stageNameInput, setStageNameInput] = useState(playerArtist?.stageName || gameplay.player?.name || '');
  const [stageNameTouched, setStageNameTouched] = useState(false);
  const [trackTitleInput, setTrackTitleInput] = useState('');
  const [trackTitleTouched, setTrackTitleTouched] = useState(false);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>(SHIPPED_AUDIO_ASSETS[0].audioUrl);
  const [selectedGenre, setSelectedGenre] = useState<string>('Dream Pop');
  const [selectedDisc, setSelectedDisc] = useState<EntertainmentDisciplineId>('music');
  const [requestedSplit, setRequestedSplit] = useState<number>(80);
  const [switchAgencyFlag, setSwitchAgencyFlag] = useState<boolean>(true);
  const [ticketPriceInput, setTicketPriceInput] = useState<number>(24);
  const [bookingSlot, setBookingSlot] = useState<'afternoon' | 'evening' | 'late'>('evening');
  const [bookingCyclesAhead, setBookingCyclesAhead] = useState<number>(1);
  const [ticketQtyMap, setTicketQtyMap] = useState<Record<string, number>>({});
  const [fycCategory, setFycCategory] = useState<string>('Recorded Music of the Year');
  const [fycWork, setFycWork] = useState<string>('');

  // Native <dialog> modal for contract negotiation review
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [pendingContractType, setPendingContractType] = useState<
    'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild'
  >('management');

  const captionChartId = useId();
  const captionScheduleId = useId();
  const captionAuditionId = useId();
  const stageNameErrId = useId();
  const trackErrId = useId();

  if (!site || !org) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-semibold">Entertainment portal unavailable.</p>
      </div>
    );
  }

  const activeTrack = ent.tracks.find((t) => t.trackId === activeTrackId) || ent.tracks[0];
  const stageNameInvalid = stageNameTouched && stageNameInput.trim().length < 2;
  const trackTitleInvalid = trackTitleTouched && trackTitleInput.trim().length < 2;

  const topTracks = [...ent.tracks].sort((a, b) => b.streams + b.radioSpins * 10 - (a.streams + a.radioSpins * 10));
  const rankedArtists = [...ent.artists].sort(
    (a, b) =>
      b.recognition * 0.4 +
      b.artisticCredibility * 0.3 +
      b.commercialInfluence * 0.3 -
      (a.recognition * 0.4 + a.artisticCredibility * 0.3 + a.commercialInfluence * 0.3),
  );

  const defaultContractTypeForOrg = (): 'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild' => {
    if (site.orgId === 'ORG_MARLIE_RECORDS') return 'label';
    if (site.orgId === 'ORG_KAJI_PUBLISHING') return 'publishing';
    if (site.orgId === 'ORG_WORD_OF_MOUTH') return 'publicity';
    if (site.orgId === 'ORG_LUNERUM_DIST') return 'distribution';
    if (site.orgId === 'ORG_PERFORMERS_ASSOC') return 'guild';
    return 'management';
  };

  const openContractModal = (cType: 'management' | 'label' | 'publishing' | 'publicity' | 'distribution' | 'guild') => {
    setPendingContractType(cType);
    setRequestedSplit(Math.round(((org.royaltySplitArtist ?? 0.82) as number) * 100));
    dialogRef.current?.showModal();
  };

  const ornamentPath =
    site.archetype === 'limelight'
      ? '/media/ornaments/editorial-divider.svg'
      : site.archetype === 'awards'
        ? '/media/ornaments/celestial-star.svg'
        : site.archetype === 'fashion_beauty'
          ? '/media/ornaments/floral-crest.svg'
          : '/media/ornaments/ornate-plaque.svg';

  const heroBanner =
    site.archetype === 'venue' || site.archetype === 'awards'
      ? '/images/wallpapers/aureline-glassline-twilight.png'
      : site.archetype === 'songbird' || site.archetype === 'popsticker'
        ? '/images/wallpapers/aureline-city-beneath-the-heavens.png'
        : '/images/wallpapers/aureline-across-angel-bay.png';

  const tabLabels: Record<typeof activeTab, string> = {
    front:
      site.archetype === 'songbird'
        ? 'Listen & Top Charts'
        : site.archetype === 'limelight'
          ? 'Cover Stories & Rankings'
          : site.archetype === 'popsticker'
            ? 'Live Booth & Stickers'
            : site.archetype === 'venue'
              ? 'Box Office & Calendar'
              : site.archetype === 'casting'
                ? 'Open Call Breakdowns'
                : site.archetype === 'awards'
                  ? 'Official Ballot & Honors'
                  : 'Featured Roster & Services',
    workspace:
      site.archetype === 'songbird'
        ? 'Artist Upload & Royalties'
        : site.archetype === 'limelight'
          ? 'Press Desk & Interviews'
          : site.archetype === 'venue'
            ? 'Book This Venue'
            : site.archetype === 'pr_guild_rights'
              ? 'Client & Rights Console'
              : 'Talent & Creator Desk',
    directory: 'Meridion Industry Directory (25)',
    about: 'Departments & Governance',
  };

  return (
    <div
      className="ent-site-shell"
      data-archetype={site.archetype}
      style={
        {
          '--ent-accent': site.accentColor,
          '--ent-secondary': site.secondaryColor,
          '--ent-hero-bg': site.bgHero,
        } as React.CSSProperties
      }
    >
      {/* Branded Institutional Masthead */}
      <header className="ent-hero">
        <img src={heroBanner} alt="" aria-hidden="true" className="ent-hero-banner-media" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest opacity-90">
              <img src={ornamentPath} alt="" aria-hidden="true" className="ent-ornament-divider" />
              <span>{site.sector}</span>
              <span>·</span>
              <span>{site.realm}</span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-extrabold tracking-tight"
              style={site.archetype === 'limelight' ? { fontFamily: 'Limelight, Georgia, serif' } : undefined}
            >
              {site.name}
            </h1>
            <p className="text-sm opacity-95 font-medium">“{site.tagline}”</p>
            <p className="text-xs opacity-80">{site.seat}</p>
          </div>

          <div className="flex flex-col items-end gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-black/35 border border-white/20 font-mono">
              Wallet: <strong>{(gameplay.player?.credits ?? 0).toLocaleString()} ₢</strong> · Cycle {cycle}
            </div>
            {playerArtist ? (
              <div className="px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px]">
                Signed in as <strong>{playerArtist.stageName}</strong> ({playerArtist.tier})
              </div>
            ) : (
              <span className="text-[11px] opacity-80">Browsing as Citizen Listener / Audience Member</span>
            )}
          </div>
        </div>
      </header>

      {/* Accessible Single-Row Horizontal Tabbar with Shape Indicator */}
      <div role="tablist" aria-label={`${site.name} workspace views`} className="ent-tablist">
        {(['front', 'workspace', 'directory', 'about'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={activeTab === tabKey}
            onClick={() => setActiveTab(tabKey)}
            className="ent-tab"
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      {/* Persistent Songbird / Pop Sticker Playable Audio Bar */}
      {(site.archetype === 'songbird' || site.archetype === 'popsticker') && activeTrack && (
        <div className="px-6 pt-3">
          <SongbirdAudioPlayer
            audioUrl={activeTrack.audioUrl}
            title={`${activeTrack.title} (${activeTrack.genre})`}
            artistName={`${activeTrack.stageName} · ${activeTrack.streams.toLocaleString()} streams · ${activeTrack.radioSpins} spins`}
            onStreamCounted={() => {
              const res = useOSStore.getState().streamSongbirdTrack(activeTrack.trackId);
              setFeedback(res.message);
            }}
          />
        </div>
      )}

      <div className="ent-container-body">
        {feedback && (
          <div role="status" className="ent-card flex items-center justify-between gap-3 py-2.5 border-l-4" style={{ borderLeftColor: site.accentColor }}>
            <span className="text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{feedback}</span>
            </span>
            <button type="button" onClick={() => setFeedback('')} className="text-xs font-bold px-2 cursor-pointer">
              ×
            </button>
          </div>
        )}

        {/* KPI Telemetry Row Derived Live from Simulation & Store */}
        <div className="ent-kpi-row">
          <div className="ent-card">
            <div className="text-[11px] uppercase font-mono ent-muted">Active Artists</div>
            <div className="text-xl font-extrabold mt-0.5">{ent.artists.length}</div>
            <div className="text-[11px] ent-muted">{ent.contracts.filter((c) => c.status === 'active').length} active contracts</div>
          </div>
          <div className="ent-card">
            <div className="text-[11px] uppercase font-mono ent-muted">Catalog & Streams</div>
            <div className="text-xl font-extrabold mt-0.5">
              {ent.tracks.reduce((acc, t) => acc + t.streams, 0).toLocaleString()}
            </div>
            <div className="text-[11px] ent-muted">{ent.tracks.length} playable master tracks</div>
          </div>
          <div className="ent-card">
            <div className="text-[11px] uppercase font-mono ent-muted">Live Box Office</div>
            <div className="text-xl font-extrabold mt-0.5">
              {ent.concerts.filter((c) => c.status === 'scheduled').length} Upcoming
            </div>
            <div className="text-[11px] ent-muted">{ent.tickets.length} citizen ticket receipts</div>
          </div>
          <div className="ent-card">
            <div className="text-[11px] uppercase font-mono ent-muted">Open Auditions</div>
            <div className="text-xl font-extrabold mt-0.5">
              {ent.auditions.filter((a) => a.status === 'open').length} Calls
            </div>
            <div className="text-[11px] ent-muted">Cycle {cycle} casting board</div>
          </div>
        </div>

        {/* ================================================================
            TAB 1: ARCHETYPE-SPECIFIC FRONT PORTAL
            ================================================================ */}
        {activeTab === 'front' && (
          <div className="ent-grid-main">
            {/* SONGBIRD STREAMING PLATFORM */}
            {site.archetype === 'songbird' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <Music size={17} /> Songbird Pan-Meridion Top Streaming Chart
                    </h2>
                    <span className="text-xs ent-muted">Click Play to stream real audio</span>
                  </div>
                  <div className="ent-table-region" tabIndex={0} role="region" aria-labelledby={captionChartId}>
                    <table className="ent-table">
                      <caption id={captionChartId}>Top Recorded Tracks Across All Eight Realms</caption>
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Track & Artist</th>
                          <th scope="col">Genre</th>
                          <th scope="col">Streams</th>
                          <th scope="col">Listen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTracks.map((trk, idx) => (
                          <tr key={trk.trackId}>
                            <td data-label="Rank" className="font-mono font-bold">{idx + 1}</td>
                            <td data-label="Track">
                              <div className="font-bold">{trk.title}</div>
                              <div className="text-[11px] ent-muted">{trk.stageName}</div>
                            </td>
                            <td data-label="Genre">{trk.genre}</td>
                            <td data-label="Streams" className="font-mono">{trk.streams.toLocaleString()}</td>
                            <td data-label="Listen">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTrackId(trk.trackId);
                                  setFeedback(useOSStore.getState().streamSongbirdTrack(trk.trackId).message);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                              >
                                ▶ Stream
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Users size={17} /> Verified Artists & Listener Circles
                  </h2>
                  <div className="space-y-2.5">
                    {rankedArtists.map((art) => {
                      const following = ent.followedArtistIds.includes(art.artistId);
                      const club = ent.fanCommunities.find((fc) => fc.artistId === art.artistId);
                      const inClub = Boolean(club?.memberIds.includes('PLAYER'));
                      return (
                        <article key={art.artistId} className="p-3 rounded-lg border border-white/10 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <strong>{art.stageName}</strong>{' '}
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                {art.tier}
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setFeedback(useOSStore.getState().toggleFollowEntertainmentArtist(art.artistId).message)}
                                className="px-2 py-1 rounded border border-emerald-400/50 text-[11px] font-bold cursor-pointer"
                              >
                                <Heart size={11} className="inline mr-1" />
                                {following ? 'Following' : 'Follow'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setFeedback(useOSStore.getState().joinEntertainmentFanCommunity(art.artistId).message)}
                                className="px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                {inClub ? 'In Fan Circle' : 'Join Circle'}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs ent-muted">{art.bio}</p>
                          <div className="text-[11px] font-mono ent-muted">
                            {art.monthlyListeners.toLocaleString()} monthly listeners · {art.fanCount.toLocaleString()} fans
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {/* LIMELIGHT ENTERTAINMENT MAGAZINE */}
            {site.archetype === 'limelight' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: 'var(--ent-card-border)' }}>
                    <h2 className="text-lg font-bold" style={{ fontFamily: 'Limelight, Georgia, serif' }}>
                      <Newspaper size={17} className="inline mr-1.5" /> The Greenroom & Cover Dispatch
                    </h2>
                    <span className="text-xs font-mono ent-muted">29 Quay Arcade · Cycle {cycle} Edition</span>
                  </div>
                  <div className="space-y-3">
                    {ent.mediaItems.slice(0, 8).map((item) => (
                      <article key={item.mediaId} className="p-3.5 rounded-lg border" style={{ borderColor: 'var(--ent-card-border)' }}>
                        <div className="flex items-center justify-between text-[11px] font-mono uppercase ent-muted">
                          <span>{item.outletName} · {item.kind}</span>
                          <span>Cycle {item.cycle} · {item.sentiment}</span>
                        </div>
                        <h3 className="text-sm font-bold mt-1">{item.headline}</h3>
                        <p className="text-xs ent-muted mt-1">{item.summary}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Star size={17} /> Limelight 8-Axis Fame Power Index
                  </h2>
                  <p className="text-xs ent-muted">
                    Celebrity standing in Meridion is never a single popularity number—Limelight tracks public recognition alongside artistic credibility, favorability, and local-scene trust.
                  </p>
                  <div className="ent-table-region" tabIndex={0} role="region" aria-labelledby={captionChartId}>
                    <table className="ent-table">
                      <caption id={captionChartId}>Fame Dimensions by Public Figure</caption>
                      <thead>
                        <tr>
                          <th scope="col">Performer</th>
                          <th scope="col">Tier</th>
                          <th scope="col">Rec</th>
                          <th scope="col">Cred</th>
                          <th scope="col">Fav</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedArtists.map((a) => (
                          <tr key={a.artistId}>
                            <td data-label="Performer" className="font-bold">{a.stageName}</td>
                            <td data-label="Tier">{a.tier}</td>
                            <td data-label="Recognition" className="font-mono">{a.recognition}</td>
                            <td data-label="Credibility" className="font-mono">{a.artisticCredibility}</td>
                            <td data-label="Favorability" className="font-mono">{a.favorability}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* POP STICKER RADIO */}
            {site.archetype === 'popsticker' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Radio size={17} /> Booth 88 Daily Airplay Countdown
                  </h2>
                  <div className="ent-table-region" tabIndex={0} role="region" aria-labelledby={captionChartId}>
                    <table className="ent-table">
                      <caption id={captionChartId}>Pop Sticker Radio Rotation & Sticker Editions</caption>
                      <thead>
                        <tr>
                          <th scope="col">Spins</th>
                          <th scope="col">Track</th>
                          <th scope="col">Collector Sticker</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...ent.tracks].sort((a, b) => b.radioSpins - a.radioSpins).map((trk) => (
                          <tr key={trk.trackId}>
                            <td data-label="Spins" className="font-mono font-bold">{trk.radioSpins}</td>
                            <td data-label="Track">
                              <strong>{trk.title}</strong>
                              <div className="text-[11px] ent-muted">{trk.stageName}</div>
                            </td>
                            <td data-label="Sticker" className="text-xs">{trk.stickerEdition || 'Standard Rotation'}</td>
                            <td data-label="Action">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveTrackId(trk.trackId)}
                                  className="px-2 py-1 rounded bg-pink-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  Tune In
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFeedback(useOSStore.getState().submitTrackToPopStickerRadio(trk.trackId).message)}
                                  className="px-2 py-1 rounded border border-sky-400 text-sky-300 text-xs font-bold cursor-pointer"
                                >
                                  Pitch Boost
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Sparkles size={17} /> Your Collected Artist Stickers ({ent.collectedStickers.length})
                  </h2>
                  <p className="text-xs ent-muted">
                    Submit tracks for Booth 88 airplay consideration or stream rotation premieres to collect limited release-week illustrated stickers.
                  </p>
                  <div className="space-y-2">
                    {ent.collectedStickers.map((st) => (
                      <div key={st} className="p-3 rounded-lg border border-pink-400/40 bg-pink-500/10 text-xs font-bold flex items-center gap-2">
                        <img src="/icons/Icon set 1/PNG/64 pixels/Star.png" alt="" aria-hidden="true" className="h-5 w-5" />
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* VENUES & LIVE PROMOTION (Looking Glass, Marigold Theatre, Silverleaf Stadium, VelCur) */}
            {site.archetype === 'venue' && (
              <>
                <section className="ent-card ent-col-8 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Ticket size={17} /> Live Box Office & Performance Calendar
                  </h2>
                  <div className="ent-table-region" tabIndex={0} role="region" aria-labelledby={captionScheduleId}>
                    <table className="ent-table">
                      <caption id={captionScheduleId}>Scheduled & Settled Live Shows</caption>
                      <thead>
                        <tr>
                          <th scope="col">Event & Headliner</th>
                          <th scope="col">Venue & Slot</th>
                          <th scope="col">Price</th>
                          <th scope="col">Sold / Cap</th>
                          <th scope="col">Box Office</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ent.concerts.map((con) => {
                          const qty = ticketQtyMap[con.concertId] || 1;
                          const isPlayerShow = playerArtist && con.artistId === playerArtist.artistId && con.status === 'scheduled';
                          return (
                            <tr key={con.concertId}>
                              <td data-label="Event">
                                <div className="font-bold">{con.title}</div>
                                <div className="text-[11px] ent-muted">{con.audienceReaction}</div>
                              </td>
                              <td data-label="Venue">
                                <div>{con.venue}</div>
                                <div className="text-[11px] font-mono ent-muted">{con.dateLabel} · {con.status}</div>
                              </td>
                              <td data-label="Price" className="font-mono">{con.ticketPrice} ₢</td>
                              <td data-label="Attendance" className="font-mono">
                                {con.ticketsSold.toLocaleString()} / {con.capacity.toLocaleString()}
                              </td>
                              <td data-label="Tickets">
                                {con.status === 'scheduled' ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <select
                                      aria-label={`Ticket quantity for ${con.title}`}
                                      value={qty}
                                      onChange={(e) => setTicketQtyMap((m) => ({ ...m, [con.concertId]: Number(e.target.value) }))}
                                      className="ent-input py-1 px-1.5 text-xs"
                                    >
                                      {[1, 2, 3, 4].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => setFeedback(useOSStore.getState().purchaseEntertainmentTicket(con.concertId, qty).message)}
                                      className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                                    >
                                      Buy ({con.ticketPrice * qty} ₢)
                                    </button>
                                    {isPlayerShow && (
                                      <button
                                        type="button"
                                        onClick={() => setFeedback(useOSStore.getState().performScheduledConcertNow(con.concertId).message)}
                                        className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                                      >
                                        Perform Now
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-mono ent-muted">Settled ({con.grossRevenue.toLocaleString()} ₢)</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ent-card ent-col-4 space-y-3">
                  <h2 className="text-base font-bold">Your Citizen Ticket Wallet ({ent.tickets.length})</h2>
                  {ent.tickets.length === 0 ? (
                    <p className="text-xs ent-muted">
                      Purchase tickets to any club showcase, repertory play, or stadium concert—ordinary citizens can attend without registering as performers.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ent.tickets.map((tkt) => (
                        <div key={tkt.ticketId} className="p-3 rounded-lg border border-white/15 space-y-1 text-xs">
                          <div className="font-bold">{tkt.concertTitle}</div>
                          <div className="ent-muted">{tkt.venue} · {tkt.quantity}x ({tkt.pricePaid} ₢)</div>
                          {!tkt.attended ? (
                            <button
                              type="button"
                              onClick={() => setFeedback(useOSStore.getState().attendPurchasedPerformance(tkt.ticketId).message)}
                              className="mt-1 px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold cursor-pointer"
                            >
                              Attend Show (+Aura & MAI.SPACE Memory)
                            </button>
                          ) : (
                            <span className="inline-block text-emerald-400 font-mono text-[11px]">✓ Attended</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* CASTING & SCREEN/DANCE STUDIOS */}
            {(site.archetype === 'casting' || site.archetype === 'screen_dance') && (
              <>
                <section className="ent-card ent-col-8 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Mic2 size={17} /> Active Audition Breakdowns & Casting Calls
                  </h2>
                  <div className="ent-table-region" tabIndex={0} role="region" aria-labelledby={captionAuditionId}>
                    <table className="ent-table">
                      <caption id={captionAuditionId}>Open &Represented Production Breakdowns</caption>
                      <thead>
                        <tr>
                          <th scope="col">Role / Production</th>
                          <th scope="col">Discipline</th>
                          <th scope="col">Access</th>
                          <th scope="col">Stipend</th>
                          <th scope="col">Audition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ent.auditions.map((aud) => (
                          <tr key={aud.auditionId}>
                            <td data-label="Role">
                              <strong>{aud.title}</strong>
                              <div className="text-[11px] ent-muted">
                                Min Credibility {aud.minCredibility} · Closes Cycle {aud.deadlineCycle}
                              </div>
                            </td>
                            <td data-label="Discipline" className="capitalize">{aud.discipline}</td>
                            <td data-label="Access">{aud.openToUnrepresented ? 'Open Call' : 'Agency Required'}</td>
                            <td data-label="Stipend" className="font-mono">{aud.stipendCredits} ₢</td>
                            <td data-label="Audition">
                              {aud.status === 'open' ? (
                                <button
                                  type="button"
                                  onClick={() => setFeedback(useOSStore.getState().submitEntertainmentAudition(aud.auditionId).message)}
                                  className="px-3 py-1 rounded text-white font-bold text-xs cursor-pointer"
                                  style={{ background: site.accentColor }}
                                >
                                  Submit Tape
                                </button>
                              ) : (
                                <span className="text-xs font-mono ent-muted">
                                  {aud.status === 'cast' ? `Cast (${aud.selectedArtistId})` : 'Closed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ent-card ent-col-4 space-y-3">
                  <h2 className="text-base font-bold">Studio Slate & Repertory Notes</h2>
                  <p className="text-xs ent-muted">{org.publicReputation}</p>
                  <div className="p-3 rounded-lg bg-slate-100 text-slate-800 text-xs space-y-1">
                    <strong>Internal Creative Balance:</strong>
                    <p>{org.internalTension}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className="w-full py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                    style={{ background: site.accentColor }}
                  >
                    Open Studio Production Creator →
                  </button>
                </section>
              </>
            )}

            {/* AGENCIES, LABELS, PUBLISHERS & DISTRIBUTORS */}
            {site.archetype === 'agency_label' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Briefcase size={17} /> Representation, Label & Distribution Terms
                  </h2>
                  <p className="text-xs ent-muted">{org.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--ent-card-border)' }}>
                      <div className="ent-muted font-mono uppercase text-[10px]">Standard Commission</div>
                      <div className="text-lg font-extrabold">{Math.round((org.commissionRate ?? 0.12) * 100)}%</div>
                    </div>
                    <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--ent-card-border)' }}>
                      <div className="ent-muted font-mono uppercase text-[10px]">Baseline Artist Royalty Split</div>
                      <div className="text-lg font-extrabold">{Math.round((org.royaltySplitArtist ?? 0.85) * 100)}%</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openContractModal(defaultContractTypeForOrg())}
                      className="px-4 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                      style={{ background: site.accentColor }}
                    >
                      Negotiate & Sign {defaultContractTypeForOrg().toUpperCase()} Agreement
                    </button>
                    {site.orgId === 'ORG_STARSTRUCK' && (
                      <button
                        type="button"
                        onClick={() => openContractModal('label')}
                        className="px-3.5 py-2 rounded-lg border font-bold text-xs cursor-pointer"
                        style={{ borderColor: site.accentColor }}
                      >
                        Negotiate Flagship Label Deal
                      </button>
                    )}
                  </div>
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold">Signed Roster & Affiliates</h2>
                  <div className="space-y-2">
                    {ent.artists
                      .filter((a) =>
                        [a.managerOrgId, a.labelOrgId, a.publisherOrgId, a.distributorOrgId].includes(site.orgId),
                      )
                      .map((a) => (
                        <div key={a.artistId} className="p-2.5 rounded-lg border flex items-center justify-between text-xs" style={{ borderColor: 'var(--ent-card-border)' }}>
                          <div>
                            <strong>{a.stageName}</strong>
                            <div className="text-[11px] ent-muted">{a.genres.join(' · ')}</div>
                          </div>
                          <span className="font-mono text-[11px] font-bold">{a.tier}</span>
                        </div>
                      ))}
                  </div>
                </section>
              </>
            )}

            {/* FASHION, BEAUTY & PORTRAITURE */}
            {site.archetype === 'fashion_beauty' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Sparkles size={17} /> Endorsements, Stage Wardrobe & Editorial Sittings
                  </h2>
                  <p className="text-xs ent-muted">{org.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFeedback(
                          useOSStore.getState().acceptBrandSponsorship(
                            site.orgId,
                            `${site.shortName} Cycle ${cycle} Signature Campaign`,
                          ).message,
                        )
                      }
                      className="px-4 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                      style={{ background: site.accentColor }}
                    >
                      <Coins size={13} className="inline mr-1" /> Accept Brand Ambassador Campaign
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFeedback(
                          useOSStore.getState().createEntertainmentProject({
                            title: `${site.shortName} Editorial Commission`,
                            kind: 'fashion_campaign',
                            discipline: 'modeling',
                            partnerOrgId: site.orgId,
                            budgetCredits: 60,
                          }).message,
                        )
                      }
                      className="px-3.5 py-2 rounded-lg border font-bold text-xs cursor-pointer"
                      style={{ borderColor: site.accentColor }}
                    >
                      Commission Lookbook / Portrait Sitting (60 ₢)
                    </button>
                  </div>
                </section>

                <section className="ent-card ent-col-5 space-y-2.5">
                  <h2 className="text-base font-bold">Active Brand Campaigns</h2>
                  {ent.sponsorships.map((sp) => (
                    <div key={sp.sponsorshipId} className="p-3 rounded-lg border text-xs" style={{ borderColor: 'var(--ent-card-border)' }}>
                      <strong>{sp.campaignTitle}</strong>
                      <div className="ent-muted">{sp.stageName} × {sp.sponsorName} · {sp.feeCredits.toLocaleString()} ₢</div>
                    </div>
                  ))}
                </section>
              </>
            )}

            {/* PR, PERFORMERS GUILD & MUSIC RIGHTS SOCIETY */}
            {site.archetype === 'pr_guild_rights' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Shield size={17} /> {site.name} Member & Client Services
                  </h2>
                  <p className="text-xs ent-muted">{org.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {site.orgId === 'ORG_WORD_OF_MOUTH' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openContractModal('publicity')}
                          className="px-3.5 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                          style={{ background: site.accentColor }}
                        >
                          Retain Word of Mouth PR
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFeedback(
                              useOSStore.getState().acceptEntertainmentAppearance({
                                orgId: 'ORG_LIMELIGHT',
                                kind: 'interview',
                              }).message,
                            )
                          }
                          className="px-3.5 py-2 rounded-lg border font-bold text-xs cursor-pointer"
                        >
                          Book Limelight Feature Interview
                        </button>
                      </>
                    )}
                    {site.orgId === 'ORG_PERFORMERS_ASSOC' && (
                      <button
                        type="button"
                        onClick={() => openContractModal('guild')}
                        className="px-4 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                        style={{ background: site.accentColor }}
                      >
                        Enroll in Performers Association (+Contract Leverage)
                      </button>
                    )}
                    {site.orgId === 'ORG_MUSIC_RIGHTS_SOCIETY' && (
                      <button
                        type="button"
                        onClick={() => setFeedback(useOSStore.getState().claimEntertainmentRoyalties().message)}
                        className="px-4 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                        style={{ background: site.accentColor }}
                      >
                        Claim Disbursed MMRS & Streaming Royalties
                      </button>
                    )}
                  </div>

                  {ent.controversies.filter((c) => c.status === 'active').length > 0 && (
                    <div className="pt-3 border-t space-y-2 text-xs">
                      <strong className="text-rose-600 block">Active Public Controversies Requiring Response</strong>
                      {ent.controversies
                        .filter((c) => c.status === 'active')
                        .map((cnv) => (
                          <div key={cnv.controversyId} className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-slate-900 space-y-2">
                            <div>
                              <strong>{cnv.stageName}:</strong> {cnv.topic}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedback(
                                    useOSStore.getState().respondToCelebrityControversy(cnv.controversyId, 'accountable_statement').message,
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-slate-900 text-white font-bold cursor-pointer"
                              >
                                Direct Accountable Statement
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedback(
                                    useOSStore.getState().respondToCelebrityControversy(cnv.controversyId, 'word_of_mouth_pr').message,
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-purple-700 text-white font-bold cursor-pointer"
                              >
                                Word of Mouth PR Counsel
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold">Registered Works & Active Contracts</h2>
                  <div className="space-y-2 text-xs">
                    {ent.contracts
                      .filter((c) => c.status === 'active')
                      .slice(0, 6)
                      .map((c) => (
                        <div key={c.contractId} className="p-2.5 rounded border flex items-center justify-between gap-2" style={{ borderColor: 'var(--ent-card-border)' }}>
                          <div>
                            <strong>{c.orgName}</strong>
                            <div className="text-[11px] ent-muted">
                              {c.contractType} · {Math.round(c.royaltySplitArtist * 100)}% artist split
                            </div>
                          </div>
                          {playerArtist && c.artistId === playerArtist.artistId && (
                            <button
                              type="button"
                              onClick={() => setFeedback(useOSStore.getState().terminateEntertainmentContract(c.contractId).message)}
                              className="px-2 py-1 rounded bg-rose-100 text-rose-900 font-bold text-[11px] cursor-pointer"
                            >
                              End Deal
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              </>
            )}

            {/* THE RADIANCE AWARDS */}
            {site.archetype === 'awards' && (
              <>
                <section className="ent-card ent-col-7 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <img src="/icons/Icon set 1/PNG/64 pixels/medal 1.png" alt="" aria-hidden="true" className="h-7 w-7" />
                    <h2 className="text-base font-bold">Radiance Academy Official Nominees & Winners</h2>
                  </div>
                  {ent.awards.map((aw) => (
                    <div key={aw.awardCycleId} className="p-3.5 rounded-lg border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <strong>{aw.awardCycleId}</strong>
                        <span>Status: {aw.status.toUpperCase()} · Ceremony Cycle {aw.ceremonyCycle}</span>
                      </div>
                      <div className="space-y-1">
                        {aw.nominees.map((nom, i) => (
                          <div key={`${nom.artistId}-${i}`} className="flex items-center justify-between py-1 border-b border-white/10">
                            <span>
                              <strong>{nom.stageName}</strong> — “{nom.workTitle}” ({nom.category})
                            </span>
                            <span className="font-mono text-amber-300">Peer Score {nom.score}</span>
                          </div>
                        ))}
                      </div>
                      {aw.winners.length > 0 && (
                        <div className="pt-2 text-amber-300 font-bold">
                          🏆 Honorees: {aw.winners.map((w) => `${w.stageName} (${w.category})`).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </section>

                <section className="ent-card ent-col-5 space-y-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Award size={17} /> For-Your-Consideration Filing (75 ₢)
                  </h2>
                  <div className="ent-field">
                    <label htmlFor="fyc-cat" className="ent-field-label">Award Category</label>
                    <span className="ent-field-hint">Select the peer branch reviewing your work.</span>
                    <select id="fyc-cat" value={fycCategory} onChange={(e) => setFycCategory(e.target.value)} className="ent-input">
                      <option value="Recorded Music of the Year">Recorded Music of the Year</option>
                      <option value="Screen & Stage Performance">Screen & Stage Performance</option>
                      <option value="Choreography & Sound Craft">Choreography & Sound Craft</option>
                    </select>
                  </div>
                  <div className="ent-field">
                    <label htmlFor="fyc-work" className="ent-field-label">Submitted Work Title</label>
                    <span className="ent-field-hint">Requires 18+ Artistic Credibility.</span>
                    <input
                      id="fyc-work"
                      value={fycWork}
                      onChange={(e) => setFycWork(e.target.value)}
                      placeholder={playerArtist ? `${playerArtist.stageName} Showcase` : 'Released Song or Role'}
                      className="ent-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(useOSStore.getState().submitRadianceAwardCampaign(fycCategory, fycWork).message)}
                    className="w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Submit Academy Ballot Entry (75 ₢)
                  </button>
                </section>
              </>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 2: CREATOR, BOOKING & STAFF WORKSPACE
            ================================================================ */}
        {activeTab === 'workspace' && (
          <div className="ent-grid-main">
            <section className="ent-card ent-col-6 space-y-3.5">
              <h2 className="text-base font-bold">Performer / Professional Registration & Quick Release</h2>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setStageNameTouched(true);
                  if (stageNameInput.trim().length < 2) return;
                  const res = useOSStore.getState().registerOrUpdateArtistProfile({
                    stageName: stageNameInput,
                    disciplines: [selectedDisc],
                    genres: [selectedGenre],
                  });
                  setFeedback(res.message);
                }}
                className="space-y-3"
              >
                <div className="ent-field">
                  <label htmlFor="ent-stage-name" className="ent-field-label">Stage or Professional Name</label>
                  <span className="ent-field-hint">Enter 2 to 60 characters. New profiles begin unlisted and earn fame from real work.</span>
                  <input
                    id="ent-stage-name"
                    required
                    minLength={2}
                    maxLength={60}
                    value={stageNameInput}
                    onBlur={() => setStageNameTouched(true)}
                    onChange={(e) => setStageNameInput(e.target.value)}
                    aria-invalid={stageNameInvalid || undefined}
                    aria-describedby={stageNameInvalid ? stageNameErrId : undefined}
                    className={`ent-input ${stageNameInvalid ? 'user-invalid-fallback' : ''}`}
                  />
                  {stageNameInvalid && (
                    <span id={stageNameErrId} className="ent-field-error">
                      Please enter at least 2 characters for your stage or professional name.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="ent-field">
                    <label htmlFor="ent-disc-select" className="ent-field-label">Primary Discipline</label>
                    <select id="ent-disc-select" value={selectedDisc} onChange={(e) => setSelectedDisc(e.target.value as EntertainmentDisciplineId)} className="ent-input">
                      {ENTERTAINMENT_DISCIPLINES.map((d) => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ent-field">
                    <label htmlFor="ent-genre-select" className="ent-field-label">Signature Style / Genre</label>
                    <input id="ent-genre-select" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="ent-input" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white font-bold text-xs cursor-pointer"
                  style={{ background: site.accentColor }}
                >
                  {playerArtist ? 'Update Professional Profile' : 'Activate Professional Profile'}
                </button>
              </form>

              <hr style={{ borderColor: 'var(--ent-card-border)' }} />

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setTrackTitleTouched(true);
                  if (trackTitleInput.trim().length < 2) return;
                  const res = useOSStore.getState().publishEntertainmentRelease({
                    title: trackTitleInput,
                    genre: selectedGenre,
                    audioUrl: selectedAudioUrl,
                    distributorOrgId: site.orgId === 'ORG_LUNERUM_DIST' ? 'ORG_LUNERUM_DIST' : undefined,
                  });
                  setFeedback(res.message);
                  if (res.ok) setTrackTitleInput('');
                }}
                className="space-y-3"
              >
                <h3 className="text-sm font-bold">Publish Playable Track to Songbird & MMRS</h3>
                <div className="ent-field">
                  <label htmlFor="ent-track-title" className="ent-field-label">Release Title</label>
                  <span className="ent-field-hint">Select a master audio stem below and publish directly to the living catalog.</span>
                  <input
                    id="ent-track-title"
                    required
                    minLength={2}
                    value={trackTitleInput}
                    onBlur={() => setTrackTitleTouched(true)}
                    onChange={(e) => setTrackTitleInput(e.target.value)}
                    aria-invalid={trackTitleInvalid || undefined}
                    aria-describedby={trackTitleInvalid ? trackErrId : undefined}
                    placeholder="e.g. Harbor Lights at Dusk"
                    className={`ent-input ${trackTitleInvalid ? 'user-invalid-fallback' : ''}`}
                  />
                  {trackTitleInvalid && (
                    <span id={trackErrId} className="ent-field-error">
                      Enter a track title of at least 2 characters before publishing.
                    </span>
                  )}
                </div>
                <div className="ent-field">
                  <label htmlFor="ent-audio-stem" className="ent-field-label">Audio Master Stem</label>
                  <select id="ent-audio-stem" value={selectedAudioUrl} onChange={(e) => setSelectedAudioUrl(e.target.value)} className="ent-input">
                    {SHIPPED_AUDIO_ASSETS.map((a) => (
                      <option key={a.id} value={a.audioUrl}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer">
                  Publish Master to Songbird
                </button>
              </form>
            </section>

            <section className="ent-card ent-col-6 space-y-3.5">
              <h2 className="text-base font-bold">Venue Booking, Press & Staff Work Orders</h2>
              <div className="space-y-2.5 text-xs">
                <div className="ent-field">
                  <label htmlFor="ent-venue-slot" className="ent-field-label">Book Live Performance Slot</label>
                  <span className="ent-field-hint">Double-bookings on the same venue, cycle, and slot are automatically blocked.</span>
                  <div className="grid grid-cols-3 gap-2">
                    <select id="ent-venue-slot" value={bookingSlot} onChange={(e) => setBookingSlot(e.target.value as any)} className="ent-input">
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="late">Late Set</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={bookingCyclesAhead}
                      onChange={(e) => setBookingCyclesAhead(Number(e.target.value))}
                      aria-label="Cycles ahead"
                      className="ent-input"
                    />
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={ticketPriceInput}
                      onChange={(e) => setTicketPriceInput(Number(e.target.value))}
                      aria-label="Ticket price"
                      className="ent-input"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VENUE_CATALOG.map((v) => (
                    <button
                      key={v.orgId}
                      type="button"
                      onClick={() =>
                        setFeedback(
                          useOSStore.getState().bookEntertainmentVenue({
                            venueOrgId: v.orgId,
                            scheduledInCycles: bookingCyclesAhead,
                            slot: bookingSlot,
                            ticketPrice: ticketPriceInput,
                          }).message,
                        )
                      }
                      className="px-3 py-1.5 rounded border font-bold cursor-pointer"
                      style={{ borderColor: 'var(--ent-card-border)' }}
                    >
                      Book {v.name} ({v.rentalCost} ₢ hold)
                    </button>
                  ))}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--ent-card-border)' }} />

              <div className="space-y-2 text-xs">
                <h3 className="text-sm font-bold">Publicity, Interviews & WORKNET Staff Shifts</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFeedback(
                        useOSStore.getState().acceptEntertainmentAppearance({
                          orgId: site.orgId,
                          kind: 'interview',
                        }).message,
                      )
                    }
                    className="px-3 py-1.5 rounded bg-indigo-600 text-white font-bold cursor-pointer"
                  >
                    Sit for {site.shortName} Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedback(useOSStore.getState().interactWithFanCommunity().message)}
                    className="px-3 py-1.5 rounded bg-pink-600 text-white font-bold cursor-pointer"
                  >
                    Host Listener Q&A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedback(useOSStore.getState().claimEntertainmentRoyalties().message)}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold cursor-pointer"
                  >
                    Claim Accrued Royalties
                  </button>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  {[
                    ['ms-art-01', 'WORKNET: Kaji & Velvet Mastering Shift'],
                    ['ms-press-02', 'WORKNET: Limelight Greenroom Fact-Check'],
                    ['qn-05', 'QUESTNOTICE: Looking Glass Soundcheck'],
                  ].map(([mId, label]) => (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => {
                        const s = useOSStore.getState();
                        s.openAssignment(mId);
                        s.openAppWorkspace('jobs', 'assignment');
                      }}
                      className="underline font-semibold cursor-pointer"
                    >
                      {label} ↗
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 3: ALL 25 SECTION XIX ENTERTAINMENT ORGANIZATIONS DIRECTORY
            ================================================================ */}
        {activeTab === 'directory' && (
          <section className="ent-card space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Globe size={17} /> Meridion Entertainment Ecosystem Directory ({ENTERTAINMENT_SITES.length} Connected Portals)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {ENTERTAINMENT_SITES.map((entry) => (
                <article
                  key={entry.orgId}
                  className="p-3 rounded-lg border space-y-1.5"
                  style={{
                    borderColor: entry.orgId === site.orgId ? site.accentColor : 'var(--ent-card-border)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong>{entry.name}</strong>
                    <span className="font-mono text-[10px] opacity-80">{entry.domain}</span>
                  </div>
                  <div className="text-[11px] ent-muted">{entry.kind} · {entry.realm}</div>
                  <p className="text-[11px] ent-muted line-clamp-2">{entry.tagline}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('front');
                      navigateTab(entry.url);
                    }}
                    className="text-xs font-bold underline cursor-pointer"
                  >
                    Visit {entry.shortName} →
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================
            TAB 4: DEPARTMENTS, LEADERSHIP & INSTITUTIONAL PROFILE
            ================================================================ */}
        {activeTab === 'about' && (
          <div className="ent-grid-main">
            <section className="ent-card ent-col-7 space-y-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Building2 size={17} /> Institutional Mandate & Departments
              </h2>
              <p className="text-xs leading-relaxed">{org.description}</p>
              <div className="space-y-2 text-xs">
                {(org.departments || []).map((dept: any) => (
                  <div key={dept.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--ent-card-border)' }}>
                    <div className="flex items-center justify-between">
                      <strong>{dept.name}</strong>
                      <span className="font-mono text-[11px] ent-muted">Head: {dept.head}</span>
                    </div>
                    <p className="ent-muted mt-1">{dept.focus}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="ent-card ent-col-5 space-y-3 text-xs">
              <h2 className="text-base font-bold">Public Standing & Partner Network</h2>
              <div>
                <strong className="block mb-0.5">Public Reputation</strong>
                <p className="ent-muted">{org.publicReputation}</p>
              </div>
              <div>
                <strong className="block mb-0.5">Industry Dynamics</strong>
                <p className="ent-muted">{org.internalTension}</p>
              </div>
              <div>
                <strong className="block mb-1">Partner Institutions</strong>
                <div className="flex flex-wrap gap-1.5">
                  {(org.partnerOrgIds || []).map((pid: string) => {
                    const partner = ENTERTAINMENT_SITES.find((x) => x.orgId === pid);
                    return partner ? (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => navigateTab(partner.url)}
                        className="px-2.5 py-1 rounded border font-semibold cursor-pointer"
                        style={{ borderColor: 'var(--ent-card-border)' }}
                      >
                        {partner.shortName} ↗
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Native <dialog> Modal for Contract Split Negotiation */}
      <dialog
        ref={dialogRef}
        className="ent-modal"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h2 className="text-base font-bold text-slate-900">
              Negotiate {pendingContractType.toUpperCase()} Contract · {site.name}
            </h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className="text-sm font-bold px-2 cursor-pointer">
              ×
            </button>
          </div>
          <p className="text-slate-600">
            Review royalty retention and representation terms. Higher artist splits require strong Industry Reputation (48+) or Meridion Performers Association membership.
          </p>
          <div className="space-y-2">
            <label htmlFor="modal-split-range" className="font-bold block text-slate-800">
              Requested Artist Royalty Share: {requestedSplit}% (House Baseline: {Math.round((org.royaltySplitArtist ?? 0.82) * 100)}%)
            </label>
            <input
              id="modal-split-range"
              type="range"
              min={50}
              max={95}
              value={requestedSplit}
              onChange={(e) => setRequestedSplit(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={switchAgencyFlag}
              onChange={(e) => setSwitchAgencyFlag(e.target.checked)}
            />
            <span>Replace any existing active {pendingContractType} agreement cleanly</span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const res = useOSStore.getState().signOrNegotiateEntertainmentContract({
                  orgId: site.orgId,
                  contractType: pendingContractType,
                  royaltySplitArtist: requestedSplit / 100,
                  switchAgency: switchAgencyFlag,
                });
                setFeedback(res.message);
                dialogRef.current?.close();
              }}
              className="px-4 py-1.5 rounded-lg text-white font-bold cursor-pointer"
              style={{ background: site.accentColor }}
            >
              Sign Contract
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
