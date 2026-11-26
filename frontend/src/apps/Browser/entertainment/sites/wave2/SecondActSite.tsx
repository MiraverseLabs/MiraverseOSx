import { useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function SecondActSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [mgmtDialogOpen, setMgmtDialogOpen] = useState(false);

  const clients = data.publicArtists.filter((a) => a.managerOrgId === site.orgId);

  const navItems = [
    { id: 'home', path: '/', label: 'Our Clients' },
    { id: 'management', path: '/management', label: 'Management' },
    { id: 'career-development', path: '/career-development', label: 'Career Development' },
    { id: 'inquiries', path: '/inquiries', label: 'Inquiries' },
    { id: 'portal', path: '/portal', label: 'Client Access' },
    { id: 'about', path: '/about', label: 'Dawnson Green' },
  ];

  return (
    <div className="ent-root site-secondact" data-site-shell="boutique-agency">
      <header className="sa-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.35rem, 2.8cqi, 2rem)', fontWeight: 500 }}>{site.name}</h1>
          <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--site-muted)' }}>
            Dawnson Green, Aureline · Independent Artist & Performer Management
          </span>
        </div>
        <nav className="sa-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="sa-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7a3e38" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* OUR CLIENTS HOME */}
        {routeId === 'home' && (
          <>
            <section style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.4rem, 2.8cqi, 2rem)', fontWeight: 500 }}>
                {site.tagline}
              </h2>
              <p style={{ margin: '0 0 1rem', fontSize: '0.94rem', color: 'var(--site-muted)', maxInlineSize: '48rem', lineHeight: 1.65 }}>
                {site.description}
              </p>
              <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <button type="button" className="ent-btn-primary" onClick={() => setMgmtDialogOpen(true)}>
                  Request Representation Consultation
                </button>
                <SiteLink href={buildSiteUrl(site, '/career-development')} navigate={navigate} className="ent-btn-secondary">
                  Our Philosophy
                </SiteLink>
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontWeight: 500 }}>Represented Clients ({clients.length})</h2>
              <div className="ent-about-grid">
                {clients.map((cl) => (
                  <article key={cl.artistId} style={{ padding: '1.2rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{cl.stageName}</h3>
                      <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                        {cl.tier}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)', margin: '0.3rem 0 0.65rem' }}>
                      {cl.disciplines.join(' · ')}
                    </p>
                    <p style={{ margin: '0 0 0.9rem', fontSize: '0.88rem', lineHeight: 1.55 }}>{cl.bio}</p>
                    <SiteLink href={crossSiteLinks.songbirdArtist(cl.artistId)} navigate={navigate} className="ent-btn-secondary" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      Public Profile ↗
                    </SiteLink>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* MANAGEMENT & CAREER DEVELOPMENT */}
        {(routeId === 'management' || routeId === 'career-development' || routeId === 'inquiries') && (
          <section style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>
              {routeId === 'management'
                ? 'Boutique Representation Terms'
                : routeId === 'career-development'
                  ? 'Sustainable Pacing & Creative Pivots'
                  : 'Representation Inquiries'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.94rem', lineHeight: 1.65 }}>
              Led by Eleanor Vance and Samir Lind. Second Act takes a calm{' '}
              <strong>{Math.round((org.commissionRate ?? 0.12) * 100)}% commission</strong> with a{' '}
              <strong>{Math.round((org.royaltySplitArtist ?? 0.88) * 100)}% artist royalty baseline</strong>, helping
              performers transition cleanly away from overextended major-house obligations when needed.
            </p>
            <button
              type="button"
              className="ent-btn-primary"
              style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
              onClick={() => setMgmtDialogOpen(true)}
            >
              Negotiate / Switch to Second Act Management
            </button>
          </section>
        )}

        {/* AUTHENTICATED CLIENT ACCESS */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Second Act Private Client Access"
            description="Review active management terms, transition cleanly from another management firm, or coordinate with Word of Mouth Publicity."
          >
            <section style={{ padding: '1.3rem', background: '#ffffff', border: '1px solid var(--site-border)', fontFamily: 'system-ui, sans-serif' }} className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Client Representation Desk</h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                Current Manager:{' '}
                <strong>{data.playerArtist?.managerOrgId || 'Independent / Unrepresented'}</strong>
              </p>
              <div className="ent-action-row">
                <button type="button" className="ent-btn-primary" onClick={() => setMgmtDialogOpen(true)}>
                  Sign or Switch Management Contract
                </button>
                <SiteLink href={crossSiteLinks.orgHome('ORG_WORD_OF_MOUTH', '/portal')} navigate={navigate} className="ent-btn-secondary">
                  Coordinate PR with Word of Mouth ↗
                </SiteLink>
              </div>
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={mgmtDialogOpen}
        onClose={() => setMgmtDialogOpen(false)}
        site={site}
        org={org}
        contractType="management"
        data={data}
      />
    </div>
  );
}
