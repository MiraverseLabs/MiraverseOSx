import { useId, useState } from 'react';
import { BookOpenCheck, Scale, Search } from 'lucide-react';
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
  const [query, setQuery] = useState(resolved.params.get('q') ?? '');

  const registeredWorks = data.ent.tracks.filter((t) => t.mmrsRegistered);
  const matchingWorks = registeredWorks.filter((t) => {
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
    { id: 'home', path: '/', label: 'Registry Home' },
    { id: 'repertoire', path: '/repertoire', label: 'Repertoire Search' },
    { id: 'licensing', path: '/licensing', label: 'Licensing' },
    { id: 'royalties', path: '/royalties', label: 'Royalties' },
    { id: 'registration', path: '/registration', label: 'Registration' },
    { id: 'portal', path: '/portal', label: 'Member Portal' },
    { id: 'about', path: '/about', label: 'About MMRS' },
  ];

  const renderRepertoireSearch = () => (
    <section className="mmrs-search-panel ent-widget-stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Search size={18} aria-hidden="true" style={{ color: '#1e2d68' }} />
        <h2 style={{ margin: 0 }}>Public Repertoire & Composition Lookup</h2>
      </div>
      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)' }}>
        Search publicly registered musical compositions across all eight realms. Private writer split sheets and
        royalty disbursements are restricted to the signed-in Member Portal.
      </p>
      <div className="ent-field" style={{ maxInlineSize: '30rem' }}>
        <label htmlFor={searchId} className="ent-field-label">
          Work Title, Writer/Performer, or Work ID
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search registered works (e.g. Neon Over Silverleaf, NYLA, TRK-SEED)..."
          className="ent-input"
        />
      </div>

      <div className="ent-table-scroll" tabIndex={0}>
        <table className="ent-data-table">
          <caption>MMRS Public Registered Works Ledger ({matchingWorks.length} works)</caption>
          <thead>
            <tr>
              <th scope="col">Work ID</th>
              <th scope="col">Title</th>
              <th scope="col">Primary Performer</th>
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
  );

  return (
    <div className="ent-root site-mmrs" data-site-shell="rights-registry">
      <header className="mmrs-banner">
        <div>
          <span className="ent-mono-tag" style={{ color: '#fcd34d' }}>
            LEDGER COURT, AURELINE · PAN-MERIDION COLLECTIVE RIGHTS
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.2rem, 2.4cqi, 1.65rem)' }}>{site.name}</h1>
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
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#1e2d68" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME & REPERTOIRE SEARCH */}
        {(routeId === 'home' || routeId === 'repertoire') && (
          <>
            {renderRepertoireSearch()}
            {routeId === 'home' && (
              <div className="ent-about-grid">
                <article className="mmrs-search-panel ent-widget-stack">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Scale size={16} aria-hidden="true" />
                    <span>Blanket Broadcast & Venue Licensing</span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                    MMRS collects performance license remittances from Songbird, Pop Sticker Radio, Silverleaf Stadium,
                    and regional clubs so every public play is accounted for.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/licensing')} navigate={navigate} className="ent-btn-secondary">
                    Licensing Schedule
                  </SiteLink>
                </article>
                <article className="mmrs-search-panel ent-widget-stack">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpenCheck size={16} aria-hidden="true" />
                    <span>Writer & Publisher Member Portal</span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                    Sign in to register new works, review confidential cycle royalty disbursements, and claim accrued
                    performance balances.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary">
                    Open Member Portal
                  </SiteLink>
                </article>
              </div>
            )}
          </>
        )}

        {/* LICENSING */}
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

        {/* ROYALTIES (Public explainer; actual private payout gated to Member Portal!) */}
        {routeId === 'royalties' && (
          <section className="mmrs-search-panel ent-widget-stack">
            <h2 style={{ margin: 0 }}>How Meridion Performance Royalties Work</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              MMRS distributes royalties every simulation cycle based on verified Songbird streams, Pop Sticker spins,
              and licensed concert performances. Individual statements and payout balances are confidential and
              accessible exclusively through your authenticated Member Portal.
            </p>
            <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary">
              Sign In to View Personal Statements
            </SiteLink>
          </section>
        )}

        {/* REGISTRATION */}
        {routeId === 'registration' && (
          <section className="mmrs-search-panel ent-widget-stack">
            <h2 style={{ margin: 0 }}>Composition Registration Standards</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Led by Comptroller Aldous Bell. Works published through Songbird, Lunerum Dist, or Kaji Publishing
              Studios receive an immutable MMRS ledger entry linking writer shares and master custody.
            </p>
            <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary">
              Register a New Work in Member Portal
            </SiteLink>
          </section>
        )}

        {/* AUTHENTICATED MEMBER PORTAL */}
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
                <ReleasePublishForm data={data} accentColor="#1e2d68" />
              </section>
            </div>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
