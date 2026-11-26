import { useId, useState } from 'react';
import {
  Compass,
  Disc3,
  Heart,
  Library,
  Mic2,
  Play,
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

  return (
    <div className="ent-root site-songbird" data-site-shell="streaming-app">
      <aside className="sb-rail" aria-label="Songbird library rail">
        <div className="sb-brand">
          <span className="sb-brand-mark" aria-hidden="true">
            SB
          </span>
          <div>
            <h1>{site.name}</h1>
            <small>{site.realm} Catalog</small>
          </div>
        </div>

        <nav className="sb-nav" aria-label={resolved.config.navAriaLabel}>
          <span className="sb-nav-label">Listen</span>
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

        <div className="sb-nav" aria-label="Followed artists">
          <span className="sb-nav-label">Following ({followedArtists.length})</span>
          {followedArtists.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--site-muted)', paddingInline: '0.6rem' }}>
              Follow artists to pin them here.
            </span>
          ) : (
            followedArtists.map((art) => (
              <SiteLink
                key={art.artistId}
                href={buildSiteUrl(site, `/artist/${encodeURIComponent(art.artistId)}`)}
                navigate={navigate}
                current={routeId === 'artist-detail' && resolved.pathParams.id === art.artistId}
              >
                <Users size={13} aria-hidden="true" />
                <span>{art.stageName}</span>
              </SiteLink>
            ))
          )}
        </div>

        <nav className="sb-nav" aria-label="Songbird institutional links" style={{ marginBlockStart: 'auto' }}>
          <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} current={routeId === 'directory'}>
            Industry Directory
          </SiteLink>
          <SiteLink href={buildSiteUrl(site, '/about')} navigate={navigate} current={routeId === 'about'}>
            About Songbird
          </SiteLink>
        </nav>
      </aside>

      <main className="sb-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#10b981" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* DISCOVER HOME */}
        {routeId === 'home' && (
          <>
            <section className="sb-hero-banner" aria-label="Featured Songbird spotlight">
              <div>
                <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                  PAN-MERIDION EDITORIAL SPOTLIGHT · CYCLE {data.cycle}
                </span>
                <h2>{data.topTracks[0]?.title ?? 'Every Realm’s Music, One Living Catalog'}</h2>
                <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>
                  {site.description} Stream verified masters from Orynvell, Marlowe, Kaji, and beyond.
                </p>
                <div className="ent-action-row">
                  {data.topTracks[0] && (
                    <button
                      type="button"
                      className="ent-btn-primary"
                      onClick={() => {
                        data.setActiveTrackId(data.topTracks[0].trackId);
                        data.actions.streamTrack(data.topTracks[0].trackId);
                      }}
                    >
                      <Play size={14} aria-hidden="true" />
                      <span>Play #1 Track</span>
                    </button>
                  )}
                  <SiteLink href={buildSiteUrl(site, '/charts')} navigate={navigate} className="ent-btn-secondary">
                    Open Top Charts
                  </SiteLink>
                </div>
              </div>
              {data.topTracks[0] && (
                <img
                  src={getTrackCoverUrl(data.topTracks[0])}
                  alt={`Cover artwork for ${data.topTracks[0].title} by ${data.topTracks[0].stageName}`}
                  style={{ inlineSize: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '0.65rem' }}
                />
              )}
            </section>

            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Fresh in the Living Catalog</h2>
                <SiteLink href={buildSiteUrl(site, '/releases')} navigate={navigate} style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>
                  View all releases
                </SiteLink>
              </div>
              <div className="sb-shelf-grid">
                {data.topTracks.map((trk) => (
                  <article key={trk.trackId} className="sb-release-tile">
                    <img src={getTrackCoverUrl(trk)} alt="" loading="lazy" />
                    <strong style={{ fontSize: '0.86rem' }}>
                      <SiteLink
                        href={buildSiteUrl(site, `/album/${encodeURIComponent(trk.trackId)}`)}
                        navigate={navigate}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {trk.title}
                      </SiteLink>
                    </strong>
                    <SiteLink
                      href={buildSiteUrl(site, `/artist/${encodeURIComponent(trk.artistId)}`)}
                      navigate={navigate}
                      style={{ fontSize: '0.76rem', color: 'var(--site-muted)', textDecoration: 'none' }}
                    >
                      {trk.stageName}
                    </SiteLink>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span className="ent-mono-tag" style={{ color: 'var(--site-muted)' }}>
                        {trk.streams.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        className="ent-btn-primary"
                        style={{ minBlockSize: '30px', padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          data.setActiveTrackId(trk.trackId);
                          data.actions.streamTrack(trk.trackId);
                        }}
                      >
                        Play
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Verified Artists Across Meridion</h2>
              <div className="sb-shelf-grid">
                {data.publicArtists.map((art) => (
                  <article key={art.artistId} className="sb-release-tile">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem' }}>
                      <strong>
                        <SiteLink
                          href={buildSiteUrl(site, `/artist/${encodeURIComponent(art.artistId)}`)}
                          navigate={navigate}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {art.stageName}
                        </SiteLink>
                      </strong>
                      <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                        {art.tier}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                      {art.genres.join(' · ')}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--site-muted)' }}>
                      {art.monthlyListeners.toLocaleString()} monthly listeners
                    </p>
                    <button
                      type="button"
                      className="ent-btn-secondary"
                      onClick={() => data.actions.toggleFollow(art.artistId)}
                    >
                      <Heart size={12} aria-hidden="true" />
                      <span>{data.ent.followedArtistIds.includes(art.artistId) ? 'Following' : 'Follow'}</span>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* CHARTS & LEGACY /listen */}
        {routeId === 'charts' && (
          <section className="ent-widget-stack">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Songbird Pan-Meridion Top Charts</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                  Ranked live by recorded streams and Pop Sticker Radio spins across all eight realms.
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
                          style={{ minBlockSize: '30px', padding: '0.2rem 0.65rem', fontSize: '0.75rem' }}
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
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>New Releases & Master Editions</h2>
            <div className="sb-shelf-grid">
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
          <section className="ent-widget-stack">
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
          <section className="ent-widget-stack">
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
                        <span>{fc.stageName} · Loyalty {fc.loyaltyScore}</span>
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
                <div className="sb-hero-banner">
                  <div>
                    <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      VERIFIED SONGBIRD ARTIST · {artist.tier.toUpperCase()}
                    </span>
                    <h2>{artist.stageName}</h2>
                    <p style={{ color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>{artist.bio}</p>
                    <p className="ent-mono-tag" style={{ color: '#a7f3d0' }}>
                      {artist.monthlyListeners.toLocaleString()} monthly listeners · {artist.fanCount.toLocaleString()} fans
                    </p>
                    <div className="ent-action-row" style={{ marginTop: '0.85rem' }}>
                      <button
                        type="button"
                        className="ent-btn-primary"
                        onClick={() => data.actions.toggleFollow(artist.artistId)}
                      >
                        <Heart size={14} aria-hidden="true" />
                        <span>{following ? 'Following' : 'Follow Artist'}</span>
                      </button>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        onClick={() => data.actions.joinFanCircle(artist.artistId)}
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        <span>Join Fan Circle</span>
                      </button>
                    </div>
                  </div>
                  {tracks[0] && (
                    <img
                      src={getTrackCoverUrl(tracks[0])}
                      alt={`Featured release art for ${artist.stageName}`}
                      style={{ inlineSize: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '0.65rem' }}
                    />
                  )}
                </div>

                <h3>Discography on Songbird ({tracks.length})</h3>
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

                {shows.length > 0 && (
                  <>
                    <h3>Upcoming Live Dates</h3>
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
                  </>
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
              <section className="ent-widget-stack">
                <div className="sb-hero-banner">
                  <div>
                    <span className="ent-mono-tag" style={{ color: '#6ee7b7' }}>
                      {track.kind.replaceAll('_', ' ').toUpperCase()} · CYCLE {track.createdCycle}
                    </span>
                    <h2>{track.title}</h2>
                    <p style={{ margin: '0.25rem 0 0.75rem' }}>
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
                    <div className="ent-action-row" style={{ marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="ent-btn-primary"
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
                    style={{ inlineSize: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '0.65rem' }}
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
              <section className="sb-release-tile">
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
              <section className="sb-release-tile">
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
          <details style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--site-muted)' }}>
            <summary style={{ cursor: 'pointer', width: 'fit-content' }}>Track credits & rights metadata</summary>
            <p style={{ margin: '0.35rem 0 0' }}>
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
