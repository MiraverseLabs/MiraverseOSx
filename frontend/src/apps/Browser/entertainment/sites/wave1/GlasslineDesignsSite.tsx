import { useState } from 'react';
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

const LOOKBOOK_PLATES = [
  {
    id: 'motion',
    num: '01 Motion',
    title: 'Stage Architecture',
    subtitle: 'Organza and luminous tailoring engineered to hold form under Aureline stage heat and choreography.',
    src: '/media/entertainment/glassline-atelier.jpg',
    alt: 'Mauve organza stage gown sweeping in motion inside a luminous glass theatre',
  },
  {
    id: 'structure',
    num: '02 Structure',
    title: 'Conservatory Tailoring',
    subtitle: 'Architectural pleats and structured wool-silk silhouettes photographed with Willow Whisper Models.',
    src: '/media/entertainment/willow-editorial.jpg',
    alt: 'Three models in cream and charcoal architectural tailoring inside a glass conservatory',
  },
  {
    id: 'light',
    num: '03 Light',
    title: 'Radiance Couture',
    subtitle: 'Red-carpet eveningwear commissioned for Radiance Awards and Marigold Theatre premieres.',
    src: '/media/posters/poster-promenade-sunset.jpg',
    alt: 'Warm golden promenade evening study of Glassline couture',
  },
] as const;

