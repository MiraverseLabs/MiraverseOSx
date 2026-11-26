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
          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
            TRADE-WIND PAVILION · ELODIA, BRISLAND
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.35rem, 2.8cqi, 2rem)', fontWeight: 500 }}>
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
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#2c6860" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* PRODUCTIONS & TOUR */}
        {(routeId === 'home' || routeId === 'tour') && (
          <>
            <section className="ent-about-grid" style={{ padding: '1.35rem', background: '#ffffff', border: '1px solid var(--site-border)', alignItems: 'center' }}>
              <div className="ent-widget-stack">
                <h2 style={{ margin: 0, fontWeight: 500 }}>{site.tagline}</h2>
                <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {site.description}
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink href={buildSiteUrl(site, '/workshops')} navigate={navigate} className="ent-btn-primary">
                    Open Ensemble Auditions
                  </SiteLink>
                  <SiteLink href={crossSiteLinks.songbirdArtist('ART-SORA')} navigate={navigate} className="ent-btn-secondary">
                    Hear Sora Takahashi’s Score ↗
                  </SiteLink>
                </div>
              </div>
              <img
                src="/media/posters/poster-wind-archive-collage.jpg"
                alt="Wonder-Wind and Marigold Theatre Wind Archive spatial choreography poster"
                style={{ inlineSize: '100%', maxBlockSize: '280px', objectFit: 'cover' }}
              />
            </section>

            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                <h2 style={{ margin: 0, fontWeight: 500 }}>Cross-Realm Tour Itinerary</h2>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {['All', 'Brisland', 'Orynvell', 'Kaji', 'Marlowe'].map((realm) => (
                    <button
                      key={realm}
                      type="button"
                      className={realmFilter === realm ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.2rem 0.65rem', fontSize: '0.76rem' }}
                      onClick={() => setRealmFilter(realm)}
                    >
                      {realm}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {visibleStops.map((stop) => (
                  <li key={stop.id} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                    <div className="ent-ticket-meta">
                      <strong>{stop.work}</strong>
                      <span>
                        {stop.venue} · Realm: {stop.realm}
                      </span>
                      <small>{stop.note}</small>
                    </div>
                    <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                      {stop.realm}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* COMPANY & COLLABORATIONS */}
        {(routeId === 'company' || routeId === 'collaborations') && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>
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

        {/* WORKSHOPS & AUDITIONS */}
        {routeId === 'workshops' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontWeight: 500 }}>
              Spatial Movement Workshops & Open Ensemble Auditions
            </h2>
            <AuditionListWidget auditions={wwAuditions} data={data} accentColor="#2c6860" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
