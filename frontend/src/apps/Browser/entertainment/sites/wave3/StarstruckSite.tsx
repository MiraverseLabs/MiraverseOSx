import { useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog, type ContractKind } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function StarstruckSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [division, setDivision] = useState<'all' | 'music' | 'dance' | 'acting'>('all');
  const [dialogKind, setDialogKind] = useState<ContractKind | null>(null);

  const starstruckRoster = data.publicArtists.filter(
    (a) => a.managerOrgId === site.orgId || a.labelOrgId === site.orgId,
  );
  const filteredRoster =
    division === 'all' ? starstruckRoster : starstruckRoster.filter((a) => a.disciplines.includes(division));

  const navItems = [
    { id: 'home', path: '/', label: 'Talent' },
    { id: 'divisions', path: '/divisions', label: 'Divisions' },
    { id: 'projects', path: '/projects', label: 'Projects' },
    { id: 'news', path: '/news', label: 'News' },
    { id: 'representation', path: '/representation', label: 'Representation' },
    { id: 'portal', path: '/portal', label: 'Artist Portal' },
    { id: 'about', path: '/about', label: 'Showcase Tower' },
  ];

  const playerContracts = data.playerArtist
    ? data.ent.contracts.filter((c) => c.artistId === data.playerArtist!.artistId && c.status === 'active')
    : [];

  return (
    <div className="ent-root site-starstruck" data-site-shell="flagship-agency">
      <header className="ss-header">
        <div>
          <span className="ent-mono-tag" style={{ color: '#fda4af' }}>
            SHOWCASE TOWER · PROMENADE QUARTER, AURELINE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.3rem, 2.7cqi, 1.95rem)', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
        </div>
        <nav className="ss-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="ss-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#1d3587" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* TALENT HOME */}
        {routeId === 'home' && (
          <>
            <section className="ent-about-grid" style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--site-border)', alignItems: 'center' }}>
              <div className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
                  MAJOR ENTERTAINMENT & MANAGEMENT HOUSE
                </span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3cqi, 2.25rem)' }}>{site.tagline}</h2>
                <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {site.description}
                </p>
                <div className="ent-action-row">
                  <button type="button" className="ent-btn-primary" onClick={() => setDialogKind('management')}>
                    Negotiate Management Representation
                  </button>
                  <button type="button" className="ent-btn-secondary" onClick={() => setDialogKind('label')}>
                    Flagship Label Deal
                  </button>
                </div>
              </div>
              <img
                src="/media/albums/album-neon-starlight.jpg"
                alt="Starstruck Entertainment flagship showcase neon portrait"
                style={{ inlineSize: '100%', maxBlockSize: '260px', objectFit: 'cover' }}
              />
            </section>

            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                <h2 style={{ margin: 0 }}>Flagship Roster ({filteredRoster.length})</h2>
                <div className="ent-action-row">
                  {(['all', 'music', 'dance', 'acting'] as const).map((div) => (
                    <button
                      key={div}
                      type="button"
                      className={division === div ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.2rem 0.65rem', textTransform: 'capitalize' }}
                      onClick={() => setDivision(div)}
                    >
                      {div === 'all' ? 'All Divisions' : div}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ent-about-grid">
                {filteredRoster.map((art) => (
                  <article key={art.artistId} style={{ padding: '1.25rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>{art.stageName}</h3>
                      <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
                        {art.tier}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>{art.bio}</p>
                    <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} className="ent-btn-secondary" style={{ alignSelf: 'flex-start' }}>
                      Open Verified Songbird Page ↗
                    </SiteLink>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* DIVISIONS */}
        {routeId === 'divisions' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Showcase Tower Divisions</h2>
            <ul className="ent-dept-list" role="list">
              {(org.departments ?? []).map((d) => (
                <li key={d.id} style={{ background: '#ffffff' }}>
                  <strong>{d.name}</strong> — Head: {d.head}
                  <p className="ent-empty-note" style={{ marginTop: '0.3rem' }}>
                    {d.focus}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* PROJECTS & NEWS */}
        {(routeId === 'projects' || routeId === 'news') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'projects' ? 'Headline Tours, Campaigns & Releases' : 'Press Coverage & Announcements'}
            </h2>
            <ul className="ent-ticket-list" role="list">
              {routeId === 'projects'
                ? data.ent.concerts
                    .filter((c) => starstruckRoster.some((r) => r.artistId === c.artistId))
                    .map((c) => (
                      <li key={c.concertId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                        <div className="ent-ticket-meta">
                          <strong>{c.title}</strong>
                          <span>
                            {c.venue} · {c.dateLabel} · {c.ticketsSold.toLocaleString()} / {c.capacity.toLocaleString()}
                          </span>
                        </div>
                        <SiteLink href={crossSiteLinks.orgHome(c.venueOrgId, '/tickets')} navigate={navigate} className="ent-btn-secondary">
                          Box Office ↗
                        </SiteLink>
                      </li>
                    ))
                : data.ent.mediaItems.map((m) => (
                    <li key={m.mediaId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                      <div className="ent-ticket-meta">
                        <strong>{m.headline}</strong>
                        <span>
                          {m.outletName} · Cycle {m.cycle}
                        </span>
                        <small>{m.summary}</small>
                      </div>
                      <SiteLink href={crossSiteLinks.limelightStory(m.mediaId)} navigate={navigate} className="ent-btn-secondary">
                        Read on Limelight ↗
                      </SiteLink>
                    </li>
                  ))}
            </ul>
          </section>
        )}

        {/* REPRESENTATION */}
        {routeId === 'representation' && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Representation & Major Label Agreements</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Starstruck offers unmatched stadium routing, Pop Sticker priority spins, and Amrielle brand packaging
              alongside demanding commercial commitments. Standard commission:{' '}
              <strong>{Math.round((org.commissionRate ?? 0.22) * 100)}%</strong> · Baseline artist royalty split:{' '}
              <strong>{Math.round((org.royaltySplitArtist ?? 0.55) * 100)}%</strong>.
            </p>
            <div className="ent-action-row">
              <button type="button" className="ent-btn-primary" onClick={() => setDialogKind('management')}>
                Negotiate Management Contract
              </button>
              <button type="button" className="ent-btn-secondary" onClick={() => setDialogKind('label')}>
                Negotiate Major Label Deal
              </button>
            </div>
          </section>
        )}

        {/* AUTHENTICATED ARTIST PORTAL */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Starstruck Signed-Artist Portal"
            description="Inspect confidential contracts, obligation counts, and private royalty balances for Showcase Tower talent."
          >
            <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Signed Talent Desk</h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                Active contracts on your profile: <strong>{playerContracts.length}</strong> · Unclaimed royalties:{' '}
                <strong>{(data.playerArtist?.unclaimedPlayerRoyalties ?? 0).toLocaleString()} ₢</strong>
              </p>
              <div className="ent-action-row">
                <button type="button" className="ent-btn-primary" onClick={() => setDialogKind('management')}>
                  Renegotiate Representation
                </button>
                <button type="button" className="ent-btn-secondary" onClick={() => data.actions.claimRoyalties()}>
                  Claim Royalties
                </button>
              </div>
              {playerContracts.length > 0 && (
                <ul className="ent-ticket-list" role="list">
                  {playerContracts.map((c) => (
                    <li key={c.contractId} className="ent-ticket-item">
                      <div className="ent-ticket-meta">
                        <strong>{c.orgName}</strong>
                        <span>
                          {c.contractType.toUpperCase()} · {Math.round(c.royaltySplitArtist * 100)}% artist split ·
                          Expires Cycle {c.expiresCycle}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        onClick={() => data.actions.terminateContract(c.contractId)}
                      >
                        End Deal
                      </button>
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
        open={dialogKind !== null}
        onClose={() => setDialogKind(null)}
        site={site}
        org={org}
        contractType={dialogKind ?? 'management'}
        data={data}
      />
    </div>
  );
}
