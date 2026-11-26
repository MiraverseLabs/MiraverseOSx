import { useState } from 'react';
import { Award, BookOpen, FileText, HeartHandshake, Megaphone, Shield, Users } from 'lucide-react';
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
    { id: 'home', path: '/', label: 'Home' },
    { id: 'membership', path: '/membership', label: 'Membership' },
    { id: 'advocacy', path: '/advocacy', label: 'Advocacy' },
    { id: 'benefits', path: '/benefits', label: 'Benefits' },
    { id: 'contracts', path: '/contracts', label: 'Contracts & Rights' },
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
          <Shield size={22} aria-hidden="true" style={{ color: '#e2b770', marginBottom: '0.4rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.25 }}>{site.name}</h1>
          <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: '#cab8a3' }}>
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

        <div style={{ marginTop: 'auto', padding: '0.85rem', background: 'rgba(255,255,255,0.07)', borderRadius: '0.5rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem' }}>
          <strong>Performer Support</strong>
          <p style={{ margin: '0.3rem 0 0.6rem', color: '#d8c8b6' }}>
            Contract audits, dispute mediation & touring safety desk.
          </p>
          <button
            type="button"
            className="ent-btn-primary"
            style={{ background: '#c8964e', color: '#21150e', inlineSize: '100%' }}
            onClick={() => setGuildDialogOpen(true)}
          >
            Join the MPA
          </button>
        </div>
      </aside>

      <main className="mpa-main">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8b5a2b" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — Round 2 Warm Guild Layout (PDF p. 46) */}
        {routeId === 'home' && (
          <>
            <section className="mpa-hero">
              <img
                src="/media/entertainment/limelight-cover-editorial.jpg"
                alt="Working performers collaborating in a warm Meridion rehearsal hall"
                onError={(e) => {
                  e.currentTarget.src = '/media/entertainment/willow-editorial.jpg';
                }}
              />
              <div className="mpa-hero-scrim">
                <span className="ent-mono-tag" style={{ color: '#f3d199' }}>
                  REPRESENT · SUPPORT · PROTECT · DEVELOP · CYCLE {data.cycle}
                </span>
                <h2 style={{ margin: '0.3rem 0 0.5rem', fontSize: 'clamp(1.45rem, 3cqi, 2.2rem)', maxInlineSize: '30rem', lineHeight: 1.1 }}>
                  A Stronger, Fairer, More Supportive Performing Community
                </h2>
                <p style={{ margin: '0 0 0.9rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#f3e7d8', maxInlineSize: '32rem' }}>
                  {site.description}
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <button
                    type="button"
                    className="ent-btn-primary"
                    style={{ background: '#c8964e', color: '#21150e' }}
                    onClick={() => setGuildDialogOpen(true)}
                  >
                    Become a Member →
                  </button>
                  <SiteLink href={buildSiteUrl(site, '/contracts')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#fff8ee', borderColor: 'rgba(255,255,255,0.45)' }}>
                    Contract Protections
                  </SiteLink>
                </div>
              </div>
            </section>

            {/* 6-Tile Icon Directory Strip (PDF p. 46) */}
            <section className="mpa-6grid" aria-label="MPA member services">
              {[
                { path: '/membership', title: 'Membership', desc: 'Guild card & collective leverage.', icon: Users },
                { path: '/advocacy', title: 'Advocacy', desc: 'Fair pay & safe stage rules.', icon: Megaphone },
                { path: '/benefits', title: 'Benefits', desc: 'Touring health & relief.', icon: Award },
                { path: '/contracts', title: 'Contracts', desc: 'Royalty review & mediation.', icon: FileText },
                { path: '/training', title: 'Workshops', desc: 'Skill labs & voice care.', icon: BookOpen },
                { path: '/portal', title: 'Support', desc: 'Confidential member desk.', icon: HeartHandshake },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <SiteLink key={card.title} href={buildSiteUrl(site, card.path)} navigate={navigate} className="mpa-icon-card">
                    <Icon size={18} aria-hidden="true" style={{ color: '#8b5a2b' }} />
                    <strong style={{ fontSize: '0.84rem' }}>{card.title}</strong>
                    <small style={{ color: 'var(--site-muted)', fontSize: '0.72rem' }}>{card.desc}</small>
                  </SiteLink>
                );
              })}
            </section>

            {/* Bottom Member Access Dock Bar */}
            <section className="mpa-dock-bar" aria-label="Member access shortcuts">
              <strong style={{ fontFamily: 'Georgia, serif', fontSize: '1rem' }}>Member Access</strong>
              <div className="ent-action-row">
                <SiteLink href={buildSiteUrl(site, '/portal')} navigate={navigate} className="ent-btn-secondary">
                  Audit My Contracts
                </SiteLink>
                <SiteLink href={buildSiteUrl(site, '/training')} navigate={navigate} className="ent-btn-secondary">
                  Workshops & Training
                </SiteLink>
                <button type="button" className="ent-btn-primary" onClick={() => setGuildDialogOpen(true)}>
                  {isGuildMember ? 'Guild Card Active ✓' : 'Activate Guild Card'}
                </button>
              </div>
            </section>
          </>
        )}

        {(routeId === 'membership' || routeId === 'benefits') && (
          <section style={{ padding: '1.4rem', background: '#fffdf9', border: '1px solid var(--site-border)', borderRadius: '0.65rem' }} className="ent-widget-stack">
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

        {(routeId === 'contracts' || routeId === 'advocacy' || routeId === 'training') && (
          <section style={{ padding: '1.4rem', background: '#fffdf9', border: '1px solid var(--site-border)', borderRadius: '0.65rem' }} className="ent-widget-stack">
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

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="MPA Member Contract & Card Portal"
            description="Inspect your active guild standing, audit signed entertainment contracts, or formally terminate an unsatisfactory representation deal."
          >
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ padding: '1.1rem', background: '#fffdf9', border: '1px solid var(--site-border)', borderRadius: '0.65rem' }}>
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
                    <li key={c.contractId} className="ent-ticket-item" style={{ background: '#fffdf9' }}>
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
