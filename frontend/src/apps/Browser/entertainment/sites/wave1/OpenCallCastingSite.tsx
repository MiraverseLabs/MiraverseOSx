import { useId, useState } from 'react';
import { ArrowLeft, CheckSquare, Filter } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function OpenCallCastingSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const searchId = useId();
  const discId = useId();
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);

  const filteredAuditions = data.ent.auditions.filter((aud) => {
    if (discipline !== 'all' && aud.discipline !== discipline) return false;
    if (openOnly && !aud.openToUnrepresented) return false;
    const q = query.trim().toLowerCase();
    if (q && !aud.title.toLowerCase().includes(q) && !aud.discipline.toLowerCase().includes(q)) return false;
    return true;
  });

  const navItems = [
    { id: 'home', path: '/', label: 'Find Auditions' },
    { id: 'productions', path: '/productions', label: 'Productions' },
    { id: 'casting', path: '/casting', label: 'Casting Professionals' },
    { id: 'applications', path: '/applications', label: 'My Applications' },
    { id: 'about', path: '/about', label: 'Resources' },
  ];

  const mySubmissions = data.playerArtist
    ? data.ent.auditions.filter((aud) => aud.applicants.some((ap) => ap.artistId === data.playerArtist!.artistId))
    : [];

  return (
    <div className="ent-root site-opencall" data-site-shell="casting-platform">
      <header className="oc-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.15rem, 2.2cqi, 1.45rem)', fontWeight: 900, color: '#102454' }}>
            {site.name}
          </h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--site-muted)' }}>
            Auditions · Productions · Talent · 3B Promenade Studios, Aureline
          </span>
        </div>
        <nav className="oc-nav" aria-label={resolved.config.navAriaLabel}>
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

      {/* Angled Cobalt Hero + Sticky Checklist (PDF p. 47) */}
      {routeId === 'home' && (
        <section className="oc-hero-banner" aria-label="Open Call Casting hero">
          <div className="ent-widget-stack">
            <h2 style={{ margin: 0, fontSize: 'clamp(1.65rem, 3.2cqi, 2.35rem)', fontStyle: 'italic', lineHeight: 1.05 }}>
              Find Your Next Role
            </h2>
            <p style={{ margin: 0, color: '#dbeafe', fontSize: '0.86rem', maxInlineSize: '34rem' }}>
              Verified screen, theatre, voice, dance, and live-music breakdowns across Meridion. Filter by
              discipline, eligibility, and stipend before submitting your self-tape.
            </p>
            <div className="ent-action-row">
              <SiteLink href={buildSiteUrl(site, '/applications')} navigate={navigate} className="ent-btn-primary" style={{ background: '#ea580c' }}>
                Track My Applications ({mySubmissions.length}) →
              </SiteLink>
              <SiteLink href={buildSiteUrl(site, '/productions')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.45)' }}>
                Partner Studios
              </SiteLink>
            </div>
          </div>

          <aside className="oc-sticky-checklist" aria-label="Casting disciplines covered">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', color: '#1d4ed8' }}>
              <CheckSquare size={14} aria-hidden="true" />
              <span>NOW CASTING</span>
            </div>
            <div>✓ Film & Serialized TV</div>
            <div>✓ Repertory Theatre & Stage</div>
            <div>✓ Dance & Movement</div>
            <div>✓ Voice & Animated Features</div>
            <div>✓ Club & Label Showcases</div>
          </aside>
        </section>
      )}

      <div style={{ paddingInline: 'clamp(1rem, 3cqi, 2rem)' }}>
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#1d4ed8" />
      </div>

      {resolved.isNotFound && (
        <main style={{ padding: '1.5rem' }}>
          <SiteNotFoundView site={site} navigate={navigate} />
        </main>
      )}

      {/* FIND AUDITIONS BOARD — Round 2 Layout (PDF p. 47) */}
      {routeId === 'home' && (
        <div className="oc-board">
          <aside className="oc-filter-col" aria-label="Search and filter auditions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={15} aria-hidden="true" style={{ color: '#1d4ed8' }} />
              <h2 style={{ margin: 0, fontSize: '0.92rem' }}>Search & Filter Auditions</h2>
            </div>
            <div className="ent-field">
              <label htmlFor={searchId} className="ent-field-label">
                Keyword
              </label>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mirrora, Storyloom, music..."
                className="ent-input"
              />
            </div>
            <div className="ent-field">
              <label htmlFor={discId} className="ent-field-label">
                Category
              </label>
              <select id={discId} value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="ent-input">
                <option value="all">All Categories</option>
                <option value="acting">Acting & Voice</option>
                <option value="music">Music & Live</option>
                <option value="dance">Dance & Movement</option>
                <option value="modeling">Modeling & Campaigns</option>
              </select>
            </div>
            <label className="ent-checkbox-row">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
              <span>Open to unrepresented talent</span>
            </label>
            <div style={{ paddingTop: '0.55rem', borderTop: '1px solid var(--site-border)', fontSize: '0.76rem', color: 'var(--site-muted)' }}>
              Showing <strong>{filteredAuditions.length}</strong> of {data.ent.auditions.length} active calls
            </div>
          </aside>

          <main className="ent-widget-stack" style={{ minInlineSize: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Featured Auditions (Cycle {data.cycle})</h2>
            <div className="oc-featured-cards">
              {filteredAuditions.map((aud) => (
                <article key={aud.auditionId} className="oc-aud-card">
                  {aud.posterUrl && <img src={aud.posterUrl} alt="" loading="lazy" />}
                  <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '999px', background: aud.openToUnrepresented ? '#dcfce7' : '#e0e7ff', color: aud.openToUnrepresented ? '#166534' : '#3730a3' }}>
                        {aud.openToUnrepresented ? 'OPEN CALL' : 'AGENCY REQUIRED'}
                      </span>
                      <span style={{ fontSize: '0.66rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '999px', background: '#fef3c7', color: '#92400e' }}>
                        {aud.stipendCredits} ₢ Stipend
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.84rem', lineHeight: 1.3 }}>
                      <SiteLink
                        href={buildSiteUrl(site, `/auditions/${encodeURIComponent(aud.auditionId)}`)}
                        navigate={navigate}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {aud.title}
                      </SiteLink>
                    </strong>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.72rem' }}>
                      Min Cred {aud.minCredibility} · Closes Cycle {aud.deadlineCycle}
                    </small>
                    {aud.status === 'open' ? (
                      <button
                        type="button"
                        className="ent-btn-primary"
                        style={{ marginTop: 'auto', minBlockSize: '32px', fontSize: '0.75rem' }}
                        onClick={() => data.actions.submitAudition(aud.auditionId)}
                      >
                        Submit Audition
                      </button>
                    ) : (
                      <span className="ent-mono-tag" style={{ marginTop: 'auto' }}>
                        {aud.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Application Tracking 5-Step Stepper (PDF p. 47) */}
            <section style={{ background: '#ffffff', border: '1px solid var(--site-border)', borderRadius: '0.7rem', padding: '1rem' }} className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.94rem' }}>Application Tracking Pipeline</h3>
                <SiteLink href={buildSiteUrl(site, '/applications')} navigate={navigate} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1d4ed8' }}>
                  Open Private Application Tracker →
                </SiteLink>
              </div>
              <div className="oc-stepper" aria-label="Casting workflow stages">
                <span className={`oc-step-pill ${mySubmissions.length > 0 ? 'is-done' : ''}`}>1. Submitted</span>
                <span>→</span>
                <span className={`oc-step-pill ${mySubmissions.length > 0 ? 'is-done' : ''}`}>2. In Review</span>
                <span>→</span>
                <span className="oc-step-pill">3. Callback</span>
                <span>→</span>
                <span className="oc-step-pill">4. Audition</span>
                <span>→</span>
                <span className="oc-step-pill">5. Decision</span>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* AUDITION DETAIL /auditions/:id */}
      {routeId === 'audition-detail' &&
        (() => {
          const aud = data.ent.auditions.find((a) => a.auditionId === resolved.pathParams.id);
          if (!aud) {
            return (
              <main style={{ padding: '1.5rem' }}>
                <SiteNotFoundView site={site} navigate={navigate} />
              </main>
            );
          }
          return (
            <main style={{ padding: '1.5rem clamp(1rem, 3cqi, 2rem)' }} className="ent-widget-stack">
              <SiteLink href={buildSiteUrl(site, '/')} navigate={navigate} style={{ color: '#1d4ed8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <ArrowLeft size={14} aria-hidden="true" />
                <span>All Audition Breakdowns</span>
              </SiteLink>
              <div className="ent-about-grid" style={{ background: '#ffffff', padding: '1.4rem', border: '1px solid var(--site-border)', borderRadius: '0.7rem' }}>
                {aud.posterUrl && (
                  <img
                    src={aud.posterUrl}
                    alt={`Production poster for ${aud.title}`}
                    style={{ maxInlineSize: '240px', aspectRatio: '2 / 3', objectFit: 'cover' }}
                  />
                )}
                <div className="ent-widget-stack">
                  <span className="ent-mono-tag" style={{ color: '#1d4ed8' }}>
                    {aud.auditionId} · {aud.discipline.toUpperCase()}
                  </span>
                  <h2 style={{ margin: 0 }}>{aud.title}</h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)' }}>
                    Access: <strong>{aud.openToUnrepresented ? 'Open to Unrepresented Performers' : 'Agency Representation Required'}</strong>
                    <br />
                    Minimum Artistic Credibility: <strong>{aud.minCredibility}</strong> · Stipend:{' '}
                    <strong>{aud.stipendCredits} ₢</strong> · Deadline: Cycle {aud.deadlineCycle}
                  </p>
                  <div className="ent-action-row">
                    {aud.status === 'open' && (
                      <button
                        type="button"
                        className="ent-btn-primary"
                        onClick={() => data.actions.submitAudition(aud.auditionId)}
                      >
                        Submit Audition Tape
                      </button>
                    )}
                    <SiteLink href={crossSiteLinks.orgHome(aud.productionOrgId)} navigate={navigate} className="ent-btn-secondary">
                      Visit Producing Studio ↗
                    </SiteLink>
                  </div>
                </div>
              </div>
            </main>
          );
        })()}

      {routeId === 'productions' && (
        <main style={{ padding: '1.5rem clamp(1rem, 3cqi, 2rem)' }} className="ent-widget-stack">
          <h2 style={{ margin: 0 }}>Partner Productions Currently Casting</h2>
          <div className="ent-directory-grid">
            {data.partnerSites.map((p) => (
              <article key={p.orgId} className="ent-directory-card" style={{ background: '#ffffff' }}>
                <h3>{p.name}</h3>
                <p>{p.tagline}</p>
                <SiteLink href={p.url} navigate={navigate} className="ent-btn-secondary">
                  Visit {p.shortName} ↗
                </SiteLink>
              </article>
            ))}
          </div>
          <AuditionListWidget auditions={data.ent.auditions} data={data} accentColor="#1d4ed8" navigate={navigate} detailBaseSite={site} />
        </main>
      )}

      {routeId === 'casting' && (
        <main style={{ padding: '1.5rem clamp(1rem, 3cqi, 2rem)' }} className="ent-widget-stack">
          <h2 style={{ margin: 0 }}>Casting Directors & Breakdown Desks</h2>
          <ul className="ent-dept-list" role="list">
            {(org.departments ?? []).map((d) => (
              <li key={d.id} style={{ background: '#ffffff' }}>
                <strong>{d.name}</strong> — Head: {d.head}
                <p className="ent-empty-note" style={{ marginTop: '0.3rem' }}>
                  {d.focus}
                </p>
              </li>
            ))}
          </ul>
        </main>
      )}

      {routeId === 'applications' && (
        <main style={{ padding: '1.5rem clamp(1rem, 3cqi, 2rem)' }}>
          <AuthPortalGate
            data={data}
            portalName="My Audition Submissions & Callback Tracker"
            description="Review every self-tape and audition breakdown you have submitted across Meridion studios."
          >
            <section className="ent-widget-stack">
              <h2>Your Submitted Auditions ({mySubmissions.length})</h2>
              {mySubmissions.length === 0 ? (
                <p className="ent-empty-note">
                  You have not submitted an audition tape yet. Browse Find Auditions to apply to open calls.
                </p>
              ) : (
                <ul className="ent-ticket-list" role="list">
                  {mySubmissions.map((aud) => (
                    <li key={aud.auditionId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                      <div className="ent-ticket-meta">
                        <strong>{aud.title}</strong>
                        <span>
                          Status: {aud.status.toUpperCase()} · Deadline Cycle {aud.deadlineCycle}
                        </span>
                      </div>
                      <span className="ent-mono-tag">{aud.stipendCredits} ₢ stipend</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </AuthPortalGate>
        </main>
      )}

      {routeId === 'about' && (
        <main style={{ padding: '1.5rem clamp(1rem, 3cqi, 2rem)' }}>
          <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />
        </main>
      )}
    </div>
  );
}
