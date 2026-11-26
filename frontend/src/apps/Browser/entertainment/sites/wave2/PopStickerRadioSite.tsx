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
    '“Play Neon Over Silverleaf before the Silverleaf Stadium bowl!” — Glassline Caller',
    '“Spin NYLA’s Midnight Over Marlowe for the late shift!” — Marlowe Pier',
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

  return (
    <div className="ent-root site-popsticker" data-site-shell="broadcast-console">
      <header className="ps-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <span className="ps-onair-badge">
            <span className="ent-pulse-dot" aria-hidden="true">
              ●
            </span>
            <span>ON AIR · BOOTH 88</span>
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 2.4cqi, 1.65rem)', fontWeight: 900 }}>{site.name}</h1>
            <small style={{ color: 'var(--site-muted)', fontSize: '0.73rem' }}>
              Glassline District, Aureline · Eight Realms Broadcast
            </small>
          </div>
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

      <div className="ps-body">
        <main className="ent-widget-stack" style={{ minInlineSize: 0 }}>
          <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#ec4899" />

          {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

          {/* ON AIR HOME */}
          {routeId === 'home' && (
            <>
              <section className="ps-deck-card ent-widget-stack">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="ent-mono-tag" style={{ color: '#38bdf8' }}>
                    LIVE STUDIO FEED · HOST: MINA VOLT
                  </span>
                  <span className="ent-mono-tag" style={{ color: '#f9a8d4' }}>
                    CYCLE {data.cycle} ROTATION
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.35rem, 2.8cqi, 2rem)' }}>
                  Now Spinning: {data.activeTrack?.title ?? 'Booth 88 Rotation'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                  {site.tagline} — Tune into any countdown track below or pitch a release for Booth 88 airplay to
                  unlock collectible release-week artist stickers.
                </p>
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/countdown')} navigate={navigate} className="ent-btn-primary">
                    <Radio size={14} aria-hidden="true" />
                    <span>Open Top Countdown</span>
                  </SiteLink>
                  <SiteLink href={buildSiteUrl(site, '/requests')} navigate={navigate} className="ent-btn-secondary">
                    Send Listener Request
                  </SiteLink>
                </div>
              </section>

              <section className="ps-deck-card ent-widget-stack">
                <h3 style={{ margin: 0 }}>Top Rotation Spins</h3>
                <ul className="ent-ticket-list" role="list">
                  {countdownTracks.slice(0, 4).map((trk, idx) => (
                    <li key={trk.trackId} className="ent-ticket-item">
                      <img
                        src={getTrackCoverUrl(trk)}
                        alt=""
                        loading="lazy"
                        style={{ inlineSize: '42px', blockSize: '42px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <div className="ent-ticket-meta">
                        <strong>
                          #{idx + 1} {trk.title}
                        </strong>
                        <span>
                          {trk.stageName} · {trk.radioSpins} spins · {trk.stickerEdition || 'Standard Rotation'}
                        </span>
                      </div>
                      <div className="ent-ticket-controls">
                        <button
                          type="button"
                          className="ent-btn-primary"
                          onClick={() => {
                            data.setActiveTrackId(trk.trackId);
                            data.actions.streamTrack(trk.trackId);
                          }}
                        >
                          Tune In
                        </button>
                        <button
                          type="button"
                          className="ent-btn-secondary"
                          onClick={() => data.actions.submitRadio(trk.trackId)}
                        >
                          Pitch Boost
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {/* COUNTDOWN */}
          {routeId === 'countdown' && (
            <section className="ps-deck-card ent-widget-stack">
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
                          <div style={{ fontSize: '0.75rem', color: 'var(--site-muted)' }}>{trk.stageName}</div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{trk.stickerEdition || 'Standard Rotation'}</td>
                        <td>
                          <div className="ent-action-row">
                            <button
                              type="button"
                              className="ent-btn-primary"
                              style={{ minBlockSize: '30px', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => data.setActiveTrackId(trk.trackId)}
                            >
                              Tune In
                            </button>
                            <button
                              type="button"
                              className="ent-btn-secondary"
                              style={{ minBlockSize: '30px', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
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

          {/* SCHEDULE */}
          {routeId === 'schedule' && (
            <section className="ps-deck-card ent-widget-stack">
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

          {/* REQUESTS */}
          {routeId === 'requests' && (
            <section className="ps-deck-card ent-widget-stack">
              <h2 style={{ margin: 0 }}>Listener Request Line & Shoutout Box</h2>
              <form
                className="ent-widget-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = shoutoutInput.trim();
                  if (!clean) return;
                  setListenerQueue((prev) => [`“${clean}” — ${data.playerName}`, ...prev].slice(0, 8));
                  setShoutoutInput('');
                  data.setFeedback('Your song request was sent to Booth 88!');
                }}
              >
                <div className="ent-field">
                  <label htmlFor={reqInputId} className="ent-field-label">
                    Request a track or send a Glassline shoutout
                  </label>
                  <input
                    id={reqInputId}
                    value={shoutoutInput}
                    onChange={(e) => setShoutoutInput(e.target.value)}
                    placeholder="e.g. Spin Conduit Lullaby by Aelita!"
                    className="ent-input"
                  />
                </div>
                <button type="submit" className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
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

          {/* SESSIONS */}
          {routeId === 'sessions' && (
            <section className="ps-deck-card ent-widget-stack">
              <h2 style={{ margin: 0 }}>Live Booth Premieres & Artist Interviews</h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                Artists can book a live Booth 88 radio premiere session to boost media visibility and release an
                official collectible sticker edition.
              </p>
              <button
                type="button"
                className="ent-btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => data.actions.acceptAppearance('ORG_POP_STICKER', 'podcast')}
              >
                Book Live Booth 88 Radio Premiere
              </button>
            </section>
          )}

          {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
        </main>

        <aside className="ps-deck-card ent-widget-stack" aria-label="Collected artist stickers">
          <h2 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={16} aria-hidden="true" style={{ color: '#f472b6' }} />
            <span>Your Sticker Book ({data.ent.collectedStickers.length})</span>
          </h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--site-muted)' }}>
            Pitch tracks for Booth 88 rotation to earn limited illustrated artist stickers.
          </p>
          {data.ent.collectedStickers.map((st) => (
            <div key={st} className="ps-sticker-chip">
              <Star size={16} aria-hidden="true" style={{ color: '#facc15', flexShrink: 0 }} />
              <span>{st}</span>
            </div>
          ))}
        </aside>
      </div>

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
