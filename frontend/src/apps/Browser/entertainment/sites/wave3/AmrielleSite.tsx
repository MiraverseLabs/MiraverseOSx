import { useState } from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import { OrgAboutSection, SiteNotFoundView } from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const AMRIELLE_EDITIONS = [
  {
    id: 'nocturne-de-verre',
    name: 'Nocturne de Verre Eau de Parfum',
    category: 'fragrance',
    price: 95,
    notes: 'Glassline iris, smoked cedar, evening bergamot · Vivienne Rose signature edition',
    swatches: ['#8f3f6c', '#d8a7b1', '#4c1d3d'],
  },
  {
    id: 'stage-veil-tint',
    name: 'Endurance Stage Luminous Veil',
    category: 'beauty',
    price: 42,
    notes: 'Heat-tested spotlight finish crafted for Marigold & Silverleaf tours',
    swatches: ['#f3d5c0', '#d8a484', '#8b573c', '#4a2b1d'],
  },
  {
    id: 'rose-promenade-mist',
    name: 'Crown Promenade Botanical Mist',
    category: 'fragrance',
    price: 68,
    notes: 'Crushed Aureline rosewater, white amber, rain-washed travertine',
    swatches: ['#e8b4c8', '#b76e79'],
  },
  {
    id: 'velvet-lip-lacquer',
    name: 'Crimson Curtain Lip Lacquer',
    category: 'beauty',
    price: 34,
    notes: 'High-pigment backstage wear co-developed with Femme Fatale performers',
    swatches: ['#9f1239', '#be185d', '#7f1d1d'],
  },
] as const;

