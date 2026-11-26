import { useState } from 'react';
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
 * Canonical 180-capacity intimate live-music club at 9 Lantern Alley,
 * Glassline District, Aureline (PDF pp. 23 & 60 correction honored).
 */
export function LookingGlassSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [dateTab, setDateTab] = useState<'tonight' | 'upcoming' | 'open'>('tonight');
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
          <h1 style={{ margin: '0.1rem 0 0', fontSize: 'clamp(1.45rem, 3cqi, 2.25rem)', letterSpacing: '0.08em', fontWeight: 500 }}>
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

        {/* TONIGHT HOME — Lantern-Lit Jazz/Soul Club Poster Board */}
        {routeId === 'home' && (
          <>
            <section className="lg-club-hero" aria-label="Tonight at The Looking Glass">
              <img
                src="/media/entertainment/looking-glass-club.jpg"
                alt="Intimate lantern-lit live music club stage at 9 Lantern Alley in Glassline District"
                onError={(e) => {
                  e.currentTarget.src = '/media/posters/poster-coastal-escapade.jpg';
                }}
              />
              <div className="lg-club-scrim" aria-hidden="true" />

              <div style={{ position: 'relative', zIndex: 1 }} className="ent-widget-stack">
                <span className="ent-mono-tag" style={{ color: '#fbbf24' }}>
                  ON STAGE TONIGHT · 180 CAPACITY · NO BACKING TRACKS
                </span>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.65rem, 3.3cqi, 2.45rem)', lineHeight: 1.05 }}>
                  {featuredGig ? featuredGig.title : site.tagline}
                </h2>
                <p style={{ margin: 0, color: '#efe0c8', fontSize: '0.86rem', maxInlineSize: '30rem', lineHeight: 1.55 }}>
                  {featuredGig
                    ? `${featuredGig.dateLabel} · ${featuredGig.ticketsSold} / ${featuredGig.capacity} standing & lantern table spots · ${featuredGig.audienceReaction}`
                    : site.description}
                </p>
                <div className="ent-action-row">
                  {featuredGig && (
                    <button
                      type="button"
                      className="ent-btn-primary"
                      onClick={() => data.actions.purchaseTicket(featuredGig.concertId, 1)}
                    >
                      <Ticket size={14} aria-hidden="true" />
                      <span>Buy Door Ticket ({featuredGig.ticketPrice} ₢)</span>
                    </button>
                  )}
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

              <aside className="lg-settimes-card" aria-label="Set times and room details">
                <strong style={{ color: '#fbbf24', fontSize: '0.82rem', letterSpacing: '0.08em' }}>
                  TONIGHT’S SET TIMES
                </strong>
                <div style={{ fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '64px 1fr', gap: '0.35rem 0.6rem' }}>
                  <span className="ent-mono-tag">19:30</span>
                  <span>Lantern Alley Doors & Bar</span>
                  <span className="ent-mono-tag">20:30</span>
                  <span>Glassline Acoustic Opener</span>
                  <span className="ent-mono-tag">21:45</span>
                  <span>{featuredGig?.stageName ?? 'Headline Set'}</span>
                </div>
                <small style={{ color: 'var(--site-muted)', fontSize: '0.73rem', paddingTop: '0.35rem', borderTop: '1px solid var(--site-border)' }}>
                  Front-of-house sound by Rico Moss · 180 cap room
                </small>
              </aside>
            </section>

            {/* Date-Tabbed Gig Board */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Music2 size={17} aria-hidden="true" style={{ color: '#fbbf24' }} />
                  <span>The Gig Board</span>
                </h2>
                <div className="ent-action-row">
                  {([
                    ['tonight', 'Tonight'],
                    ['upcoming', 'Upcoming Gigs'],
                    ['open', 'Open Stage Calls'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={dateTab === key ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.2rem 0.7rem', fontSize: '0.76rem' }}
                      onClick={() => setDateTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {dateTab === 'open' ? (
                <AuditionListWidget auditions={clubAuditions} data={data} accentColor="#d97706" />
              ) : (
                <TicketPurchaseWidget concerts={clubGigs} data={data} accentColor="#d97706" showWallet={false} />
              )}
            </section>
          </>
        )}

        {(routeId === 'gigs' || routeId === 'tickets') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>
              {routeId === 'gigs' ? 'Upcoming Glassline Nights' : 'Door Tickets & Citizen Wallet'}
            </h2>
            <TicketPurchaseWidget concerts={clubGigs} data={data} accentColor="#d97706" />
          </section>
        )}

        {routeId === 'the-room' && (
          <section className="ent-about-grid">
            <article style={{ padding: '1.25rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Inside 9 Lantern Alley</h2>
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
              <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Room Specifications</h3>
              <ul className="ent-dept-list" role="list" style={{ fontSize: '0.84rem' }}>
                <li>Capacity: 180 (110 standing floor, 70 lantern tables)</li>
                <li>Artist Rental Hold: 65 ₢ · Open to all recognition tiers</li>
                <li>Neighborhood: 9 Lantern Alley, Glassline District, Aureline</li>
              </ul>
            </article>
          </section>
        )}

        {routeId === 'submissions' && (
          <div className="ent-widget-stack">
            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Open-Stage Auditions & Thursday Opener Slots</h2>
              <AuditionListWidget auditions={clubAuditions} data={data} accentColor="#d97706" />
            </section>
            <section style={{ padding: '1.25rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Book Your Own Night at The Looking Glass (65 ₢ Hold)</h3>
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_LOOKING_GLASS" accentColor="#d97706" />
            </section>
          </div>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
