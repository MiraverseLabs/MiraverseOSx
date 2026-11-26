import { useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog, type ContractKind } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

type DivisionFilter = 'all' | 'music' | 'dance' | 'acting' | 'modeling';
type MemberProfileTab = 'overview' | 'stats' | 'credits';

export function StarstruckSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [division, setDivision] = useState<DivisionFilter>('all');
  const [dialogKind, setDialogKind] = useState<ContractKind | null>(null);
  const [activeTabByArtist, setActiveTabByArtist] = useState<Record<string, MemberProfileTab>>({});

  const starstruckRoster = data.publicArtists.filter(
    (a) => a.managerOrgId === site.orgId || a.labelOrgId === site.orgId,
  );
  const filteredRoster =
    division === 'all'
      ? starstruckRoster
      : starstruckRoster.filter((a) => a.disciplines.some((d) => d === division));

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

  const getTab = (artistId: string): MemberProfileTab => activeTabByArtist[artistId] ?? 'overview';

  return (
    <div className="ent-root site-starstruck" data-site-shell="flagship-agency">
      <header className="ss-header">
        <div>
          <span className="ent-mono-tag" style={{ color: '#fda4af' }}>
            SHOWCASE TOWER · PROMENADE QUARTER, AURELINE
          </span>
          <h1
            style={{
              margin: '0.15rem 0 0',
              fontSize: 'clamp(1.3rem, 2.7cqi, 1.95rem)',
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
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
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#162c7a" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* TALENT HOME (PDF p. 64 — Cobalt & Ivory Flagship Agency) */}
        {routeId === 'home' && (
          <>
            {/* Showcase Tower Widescreen Hero */}
            <section
              style={{
                background: 'linear-gradient(125deg, #0d1a4b 0%, #162c7a 62%, #231942 100%)',
                color: '#ffffff',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid #0d1a4b',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                alignItems: 'stretch',
              }}
            >
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <span className="ent-mono-tag" style={{ color: '#fda4af' }}>
                  MAJOR ENTERTAINMENT & MANAGEMENT HOUSE · FLAGSHIP ROSTER
                </span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.55rem, 3.2cqi, 2.35rem)', lineHeight: 1.12, fontWeight: 900 }}>
                  {site.tagline}
                </h2>
                <p style={{ margin: 0, color: '#dbeafe', fontSize: '0.92rem', lineHeight: 1.65 }}>
                  {site.description}
                </p>

                {/* Flagship Agency KPI Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '0.65rem',
                    paddingTop: '0.5rem',
                    borderBlockStart: '1px solid rgba(255, 255, 255, 0.16)',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.2rem', color: '#ffffff' }}>
                      {starstruckRoster.length}
                    </strong>
                    <small style={{ color: '#bfdbfe', fontSize: '0.72rem' }}>Signed Flagships</small>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.2rem', color: '#fda4af' }}>
                      {Math.round((org.commissionRate ?? 0.22) * 100)}%
                    </strong>
                    <small style={{ color: '#bfdbfe', fontSize: '0.72rem' }}>Mgmt Commission</small>
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.2rem', color: '#ffffff' }}>
                      {Math.round((org.royaltySplitArtist ?? 0.55) * 100)}%
                    </strong>
                    <small style={{ color: '#bfdbfe', fontSize: '0.72rem' }}>Baseline Split</small>
                  </div>
                </div>

                <div className="ent-action-row" style={{ marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="ent-btn-primary"
                    style={{ background: '#e11d48', color: '#ffffff' }}
                    onClick={() => setDialogKind('management')}
                  >
                    Negotiate Management Representation
                  </button>
                  <button
                    type="button"
                    className="ent-btn-secondary"
                    style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.35)' }}
                    onClick={() => setDialogKind('label')}
                  >
                    Flagship Label Deal
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative', minBlockSize: '250px' }}>
                <img
                  src="/media/albums/album-neon-starlight.jpg"
                  alt="Starstruck Entertainment Showcase Tower neon concert spotlight"
                  style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </section>

            {/* Division Selector & Interactive Roster Member Cards */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
                    SHOWCASE TOWER REPRESENTATION
                  </span>
                  <h2 style={{ margin: '0.2rem 0 0' }}>Flagship Roster ({filteredRoster.length})</h2>
                </div>
                <div className="ent-action-row" role="group" aria-label="Filter Starstruck roster by division">
                  {(['all', 'music', 'dance', 'acting', 'modeling'] as const).map((div) => (
                    <button
                      key={div}
                      type="button"
                      className={division === div ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.25rem 0.72rem', textTransform: 'capitalize' }}
                      onClick={() => setDivision(div)}
                    >
                      {div === 'all' ? 'All Divisions' : div}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRoster.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem',
                    background: '#ffffff',
                    border: '1px solid var(--site-border)',
                    borderRadius: '0.55rem',
                  }}
                  className="ent-widget-stack"
                >
                  <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.9rem' }}>
                    No Showcase Tower roster artists currently carry a primary “{division}” tag. Runway & editorial
                    modeling placements are coordinated jointly with Willow Whisper Modeling Agency.
                  </p>
                  <div className="ent-action-row">
                    <button type="button" className="ent-btn-primary" onClick={() => setDivision('all')}>
                      Show All Flagship Talent
                    </button>
                    <SiteLink href={crossSiteLinks.orgHome('ORG_WILLOW_WHISPER')} navigate={navigate} className="ent-btn-secondary">
                      Willow Whisper Partner Roster ↗
                    </SiteLink>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.15rem' }}>
                  {filteredRoster.map((art) => {
                    const activeTab = getTab(art.artistId);
                    const artistReleases = data.ent.releases.filter((r) => r.artistId === art.artistId);
                    const artistTracks = data.ent.tracks.filter((t) => t.artistId === art.artistId);
                    const artistConcerts = data.ent.concerts.filter((c) => c.artistId === art.artistId);
                    const coverImage =
                      artistTracks[0]?.coverArtUrl ??
                      (art.disciplines.includes('dance')
                        ? '/media/entertainment/femme-fatale-rehearsal.jpg'
                        : '/media/albums/album-neon-starlight.jpg');

                    return (
                      <article
                        key={art.artistId}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--site-border)',
                          borderBlockStart: '4px solid #162c7a',
                          borderRadius: '0.6rem',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', gap: '0.9rem', padding: '1rem', alignItems: 'center', background: '#f8f9fd', borderBlockEnd: '1px solid var(--site-border)' }}>
                          <img
                            src={coverImage}
                            alt={`Editorial portrait for ${art.stageName}`}
                            style={{ inlineSize: '104px', blockSize: '104px', objectFit: 'cover', borderRadius: '0.45rem' }}
                          />
                          <div>
                            <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
                              {art.tier} · {art.disciplines.join(' / ')}
                            </span>
                            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.22rem' }}>{art.stageName}</h3>
                            <small style={{ color: 'var(--site-muted)' }}>
                              {art.labelOrgId === site.orgId ? 'Flagship Label & Management' : 'Showcase Management'}
                            </small>
                          </div>
                        </div>

                        {/* Individual Member Profile Tabs */}
                        <div
                          role="tablist"
                          aria-label={`${art.stageName} profile sections`}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            borderBlockEnd: '1px solid var(--site-border)',
                            background: '#ffffff',
                          }}
                        >
                          {(['overview', 'stats', 'credits'] as const).map((tabKey) => (
                            <button
                              key={tabKey}
                              type="button"
                              role="tab"
                              aria-selected={activeTab === tabKey}
                              onClick={() =>
                                setActiveTabByArtist((prev) => ({
                                  ...prev,
                                  [art.artistId]: tabKey,
                                }))
                              }
                              style={{
                                padding: '0.55rem 0.5rem',
                                border: 0,
                                borderBlockEnd: activeTab === tabKey ? '2px solid #e11d48' : '2px solid transparent',
                                background: activeTab === tabKey ? '#f6f7fc' : 'transparent',
                                color: activeTab === tabKey ? '#0d1a4b' : 'var(--site-muted)',
                                fontWeight: activeTab === tabKey ? 800 : 600,
                                fontSize: '0.74rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                cursor: 'pointer',
                              }}
                            >
                              {tabKey === 'overview' ? 'Overview' : tabKey === 'stats' ? 'Stats & Reach' : 'Credits'}
                            </button>
                          ))}
                        </div>

                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                          {activeTab === 'overview' && (
                            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                              {art.bio}
                            </p>
                          )}

                          {activeTab === 'stats' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.55rem' }}>
                              <div style={{ padding: '0.6rem', background: '#f6f7fc', borderRadius: '0.4rem', border: '1px solid var(--site-border)' }}>
                                <small style={{ display: 'block', color: 'var(--site-muted)', fontSize: '0.7rem' }}>Monthly Listeners</small>
                                <strong style={{ fontSize: '0.96rem', color: '#0d1a4b' }}>
                                  {art.monthlyListeners.toLocaleString()}
                                </strong>
                              </div>
                              <div style={{ padding: '0.6rem', background: '#f6f7fc', borderRadius: '0.4rem', border: '1px solid var(--site-border)' }}>
                                <small style={{ display: 'block', color: 'var(--site-muted)', fontSize: '0.7rem' }}>Credibility</small>
                                <strong style={{ fontSize: '0.96rem', color: '#0d1a4b' }}>{art.artisticCredibility} / 100</strong>
                              </div>
                              <div style={{ padding: '0.6rem', background: '#f6f7fc', borderRadius: '0.4rem', border: '1px solid var(--site-border)' }}>
                                <small style={{ display: 'block', color: 'var(--site-muted)', fontSize: '0.7rem' }}>Media Visibility</small>
                                <strong style={{ fontSize: '0.96rem', color: '#e11d48' }}>{art.mediaVisibility} / 100</strong>
                              </div>
                            </div>
                          )}

                          {activeTab === 'credits' && (
                            <div style={{ fontSize: '0.84rem', color: 'var(--site-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <div>
                                <strong style={{ color: 'var(--site-ink)' }}>Catalog Releases ({artistReleases.length}):</strong>{' '}
                                {artistReleases.length > 0
                                  ? artistReleases.map((r) => r.title).join(', ')
                                  : 'Exclusive touring & stage engagements'}
                              </div>
                              <div>
                                <strong style={{ color: 'var(--site-ink)' }}>Headline Dates ({artistConcerts.length}):</strong>{' '}
                                {artistConcerts.length > 0
                                  ? artistConcerts.map((c) => `${c.title} @ ${c.venue}`).join('; ')
                                  : 'Upcoming Showcase Tower routing'}
                              </div>
                            </div>
                          )}

                          <div className="ent-action-row" style={{ marginTop: 'auto' }}>
                            <SiteLink
                              href={crossSiteLinks.songbirdArtist(art.artistId)}
                              navigate={navigate}
                              className="ent-btn-secondary"
                            >
                              Open Verified Songbird Page ↗
                            </SiteLink>
                            <SiteLink href={buildSiteUrl(site, '/projects')} navigate={navigate} className="ent-btn-secondary">
                              Tour & Campaigns →
                            </SiteLink>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Partner Network Strip */}
            <section
              style={{
                padding: '1.15rem 1.35rem',
                background: '#ffffff',
                border: '1px solid var(--site-border)',
                borderRadius: '0.6rem',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div>
                <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
                  FLAGSHIP ECOSYSTEM PARTNERS
                </span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                  Priority routing across Silverleaf Stadium, Pop Sticker Radio, Amrielle brand campaigns, and Limelight cover stories.
                </p>
              </div>
              <div className="ent-action-row">
                <SiteLink href={crossSiteLinks.orgHome('ORG_SILVERLEAF_STADIUM')} navigate={navigate} className="ent-btn-secondary">
                  Silverleaf ↗
                </SiteLink>
                <SiteLink href={crossSiteLinks.orgHome('ORG_POP_STICKER')} navigate={navigate} className="ent-btn-secondary">
                  Pop Sticker ↗
                </SiteLink>
                <SiteLink href={crossSiteLinks.orgHome('ORG_AMRIELLE')} navigate={navigate} className="ent-btn-secondary">
                  Amrielle ↗
                </SiteLink>
                <SiteLink href={crossSiteLinks.orgHome('ORG_LIMELIGHT')} navigate={navigate} className="ent-btn-secondary">
                  Limelight ↗
                </SiteLink>
              </div>
            </section>
          </>
        )}

        {/* DIVISIONS */}
        {routeId === 'divisions' && (
          <section className="ent-widget-stack">
            <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
              ORGANIZATION ARCHITECTURE
            </span>
            <h2 style={{ margin: 0 }}>Showcase Tower Divisions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {(org.departments ?? []).map((d) => (
                <article
                  key={d.id}
                  style={{
                    padding: '1.15rem',
                    background: '#ffffff',
                    border: '1px solid var(--site-border)',
                    borderBlockStart: '3px solid #162c7a',
                    borderRadius: '0.5rem',
                  }}
                >
                  <strong style={{ fontSize: '1.02rem', color: '#0d1a4b' }}>{d.name}</strong>
                  <div className="ent-mono-tag" style={{ color: '#e11d48', marginTop: '0.2rem' }}>
                    HEAD: {d.head}
                  </div>
                  <p className="ent-empty-note" style={{ marginTop: '0.45rem' }}>
                    {d.focus}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS & NEWS */}
        {(routeId === 'projects' || routeId === 'news') && (
          <section className="ent-widget-stack">
            <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
              {routeId === 'projects' ? 'LIVE ROUTING & CAMPAIGNS' : 'PRESS DESK'}
            </span>
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
          <section
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              border: '1px solid var(--site-border)',
              borderBlockStart: '4px solid #e11d48',
              borderRadius: '0.6rem',
            }}
            className="ent-widget-stack"
          >
            <span className="ent-mono-tag" style={{ color: '#e11d48' }}>
              DEAL STRUCTURE · SHOWCASE TOWER
            </span>
            <h2 style={{ margin: 0 }}>Representation & Major Label Agreements</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>
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
            <section
              style={{
                padding: '1.45rem',
                background: '#ffffff',
                border: '1px solid var(--site-border)',
                borderBlockStart: '4px solid #162c7a',
                borderRadius: '0.6rem',
              }}
              className="ent-widget-stack"
            >
              <h2 style={{ margin: 0 }}>Signed Talent Desk</h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)' }}>
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
