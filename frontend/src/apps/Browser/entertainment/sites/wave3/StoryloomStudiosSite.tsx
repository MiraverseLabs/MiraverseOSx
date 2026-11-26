import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function StoryloomStudiosSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const voiceAuditions = data.ent.auditions.filter(
    (a) => a.productionOrgId === site.orgId || a.orgId === site.orgId || a.discipline === 'acting',
  );

  const navItems = [
    { id: 'home', path: '/', label: 'Our Worlds' },
    { id: 'productions', path: '/productions', label: 'Productions' },
    { id: 'characters', path: '/characters', label: 'Characters' },
    { id: 'behind-the-scenes', path: '/behind-the-scenes', label: 'Behind the Scenes' },
    { id: 'careers', path: '/careers', label: 'Careers' },
    { id: 'about', path: '/about', label: 'Lantern Workshop' },
  ];

  return (
    <div className="ent-root site-storyloom" data-site-shell="animation-studio">
      <header className="st-header">
        <div>
          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
            LANTERN WORKSHOP · DAWNSON, AURELINE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.4rem, 3cqi, 2.15rem)', fontWeight: 700 }}>
            {site.name}
          </h1>
        </div>
        <nav className="st-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="st-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#684c82" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* OUR WORLDS & PRODUCTIONS */}
        {(routeId === 'home' || routeId === 'productions') && (
          <>
            <section className="ent-about-grid" style={{ padding: '1.4rem', background: '#fffcf5', border: '1px solid var(--site-border)', alignItems: 'center' }}>
              <div className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                  HAND-DRAWN ILLUSTRATED FEATURE · IN DEVELOPMENT
                </span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.1rem)' }}>Citadel of Echoes</h2>
                <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.94rem', lineHeight: 1.65 }}>
                  {site.tagline} — Directed by Iris Finch with orchestral score archives crafted alongside Kaji
                  Publishing Studios. Voice and song auditions are now open through Open Call Casting.
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink href={buildSiteUrl(site, '/careers')} navigate={navigate} className="ent-btn-primary">
                    Voice & Song Auditions
                  </SiteLink>
                  <SiteLink href={crossSiteLinks.orgHome('ORG_KAJI_PUBLISHING', '/catalog')} navigate={navigate} className="ent-btn-secondary">
                    Kaji Score Archive ↗
                  </SiteLink>
                </div>
              </div>
              <img
                src="/media/posters/poster-citadel-of-echoes.jpg"
                alt="Hand-painted key art for Storyloom Studios feature Citadel of Echoes"
                style={{ inlineSize: '100%', maxBlockSize: '300px', objectFit: 'cover', border: '1px solid var(--site-border)' }}
              />
            </section>
          </>
        )}

        {/* CHARACTERS & BEHIND THE SCENES */}
        {(routeId === 'characters' || routeId === 'behind-the-scenes') && (
          <section style={{ padding: '1.4rem', background: '#fffcf5', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'characters' ? 'Character Studies & Visual Folios' : 'Lantern Workshop Production Diary'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Curated by Otis Mercer’s Production Paintings & Score Archive. Every frame begins as ink and gouache
              boards before entering voice-ensemble recording sessions.
            </p>
            <button
              type="button"
              className="ent-btn-primary"
              style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
              onClick={() =>
                data.actions.createProject({
                  title: `Storyloom Illustrated Musical Short (Cycle ${data.cycle})`,
                  kind: 'film',
                  discipline: 'acting',
                  partnerOrgId: site.orgId,
                  budgetCredits: 110,
                })
              }
            >
              Pitch Animated Musical Collaboration (110 ₢)
            </button>
          </section>
        )}

        {/* CAREERS & VOICE CASTING */}
        {routeId === 'careers' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Voice Ensemble Castings & Studio Openings</h2>
            <AuditionListWidget auditions={voiceAuditions} data={data} accentColor="#684c82" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
