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
    { id: 'demos', path: '/demos', label: 'Demo Submissions' },
    { id: 'portal', path: '/portal', label: 'Label Portal' },
    { id: 'about', path: '/about', label: 'About Marlie' },
  ];

  return (
    <div className="ent-root site-marlie" data-site-shell="indie-label">
      <header className="mr-coastal-header">
        <div>
          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
            HARBOR PRESSING ROOMS · ISLAND CITY, MARLOWE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.5rem, 3.2cqi, 2.3rem)', fontWeight: 700 }}>
            {site.name}
          </h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--site-muted)' }}>{site.tagline}</p>
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
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#1d5952" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME / RELEASES / NEW RELEASES */}
        {(routeId === 'home' || routeId === 'releases' || routeId === 'new-releases') && (
          <>
            {routeId === 'home' && (
              <section style={{ padding: '1.25rem', background: '#fbf7ee', border: '1px solid var(--site-border)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ maxInlineSize: '38rem' }}>
                  <h2 style={{ margin: '0 0 0.4rem' }}>Coastal Sessions & Honest Records</h2>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                    {site.description} Baseline artist royalty share:{' '}
                    <strong>{Math.round((org.royaltySplitArtist ?? 0.85) * 100)}%</strong>.
                  </p>
                </div>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <button type="button" className="ent-btn-primary" onClick={() => setLabelDealOpen(true)}>
                    Discuss Independent Label Deal
                  </button>
                  <SiteLink href={buildSiteUrl(site, '/demos')} navigate={navigate} className="ent-btn-secondary">
                    Submit Demo
                  </SiteLink>
                </div>
              </section>
            )}

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Disc3 size={18} aria-hidden="true" />
                <span>{routeId === 'new-releases' ? 'Latest Pressings & Sleeves' : 'Sleeve Catalog'}</span>
              </h2>
              <div className="mr-sleeve-grid">
                {data.topTracks.map((trk) => (
                  <article key={trk.trackId} className="mr-sleeve-card">
                    <img src={getTrackCoverUrl(trk)} alt={`Sleeve art for ${trk.title}`} loading="lazy" />
                    <strong>{trk.title}</strong>
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.76rem', color: 'var(--site-muted)' }}>
                      {trk.stageName} · {trk.genre}
                    </span>
                    <SiteLink
                      href={crossSiteLinks.songbirdAlbum(trk.trackId)}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ marginTop: 'auto', fontFamily: 'system-ui, sans-serif' }}
                    >
                      Stream on Songbird ↗
                    </SiteLink>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ARTISTS */}
        {routeId === 'artists' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Marlie Roster & Marlowe Independent Voices</h2>
            <div className="mr-sleeve-grid">
              {labelArtists.map((art) => (
                <article key={art.artistId} className="mr-sleeve-card">
                  <strong>{art.stageName}</strong>
                  <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
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

        {/* SESSIONS */}
        {routeId === 'sessions' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Harbor Pressing Sessions & Small-Room Routing</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
              Jonah Reed’s Catalog & Small-Room Touring desk pairs coastal Marlowe tracking sessions with intimate
              showcases at The Looking Glass in Glassline District.
            </p>
            <SiteLink href={crossSiteLinks.orgHome('ORG_LOOKING_GLASS', '/gigs')} navigate={navigate} className="ent-btn-primary" style={{ alignSelf: 'flex-start' }}>
              See Upcoming Nights at The Looking Glass ↗
            </SiteLink>
          </section>
        )}

        {/* DEMO SUBMISSIONS */}
        {routeId === 'demos' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Demo Submissions & Showcase Calls</h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>
              Maren Tidewell’s A&R Collective listens for distinctive songwriting and live presence. Apply to our
              Glassline showcase calls or request a creative-control label contract.
            </p>
            <AuditionListWidget auditions={marlieAuditions} data={data} accentColor="#1d5952" />
            <div>
              <button type="button" className="ent-btn-primary" onClick={() => setLabelDealOpen(true)}>
                Propose Independent Label Agreement
              </button>
            </div>
          </section>
        )}

        {/* AUTHENTICATED LABEL PORTAL */}
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
                  House baseline: {Math.round((org.royaltySplitArtist ?? 0.85) * 100)}% artist split · Master creative participation.
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
