import { Coins, Scissors, Sparkles } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks, getOrgApprovedArtwork } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  EcosystemDirectorySection,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function GlasslineDesignsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const artwork = getOrgApprovedArtwork(site.orgId, 4);
  const glasslineSponsorships = data.ent.sponsorships.filter((sp) => sp.sponsorOrgId === site.orgId);

  const railNav = [
    { id: 'home', path: '/', label: 'Lookbook' },
    { id: 'collections', path: '/collections', label: 'Collections' },
    { id: 'runway', path: '/runway', label: 'Runway' },
    { id: 'couture', path: '/couture', label: 'Couture' },
    { id: 'atelier', path: '/atelier', label: 'Atelier' },
    { id: 'commissions', path: '/commissions', label: 'Commissions' },
    { id: 'campaigns', path: '/campaigns', label: 'Campaigns' },
    { id: 'studio', path: '/studio', label: 'Fitting Room' },
    { id: 'about', path: '/about', label: 'The House' },
  ];

  return (
    <div className="ent-root site-glassline" data-site-shell="lookbook-rail">
      <aside className="gl-rail" aria-label="Glassline Designs atelier navigation">
        <div>
          <h1 className="gl-wordmark">{site.name}</h1>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--site-muted)', fontFamily: 'system-ui, sans-serif' }}>
            44 Glassline Arcade · Aureline
          </p>
        </div>

        <nav className="gl-nav" aria-label={resolved.config.navAriaLabel}>
          {railNav.map((item) => (
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

        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--site-muted)' }}>
          <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} style={{ color: 'inherit' }}>
            Industry Directory
          </SiteLink>
        </div>
      </aside>

      <main className="gl-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7f3150" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* LOOKBOOK HOME */}
        {routeId === 'home' && (
          <>
            <figure className="gl-campaign-plate" style={{ margin: 0 }}>
              <img
                src="/media/entertainment/glassline-atelier.jpg"
                alt="Mauve organza stage gown in motion inside the Glassline conservatory theatre"
              />
              <figcaption className="gl-campaign-caption">
                <div>
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--site-accent)' }}>
                    Cycle {data.cycle} Performance Wardrobe Atelier
                  </span>
                  <h2 style={{ margin: '0.25rem 0 0', fontSize: 'clamp(1.5rem, 3cqi, 2.35rem)', fontWeight: 500 }}>
                    {site.tagline}
                  </h2>
                </div>
                <SiteLink href={buildSiteUrl(site, '/commissions')} navigate={navigate} className="ent-btn-primary">
                  Request Commission
                </SiteLink>
              </figcaption>
            </figure>

            <section className="gl-lookbook-grid">
              {(org.departments ?? []).map((dept) => (
                <article key={dept.id} style={{ borderBlockStart: '1px solid var(--site-border)', paddingBlockStart: '1rem' }}>
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--site-muted)' }}>
                    Atelier Division · {dept.head}
                  </span>
                  <h3 style={{ margin: '0.3rem 0 0.5rem', fontSize: '1.35rem', fontWeight: 500 }}>{dept.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--site-muted)' }}>{dept.focus}</p>
                </article>
              ))}
            </section>
          </>
        )}

        {/* COLLECTIONS / RUNWAY / COUTURE */}
        {(routeId === 'collections' || routeId === 'runway' || routeId === 'couture') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 500 }}>
              {routeId === 'collections'
                ? 'Seasonal Collections'
                : routeId === 'runway'
                  ? 'Runway & Stage Motion Studies'
                  : 'Bespoke Stage Couture'}
            </h2>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--site-muted)', maxInlineSize: '46rem', lineHeight: 1.6 }}>
              {org.description} Every piece published by Glassline Designs credits the lead designer, pattern
              cutter, tailor, and movement stylist who engineered it for stage heat and choreography.
            </p>
            <div className="gl-lookbook-grid">
              {[
                {
                  title: 'Crimson Mirrors — Stage Ensemble',
                  credits: 'Designed for Femme Fatale Dance Company · Premiered at The Marigold Theatre',
                  img: '/media/entertainment/glassline-atelier.jpg',
                  link: crossSiteLinks.orgHome('ORG_FEMME_FATALE', '/performances'),
                },
                {
                  title: 'Conservatory Tailoring Study',
                  credits: 'Photographed with Willow Whisper Models & The Rosemont Portrait House',
                  img: '/media/entertainment/willow-editorial.jpg',
                  link: crossSiteLinks.orgHome('ORG_WILLOW_WHISPER', '/editorials'),
                },
              ].map((plate) => (
                <figure key={plate.title} className="gl-campaign-plate" style={{ margin: 0 }}>
                  <img src={plate.img} alt={plate.title} style={{ aspectRatio: '4 / 3' }} />
                  <figcaption style={{ padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.25rem', fontWeight: 500 }}>{plate.title}</h3>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.84rem', color: 'var(--site-muted)', fontFamily: 'system-ui, sans-serif' }}>
                      {plate.credits}
                    </p>
                    <SiteLink href={plate.link} navigate={navigate} className="ent-btn-secondary">
                      View Partner House →
                    </SiteLink>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ATELIER */}
        {routeId === 'atelier' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 500 }}>44 Glassline Arcade — The Atelier</h2>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Our workrooms pair textile architects with touring performers. From Radiance Awards red-carpet
              silhouettes to full ensemble touring wardrobes, every garment is tested in full rehearsal motion.
            </p>
            <dl className="gl-lookbook-grid" style={{ margin: 0 }}>
              {(org.departments ?? []).map((d) => (
                <div key={d.id} style={{ padding: '1.15rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <dt style={{ fontWeight: 700, fontSize: '1.2rem' }}>{d.name}</dt>
                  <dd style={{ margin: '0.35rem 0 0', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                    <strong>Lead:</strong> {d.head} — {d.focus}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* COMMISSIONS */}
        {routeId === 'commissions' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 500 }}>
              Commissions & Brand Campaigns
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)', maxInlineSize: '46rem' }}>
              Commission custom stage garments, premiere styling, or seasonal fashion lookbooks directly with the
              Glassline Arcade workroom.
            </p>
            <div className="ent-action-row">
              <button
                type="button"
                className="ent-btn-primary"
                onClick={() =>
                  data.actions.acceptSponsorship(
                    site.orgId,
                    `Glassline Designs Cycle ${data.cycle} Stage Wardrobe Campaign`,
                  )
                }
              >
                <Coins size={14} aria-hidden="true" />
                <span>Accept Glassline Wardrobe Campaign</span>
              </button>
              <button
                type="button"
                className="ent-btn-secondary"
                onClick={() =>
                  data.actions.createProject({
                    title: 'Glassline Designs Editorial Commission',
                    kind: 'fashion_campaign',
                    discipline: 'modeling',
                    partnerOrgId: site.orgId,
                    budgetCredits: 60,
                  })
                }
              >
                <Scissors size={14} aria-hidden="true" />
                <span>Commission Custom Stage Lookbook (60 ₢)</span>
              </button>
            </div>

            <h3>Active Glassline Campaigns ({glasslineSponsorships.length})</h3>
            {glasslineSponsorships.length === 0 ? (
              <p className="ent-empty-note">No active Glassline endorsement campaigns are published yet this cycle.</p>
            ) : (
              <ul className="ent-ticket-list" role="list">
                {glasslineSponsorships.map((sp) => (
                  <li key={sp.sponsorshipId} className="ent-ticket-item">
                    <div className="ent-ticket-meta">
                      <strong>{sp.campaignTitle}</strong>
                      <span>
                        {sp.stageName} × {sp.sponsorName}
                      </span>
                    </div>
                    <span className="ent-mono-tag">{sp.feeCredits.toLocaleString()} ₢</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* CAMPAIGNS */}
        {routeId === 'campaigns' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 500 }}>Campaign Archive</h2>
            <div className="gl-lookbook-grid">
              {artwork.map((art) => (
                <figure key={art.id} className="gl-campaign-plate" style={{ margin: 0 }}>
                  <img src={art.src} alt={art.caption} style={{ aspectRatio: '4 / 3' }} />
                  <figcaption style={{ padding: '0.85rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem' }}>
                    {art.caption}
                  </figcaption>
                </figure>
              ))}
              {artwork.length === 0 && (
                <figure className="gl-campaign-plate" style={{ margin: 0 }}>
                  <img src="/media/entertainment/glassline-atelier.jpg" alt="Glassline Designs seasonal campaign" />
                  <figcaption style={{ padding: '0.85rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem' }}>
                    Glassline Designs — Performance Wardrobe Campaign
                  </figcaption>
                </figure>
              )}
            </div>
          </section>
        )}

        {/* AUTHENTICATED CLIENT FITTING ROOM */}
        {routeId === 'studio' && (
          <AuthPortalGate
            data={data}
            portalName="Glassline Client Fitting Room"
            description="Review private garment commissions, fitting measurements, and scheduled stage wardrobe deliveries."
          >
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h2>Your Glassline Commissions</h2>
              {data.ent.projects.filter((p) => p.partnerOrgId === site.orgId).length === 0 ? (
                <p className="ent-empty-note">You have no active commissions in progress at 44 Glassline Arcade.</p>
              ) : (
                <ul className="ent-ticket-list" role="list">
                  {data.ent.projects
                    .filter((p) => p.partnerOrgId === site.orgId)
                    .map((prj) => (
                      <li key={prj.projectId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>{prj.title}</strong>
                          <span>
                            Progress: {prj.progress}% · Status: {prj.status}
                          </span>
                        </div>
                        {prj.status === 'in_production' && (
                          <button
                            type="button"
                            className="ent-btn-primary"
                            onClick={() => data.actions.advanceProject(prj.projectId)}
                          >
                            <Sparkles size={13} aria-hidden="true" />
                            <span>Complete Fitting Session</span>
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'directory' && <EcosystemDirectorySection currentSite={site} data={data} navigate={navigate} />}
        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
