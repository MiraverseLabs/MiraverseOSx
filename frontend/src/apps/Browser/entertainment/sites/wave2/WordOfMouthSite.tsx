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
          <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(1.2rem, 2.3cqi, 1.65rem)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {site.name}
          </h1>
          <span style={{ fontSize: '0.7rem', color: '#e4c8d1' }}>
            Publicity · Communications · Crisis Counsel · 19 Rosemont Lane
          </span>
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

      {/* Hero + 5-Pillar Service Ribbon (PDF p. 25) */}
      {routeId === 'home' && (
        <>
          <section className="sa-hero" style={{ background: '#26121b' }} aria-label="Word of Mouth Publicity">
            <img
              src="/media/entertainment/limelight-cover-editorial.jpg"
              alt="Publicity strategists preparing a Meridion press rollout"
              onError={(e) => {
                e.currentTarget.src = '/media/entertainment/willow-editorial.jpg';
              }}
            />
            <div className="sa-hero-scrim" style={{ background: 'linear-gradient(95deg, rgba(36, 16, 25, 0.94) 0%, rgba(36, 16, 25, 0.65) 55%, transparent 100%)' }}>
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.75rem, 3.5cqi, 2.6rem)', fontWeight: 400, lineHeight: 1.05, maxInlineSize: '26rem' }}>
                Stories People Talk About.
              </h2>
              <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.84rem', color: '#f3d8e2', maxInlineSize: '32rem' }}>
                {site.description}
              </p>
              <div className="ent-action-row">
                <button type="button" className="ent-btn-primary" style={{ background: '#9f1d47' }} onClick={() => setPrDialogOpen(true)}>
                  Start a Campaign →
                </button>
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#fff7fa', borderColor: 'rgba(255,255,255,0.45)' }}>
                  Client Crisis Portal
                </SiteLink>
              </div>
            </div>
          </section>

          <div className="wom-service-ribbon" aria-label="Publicity practice areas">
            <div>
              <strong>Publicity Campaigns</strong>
              <div style={{ color: 'var(--site-muted)' }}>Album, tour & project rollouts</div>
            </div>
            <div>
              <strong>Media Relations</strong>
              <div style={{ color: 'var(--site-muted)' }}>Limelight & Meridian exclusives</div>
            </div>
            <div>
              <strong>Brand Communications</strong>
              <div style={{ color: 'var(--site-muted)' }}>Positioning & privacy boundaries</div>
            </div>
            <div>
              <strong>Crisis Strategy</strong>
              <div style={{ color: 'var(--site-muted)' }}>Calibrated statement counsel</div>
            </div>
            <div>
              <strong>Event & Red Carpet</strong>
              <div style={{ color: 'var(--site-muted)' }}>Premieres & Radiance Awards</div>
            </div>
          </div>
        </>
      )}

      <main className="wom-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8f1d43" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* PRESSROOM HOME — 3-Column Campaigns | In The Press | Sticky Note (PDF p. 25) */}
        {routeId === 'home' && (
          <section className="wom-main-grid">
            <div className="ent-widget-stack">
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.25rem' }}>FEATURED CAMPAIGNS</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.85rem' }}>
                {data.ent.mediaItems.map((item, idx) => (
                  <article key={item.mediaId} style={{ background: '#26121b', color: '#fdf2f6', borderRadius: '0.45rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <img
                      src={
                        idx === 0
                          ? '/media/albums/album-neon-starlight.jpg'
                          : idx === 1
                            ? '/media/albums/album-marble-lilies.jpg'
                            : '/media/albums/album-meadow-dusk.jpg'
                      }
                      alt=""
                      style={{ inlineSize: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                      <span className="ent-mono-tag" style={{ color: '#f9a8d4' }}>
                        {item.outletName} · C{item.cycle}
                      </span>
                      <strong style={{ fontSize: '0.82rem', lineHeight: 1.3 }}>{item.headline}</strong>
                      <SiteLink href={crossSiteLinks.limelightStory(item.mediaId)} navigate={navigate} style={{ marginTop: 'auto', fontSize: '0.73rem', color: '#fbcfe8', fontWeight: 700 }}>
                        Read Coverage ↗
                      </SiteLink>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.1rem' }} className="ent-widget-stack">
              <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>IN THE PRESS</h3>
              <blockquote style={{ margin: 0, paddingBlockEnd: '0.65rem', borderBlockEnd: '1px solid var(--site-border)', fontSize: '0.8rem' }}>
                <strong>The Meridian</strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--site-muted)' }}>
                  “Word of Mouth sets the benchmark for artist publicity and rapid statement clarity in Aureline.”
                </p>
              </blockquote>
              <blockquote style={{ margin: 0, paddingBlockEnd: '0.65rem', borderBlockEnd: '1px solid var(--site-border)', fontSize: '0.8rem' }}>
                <strong>Limelight</strong>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--site-muted)' }}>
                  “From Silverleaf bowl rollouts to Radiance Awards campaigns, Lydia Sterling’s desk drives the conversation.”
                </p>
              </blockquote>
            </aside>

            <aside className="wom-note-card">
              <div>Strategy</div>
              <div>Media</div>
              <div>Press</div>
              <div>Culture</div>
              <div>Impact ♡</div>
              <button type="button" className="ent-btn-primary" style={{ marginTop: '0.85rem', fontFamily: 'system-ui, sans-serif', fontStyle: 'normal', inlineSize: '100%' }} onClick={() => setPrDialogOpen(true)}>
                Retain PR Desk
              </button>
            </aside>
          </section>
        )}

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
              <button type="button" className="ent-btn-secondary" onClick={() => data.actions.acceptAppearance('ORG_LIMELIGHT', 'interview')}>
                Place Limelight Exclusive Interview
              </button>
            </div>
          </section>
        )}

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
                  <button type="button" className="ent-btn-secondary" onClick={() => data.actions.acceptAppearance('ORG_LIMELIGHT', 'interview')}>
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
                          <button type="button" className="ent-btn-primary" onClick={() => data.actions.respondControversy(cnv.controversyId, 'word_of_mouth_pr')}>
                            Word of Mouth PR Counsel
                          </button>
                          <button type="button" className="ent-btn-secondary" onClick={() => data.actions.respondControversy(cnv.controversyId, 'accountable_statement')}>
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
