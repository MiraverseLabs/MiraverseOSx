import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { TicketPurchaseWidget, VenueBookingForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function MarigoldTheatreSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const theatreShows = data.ent.concerts.filter((c) => c.venueOrgId === site.orgId);
  const stageAuditions = data.ent.auditions.filter(
    (a) => a.productionOrgId === site.orgId || a.orgId === site.orgId || a.discipline === 'theatre' || a.discipline === 'dance',
  );

  const navItems = [
    { id: 'home', path: '/', label: "What's On" },
    { id: 'season', path: '/season', label: 'The Season' },
    { id: 'company', path: '/company', label: 'Our Company' },
    { id: 'visit', path: '/visit', label: 'Visit' },
    { id: 'auditions', path: '/auditions', label: 'Auditions' },
    { id: 'about', path: '/about', label: 'Marigold Square' },
  ];

  const featuredShow = theatreShows[0];

  return (
    <div className="ent-root site-marigold" data-site-shell="repertory-theatre">
      <header className="mg-banner">
        <div>
          <span className="ent-mono-tag" style={{ color: '#f3d6a4' }}>
            MARIGOLD SQUARE · PROMENADE QUARTER, AURELINE · 1,200 SEATS
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.4rem, 3cqi, 2.2rem)', fontWeight: 700 }}>
            {site.name}
          </h1>
        </div>
        <nav className="mg-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="mg-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8c2323" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* WHAT'S ON PLAYBILL HOME */}
        {routeId === 'home' && (
          <>
            <section style={{ padding: '1.5rem', background: '#fffdf7', border: '2px solid var(--site-border)' }} className="ent-widget-stack">
              <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                CYCLE {data.cycle} REPERTORY PLAYBILL
              </span>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.2rem)' }}>
                {featuredShow ? featuredShow.title : site.tagline}
              </h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.94rem', lineHeight: 1.6 }}>
                {featuredShow
                  ? `${featuredShow.dateLabel} · Directed & performed with ${featuredShow.stageName}. ${featuredShow.audienceReaction}`
                  : site.description}
              </p>
              {featuredShow && (
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink
                    href={buildSiteUrl(site, `/productions/${encodeURIComponent(featuredShow.concertId)}`)}
                    navigate={navigate}
                    className="ent-btn-primary"
                  >
                    Open Full Playbill & Cast Notes
                  </SiteLink>
                  <SiteLink href={crossSiteLinks.orgHome('ORG_FEMME_FATALE')} navigate={navigate} className="ent-btn-secondary">
                    Visiting Company: Femme Fatale ↗
                  </SiteLink>
                </div>
              )}
            </section>

            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Box Office & Citizen Ticket Wallet</h2>
              <TicketPurchaseWidget concerts={theatreShows} data={data} accentColor="#8c2323" />
            </section>
          </>
        )}

        {/* PRODUCTION PLAYBILL DETAIL /productions/:id */}
        {routeId === 'production-detail' &&
          (() => {
            const prod = data.ent.concerts.find((c) => c.concertId === resolved.pathParams.id);
            if (!prod) return <SiteNotFoundView site={site} navigate={navigate} />;
            return (
              <section style={{ padding: '1.5rem', background: '#fffdf7', border: '2px solid var(--site-border)' }} className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                  MARIGOLD PLAYBILL · {prod.dateLabel}
                </span>
                <h2 style={{ margin: 0 }}>{prod.title}</h2>
                <p style={{ margin: 0, color: 'var(--site-muted)' }}>{prod.audienceReaction}</p>
                <TicketPurchaseWidget concerts={[prod]} data={data} accentColor="#8c2323" />
              </section>
            );
          })()}

        {/* THE SEASON & OUR COMPANY */}
        {(routeId === 'season' || routeId === 'company') && (
          <section style={{ padding: '1.4rem', background: '#fffdf7', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'season' ? 'Season Program & Repertory Calendar' : 'Permanent Crew & Visiting Ensembles'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Beatrice Thorne’s Season Programming blends original Aureline plays, Leo Sterling stage revivals, and
              visiting Femme Fatale & Wonder-Wind runs supported by Walter Finch’s permanent fly-loft and orchestra pit.
            </p>
            <div style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h3>Reserve Stage Hold at The Marigold Theatre (1,200 Seats · 480 ₢)</h3>
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_MARIGOLD_THEATRE" accentColor="#8c2323" />
            </div>
          </section>
        )}

        {/* VISIT */}
        {routeId === 'visit' && (
          <section style={{ padding: '1.4rem', background: '#fffdf7', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Visiting Marigold Square</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Located on Marigold Square in the Promenade Quarter of Aureline. Box office opens two hours prior to
              curtain; full acoustic balcony and orchestra stalls accommodate 1,200 patrons.
            </p>
          </section>
        )}

        {/* AUDITIONS */}
        {routeId === 'auditions' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Stage, Musical & Repertory Auditions</h2>
            <AuditionListWidget auditions={stageAuditions} data={data} accentColor="#8c2323" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
