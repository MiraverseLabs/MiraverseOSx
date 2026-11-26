import { Clapperboard, Film } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const CANONICAL_SLATE = [
  {
    id: 'glassline-harbor',
    title: 'Glassline Harbor (Season II)',
    kind: 'series',
    status: 'In Production',
    leadArtistId: 'ART-LEO',
    leadName: 'Leo Sterling',
    poster: '/media/posters/poster-last-witness-noir.jpg',
    logline: 'Serialized prestige drama filmed across Mirrora Soundstages at West Quay, starring Leo Sterling and nominated for The Radiance Awards.',
    auditionId: 'AUD-SEED-01',
  },
  {
    id: 'the-last-witness',
    title: 'The Last Witness',
    kind: 'film',
    status: 'Premiere Slate',
    leadArtistId: 'ART-LEO',
    leadName: 'Leo Sterling',
    poster: '/media/posters/poster-last-witness-noir.jpg',
    logline: 'Character-driven feature developed by Arthur Sterling’s Feature Development division with acoustic scoring by Kaji Publishing Studios.',
    auditionId: 'AUD-SEED-01',
  },
] as const;

export function MirroraStudiosSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const mirroraAuditions = data.ent.auditions.filter(
    (a) => a.productionOrgId === site.orgId || a.orgId === site.orgId || a.discipline === 'acting',
  );
  const screenActors = data.publicArtists.filter((a) => a.disciplines.includes('acting'));

  const navItems = [
    { id: 'home', path: '/', label: 'Studio Lot' },
    { id: 'films', path: '/films', label: 'Films' },
    { id: 'series', path: '/series', label: 'Series' },
    { id: 'in-production', path: '/in-production', label: 'In Production' },
    { id: 'news', path: '/news', label: 'Studio News' },
    { id: 'casting', path: '/casting', label: 'Casting' },
    { id: 'portal', path: '/portal', label: 'Production Desk' },
    { id: 'about', path: '/about', label: 'About Mirrora' },
  ];

  return (
    <div className="ent-root site-mirrora" data-site-shell="cinematic-studio">
      <aside className="mr-filmstrip" aria-label="Mirrora Studios filmstrip navigation">
        <div>
          <Clapperboard size={20} aria-hidden="true" style={{ color: '#818cf8', marginBottom: '0.4rem' }} />
          <h1>{site.name}</h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--site-muted)' }}>West Quay Soundstages · Aureline</span>
        </div>

        <nav className="mr-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="mr-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#6366f1" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME / FILMS / SERIES / IN PRODUCTION */}
        {(routeId === 'home' || routeId === 'films' || routeId === 'series' || routeId === 'in-production') && (
          <>
            <section style={{ padding: '1.4rem', background: 'linear-gradient(135deg, #162038, #0c121d)', border: '1px solid var(--site-border)' }}>
              <span className="ent-mono-tag" style={{ color: '#a5b4fc' }}>
                MIRRORA SOUNDSTAGES · {routeId.toUpperCase().replace('-', ' ')}
              </span>
              <h2 style={{ margin: '0.35rem 0 0.5rem', fontSize: 'clamp(1.4rem, 3cqi, 2.2rem)' }}>
                {site.tagline}
              </h2>
              <p style={{ margin: '0 0 1rem', color: 'var(--site-muted)', maxInlineSize: '46rem', fontSize: '0.88rem' }}>
                {site.description}
              </p>
              <div className="ent-action-row">
                <SiteLink href={buildSiteUrl(site, '/casting')} navigate={navigate} className="ent-btn-primary">
                  Open Casting Breakdowns
                </SiteLink>
                <SiteLink href={crossSiteLinks.orgHome('ORG_OPEN_CALL')} navigate={navigate} className="ent-btn-secondary">
                  Open Call Casting Partner ↗
                </SiteLink>
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Film size={18} aria-hidden="true" />
                <span>Studio Production Slate</span>
              </h2>
              <div className="mr-slate-grid">
                {CANONICAL_SLATE.filter((p) => {
                  if (routeId === 'films') return p.kind === 'film';
                  if (routeId === 'series') return p.kind === 'series';
                  if (routeId === 'in-production') return p.status === 'In Production';
                  return true;
                }).map((prod) => (
                  <article key={prod.id} style={{ background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <img
                      src={prod.poster}
                      alt={`Key art poster for ${prod.title}`}
                      loading="lazy"
                      style={{ inlineSize: '100%', aspectRatio: '2 / 3', objectFit: 'cover' }}
                    />
                    <span className="ent-mono-tag" style={{ color: '#a5b4fc' }}>
                      {prod.status} · {prod.kind.toUpperCase()}
                    </span>
                    <h3 style={{ margin: 0 }}>
                      <SiteLink
                        href={buildSiteUrl(site, `/productions/${encodeURIComponent(prod.id)}`)}
                        navigate={navigate}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {prod.title}
                      </SiteLink>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--site-muted)' }}>{prod.logline}</p>
                    <SiteLink
                      href={buildSiteUrl(site, `/productions/${encodeURIComponent(prod.id)}`)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ marginTop: 'auto' }}
                    >
                      View Production File
                    </SiteLink>
                  </article>
                ))}
              </div>
            </section>

            <section className="ent-widget-stack">
              <h3 style={{ margin: 0 }}>Featured Screen Performers</h3>
              <div className="mr-slate-grid">
                {screenActors.map((actor) => (
                  <article key={actor.artistId} style={{ background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', padding: '0.9rem' }}>
                    <strong>{actor.stageName}</strong>
                    <div className="ent-mono-tag" style={{ color: '#a5b4fc', marginBlock: '0.2rem' }}>
                      {actor.tier} · Credibility {actor.artisticCredibility}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--site-muted)' }}>{actor.bio}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* PRODUCTION DETAIL /productions/:id */}
        {routeId === 'production-detail' &&
          (() => {
            const prod = CANONICAL_SLATE.find((p) => p.id === resolved.pathParams.id);
            if (!prod) return <SiteNotFoundView site={site} navigate={navigate} />;
            const linkedAudition = data.ent.auditions.filter((a) => a.auditionId === prod.auditionId);
            return (
              <section className="ent-widget-stack">
                <div className="ent-about-grid">
                  <img
                    src={prod.poster}
                    alt={`Key art for ${prod.title}`}
                    style={{ maxInlineSize: '280px', aspectRatio: '2 / 3', objectFit: 'cover' }}
                  />
                  <div className="ent-widget-stack">
                    <span className="ent-mono-tag" style={{ color: '#a5b4fc' }}>
                      {prod.status} · MIRRORA STUDIOS
                    </span>
                    <h2 style={{ margin: 0 }}>{prod.title}</h2>
                    <p style={{ margin: 0, color: 'var(--site-muted)', lineHeight: 1.6 }}>{prod.logline}</p>
                    <p className="ent-mono-tag">Principal Lead: {prod.leadName}</p>
                    {linkedAudition.length > 0 && (
                      <>
                        <h3>Active Casting Call</h3>
                        <AuditionListWidget auditions={linkedAudition} data={data} accentColor="#6366f1" />
                      </>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

        {/* STUDIO NEWS */}
        {routeId === 'news' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Studio Dispatches & Press Coverage</h2>
            <ul className="ent-ticket-list" role="list">
              {data.ent.mediaItems.map((m) => (
                <li key={m.mediaId} className="ent-ticket-item">
                  <div className="ent-ticket-meta">
                    <strong>{m.headline}</strong>
                    <span>
                      {m.outletName} · Cycle {m.cycle}
                    </span>
                    <small>{m.summary}</small>
                  </div>
                  <SiteLink href={crossSiteLinks.limelightStory(m.mediaId)} navigate={navigate} className="ent-btn-secondary">
                    Read on Limelight
                  </SiteLink>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CASTING */}
        {routeId === 'casting' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Mirrora Screen Casting & Open Call Breakdowns</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
              Principal and supporting screen castings coordinated directly with Open Call Casting.
            </p>
            <AuditionListWidget auditions={mirroraAuditions} data={data} accentColor="#6366f1" />
          </section>
        )}

        {/* AUTHENTICATED PRODUCTION DESK */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Mirrora Lot Production Desk"
            description="Greenlight independent screen collaborations, review studio shoot schedules, and advance active film or series productions."
          >
            <section className="ent-widget-stack">
              <h2>Develop a Screen Project with Mirrora</h2>
              <div className="ent-action-row">
                <button
                  type="button"
                  className="ent-btn-primary"
                  onClick={() =>
                    data.actions.createProject({
                      title: `Mirrora Soundstage Feature (Cycle ${data.cycle})`,
                      kind: 'film',
                      discipline: 'acting',
                      partnerOrgId: site.orgId,
                      budgetCredits: 140,
                    })
                  }
                >
                  Start Mirrora Screen Production (140 ₢)
                </button>
              </div>
              {data.ent.projects.filter((p) => p.partnerOrgId === site.orgId).length > 0 && (
                <ul className="ent-ticket-list" role="list">
                  {data.ent.projects
                    .filter((p) => p.partnerOrgId === site.orgId)
                    .map((prj) => (
                      <li key={prj.projectId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>{prj.title}</strong>
                          <span>
                            {prj.status} · Progress {prj.progress}%
                          </span>
                        </div>
                        {prj.status === 'in_production' && (
                          <button
                            type="button"
                            className="ent-btn-primary"
                            onClick={() => data.actions.advanceProject(prj.projectId)}
                          >
                            Complete Principal Photography
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
