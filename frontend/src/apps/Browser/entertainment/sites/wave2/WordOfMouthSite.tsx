import { useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function WordOfMouthSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [prDialogOpen, setPrDialogOpen] = useState(false);

  const prClients = data.publicArtists.filter((a) => a.prOrgId === site.orgId);
  const activeControversies = data.ent.controversies.filter((c) => c.status === 'active');

  const navItems = [
    { id: 'home', path: '/', label: 'Pressroom' },
    { id: 'services', path: '/services', label: 'Services' },
    { id: 'campaigns', path: '/campaigns', label: 'Campaigns' },
    { id: 'clients', path: '/clients', label: 'Clients' },
    { id: 'portal', path: '/portal', label: 'Client Access' },
    { id: 'about', path: '/about', label: 'About' },
  ];

  return (
    <div className="ent-root site-wordofmouth" data-site-shell="pressroom">
      <header className="wom-header">
        <div>
          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
            19 ROSEMONT LANE, AURELINE · PUBLIC RELATIONS & PRESS COUNSEL
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.25rem, 2.5cqi, 1.75rem)', fontWeight: 900 }}>
            {site.name}
          </h1>
        </div>
        <nav className="wom-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="wom-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#9b1c3c" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* PRESSROOM HOME */}
        {routeId === 'home' && (
          <>
            <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)', borderInlineStart: '5px solid var(--site-accent)' }}>
              <h2 style={{ margin: '0 0 0.45rem' }}>{site.tagline}</h2>
              <p style={{ margin: '0 0 1rem', color: 'var(--site-muted)', fontSize: '0.88rem', maxInlineSize: '48rem' }}>
                {site.description}
              </p>
              <div className="ent-action-row">
                <button type="button" className="ent-btn-primary" onClick={() => setPrDialogOpen(true)}>
                  Retain Word of Mouth Publicity
                </button>
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-secondary">
                  Client Strategy Portal
                </SiteLink>
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Published Press Releases & Coverage Index</h2>
              <ul className="ent-ticket-list" role="list">
                {data.ent.mediaItems.map((item) => (
                  <li key={item.mediaId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                    <div className="ent-ticket-meta">
                      <strong>{item.headline}</strong>
                      <span>
                        {item.outletName} · Cycle {item.cycle} · Tone: {item.sentiment}
                      </span>
                      <small>{item.summary}</small>
                    </div>
                    <SiteLink href={crossSiteLinks.limelightStory(item.mediaId)} navigate={navigate} className="ent-btn-secondary">
                      Read Dispatch ↗
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* SERVICES / CAMPAIGNS */}
        {(routeId === 'services' || routeId === 'campaigns') && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'services' ? 'Release Campaigns, Exclusives & Statement Strategy' : 'Active Brand & Award PR Campaigns'}
            </h2>
            <ul className="ent-dept-list" role="list">
              {(org.departments ?? []).map((d) => (
                <li key={d.id}>
                  <strong>{d.name}</strong> — Head: {d.head}
                  <p className="ent-empty-note" style={{ marginTop: '0.3rem' }}>
                    {d.focus}
                  </p>
                </li>
              ))}
            </ul>
            <div className="ent-action-row">
              <button type="button" className="ent-btn-primary" onClick={() => setPrDialogOpen(true)}>
                Retain Word of Mouth PR
              </button>
              <button
                type="button"
                className="ent-btn-secondary"
                onClick={() => data.actions.acceptAppearance('ORG_LIMELIGHT', 'interview')}
              >
                Place Limelight Exclusive Interview
              </button>
            </div>
          </section>
        )}

        {/* CLIENTS */}
        {routeId === 'clients' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Publicly Credited PR Roster</h2>
            <div className="ent-directory-grid">
              {prClients.map((c) => (
                <article key={c.artistId} className="ent-directory-card" style={{ background: '#ffffff' }}>
                  <h3>{c.stageName}</h3>
                  <p>
                    {c.tier} · Media Visibility {c.mediaVisibility}
                  </p>
                  <p>{c.bio}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* AUTHENTICATED CLIENT ACCESS (PR Retainers & Crisis/Controversy Response) */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Word of Mouth Confidential Client Crisis & Media Portal"
            description="Coordinate press placements, issue calibrated crisis statements, and manage your publicity retainer."
          >
            <section className="ent-widget-stack">
              <div style={{ padding: '1.25rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                <h2 style={{ margin: 0 }}>Media Desk Actions</h2>
                <div className="ent-action-row">
                  <button type="button" className="ent-btn-primary" onClick={() => setPrDialogOpen(true)}>
                    Sign / Update Publicity Retainer
                  </button>
                  <button
                    type="button"
                    className="ent-btn-secondary"
                    onClick={() => data.actions.acceptAppearance('ORG_LIMELIGHT', 'interview')}
                  >
                    Book Limelight Feature Interview
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.25rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                <h3 style={{ margin: 0 }}>Active Public Controversies ({activeControversies.length})</h3>
                {activeControversies.length === 0 ? (
                  <p className="ent-empty-note">All clear — no active controversies require statement counsel right now.</p>
                ) : (
                  <ul className="ent-ticket-list" role="list">
                    {activeControversies.map((cnv) => (
                      <li key={cnv.controversyId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>{cnv.stageName}</strong>
                          <span>{cnv.topic}</span>
                        </div>
                        <div className="ent-ticket-controls">
                          <button
                            type="button"
                            className="ent-btn-primary"
                            onClick={() => data.actions.respondControversy(cnv.controversyId, 'word_of_mouth_pr')}
                          >
                            Word of Mouth PR Counsel
                          </button>
                          <button
                            type="button"
                            className="ent-btn-secondary"
                            onClick={() => data.actions.respondControversy(cnv.controversyId, 'accountable_statement')}
                          >
                            Direct Accountable Statement
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={prDialogOpen}
        onClose={() => setPrDialogOpen(false)}
        site={site}
        org={org}
        contractType="publicity"
        data={data}
      />
    </div>
  );
}
