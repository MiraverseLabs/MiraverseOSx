import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { TicketPurchaseWidget, VenueBookingForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  EcosystemDirectorySection,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const BOWL_SECTIONS = [
  {
    id: 'concourse',
    label: 'Upper Concourse',
    description: 'Panoramic outer bowl ring with broadcast sightlines, merch concourses, and North/South gate access.',
    path: 'M 58 22 H 202 Q 235 22 235 56 V 160 Q 235 194 202 194 H 58 Q 25 194 25 160 V 56 Q 25 22 58 22 Z',
  },
  {
    id: 'lower-ring',
    label: 'Lower Ring',
    description: 'Tiered acoustic bowl wrapping directly around the main stage floor.',
    path: 'M 67 53 H 193 Q 205 53 205 65 V 150 Q 205 162 193 162 H 67 Q 55 162 55 150 V 65 Q 55 53 67 53 Z',
  },
  {
    id: 'club-box',
    label: 'Club Boxes',
    description: 'Private hospitality suites flanking the central broadcast bowl.',
    path: 'M 76 80 H 184 V 106 H 76 Z',
  },
] as const;

export function SilverleafStadiumSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const stadiumConcerts = data.ent.concerts.filter((c) => c.venueOrgId === site.orgId);
  const selectedSectionId = resolved.params.get('section') || 'concourse';
  const activeSection = BOWL_SECTIONS.find((s) => s.id === selectedSectionId) ?? BOWL_SECTIONS[0];

  const navItems = [
    { id: 'home', path: '/', label: 'Home' },
    { id: 'events', path: '/events', label: "What's On" },
    { id: 'tickets', path: '/tickets', label: 'Tickets' },
    { id: 'visit', path: '/visit', label: 'Plan Your Visit' },
    { id: 'hospitality', path: '/hospitality', label: 'Hospitality' },
    { id: 'venue-hire', path: '/venue-hire', label: 'Venue Hire' },
  ];

  const renderSeatingBowl = () => (
    <aside className="sl-bowl-card" aria-label="Silverleaf Stadium seating bowl guide">
      <h3 style={{ margin: '0 0 0.5rem' }}>Interactive Bowl Map (45,000 Capacity)</h3>
      <svg
        role="img"
        aria-label="Schematic seating bowl of Silverleaf Stadium in Aureline"
        viewBox="0 0 260 216"
        className="sl-bowl-svg"
      >
        {BOWL_SECTIONS.map((sec) => (
          <path key={sec.id} d={sec.path} className={sec.id === activeSection.id ? 'is-selected' : undefined} />
        ))}
        <text x="130" y="138" textAnchor="middle" fill="#f1f7fd" fontSize="11" fontWeight="700">
          MAIN STAGE FLOOR
        </text>
      </svg>
      <div className="ent-action-row" style={{ marginTop: '0.75rem' }}>
        {BOWL_SECTIONS.map((sec) => (
          <SiteLink
            key={sec.id}
            href={buildSiteUrl(site, routeId === 'home' ? '/events' : resolved.pathname, new URLSearchParams({ section: sec.id }))}
            navigate={navigate}
            current={sec.id === activeSection.id}
            className={sec.id === activeSection.id ? 'ent-btn-primary' : 'ent-btn-secondary'}
          >
            {sec.label}
          </SiteLink>
        ))}
      </div>
      <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--site-muted)' }}>
        <strong style={{ color: 'var(--site-ink)' }}>{activeSection.label}:</strong> {activeSection.description}
      </p>
    </aside>
  );

  return (
    <div className="ent-root site-silverleaf" data-site-shell="stadium-venue">
      <header className="sl-topbar">
        <div className="sl-brand">
          <h1>{site.name}</h1>
          <span className="sl-capacity-pill">SILVERLEAF PARK, AURELINE · 45,000 CAPACITY · BROADCAST BOWL</span>
        </div>
        <nav className="sl-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="sl-content">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#f59e0b" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — EVENT POSTER WALL */}
        {routeId === 'home' && (
          <>
            <section className="sl-poster-wall">
              <article className="sl-bowl-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <span className="sl-capacity-pill">FEATURED HEADLINE BOWL</span>
                {stadiumConcerts[0] ? (
                  <>
                    <h2 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.2rem)' }}>{stadiumConcerts[0].title}</h2>
                    <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem' }}>
                      {stadiumConcerts[0].dateLabel} · {stadiumConcerts[0].ticketsSold.toLocaleString()} /{' '}
                      {stadiumConcerts[0].capacity.toLocaleString()} seats spoken for · {stadiumConcerts[0].ticketPrice} ₢
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{stadiumConcerts[0].audienceReaction}</p>
                    <div className="ent-action-row">
                      <SiteLink
                        href={buildSiteUrl(site, `/events/${encodeURIComponent(stadiumConcerts[0].concertId)}`)}
                        navigate={navigate}
                        className="ent-btn-primary"
                      >
                        <Ticket size={14} aria-hidden="true" />
                        <span>Event Details & Tickets</span>
                      </SiteLink>
                      <SiteLink
                        href={crossSiteLinks.songbirdArtist(stadiumConcerts[0].artistId)}
                        navigate={navigate}
                        className="ent-btn-secondary"
                      >
                        Hear {stadiumConcerts[0].stageName} on Songbird
                      </SiteLink>
                    </div>
                  </>
                ) : (
                  <p>{site.description}</p>
                )}
              </article>

              {renderSeatingBowl()}
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CalendarDays size={18} aria-hidden="true" />
                <span>Upcoming Silverleaf Park Calendar</span>
              </h2>
              <TicketPurchaseWidget concerts={stadiumConcerts} data={data} accentColor="#f59e0b" showWallet={false} />
            </section>
          </>
        )}

        {/* WHAT'S ON (/events & legacy /box-office) */}
        {routeId === 'events' && (
          <div className="sl-poster-wall">
            <section className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>What’s On at Silverleaf Stadium</h2>
              <TicketPurchaseWidget concerts={stadiumConcerts} data={data} accentColor="#f59e0b" />
            </section>
            {renderSeatingBowl()}
          </div>
        )}

        {/* EVENT DETAIL (/events/:id) */}
        {routeId === 'event-detail' &&
          (() => {
            const con = data.ent.concerts.find((c) => c.concertId === resolved.pathParams.id);
            if (!con) return <SiteNotFoundView site={site} navigate={navigate} />;
            return (
              <div className="sl-poster-wall">
                <section className="sl-bowl-card ent-widget-stack">
                  <span className="sl-capacity-pill">{con.dateLabel} · SILVERLEAF PARK</span>
                  <h2 style={{ margin: 0 }}>{con.title}</h2>
                  <p style={{ margin: 0, color: 'var(--site-muted)' }}>{con.audienceReaction}</p>
                  <p className="ent-mono-tag">
                    Headliner:{' '}
                    <SiteLink href={crossSiteLinks.songbirdArtist(con.artistId)} navigate={navigate} style={{ color: '#fde68a' }}>
                      {con.stageName}
                    </SiteLink>{' '}
                    · Attendance: {con.ticketsSold.toLocaleString()} / {con.capacity.toLocaleString()}
                  </p>
                  <TicketPurchaseWidget concerts={[con]} data={data} accentColor="#f59e0b" />
                </section>
                {renderSeatingBowl()}
              </div>
            );
          })()}

        {/* TICKETS */}
        {routeId === 'tickets' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Silverleaf Box Office & Citizen Ticket Wallet</h2>
            <TicketPurchaseWidget concerts={stadiumConcerts} data={data} accentColor="#f59e0b" />
          </section>
        )}

        {/* PLAN YOUR VISIT */}
        {routeId === 'visit' && (
          <section className="ent-about-grid">
            <article className="sl-bowl-card ent-widget-stack">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapPin size={18} aria-hidden="true" />
                <span>Arriving at Silverleaf Park, Aureline</span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                Doors open 90 minutes before headline sets across North Promenade, East Rail, and South Park gates.
                Silverleaf Stadium holds 45,000 citizens across Concourse, Lower Ring, and Club Box levels.
              </p>
            </article>
            {renderSeatingBowl()}
          </section>
        )}

        {/* HOSPITALITY */}
        {routeId === 'hospitality' && (
          <section className="sl-bowl-card ent-widget-stack">
            <h2 style={{ margin: 0 }}>Club Boxes, Broadcast Suites & Hospitality</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Managed by Paula Vance’s Crowd, Hospitality & Seasonal Staffing team. Suites include private concourse
              entry, stage-level acoustic feeds, and coordinated press-line access for Radiance Awards and Pop Sticker
              live broadcasts.
            </p>
          </section>
        )}

        {/* AUTHENTICATED VENUE HIRE */}
        {routeId === 'venue-hire' && (
          <AuthPortalGate
            data={data}
            portalName="Silverleaf Stadium Venue Hire & Promoter Holds"
            description="Reserve a headline date at Silverleaf Stadium (45,000 capacity · 4,500 ₢ rental hold · 55+ Recognition tier required)."
          >
            <section className="sl-bowl-card ent-widget-stack">
              <h2 style={{ margin: 0 }}>Book Headline Date at Silverleaf Stadium</h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                Current performer recognition:{' '}
                <strong>{data.playerArtist ? data.playerArtist.recognition : 'No performer profile active'}</strong> (55+ required).
              </p>
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_SILVERLEAF_STADIUM" accentColor="#f59e0b" />
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'directory' && <EcosystemDirectorySection currentSite={site} data={data} navigate={navigate} />}
        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}

        <footer style={{ borderBlockStart: '1px solid var(--site-border)', paddingBlockStart: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem' }}>
          <SiteLink href={buildSiteUrl(site, '/about')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            Venue Information
          </SiteLink>
          <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            Industry Directory
          </SiteLink>
          <SiteLink href={crossSiteLinks.orgHome('ORG_VELVET_CURTAIN', '/touring')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            Velvet Curtain Touring ↗
          </SiteLink>
        </footer>
      </main>
    </div>
  );
}
