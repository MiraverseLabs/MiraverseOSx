import { useState } from 'react';
import { BarChart3, Calendar, RadioTower, Share2, Upload } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks, getTrackCoverUrl } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { ReleasePublishForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function LunerumDistSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [distDialogOpen, setDistDialogOpen] = useState(false);

  const lunerumReleases = data.ent.releases.filter((r) => r.distributorOrgId === site.orgId);

  const navItems = [
    { id: 'home', path: '/', label: 'Distribution' },
    { id: 'platforms', path: '/platforms', label: 'Platforms' },
    { id: 'pricing', path: '/pricing', label: 'Pricing' },
    { id: 'resources', path: '/resources', label: 'Resources' },
    { id: 'portal', path: '/portal', label: 'Artist Portal' },
    { id: 'about', path: '/about', label: 'About' },
  ];

  return (
    <div className="ent-root site-lunerum" data-site-shell="release-console">
      <header className="ln-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <RadioTower size={18} aria-hidden="true" style={{ color: '#2dd4bf' }} />
          <h1 style={{ margin: 0, fontSize: '1.05rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
        </div>
        <nav className="ln-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="ln-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#14b8a6" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* DISTRIBUTION HOME — Round 1/2 Console Layout (PDF p. 21) */}
        {routeId === 'home' && (
          <>
            <section className="ln-hero" aria-label="Lunerum Dist release operations">
              <img
                src="/media/entertainment/lunerum-mixing-console.jpg"
                alt="Independent producer working at a dark violet and teal mixing console"
                onError={(e) => {
                  e.currentTarget.src = '/media/albums/album-prism-eclipse.jpg';
                }}
              />
              <div className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#5eead4' }}>
                  MUSIC DISTRIBUTION · RELEASE MANAGEMENT · 100% MASTER RETENTION
                </span>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.65rem, 3.2cqi, 2.45rem)', lineHeight: 1.05 }}>
                  Release, Distribute, and Grow.
                </h2>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.86rem', maxInlineSize: '34rem' }}>
                  {site.description}
                </p>
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary" style={{ borderRadius: '999px', background: 'linear-gradient(90deg, #8b5cf6, #14b8a6)', color: '#ffffff' }}>
                    Start a Release →
                  </SiteLink>
                  <button type="button" className="ent-btn-secondary" style={{ borderRadius: '999px' }} onClick={() => setDistDialogOpen(true)}>
                    Configure 92% Artist Deal
                  </button>
                </div>
              </div>

              <aside className="ln-metric-card" style={{ background: 'rgba(12, 16, 36, 0.88)', backdropFilter: 'blur(8px)' }} aria-label="Platform highlights">
                <span className="ent-mono-tag" style={{ color: '#5eead4' }}>
                  NETWORK TELEMETRY · CYCLE {data.cycle}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBlock: '0.7rem' }}>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{lunerumReleases.length}</div>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.68rem' }}>Active</small>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2dd4bf' }}>92%</div>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.68rem' }}>Artist Split</small>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c4b5fd' }}>100%</div>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.68rem' }}>Masters</small>
                  </div>
                </div>
                <small style={{ color: 'var(--site-muted)', fontSize: '0.72rem' }}>
                  Private artist earnings and statements are protected inside the authenticated Artist Portal.
                </small>
              </aside>
            </section>

            {/* 4-Step Horizontal Workflow Bar (PDF p. 21) */}
            <section className="ln-workflow-strip" aria-label="Distribution workflow steps">
              {[
                { title: 'Upload', desc: 'Deliver master stems, sleeve art & credits.', icon: Upload },
                { title: 'Manage', desc: 'Coordinate schedules & collaborator splits.', icon: Calendar },
                { title: 'Distribute', desc: 'Route to Songbird, Pop Sticker & shops.', icon: Share2 },
                { title: 'Analyze', desc: 'Claim private royalties in Artist Portal.', icon: BarChart3 },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="ln-step-card">
                    <Icon size={18} aria-hidden="true" style={{ color: '#2dd4bf', flexShrink: 0, marginTop: '0.15rem' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.88rem' }}>{step.title}</strong>
                      <small style={{ color: 'var(--site-muted)', fontSize: '0.74rem' }}>{step.desc}</small>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* 3-Column Operations Grid */}
            <section className="ln-ops-grid">
              <div className="ln-metric-card ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Active Releases</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.65rem' }}>
                  {lunerumReleases.map((rel) => {
                    const trk = data.ent.tracks.find((t) => t.trackId === rel.trackId);
                    return (
                      <article key={rel.releaseId} style={{ background: '#0c1024', border: '1px solid var(--site-border)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                        {trk && (
                          <img src={getTrackCoverUrl(trk)} alt="" loading="lazy" style={{ inlineSize: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '0.35rem', marginBottom: '0.35rem' }} />
                        )}
                        <strong style={{ display: 'block', fontSize: '0.76rem' }}>{rel.title}</strong>
                        <small style={{ color: 'var(--site-muted)', fontSize: '0.68rem' }}>{rel.stageName}</small>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="ln-metric-card ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Release Schedule</h3>
                {lunerumReleases.map((rel) => (
                  <div key={rel.releaseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingBlockEnd: '0.55rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <div>
                      <strong style={{ fontSize: '0.8rem' }}>{rel.title}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--site-muted)' }}>
                        Cycle {rel.releaseCycle} · {rel.platform}
                      </div>
                    </div>
                    <SiteLink href={crossSiteLinks.songbirdAlbum(rel.trackId)} navigate={navigate} className="ent-mono-tag" style={{ color: '#2dd4bf' }}>
                      Live ↗
                    </SiteLink>
                  </div>
                ))}
              </div>

              <aside className="ln-metric-card ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.96rem' }}>Distribution for Independent Artists</h3>
                <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.78rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                  <li>Zero master ownership transfer</li>
                  <li>92% artist net royalty pass-through</li>
                  <li>Automatic MMRS split-sheet sync</li>
                  <li>Direct Songbird & Pop Sticker delivery</li>
                </ul>
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary" style={{ borderRadius: '999px' }}>
                  Open Artist Portal →
                </SiteLink>
              </aside>
            </section>
          </>
        )}

        {(routeId === 'platforms' || routeId === 'pricing' || routeId === 'resources') && (
          <section className="ln-metric-card ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'platforms'
                ? 'Connected Outlet Delivery Network'
                : routeId === 'pricing'
                  ? 'Transparent Independent Distribution Splits'
                  : 'Metadata & Split-Sheet Standards'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.65 }}>
              {routeId === 'platforms'
                ? 'Nolan Vale’s Outlet Delivery desk ingests master stems directly into Songbird, Pop Sticker Radio Booth 88 airplay pools, and regional Marlowe/Aureline record shops.'
                : routeId === 'pricing'
                  ? 'Lunerum Dist retains 8% commission with 92% net royalties routed straight to artists and collaborators. No master lock-in, no hidden recoupment clauses.'
                  : 'Priya Oryn’s Split & Statement Accounting publishes clean collaborator split sheets synced automatically with the Meridion Music Rights Society (MMRS).'}
            </p>
            <button type="button" className="ent-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setDistDialogOpen(true)}>
              Sign 92% Artist-Master Distribution Deal
            </button>
          </section>
        )}

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Lunerum Dist Release & Split Analytics Portal"
            description="Ingest new master recordings directly to Songbird with 100% master retention and view private collaborator royalty statements."
          >
            <div className="ent-about-grid">
              <section className="ln-metric-card ent-widget-stack">
                <h2 style={{ margin: 0 }}>Deliver New Independent Master</h2>
                <ReleasePublishForm data={data} distributorOrgId={site.orgId} accentColor="#14b8a6" />
              </section>
              <section className="ln-metric-card ent-widget-stack">
                <h2 style={{ margin: 0 }}>Private Statement & Payouts</h2>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                  Unclaimed artist balance:{' '}
                  <strong style={{ color: '#2dd4bf' }}>
                    {(data.playerArtist?.unclaimedPlayerRoyalties ?? 0).toLocaleString()} ₢
                  </strong>
                </p>
                <div className="ent-action-row">
                  <button type="button" className="ent-btn-primary" onClick={() => data.actions.claimRoyalties()}>
                    Disburse Royalties
                  </button>
                  <button type="button" className="ent-btn-secondary" onClick={() => setDistDialogOpen(true)}>
                    Manage Distribution Terms
                  </button>
                </div>
              </section>
            </div>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={distDialogOpen}
        onClose={() => setDistDialogOpen(false)}
        site={site}
        org={org}
        contractType="distribution"
        data={data}
      />
    </div>
  );
}
