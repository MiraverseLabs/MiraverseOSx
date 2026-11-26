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

const REPERTORY_SEASON_CARDS = [
  {
    id: 'rep-crimson-mirrors',
    badge: 'VISITING PREMIERE',
    title: 'Femme Fatale — Crimson Mirrors',
    subtitle: 'Dance-Theatre Residency · Main Proscenium',
    schedule: 'Matinee & Evening Curtain · 1,200 Seats',
    linkType: 'org' as const,
    orgId: 'ORG_FEMME_FATALE',
  },
  {
    id: 'rep-twilight-drift',
    badge: 'TOURING GALA',
    title: 'Wonder-Wind — Lantern Currents',
    subtitle: 'Contemporary Ensemble & Live Strings',
    schedule: 'Limited 4-Night Run · Orchestra Pit Open',
    linkType: 'org' as const,
    orgId: 'ORG_WONDER_WIND',
  },
  {
    id: 'rep-velvet-curtain',
    badge: 'CO-PRODUCTION',
    title: 'Velvet Curtain — Autumn Repertory',
    subtitle: 'Touring Stagecraft & Dramatic Revivals',
    schedule: 'Promenade Quarter Season Showcase',
    linkType: 'org' as const,
    orgId: 'ORG_VELVET_CURTAIN',
  },
];

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
  const stageCast = data.publicArtists.filter(
    (a) => a.disciplines.includes('acting') || a.disciplines.includes('dance'),
  );

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
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#d4a348" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* WHAT'S ON PLAYBILL HOME (PDF pp. 34 & 54) */}
        {routeId === 'home' && (
          <>
            {/* Crimson Velvet & Antique Gold Proscenium Hero */}
            <section className="mg-hero">
              <img
                src="/media/entertainment/marigold-theatre-stage.jpg"
                alt="Gilded proscenium stage and crimson velvet seating inside The Marigold Theatre"
              />
              <div className="mg-hero-scrim">
                <div className="ent-widget-stack" style={{ maxInlineSize: '42rem' }}>
                  <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                    NOW ON STAGE · CYCLE {data.cycle} REPERTORY PLAYBILL
                  </span>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.65rem, 3.6cqi, 2.55rem)', lineHeight: 1.1 }}>
                    {featuredShow ? featuredShow.title : 'Femme Fatale — Crimson Mirrors Premiere'}
                  </h2>
                  <p style={{ margin: 0, color: '#efe0c6', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {featuredShow
                      ? `${featuredShow.dateLabel} · Starring ${featuredShow.stageName}. ${featuredShow.audienceReaction}`
                      : site.description}
                  </p>
                  <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    {featuredShow ? (
                      <SiteLink
                        href={buildSiteUrl(site, `/productions/${encodeURIComponent(featuredShow.concertId)}`)}
                        navigate={navigate}
                        className="ent-btn-primary"
                      >
                        View Digital Playbill →
                      </SiteLink>
                    ) : (
                      <SiteLink href={buildSiteUrl(site, '/season')} navigate={navigate} className="ent-btn-primary">
                        Explore Season Playbill →
                      </SiteLink>
                    )}
                    <SiteLink
                      href={buildSiteUrl(site, '/season')}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ background: 'rgba(212, 163, 72, 0.14)', color: '#fdf2dc', borderColor: 'rgba(212, 163, 72, 0.55)' }}
                    >
                      Stage Holds & Season Calendar
                    </SiteLink>
                  </div>
                </div>
              </div>
            </section>

            {/* THIS SEASON AT THE MARIGOLD horizontal show-card strip */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div>
                  <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                    THIS SEASON AT THE MARIGOLD
                  </span>
                  <h2 style={{ margin: '0.2rem 0 0', fontSize: 'clamp(1.25rem, 2.5cqi, 1.65rem)' }}>
                    Mainstage Engagements & Visiting Companies
                  </h2>
                </div>
                <SiteLink href={buildSiteUrl(site, '/auditions')} navigate={navigate} className="ent-btn-secondary">
                  Stage Auditions ({stageAuditions.length})
                </SiteLink>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '1rem' }}>
                {theatreShows.map((show) => (
                  <article
                    key={show.concertId}
                    style={{
                      padding: '1.1rem',
                      background: 'var(--site-surface-alt)',
                      border: '1px solid var(--site-border)',
                      borderRadius: '0.55rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                      LIVE BOX OFFICE · {show.dateLabel}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.12rem' }}>{show.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)', lineHeight: 1.5, flex: 1 }}>
                      Featuring {show.stageName} · {show.ticketsSold.toLocaleString()} / {show.capacity.toLocaleString()} seats reserved.
                    </p>
                    <SiteLink
                      href={buildSiteUrl(site, `/productions/${encodeURIComponent(show.concertId)}`)}
                      navigate={navigate}
                      className="ent-btn-primary"
                      style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
                    >
                      Open Playbill & Seats →
                    </SiteLink>
                  </article>
                ))}

                {REPERTORY_SEASON_CARDS.map((card) => (
                  <article
                    key={card.id}
                    style={{
                      padding: '1.1rem',
                      background: 'var(--site-surface-alt)',
                      border: '1px solid var(--site-border)',
                      borderRadius: '0.55rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                      {card.badge}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.12rem' }}>{card.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)', lineHeight: 1.5, flex: 1 }}>
                      {card.subtitle} · {card.schedule}
                    </p>
                    <SiteLink
                      href={crossSiteLinks.orgHome(card.orgId)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}
                    >
                      Visiting Company ↗
                    </SiteLink>
                  </article>
                ))}
              </div>
            </section>

            {/* 3-Column Theatrical Bottom Band: DIGITAL PLAYBILL + MEET THE CAST + TICKETS & DATES */}
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
                gap: '1.1rem',
                alignItems: 'start',
              }}
            >
              {/* Column 1: Digital Playbill */}
              <article
                style={{
                  padding: '1.25rem',
                  background: 'var(--site-surface-alt)',
                  border: '1px solid var(--site-border)',
                  borderRadius: '0.55rem',
                }}
                className="ent-widget-stack"
              >
                <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                  DIGITAL PLAYBILL
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Curator’s Programme Notes</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                  Under Beatrice Thorne’s Season Programming, Cycle {data.cycle} pairs original Aureline plays and Leo
                  Sterling stage revivals with full fly-loft choreography managed by Walter Finch’s resident technical
                  crew.
                </p>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: '#f3d6a4', borderBlockStart: '1px solid var(--site-border)', paddingTop: '0.6rem' }}>
                  <div>Act I · 19:30 Curtain (55 min)</div>
                  <div>Intermission · Promenade Velvet Foyer (20 min)</div>
                  <div>Act II · 20:45 Curtain (50 min)</div>
                </div>
              </article>

              {/* Column 2: Meet the Cast */}
              <article
                style={{
                  padding: '1.25rem',
                  background: 'var(--site-surface-alt)',
                  border: '1px solid var(--site-border)',
                  borderRadius: '0.55rem',
                }}
                className="ent-widget-stack"
              >
                <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                  MEET THE CAST & ENSEMBLES
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Featured Stage Performers</h3>
                <ul className="ent-dept-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {stageCast.slice(0, 3).map((artist) => (
                    <li key={artist.artistId} style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{artist.stageName}</strong>
                        <SiteLink
                          href={crossSiteLinks.songbirdArtist(artist.artistId)}
                          navigate={navigate}
                          className="ent-btn-secondary"
                          style={{ minBlockSize: '28px', padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
                        >
                          Bio ↗
                        </SiteLink>
                      </div>
                      <small style={{ color: 'var(--site-muted)' }}>
                        {artist.disciplines.join(' · ')} — {artist.tier}
                      </small>
                    </li>
                  ))}
                </ul>
              </article>

              {/* Column 3: Tickets & Dates */}
              <article
                style={{
                  padding: '1.25rem',
                  background: 'var(--site-surface-alt)',
                  border: '1px solid var(--site-border)',
                  borderRadius: '0.55rem',
                  fontFamily: 'system-ui, sans-serif',
                }}
                className="ent-widget-stack"
              >
                <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                  TICKETS & DATES · 1,200 SEATS
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Georgia, serif' }}>
                  Box Office & Citizen Wallet
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', textAlign: 'center', fontSize: '0.74rem' }}>
                  <div style={{ padding: '0.45rem', border: '1px solid var(--site-border)', borderRadius: '0.35rem' }}>
                    <strong style={{ display: 'block', color: '#f4cc7c' }}>THU</strong>
                    <span>19:30</span>
                  </div>
                  <div style={{ padding: '0.45rem', border: '1px solid #d4a348', background: 'rgba(212, 163, 72, 0.16)', borderRadius: '0.35rem' }}>
                    <strong style={{ display: 'block', color: '#fdf2dc' }}>FRI GALA</strong>
                    <span>20:00</span>
                  </div>
                  <div style={{ padding: '0.45rem', border: '1px solid var(--site-border)', borderRadius: '0.35rem' }}>
                    <strong style={{ display: 'block', color: '#f4cc7c' }}>SAT MAT</strong>
                    <span>14:30</span>
                  </div>
                </div>
                <TicketPurchaseWidget concerts={theatreShows} data={data} accentColor="#d4a348" />
              </article>
            </section>
          </>
        )}

        {/* PRODUCTION PLAYBILL DETAIL /productions/:id */}
        {routeId === 'production-detail' &&
          (() => {
            const prod = data.ent.concerts.find((c) => c.concertId === resolved.pathParams.id);
            if (!prod) return <SiteNotFoundView site={site} navigate={navigate} />;
            return (
              <section className="ent-widget-stack">
                <div className="mg-hero" style={{ minBlockSize: '210px' }}>
                  <img
                    src="/media/entertainment/marigold-theatre-stage.jpg"
                    alt={`Stage view for ${prod.title} at The Marigold Theatre`}
                  />
                  <div className="mg-hero-scrim">
                    <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
                      MARIGOLD DIGITAL PLAYBILL · {prod.dateLabel} · 1,200 SEATS
                    </span>
                    <h2 style={{ margin: '0.25rem 0 0', fontSize: 'clamp(1.5rem, 3cqi, 2.2rem)' }}>{prod.title}</h2>
                    <p style={{ margin: '0.4rem 0 0', color: '#efe0c6' }}>
                      Lead Billing: {prod.stageName} · {prod.audienceReaction}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    padding: '1.35rem',
                    background: 'var(--site-surface-alt)',
                    border: '1px solid var(--site-border)',
                    borderRadius: '0.55rem',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                  className="ent-widget-stack"
                >
                  <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Reserve Seats for This Engagement</h3>
                  <TicketPurchaseWidget concerts={[prod]} data={data} accentColor="#d4a348" />
                </div>
              </section>
            );
          })()}

        {/* THE SEASON & OUR COMPANY */}
        {(routeId === 'season' || routeId === 'company') && (
          <section
            style={{
              padding: '1.45rem',
              background: 'var(--site-surface-alt)',
              border: '1px solid var(--site-border)',
              borderRadius: '0.55rem',
            }}
            className="ent-widget-stack"
          >
            <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
              {routeId === 'season' ? 'REPERTORY CALENDAR & STAGE HOLDS' : 'RESIDENT CREW & VISITING COMPANIES'}
            </span>
            <h2 style={{ margin: 0 }}>
              {routeId === 'season' ? 'Season Program & Repertory Calendar' : 'Permanent Crew & Visiting Ensembles'}
            </h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Beatrice Thorne’s Season Programming blends original Aureline plays, Leo Sterling stage revivals, and
              visiting Femme Fatale & Wonder-Wind runs supported by Walter Finch’s permanent fly-loft and orchestra pit.
            </p>
            <div style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h3>Reserve Stage Hold at The Marigold Theatre (1,200 Seats · 480 ₢)</h3>
              <VenueBookingForm data={data} restrictVenueOrgId="ORG_MARIGOLD_THEATRE" accentColor="#d4a348" />
            </div>
          </section>
        )}

        {/* VISIT */}
        {routeId === 'visit' && (
          <section
            style={{
              padding: '1.45rem',
              background: 'var(--site-surface-alt)',
              border: '1px solid var(--site-border)',
              borderRadius: '0.55rem',
            }}
            className="ent-widget-stack"
          >
            <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
              PATRON GUIDE · MARIGOLD SQUARE
            </span>
            <h2 style={{ margin: 0 }}>Visiting Marigold Square</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Located on Marigold Square in the Promenade Quarter of Aureline. Box office opens two hours prior to
              curtain; full acoustic balcony, dress circle, and orchestra stalls accommodate 1,200 patrons.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ padding: '0.9rem', border: '1px solid var(--site-border)', borderRadius: '0.45rem' }}>
                <strong style={{ color: '#f4cc7c' }}>Auditorium Capacity</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                  1,200 gilded velvet seats across Orchestra, Dress Circle, and Acoustic Balcony.
                </p>
              </div>
              <div style={{ padding: '0.9rem', border: '1px solid var(--site-border)', borderRadius: '0.45rem' }}>
                <strong style={{ color: '#f4cc7c' }}>Foyer & Box Office</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                  Promenade Quarter rail stop directly opposite the colonnade entrance. Doors open 90 minutes pre-show.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* AUDITIONS */}
        {routeId === 'auditions' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <span className="ent-mono-tag" style={{ color: '#f4cc7c' }}>
              CASTING CALLS · MARIGOLD REPERTORY
            </span>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Stage, Musical & Repertory Auditions</h2>
            <AuditionListWidget auditions={stageAuditions} data={data} accentColor="#d4a348" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
