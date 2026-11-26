import { useState } from 'react';
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

const TOUR_STOPS = [
  { id: 'stop-elodia', realm: 'Brisland', venue: 'Trade-Wind Pavilion, Elodia', work: 'Open-Air Spatial Prelude', note: 'Home residency & movement workshop' },
  { id: 'stop-marigold', realm: 'Orynvell', venue: 'The Marigold Theatre, Aureline', work: 'Wind Archive × Basalt & Breath', note: 'Live acoustic score with Sora Takahashi' },
  { id: 'stop-balisya', realm: 'Kaji', venue: 'Basalt Acoustic Chambers, Balisya', work: 'Chamber Movement Lab', note: 'Collaboration with Kaji Publishing Studios' },
  { id: 'stop-marlowe', realm: 'Marlowe', venue: 'Harbor Pier Amphitheatre, Island City', work: 'Tide & Timber Ensemble', note: 'Cross-realm exchange with Marlie Records musicians' },
] as const;

export function WonderWindSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [realmFilter, setRealmFilter] = useState<string>('All');

  const wwAuditions = data.ent.auditions.filter(
    (a) => a.orgId === site.orgId || a.discipline === 'dance',
  );
  const visibleStops = realmFilter === 'All' ? TOUR_STOPS : TOUR_STOPS.filter((s) => s.realm === realmFilter);

  const navItems = [
    { id: 'home', path: '/', label: 'Productions' },
    { id: 'tour', path: '/tour', label: 'Tour' },
    { id: 'company', path: '/company', label: 'Company' },
    { id: 'collaborations', path: '/collaborations', label: 'Collaborations' },
    { id: 'workshops', path: '/workshops', label: 'Workshops' },
    { id: 'about', path: '/about', label: 'Trade-Wind Pavilion' },
  ];

  return (
    <div className="ent-root site-wonderwind" data-site-shell="touring-dance">
      <header className="wd-header">
        <div>
          <span className="ent-mono-tag" style={{ color: '#e9d5ff' }}>
            TOURING PERFORMANCE COLLECTIVE · ELODIA, BRISLAND
          </span>
          <h1 style={{ margin: '0.1rem 0 0', fontSize: 'clamp(1.25rem, 2.5cqi, 1.8rem)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
        </div>
        <nav className="wd-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="wd-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#c4b5fd" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* PRODUCTIONS & TOUR — Twilight Hero + Floating ON TOUR Card (PDF pp. 37–38) */}
        {(routeId === 'home' || routeId === 'tour') && (
          <>
            <section className="wd-hero" aria-label="Wonder-Wind touring spotlight">
              <img
                src="/media/posters/poster-wind-archive-collage.jpg"
                alt="Wonder-Wind spatial movement touring collage across Meridion"
              />
              <div className="wd-hero-scrim" aria-hidden="true" />

              <div style={{ position: 'relative', zIndex: 1 }} className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#e9d5ff' }}>
                  MOVEMENT BEYOND BORDERS · CROSS-REALM ENSEMBLE
                </span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.75rem, 3.6cqi, 2.75rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.04 }}>
                  {site.tagline}
                </h2>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#e2dbf8', maxInlineSize: '30rem', lineHeight: 1.55 }}>
                  {site.description}
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink href={buildSiteUrl(site, '/workshops')} navigate={navigate} className="ent-btn-primary" style={{ borderRadius: '999px' }}>
                    Join Ensemble Workshops →
                  </SiteLink>
                  <SiteLink href={crossSiteLinks.songbirdArtist('ART-SORA')} navigate={navigate} className="ent-btn-secondary" style={{ borderRadius: '999px' }}>
                    Hear Sora Takahashi’s Score ↗
                  </SiteLink>
                </div>
              </div>

              <aside style={{ position: 'relative', zIndex: 1, background: 'rgba(18, 14, 36, 0.88)', border: '1px solid var(--site-border)', borderRadius: '0.65rem', padding: '1rem', fontFamily: 'system-ui, sans-serif' }} className="ent-widget-stack">
                <strong style={{ letterSpacing: '0.1em', fontSize: '0.78rem', color: '#e9d5ff' }}>✦ ON TOUR</strong>
                {TOUR_STOPS.map((stop) => (
                  <div key={stop.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.76rem', paddingBlockEnd: '0.45rem', borderBlockEnd: '1px solid rgba(255,255,255,0.1)' }}>
                    <div>
                      <strong>{stop.realm}</strong>
                      <div style={{ color: 'var(--site-muted)', fontSize: '0.7rem' }}>{stop.venue}</div>
                    </div>
                    <SiteLink href={buildSiteUrl(site, '/tour')} navigate={navigate} style={{ color: '#e9d5ff', fontWeight: 700, fontSize: '0.72rem' }}>
                      Details →
                    </SiteLink>
                  </div>
                ))}
              </aside>
            </section>

            {/* Realm Filter Itinerary */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                <h2 style={{ margin: 0, fontWeight: 500, fontStyle: 'italic' }}>Cross-Realm Tour Itinerary</h2>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {['All', 'Brisland', 'Orynvell', 'Kaji', 'Marlowe'].map((realm) => (
                    <button
                      key={realm}
                      type="button"
                      className={realmFilter === realm ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', borderRadius: '999px' }}
                      onClick={() => setRealmFilter(realm)}
                    >
                      {realm}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {visibleStops.map((stop) => (
                  <li key={stop.id} className="ent-ticket-item">
                    <div className="ent-ticket-meta">
                      <strong>{stop.work}</strong>
                      <span>
                        {stop.venue} · Realm: {stop.realm}
                      </span>
                      <small>{stop.note}</small>
                    </div>
                    <span className="ent-mono-tag" style={{ color: '#e9d5ff' }}>
                      {stop.realm}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {(routeId === 'company' || routeId === 'collaborations') && (
          <section style={{ padding: '1.4rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', borderRadius: '0.65rem' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500, fontStyle: 'italic' }}>
              {routeId === 'company' ? 'Kaelen Zephyr & Linnea Moss — Artistic Direction' : 'Live Musician & Spatial Collaborations'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Wonder-Wind commissions original movement scores with Sora Takahashi, Kaji Publishing Studios, and
              Marlie Records musicians, performing in civic plazas and The Marigold Theatre.
            </p>
            <button
              type="button"
              className="ent-btn-primary"
              style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
              onClick={() =>
                data.actions.createProject({
                  title: `Wonder-Wind Spatial Collaboration (Cycle ${data.cycle})`,
                  kind: 'choreography',
                  discipline: 'dance',
                  partnerOrgId: site.orgId,
                  collaboratorArtistId: 'ART-SORA',
                  budgetCredits: 80,
                })
              }
            >
              Propose Movement & Live Score Collaboration (80 ₢)
            </button>
          </section>
        )}

        {routeId === 'workshops' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}>
              Spatial Movement Workshops & Open Ensemble Auditions
            </h2>
            <AuditionListWidget auditions={wwAuditions} data={data} accentColor="#c4b5fd" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
