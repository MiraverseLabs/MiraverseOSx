import { useEffect, useId, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const STUDIO_PLATES = [
  {
    id: 'plate-amber',
    title: 'Amber Stage Study',
    category: 'editorial',
    src: '/media/albums/album-amber-silhouette.jpg',
    caption: 'Warm tungsten portrait plate commissioned for Limelight.',
  },
  {
    id: 'plate-lilies',
    title: 'Marble & Lilies Sleeve',
    category: 'portraiture',
    src: '/media/albums/album-marble-lilies.jpg',
    caption: 'Album cover plate photographed at 11 Rosemont Terrace for Vivienne Rose.',
  },
  {
    id: 'plate-willow',
    title: 'Conservatory Tailoring Trio',
    category: 'editorial',
    src: '/media/entertainment/willow-editorial.jpg',
    caption: 'Willow Whisper × Glassline Designs glasshouse sitting.',
  },
  {
    id: 'plate-violin',
    title: 'Balisya Chamber Study',
    category: 'portraiture',
    src: '/media/albums/album-chamber-violin.jpg',
    caption: 'Acoustic portrait plate for Kaji Publishing Studios.',
  },
  {
    id: 'plate-dusk',
    title: 'Marlowe Meadow Dusk',
    category: 'exhibitions',
    src: '/media/albums/album-meadow-dusk.jpg',
    caption: 'Archival coastal plate exhibited at Crown Terrace.',
  },
] as const;

export function RosemontPortraitSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const lightboxRef = useRef<HTMLDialogElement | null>(null);
  const lightboxTitleId = useId();
  const [selectedPlate, setSelectedPlate] = useState<(typeof STUDIO_PLATES)[number] | null>(null);

  useEffect(() => {
    const dlg = lightboxRef.current;
    if (!dlg) return;
    if (selectedPlate && !dlg.open) dlg.showModal();
    if (!selectedPlate && dlg.open) dlg.close();
  }, [selectedPlate]);

  const navItems = [
    { id: 'home', path: '/', label: 'Portfolio' },
    { id: 'editorial', path: '/editorial', label: 'Editorial' },
    { id: 'portraiture', path: '/portraiture', label: 'Portraiture' },
    { id: 'exhibitions', path: '/exhibitions', label: 'Exhibitions' },
    { id: 'book', path: '/book', label: 'Book a Sitting' },
    { id: 'about', path: '/about', label: 'Studio' },
  ];

  const visiblePlates =
    routeId === 'editorial' || routeId === 'portraiture' || routeId === 'exhibitions'
      ? STUDIO_PLATES.filter((p) => p.category === routeId)
      : STUDIO_PLATES;

  return (
    <div className="ent-root site-rosemont" data-site-shell="portrait-studio">
      <header className="rp-header">
        <div>
          <span className="ent-mono-tag" style={{ color: '#e2a886' }}>
            PHOTOGRAPHY · PORTRAITURE · 11 ROSEMONT TERRACE
          </span>
          <h1 style={{ margin: '0.1rem 0 0', fontSize: 'clamp(1.3rem, 2.6cqi, 1.9rem)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {site.name}
          </h1>
        </div>
        <nav className="rp-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="rp-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#b87352" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {(routeId === 'home' || routeId === 'editorial' || routeId === 'portraiture' || routeId === 'exhibitions') && (
          <>
            {routeId === 'home' && (
              <section className="vc-hero" style={{ background: '#1a1213', borderColor: 'var(--site-border)' }} aria-label="Rosemont Portrait House showcase">
                <img src="/media/albums/album-amber-silhouette.jpg" alt="Rosemont Portrait House tungsten darkroom study" />
                <div className="vc-hero-scrim" style={{ background: 'linear-gradient(95deg, rgba(19, 14, 15, 0.94) 0%, rgba(19, 14, 15, 0.58) 55%, transparent 100%)' }}>
                  <span className="ent-mono-tag" style={{ color: '#e2a886' }}>
                    PORTRAIT · EDITORIAL · ALBUM SLEEVES
                  </span>
                  <h2 style={{ margin: '0.3rem 0 0.5rem', fontSize: 'clamp(1.85rem, 3.8cqi, 2.8rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.04 }}>
                    Rosemont Portrait
                  </h2>
                  <p style={{ margin: '0 0 1rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#dfc9bc', maxInlineSize: '28rem' }}>
                    {site.tagline} — Photographed by Clara Bell & Henri Vane for musicians, actors, and periodicals.
                  </p>
                  <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <SiteLink href={buildSiteUrl(site, '/book')} navigate={navigate} className="ent-btn-primary" style={{ background: '#f5ece2', color: '#1e1414' }}>
                      <Camera size={14} aria-hidden="true" />
                      <span>Book a Sitting →</span>
                    </SiteLink>
                    <SiteLink href={buildSiteUrl(site, '/editorial')} navigate={navigate} className="ent-btn-secondary">
                      Editorial Plates
                    </SiteLink>
                  </div>
                </div>
              </section>
            )}

            {/* Masonry Portfolio + Ivory Parchment Book-the-Studio Sidebar (PDF p. 31) */}
            <section className="rp-lower-band">
              <div className="ent-widget-stack">
                <h2 style={{ margin: 0, fontSize: '1.15rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                  {routeId === 'home' ? 'Featured Collections & Glass Plates' : `${routeId} Archive`}
                </h2>
                <div className="rp-masonry">
                  {visiblePlates.map((plate) => (
                    <figure key={plate.id} className="rp-plate">
                      <img src={plate.src} alt={plate.caption} loading="lazy" />
                      <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9rem' }}>{plate.title}</strong>
                          <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--site-muted)' }}>
                            {plate.caption}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ent-btn-secondary"
                          style={{ fontFamily: 'system-ui, sans-serif', minBlockSize: '30px', padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
                          onClick={() => setSelectedPlate(plate)}
                        >
                          Inspect
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <aside className="rp-booking-parchment" aria-label="Book the Rosemont studio">
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a5239', fontWeight: 800 }}>
                  CROWN TERRACE STUDIO
                </span>
                <h3 style={{ margin: 0, fontSize: '1.45rem', fontStyle: 'italic', fontWeight: 500 }}>
                  Book the Studio
                </h3>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: '#5c4642', lineHeight: 1.55 }}>
                  Album sleeve sittings, Limelight press kits, and archival glass-plate portraiture tailored to your
                  next release.
                </p>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderBlock: '1px solid #d5c1b2', paddingBlock: '0.6rem' }}>
                  <span>01 · Select Session Package (60 ₢)</span>
                  <span>02 · Choose Darkroom Lighting Style</span>
                  <span>03 · Sync Press Plates to Limelight</span>
                </div>
                <button
                  type="button"
                  className="ent-btn-primary"
                  style={{ background: '#261918', color: '#f5ece2', fontFamily: 'system-ui, sans-serif' }}
                  onClick={() =>
                    data.actions.createProject({
                      title: `Rosemont Portrait Press Kit (Cycle ${data.cycle})`,
                      kind: 'promo_kit',
                      discipline: 'modeling',
                      partnerOrgId: site.orgId,
                      budgetCredits: 60,
                    })
                  }
                >
                  Book Now (60 ₢) →
                </button>
              </aside>
            </section>
          </>
        )}

        {routeId === 'book' && (
          <section style={{ padding: '1.5rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)', maxInlineSize: '46rem' }} className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>Commission Album Sleeve or Press Portrait Sitting</h2>
            <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Every sitting includes glass-plate proofing, press-kit licensing for Limelight and The Social Register,
              and high-resolution Songbird sleeve masters.
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <button
                type="button"
                className="ent-btn-primary"
                onClick={() =>
                  data.actions.createProject({
                    title: `Rosemont Portrait Press Kit (Cycle ${data.cycle})`,
                    kind: 'promo_kit',
                    discipline: 'modeling',
                    partnerOrgId: site.orgId,
                    budgetCredits: 60,
                  })
                }
              >
                Book Portrait & Press-Kit Sitting (60 ₢)
              </button>
              <button
                type="button"
                className="ent-btn-secondary"
                onClick={() =>
                  data.actions.acceptSponsorship(site.orgId, `Rosemont Archival Plate Feature (Cycle ${data.cycle})`)
                }
              >
                Accept Editorial Feature Sitting
              </button>
            </div>
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>

      <dialog
        ref={lightboxRef}
        className="ent-native-dialog"
        aria-labelledby={lightboxTitleId}
        {...({ closedby: 'any' } as Record<string, string>)}
        onClose={() => {
          if (lightboxRef.current) lightboxRef.current.returnValue = '';
          setSelectedPlate(null);
        }}
      >
        {selectedPlate && (
          <div className="ent-dialog-surface">
            <div className="ent-dialog-head">
              <h1 id={lightboxTitleId}>{selectedPlate.title}</h1>
              <button
                type="button"
                autoFocus
                className="ent-dialog-close"
                aria-label="Close plate preview"
                onClick={() => lightboxRef.current?.close()}
              >
                ×
              </button>
            </div>
            <img
              src={selectedPlate.src}
              alt={selectedPlate.caption}
              style={{ inlineSize: '100%', maxBlockSize: '360px', objectFit: 'cover' }}
            />
            <p className="ent-dialog-copy">{selectedPlate.caption}</p>
          </div>
        )}
      </dialog>
    </div>
  );
}
