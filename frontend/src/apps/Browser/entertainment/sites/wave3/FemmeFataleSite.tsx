import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { TicketPurchaseWidget } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function FemmeFataleSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const roxanne = data.ent.artists.find((a) => a.artistId === 'ART-ROXANNE');
  const dancers = data.publicArtists.filter((a) => a.disciplines.includes('dance'));
  const shows = data.ent.concerts.filter((c) => c.artistId === 'ART-ROXANNE' || c.venueOrgId === 'ORG_MARIGOLD_THEATRE');
  const danceAuditions = data.ent.auditions.filter((a) => a.discipline === 'dance');

  const navItems = [
    { id: 'home', path: '/', label: 'The Company' },
    { id: 'repertoire', path: '/repertoire', label: 'Repertoire' },
    { id: 'performances', path: '/performances', label: 'Performances' },
    { id: 'dancers', path: '/dancers', label: 'Dancers' },
    { id: 'auditions', path: '/auditions', label: 'Auditions' },
    { id: 'about', path: '/about', label: 'Rehearsal Lofts' },
  ];

  return (
    <div className="ent-root site-femme" data-site-shell="dance-collective">
      <header className="ff-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, fontSize: '1.15rem', color: '#be123c' }}>
            FF
          </span>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
        </div>
        <nav className="ff-nav" aria-label={resolved.config.navAriaLabel}>
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

      {/* Sunlit Rehearsal-Led Hero (PDF p. 51) */}
      {routeId === 'home' && (
        <section className="ff-hero" aria-label="Femme Fatale rehearsal loft">
          <img
            src="/media/entertainment/femme-fatale-rehearsal.jpg"
            alt="Femme Fatale Dance Company rehearsing choreography in a sunlit loft studio"
            onError={(e) => {
              e.currentTarget.src = '/media/entertainment/glassline-atelier.jpg';
            }}
          />
          <div className="ff-hero-scrim">
            <span className="ent-mono-tag" style={{ color: '#fda4af' }}>
              DANCE / CREATE / CONNECT · ARTISTIC DIRECTOR: ROXANNE DELACROIX
            </span>
            <h2 style={{ margin: '0.3rem 0 0.5rem', fontSize: 'clamp(1.85rem, 3.8cqi, 2.85rem)', fontWeight: 900, fontStyle: 'italic', lineHeight: 0.98 }}>
              FEMME FATALE
            </h2>
            <p style={{ margin: '0 0 1rem', color: '#f1f5f9', fontSize: '0.88rem', maxInlineSize: '30rem', lineHeight: 1.55 }}>
              {site.description}
            </p>
            <div className="ent-action-row">
              <SiteLink href={buildSiteUrl(site, '/performances')} navigate={navigate} className="ent-btn-primary" style={{ background: '#18161a', color: '#ffffff' }}>
                Explore Performances →
              </SiteLink>
              <SiteLink href={buildSiteUrl(site, '/auditions')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.55)' }}>
                Company Auditions
              </SiteLink>
            </div>
          </div>
        </section>
      )}

      <main className="ff-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#be123c" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — Split Up Next Showcase & Classes/Commissions (PDF p. 51) */}
        {routeId === 'home' && (
          <>
            <section className="ent-about-grid">
              <article style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 155px', gap: '1rem', alignItems: 'center' }}>
                <div className="ent-widget-stack">
                  <span className="ent-mono-tag" style={{ color: '#be123c' }}>
                    UP NEXT · THE MARIGOLD THEATRE
                  </span>
                  <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.4rem' }}>
                    Crimson Mirrors Premiere
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                    Original choreography by Roxanne Delacroix with custom Glassline Designs stage silhouettes.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/performances')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    Get Tickets →
                  </SiteLink>
                </div>
                <img
                  src="/media/entertainment/marigold-theatre-stage.jpg"
                  alt="Stage spotlight at The Marigold Theatre"
                  style={{ inlineSize: '155px', aspectRatio: '4 / 3', objectFit: 'cover' }}
                  loading="lazy"
                />
              </article>

              <article style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 155px', gap: '1rem', alignItems: 'center' }}>
                <div className="ent-widget-stack">
                  <span className="ent-mono-tag" style={{ color: '#be123c' }}>
                    JOIN US · PROMENADE LOFTS
                  </span>
                  <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.4rem' }}>
                    Classes & Commissions
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                    Open rehearsal labs, tour choreography commissions, and ensemble auditions.
                  </p>
                  <button
                    type="button"
                    className="ent-btn-secondary"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() =>
                      data.actions.createProject({
                        title: `Femme Fatale Choreography Showcase (Cycle ${data.cycle})`,
                        kind: 'choreography',
                        discipline: 'dance',
                        partnerOrgId: site.orgId,
                        collaboratorArtistId: 'ART-ROXANNE',
                        budgetCredits: 90,
                      })
                    }
                  >
                    Commission Rehearsal Lab (90 ₢)
                  </button>
                </div>
                <img
                  src="/media/entertainment/femme-fatale-rehearsal.jpg"
                  alt="Femme Fatale dancers in rehearsal"
                  style={{ inlineSize: '155px', aspectRatio: '4 / 3', objectFit: 'cover' }}
                  loading="lazy"
                />
              </article>
            </section>

            {roxanne && (
              <section style={{ padding: '1.2rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                <h3 style={{ margin: 0 }}>Principal Spotlight — {roxanne.stageName}</h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>{roxanne.bio}</p>
                <div className="ent-action-row">
                  <SiteLink href={crossSiteLinks.orgHome('ORG_GLASSLINE_DESIGNS', '/runway')} navigate={navigate} className="ent-btn-secondary">
                    View Glassline Stage Wardrobe ↗
                  </SiteLink>
                  <SiteLink href={crossSiteLinks.orgHome('ORG_MARIGOLD_THEATRE', '/whats-on')} navigate={navigate} className="ent-btn-secondary">
                    Marigold Theatre Run ↗
                  </SiteLink>
                </div>
              </section>
            )}
          </>
        )}

        {routeId === 'repertoire' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Original Cabaret & Commercial Repertoire</h2>
            <ul className="ent-dept-list" role="list">
              <li style={{ background: '#ffffff' }}>
                <strong>Crimson Mirrors</strong> — Full-company theatrical premiere at The Marigold Theatre with
                bespoke Glassline Designs silhouettes.
              </li>
              <li style={{ background: '#ffffff' }}>
                <strong>Promenade After Dark</strong> — Commercial tour & award-show choreography led by Dante Cruz.
              </li>
            </ul>
          </section>
        )}

        {routeId === 'performances' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Live Stage Dates & Box Office</h2>
            <TicketPurchaseWidget concerts={shows} data={data} accentColor="#be123c" />
          </section>
        )}

        {routeId === 'dancers' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Company Dancers & Collaborating Choreographers</h2>
            <div className="ent-directory-grid">
              {dancers.map((d) => (
                <article key={d.artistId} className="ent-directory-card" style={{ background: '#ffffff' }}>
                  <h3>{d.stageName}</h3>
                  <p>{d.genres.join(' · ')}</p>
                  <p>{d.bio}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {routeId === 'auditions' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Ensemble & Tour Choreography Auditions</h2>
            <AuditionListWidget auditions={danceAuditions} data={data} accentColor="#be123c" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
