import { useState } from 'react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function WillowWhisperSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | 'modeling' | 'acting' | 'dance'>('all');
  const [contractOpen, setContractOpen] = useState(false);

  const modelRoster = data.publicArtists.filter(
    (a) => a.disciplines.includes('modeling') || a.managerOrgId === site.orgId,
  );
  const willowAuditions = data.ent.auditions.filter(
    (aud) => aud.orgId === site.orgId || aud.productionOrgId === site.orgId || aud.discipline === 'modeling',
  );

  const navItems = [
    { id: 'home', path: '/', label: 'Board' },
    { id: 'women', path: '/women', label: 'Women' },
    { id: 'men', path: '/men', label: 'Men' },
    { id: 'new-faces', path: '/new-faces', label: 'New Faces' },
    { id: 'editorials', path: '/editorials', label: 'Editorials' },
    { id: 'apply', path: '/apply', label: 'Become a Model' },
    { id: 'bookings', path: '/bookings', label: 'Bookings' },
  ];

  const getBoardModels = () => {
    let list = modelRoster;
    if (routeId === 'men') list = modelRoster.filter((m) => m.artistId === 'ART-LEO');
    if (routeId === 'women') list = modelRoster.filter((m) => m.artistId !== 'ART-LEO');
    if (routeId === 'new-faces') list = data.publicArtists.filter((m) => m.recognition < 65);
    if (disciplineFilter !== 'all') {
      list = list.filter((m) => m.disciplines.includes(disciplineFilter));
    }
    return list;
  };

  const boardModels = getBoardModels();

  return (
    <div className="ent-root site-willow" data-site-shell="contact-sheet">
      <header className="ww-header">
        <div>
          <h1>{site.name}</h1>
          <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.74rem', color: 'var(--site-muted)' }}>
            Promenade Terrace, Aureline · Expressive Presence & Editorial Representation
          </span>
        </div>
        <nav className="ww-nav" aria-label={resolved.config.navAriaLabel}>
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

      <div className="ww-layout">
        <aside className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ padding: '1rem', background: '#ffffff', border: '1px solid var(--site-border)' }}>
            <h2 style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
              Filter Contact Sheet
            </h2>
            <div className="ent-widget-stack" style={{ gap: '0.35rem' }}>
              {(['all', 'modeling', 'acting', 'dance'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={disciplineFilter === f ? 'ent-btn-primary' : 'ent-btn-secondary'}
                  onClick={() => setDisciplineFilter(f)}
                  style={{ justifyContent: 'flex-start', textTransform: 'capitalize' }}
                >
                  {f === 'all' ? 'All Divisions' : f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }}>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Scouting Desk
            </h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--site-muted)', lineHeight: 1.5 }}>
              Led by Camille Laurent & Evan Cho. Open seasonal assessments for runway, beauty, and editorial talent.
            </p>
            <SiteLink href={buildSiteUrl(site, '/apply')} navigate={navigate} className="ent-btn-secondary">
              View Open Calls
            </SiteLink>
          </div>
        </aside>

        <main className="ent-widget-stack" style={{ minInlineSize: 0 }}>
          <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#315a42" />

          {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

          {/* CONTACT SHEET BOARDS */}
          {(routeId === 'home' || routeId === 'women' || routeId === 'men' || routeId === 'new-faces') && (
            <>
              {routeId === 'home' && (
                <figure style={{ margin: 0, background: '#ffffff', border: '1px solid var(--site-border)' }}>
                  <img
                    src="/media/entertainment/willow-editorial.jpg"
                    alt="Three models in cream and charcoal tailoring inside a sunlit conservatory"
                    style={{ inlineSize: '100%', aspectRatio: '16 / 7.5', objectFit: 'cover', objectPosition: 'center 25%' }}
                  />
                  <figcaption style={{ padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem' }}>
                    <span>Autumn Conservatory Editorial · Styled with Glassline Designs</span>
                    <SiteLink href={buildSiteUrl(site, '/apply')} navigate={navigate} style={{ color: 'var(--site-accent)', fontWeight: 700 }}>
                      Submit Scouting Portfolio →
                    </SiteLink>
                  </figcaption>
                </figure>
              )}

              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 500 }}>
                {routeId === 'home'
                  ? 'Featured Editorial Board'
                  : routeId === 'women'
                    ? 'Women’s Division'
                    : routeId === 'men'
                      ? 'Men’s Division'
                      : 'New Faces & Rising Talent'}
              </h2>

              <div className="ww-contact-sheet">
                {boardModels.map((model, idx) => (
                  <article key={model.artistId} className="ww-model-frame">
                    <img
                      src={
                        idx % 3 === 0
                          ? '/media/entertainment/willow-editorial.jpg'
                          : idx % 3 === 1
                            ? '/media/posters/poster-promenade-sunset.jpg'
                            : '/media/entertainment/glassline-atelier.jpg'
                      }
                      alt={`Editorial portfolio plate for ${model.stageName}`}
                      loading="lazy"
                    />
                    <strong>
                      <SiteLink
                        href={buildSiteUrl(site, `/models/${encodeURIComponent(model.artistId)}`)}
                        navigate={navigate}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {model.stageName}
                      </SiteLink>
                    </strong>
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.74rem', color: 'var(--site-muted)' }}>
                      {model.disciplines.join(' · ')}
                    </span>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* MODEL DETAIL /models/:id */}
          {routeId === 'model-detail' &&
            (() => {
              const model = data.ent.artists.find((a) => a.artistId === resolved.pathParams.id);
              if (!model) return <SiteNotFoundView site={site} navigate={navigate} />;
              return (
                <section className="ent-widget-stack" style={{ background: '#ffffff', padding: '1.4rem', border: '1px solid var(--site-border)' }}>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 500 }}>{model.stageName}</h2>
                  <p style={{ margin: 0, color: 'var(--site-muted)', lineHeight: 1.6 }}>{model.bio}</p>
                  <p className="ent-mono-tag">
                    Standing: {model.tier} · Disciplines: {model.disciplines.join(', ')}
                  </p>
                  <div className="ent-action-row">
                    <SiteLink href={crossSiteLinks.songbirdArtist(model.artistId)} navigate={navigate} className="ent-btn-secondary">
                      View Cross-Realm Profile on Songbird
                    </SiteLink>
                    <SiteLink href={buildSiteUrl(site, '/bookings')} navigate={navigate} className="ent-btn-primary">
                      Inquire for Editorial Booking
                    </SiteLink>
                  </div>
                </section>
              );
            })()}

          {/* EDITORIALS */}
          {routeId === 'editorials' && (
            <section className="ent-widget-stack">
              <h2 style={{ margin: 0 }}>Published Editorial & Brand Campaigns</h2>
              <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {data.ent.sponsorships.map((sp) => (
                  <li key={sp.sponsorshipId} className="ent-ticket-item">
                    <div className="ent-ticket-meta">
                      <strong>{sp.campaignTitle}</strong>
                      <span>
                        {sp.stageName} × {sp.sponsorName} · Cycle {sp.startCycle}
                      </span>
                    </div>
                    <SiteLink href={crossSiteLinks.orgHome(sp.sponsorOrgId)} navigate={navigate} className="ent-btn-secondary">
                      Visit {sp.sponsorName}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* BECOME A MODEL (/apply) */}
          {routeId === 'apply' && (
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Become a Model & Active Campaign Casting</h2>
              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                Willow Whisper books represented talent for Glassline Designs, Amrielle, and Rosemont Portrait campaigns.
                Agency-gated breakdowns require active representation; unrepresented performers can negotiate agency
                representation via Bookings.
              </p>
              <AuditionListWidget auditions={willowAuditions} data={data} accentColor="#315a42" />
            </section>
          )}

          {/* AUTHENTICATED BOOKINGS & REPRESENTATION */}
          {routeId === 'bookings' && (
            <AuthPortalGate
              data={data}
              portalName="Willow Whisper Booking & Representation Desk"
              description="Negotiate modeling representation or manage active brand campaign contracts."
            >
              <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <h2>Representation & Campaign Bookings</h2>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
                  Standard commission: {Math.round((org.commissionRate ?? 0.15) * 100)}% · Artist royalty share baseline:{' '}
                  {Math.round((org.royaltySplitArtist ?? 0.85) * 100)}%.
                </p>
                <div className="ent-action-row">
                  <button type="button" className="ent-btn-primary" onClick={() => setContractOpen(true)}>
                    Negotiate Willow Whisper Representation
                  </button>
                </div>
              </section>
            </AuthPortalGate>
          )}

          {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
        </main>
      </div>

      <ContractNegotiationDialog
        open={contractOpen}
        onClose={() => setContractOpen(false)}
        site={site}
        org={org}
        contractType="management"
        data={data}
      />
    </div>
  );
}
