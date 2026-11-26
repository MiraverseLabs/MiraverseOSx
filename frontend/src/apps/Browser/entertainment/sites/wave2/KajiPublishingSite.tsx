import { useId, useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function KajiPublishingSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const filterId = useId();
  const [genreFilter, setGenreFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pubDialogOpen, setPubDialogOpen] = useState(false);

  const kajiScores = data.ent.tracks.filter(
    (t) => t.publisherOrgId === site.orgId || t.producerOrgId === site.orgId,
  );
  const genres = [...new Set(kajiScores.map((t) => t.genre))];
  const visibleScores = kajiScores.filter((t) => {
    if (genreFilter !== 'all' && t.genre !== genreFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.stageName.toLowerCase().includes(q);
  });
  const composers = data.publicArtists.filter((a) => a.publisherOrgId === site.orgId);

  const navItems = [
    { id: 'home', path: '/', label: 'Catalog' },
    { id: 'composers', path: '/composers', label: 'Composers' },
    { id: 'publishing', path: '/publishing', label: 'Publishing' },
    { id: 'studios', path: '/studios', label: 'Recording Studios' },
    { id: 'licensing', path: '/licensing', label: 'Licensing' },
    { id: 'portal', path: '/portal', label: 'Writer Portal' },
    { id: 'about', path: '/about', label: 'Balisya Chambers' },
  ];

  return (
    <div className="ent-root site-kaji" data-site-shell="score-library">
      <header className="kj-header">
        <div>
          <span className="ent-mono-tag" style={{ color: '#e5be79' }}>
            COMPOSITION LIBRARY · PUBLISHING · BALISYA, KAJI
          </span>
          <h1 style={{ margin: '0.1rem 0 0', fontSize: 'clamp(1.25rem, 2.5cqi, 1.8rem)', fontWeight: 500, letterSpacing: '0.06em' }}>
            {site.name}
          </h1>
        </div>
        <nav className="kj-nav" aria-label={resolved.config.navAriaLabel}>
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

      {/* Dark Chamber Hero (PDF p. 20) */}
      {routeId === 'home' && (
        <section className="kj-hero" aria-label="Kaji Publishing Studios collaboration">
          <img
            src="/media/entertainment/kaji-score-studio.jpg"
            alt="Composers collaborating over orchestral scores inside Kaji Publishing’s Balisya acoustic chambers"
            onError={(e) => {
              e.currentTarget.src = '/media/albums/album-chamber-violin.jpg';
            }}
          />
          <div className="kj-hero-scrim">
            <span className="ent-mono-tag" style={{ color: '#f3d195' }}>
              ORIGINAL MUSIC FOR STAGE, SCREEN & BEYOND
            </span>
            <h2 style={{ margin: '0.3rem 0 0.5rem', fontSize: 'clamp(1.65rem, 3.4cqi, 2.55rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.05, maxInlineSize: '30rem' }}>
              Composition, Publishing, & Production
            </h2>
            <p style={{ margin: '0 0 1rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#e9dcc8', maxInlineSize: '32rem' }}>
              {site.description}
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <SiteLink href={buildSiteUrl(site, '/studios')} navigate={navigate} className="ent-btn-primary" style={{ background: '#e5be79', color: '#211711' }}>
                Book Studio Time →
              </SiteLink>
              <button type="button" className="ent-btn-secondary" style={{ color: '#fff8ed', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => setPubDialogOpen(true)}>
                Publishing Administration
              </button>
              <button type="button" className="ent-btn-secondary" style={{ color: '#f3d195', borderColor: 'rgba(243,209,149,0.4)' }} onClick={() => data.actions.openWorknetMission('ms-art-01')}>
                WORKNET Mastering Shift ↗
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="kj-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7a4f1b" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* CATALOG HOME — 5-Card Band + Ledger (PDF p. 20) */}
        {routeId === 'home' && (
          <>
            <section className="kj-service-band" aria-label="Explore Kaji Publishing services">
              <div className="kj-catalog-box">
                <strong style={{ letterSpacing: '0.08em', fontSize: '0.88rem' }}>EXPLORE OUR CATALOG</strong>
                <label htmlFor="kj-quick-search" className="visually-hidden">
                  Search Kaji catalog
                </label>
                <input
                  id="kj-quick-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search works or composers..."
                  className="ent-input"
                  style={{ color: '#271c13', background: '#ffffff' }}
                />
                <SiteLink href={buildSiteUrl(site, '/licensing')} navigate={navigate} style={{ color: '#f3d195', fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem' }}>
                  Licensing Options →
                </SiteLink>
                <SiteLink href={buildSiteUrl(site, '/composers')} navigate={navigate} style={{ color: '#e9dcc8', fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem' }}>
                  Signed Composers →
                </SiteLink>
              </div>

              {[
                { title: 'Studio Services', desc: 'Tracking, arrangement & mastering.', path: '/studios', img: '/media/entertainment/kaji-score-studio.jpg' },
                { title: 'Publishing', desc: 'Rights custody & MMRS filings.', path: '/publishing', img: '/media/albums/album-chamber-violin.jpg' },
                { title: 'Sync Licensing', desc: 'Film, stage & animation scores.', path: '/licensing', img: '/media/posters/poster-citadel-of-echoes.jpg' },
                { title: 'Writer Portal', desc: 'Advance studio chamber sessions.', path: '/portal', img: '/media/albums/album-marble-lilies.jpg' },
              ].map((card) => (
                <SiteLink key={card.title} href={buildSiteUrl(site, card.path)} navigate={navigate} className="kj-photo-tile">
                  <img src={card.img} alt="" loading="lazy" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.96rem', fontStyle: 'italic' }}>{card.title}</strong>
                    <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: '#f0e2cc' }}>
                      {card.desc}
                    </small>
                  </div>
                </SiteLink>
              ))}
            </section>

            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                <h2 style={{ margin: 0, fontStyle: 'italic' }}>Published Works & Score Folio ({visibleScores.length})</h2>
                <div className="ent-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', fontFamily: 'system-ui, sans-serif' }}>
                  <label htmlFor={filterId} className="ent-field-label">
                    Style
                  </label>
                  <select id={filterId} value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="ent-select-compact">
                    <option value="all">All genres</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ent-table-scroll" tabIndex={0}>
                <table className="ent-data-table" style={{ fontFamily: 'system-ui, sans-serif', background: '#ffffff' }}>
                  <caption>Kaji Publishing Administered Scores & Recordings</caption>
                  <thead>
                    <tr>
                      <th scope="col">Work</th>
                      <th scope="col">Composer / Artist</th>
                      <th scope="col">Genre</th>
                      <th scope="col">MMRS</th>
                      <th scope="col">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleScores.map((trk) => (
                      <tr key={trk.trackId}>
                        <td>
                          <strong>{trk.title}</strong>
                        </td>
                        <td>{trk.stageName}</td>
                        <td>{trk.genre}</td>
                        <td className="ent-mono-tag">{trk.mmrsRegistered ? 'Registered' : 'Pending'}</td>
                        <td>
                          <SiteLink href={crossSiteLinks.songbirdAlbum(trk.trackId)} navigate={navigate} style={{ color: 'var(--site-accent)', fontWeight: 700 }}>
                            Hear on Songbird ↗
                          </SiteLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {routeId === 'composers' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>Kaji Signed Composers & Sound Architects</h2>
            <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {composers.map((c) => (
                <li key={c.artistId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                  <div className="ent-ticket-meta">
                    <strong>{c.stageName}</strong>
                    <span>{c.genres.join(' · ')}</span>
                    <small>{c.bio}</small>
                  </div>
                  <SiteLink href={crossSiteLinks.songbirdArtist(c.artistId)} navigate={navigate} className="ent-btn-secondary">
                    Works on Songbird ↗
                  </SiteLink>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(routeId === 'publishing' || routeId === 'licensing') && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>
              {routeId === 'publishing' ? 'Composition Publishing & Writer Stewardship' : 'Sync & Screen Licensing'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Directed by Kenji Pyre. Kaji Publishing administers sheet catalogs, MMRS filings, and film/animation
              sync licenses for Mirrora Studios and Storyloom Studios while safeguarding writer ownership.
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <button type="button" className="ent-btn-primary" onClick={() => setPubDialogOpen(true)}>
                Negotiate Publishing Agreement
              </button>
              <SiteLink href={crossSiteLinks.orgHome('ORG_MUSIC_RIGHTS_SOCIETY', '/repertoire')} navigate={navigate} className="ent-btn-secondary">
                Inspect MMRS Ledger ↗
              </SiteLink>
            </div>
          </section>
        )}

        {routeId === 'studios' && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>Basalt Acoustic Chambers — Recording & Mastering</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Led by Sora Takahashi in Balisya, Kaji. Book a live chamber tracking session to produce a single or
              film score with high acoustic fidelity.
            </p>
            <button
              type="button"
              className="ent-btn-primary"
              style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
              onClick={() =>
                data.actions.createProject({
                  title: `Balisya Chamber Session (Cycle ${data.cycle})`,
                  kind: 'single',
                  discipline: 'music',
                  partnerOrgId: site.orgId,
                  collaboratorArtistId: 'ART-SORA',
                  budgetCredits: 120,
                })
              }
            >
              Book Chamber Session with Sora Takahashi (120 ₢)
            </button>
          </section>
        )}

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Kaji Writer & Studio Session Portal"
            description="Advance booked Basalt Chamber tracking sessions or negotiate publishing representation."
          >
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h2>Your Kaji Studio Sessions</h2>
              {data.ent.projects.filter((p) => p.partnerOrgId === site.orgId).length === 0 ? (
                <p className="ent-empty-note">No chamber sessions booked yet. Visit Recording Studios to reserve a room.</p>
              ) : (
                <ul className="ent-ticket-list" role="list">
                  {data.ent.projects
                    .filter((p) => p.partnerOrgId === site.orgId)
                    .map((prj) => (
                      <li key={prj.projectId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                        <div className="ent-ticket-meta">
                          <strong>{prj.title}</strong>
                          <span>
                            {prj.status} · Quality {prj.quality} · Progress {prj.progress}%
                          </span>
                        </div>
                        {prj.status === 'in_production' && (
                          <button
                            type="button"
                            className="ent-btn-primary"
                            onClick={() => data.actions.advanceProject(prj.projectId)}
                          >
                            Complete Mastering Pass
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={pubDialogOpen}
        onClose={() => setPubDialogOpen(false)}
        site={site}
        org={org}
        contractType="publishing"
        data={data}
      />
    </div>
  );
}
