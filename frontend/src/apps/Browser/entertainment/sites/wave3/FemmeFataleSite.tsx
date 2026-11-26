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
        <div>
          <span className="ent-mono-tag" style={{ color: '#fda4af' }}>
            PROMENADE REHEARSAL LOFTS · AURELINE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.3rem, 2.8cqi, 2rem)', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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

      <main className="ff-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#e11d48" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* THE COMPANY HOME */}
        {routeId === 'home' && (
          <>
            <section style={{ padding: '1.5rem', background: 'linear-gradient(125deg, #3c1120, #1c0b10)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <span className="ent-mono-tag" style={{ color: '#fb7185' }}>
                ARTISTIC DIRECTOR: ROXANNE DELACROIX · STYLED BY GLASSLINE DESIGNS
              </span>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.2rem)' }}>{site.tagline}</h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.9rem', maxInlineSize: '46rem', lineHeight: 1.6 }}>
                {site.description}
              </p>
              <div className="ent-action-row">
                <SiteLink href={buildSiteUrl(site, '/performances')} navigate={navigate} className="ent-btn-primary">
                  Crimson Mirrors Tickets
                </SiteLink>
                <button
                  type="button"
                  className="ent-btn-secondary"
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
                  Commission Rehearsal Choreography (90 ₢)
                </button>
              </div>
            </section>

            {roxanne && (
              <section style={{ padding: '1.2rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
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

        {/* REPERTOIRE */}
        {routeId === 'repertoire' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Original Cabaret & Commercial Repertoire</h2>
            <ul className="ent-dept-list" role="list">
              <li>
                <strong>Crimson Mirrors</strong> — Full-company theatrical premiere at The Marigold Theatre with
                bespoke Glassline Designs silhouettes.
              </li>
              <li>
                <strong>Promenade After Dark</strong> — Commercial tour & award-show choreography led by Dante Cruz.
              </li>
            </ul>
          </section>
        )}

        {/* PERFORMANCES */}
        {routeId === 'performances' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Live Stage Dates & Box Office</h2>
            <TicketPurchaseWidget concerts={shows} data={data} accentColor="#e11d48" />
          </section>
        )}

        {/* DANCERS */}
        {routeId === 'dancers' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Company Dancers & Collaborating Choreographers</h2>
            <div className="ent-directory-grid">
              {dancers.map((d) => (
                <article key={d.artistId} className="ent-directory-card">
                  <h3>{d.stageName}</h3>
                  <p>{d.genres.join(' · ')}</p>
                  <p>{d.bio}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* AUDITIONS */}
        {routeId === 'auditions' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Ensemble & Tour Choreography Auditions</h2>
            <AuditionListWidget auditions={danceAuditions} data={data} accentColor="#e11d48" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
