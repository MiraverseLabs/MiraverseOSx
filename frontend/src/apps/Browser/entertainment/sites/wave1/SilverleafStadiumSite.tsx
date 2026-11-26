import { useState } from 'react';
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
  const headliner = stadiumConcerts[0];
  const [selectedTier, setSelectedTier] = useState<'ga' | 'lower' | 'vip'>('ga');
  const [heroQty, setHeroQty] = useState(1);

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
        <text x="130" y="138" textAnchor="middle" fill="#f5f3ff" fontSize="11" fontWeight="700">
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
          <SiteLink
            href={buildSiteUrl(site, '/tickets')}
            navigate={navigate}
            style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', border: '1px solid rgba(245, 158, 11, 0.45)' }}
          >
            Wallet ({data.ent.tickets.length})
          </SiteLink>
        </nav>
      </header>

      <main className="sl-content">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8b5cf6" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — Round 2 Mockup Composition (PDF p. 42) */}
        {routeId === 'home' && (
          <>
            {/* Hero Stage + Floating Inline Get Tickets Tier Drawer */}
            <section className="sl-hero-stage" aria-label="Featured stadium event and ticket selector">
              <img
                src="/media/entertainment/silverleaf-stadium-live.jpg"
                alt="Live stadium crowd and illuminated concert stage at Silverleaf Stadium in Aureline"
                onError={(e) => {
                  e.currentTarget.src = '/images/wallpapers/aureline-city-beneath-the-heavens.png';
                }}
              />
              <div className="sl-hero-scrim" aria-hidden="true" />

              <div className="sl-hero-left ent-widget-stack">
                <span className="sl-capacity-pill">NEXT AT SILVERLEAF STADIUM · 45,000 SEATS</span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.6cqi, 2.7rem)', lineHeight: 1.04, fontWeight: 900 }}>
                  {headliner ? headliner.title : site.tagline}
                </h2>
                <p style={{ margin: 0, color: '#ddd6fe', fontSize: '0.88rem', maxInlineSize: '30rem', lineHeight: 1.55 }}>
                  {headliner
                    ? `${headliner.dateLabel} · ${headliner.ticketsSold.toLocaleString()} / ${headliner.capacity.toLocaleString()} seats reserved · ${headliner.audienceReaction}`
                    : site.description}
                </p>
                <div className="ent-action-row">
                  {headliner && (
                    <SiteLink
                      href={buildSiteUrl(site, `/events/${encodeURIComponent(headliner.concertId)}`)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      Event Details
                    </SiteLink>
                  )}
                  {headliner && (
                    <SiteLink
                      href={crossSiteLinks.songbirdArtist(headliner.artistId)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ borderRadius: '999px' }}
                    >
                      Hear {headliner.stageName} on Songbird ↗
                    </SiteLink>
                  )}
                </div>
              </div>

              {headliner && (
                <aside className="sl-ticket-drawer" aria-label="Quick ticket tier selector">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.86rem', letterSpacing: '0.06em' }}>GET TICKETS</strong>
                    <span className="sl-capacity-pill">HIGH DEMAND</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                    {headliner.dateLabel} · Silverleaf Park, Aureline
                  </div>
                  {([
                    ['ga', 'General Admission Concourse', headliner.ticketPrice],
                    ['lower', 'Lower Ring Bowl', headliner.ticketPrice],
                    ['vip', 'Club Box & Broadcast Lounge', headliner.ticketPrice],
                  ] as const).map(([key, label, price]) => (
                    <button
                      key={key}
                      type="button"
                      className={`sl-tier-option ${selectedTier === key ? 'is-selected' : ''}`}
                      onClick={() => setSelectedTier(key)}
                    >
                      <span>{label}</span>
                      <span className="ent-mono-tag" style={{ color: '#fde68a' }}>
                        {price} ₢
                      </span>
                    </button>
                  ))}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label htmlFor="sl-hero-qty" className="visually-hidden">
                      Ticket quantity
                    </label>
                    <select
                      id="sl-hero-qty"
                      value={heroQty}
                      onChange={(e) => setHeroQty(Number(e.target.value))}
                      className="ent-select-compact"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n}x
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ent-btn-primary"
                      style={{ flex: 1, borderRadius: '0.5rem', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                      onClick={() => data.actions.purchaseTicket(headliner.concertId, heroQty)}
                    >
                      <Ticket size={14} aria-hidden="true" />
                      <span>Buy Tickets Now ({headliner.ticketPrice * heroQty} ₢)</span>
                    </button>
                  </div>
                </aside>
              )}
            </section>

            {/* Middle Band: Interactive Venue Calendar + Upcoming Poster Wall */}
            <section className="sl-mid-band">
              <aside className="sl-cal-box" aria-label="Stadium cycle calendar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CalendarDays size={16} aria-hidden="true" style={{ color: '#a78bfa' }} />
                    <span>Venue Calendar</span>
                  </h3>
                  <span className="ent-mono-tag" style={{ color: '#fde68a' }}>
                    Cycle {data.cycle}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                  Highlighted cycles mark active Meridion live-stage bookings across Aureline.
                </p>
                <div className="sl-cal-grid" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, idx) => {
                    const cyc = data.cycle + idx;
                    const hasShow = data.ent.concerts.some((c) => c.scheduledCycle === cyc);
                    return (
                      <span key={cyc} className={`sl-cal-day ${hasShow ? 'has-event' : ''}`}>
                        C{cyc}
                      </span>
                    );
                  })}
                </div>
                <SiteLink href={buildSiteUrl(site, '/events')} navigate={navigate} className="ent-btn-primary" style={{ justifyContent: 'center' }}>
                  View Full Calendar →
                </SiteLink>
              </aside>

              <div className="ent-widget-stack">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Upcoming at Silverleaf & Aureline Stages</h2>
                  <SiteLink href={buildSiteUrl(site, '/events')} navigate={navigate} style={{ fontSize: '0.78rem', color: '#c4b5fd' }}>
                    See All Events →
                  </SiteLink>
                </div>
                <div className="sl-poster-row">
                  {data.ent.concerts.map((con, idx) => (
                    <article key={con.concertId} className="sl-poster-card">
                      <img
                        src={
                          idx === 0
                            ? '/media/albums/album-meadow-dusk.jpg'
                            : idx === 1
                              ? '/media/posters/poster-wind-archive-collage.jpg'
                              : '/media/albums/album-neon-starlight.jpg'
                        }
                        alt={`Event poster for ${con.title}`}
                        loading="lazy"
                      />
                      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                        <span className="sl-capacity-pill">{con.dateLabel}</span>
                        <strong style={{ fontSize: '0.84rem' }}>{con.title}</strong>
                        <small style={{ color: 'var(--site-muted)', fontSize: '0.74rem' }}>
                          {con.venue} · {con.ticketPrice} ₢
                        </small>
                        <SiteLink
                          href={
                            con.venueOrgId === site.orgId
                              ? buildSiteUrl(site, `/events/${encodeURIComponent(con.concertId)}`)
                              : crossSiteLinks.orgHome(con.venueOrgId, '/tickets')
                          }
                          navigate={navigate}
                          className="ent-btn-primary"
                          style={{ marginTop: 'auto', minBlockSize: '32px', fontSize: '0.74rem' }}
                        >
                          Find Tickets →
                        </SiteLink>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* Bottom 3-Card Band: Seating & Visit | Hospitality | Venue Hire */}
            <section className="sl-bottom-cards">
              <article className="sl-feature-tile">
                <img src="/media/entertainment/silverleaf-stadium-live.jpg" alt="" loading="lazy" />
                <div className="ent-widget-stack" style={{ gap: '0.4rem' }}>
                  <h3 style={{ margin: 0 }}>Seating & Visit</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#e2e8f0' }}>
                    Explore the 45,000-seat bowl map, Aureline rail gates, and accessibility routes.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/visit')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Plan Your Visit →
                  </SiteLink>
                </div>
              </article>

              <article className="sl-feature-tile">
                <img src="/images/wallpapers/aureline-glassline-twilight.png" alt="" loading="lazy" />
                <div className="ent-widget-stack" style={{ gap: '0.4rem' }}>
                  <h3 style={{ margin: 0 }}>Hospitality & Suites</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#e2e8f0' }}>
                    Club Boxes, Radiance broadcast lounges, and curated concourse dining.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/hospitality')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Explore Hospitality →
                  </SiteLink>
                </div>
              </article>

              <article className="sl-feature-tile">
                <img src="/images/wallpapers/aureline-city-beneath-the-heavens.png" alt="" loading="lazy" />
                <div className="ent-widget-stack" style={{ gap: '0.4rem' }}>
                  <h3 style={{ margin: 0 }}>Venue Hire (55+ Recognition)</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#e2e8f0' }}>
                    Headline concerts, multi-realm festivals, and Radiance live broadcasts (4,500 ₢ hold).
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/venue-hire')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Enquire About Venue Hire →
                  </SiteLink>
                </div>
              </article>
            </section>
          </>
        )}

        {/* WHAT'S ON (/events & legacy /box-office) */}
        {routeId === 'events' && (
          <div className="sl-mid-band" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 0.95fr)' }}>
            <section className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>What’s On at Silverleaf Stadium</h2>
              <TicketPurchaseWidget concerts={stadiumConcerts} data={data} accentColor="#6366f1" />
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
              <div className="sl-mid-band" style={{ gridTemplateColumns: 'minmax(0, 1.45fr) minmax(260px, 0.95fr)' }}>
                <section className="sl-bowl-card ent-widget-stack">
                  <span className="sl-capacity-pill">{con.dateLabel} · SILVERLEAF PARK, AURELINE</span>
                  <h2 style={{ margin: 0 }}>{con.title}</h2>
                  <p style={{ margin: 0, color: 'var(--site-muted)' }}>{con.audienceReaction}</p>
                  <p className="ent-mono-tag">
                    Headliner:{' '}
                    <SiteLink href={crossSiteLinks.songbirdArtist(con.artistId)} navigate={navigate} style={{ color: '#fde68a' }}>
                      {con.stageName}
                    </SiteLink>{' '}
                    · Attendance: {con.ticketsSold.toLocaleString()} / {con.capacity.toLocaleString()}
                  </p>
                  <TicketPurchaseWidget concerts={[con]} data={data} accentColor="#6366f1" />
                </section>
                {renderSeatingBowl()}
              </div>
            );
          })()}

        {/* TICKETS */}
        {routeId === 'tickets' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Silverleaf Box Office & Citizen Ticket Wallet</h2>
            <TicketPurchaseWidget concerts={stadiumConcerts} data={data} accentColor="#6366f1" />
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
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_SILVERLEAF_STADIUM" accentColor="#6366f1" />
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
