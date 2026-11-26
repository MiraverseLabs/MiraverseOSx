import { useState } from 'react';
import { Shield } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function PerformersAssocSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [guildDialogOpen, setGuildDialogOpen] = useState(false);

  const navItems = [
    { id: 'home', path: '/', label: 'Guild Home' },
    { id: 'membership', path: '/membership', label: 'Membership' },
    { id: 'benefits', path: '/benefits', label: 'Benefits' },
    { id: 'contracts', path: '/contracts', label: 'Contracts & Rights' },
    { id: 'advocacy', path: '/advocacy', label: 'Advocacy' },
    { id: 'training', path: '/training', label: 'Workshops & Training' },
    { id: 'portal', path: '/portal', label: 'Member Portal' },
    { id: 'about', path: '/about', label: 'About MPA' },
  ];

  const isGuildMember = Boolean(data.playerArtist?.guildMember);
  const playerContracts = data.playerArtist
    ? data.ent.contracts.filter((c) => c.artistId === data.playerArtist!.artistId && c.status === 'active')
    : [];

  return (
    <div className="ent-root site-mpa" data-site-shell="guild-handbook">
      <aside className="mpa-rail" aria-label="Meridion Performers Association rail">
        <div>
          <Shield size={20} aria-hidden="true" style={{ color: '#c4d9b0', marginBottom: '0.35rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.25 }}>{site.name}</h1>
          <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: '#b7c7ab' }}>
            Guildhall Row, Aureline · Pan-Meridion
          </small>
        </div>

        <nav aria-label={resolved.config.navAriaLabel}>
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

        <div style={{ marginTop: 'auto', padding: '0.85rem', background: 'rgba(255,255,255,0.08)', fontFamily: 'system-ui, sans-serif', fontSize: '0.76rem' }}>
          <strong>Contract & Dispute Desk</strong>
          <p style={{ margin: '0.3rem 0 0.65rem', opacity: 0.85 }}>
            Need immediate contract review or stage safety advocacy?
          </p>
          <button
            type="button"
            className="ent-btn-primary"
            style={{ background: '#f6f2e8', color: '#272c21', inlineSize: '100%' }}
            onClick={() => setGuildDialogOpen(true)}
          >
            Enroll / Renew Guild Card
          </button>
        </div>
      </aside>

      <main className="mpa-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#3f5c35" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME */}
        {routeId === 'home' && (
          <>
            <section style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
              <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                PERFORMERS STANDARDS GUILD · CYCLE {data.cycle}
              </span>
              <h2 style={{ margin: '0.35rem 0 0.6rem', fontSize: 'clamp(1.4rem, 3cqi, 2.1rem)' }}>
                {site.tagline}
              </h2>
              <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                {site.description}
              </p>
              <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <button type="button" className="ent-btn-primary" onClick={() => setGuildDialogOpen(true)}>
                  Enroll in Meridion Performers Association
                </button>
                <SiteLink href={buildSiteUrl(site, '/contracts')} navigate={navigate} className="ent-btn-secondary">
                  Read Standard Contract Protections
                </SiteLink>
              </div>
            </section>

            <div className="ent-about-grid">
              {(org.departments ?? []).map((d) => (
                <article key={d.id} style={{ padding: '1.1rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <h3 style={{ margin: '0 0 0.35rem' }}>{d.name}</h3>
                  <div className="ent-mono-tag" style={{ color: 'var(--site-accent)', marginBottom: '0.4rem' }}>
                    Lead: {d.head}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>{d.focus}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {/* MEMBERSHIP & BENEFITS */}
        {(routeId === 'membership' || routeId === 'benefits') && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'membership' ? 'Guild Membership & Card Enrollment' : 'Member Benefits & Touring Protections'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Active MPA members gain immediate bargaining leverage when negotiating higher artist royalty splits with
              Starstruck Entertainment, Marlie Records, Second Act Management, and Kaji Publishing Studios.
            </p>
            <ul className="ent-dept-list" role="list" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem' }}>
              <li>Minimum call rates & mandatory 12-hour turnaround rest rules across Aureline stages</li>
              <li>Independent contract fairness review led by Advocate Maren Cross</li>
              <li>Touring health, vocal/dance injury care, and safe rigging verification by Dr. Soren Lind</li>
            </ul>
            <button type="button" className="ent-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setGuildDialogOpen(true)}>
              {isGuildMember ? 'Active Guild Card Verified (Review Terms)' : 'Join Meridion Performers Association'}
            </button>
          </section>
        )}

        {/* CONTRACTS & RIGHTS / ADVOCACY / TRAINING */}
        {(routeId === 'contracts' || routeId === 'advocacy' || routeId === 'training') && (
          <section style={{ padding: '1.4rem', background: '#ffffff', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>
              {routeId === 'contracts'
                ? 'Standard Contracts & Performer Rights'
                : routeId === 'advocacy'
                  ? 'Industry Advocacy & Safe Stages'
                  : 'Guild Workshops & Rehearsal Craft'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--site-muted)', lineHeight: 1.65 }}>
              {routeId === 'contracts'
                ? 'Performers should never sign away perpetual master rights without audited recoupment schedules. MPA publishes benchmark splits for independent distribution (92% artist retention via Lunerum Dist) and major full-service deals.'
                : routeId === 'advocacy'
                  ? 'MPA coordinates with The Marigold Theatre, Wonder-Wind Dance Company, and MMRS to enforce safe lighting rigs, fair understudy compensation, and transparent ticket-door accounting.'
                  : 'Weekly open skill clinics at Guildhall Row covering contract negotiation, self-tape preparation for Open Call Casting, and vocal endurance for club-to-stadium touring.'}
            </p>
          </section>
        )}

        {/* AUTHENTICATED MEMBER PORTAL */}
        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="MPA Member Contract & Card Portal"
            description="Inspect your active guild standing, audit signed entertainment contracts, or formally terminate an unsatisfactory representation deal."
          >
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ padding: '1.1rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
                <h2 style={{ margin: '0 0 0.4rem' }}>Guild Card Status</h2>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.86rem' }}>
                  Member: <strong>{data.playerArtist?.stageName ?? data.playerName}</strong> · Guild Standing:{' '}
                  <strong>{isGuildMember ? 'Active Cardholder' : 'Not Yet Enrolled'}</strong>
                </p>
                {!isGuildMember && (
                  <button type="button" className="ent-btn-primary" onClick={() => setGuildDialogOpen(true)}>
                    Activate Guild Membership
                  </button>
                )}
              </div>

              <h3>Your Active Entertainment Contracts ({playerContracts.length})</h3>
              {playerContracts.length === 0 ? (
                <p className="ent-empty-note">You currently have no active agency, label, or guild contracts on file.</p>
              ) : (
                <ul className="ent-ticket-list" role="list">
                  {playerContracts.map((c) => (
                    <li key={c.contractId} className="ent-ticket-item">
                      <div className="ent-ticket-meta">
                        <strong>{c.orgName}</strong>
                        <span>
                          {c.contractType.toUpperCase()} · {Math.round(c.royaltySplitArtist * 100)}% artist split ·
                          Expires Cycle {c.expiresCycle}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ent-btn-secondary"
                        onClick={() => data.actions.terminateContract(c.contractId)}
                      >
                        Terminate Contract
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={guildDialogOpen}
        onClose={() => setGuildDialogOpen(false)}
        site={site}
        org={org}
        contractType="guild"
        data={data}
      />
    </div>
  );
}
