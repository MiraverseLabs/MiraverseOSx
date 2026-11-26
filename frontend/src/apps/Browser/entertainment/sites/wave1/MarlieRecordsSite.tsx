import { useState } from 'react';
import { Disc3 } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks, getTrackCoverUrl } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { ContractNegotiationDialog } from '../../components/ContractNegotiationDialog';
import { ReleasePublishForm } from '../../components/GameplayWidgets';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function MarlieRecordsSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [labelDealOpen, setLabelDealOpen] = useState(false);

  const labelArtists = data.publicArtists.filter(
    (a) => a.labelOrgId === site.orgId || a.genres.some((g) => /indie|folk|soul|r&b|synth/i.test(g)),
  );
  const marlieAuditions = data.ent.auditions.filter(
    (a) => a.productionOrgId === site.orgId || a.orgId === site.orgId || a.discipline === 'music',
  );

  const navItems = [
    { id: 'home', path: '/', label: 'Pressing Room' },
    { id: 'artists', path: '/artists', label: 'Artists' },
    { id: 'releases', path: '/releases', label: 'Releases' },
    { id: 'new-releases', path: '/new-releases', label: 'New Releases' },
    { id: 'sessions', path: '/sessions', label: 'Sessions' },
    { id: 'demos', path: '/demos', label: 'Demos' },
    { id: 'portal', path: '/portal', label: 'Label Portal' },
    { id: 'about', path: '/about', label: 'About' },
  ];

  return (
    <div className="ent-root site-marlie" data-site-shell="indie-label">
      <header className="mr-coastal-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.45rem, 3cqi, 2.15rem)', fontStyle: 'italic', fontWeight: 700, color: '#1d5952' }}>
            {site.name}
          </h1>
          <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--site-muted)' }}>
            Independent Record Label · Island City, Marlowe
          </span>
        </div>
        <nav className="mr-coastal-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="mr-coastal-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#c86442" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — Round 2 Coastal Scrapbook Layout (PDF p. 48) */}
        {routeId === 'home' && (
          <>
            <section className="mr-scrapbook-hero" aria-label="Marlie Records coastal studio showcase">
              <div className="ent-widget-stack">
                <span className="mr-sticky-note">Independent Music From Meridion ★</span>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.4cqi, 2.55rem)', fontStyle: 'italic', lineHeight: 1.08 }}>
                  A Home for Original Voices.
                </h2>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                  {site.description} Baseline artist royalty share:{' '}
                  <strong>{Math.round((org.royaltySplitArtist ?? 0.85) * 100)}%</strong>.
                </p>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <SiteLink href={buildSiteUrl(site, '/artists')} navigate={navigate} className="ent-btn-primary" style={{ borderRadius: '999px' }}>
                    Explore the Roster →
                  </SiteLink>
                  <button type="button" className="ent-btn-secondary" style={{ borderRadius: '999px' }} onClick={() => setLabelDealOpen(true)}>
                    Discuss Label Deal
                  </button>
                </div>
              </div>

              <img
                src="/media/entertainment/marlie-coastal-session.jpg"
                alt="Independent musicians recording live in the sunlit coastal Marlie Records harbor studio"
                style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover', border: '4px solid #fffcf5', boxShadow: '0 8px 24px rgba(36, 43, 37, 0.16)' }}
                onError={(e) => {
                  e.currentTarget.src = '/media/albums/album-meadow-dusk.jpg';
                }}
              />
            </section>

            {/* 3-Column Scrapbook Main Area: Artist Roster | Latest Releases | Label News & Send Demo */}
            <section className="mr-three-col">
              <div className="ent-widget-stack">
                <h3 style={{ margin: 0, fontStyle: 'italic', fontSize: '1.2rem' }}>Artist Roster</h3>
                <div className="mr-sleeve-grid">
                  {labelArtists.slice(0, 4).map((art, i) => (
                    <article key={art.artistId} className="mr-sleeve-card">
                      <img
                        src={i % 2 === 0 ? '/media/albums/album-meadow-dusk.jpg' : '/media/albums/album-prism-eclipse.jpg'}
                        alt={`Portrait sleeve for ${art.stageName}`}
                        loading="lazy"
                      />
                      <strong style={{ fontSize: '0.86rem' }}>
                        <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {art.stageName}
                        </SiteLink>
                      </strong>
                      <small style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: 'var(--site-muted)' }}>
                        {art.genres[0]}
                      </small>
                    </article>
                  ))}
                </div>
              </div>

              <div className="ent-widget-stack">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 style={{ margin: 0, fontStyle: 'italic', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Disc3 size={16} aria-hidden="true" />
                    <span>Latest Releases</span>
                  </h3>
                  <SiteLink href={buildSiteUrl(site, '/releases')} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.74rem', color: '#1d5952', fontWeight: 700 }}>
                    View All →
                  </SiteLink>
                </div>
                <div className="mr-sleeve-grid">
                  {data.topTracks.slice(0, 4).map((trk) => (
                    <article key={trk.trackId} className="mr-sleeve-card">
                      <img src={getTrackCoverUrl(trk)} alt={`Sleeve art for ${trk.title}`} loading="lazy" />
                      <strong style={{ fontSize: '0.84rem' }}>{trk.title}</strong>
                      <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--site-muted)' }}>
                        {trk.stageName}
                      </span>
                      <SiteLink href={crossSiteLinks.songbirdAlbum(trk.trackId)} navigate={navigate} style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', fontWeight: 700, color: '#1d5952' }}>
                        Stream ↗
                      </SiteLink>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="ent-widget-stack">
                <div style={{ padding: '1rem', background: '#fffcf5', border: '1px solid var(--site-border)' }} className="ent-widget-stack">
                  <h3 style={{ margin: 0, fontStyle: 'italic', fontSize: '1.15rem' }}>Label News</h3>
                  {data.ent.mediaItems.slice(0, 2).map((m) => (
                    <div key={m.mediaId} style={{ paddingBlockEnd: '0.55rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                      <SiteLink href={crossSiteLinks.limelightStory(m.mediaId)} navigate={navigate} style={{ color: 'inherit', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'system-ui, sans-serif', textDecoration: 'none' }}>
                        {m.headline}
                      </SiteLink>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '1.1rem', background: '#f2e2c6', border: '1px solid #d1ba91' }} className="ent-widget-stack">
                  <h3 style={{ margin: 0, fontStyle: 'italic' }}>Send Us Your Music</h3>
                  <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)' }}>
                    Have a single, EP, or live tape? Maren Tidewell’s A&R Collective listens for honest songwriting.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/demos')} navigate={navigate} className="ent-btn-primary" style={{ background: '#242b25', fontFamily: 'system-ui, sans-serif' }}>
                    Submit a Demo →
                  </SiteLink>
                </div>
              </aside>
            </section>
          </>
        )}

        {(routeId === 'releases' || routeId === 'new-releases') && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>
              {routeId === 'new-releases' ? 'Latest Pressings & Sleeves' : 'Complete Sleeve Catalog'}
            </h2>
            <div className="mr-sleeve-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}>
              {data.topTracks.map((trk) => (
                <article key={trk.trackId} className="mr-sleeve-card">
                  <img src={getTrackCoverUrl(trk)} alt={`Sleeve art for ${trk.title}`} loading="lazy" />
                  <strong>{trk.title}</strong>
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                    {trk.stageName} · {trk.genre}
                  </span>
                  <SiteLink href={crossSiteLinks.songbirdAlbum(trk.trackId)} navigate={navigate} className="ent-btn-secondary" style={{ marginTop: 'auto', fontFamily: 'system-ui, sans-serif' }}>
                    Stream on Songbird ↗
                  </SiteLink>
                </article>
              ))}
            </div>
          </section>
        )}

        {routeId === 'artists' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>Marlie Roster & Marlowe Independent Voices</h2>
            <div className="mr-sleeve-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
              {labelArtists.map((art) => (
                <article key={art.artistId} className="mr-sleeve-card">
                  <strong>{art.stageName}</strong>
                  <span className="ent-mono-tag" style={{ color: '#1d5952' }}>
                    {art.genres.join(' · ')}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--site-muted)' }}>{art.bio}</p>
                  <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} className="ent-btn-secondary">
                    Listen on Songbird ↗
                  </SiteLink>
                </article>
              ))}
            </div>
          </section>
        )}

        {routeId === 'sessions' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic' }}>Harbor Pressing Sessions & Small-Room Routing</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Jonah Reed’s Catalog & Small-Room Touring desk pairs coastal Marlowe tracking sessions with intimate
              showcases at The Looking Glass in Glassline District.
            </p>
            <SiteLink href={crossSiteLinks.orgHome('ORG_LOOKING_GLASS', '/gigs')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start', fontFamily: 'system-ui, sans-serif' }}>
              See Upcoming Nights at The Looking Glass ↗
            </SiteLink>
          </section>
        )}

        {routeId === 'demos' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Demo Submissions & Showcase Calls</h2>
            <AuditionListWidget auditions={marlieAuditions} data={data} accentColor="#c86442" />
            <button type="button" className="ent-btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setLabelDealOpen(true)}>
              Propose Independent Label Agreement
            </button>
          </section>
        )}

        {routeId === 'portal' && (
          <AuthPortalGate
            data={data}
            portalName="Marlie Records Artist & Label Portal"
            description="Deliver new independent masters to Songbird via Marlie Records or renegotiate label royalty terms."
          >
            <div className="ent-about-grid" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <section className="mr-sleeve-card">
                <h2 style={{ margin: 0 }}>Press & Release Master</h2>
                <ReleasePublishForm data={data} labelOrgId={site.orgId} distributorOrgId="ORG_LUNERUM_DIST" accentColor="#1d5952" />
              </section>
              <section className="mr-sleeve-card">
                <h2 style={{ margin: 0 }}>Label Contract Terms</h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                  House baseline: {Math.round((org.royaltySplitArtist ?? 0.85) * 100)}% artist split · Creative control.
                </p>
                <button type="button" className="ent-btn-primary" onClick={() => setLabelDealOpen(true)}>
                  Negotiate Label Contract
                </button>
              </section>
            </div>
          </AuthPortalGate>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <ContractNegotiationDialog
        open={labelDealOpen}
        onClose={() => setLabelDealOpen(false)}
        site={site}
        org={org}
        contractType="label"
        data={data}
      />
    </div>
  );
}
