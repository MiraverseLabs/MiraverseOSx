import { Compass, Ticket } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { TicketPurchaseWidget, VenueBookingForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

/**
 * Canonical Velvet Curtain Productions (ORG_VELVET_CURTAIN, velcur.mer) —
 * touring production & live-event promoter (confirmed canonical identity).
 */
export function VelvetCurtainSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const promotedShows = data.ent.concerts.filter((c) => c.promoterOrgId === site.orgId);

  const navItems = [
    { id: 'home', path: '/', label: 'Current Productions' },
    { id: 'touring', path: '/touring', label: 'Touring' },
    { id: 'tickets', path: '/tickets', label: 'Tickets' },
    { id: 'services', path: '/services', label: 'Production Services' },
    { id: 'about', path: '/about', label: 'About Velvet Curtain' },
  ];

  return (
    <div className="ent-root site-velvet" data-site-shell="touring-playbill">
      <aside className="vc-rail" aria-label="Velvet Curtain touring navigation">
        <div>
          <Compass size={20} aria-hidden="true" style={{ color: '#f0abfc', marginBottom: '0.35rem' }} />
          <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.2rem', lineHeight: 1.2 }}>
            Velvet Curtain
          </h1>
          <small style={{ color: 'var(--site-muted)', fontSize: '0.7rem' }}>
            Touring Productions · Quay Logistics House
          </small>
        </div>

        <nav className="vc-nav" aria-label={resolved.config.navAriaLabel}>
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

        <div style={{ marginTop: 'auto', padding: '0.75rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.45rem', fontSize: '0.74rem' }}>
          <strong style={{ display: 'block', color: '#f0abfc', marginBottom: '0.2rem' }}>Live Itinerary</strong>
          {promotedShows.map((s) => (
            <div key={s.concertId} style={{ color: 'var(--site-muted)', marginTop: '0.2rem' }}>
              {s.venue} · C{s.scheduledCycle}
            </div>
          ))}
        </div>
      </aside>

      <main className="vc-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#c026d3" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {routeId === 'home' && (
          <>
            <section className="vc-hero" aria-label="Velvet Curtain touring spotlight">
              <img
                src="/media/entertainment/marigold-theatre-stage.jpg"
                alt="Velvet Curtain live stage rigging and theatrical lighting"
                onError={(e) => {
                  e.currentTarget.src = '/media/posters/poster-wind-archive-collage.jpg';
                }}
              />
              <div className="vc-hero-scrim ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#f0abfc' }}>
                  VELVET CURTAIN PRODUCTIONS · PAN-MERIDION TOURING
                </span>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.65rem, 3.3cqi, 2.45rem)', lineHeight: 1.05 }}>
                  {site.tagline}
                </h2>
                <p style={{ margin: 0, color: '#f5d0fe', fontSize: '0.86rem', maxInlineSize: '36rem' }}>
                  {site.description}
                </p>
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/tickets')} navigate={navigate} className="ent-btn-primary">
                    <Ticket size={14} aria-hidden="true" />
                    <span>Tour Box Office</span>
                  </SiteLink>
                  <SiteLink href={buildSiteUrl(site, '/touring')} navigate={navigate} className="ent-btn-secondary">
                    Inspect Tour Itinerary →
                  </SiteLink>
                </div>
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Promoted Stage & Arena Productions</h2>
              <TicketPurchaseWidget concerts={promotedShows} data={data} accentColor="#c026d3" showWallet={false} />
            </section>
          </>
        )}

        {routeId === 'touring' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Inter-Realm Touring Itinerary</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.86rem' }}>
              Routed by Marcus Holt’s Settlement Desk across The Marigold Theatre (1,200 cap) and Silverleaf Stadium
              (45,000 cap).
            </p>
            <ul className="ent-ticket-list" role="list">
              {promotedShows.map((show) => (
                <li key={show.concertId} className="ent-ticket-item">
                  <div className="ent-ticket-meta">
                    <strong>{show.title}</strong>
                    <span>
                      {show.venue} · {show.dateLabel} · {show.ticketsSold.toLocaleString()} /{' '}
                      {show.capacity.toLocaleString()} seats
                    </span>
                  </div>
                  <SiteLink href={crossSiteLinks.orgHome(show.venueOrgId, '/tickets')} navigate={navigate} className="ent-btn-secondary">
                    Venue Page ↗
                  </SiteLink>
                </li>
              ))}
            </ul>
          </section>
        )}

        {routeId === 'tickets' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Velvet Curtain Touring Box Office & Wallet</h2>
            <TicketPurchaseWidget concerts={promotedShows} data={data} accentColor="#c026d3" />
          </section>
        )}

        {routeId === 'services' && (
          <section style={{ padding: '1.4rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', borderRadius: '0.65rem' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Venue Holds, Rigging & Road Crew Routing</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>
              Gideon Sparks’ Rigging & Sound Operations dispatches road crews across Aureline and regional realms.
            </p>
            <VenueBookingForm data={data} accentColor="#c026d3" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
