import { useId, useState } from 'react';
import { Radio, Sparkles, Star } from 'lucide-react';
import { SongbirdAudioPlayer } from '../../../../../components/media/SongbirdAudioPlayer';
import { buildSiteUrl } from '../../entertainmentRouter';
import { SHIPPED_AUDIO_ASSETS, getTrackCoverUrl } from '../../services/entertainmentDataService';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function PopStickerRadioSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const reqInputId = useId();
  const [shoutoutInput, setShoutoutInput] = useState('');
  const [listenerQueue, setListenerQueue] = useState<string[]>([
    'mirae_07: “this is my fave era of Vivienne Rose omg!”',
    'marlowe_pier: “spin NYLA’s Midnight Over Marlowe for the late shift!”',
    'glassline_k: “request sent!! hope it makes it on air”',
  ]);

  const countdownTracks = [...data.ent.tracks].sort((a, b) => b.radioSpins - a.radioSpins);
  const navItems = [
    { id: 'home', path: '/', label: 'On Air' },
    { id: 'schedule', path: '/schedule', label: 'Schedule' },
    { id: 'countdown', path: '/countdown', label: 'Countdown' },
    { id: 'requests', path: '/requests', label: 'Requests' },
    { id: 'sessions', path: '/sessions', label: 'Sessions' },
    { id: 'about', path: '/about', label: 'Booth 88' },
  ];

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = shoutoutInput.trim();
    if (!clean) return;
    setListenerQueue((prev) => [`${data.playerName}: “${clean}”`, ...prev].slice(0, 8));
    setShoutoutInput('');
    data.setFeedback('Your song request was sent live to Booth 88!');
  };

  return (
    <div className="ent-root site-popsticker" data-site-shell="broadcast-console">
      <header className="ps-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          <span className="ps-sticker-logo">POP STICKER RADIO</span>
          <small style={{ color: '#e9d5ff', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}>
            MERIDION’S MUSIC · CULTURE · BOOTH 88
          </small>
        </div>
        <nav className="ps-nav" aria-label={resolved.config.navAriaLabel}>
          {navItems.map((item) => (
            <SiteLink
              key={item.id}
              href={buildSiteUrl(site, item.path)}
              navigate={navigate}
              current={routeId === item.id}
            >
              {item.label}
            </SiteLink>
          ))}
        </nav>
      </header>

      <main className="ps-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#fde047" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* ON AIR HOME — Zine & Sticker Broadcast Collage (PDF p. 19) */}
        {routeId === 'home' && (
          <>
            <section className="ps-hero-stage" aria-label="Booth 88 live broadcast">
              <img
                src="/media/entertainment/popsticker-radio-booth.jpg"
                alt="Pop Sticker Radio Booth 88 hosts laughing live behind microphones in a neon violet studio"
                onError={(e) => {
                  e.currentTarget.src = '/media/albums/album-neon-starlight.jpg';
                }}
              />
              <div className="ps-hero-scrim" aria-hidden="true" />

              <div style={{ position: 'relative', zIndex: 1 }} className="ent-widget-stack">
                <span className="ps-sticker-logo" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', background: '#fde047', color: '#1e0a36', boxShadow: '3px 3px 0 #ec4899' }}>
                  THE SOUNDTRACK OF MERIDION ♡
                </span>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 3.2cqi, 2.35rem)', fontWeight: 900, lineHeight: 1.05 }}>
                  Booth 88 Live On Air
                </h1>
                <p style={{ margin: 0, color: '#f3e8ff', fontSize: '0.84rem', maxInlineSize: '28rem' }}>
                  {site.tagline} — Request tracks, collect release-week artist stickers, and boost indie singles into
                  Eight-Realm rotation.
                </p>
              </div>

              <aside className="ps-now-card" aria-label="Now playing on Booth 88">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 900, color: '#be185d' }}>
                    <span className="ent-pulse-dot" aria-hidden="true">
                      ●
                    </span>
                    <span>LIVE ON AIR · MINA VOLT</span>
                  </span>
                  <span className="ent-mono-tag" style={{ color: '#6b21a8' }}>
                    CYCLE {data.cycle}
                  </span>
                </div>
                {data.activeTrack && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <img
                      src={getTrackCoverUrl(data.activeTrack)}
                      alt=""
                      style={{ inlineSize: '46px', blockSize: '46px', borderRadius: '0.45rem', objectFit: 'cover' }}
                    />
                    <div style={{ minInlineSize: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{data.activeTrack.title}</strong>
                      <small style={{ color: '#581c87' }}>
                        {data.activeTrack.stageName} · {data.activeTrack.radioSpins} spins
                      </small>
                    </div>
                  </div>
                )}
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/countdown')} navigate={navigate} className="ent-btn-primary" style={{ background: '#7e22ce', borderRadius: '999px', fontSize: '0.74rem' }}>
                    <Radio size={13} aria-hidden="true" />
                    <span>Top Countdown</span>
                  </SiteLink>
                  {data.activeTrack && (
                    <button
                      type="button"
                      className="ent-btn-secondary"
                      style={{ borderRadius: '999px', fontSize: '0.74rem', borderColor: '#7e22ce', color: '#581c87' }}
                      onClick={() => data.actions.submitRadio(data.activeTrack!.trackId)}
                    >
                      Pitch Airplay
                    </button>
                  )}
                </div>
              </aside>
            </section>

            {/* 3-Column Middle Collage: Request a Song! | Current Playlist | Live Chat & Stickers */}
            <section className="ps-collage-grid">
              <form className="ps-request-card" onSubmit={handleRequestSubmit}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic' }}>
                  REQUEST A SONG! ♡
                </h2>
                <div className="ent-field">
                  <label htmlFor={reqInputId} className="visually-hidden">
                    Search or request a song
                  </label>
                  <input
                    id={reqInputId}
                    value={shoutoutInput}
                    onChange={(e) => setShoutoutInput(e.target.value)}
                    placeholder="Search for a song, artist, or shoutout..."
                    className="ent-input"
                    style={{ borderRadius: '999px', color: '#1f1135' }}
                  />
                </div>
                <div className="ent-action-row">
                  <button type="submit" className="ent-btn-primary" style={{ background: '#fde047', color: '#1e0a36', borderRadius: '999px' }}>
                    Send Request →
                  </button>
                  {['New Releases', 'Local Artists', 'Marlowe'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setShoutoutInput(`Spin ${tag} favorites on Booth 88!`)}
                      style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.55rem', borderRadius: '999px', border: '1px solid #1e0a36', background: 'rgba(255,255,255,0.7)', color: '#1e0a36', cursor: 'pointer' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </form>

              <section className="ps-white-panel" aria-label="Current rotation playlist">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>CURRENT PLAYLIST</h2>
                  <SiteLink href={buildSiteUrl(site, '/countdown')} navigate={navigate} style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 700 }}>
                    Full Chart →
                  </SiteLink>
                </div>
                {countdownTracks.slice(0, 4).map((trk) => (
                  <div key={trk.trackId} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', paddingBlockEnd: '0.45rem', borderBlockEnd: '1px solid #f3e8ff' }}>
                    <img src={getTrackCoverUrl(trk)} alt="" style={{ inlineSize: '34px', blockSize: '34px', borderRadius: '0.35rem', objectFit: 'cover' }} />
                    <div style={{ minInlineSize: 0, flex: 1 }}>
                      <strong style={{ display: 'block', fontSize: '0.78rem' }}>{trk.title}</strong>
                      <small style={{ color: '#6b21a8', fontSize: '0.7rem' }}>
                        {trk.stageName} · {trk.radioSpins} spins
                      </small>
                    </div>
                    <button
                      type="button"
                      className="ent-btn-primary"
                      style={{ minBlockSize: '28px', padding: '0.2rem 0.55rem', fontSize: '0.7rem', borderRadius: '999px', background: '#ec4899' }}
                      onClick={() => data.setActiveTrackId(trk.trackId)}
                    >
                      Tune In
                    </button>
                  </div>
                ))}
              </section>

              <section className="ps-white-panel" aria-label="Live listener chat and stickers">
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>LIVE CHAT & STICKERS</h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.76rem' }} className="ent-widget-stack">
                  {listenerQueue.slice(0, 3).map((msg, i) => (
                    <li key={`${i}-${msg}`} style={{ padding: '0.4rem 0.55rem', background: '#faf5ff', borderRadius: '0.45rem' }}>
                      {msg}
                    </li>
                  ))}
                </ul>
                <div style={{ paddingTop: '0.45rem', borderTop: '1px dashed #c084fc' }}>
                  <strong style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    <Sparkles size={13} aria-hidden="true" style={{ color: '#ec4899' }} />
                    <span>Collected Stickers ({data.ent.collectedStickers.length})</span>
                  </strong>
                  {data.ent.collectedStickers.map((st) => (
                    <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', fontWeight: 700, color: '#6b21a8' }}>
                      <Star size={13} aria-hidden="true" style={{ color: '#eab308', flexShrink: 0 }} />
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            {/* Bottom TODAY ON PSR Schedule Strip + Next Up Sticky */}
            <section className="ps-schedule-strip" aria-label="Today on Pop Sticker Radio">
              {[
                { name: 'Morning Promenade', time: '07:00 – 10:00', host: 'Mina Volt', img: '/media/albums/album-neon-starlight.jpg' },
                { name: 'Sticker Drop Live', time: '14:00 – 17:00', host: 'Toby Lin', img: '/media/albums/album-marble-lilies.jpg' },
                { name: 'Booth 88 Countdown', time: '20:00 – 22:00', host: 'LIVE NOW', img: '/media/entertainment/popsticker-radio-booth.jpg' },
                { name: 'Night Rotation', time: '22:00 – 01:00', host: 'Glassline Mix', img: '/media/albums/album-prism-eclipse.jpg' },
              ].map((show) => (
                <article key={show.name} className="ps-show-tile">
                  <img src={show.img} alt="" loading="lazy" />
                  <div style={{ padding: '0.55rem 0.65rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.78rem' }}>{show.name}</strong>
                    <small style={{ color: '#6b21a8', fontSize: '0.7rem' }}>
                      {show.time} · {show.host}
                    </small>
                  </div>
                </article>
              ))}
              <aside className="ps-yellow-sticky">
                <span className="ent-mono-tag" style={{ color: '#9d174d' }}>
                  NEXT UP
                </span>
                <strong style={{ fontSize: '0.96rem' }}>Studio Sessions</strong>
                <small style={{ fontSize: '0.74rem' }}>
                  Book a live in-booth session & artist sticker drop!
                </small>
                <SiteLink href={buildSiteUrl(site, '/sessions')} navigate={navigate} style={{ fontSize: '0.75rem', fontWeight: 900, color: '#581c87' }}>
                  Open Sessions →
                </SiteLink>
              </aside>
            </section>
          </>
        )}

        {routeId === 'countdown' && (
          <section className="ps-white-panel">
            <h2 style={{ margin: 0 }}>Booth 88 Weekly Top Countdown</h2>
            <div className="ent-table-scroll" tabIndex={0}>
              <table className="ent-data-table">
                <caption>Pop Sticker Radio Rotation & Sticker Editions</caption>
                <thead>
                  <tr>
                    <th scope="col">Spins</th>
                    <th scope="col">Track & Artist</th>
                    <th scope="col">Sticker Edition</th>
                    <th scope="col">Booth Action</th>
                  </tr>
                </thead>
                <tbody>
                  {countdownTracks.map((trk) => (
                    <tr key={trk.trackId}>
                      <td className="ent-mono-tag">{trk.radioSpins}</td>
                      <td>
                        <strong>{trk.title}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#6b21a8' }}>{trk.stageName}</div>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{trk.stickerEdition || 'Standard Rotation'}</td>
                      <td>
                        <div className="ent-action-row">
                          <button
                            type="button"
                            className="ent-btn-primary"
                            style={{ minBlockSize: '30px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#ec4899' }}
                            onClick={() => data.setActiveTrackId(trk.trackId)}
                          >
                            Tune In
                          </button>
                          <button
                            type="button"
                            className="ent-btn-secondary"
                            style={{ minBlockSize: '30px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderColor: '#7e22ce', color: '#581c87' }}
                            onClick={() => data.actions.submitRadio(trk.trackId)}
                          >
                            Pitch Airplay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {routeId === 'schedule' && (
          <section className="ps-white-panel">
            <h2 style={{ margin: 0 }}>Daily Eight-Realm Broadcast Schedule</h2>
            <ul className="ent-dept-list" role="list">
              <li>
                <strong>07:00 – Morning Promenade Wake-Up</strong> · Host: Mina Volt · Fresh Songbird premieres & transit chatter
              </li>
              <li>
                <strong>14:00 – Sticker Drop Afternoon</strong> · Host: Toby Lin · Release-week artist stickers & Marlowe indie rotation
              </li>
              <li>
                <strong>20:00 – Booth 88 Live Countdown</strong> · Pan-Meridion listener requests & Silverleaf live feeds
              </li>
            </ul>
          </section>
        )}

        {routeId === 'requests' && (
          <section className="ps-white-panel">
            <h2 style={{ margin: 0 }}>Listener Request Line & Shoutout Box</h2>
            <form className="ent-widget-stack" onSubmit={handleRequestSubmit}>
              <div className="ent-field">
                <label htmlFor="ps-req-page" className="ent-field-label">
                  Request a track or send a Glassline shoutout
                </label>
                <input
                  id="ps-req-page"
                  value={shoutoutInput}
                  onChange={(e) => setShoutoutInput(e.target.value)}
                  placeholder="e.g. Spin Conduit Lullaby by Aelita!"
                  className="ent-input"
                />
              </div>
              <button type="submit" className="ent-btn-primary" style={{ alignSelf: 'flex-start', background: '#ec4899' }}>
                Send to Booth 88
              </button>
            </form>
            <ul className="ent-dept-list" role="list">
              {listenerQueue.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {routeId === 'sessions' && (
          <section className="ps-white-panel">
            <h2 style={{ margin: 0 }}>Live Booth Premieres & Artist Interviews</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#581c87' }}>
              Artists can book a live Booth 88 broadcast session to boost media visibility and drop an illustrated
              collector sticker edition.
            </p>
            <button
              type="button"
              className="ent-btn-primary"
              style={{ alignSelf: 'flex-start', background: '#7e22ce' }}
              onClick={() => data.actions.acceptAppearance('ORG_POP_STICKER', 'podcast')}
            >
              Book Live Booth 88 Broadcast Session
            </button>
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      {data.activeTrack && (
        <footer className="ps-dock" aria-label="Pop Sticker live player">
          <SongbirdAudioPlayer
            key={data.activeTrack.trackId}
            audioUrl={data.activeTrack.audioUrl}
            coverArtUrl={
              data.activeTrack.coverArtUrl ||
              SHIPPED_AUDIO_ASSETS.find((x) => x.audioUrl === data.activeTrack!.audioUrl)?.coverArtUrl
            }
            title={`BOOTH 88 · ${data.activeTrack.title}`}
            artistName={`${data.activeTrack.stageName} · ${data.activeTrack.radioSpins} radio spins`}
            onStreamCounted={() => data.actions.streamTrack(data.activeTrack!.trackId)}
          />
        </footer>
      )}
    </div>
  );
}