export function AmrielleSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const [bagCount, setBagCount] = useState(0);
  const [selectedSwatches, setSelectedSwatches] = useState<Record<string, string>>({});

  const amrielleCampaigns = data.ent.sponsorships.filter((sp) => sp.sponsorOrgId === site.orgId);

  const navItems = [
    { id: 'home', path: '/', label: 'Collections' },
    { id: 'beauty', path: '/beauty', label: 'Beauty' },
    { id: 'fragrance', path: '/fragrance', label: 'Fragrance' },
    { id: 'campaigns', path: '/campaigns', label: 'Ambassadors' },
    { id: 'shop', path: '/shop', label: 'Shop' },
    { id: 'about', path: '/about', label: 'The House' },
  ];

  const renderProductGrid = (category?: 'beauty' | 'fragrance') => {
    const items = category ? AMRIELLE_EDITIONS.filter((p) => p.category === category) : AMRIELLE_EDITIONS;
    return (
      <div className="am-product-grid">
        {items.map((item) => (
          <article key={item.id} className="am-product-card">
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--site-accent)' }}>
              {item.category}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 600 }}>{item.name}</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--site-muted)', fontFamily: 'system-ui, sans-serif' }}>
              {item.notes}
            </p>
            <div className="am-swatch-row" aria-label={`Shades for ${item.name}`}>
              {item.swatches.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Select shade ${hex}`}
                  className="am-swatch"
                  style={{
                    background: hex,
                    outline: selectedSwatches[item.id] === hex ? '2px solid #361c2c' : undefined,
                    outlineOffset: '2px',
                  }}
                  onClick={() => setSelectedSwatches((prev) => ({ ...prev, [item.id]: hex }))}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', fontFamily: 'system-ui, sans-serif' }}>
              <span className="ent-mono-tag">{item.price} ₢</span>
              <button
                type="button"
                className="ent-btn-secondary"
                onClick={() => {
                  setBagCount((c) => c + 1);
                  data.setFeedback(`Added ${item.name} to your Amrielle boutique bag.`);
                }}
              >
                Add to Bag
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="ent-root site-amrielle" data-site-shell="beauty-storefront">
      <header className="am-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', color: '#dec4d0' }}>
          <span>CROWN PROMENADE, AURELINE</span>
          <span>BEAUTY · FRAGRANCE · STAGE ENDURANCE</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: '#ffffff' }}>
            <ShoppingBag size={14} aria-hidden="true" />
            <span>Bag ({bagCount})</span>
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3.8cqi, 2.65rem)', fontWeight: 400, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
          {site.name}
        </h1>
        <nav className="am-nav" aria-label={resolved.config.navAriaLabel}>
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

      {/* Luxury Fragrance Hero (PDF pp. 29–30) */}
      {routeId === 'home' && (
        <section className="am-hero" aria-label="Amrielle signature fragrance spotlight">
          <img
            src="/media/entertainment/amrielle-still-life.jpg"
            alt="Amrielle rose-toned glass perfume flacons and stage cosmetics arranged on warm travertine"
          />
          <div className="am-hero-scrim">
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '0.18em', color: '#f3c2d5', textTransform: 'uppercase' }}>
              NEW AT MAISON AMRIELLE · VIVIENNE ROSE EDITION
            </span>
            <h2 style={{ margin: '0.25rem 0 0.45rem', fontSize: 'clamp(1.85rem, 3.8cqi, 2.8rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.04 }}>
              Nocturne de Verre
            </h2>
            <p style={{ margin: '0 0 1rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: '#f5dce6', maxInlineSize: '28rem' }}>
              {site.tagline} — Botanical perfumery and stage-enduring cosmetics crafted in Aureline.
            </p>
            <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <SiteLink href={buildSiteUrl(site, '/shop')} navigate={navigate} className="ent-btn-primary" style={{ background: '#f5dce6', color: '#2b1523', borderRadius: '999px' }}>
                Shop the Collection →
              </SiteLink>
              <button
                type="button"
                className="ent-btn-secondary"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.45)', borderRadius: '999px' }}
                onClick={() =>
                  data.actions.acceptSponsorship(site.orgId, `Amrielle Cycle ${data.cycle} Botanical Mist Campaign`)
                }
              >
                <Sparkles size={13} aria-hidden="true" />
                <span>Ambassador Campaign</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="am-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#7f3159" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* HOME — 5-Category Strip + Collective Split + Bestsellers (PDF pp. 29–30) */}
        {routeId === 'home' && (
          <>
            <section className="am-cat-strip" aria-label="Shop Amrielle categories">
              {[
                { label: 'Fragrance', path: '/fragrance', img: '/media/entertainment/amrielle-still-life.jpg' },
                { label: 'Stage Beauty', path: '/beauty', img: '/media/entertainment/glassline-atelier.jpg' },
                { label: 'Ambassadors', path: '/campaigns', img: '/media/entertainment/willow-editorial.jpg' },
                { label: 'Full Boutique', path: '/shop', img: '/media/albums/album-marble-lilies.jpg' },
              ].map((cat) => (
                <SiteLink key={cat.label} href={buildSiteUrl(site, cat.path)} navigate={navigate} className="am-cat-tile">
                  <img src={cat.img} alt="" loading="lazy" />
                  <span>{cat.label} →</span>
                </SiteLink>
              ))}
            </section>

            <section className="ent-about-grid">
              <article style={{ background: '#2b1523', color: '#fdf2f6', padding: '1.35rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.6rem' }}>
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', letterSpacing: '0.16em', color: '#f0b4c8' }}>
                  THE AMRIELLE COLLECTIVE
                </span>
                <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 400, fontSize: '1.65rem' }}>
                  Meet Our Ambassadors
                </h2>
                <p style={{ margin: 0, fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: '#e6cad6', lineHeight: 1.55 }}>
                  Performers, vocalists, and dancers across Meridion who carry Amrielle from rehearsal rooms to
                  Silverleaf Stadium.
                </p>
                <SiteLink href={buildSiteUrl(site, '/campaigns')} navigate={navigate} className="ent-btn-primary" style={{ background: '#f0b4c8', color: '#2b1523', fontFamily: 'system-ui, sans-serif', alignSelf: 'flex-start' }}>
                  Meet the Circle →
                </SiteLink>
              </article>

              <article style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.35rem' }} className="ent-widget-stack">
                <h3 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Active Endorsements</h3>
                {amrielleCampaigns.map((sp) => (
                  <div key={sp.sponsorshipId} style={{ paddingBlockEnd: '0.6rem', borderBlockEnd: '1px solid var(--site-border)', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem' }}>
                    <strong>{sp.campaignTitle}</strong>
                    <div style={{ color: 'var(--site-muted)' }}>
                      {sp.stageName} × {sp.sponsorName} · {sp.feeCredits.toLocaleString()} ₢
                    </div>
                  </div>
                ))}
              </article>
            </section>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Bestsellers & Rituals</h2>
              {renderProductGrid()}
            </section>
          </>
        )}

        {routeId === 'beauty' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Stage Cosmetics & Personal Rituals</h2>
            {renderProductGrid('beauty')}
          </section>
        )}

        {routeId === 'fragrance' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Maison Amrielle Perfumery</h2>
            {renderProductGrid('fragrance')}
          </section>
        )}

        {routeId === 'shop' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontStyle: 'italic', fontWeight: 500 }}>Boutique Counter</h2>
            {renderProductGrid()}
          </section>
        )}

        {routeId === 'campaigns' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}>
              Ambassador Endorsements & Active Campaigns ({amrielleCampaigns.length})
            </h2>
            <div className="ent-action-row">
              <button
                type="button"
                className="ent-btn-primary"
                onClick={() =>
                  data.actions.acceptSponsorship(site.orgId, `Amrielle Cycle ${data.cycle} Fragrance Ambassador`)
                }
              >
                Accept Amrielle Ambassador Sponsorship
              </button>
              <SiteLink href={crossSiteLinks.orgHome('ORG_WILLOW_WHISPER', '/apply')} navigate={navigate} className="ent-btn-secondary">
                Willow Whisper × Amrielle Casting ↗
              </SiteLink>
            </div>
            <ul className="ent-ticket-list" role="list">
              {amrielleCampaigns.map((sp) => (
                <li key={sp.sponsorshipId} className="ent-ticket-item" style={{ background: '#ffffff' }}>
                  <div className="ent-ticket-meta">
                    <strong>{sp.campaignTitle}</strong>
                    <span>
                      {sp.stageName} × {sp.sponsorName} · Cycle {sp.startCycle}
                    </span>
                  </div>
                  <span className="ent-mono-tag">{sp.feeCredits.toLocaleString()} ₢</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
