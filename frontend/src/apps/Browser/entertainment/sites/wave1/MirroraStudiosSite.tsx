import { Clapperboard, Film, Play } from 'lucide-react';
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
    logline: 'Character-driven noir feature developed by Arthur Sterling’s Feature Development division with acoustic scoring by Kaji Publishing Studios.',
    auditionId: 'AUD-SEED-01',
  },
  {
    id: 'twilight-conduit',
    title: 'Aureline Soundstage Chronicles',
    kind: 'series',
    status: 'Development',
    leadArtistId: 'ART-SORA',
    leadName: 'Sora Takahashi (Score)',
    poster: '/media/albums/album-prism-eclipse.jpg',
    logline: 'Original anthology series exploring cross-realm music, stagecraft, and diplomacy across Aureline’s quay.',
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
    { id: 'casting', path: '/casting', label: 'Casting' },
    { id: 'news', path: '/news', label: 'Studio News' },
    { id: 'portal', path: '/portal', label: 'Production Desk' },
    { id: 'about', path: '/about', label: 'The Studio' },
  ];

  return (
    <div className="ent-root site-mirrora" data-site-shell="cinematic-studio">
      <aside className="mr-filmstrip" aria-label="Mirrora Studios filmstrip navigation">
        <div>
          <Clapperboard size={22} aria-hidden="true" style={{ color: '#c4b5fd', marginBottom: '0.45rem' }} />
          <h1>{site.name}</h1>
          <span style={{ fontSize: '0.68rem', color: 'var(--site-muted)', letterSpacing: '0.06em' }}>
            West Quay Soundstages · Aureline
          </span>
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

        <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: 'var(--site-muted)' }}>
          <SiteLink href={crossSiteLinks.orgHome('ORG_OPEN_CALL')} navigate={navigate} style={{ color: '#c4b5fd' }}>
            Open Call Casting ↗
          </SiteLink>
        </div>
      </aside>

      <main className="mr-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7c3aed" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* STUDIO LOT HOME — Round 2 Cinematic Layout (PDF p. 44) */}
        {(routeId === 'home' || routeId === 'films' || routeId === 'series' || routeId === 'in-production') && (
          <>
            <section className="mr-hero-banner" aria-label="Mirrora Studios featured production">
              <img
                src="/media/entertainment/mirrora-cinematic-set.jpg"
                alt="Mirrora Studios West Quay soundstage ensemble cast and camera rig"
                onError={(e) => {
                  e.currentTarget.src = '/media/posters/poster-last-witness-noir.jpg';
                }}
              />
              <div className="mr-hero-overlay">
                <span className="ent-mono-tag" style={{ color: '#c4b5fd' }}>
                  A MIRRORA ORIGINAL SERIES · WEST QUAY LOT
                </span>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.75rem, 3.6cqi, 2.75rem)', lineHeight: 1.05 }}>
                  Glassline Harbor — Season II
                </h2>
                <p style={{ margin: 0, color: '#ddd6fe', maxInlineSize: '36rem', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  {site.tagline} Starring Leo Sterling, nominated at The Radiance Awards and actively casting
                  supporting roles through Open Call Casting.
                </p>
                <div className="ent-action-row" style={{ marginTop: '0.45rem' }}>
                  <SiteLink
                    href={buildSiteUrl(site, '/productions/glassline-harbor')}
                    navigate={navigate}
                    className="ent-btn-primary"
                    style={{ borderRadius: '999px' }}
                  >
                    <Play size={14} aria-hidden="true" />
                    <span>Series Details</span>
                  </SiteLink>
                  <SiteLink
                    href={buildSiteUrl(site, '/casting')}
                    navigate={navigate}
                    className="ent-btn-secondary"
                    style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}
                  >
                    Active Casting Calls
                  </SiteLink>
                </div>
              </div>
            </section>

            {/* Current Films & Series Strip */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Film size={16} aria-hidden="true" style={{ color: '#c4b5fd' }} />
                  <span>Current Films & Series</span>
                </h2>
                <SiteLink href={buildSiteUrl(site, '/casting')} navigate={navigate} style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>
                  Open Breakdowns →
                </SiteLink>
              </div>
              <div className="mr-slate-grid">
                {CANONICAL_SLATE.filter((p) => {
                  if (routeId === 'films') return p.kind === 'film';
                  if (routeId === 'series') return p.kind === 'series';
                  if (routeId === 'in-production') return p.status === 'In Production';
                  return true;
                }).map((prod) => (
                  <article
                    key={prod.id}
                    style={{
                      background: 'var(--site-surface-alt)',
                      border: '1px solid var(--site-border)',
                      borderRadius: '0.65rem',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <img
                      src={prod.poster}
                      alt={`Key art for ${prod.title}`}
                      loading="lazy"
                      style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      <span className="ent-mono-tag" style={{ color: '#c4b5fd' }}>
                        {prod.kind.toUpperCase()} · {prod.status}
                      </span>
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                        <SiteLink
                          href={buildSiteUrl(site, `/productions/${encodeURIComponent(prod.id)}`)}
                          navigate={navigate}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {prod.title}
                        </SiteLink>
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--site-muted)', lineHeight: 1.45 }}>
                        {prod.logline}
                      </p>
                      <SiteLink
                        href={buildSiteUrl(site, `/productions/${encodeURIComponent(prod.id)}`)}
                        navigate={navigate}
                        className="ent-btn-secondary"
                        style={{ marginTop: 'auto', fontSize: '0.75rem' }}
                      >
                        Production Dossier →
                      </SiteLink>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 3-Column Middle Showcase: Cast Showcase | Studio News | Creative Development */}
            <section className="mr-mid-triple">
              <div style={{ background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', borderRadius: '0.65rem', padding: '1rem' }} className="ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.86rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Cast Showcase
                </h3>
                {screenActors.map((actor) => (
                  <div key={actor.artistId} style={{ paddingBlockEnd: '0.6rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <strong>{actor.stageName}</strong>
                    <div className="ent-mono-tag" style={{ color: '#c4b5fd' }}>
                      {actor.tier} · Credibility {actor.artisticCredibility}
                    </div>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.75rem' }}>{actor.bio}</small>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', borderRadius: '0.65rem', padding: '1rem' }} className="ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.86rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Studio News
                </h3>
                {data.ent.mediaItems.slice(0, 3).map((m) => (
                  <div key={m.mediaId} style={{ paddingBlockEnd: '0.6rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <SiteLink href={crossSiteLinks.limelightStory(m.mediaId)} navigate={navigate} style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                      {m.headline}
                    </SiteLink>
                    <div style={{ fontSize: '0.72rem', color: 'var(--site-muted)', marginTop: '0.2rem' }}>
                      {m.outletName} · Cycle {m.cycle}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', borderRadius: '0.65rem', padding: '1rem' }} className="ent-widget-stack">
                <h3 style={{ margin: 0, fontSize: '0.86rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Lot Departments
                </h3>
                {(org.departments ?? []).map((d) => (
                  <div key={d.id} style={{ paddingBlockEnd: '0.6rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <strong style={{ fontSize: '0.82rem' }}>{d.name}</strong>
                    <div className="ent-mono-tag" style={{ color: '#c4b5fd' }}>
                      {d.head}
                    </div>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.74rem' }}>{d.focus}</small>
                  </div>
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
                    style={{ maxInlineSize: '280px', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: '0.5rem' }}
                  />
                  <div className="ent-widget-stack">
                    <span className="ent-mono-tag" style={{ color: '#c4b5fd' }}>
                      {prod.status} · MIRRORA STUDIOS
                    </span>
                    <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{prod.title}</h2>
                    <p style={{ margin: 0, color: 'var(--site-muted)', lineHeight: 1.6 }}>{prod.logline}</p>
                    <p className="ent-mono-tag">Principal Credit: {prod.leadName}</p>
                    {linkedAudition.length > 0 && (
                      <>
                        <h3>Active Casting Call</h3>
                        <AuditionListWidget auditions={linkedAudition} data={data} accentColor="#7c3aed" />
                      </>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

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

        {routeId === 'casting' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Mirrora Screen Casting & Open Call Breakdowns</h2>
            <AuditionListWidget auditions={mirroraAuditions} data={data} accentColor="#7c3aed" />
          </section>
        )}

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Mirrora Lot Production Desk"
            description="Greenlight independent screen collaborations, review studio shoot schedules, and advance active film or series productions."
          >
            <section className="ent-widget-stack">
              <h2>Develop a Screen Project with Mirrora</h2>
              <button
                type="button"
                className="ent-btn-primary"
                style={{ alignSelf: 'flex-start' }}
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
