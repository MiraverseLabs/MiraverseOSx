import { useId, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const ACADEMY_CATEGORIES = [
  'All Categories',
  'Recorded Music of the Year',
  'Screen & Stage Performance',
  'Choreography & Sound Craft',
] as const;

export function RadianceAwardsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const catId = useId();
  const workId = useId();
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
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

  const categoryOptions = useMemo(() => {
    const discovered = new Set<string>(ACADEMY_CATEGORIES);
    for (const aw of data.ent.awards) {
      for (const nom of aw.nominees) {
        if (nom.category) discovered.add(nom.category);
      }
    }
    return Array.from(discovered);
  }, [data.ent.awards]);

  const totalNominees = data.ent.awards.reduce((sum, aw) => sum + aw.nominees.length, 0);

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

        {/* Category Index inside rail (PDF p. 63) */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '1rem',
            borderBlockStart: '1px solid var(--site-border)',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
            BRANCH INDEX
          </span>
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                if (routeId !== 'home' && routeId !== 'nominees') {
                  navigate(buildSiteUrl(site, '/nominees'));
                }
              }}
              style={{
                textAlign: 'left',
                padding: '0.38rem 0.55rem',
                fontSize: '0.73rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                border: selectedCategory === cat ? '1px solid #d4af37' : '1px solid transparent',
                background: selectedCategory === cat ? 'rgba(212, 175, 55, 0.14)' : 'transparent',
                color: selectedCategory === cat ? '#f8fafc' : 'var(--site-muted)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </aside>

      <main className="ra-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#d4af37" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* THIS SEASON & NOMINEES (PDF p. 63) */}
        {(routeId === 'home' || routeId === 'nominees') && (
          <>
            {/* Dramatic Black & Brushed Silver Stage Spotlight Banner */}
            <section
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1.75rem',
                background:
                  'linear-gradient(125deg, rgba(14, 15, 24, 0.96) 0%, rgba(28, 31, 46, 0.92) 55%, rgba(12, 12, 18, 0.98) 100%)',
                border: '1px solid rgba(226, 232, 240, 0.35)',
                borderBlockStart: '3px solid #d4af37',
                borderRadius: '0.55rem',
              }}
              className="ent-widget-stack"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
                  {currentEdition
                    ? `${currentEdition.awardCycleId} · CEREMONY CYCLE ${currentEdition.ceremonyCycle}`
                    : `CYCLE ${data.cycle} ACADEMY SEASON`}
                </span>
                <span
                  className="ent-mono-tag"
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(226, 232, 240, 0.35)',
                    color: '#e2e8f0',
                  }}
                >
                  {currentEdition ? `STATUS: ${currentEdition.status.toUpperCase()}` : 'PEER BALLOTING OPEN'} ·{' '}
                  {totalNominees} NOMINEES
                </span>
              </div>

              <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem, 3.4cqi, 2.45rem)', fontWeight: 500, letterSpacing: '0.02em' }}>
                {site.tagline}
              </h2>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.93rem', maxInlineSize: '46rem', lineHeight: 1.65 }}>
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
                <SiteLink href={buildSiteUrl(site, '/winners')} navigate={navigate} className="ent-btn-secondary">
                  Academy Honorees
                </SiteLink>
              </div>
            </section>

            {/* Interactive Category Filter Pills + Official Peer-Voted Nominee Ballot */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
                    PEER-BRANCH CERTIFICATION
                  </span>
                  <h2 style={{ margin: '0.2rem 0 0', fontWeight: 500 }}>Official Peer-Voted Nominee Ballot</h2>
                </div>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={selectedCategory === cat ? 'ent-btn-primary' : 'ent-btn-secondary'}
                      style={{ minBlockSize: '32px', padding: '0.25rem 0.7rem', fontSize: '0.76rem' }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {data.ent.awards.map((aw) => {
                const visibleNominees =
                  selectedCategory === 'All Categories'
                    ? aw.nominees
                    : aw.nominees.filter((n) => n.category === selectedCategory);

                return (
                  <div
                    key={aw.awardCycleId}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--site-surface-alt)',
                      border: '1px solid var(--site-border)',
                      borderRadius: '0.5rem',
                    }}
                    className="ent-widget-stack"
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '0.6rem', borderBlockEnd: '1px solid var(--site-border)' }}
                      className="ent-mono-tag"
                    >
                      <span>{aw.awardCycleId} · {visibleNominees.length} LISTED</span>
                      <span style={{ color: '#d4af37' }}>
                        Status: {aw.status.toUpperCase()} · Ceremony Cycle {aw.ceremonyCycle}
                      </span>
                    </div>

                    {visibleNominees.length === 0 ? (
                      <p className="ent-empty-note" style={{ fontFamily: 'system-ui, sans-serif' }}>
                        No certified nominees currently listed under “{selectedCategory}”. Select All Categories or file
                        an eligible work through the FYC Ballot Desk.
                      </p>
                    ) : (
                      <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                        {visibleNominees.map((nom, idx) => (
                          <li
                            key={`${nom.artistId}-${idx}`}
                            className="ent-ticket-item"
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderInlineStart: '3px solid #d4af37',
                            }}
                          >
                            <div className="ent-ticket-meta">
                              <span className="ent-mono-tag" style={{ color: '#cbd5e1' }}>
                                #{String(idx + 1).padStart(2, '0')} · {nom.category}
                              </span>
                              <strong style={{ fontSize: '0.98rem' }}>
                                {nom.stageName} — “{nom.workTitle}”
                              </strong>
                            </div>
                            <div className="ent-ticket-controls">
                              <span
                                className="ent-mono-tag"
                                style={{
                                  color: '#d4af37',
                                  padding: '0.2rem 0.55rem',
                                  background: 'rgba(212, 175, 55, 0.12)',
                                  borderRadius: '0.25rem',
                                }}
                              >
                                Peer Score {nom.score}
                              </span>
                              <SiteLink
                                href={crossSiteLinks.songbirdArtist(nom.artistId)}
                                navigate={navigate}
                                className="ent-btn-secondary"
                              >
                                Artist Profile ↗
                              </SiteLink>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        )}

        {/* WINNERS & ARCHIVES */}
        {(routeId === 'winners' || routeId === 'archives') && (
          <section className="ent-widget-stack">
            <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
              RADIANCE HALL · PERMANENT LEDGER
            </span>
            <h2 style={{ margin: 0, fontWeight: 500 }}>
              {routeId === 'winners' ? 'Published Academy Honorees' : 'Historical Radiance Archives'}
            </h2>
            {data.ent.awards.every((a) => a.winners.length === 0) ? (
              <div
                style={{
                  padding: '1.35rem',
                  background: 'var(--site-surface-alt)',
                  border: '1px solid var(--site-border)',
                  borderRadius: '0.5rem',
                  fontFamily: 'system-ui, sans-serif',
                }}
                className="ent-widget-stack"
              >
                <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.6 }}>
                  Balloting for <strong>{currentEdition?.awardCycleId ?? 'the current cycle'}</strong> is currently
                  open across all peer branches. Honorees will be certified and published immediately following Ceremony
                  Cycle {currentEdition?.ceremonyCycle ?? data.cycle + 6}.
                </p>
                <div className="ent-action-row">
                  <SiteLink href={buildSiteUrl(site, '/nominees')} navigate={navigate} className="ent-btn-primary">
                    Inspect Current Nominee Ballot →
                  </SiteLink>
                  <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-secondary">
                    File FYC Submission
                  </SiteLink>
                </div>
              </div>
            ) : (
              data.ent.awards
                .filter((a) => a.winners.length > 0)
                .map((aw) => (
                  <div
                    key={aw.awardCycleId}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--site-surface-alt)',
                      border: '1px solid var(--site-border)',
                      borderInlineStart: '3px solid #d4af37',
                      borderRadius: '0.5rem',
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>{aw.awardCycleId}</h3>
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
          <section
            style={{
              padding: '1.5rem',
              background: 'var(--site-surface-alt)',
              border: '1px solid var(--site-border)',
              borderRadius: '0.5rem',
            }}
            className="ent-widget-stack"
          >
            <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
              LIVE PAN-REALM BROADCAST · RADIANCE HALL
            </span>
            <h2 style={{ margin: 0, fontWeight: 500 }}>Annual Ceremony & Red Carpet Broadcast</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
              Directed by Cassius Thorne under Chancellor Miriam Vale’s Eligibility Academy. Red carpet arrivals
              feature Glassline Designs stage couture and pan-realm coverage by Limelight and Silverleaf Stadium’s
              broadcast desk.
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <SiteLink href={crossSiteLinks.orgHome('ORG_GLASSLINE_DESIGNS')} navigate={navigate} className="ent-btn-secondary">
                Glassline Red Carpet Couture ↗
              </SiteLink>
              <SiteLink href={crossSiteLinks.orgHome('ORG_LIMELIGHT')} navigate={navigate} className="ent-btn-secondary">
                Limelight Live Coverage ↗
              </SiteLink>
              <SiteLink href={crossSiteLinks.orgHome('ORG_SILVERLEAF_STADIUM')} navigate={navigate} className="ent-btn-secondary">
                Silverleaf Broadcast Desk ↗
              </SiteLink>
            </div>
          </section>
        )}

        {/* AUTHENTICATED FYC BALLOT FILING */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Radiance Academy For-Your-Consideration Ballot Filing"
            description="Submit an eligible released work for peer-branch academy voting (75 ₢ filing fee · requires 18+ Artistic Credibility)."
          >
            <section
              style={{
                padding: '1.5rem',
                background: 'var(--site-surface-alt)',
                border: '1px solid var(--site-border)',
                borderBlockStart: '3px solid #d4af37',
                borderRadius: '0.5rem',
                maxInlineSize: '38rem',
                fontFamily: 'system-ui, sans-serif',
              }}
              className="ent-widget-stack"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>For-Your-Consideration Submission (75 ₢)</h2>
                <span className="ent-mono-tag" style={{ color: '#d4af37' }}>
                  CREDIBILITY: {data.playerArtist?.artisticCredibility ?? 0} / 18 MIN
                </span>
              </div>
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
