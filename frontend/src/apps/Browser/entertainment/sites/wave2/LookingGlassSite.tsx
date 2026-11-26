import { Music2, Ticket } from 'lucide-react';
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

/**
 * Canonical 180-capacity live-music room at 9 Lantern Alley, Glassline District, Aureline.
 */
export function LookingGlassSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const clubGigs = data.ent.concerts.filter((c) => c.venueOrgId === site.orgId);
  const clubAuditions = data.ent.auditions.filter(
    (a) => a.orgId === site.orgId || a.productionOrgId === site.orgId,
  );

  const navItems = [
    { id: 'home', path: '/', label: 'Tonight' },
    { id: 'gigs', path: '/gigs', label: 'Upcoming Gigs' },
    { id: 'the-room', path: '/the-room', label: 'The Room' },
    { id: 'tickets', path: '/tickets', label: 'Tickets' },
    { id: 'submissions', path: '/submissions', label: 'Artist Submissions' },
    { id: 'about', path: '/about', label: '9 Lantern Alley' },
  ];

  const featuredGig = clubGigs[0];

  return (
    <div className="ent-root site-lookingglass" data-site-shell="live-club">
      <header className="lg-marquee">
        <div>
          <span className="ent-mono-tag" style={{ color: '#fbbf24' }}>
            9 LANTERN ALLEY · GLASSLINE DISTRICT · 180 CAPACITY LIVE ROOM
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.4rem, 3cqi, 2.2rem)', letterSpacing: '0.06em' }}>
            {site.name}
          </h1>
        </div>
        <nav className="lg-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="lg-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#d97706" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* TONIGHT HOME */}
        {routeId === 'home' && (
          <>
            <section className="lg-chalkboard">
              <div className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#fbbf24' }}>
                  ON THE BILL · DOORS 19:30 · NO BACKING TRACKS
                </span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.35rem, 2.8cqi, 2rem)' }}>
                  {featuredGig ? featuredGig.title : site.tagline}
                </h2>
                <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  {featuredGig
                    ? `${featuredGig.dateLabel} · ${featuredGig.ticketsSold} / ${featuredGig.capacity} standing & table spots · ${featuredGig.ticketPrice} ₢ at the door. ${featuredGig.audienceReaction}`
                    : site.description}
                </p>
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/tickets')} navigate={navigate} className="ent-btn-primary">
                    <Ticket size={14} aria-hidden="true" />
                    <span>Door Tickets ({featuredGig?.ticketPrice ?? 22} ₢)</span>
                  </SiteLink>
                  {featuredGig && (
                    <SiteLink
                      href={crossSiteLinks.songbirdArtist(featuredGig.artistId)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                    >
                      Hear {featuredGig.stageName} on Songbird ↗
                    </SiteLink>
                  )}
                </div>
              </div>
              <img
                src="/media/posters/poster-coastal-escapade.jpg"
                alt="Hand-printed gig poster from The Looking Glass on Lantern Alley"
                style={{ inlineSize: '100%', maxBlockSize: '280px', objectFit: 'cover', border: '1px solid var(--site-border)' }}
              />
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Music2 size={17} aria-hidden="true" />
                <span>This Week on the Gig Board</span>
              </h2>
              <TicketPurchaseWidget concerts={clubGigs} data={data} accentColor="#d97706" showWallet={false} />
            </section>
          </>
        )}

        {/* UPCOMING GIGS & TICKETS */}
        {(routeId === 'gigs' || routeId === 'tickets') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'gigs' ? 'Upcoming Glassline Nights' : 'Door Tickets & Citizen Wallet'}
            </h2>
            <TicketPurchaseWidget concerts={clubGigs} data={data} accentColor="#d97706" />
          </section>
        )}

        {/* THE ROOM */}
        {routeId === 'the-room' && (
          <section className="ent-about-grid">
            <article style={{ padding: '1.25rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Inside 9 Lantern Alley</h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                180 capacity. Timber acoustics, zero sightline obstructions, and a house front-of-house mix run by
                Rico Moss. Jules Marlowe books emerging independent musicians before labels ever hear their name.
              </p>
              <button
                type="button"
                className="ent-btn-secondary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => data.actions.openWorknetMission('qn-05')}
              >
                QUESTNOTICE: Looking Glass Soundcheck Shift ↗
              </button>
            </article>
            <article style={{ padding: '1.25rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h3 style={{ margin: 0 }}>Room Specifications</h3>
              <ul className="ent-dept-list" role="list" style={{ fontSize: '0.84rem' }}>
                <li>Capacity: 180 (110 standing floor, 70 lantern tables)</li>
                <li>Artist Rental Hold: 65 ₢ · Open to all recognition tiers</li>
                <li>Neighborhood: Glassline District, Aureline</li>
              </ul>
            </article>
          </section>
        )}

        {/* ARTIST SUBMISSIONS (Open Stage & Room Hold) */}
        {routeId === 'submissions' && (
          <div className="ent-widget-stack">
            <section className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Open-Stage Auditions & Thursday Opener Slots</h2>
              <AuditionListWidget auditions={clubAuditions} data={data} accentColor="#d97706" />
            </section>
            <section style={{ padding: '1.25rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h3 style={{ margin: 0 }}>Book Your Own Night at The Looking Glass (65 ₢ Hold)</h3>
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_LOOKING_GLASS" accentColor="#d97706" />
            </section>
          </div>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
