import { useId, useState } from 'react';
import { Award } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function RadianceAwardsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const catId = useId();
  const workId = useId();
  const [fycCategory, setFycCategory] = useState('Recorded Music of the Year');
  const [fycWork, setFycWork] = useState('');

  const navItems = [
    { id: 'home', path: '/', label: 'This Season' },
    { id: 'nominees', path: '/nominees', label: 'Nominees' },
    { id: 'winners', path: '/winners', label: 'Winners' },
    { id: 'ceremony', path: '/ceremony', label: 'Ceremony' },
    { id: 'archives', path: '/archives', label: 'Archives' },
    { id: 'portal', path: '/portal', label: 'Ballot Filing' },
    { id: 'about', path: '/about', label: 'Radiance Hall' },
  ];

  const currentEdition = data.ent.awards[0];

  return (
    <div className="ent-root site-radiance" data-site-shell="ceremony-hub">
      <aside className="ra-rail" aria-label="The Radiance Awards navigation">
        <div>
          <Award size={26} aria-hidden="true" style={{ color: '#d4af37', marginBottom: '0.45rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.15rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
          <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: 'var(--site-muted)' }}>
            Radiance Hall · Concord Precinct
          </small>
        </div>

        <nav className="ra-nav" aria-label={resolved.config.navAriaLabel}>
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
      </aside>

      <main className="ra-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#d4af37" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* THIS SEASON & NOMINEES */}
        {(routeId === 'home' || routeId === 'nominees') && (
          <>
            <section style={{ padding: '1.5rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
              <span className="ent-mono-tag" style={{ color: '#facc15' }}>
                {currentEdition ? `${currentEdition.awardCycleId} · CEREMONY CYCLE ${currentEdition.ceremonyCycle}` : `CYCLE ${data.cycle}`}
              </span>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.2rem)', fontWeight: 500 }}>
                {site.tagline}
              </h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', maxInlineSize: '46rem', lineHeight: 1.6 }}>
                {site.description}
              </p>
              <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-primary">
                  <Award size={14} aria-hidden="true" />
                  <span>File For-Your-Consideration Entry</span>
                </SiteLink>
                <SiteLink href={buildSiteUrl(site, '/ceremony')} navigate={navigate} className="ent-btn-secondary">
                  Ceremony Broadcast Info
                </SiteLink>
              </div>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontWeight: 500 }}>Official Peer-Voted Nominees</h2>
              {data.ent.awards.map((aw) => (
                <div key={aw.awardCycleId} style={{ padding: '1.2rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }} className="ent-mono-tag">
                    <span>{aw.awardCycleId}</span>
                    <span style={{ color: '#facc15' }}>
                      Status: {aw.status.toUpperCase()} · Ceremony Cycle {aw.ceremonyCycle}
                    </span>
                  </div>
                  <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    {aw.nominees.map((nom, idx) => (
                      <li key={`${nom.artistId}-${idx}`} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>
                            {nom.stageName} — “{nom.workTitle}”
                          </strong>
                          <span>Category: {nom.category}</span>
                        </div>
                        <div className="ent-ticket-controls">
                          <span className="ent-mono-tag" style={{ color: '#facc15' }}>
                            Peer Score {nom.score}
                          </span>
                          <SiteLink href={crossSiteLinks.songbirdArtist(nom.artistId)} navigate={navigate} className="ent-btn-secondary">
                            Artist Profile ↗
                          </SiteLink>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </>
        )}

        {/* WINNERS & ARCHIVES */}
        {(routeId === 'winners' || routeId === 'archives') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>
              {routeId === 'winners' ? 'Published Academy Honorees' : 'Historical Radiance Archives'}
            </h2>
            {data.ent.awards.every((a) => a.winners.length === 0) ? (
              <p className="ent-empty-note" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Balloting for {currentEdition?.awardCycleId ?? 'the current cycle'} is currently open. Honorees will
                be published immediately following Ceremony Cycle {currentEdition?.ceremonyCycle ?? data.cycle + 6}.
              </p>
            ) : (
              data.ent.awards
                .filter((a) => a.winners.length > 0)
                .map((aw) => (
                  <div key={aw.awardCycleId} style={{ padding: '1.2rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }}>
                    <h3>{aw.awardCycleId}</h3>
                    <ul className="ent-dept-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {aw.winners.map((w, idx) => (
                        <li key={`${w.artistId}-${idx}`}>
                          <strong>{w.category}:</strong> {w.stageName} — “{w.workTitle}”
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
            )}
          </section>
        )}

        {/* CEREMONY */}
        {routeId === 'ceremony' && (
          <section style={{ padding: '1.4rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>Annual Ceremony & Red Carpet Broadcast</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Directed by Cassius Thorne under Chancellor Miriam Vale’s Eligibility Academy. Red carpet arrivals
              feature Glassline Designs stage couture and pan-realm coverage by Limelight and Silverleaf Stadium’s
              broadcast desk.
            </p>
          </section>
        )}

        {/* AUTHENTICATED FYC BALLOT FILING */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Radiance Academy For-Your-Consideration Ballot Filing"
            description="Submit an eligible released work for peer-branch academy voting (75 ₢ filing fee · requires 18+ Artistic Credibility)."
          >
            <section style={{ padding: '1.4rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', maxInlineSize: '36rem', fontFamily: 'system-ui, sans-serif' }} className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>For-Your-Consideration Submission (75 ₢)</h2>
              <div className="ent-field">
                <label htmlFor={catId} className="ent-field-label">
                  Peer Branch Category
                </label>
                <select id={catId} value={fycCategory} onChange={(e) => setFycCategory(e.target.value)} className="ent-input">
                  <option value="Recorded Music of the Year">Recorded Music of the Year</option>
                  <option value="Screen & Stage Performance">Screen & Stage Performance</option>
                  <option value="Choreography & Sound Craft">Choreography & Sound Craft</option>
                </select>
              </div>
              <div className="ent-field">
                <label htmlFor={workId} className="ent-field-label">
                  Submitted Work Title
                </label>
                <input
                  id={workId}
                  value={fycWork}
                  onChange={(e) => setFycWork(e.target.value)}
                  placeholder={data.playerArtist ? `${data.playerArtist.stageName} Showcase` : 'Released Song or Role'}
                  className="ent-input"
                />
              </div>
              <button
                type="button"
                className="ent-btn-primary"
                onClick={() => data.actions.submitRadianceFyc(fycCategory, fycWork)}
              >
                Submit Academy Ballot Entry (75 ₢)
              </button>
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
