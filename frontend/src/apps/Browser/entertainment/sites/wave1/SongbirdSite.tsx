import { useId, useState } from 'react';
import {
  Compass,
  Disc3,
  Headphones,
  Heart,
  Library,
  Mic2,
  Play,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { SongbirdAudioPlayer } from '../../../../../components/media/SongbirdAudioPlayer';
import { buildSiteUrl } from '../../entertainmentRouter';
import {
  SHIPPED_AUDIO_ASSETS,
  crossSiteLinks,
  getTrackCoverUrl,
} from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { PerformerRegistrationForm, ReleasePublishForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  EcosystemDirectorySection,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function SongbirdSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const [searchQuery, setSearchQuery] = useState(resolved.params.get('q') ?? '');
  const [chartTab, setChartTab] = useState<'all' | 'indie' | 'rising'>('all');
  const genreSelectId = useId();
  const searchInputId = useId();
  const routeId = resolved.route?.id;

  const genres = [...new Set(data.topTracks.map((t) => t.genre))].sort();
  const activeGenre = resolved.params.get('genre') ?? '';
  const filteredTracks = activeGenre
    ? data.topTracks.filter((t) => t.genre === activeGenre)
    : data.topTracks;

  const primaryNav = [
    { id: 'home', path: '/', label: 'Discover', icon: Compass },
    { id: 'search', path: '/search', label: 'Search', icon: Search },
    { id: 'charts', path: '/charts', label: 'Charts', icon: TrendingUp },
    { id: 'releases', path: '/releases', label: 'New Releases', icon: Disc3 },
    { id: 'library', path: '/library', label: 'Your Library', icon: Library },
    { id: 'artist-studio', path: '/artist-studio', label: 'Artist Studio', icon: Mic2 },
  ];

  const followedArtists = data.ent.artists.filter((a) => data.ent.followedArtistIds.includes(a.artistId));
  const spotlightArtist = data.ent.artists.find((a) => a.artistId === 'ART-NYLA') ?? data.publicArtists[0];
  const heroTrack = data.topTracks[0];

  const chartList =
    chartTab === 'indie'
      ? data.topTracks.filter((t) => t.masterOwnedByArtist)
      : chartTab === 'rising'
        ? [...data.ent.tracks].sort((a, b) => b.createdCycle - a.createdCycle)
        : data.topTracks;

  return (
    <div className="ent-root site-songbird" data-site-shell="streaming-app">
      <aside className="sb-rail" aria-label="Songbird library rail">
        <div className="sb-brand">
          <span className="sb-brand-mark" aria-hidden="true">
            SB
          </span>
          <div>
            <h1>{site.name}</h1>
            <small>Music on VerseNet</small>
          </div>
        </div>

        <nav className="sb-nav" aria-label={resolved.config.navAriaLabel}>
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <SiteLink
                key={item.id}
                href={buildSiteUrl(site, item.path)}
                navigate={navigate}
                current={routeId === item.id}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </SiteLink>
            );
          })}
        </nav>

        <div className="sb-nav" aria-label="Your library summary">
          <span className="sb-nav-label">Your Library</span>
          <SiteLink href={buildSiteUrl(site, '/library')} navigate={navigate}>
            <Heart size={13} aria-hidden="true" />
            <span>Following ({followedArtists.length})</span>
          </SiteLink>
          <SiteLink href={buildSiteUrl(site, '/releases')} navigate={navigate}>
            <Disc3 size={13} aria-hidden="true" />
            <span>Releases ({data.ent.releases.length})</span>
          </SiteLink>
          <SiteLink href={buildSiteUrl(site, '/charts')} navigate={navigate}>
            <Users size={13} aria-hidden="true" />
            <span>Artists ({data.publicArtists.length})</span>
          </SiteLink>
        </div>

        <div className="sb-promo-card">
          <strong style={{ fontSize: '0.78rem' }}>VerseNet Music</strong>
          <small style={{ color: 'var(--site-muted)', fontSize: '0.7rem', lineHeight: 1.4 }}>
            A unified listening network across all eight realms of Meridion.
          </small>
          <img
            src="/images/wallpapers/aureline-glassline-twilight.png"
            alt="Aureline Glassline District twilight panorama"
            loading="lazy"
          />
          <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.7rem' }}>
            <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} style={{ color: '#6ee7b7' }}>
              Directory
            </SiteLink>
            <SiteLink href={buildSiteUrl(site, '/about')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
              About
            </SiteLink>
          </div>
        </div>
      </aside>

      <main className="sb-main">
        {/* Top Search & Discovery Pills (PDF p. 39) */}
        <header className="sb-topbar">
          <form
            className="sb-search-pill"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(buildSiteUrl(site, '/search', searchQuery.trim() ? new URLSearchParams({ q: searchQuery.trim() }) : undefined));
            }}
          >
            <Search size={14} aria-hidden="true" style={{ color: 'var(--site-muted)' }} />
            <label htmlFor="sb-top-search" className="visually-hidden">
              Search Songbird catalog
            </label>
            <input
              id="sb-top-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs, artists, albums, or moods..."
            />
          </form>
          <div className="sb-chip-row">
            <SiteLink href={buildSiteUrl(site, '/')} navigate={navigate} className="sb-chip" current={routeId === 'home'}>
              Discover
            </SiteLink>
            <SiteLink href={buildSiteUrl(site, '/charts')} navigate={navigate} className="sb-chip" current={routeId === 'charts'}>
              Charts
            </SiteLink>
            <SiteLink href={buildSiteUrl(site, '/releases')} navigate={navigate} className="sb-chip" current={routeId === 'releases'}>
              Releases
            </SiteLink>
            <SiteLink href={buildSiteUrl(site, '/artist-studio')} navigate={navigate} className="sb-chip" current={routeId === 'artist-studio'}>
              Artist Studio
            </SiteLink>
          </div>
        </header>

        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#10b981" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* DISCOVER HOME — Round 2 Mockup Composition (PDF p. 39) */}
        {routeId === 'home' && (
          <>
            <section className="sb-hero-stage" aria-label="Featured Songbird release">
              <img
                src={heroTrack ? getTrackCoverUrl(heroTrack) : '/media/albums/album-neon-starlight.jpg'}
                alt={heroTrack ? `Featured artwork for ${heroTrack.title}` : 'Songbird featured release'}
                className="sb-hero-bg"
              />
              <div className="sb-hero-scrim">
                <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                  FEATURED RELEASE · CYCLE {data.cycle}
                </span>
                <h2>{heroTrack?.title ?? 'Songbird Living Catalog'}</h2>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#d1fae5' }}>
                  {heroTrack
                    ? `${heroTrack.stageName} · ${heroTrack.genre} · ${heroTrack.streams.toLocaleString()} streams across Eight Realms`
                    : site.description}
                </p>
                <div className="ent-action-row" style={{ marginTop: '0.45rem' }}>
                  {heroTrack && (
                    <button
                      type="button"
                      className="ent-btn-primary"
                      style={{ borderRadius: '999px' }}
                      onClick={() => {
                        data.setActiveTrackId(heroTrack.trackId);
                        data.actions.streamTrack(heroTrack.trackId);
                      }}
                    >
                      <Play size={14} aria-hidden="true" />
                      <span>Listen Now</span>
                    </button>
                  )}
                  {heroTrack && (
                    <button
                      type="button"
                      className="ent-btn-secondary"
                      style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}
                      onClick={() => data.actions.toggleFollow(heroTrack.artistId)}
                    >
                      + Follow Artist
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 4-Tile Quick Discovery Strip */}
            <section className="sb-quick-strip" aria-label="Quick music discovery">
              <SiteLink href={buildSiteUrl(site, '/search')} navigate={navigate} className="sb-quick-card">
                <Search size={18} aria-hidden="true" style={{ color: '#6ee7b7', flexShrink: 0 }} />
                <div>
                  <strong>Find Your Next Favorite</strong>
                  <small>Search artists, tracks & realms</small>
                </div>
              </SiteLink>
              <SiteLink href={buildSiteUrl(site, '/charts', new URLSearchParams({ genre: 'Dream Pop' }))} navigate={navigate} className="sb-quick-card">
                <Headphones size={18} aria-hidden="true" style={{ color: '#a78bfa', flexShrink: 0 }} />
                <div>
                  <strong>Evening Mood Mixes</strong>
                  <small>Ambient score to Glassline synth</small>
                </div>
              </SiteLink>
              <SiteLink href={buildSiteUrl(site, '/charts')} navigate={navigate} className="sb-quick-card">
                <Disc3 size={18} aria-hidden="true" style={{ color: '#38bdf8', flexShrink: 0 }} />
                <div>
                  <strong>Genre Explorer</strong>
                  <small>{genres.length} living genres on Songbird</small>
                </div>
              </SiteLink>
              <SiteLink href={crossSiteLinks.orgHome('ORG_POP_STICKER')} navigate={navigate} className="sb-quick-card">
                <Radio size={18} aria-hidden="true" style={{ color: '#f472b6', flexShrink: 0 }} />
                <div>
                  <strong>Pop Sticker Radio</strong>
                  <small>Live Booth 88 sets & premieres ↗</small>
                </div>
              </SiteLink>
            </section>

            {/* 3-Column Discovery Grid (Top Charts | New Releases + Curated Playlists | Artist Spotlight) */}
            <section className="sb-triple-grid">
              {/* Left: Top Charts */}
              <div className="sb-glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Top Charts</h3>
                  <SiteLink href={buildSiteUrl(site, '/charts')} navigate={navigate} style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
                    Full Chart →
                  </SiteLink>
                </div>
                <div className="sb-chip-row">
                  {([
                    ['all', 'All Realms'],
                    ['indie', 'Independent'],
                    ['rising', 'Rising'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`sb-chip ${chartTab === key ? 'is-active' : ''}`}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                      onClick={() => setChartTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ent-widget-stack" style={{ gap: '0.45rem' }}>
                  {chartList.slice(0, 5).map((trk, idx) => (
                    <div key={trk.trackId} className="sb-chart-row">
                      <span className="ent-mono-tag" style={{ inlineSize: '18px', color: '#6ee7b7' }}>
                        {idx + 1}
                      </span>
                      <img src={getTrackCoverUrl(trk)} alt="" loading="lazy" />
                      <div style={{ minInlineSize: 0, flex: 1 }}>
                        <SiteLink
                          href={buildSiteUrl(site, `/album/${encodeURIComponent(trk.trackId)}`)}
                          navigate={navigate}
                          style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {trk.title}
                        </SiteLink>
                        <small style={{ color: 'var(--site-muted)', fontSize: '0.7rem' }}>{trk.stageName}</small>
                      </div>
                      <button
                        type="button"
                        aria-label={`Play ${trk.title}`}
                        className="ent-btn-primary"
                        style={{ minBlockSize: '28px', minInlineSize: '28px', padding: '0.2rem', borderRadius: '50%' }}
                        onClick={() => {
                          data.setActiveTrackId(trk.trackId);
                          data.actions.streamTrack(trk.trackId);
                        }}
                      >
                        <Play size={12} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center: New Releases + Curated Playlists */}
              <div className="ent-widget-stack">
                <div className="sb-glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '0.96rem' }}>New Releases</h3>
                    <SiteLink href={buildSiteUrl(site, '/releases')} navigate={navigate} style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
                      See All →
                    </SiteLink>
                  </div>
                  <div className="sb-shelf-grid">
                    {data.topTracks.map((trk) => (
                      <article key={trk.trackId} className="sb-release-tile">
                        <img src={getTrackCoverUrl(trk)} alt="" loading="lazy" />
                        <SiteLink
                          href={buildSiteUrl(site, `/album/${encodeURIComponent(trk.trackId)}`)}
                          navigate={navigate}
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                        >
                          {trk.title}
                        </SiteLink>
                        <SiteLink
                          href={buildSiteUrl(site, `/artist/${encodeURIComponent(trk.artistId)}`)}
                          navigate={navigate}
                          style={{ fontSize: '0.7rem', color: 'var(--site-muted)', textDecoration: 'none' }}
                        >
                          {trk.stageName}
                        </SiteLink>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="sb-glass-panel">
                  <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Curated Eight-Realm Playlists</h3>
                  <div className="sb-shelf-grid">
                    {[
                      { name: 'Glassline Afterhours', desc: 'Neo-soul & synth from Marlowe & Aureline', img: '/media/albums/album-meadow-dusk.jpg', genre: 'Alternative R&B' },
                      { name: 'Silverleaf Mainstage', desc: 'Arena pop & stadium anthems', img: '/media/albums/album-neon-starlight.jpg', genre: 'Electro-Pop' },
                      { name: 'Balisya Chamber Works', desc: 'Acoustic scores & strings', img: '/media/albums/album-chamber-violin.jpg', genre: 'Ambient Score' },
                    ].map((pl) => (
                      <SiteLink
                        key={pl.name}
                        href={buildSiteUrl(site, '/charts', new URLSearchParams({ genre: pl.genre }))}
                        navigate={navigate}
                        className="sb-release-tile"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <img src={pl.img} alt="" loading="lazy" />
                        <strong style={{ fontSize: '0.78rem' }}>{pl.name}</strong>
                        <small style={{ fontSize: '0.69rem', color: 'var(--site-muted)' }}>{pl.desc}</small>
                      </SiteLink>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Artist Spotlight */}
              {spotlightArtist && (
                <aside className="sb-spotlight-card" aria-label="Artist spotlight">
                  <img
                    src="/media/albums/album-meadow-dusk.jpg"
                    alt={`Spotlight artwork for ${spotlightArtist.stageName}`}
                  />
                  <div className="sb-spotlight-overlay">
                    <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      ARTIST SPOTLIGHT · {spotlightArtist.tier.toUpperCase()}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Georgia, serif' }}>
                      {spotlightArtist.stageName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#d1fae5' }}>
                      {spotlightArtist.genres.join(' · ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--site-muted)', lineHeight: 1.45 }}>
                      {spotlightArtist.bio}
                    </p>
                    <div className="ent-action-row" style={{ marginTop: '0.4rem' }}>
                      <SiteLink
                        href={buildSiteUrl(site, `/artist/${encodeURIComponent(spotlightArtist.artistId)}`)}
                        navigate={navigate}
                        className="ent-btn-primary"
                        style={{ borderRadius: '999px', fontSize: '0.75rem' }}
                      >
                        Explore Artist
                      </SiteLink>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        style={{ borderRadius: '999px', fontSize: '0.75rem' }}
                        onClick={() => data.actions.toggleFollow(spotlightArtist.artistId)}
                      >
                        {data.ent.followedArtistIds.includes(spotlightArtist.artistId) ? 'Following' : '+ Follow'}
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </section>
          </>
        )}

        {/* CHARTS & LEGACY /listen */}
        {routeId === 'charts' && (
          <section className="sb-glass-panel">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Songbird Pan-Meridion Top Charts</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                  Ranked live by verified streams and Pop Sticker Radio spins across all eight realms.
                </p>
              </div>
              <div className="ent-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor={genreSelectId} className="ent-field-label">
                  Genre
                </label>
                <select
                  id={genreSelectId}
                  value={activeGenre}
                  className="ent-select-compact"
                  onChange={(e) => {
                    const p = new URLSearchParams();
                    if (e.target.value) p.set('genre', e.target.value);
                    navigate(buildSiteUrl(site, '/charts', p));
                  }}
                >
                  <option value="">All genres</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ent-table-scroll" tabIndex={0}>
              <table className="ent-data-table">
                <caption>Top Recorded Tracks Across All Eight Realms</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Track</th>
                    <th scope="col">Artist</th>
                    <th scope="col">Genre</th>
                    <th scope="col">Streams</th>
                    <th scope="col">Spins</th>
                    <th scope="col">Play</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map((trk, i) => (
                    <tr key={trk.trackId}>
                      <td className="ent-mono-tag">{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <img
                            src={getTrackCoverUrl(trk)}
                            alt=""
                            loading="lazy"
                            style={{ inlineSize: '38px', blockSize: '38px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <SiteLink
                            href={buildSiteUrl(site, `/album/${encodeURIComponent(trk.trackId)}`)}
                            navigate={navigate}
                            style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}
                          >
                            {trk.title}
                          </SiteLink>
                        </div>
                      </td>
                      <td>
                        <SiteLink
                          href={buildSiteUrl(site, `/artist/${encodeURIComponent(trk.artistId)}`)}
                          navigate={navigate}
                          style={{ color: '#6ee7b7', textDecoration: 'none' }}
                        >
                          {trk.stageName}
                        </SiteLink>
                      </td>
                      <td>{trk.genre}</td>
                      <td className="ent-mono-tag">{trk.streams.toLocaleString()}</td>
                      <td className="ent-mono-tag">{trk.radioSpins}</td>
                      <td>
                        <button
                          type="button"
                          className="ent-btn-primary"
                          style={{ minBlockSize: '30px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', borderRadius: '999px' }}
                          onClick={() => {
                            data.setActiveTrackId(trk.trackId);
                            data.actions.streamTrack(trk.trackId);
                          }}
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
        )}

        {/* NEW RELEASES */}
        {routeId === 'releases' && (
          <section className="sb-glass-panel">
            <h2 style={{ margin: 0 }}>New Releases & Master Editions</h2>
            <div className="sb-shelf-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))' }}>
              {data.ent.releases.map((rel) => {
                const track = data.ent.tracks.find((t) => t.trackId === rel.trackId);
                return (
                  <article key={rel.releaseId} className="sb-release-tile">
                    {track && <img src={getTrackCoverUrl(track)} alt="" loading="lazy" />}
                    <strong>
                      <SiteLink
                        href={buildSiteUrl(site, `/album/${encodeURIComponent(rel.trackId)}`)}
                        navigate={navigate}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {rel.title}
                      </SiteLink>
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                      {rel.stageName} · {rel.format} · Cycle {rel.releaseCycle}
                    </span>
                    <button
                      type="button"
                      className="ent-btn-primary"
                      style={{ borderRadius: '999px' }}
                      onClick={() => {
                        data.setActiveTrackId(rel.trackId);
                        data.actions.streamTrack(rel.trackId);
                      }}
                    >
                      Play Release
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SEARCH */}
        {routeId === 'search' && (
          <section className="sb-glass-panel">
            <h2 style={{ margin: 0 }}>Search the Songbird Catalog</h2>
            <div className="ent-field" style={{ maxInlineSize: '28rem' }}>
              <label htmlFor={searchInputId} className="ent-field-label">
                Search tracks, artists, or genres
              </label>
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. NYLA, Vivienne, Glassline Synth, Basalt..."
                className="ent-input"
              />
            </div>
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const matchedTracks = data.topTracks.filter(
                (t) =>
                  !q ||
                  t.title.toLowerCase().includes(q) ||
                  t.stageName.toLowerCase().includes(q) ||
                  t.genre.toLowerCase().includes(q),
              );
              const matchedArtists = data.publicArtists.filter(
                (a) =>
                  !q ||
                  a.stageName.toLowerCase().includes(q) ||
                  a.genres.some((g) => g.toLowerCase().includes(q)) ||
                  a.bio.toLowerCase().includes(q),
              );
              return (
                <div className="ent-widget-stack">
                  <h3>Matching Tracks ({matchedTracks.length})</h3>
                  <ul className="ent-ticket-list" role="list">
                    {matchedTracks.map((trk) => (
                      <li key={trk.trackId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>{trk.title}</strong>
                          <span>
                            {trk.stageName} · {trk.genre} · {trk.streams.toLocaleString()} streams
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ent-btn-primary"
                          onClick={() => {
                            data.setActiveTrackId(trk.trackId);
                            data.actions.streamTrack(trk.trackId);
                          }}
                        >
                          Play
                        </button>
                      </li>
                    ))}
                  </ul>
                  <h3>Matching Artists ({matchedArtists.length})</h3>
                  <div className="sb-shelf-grid">
                    {matchedArtists.map((art) => (
                      <article key={art.artistId} className="sb-release-tile">
                        <strong>
                          <SiteLink
                            href={buildSiteUrl(site, `/artist/${encodeURIComponent(art.artistId)}`)}
                            navigate={navigate}
                            style={{ color: '#6ee7b7' }}
                          >
                            {art.stageName}
                          </SiteLink>
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                          {art.genres.join(' · ')}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* YOUR LIBRARY */}
        {routeId === 'library' && (
          <section className="sb-glass-panel">
            <h2 style={{ margin: 0 }}>Your Listening Library</h2>
            <div className="ent-about-grid">
              <div className="ent-widget-stack">
                <h3>Followed Artists ({followedArtists.length})</h3>
                {followedArtists.length === 0 ? (
                  <p className="ent-empty-note">You have not followed any artists yet.</p>
                ) : (
                  <ul className="ent-ticket-list" role="list">
                    {followedArtists.map((art) => {
                      const club = data.ent.fanCommunities.find((fc) => fc.artistId === art.artistId);
                      const inClub = Boolean(club?.memberIds.includes('PLAYER'));
                      return (
                        <li key={art.artistId} className="ent-ticket-item">
                          <div className="ent-ticket-meta">
                            <strong>
                              <SiteLink
                                href={buildSiteUrl(site, `/artist/${encodeURIComponent(art.artistId)}`)}
                                navigate={navigate}
                                style={{ color: 'inherit' }}
                              >
                                {art.stageName}
                              </SiteLink>
                            </strong>
                            <span>{art.genres.join(' · ')}</span>
                          </div>
                          <div className="ent-ticket-controls">
                            <button
                              type="button"
                              className="ent-btn-secondary"
                              onClick={() => data.actions.toggleFollow(art.artistId)}
                            >
                              Unfollow
                            </button>
                            <button
                              type="button"
                              className="ent-btn-primary"
                              onClick={() => data.actions.joinFanCircle(art.artistId)}
                            >
                              {inClub ? 'In Fan Circle' : 'Join Circle'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="ent-widget-stack">
                <h3>Fan Communities & Listener Circles</h3>
                <ul className="ent-ticket-list" role="list">
                  {data.ent.fanCommunities.map((fc) => (
                    <li key={fc.communityId} className="ent-ticket-item">
                      <div className="ent-ticket-meta">
                        <strong>{fc.name}</strong>
                        <span>
                          {fc.stageName} · Loyalty {fc.loyaltyScore}
                        </span>
                        <small>{fc.recentActivity}</small>
                      </div>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        onClick={() => data.actions.joinFanCircle(fc.artistId)}
                      >
                        {fc.memberIds.includes('PLAYER') ? 'Joined' : 'Join'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ARTIST DETAIL /artist/:id */}
        {routeId === 'artist-detail' &&
          (() => {
            const artist = data.ent.artists.find((a) => a.artistId === resolved.pathParams.id);
            if (!artist) return <SiteNotFoundView site={site} navigate={navigate} />;
            const tracks = data.ent.tracks.filter((t) => t.artistId === artist.artistId);
            const shows = data.ent.concerts.filter((c) => c.artistId === artist.artistId);
            const following = data.ent.followedArtistIds.includes(artist.artistId);
            return (
              <section className="ent-widget-stack">
                <div className="sb-hero-stage">
                  <img
                    src={tracks[0] ? getTrackCoverUrl(tracks[0]) : '/media/albums/album-marble-lilies.jpg'}
                    alt={`Featured backdrop for ${artist.stageName}`}
                    className="sb-hero-bg"
                  />
                  <div className="sb-hero-scrim">
                    <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      VERIFIED SONGBIRD ARTIST · {artist.tier.toUpperCase()}
                    </span>
                    <h2>{artist.stageName}</h2>
                    <p style={{ color: '#d1fae5', fontSize: '0.86rem', margin: 0 }}>{artist.bio}</p>
                    <p className="ent-mono-tag" style={{ color: '#a7f3d0', margin: 0 }}>
                      {artist.monthlyListeners.toLocaleString()} monthly listeners · {artist.fanCount.toLocaleString()} fans
                    </p>
                    <div className="ent-action-row" style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="ent-btn-primary"
                        style={{ borderRadius: '999px' }}
                        onClick={() => data.actions.toggleFollow(artist.artistId)}
                      >
                        <Heart size={14} aria-hidden="true" />
                        <span>{following ? 'Following' : 'Follow Artist'}</span>
                      </button>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        style={{ borderRadius: '999px' }}
                        onClick={() => data.actions.joinFanCircle(artist.artistId)}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        <span>Join Fan Circle</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sb-glass-panel">
                  <h3 style={{ margin: 0 }}>Discography on Songbird ({tracks.length})</h3>
                  <ul className="ent-ticket-list" role="list">
                    {tracks.map((trk) => (
                      <li key={trk.trackId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>
                            <SiteLink
                              href={buildSiteUrl(site, `/album/${encodeURIComponent(trk.trackId)}`)}
                              navigate={navigate}
                              style={{ color: 'inherit' }}
                            >
                              {trk.title}
                            </SiteLink>
                          </strong>
                          <span>
                            {trk.genre} · {trk.streams.toLocaleString()} streams ·{' '}
                            {trk.masterOwnedByArtist ? 'Artist-owned master' : 'Label-controlled master'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ent-btn-primary"
                          style={{ borderRadius: '999px' }}
                          onClick={() => {
                            data.setActiveTrackId(trk.trackId);
                            data.actions.streamTrack(trk.trackId);
                          }}
                        >
                          ▶ Play
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {shows.length > 0 && (
                  <div className="sb-glass-panel">
                    <h3 style={{ margin: 0 }}>Upcoming Live Dates</h3>
                    <ul className="ent-ticket-list" role="list">
                      {shows.map((c) => (
                        <li key={c.concertId} className="ent-ticket-item">
                          <div className="ent-ticket-meta">
                            <strong>{c.title}</strong>
                            <span>
                              {c.venue} · {c.dateLabel} · {c.ticketPrice} ₢
                            </span>
                          </div>
                          <SiteLink
                            href={crossSiteLinks.orgHome(c.venueOrgId, '/tickets')}
                            navigate={navigate}
                            className="ent-btn-secondary"
                          >
                            Venue Box Office
                          </SiteLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })()}

        {/* ALBUM / RELEASE DETAIL /album/:id */}
        {routeId === 'album-detail' &&
          (() => {
            const track = data.ent.tracks.find((t) => t.trackId === resolved.pathParams.id);
            if (!track) return <SiteNotFoundView site={site} navigate={navigate} />;
            return (
              <section className="sb-glass-panel">
                <div className="ent-about-grid" style={{ alignItems: 'center' }}>
                  <div className="ent-widget-stack">
                    <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      {track.kind.replaceAll('_', ' ').toUpperCase()} · CYCLE {track.createdCycle}
                    </span>
                    <h2 style={{ margin: 0 }}>{track.title}</h2>
                    <p style={{ margin: 0 }}>
                      By{' '}
                      <SiteLink
                        href={buildSiteUrl(site, `/artist/${encodeURIComponent(track.artistId)}`)}
                        navigate={navigate}
                        style={{ color: '#6ee7b7', fontWeight: 700 }}
                      >
                        {track.stageName}
                      </SiteLink>{' '}
                      · {track.genre}
                    </p>
                    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.3rem 1rem', fontSize: '0.82rem' }}>
                      <dt style={{ color: 'var(--site-muted)' }}>Master Rights</dt>
                      <dd style={{ margin: 0 }}>{track.masterOwnedByArtist ? 'Artist-owned' : 'Label-administered'}</dd>
                      <dt style={{ color: 'var(--site-muted)' }}>MMRS Ledger</dt>
                      <dd style={{ margin: 0 }}>{track.mmrsRegistered ? 'Registered' : 'Pending registration'}</dd>
                      <dt style={{ color: 'var(--site-muted)' }}>Streams / Radio</dt>
                      <dd style={{ margin: 0 }}>
                        {track.streams.toLocaleString()} streams · {track.radioSpins} Pop Sticker spins
                      </dd>
                    </dl>
                    <div className="ent-action-row">
                      <button
                        type="button"
                        className="ent-btn-primary"
                        style={{ borderRadius: '999px' }}
                        onClick={() => {
                          data.setActiveTrackId(track.trackId);
                          data.actions.streamTrack(track.trackId);
                        }}
                      >
                        ▶ Play Master
                      </button>
                      <SiteLink href={crossSiteLinks.orgHome('ORG_MUSIC_RIGHTS_SOCIETY', '/repertoire')} navigate={navigate} className="ent-btn-secondary">
                        Inspect MMRS Filing
                      </SiteLink>
                    </div>
                  </div>
                  <img
                    src={getTrackCoverUrl(track)}
                    alt={`Cover sleeve for ${track.title}`}
                    style={{ maxInlineSize: '260px', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '0.65rem' }}
                  />
                </div>
              </section>
            );
          })()}

        {/* AUTHENTICATED ARTIST STUDIO */}
        {routeId === 'artist-studio' && (
          <AuthPortalGate
            data={data}
            portalName="Songbird Artist Studio"
            description="Manage your verified Songbird profile, publish new playable masters, and claim disbursed streaming royalties."
          >
            <div className="ent-about-grid">
              <section className="sb-glass-panel">
                <h2 style={{ margin: 0 }}>Verified Artist Identity</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--site-muted)' }}>
                  Wallet: {data.playerCredits.toLocaleString()} ₢ · Cycle {data.cycle}
                  {data.playerArtist ? ` · ${data.playerArtist.stageName} (${data.playerArtist.tier})` : ''}
                </p>
                <PerformerRegistrationForm data={data} accentColor="#10b981" />
                {data.playerArtist && (
                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--site-border)' }}>
                    <p className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      Unclaimed Royalties: {data.playerArtist.unclaimedPlayerRoyalties.toLocaleString()} ₢
                    </p>
                    <button type="button" className="ent-btn-primary" onClick={() => data.actions.claimRoyalties()}>
                      Claim Streaming Royalties
                    </button>
                  </div>
                )}
              </section>
              <section className="sb-glass-panel">
                <h2 style={{ margin: 0 }}>Upload Master to Songbird & MMRS</h2>
                <ReleasePublishForm data={data} accentColor="#10b981" />
              </section>
            </div>
          </AuthPortalGate>
        )}

        {routeId === 'directory' && <EcosystemDirectorySection currentSite={site} data={data} navigate={navigate} />}
        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      {data.activeTrack && (
        <footer className="sb-player-dock" aria-label="Persistent audio playback bar">
          <SongbirdAudioPlayer
            key={data.activeTrack.trackId}
            audioUrl={data.activeTrack.audioUrl}
            coverArtUrl={
              data.activeTrack.coverArtUrl ||
              SHIPPED_AUDIO_ASSETS.find((x) => x.audioUrl === data.activeTrack!.audioUrl)?.coverArtUrl
            }
            title={`${data.activeTrack.title} (${data.activeTrack.genre})`}
            artistName={`${data.activeTrack.stageName} · ${data.activeTrack.streams.toLocaleString()} streams · ${data.activeTrack.radioSpins} spins`}
            onStreamCounted={() => data.actions.streamTrack(data.activeTrack!.trackId)}
          />
          <details style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: 'var(--site-muted)' }}>
            <summary style={{ cursor: 'pointer', width: 'fit-content' }}>Track credits & rights metadata</summary>
            <p style={{ margin: '0.3rem 0 0' }}>
              Artist: <strong>{data.activeTrack.stageName}</strong> · Master:{' '}
              {data.activeTrack.masterOwnedByArtist ? 'Artist-owned' : 'Label-controlled'} · MMRS:{' '}
              {data.activeTrack.mmrsRegistered ? 'Registered' : 'Unlisted'}
            </p>
          </details>
        </footer>
      )}
    </div>
  );
}
