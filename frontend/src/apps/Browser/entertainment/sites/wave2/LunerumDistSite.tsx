import { useState } from 'react';
import { RadioTower } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
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
    { id: 'about', path: '/about', label: 'About Lunerum' },
  ];

  return (
    <div className="ent-root site-lunerum" data-site-shell="release-console">
      <aside className="ln-rail" aria-label="Lunerum Dist workflow navigation">
        <div>
          <RadioTower size={19} aria-hidden="true" style={{ color: '#2dd4bf', marginBottom: '0.35rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.05rem', letterSpacing: '0.06em' }}>{site.name}</h1>
          <small style={{ color: 'var(--site-muted)', fontSize: '0.7rem' }}>Meridian Quay Data Exchange</small>
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
      </aside>

      <main className="ln-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#14b8a6" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* DISTRIBUTION HOME */}
        {routeId === 'home' && (
          <>
            <section className="ln-metric-card ent-widget-stack">
              <span className="ent-mono-tag" style={{ color: '#2dd4bf' }}>
                MASTER-RETAINED RELEASE OPERATIONS · CYCLE {data.cycle}
              </span>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.35rem, 2.8cqi, 2rem)' }}>{site.tagline}</h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', maxInlineSize: '46rem' }}>
                {site.description}
              </p>
              <div className="ent-action-row">
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary">
                  Open Artist Release Console
                </SiteLink>
                <button type="button" className="ent-btn-secondary" onClick={() => setDistDialogOpen(true)}>
                  Configure Distribution Agreement (92% Artist Share)
                </button>
              </div>
            </section>

            <div className="ln-metric-strip">
              <div className="ln-metric-card">
                <div className="ent-mono-tag" style={{ color: 'var(--site-muted)' }}>
                  MASTER RETENTION
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2dd4bf' }}>100%</div>
                <small style={{ color: 'var(--site-muted)' }}>Artists keep master ownership</small>
              </div>
              <div className="ln-metric-card">
                <div className="ent-mono-tag" style={{ color: 'var(--site-muted)' }}>
                  ARTIST ROYALTY SPLIT
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>92%</div>
                <small style={{ color: 'var(--site-muted)' }}>8% transparent delivery fee</small>
              </div>
              <div className="ln-metric-card">
                <div className="ent-mono-tag" style={{ color: 'var(--site-muted)' }}>
                  DELIVERED CATALOG
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{lunerumReleases.length}</div>
                <small style={{ color: 'var(--site-muted)' }}>Active public Songbird releases</small>
              </div>
            </div>

            <section className="ent-widget-stack">
              <h3 style={{ margin: 0 }}>Recent Public Deliveries</h3>
              <ul className="ent-ticket-list" role="list">
                {lunerumReleases.map((rel) => (
                  <li key={rel.releaseId} className="ent-ticket-item">
                    <div className="ent-ticket-meta">
                      <strong>{rel.title}</strong>
                      <span>
                        {rel.stageName} · {rel.format} · Cycle {rel.releaseCycle} · Delivered to {rel.platform}
                      </span>
                    </div>
                    <SiteLink href={crossSiteLinks.songbirdAlbum(rel.trackId)} navigate={navigate} className="ent-btn-secondary">
                      Verify on Songbird ↗
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* PLATFORMS / PRICING / RESOURCES */}
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

        {/* AUTHENTICATED ARTIST PORTAL */}
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
