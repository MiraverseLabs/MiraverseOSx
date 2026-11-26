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
          <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 2.4cqi, 1.7rem)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
          <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: '#dfc9c2' }}>
            Dawnson Green, Aureline · Boutique Artist Representation
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

      {/* Warm Boutique Hero (PDF p. 24) */}
      {routeId === 'home' && (
        <section className="sa-hero" aria-label="Second Act Management philosophy">
          <img
            src="/media/entertainment/limelight-cover-editorial.jpg"
            alt="Artists and managers in warm conversation at Second Act Management"
            onError={(e) => {
              e.currentTarget.src = '/media/entertainment/willow-editorial.jpg';
            }}
          />
          <div className="sa-hero-scrim">
            <h2 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.4cqi, 2.6rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.05, maxInlineSize: '28rem' }}>
              Talent. Strategy. The Next Act.
            </h2>
            <p style={{ margin: '0.5rem 0 1rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#f3ddd6', maxInlineSize: '32rem' }}>
              {site.description}
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <button type="button" className="ent-btn-primary" style={{ background: '#c97b6d', color: '#240f13' }} onClick={() => setMgmtDialogOpen(true)}>
                Work With Us →
              </button>
              <SiteLink href={buildSiteUrl(site, '/career-development')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#fff7f2', borderColor: 'rgba(255,255,255,0.45)' }}>
                Our Services
              </SiteLink>
            </div>
          </div>
        </section>
      )}

      <main className="sa-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7a323b" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* OUR CLIENTS + AGENCY NEWS (PDF p. 24) */}
        {routeId === 'home' && (
          <>
            <section className="sa-roster-band">
              <div className="ent-widget-stack">
                <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Featured Artists ({clients.length})</h2>
                <div className="ent-about-grid">
                  {clients.map((cl, idx) => (
                    <article key={cl.artistId} style={{ background: '#ffffff', border: '1px solid var(--site-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <img
                        src={idx === 0 ? '/media/posters/poster-last-witness-noir.jpg' : '/media/albums/album-chamber-violin.jpg'}
                        alt={`Client portrait for ${cl.stageName}`}
                        style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }}
                        loading="lazy"
                      />
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{cl.stageName}</h3>
                          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                            {cl.tier}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)', lineHeight: 1.5 }}>
                          {cl.bio}
                        </p>
                        <SiteLink href={crossSiteLinks.songbirdArtist(cl.artistId)} navigate={navigate} style={{ marginTop: 'auto', fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--site-accent)' }}>
                          Public Profile ↗
                        </SiteLink>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.1rem' }} className="ent-widget-stack">
                <h3 style={{ margin: 0, fontStyle: 'italic', fontSize: '1.15rem' }}>Agency News</h3>
                {data.ent.mediaItems.slice(0, 3).map((m) => (
                  <div key={m.mediaId} style={{ paddingBlockEnd: '0.65rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <SiteLink href={crossSiteLinks.limelightStory(m.mediaId)} navigate={navigate} style={{ color: 'inherit', fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
                      {m.headline}
                    </SiteLink>
                    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: 'var(--site-muted)', marginTop: '0.2rem' }}>
                      Cycle {m.cycle} · {m.outletName}
                    </div>
                  </div>
                ))}
              </aside>
            </section>

            {/* Bottom Services & CTA Band */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
              {[
                { title: 'Artist Management', desc: '12% commission & calm day-to-day scheduling.' },
                { title: 'Career Development', desc: 'Multi-discipline pivots & sustainable pacing.' },
                { title: 'Contract Renegotiation', desc: 'Clean agency transitions without lock-in.' },
              ].map((s) => (
                <div key={s.title} style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1rem' }}>
                  <strong style={{ display: 'block', fontStyle: 'italic', marginBottom: '0.25rem' }}>{s.title}</strong>
                  <small style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--site-muted)', fontSize: '0.78rem' }}>
                    {s.desc}
                  </small>
                </div>
              ))}
              <div style={{ background: '#5b222a', color: '#fff7f2', padding: '1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', fontStyle: 'italic' }}>The Right People for Your Next Act.</strong>
                <button type="button" className="ent-btn-primary" style={{ background: '#f7efe8', color: '#351d1e', fontFamily: 'system-ui, sans-serif', alignSelf: 'flex-start' }} onClick={() => setMgmtDialogOpen(true)}>
                  Work With Second Act →
                </button>
              </div>
            </section>
          </>
        )}

        {(routeId === 'management' || routeId === 'career-development' || routeId === 'inquiries') && (
          <section style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500, fontStyle: 'italic' }}>
              {routeId === 'management'
                ? 'Boutique Representation Terms'
                : routeId === 'career-development'
                  ? 'Sustainable Pacing & Creative Pivots'
                  : 'Representation Inquiries'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.94rem', lineHeight: 1.65 }}>
              Led by Eleanor Vance and Samir Lind. Second Act takes a calm{' '}
              <strong>{Math.round((org.commissionRate ?? 0.12) * 100)}% commission</strong> with an{' '}
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

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Second Act Private Client Access"
            description="Review active management terms, transition cleanly from another management firm, or coordinate with Word of Mouth Publicity."
          >
            <section style={{ padding: '1.3rem', background: '#ffffff', border: '1px solid var(--site-border)', fontFamily: 'system-ui, sans-serif' }} className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Client Representation Desk</h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                Current Manager: <strong>{data.playerArtist?.managerOrgId || 'Independent / Unrepresented'}</strong>
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
