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
  const [divisionTab, setDivisionTab] = useState<'all' | 'women' | 'men' | 'new'>('all');
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
    { id: 'apply', path: '/apply', label: 'Apply' },
    { id: 'bookings', path: '/bookings', label: 'Client Portal' },
  ];

  const getBoardModels = () => {
    const activeMode =
      routeId === 'women'
        ? 'women'
        : routeId === 'men'
          ? 'men'
          : routeId === 'new-faces'
            ? 'new'
            : divisionTab;
    if (activeMode === 'men') return modelRoster.filter((m) => m.artistId === 'ART-LEO');
    if (activeMode === 'women') return modelRoster.filter((m) => m.artistId !== 'ART-LEO');
    if (activeMode === 'new') return data.publicArtists.filter((m) => m.recognition < 65);
    return data.publicArtists;
  };

  const boardModels = getBoardModels();
  const modelPhotos = [
    '/media/entertainment/willow-editorial.jpg',
    '/media/posters/poster-promenade-sunset.jpg',
    '/media/entertainment/glassline-atelier.jpg',
    '/media/albums/album-marble-lilies.jpg',
    '/media/albums/album-meadow-dusk.jpg',
    '/media/albums/album-amber-silhouette.jpg',
  ];

  return (
    <div className="ent-root site-willow" data-site-shell="contact-sheet">
      <header className="ww-topbar">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontStyle: 'italic', fontSize: '1.1rem', color: '#e5b3c4' }}>WW</span>
          <h1 style={{ margin: 0, fontSize: '1rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>
            {site.name}
          </h1>
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

      {/* Hero Collage Banner (PDF p. 43) */}
      {routeId === 'home' && (
        <section className="ww-hero-banner" aria-label="Willow Whisper Models spotlight">
          <div className="ent-widget-stack">
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.16em', color: '#e5b3c4', textTransform: 'uppercase' }}>
              PROMENADE TERRACE · AURELINE
            </span>
            <h2 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.4cqi, 2.55rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.05 }}>
              Discover Extraordinary Talent
            </h2>
            <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: '#e5d3db', lineHeight: 1.55 }}>
              {site.description}
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <SiteLink href={buildSiteUrl(site, '/women')} navigate={navigate} className="ent-btn-primary" style={{ background: '#e5b3c4', color: '#2b1522' }}>
                Explore the Roster →
              </SiteLink>
              <SiteLink href={buildSiteUrl(site, '/about')} navigate={navigate} className="ent-btn-secondary" style={{ color: '#fdf5f0', borderColor: 'rgba(255,255,255,0.4)' }}>
                About the Agency
              </SiteLink>
            </div>
          </div>

          <img
            src="/media/entertainment/willow-editorial.jpg"
            alt="Willow Whisper Models conservatory tailoring campaign"
            style={{ inlineSize: '100%', aspectRatio: '4 / 3', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
          />

          <div className="ww-polaroid-stack">
            <div className="ww-polaroid">
              <img src="/media/posters/poster-promenade-sunset.jpg" alt="" loading="lazy" />
              <span>Promenade Edit</span>
            </div>
            <div className="ww-polaroid" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem', padding: '0.75rem' }}>
              <strong style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>Scouting Now</strong>
              <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: '#6e525f' }}>
                Cycle {data.cycle} Open Assessment
              </span>
              <SiteLink href={buildSiteUrl(site, '/apply')} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: '0.72rem', color: '#52243b' }}>
                Apply Today →
              </SiteLink>
            </div>
          </div>
        </section>
      )}

      <main className="ww-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#52243b" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME & DIVISION BOARDS */}
        {(routeId === 'home' || routeId === 'women' || routeId === 'men' || routeId === 'new-faces') && (
          <>
            {routeId === 'home' && (
              <section className="ent-widget-stack">
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--site-accent)' }}>
                  OUR DIVISIONS
                </span>
                <div className="ww-divisions-row">
                  {[
                    { title: 'WOMEN', desc: 'Editorial, couture runway, and beauty representation.', img: '/media/entertainment/willow-editorial.jpg', path: '/women' },
                    { title: 'MEN', desc: 'Tailoring, screen crossovers, and commercial bookings.', img: '/media/posters/poster-last-witness-noir.jpg', path: '/men' },
                    { title: 'NEW FACES', desc: 'Emerging voices and fresh Aureline & Marlowe talent.', img: '/media/entertainment/glassline-atelier.jpg', path: '/new-faces' },
                  ].map((div) => (
                    <SiteLink key={div.title} href={buildSiteUrl(site, div.path)} navigate={navigate} className="ww-division-card">
                      <img src={div.img} alt="" loading="lazy" />
                      <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.25rem' }}>
                        <strong style={{ fontSize: '1.1rem', letterSpacing: '0.06em' }}>{div.title}</strong>
                        <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--site-muted)' }}>
                          {div.desc}
                        </span>
                      </div>
                    </SiteLink>
                  ))}
                </div>
              </section>
            )}

            <section className="ww-main-split">
              <div className="ent-widget-stack">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.55rem', fontStyle: 'italic', fontWeight: 500 }}>
                    {routeId === 'home'
                      ? 'Discover Models'
                      : routeId === 'women'
                        ? 'Women’s Division'
                        : routeId === 'men'
                          ? 'Men’s Division'
                          : 'New Faces'}
                  </h2>
                  {routeId === 'home' && (
                    <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {([
                        ['all', 'All Models'],
                        ['women', 'Women'],
                        ['men', 'Men'],
                        ['new', 'New Faces'],
                      ] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={divisionTab === key ? 'ent-btn-primary' : 'ent-btn-secondary'}
                          style={{ minBlockSize: '30px', padding: '0.2rem 0.65rem', fontSize: '0.74rem' }}
                          onClick={() => setDivisionTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ww-contact-sheet">
                  {boardModels.map((model, idx) => (
                    <article key={model.artistId} className="ww-model-frame">
                      <img
                        src={modelPhotos[idx % modelPhotos.length]}
                        alt={`Editorial portfolio plate for ${model.stageName}`}
                        loading="lazy"
                      />
                      <strong style={{ fontSize: '0.92rem' }}>
                        <SiteLink
                          href={buildSiteUrl(site, `/models/${encodeURIComponent(model.artistId)}`)}
                          navigate={navigate}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {model.stageName}
                        </SiteLink>
                      </strong>
                      <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: 'var(--site-muted)' }}>
                        {model.disciplines.join(' · ')}
                      </span>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="ww-scouting-panel" aria-label="Scouting and applications">
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.14em', color: '#e5b3c4', textTransform: 'uppercase' }}>
                  PROMENADE SCOUTING DESK
                </span>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontStyle: 'italic', fontWeight: 400 }}>
                  Scouting & Applications
                </h3>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: '#e3cfd8', lineHeight: 1.55 }}>
                  Led by Camille Laurent & Evan Cho. Open to distinctive new and established editorial, runway, and
                  beauty talent across Meridion.
                </p>
                <SiteLink
                  href={buildSiteUrl(site, '/apply')}
                  navigate={navigate}
                  className="ent-btn-primary"
                  style={{ background: '#e5b3c4', color: '#2b1522', fontFamily: 'system-ui, sans-serif' }}
                >
                  Apply to Model →
                </SiteLink>
                <SiteLink
                  href={buildSiteUrl(site, '/bookings')}
                  navigate={navigate}
                  className="ent-btn-secondary"
                  style={{ color: '#fdf4ef', borderColor: 'rgba(255,255,255,0.35)', fontFamily: 'system-ui, sans-serif' }}
                >
                  Agency Bookings & Portal
                </SiteLink>
              </aside>
            </section>
          </>
        )}

        {/* MODEL DETAIL /models/:id */}
        {routeId === 'model-detail' &&
          (() => {
            const model = data.ent.artists.find((a) => a.artistId === resolved.pathParams.id);
            if (!model) return <SiteNotFoundView site={site} navigate={navigate} />;
            return (
              <section className="ent-widget-stack" style={{ background: '#ffffff', padding: '1.4rem', border: '1px solid var(--site-border)' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontStyle: 'italic', fontWeight: 500 }}>{model.stageName}</h2>
                <p style={{ margin: 0, color: 'var(--site-muted)', lineHeight: 1.6 }}>{model.bio}</p>
                <p className="ent-mono-tag">
                  Standing: {model.tier} · Disciplines: {model.disciplines.join(', ')}
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
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
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>Published Editorial & Brand Campaigns</h2>
            <ul className="ent-ticket-list" role="list" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {data.ent.sponsorships.map((sp) => (
                <li key={sp.sponsorshipId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
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

        {/* APPLY */}
        {routeId === 'apply' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              Become a Model & Active Campaign Casting
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
              Willow Whisper books represented talent for Glassline Designs, Amrielle, and Rosemont Portrait campaigns.
            </p>
            <AuditionListWidget auditions={willowAuditions} data={data} accentColor="#52243b" />
          </section>
        )}

        {/* AUTHENTICATED BOOKINGS */}
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
              <button type="button" className="ent-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setContractOpen(true)}>
                Negotiate Willow Whisper Representation
              </button>
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

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