export function GlasslineDesignsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [plateIdx, setPlateIdx] = useState(0);
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

  const activePlate = LOOKBOOK_PLATES[plateIdx] ?? LOOKBOOK_PLATES[0];

  return (
    <div className="ent-root site-glassline" data-site-shell="lookbook-rail">
      <aside className="gl-rail" aria-label="Glassline Designs atelier navigation">
        <div>
          <h1 className="gl-wordmark">{site.name}</h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: '#c4a6b5', fontFamily: 'system-ui, sans-serif' }}>
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

        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.16em', color: '#b796a7', textTransform: 'uppercase', lineHeight: 1.7 }}>
          <div>Couture</div>
          <div>Architecture</div>
          <div>Movement</div>
          <div style={{ marginTop: '0.5rem' }}>
            <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} style={{ color: '#f3d4df' }}>
              Industry Directory
            </SiteLink>
          </div>
        </div>
      </aside>

      <main className="gl-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#6d2c4c" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* LOOKBOOK HOME — Round 2 Mockup Composition (PDF p. 41) */}
        {routeId === 'home' && (
          <>
            <section className="gl-hero-lookbook" aria-label="Glassline interactive lookbook hero">
              <img src={activePlate.src} alt={activePlate.alt} />
              <div className="gl-hero-copy">
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f4c7d7' }}>
                  THE GLASSLINE LOOKBOOK · CYCLE {data.cycle}
                </span>
                <h2>{activePlate.title}</h2>
                <p style={{ margin: 0, maxInlineSize: '28rem', fontSize: '0.96rem', color: '#f8e7ed', lineHeight: 1.55 }}>
                  {activePlate.subtitle}
                </p>
                <div className="ent-action-row" style={{ marginTop: '0.45rem', fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink
                    href={buildSiteUrl(site, '/collections')}
                    navigate={navigate}
                    className="ent-btn-primary"
                    style={{ background: 'rgba(255,255,255,0.9)', color: '#2b1523' }}
                  >
                    Enter the Lookbook →
                  </SiteLink>
                  <SiteLink
                    href={buildSiteUrl(site, '/commissions')}
                    navigate={navigate}
                    className="ent-btn-secondary"
                    style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.45)' }}
                  >
                    Commission Atelier
                  </SiteLink>
                </div>
                <div style={{ display: 'flex', gap: '1.15rem', marginTop: '0.75rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                  {LOOKBOOK_PLATES.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlateIdx(idx)}
                      style={{
                        background: 'transparent',
                        border: 0,
                        borderBlockEnd: idx === plateIdx ? '2px solid #f4c7d7' : '2px solid transparent',
                        color: idx === plateIdx ? '#ffffff' : '#d2b4c1',
                        padding: '0.2rem 0',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {p.num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gl-thumb-rail" aria-label="Lookbook plates">
                {LOOKBOOK_PLATES.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`Inspect lookbook plate ${p.title}`}
                    className={`gl-thumb-btn ${idx === plateIdx ? 'is-active' : ''}`}
                    onClick={() => setPlateIdx(idx)}
                  >
                    <img src={p.src} alt="" />
                  </button>
                ))}
              </div>
            </section>

            {/* Current Collections 4-Column Row */}
            <section className="gl-collections-row" aria-label="Current collections">
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.6rem', paddingRight: '0.5rem' }}>
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--site-accent)' }}>
                  CURRENT COLLECTIONS
                </span>
                <h2 style={{ margin: 0, fontSize: '1.9rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.05 }}>
                  The Collections
                </h2>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>
                  Stage garments engineered for lighting, movement, and full designer-to-tailor credit.
                </p>
                <SiteLink href={buildSiteUrl(site, '/collections')} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--site-accent)' }}>
                  Explore All Collections →
                </SiteLink>
              </div>
              {LOOKBOOK_PLATES.map((col) => (
                <SiteLink key={col.id} href={buildSiteUrl(site, '/collections')} navigate={navigate} className="gl-collection-card">
                  <img src={col.src} alt="" loading="lazy" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 500 }}>
                      {col.title}
                    </strong>
                    <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.1em', color: '#f3d4df' }}>
                      ATELIER ARCHIVE · {col.num.toUpperCase()}
                    </small>
                  </div>
                </SiteLink>
              ))}
            </section>

            {/* Split Bottom Band: New Campaign + Stacked Atelier & Bespoke Commissions */}
            <section className="gl-bottom-split">
              <article className="gl-collection-card" style={{ minBlockSize: '250px' }}>
                <img src="/media/entertainment/willow-editorial.jpg" alt="Glassline Designs × Femme Fatale seasonal campaign" loading="lazy" />
                <div style={{ padding: '1.35rem' }}>
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.16em', color: '#f3d4df' }}>
                    FEATURED COLLABORATION
                  </span>
                  <h3 style={{ margin: '0.2rem 0 0.45rem', fontSize: '1.85rem', fontStyle: 'italic', fontWeight: 400 }}>
                    Crimson Mirrors Wardrobe
                  </h3>
                  <p style={{ margin: '0 0 0.75rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: '#f7e6ed' }}>
                    Custom performance silhouettes unveiled with Femme Fatale at The Marigold Theatre.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/campaigns')} navigate={navigate} className="ent-btn-primary" style={{ background: '#ffffff', color: '#271522', fontFamily: 'system-ui, sans-serif' }}>
                    View Campaigns →
                  </SiteLink>
                </div>
              </article>

              <div className="ent-widget-stack">
                <article className="gl-side-card">
                  <div>
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.66rem', letterSpacing: '0.14em', color: 'var(--site-accent)' }}>
                      THE ATELIER
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1.35rem', fontStyle: 'italic', fontWeight: 500 }}>
                      Inside the Atelier
                    </h3>
                    <p style={{ margin: '0 0 0.6rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)' }}>
                      Led by Sébastien Vale & Nadia Oryn at 44 Glassline Arcade.
                    </p>
                    <SiteLink href={buildSiteUrl(site, '/atelier')} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.74rem', fontWeight: 700, color: 'var(--site-accent)' }}>
                      Enter the Atelier →
                    </SiteLink>
                  </div>
                  <img src="/media/entertainment/glassline-atelier.jpg" alt="" loading="lazy" />
                </article>

                <article className="gl-side-card">
                  <div>
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.66rem', letterSpacing: '0.14em', color: 'var(--site-accent)' }}>
                      COUTURE COMMISSIONS
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1.35rem', fontStyle: 'italic', fontWeight: 500 }}>
                      Bespoke Creations
                    </h3>
                    <p style={{ margin: '0 0 0.6rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)' }}>
                      Private tour wardrobes, Radiance red-carpet gowns, and editorial fittings.
                    </p>
                    <SiteLink href={buildSiteUrl(site, '/commissions')} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.74rem', fontWeight: 700, color: 'var(--site-accent)' }}>
                      Begin a Commission →
                    </SiteLink>
                  </div>
                  <img src="/media/entertainment/amrielle-still-life.jpg" alt="" loading="lazy" />
                </article>
              </div>
            </section>
          </>
        )}

        {/* COLLECTIONS / RUNWAY / COUTURE */}
        {(routeId === 'collections' || routeId === 'runway' || routeId === 'couture') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontStyle: 'italic', fontWeight: 500 }}>
              {routeId === 'collections'
                ? 'Seasonal Collections'
                : routeId === 'runway'
                  ? 'Runway & Stage Motion Studies'
                  : 'Bespoke Stage Couture'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.96rem', color: 'var(--site-muted)', maxInlineSize: '46rem', lineHeight: 1.6 }}>
              {org.description}
            </p>
            <div className="gl-collections-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {LOOKBOOK_PLATES.map((plate) => (
                <article key={plate.id} style={{ background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <img src={plate.src} alt={plate.alt} style={{ inlineSize: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.35rem', fontStyle: 'italic' }}>{plate.title}</h3>
                    <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--site-muted)' }}>
                      {plate.subtitle}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ATELIER */}
        {routeId === 'atelier' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontStyle: 'italic', fontWeight: 500 }}>
              44 Glassline Arcade — The Atelier
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', margin: 0 }}>
              {(org.departments ?? []).map((d) => (
                <div key={d.id} style={{ padding: '1.2rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <dt style={{ fontWeight: 700, fontSize: '1.25rem', fontStyle: 'italic' }}>{d.name}</dt>
                  <dd style={{ margin: '0.4rem 0 0', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>
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
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.85rem', fontStyle: 'italic', fontWeight: 500 }}>
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
                  <li key={sp.sponsorshipId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
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
            <h2 style={{ margin: 0, fontSize: '1.85rem', fontStyle: 'italic', fontWeight: 500 }}>Campaign Archive</h2>
            <div className="gl-collections-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {(artwork.length > 0 ? artwork : LOOKBOOK_PLATES.map((p) => ({ id: p.id, src: p.src, caption: p.title }))).map((art) => (
                <figure key={art.id} style={{ margin: 0, background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <img src={art.src} alt={art.caption} style={{ inlineSize: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                  <figcaption style={{ padding: '0.85rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem' }}>
                    {art.caption}
                  </figcaption>
                </figure>
              ))}
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
                      <li key={prj.projectId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
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
