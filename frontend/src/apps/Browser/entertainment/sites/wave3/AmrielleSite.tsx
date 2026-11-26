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
    { id: 'campaigns', path: '/campaigns', label: 'Campaigns' },
    { id: 'shop', path: '/shop', label: 'Shop' },
    { id: 'about', path: '/about', label: 'Maison Amrielle' },
  ];

  const renderProductGrid = (category?: 'beauty' | 'fragrance') => {
    const items = category ? AMRIELLE_EDITIONS.filter((p) => p.category === category) : AMRIELLE_EDITIONS;
    return (
      <div className="am-product-grid">
        {items.map((item) => (
          <article key={item.id} className="am-product-card">
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--site-accent)' }}>
              {item.category}
            </span>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 600 }}>{item.name}</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--site-muted)', fontFamily: 'system-ui, sans-serif' }}>
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
                    outline: selectedSwatches[item.id] === hex ? '2px solid #381e2f' : undefined,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--site-muted)' }}>
          <span>Crown Promenade, Aureline</span>
          <span>Perfumery & Stage Cosmetics</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--site-ink)' }}>
            <ShoppingBag size={14} aria-hidden="true" />
            <span>Bag ({bagCount})</span>
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.75rem, 4cqi, 2.8rem)', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
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

      <main className="am-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8f3f6c" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* COLLECTIONS HOME */}
        {routeId === 'home' && (
          <>
            <figure style={{ margin: 0, background: '#ffffff', border: '1px solid var(--site-border)' }}>
              <img
                src="/media/entertainment/amrielle-still-life.jpg"
                alt="Amrielle rose-toned glass perfume flacons and stage cosmetics arranged on warm travertine"
                style={{ inlineSize: '100%', aspectRatio: '16 / 7.5', objectFit: 'cover' }}
              />
              <figcaption style={{ padding: '1.15rem 1.35rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 500 }}>{site.tagline}</h2>
                  <p style={{ margin: '0.25rem 0 0', fontFamily: 'system-ui, sans-serif', fontSize: '0.84rem', color: 'var(--site-muted)' }}>
                    Featuring Nocturne de Verre — our Cycle {data.cycle} collaboration with Vivienne Rose.
                  </p>
                </div>
                <button
                  type="button"
                  className="ent-btn-primary"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                  onClick={() =>
                    data.actions.acceptSponsorship(site.orgId, `Amrielle Cycle ${data.cycle} Botanical Mist Campaign`)
                  }
                >
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Accept Brand Ambassador Campaign</span>
                </button>
              </figcaption>
            </figure>

            <section className="ent-widget-stack">
              <h2 style={{ margin: 0, fontWeight: 500 }}>Signature House Editions</h2>
              {renderProductGrid()}
            </section>
          </>
        )}

        {routeId === 'beauty' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>Stage Cosmetics & Personal Rituals</h2>
            {renderProductGrid('beauty')}
          </section>
        )}

        {routeId === 'fragrance' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>Maison Amrielle Perfumery</h2>
            {renderProductGrid('fragrance')}
          </section>
        )}

        {routeId === 'shop' && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0, fontWeight: 500 }}>Boutique Counter</h2>
            {renderProductGrid()}
          </section>
        )}

        {/* CAMPAIGNS */}
        {routeId === 'campaigns' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontWeight: 500 }}>
              Ambassador Endorsements & Active Campaigns ({amrielleCampaigns.length})
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)' }}>
              Colette Amrielle and Rene Sato partner with musicians, models, and dancers across Meridion.
            </p>
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
