import { useId, useState } from 'react';
import { BookOpenCheck, FileCheck2, Globe, Lock, Scale, Search } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ReleasePublishForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function MmrsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const searchId = useId();
  const genreId = useId();
  const custodyId = useId();
  const [query, setQuery] = useState(resolved.params.get('q') ?? '');
  const [genreFilter, setGenreFilter] = useState('all');
  const [custodyFilter, setCustodyFilter] = useState<'all' | 'artist' | 'label'>('all');

  const registeredWorks = data.ent.tracks.filter((t) => t.mmrsRegistered);
  const genres = [...new Set(registeredWorks.map((t) => t.genre))].sort();
  const matchingWorks = registeredWorks.filter((t) => {
    if (genreFilter !== 'all' && t.genre !== genreFilter) return false;
    if (custodyFilter === 'artist' && !t.masterOwnedByArtist) return false;
    if (custodyFilter === 'label' && t.masterOwnedByArtist) return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.stageName.toLowerCase().includes(q) ||
      t.trackId.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: 'home', path: '/', label: 'Home' },
    { id: 'repertoire', path: '/repertoire', label: 'Repertoire Search' },
    { id: 'licensing', path: '/licensing', label: 'Licensing' },
    { id: 'royalties', path: '/royalties', label: 'Royalties' },
    { id: 'registration', path: '/registration', label: 'Registration' },
    { id: 'portal', path: '/portal', label: 'Member Portal' },
    { id: 'about', path: '/about', label: 'About MMRS' },
  ];

  const renderRepertoireWorkbench = () => (
    <section className="mmrs-workbench" aria-label="MMRS Repertoire Search Workbench">
      <div className="ent-widget-stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={19} aria-hidden="true" style={{ color: '#e6be60' }} />
          <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.35rem' }}>Repertoire Search</h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#cfe4e8' }}>
          Search the authoritative Ledger Court public registry for musical works, rightsholders, and master custody.
        </p>
        <div className="ent-field">
          <label htmlFor={searchId} className="visually-hidden">
            Search by work title, performer, genre, or Work ID
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by work title, composer, performer, or Work ID (e.g. TRK-SEED)..."
            className="ent-input"
            style={{ background: '#ffffff', color: '#12282d' }}
          />
        </div>
        <div className="ent-form-grid-2">
          <div className="ent-field">
            <label htmlFor={genreId} style={{ fontSize: '0.72rem', color: '#cfe4e8', fontWeight: 700 }}>
              Genre
            </label>
            <select
              id={genreId}
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="ent-input"
              style={{ background: '#0c2c33', color: '#ffffff', borderColor: 'rgba(212,166,62,0.4)' }}
            >
              <option value="all">All Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="ent-field">
            <label htmlFor={custodyId} style={{ fontSize: '0.72rem', color: '#cfe4e8', fontWeight: 700 }}>
              Master Custody
            </label>
            <select
              id={custodyId}
              value={custodyFilter}
              onChange={(e) => setCustodyFilter(e.target.value as 'all' | 'artist' | 'label')}
              className="ent-input"
              style={{ background: '#0c2c33', color: '#ffffff', borderColor: 'rgba(212,166,62,0.4)' }}
            >
              <option value="all">All Custody Types</option>
              <option value="artist">Artist-Retained Master</option>
              <option value="label">Label-Administered Master</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Canonical Stats Sidebar (PDF p. 45) */}
      <aside style={{ background: 'rgba(6, 25, 30, 0.55)', borderRadius: '0.6rem', padding: '1rem', border: '1px solid rgba(212,166,62,0.3)' }} className="ent-widget-stack">
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f3d17a' }}>{registeredWorks.length}</div>
          <small style={{ color: '#cfe4e8' }}>Registered Works in Current Cycle</small>
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f3d17a' }}>{data.publicArtists.length}</div>
          <small style={{ color: '#cfe4e8' }}>Active Canonical Rightsholders</small>
        </div>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f3d17a' }}>8 Realms</div>
          <small style={{ color: '#cfe4e8' }}>Pan-Meridion Collective Licensing</small>
        </div>
      </aside>
    </section>
  );

  return (
    <div className="ent-root site-mmrs" data-site-shell="rights-registry">
      <header className="mmrs-banner">
        <div>
          <span className="ent-mono-tag" style={{ color: '#f3d17a' }}>
            COLLECT · LICENSE · ADMINISTER · DISTRIBUTE · LEDGER COURT, AURELINE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontFamily: 'Georgia, serif', fontSize: 'clamp(1.25rem, 2.5cqi, 1.75rem)', letterSpacing: '0.04em' }}>
            {site.name}
          </h1>
        </div>
        <nav className="mmrs-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="mmrs-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#144952" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME & REPERTOIRE SEARCH — Round 2 Layout (PDF p. 45) */}
        {(routeId === 'home' || routeId === 'repertoire') && (
          <>
            {renderRepertoireWorkbench()}

            {routeId === 'home' && (
              <section className="mmrs-service-row" aria-label="MMRS services">
                {[
                  { path: '/licensing', title: 'Licensing', desc: 'Broadcast, streaming, and live venue blanket licenses.', icon: Scale },
                  { path: '/royalties', title: 'Royalties', desc: 'Transparent cycle pool calculation across eight realms.', icon: BookOpenCheck },
                  { path: '/registration', title: 'Registration', desc: 'Register new works and publisher split custody.', icon: FileCheck2 },
                  { path: '/portal', title: 'Member Portal', desc: 'Sign in for private statements and royalty claims.', icon: Lock },
                  { path: '/about', title: 'VerseNet Rights', desc: 'Connected to Songbird, Pop Sticker, Lunerum & Kaji.', icon: Globe },
                ].map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <SiteLink key={srv.title} href={buildSiteUrl(site, srv.path)} navigate={navigate} className="mmrs-service-tile">
                      <Icon size={17} aria-hidden="true" style={{ color: '#e6be60' }} />
                      <strong style={{ fontSize: '0.9rem' }}>{srv.title}</strong>
                      <small style={{ color: '#cbe0e4', fontSize: '0.75rem', lineHeight: 1.4 }}>{srv.desc}</small>
                    </SiteLink>
                  );
                })}
              </section>
            )}

            <section className="mmrs-search-panel ent-widget-stack">
              <div className="ent-table-scroll" tabIndex={0}>
                <table className="ent-data-table">
                  <caption>MMRS Public Registered Works Ledger ({matchingWorks.length} works)</caption>
                  <thead>
                    <tr>
                      <th scope="col">Work ID</th>
                      <th scope="col">Title</th>
                      <th scope="col">Primary Performer</th>
                      <th scope="col">Genre</th>
                      <th scope="col">Master Custody</th>
                      <th scope="col">Catalog Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingWorks.map((trk) => (
                      <tr key={trk.trackId}>
                        <td className="ent-mono-tag">{trk.trackId}</td>
                        <td>
                          <strong>{trk.title}</strong>
                        </td>
                        <td>{trk.stageName}</td>
                        <td>{trk.genre}</td>
                        <td>{trk.masterOwnedByArtist ? 'Artist-Retained' : 'Label-Administered'}</td>
                        <td>
                          <SiteLink href={crossSiteLinks.songbirdAlbum(trk.trackId)} navigate={navigate} style={{ color: 'var(--site-accent)', fontWeight: 700 }}>
                            Songbird Entry ↗
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

        {routeId === 'licensing' && (
          <section className="mmrs-search-panel ent-widget-stack">
            <h2 style={{ margin: 0 }}>Public Performance & Broadcast Licensing</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Administered by Elise Takahashi’s Broadcast, Streaming & Venue Royalty Pool. Every licensed venue and
              broadcaster reports setlists and rotation logs per cycle.
            </p>
            <ul className="ent-dept-list" role="list">
              <li>
                <strong>Streaming & Digital Platforms:</strong> Songbird Pan-Meridion Blanket Catalog License
              </li>
              <li>
                <strong>Terrestrial & Booth Broadcast:</strong> Pop Sticker Radio Booth 88 Airplay Pool
              </li>
              <li>
                <strong>Live Venues & Touring:</strong> The Looking Glass (180 cap), Marigold Theatre (1,200 cap),
                Silverleaf Stadium (45,000 cap)
              </li>
            </ul>
          </section>
        )}

        {routeId === 'royalties' && (
          <section className="mmrs-search-panel ent-widget-stack">
            <h2 style={{ margin: 0 }}>How Meridion Performance Royalties Work</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              MMRS distributes royalties every simulation cycle based on verified Songbird streams, Pop Sticker spins,
              and licensed concert performances. Individual statements and payout balances are confidential and
              accessible exclusively through your authenticated Member Portal.
            </p>
            <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
              Sign In to View Personal Statements
            </SiteLink>
          </section>
        )}

        {routeId === 'registration' && (
          <section className="mmrs-search-panel ent-widget-stack">
            <h2 style={{ margin: 0 }}>Composition Registration Standards</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Led by Comptroller Aldous Bell. Works published through Songbird, Lunerum Dist, or Kaji Publishing
              Studios receive an immutable MMRS ledger entry linking writer shares and master custody.
            </p>
            <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
              Register a New Work in Member Portal
            </SiteLink>
          </section>
        )}

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="MMRS Member Royalty & Work Registration Portal"
            description="Claim disbursed streaming and radio royalties or register new musical compositions directly on the Ledger Court registry."
          >
            <div className="ent-about-grid">
              <section className="mmrs-search-panel ent-widget-stack">
                <h2 style={{ margin: 0 }}>Confidential Royalty Statement</h2>
                <p className="ent-mono-tag">
                  Account Holder: {data.playerArtist?.stageName ?? data.playerName} · Cycle {data.cycle}
                </p>
                <p style={{ margin: 0, fontSize: '0.86rem' }}>
                  Total Lifetime Earned:{' '}
                  <strong>{(data.playerArtist?.totalRoyaltiesEarned ?? 0).toLocaleString()} ₢</strong>
                  <br />
                  Unclaimed Disbursement Balance:{' '}
                  <strong>{(data.playerArtist?.unclaimedPlayerRoyalties ?? 0).toLocaleString()} ₢</strong>
                </p>
                <button type="button" className="ent-btn-primary" onClick={() => data.actions.claimRoyalties()}>
                  Claim Disbursed MMRS & Streaming Royalties
                </button>
              </section>

              <section className="mmrs-search-panel ent-widget-stack">
                <h2 style={{ margin: 0 }}>Register & Publish New Composition</h2>
                <ReleasePublishForm data={data} accentColor="#144952" />
              </section>
            </div>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
