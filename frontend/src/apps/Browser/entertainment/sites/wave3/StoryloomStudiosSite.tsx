import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  AuditionListWidget,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

const FEATURED_WORLDS = [
  {
    id: 'citadel-of-echoes',
    title: 'Citadel of Echoes',
    status: 'In Production · Feature Film',
    director: 'Iris Finch',
    scorePartner: 'Kaji Publishing Studios',
    image: '/media/posters/poster-citadel-of-echoes.jpg',
    alt: 'Hand-painted key art for Storyloom Studios animated feature Citadel of Echoes',
    summary:
      'A hand-painted ink and gouache musical odyssey across floating lantern libraries, scored with live chamber strings and full voice ensemble.',
  },
  {
    id: 'harbor-of-lanterns',
    title: 'Harbor of Lanterns',
    status: 'Visual Development · Short Anthology',
    director: 'Otis Mercer (Art Direction)',
    scorePartner: 'Lantern Workshop Folio',
    image: '/media/posters/poster-promenade-sunset.jpg',
    alt: 'Warm twilight harbor illustration for Storyloom Studios anthology Harbor of Lanterns',
    summary:
      'Six watercolor twilight vignettes following dockside musicians, ferry pilots, and apprentices along the Promenade waterfront.',
  },
  {
    id: 'coastal-escapade',
    title: 'Coastal Escapade: Storybook Cut',
    status: 'Archive Release · Touring Screening',
    director: 'Iris Finch & Dawson Unit',
    scorePartner: 'Marlie Acoustic Sessions',
    image: '/media/posters/poster-coastal-escapade.jpg',
    alt: 'Illustrated coastal horizon poster for Storyloom Studios release Coastal Escapade',
    summary:
      'Restored cel-animated adventure celebrating sea-salt folklore, open-air cinema nights, and Aureline folk orchestration.',
  },
];

export function StoryloomStudiosSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const routeId = resolved.route?.id;
  const voiceAuditions = data.ent.auditions.filter(
    (a) => a.productionOrgId === site.orgId || a.orgId === site.orgId || a.discipline === 'acting',
  );
  const featuredVoiceAudition =
    voiceAuditions.find((a) => a.auditionId === 'AUD-SEED-05') ?? voiceAuditions[0];

  const navItems = [
    { id: 'home', path: '/', label: 'Our Worlds' },
    { id: 'productions', path: '/productions', label: 'Productions' },
    { id: 'characters', path: '/characters', label: 'Characters' },
    { id: 'behind-the-scenes', path: '/behind-the-scenes', label: 'Behind the Scenes' },
    { id: 'careers', path: '/careers', label: 'Careers' },
    { id: 'about', path: '/about', label: 'Lantern Workshop' },
  ];

  return (
    <div className="ent-root site-storyloom" data-site-shell="animation-studio">
      <header className="st-header">
        <div>
          <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
            LANTERN WORKSHOP · DAWNSON, AURELINE
          </span>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: 'clamp(1.4rem, 3cqi, 2.15rem)', fontWeight: 700 }}>
            {site.name}
          </h1>
        </div>
        <nav className="st-nav" aria-label={resolved.config.navAriaLabel}>
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

      <main className="st-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#c25e28" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {/* OUR WORLDS & PRODUCTIONS (PDF pp. 32 & 52) */}
        {(routeId === 'home' || routeId === 'productions') && (
          <>
            {/* Full-bleed cozy animator workspace hero */}
            <section className="st-hero">
              <img
                src="/media/entertainment/storyloom-world-studio.jpg"
                alt="Animators painting illustrated world boards inside Storyloom Studios Lantern Workshop"
              />
              <div className="st-hero-scrim">
                <div className="ent-widget-stack" style={{ maxInlineSize: '40rem' }}>
                  <span className="ent-mono-tag" style={{ color: '#fdba74' }}>
                    LANTERN WORKSHOP · HAND-DRAWN ANIMATED WORLDS
                  </span>
                  <h2 style={{ margin: 0, fontSize: 'clamp(1.75rem, 4cqi, 2.75rem)', lineHeight: 1.08 }}>
                    Stories in Motion.
                  </h2>
                  <p style={{ margin: 0, color: '#f3e8d8', fontSize: '0.96rem', lineHeight: 1.6 }}>
                    {site.tagline} — From ink-and-gouache storyboards to full orchestral voice sessions, every frame at
                    Storyloom is painted by hand in Dawson.
                  </p>
                  <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <SiteLink href={buildSiteUrl(site, '/productions')} navigate={navigate} className="ent-btn-primary">
                      Explore Our Worlds →
                    </SiteLink>
                    <SiteLink
                      href={buildSiteUrl(site, '/careers')}
                      navigate={navigate}
                      className="ent-btn-secondary"
                      style={{ background: 'rgba(255, 249, 240, 0.14)', color: '#fff9f0', borderColor: 'rgba(255, 249, 240, 0.4)' }}
                    >
                      Our Programs & Voice Casting
                    </SiteLink>
                  </div>
                </div>
              </div>
            </section>

            {/* Horizontal Featured Projects / Illustrated Worlds Strip */}
            <section className="ent-widget-stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div>
                  <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                    FEATURED PROJECTS · ILLUSTRATED WORLDS
                  </span>
                  <h2 style={{ margin: '0.2rem 0 0', fontSize: 'clamp(1.25rem, 2.4cqi, 1.65rem)' }}>
                    Current Slate & Visual Folios
                  </h2>
                </div>
                <SiteLink href={buildSiteUrl(site, '/characters')} navigate={navigate} className="ent-btn-secondary">
                  Character Folios →
                </SiteLink>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.1rem' }}>
                {FEATURED_WORLDS.map((world) => (
                  <article
                    key={world.id}
                    style={{
                      background: '#fffdf8',
                      border: '1px solid var(--site-border)',
                      borderRadius: '0.65rem',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <img
                      src={world.image}
                      alt={world.alt}
                      style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                        {world.status}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.12rem' }}>{world.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)', lineHeight: 1.55, flex: 1 }}>
                        {world.summary}
                      </p>
                      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.76rem', color: 'var(--site-muted)', paddingTop: '0.45rem', borderBlockStart: '1px solid var(--site-border)' }}>
                        <strong>{world.director}</strong> · {world.scorePartner}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Bottom Split Band: Featured Project Spotlight + Dark-Charcoal CREATE WITH US */}
            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                gap: '1.25rem',
                alignItems: 'stretch',
              }}
            >
              {/* Left: Featured Project Spotlight */}
              <article
                style={{
                  padding: '1.35rem',
                  background: '#fffcf5',
                  border: '1px solid var(--site-border)',
                  borderRadius: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                  FEATURED PROJECT · IN DEVELOPMENT
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 140px) minmax(0, 1fr)', gap: '1rem', alignItems: 'center' }}>
                  <img
                    src="/media/posters/poster-citadel-of-echoes.jpg"
                    alt="Citadel of Echoes illustrated poster"
                    style={{ inlineSize: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '0.4rem', border: '1px solid var(--site-border)' }}
                  />
                  <div className="ent-widget-stack">
                    <h3 style={{ margin: 0, fontSize: '1.35rem' }}>Citadel of Echoes</h3>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--site-muted)', lineHeight: 1.6 }}>
                      Directed by Iris Finch with orchestral score archives crafted alongside Kaji Publishing Studios.
                      Now recording vocal leads and choral harmonies for Cycle {data.cycle}.
                    </p>
                  </div>
                </div>
                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className="ent-btn-primary"
                    onClick={() =>
                      data.actions.createProject({
                        title: `Storyloom Illustrated Musical Short (Cycle ${data.cycle})`,
                        kind: 'film',
                        discipline: 'acting',
                        partnerOrgId: site.orgId,
                        budgetCredits: 110,
                      })
                    }
                  >
                    Pitch Animated Musical Short (110 ₢)
                  </button>
                  <SiteLink
                    href={crossSiteLinks.orgHome('ORG_KAJI_PUBLISHING', '/catalog')}
                    navigate={navigate}
                    className="ent-btn-secondary"
                  >
                    Kaji Score Archive ↗
                  </SiteLink>
                </div>
              </article>

              {/* Right: Dark-Charcoal CREATE WITH US */}
              <aside
                style={{
                  padding: '1.4rem',
                  background: '#251e2c',
                  color: '#fff9f0',
                  borderRadius: '0.7rem',
                  border: '1px solid #3c3248',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <span className="ent-mono-tag" style={{ color: '#fdba74' }}>
                  CREATE WITH US · STUDIO ACCESS & VOICE CASTING
                </span>
                <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff' }}>
                  Step Into the Booth & Sketch Desk
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#d7cce2', lineHeight: 1.6 }}>
                  Storyloom welcomes voice actors, character vocalists, storyboard apprentices, and acoustic composers
                  across all eight realms.
                </p>

                {featuredVoiceAudition && (
                  <div
                    style={{
                      padding: '0.9rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(253, 186, 116, 0.32)',
                      borderRadius: '0.5rem',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    <div className="ent-mono-tag" style={{ color: '#fdba74' }}>
                      OPEN CALL · {featuredVoiceAudition.auditionId}
                    </div>
                    <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.95rem' }}>
                      {featuredVoiceAudition.title}
                    </strong>
                    <small style={{ display: 'block', marginTop: '0.25rem', color: '#d7cce2' }}>
                      Discipline: {featuredVoiceAudition.discipline} · Stipend:{' '}
                      {featuredVoiceAudition.stipendCredits.toLocaleString()} ₢ · Closes Cycle{' '}
                      {featuredVoiceAudition.deadlineCycle}
                    </small>
                  </div>
                )}

                <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif', marginTop: 'auto' }}>
                  <SiteLink href={buildSiteUrl(site, '/careers')} navigate={navigate} className="ent-btn-primary">
                    View All {voiceAuditions.length} Voice & Studio Calls →
                  </SiteLink>
                  <SiteLink
                    href={crossSiteLinks.orgHome('ORG_OPEN_CALL', '/auditions')}
                    navigate={navigate}
                    className="ent-btn-secondary"
                    style={{ background: 'transparent', color: '#fff9f0', borderColor: 'rgba(255, 255, 255, 0.35)' }}
                  >
                    Open Call Board ↗
                  </SiteLink>
                </div>
              </aside>
            </section>
          </>
        )}

        {/* CHARACTERS & BEHIND THE SCENES */}
        {(routeId === 'characters' || routeId === 'behind-the-scenes') && (
          <section className="ent-widget-stack">
            <div
              style={{
                padding: '1.45rem',
                background: '#fffcf5',
                border: '1px solid var(--site-border)',
                borderRadius: '0.7rem',
              }}
              className="ent-widget-stack"
            >
              <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                {routeId === 'characters' ? 'VISUAL FOLIOS · MODEL SHEETS' : 'PRODUCTION DIARY · LANTERN WORKSHOP'}
              </span>
              <h2 style={{ margin: 0 }}>
                {routeId === 'characters' ? 'Character Studies & Visual Folios' : 'Lantern Workshop Production Diary'}
              </h2>
              <p style={{ margin: 0, color: 'var(--site-muted)', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Curated by Otis Mercer’s Production Paintings & Score Archive. Every frame begins as ink and gouache
                boards before entering voice-ensemble recording sessions with Dawson musicians and Kaji Publishing
                orchestrators.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
                <figure style={{ margin: 0, background: 'var(--site-surface-alt)', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--site-border)' }}>
                  <img
                    src="/media/entertainment/storyloom-world-studio.jpg"
                    alt="Dawson painting desk with character turnarounds and gouache palettes"
                    style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: '0.35rem' }}
                  />
                  <figcaption style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)', marginTop: '0.45rem' }}>
                    Plate 01 — Lantern Workshop gouache lighting study & character turnaround sheets.
                  </figcaption>
                </figure>
                <figure style={{ margin: 0, background: 'var(--site-surface-alt)', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--site-border)' }}>
                  <img
                    src="/media/entertainment/kaji-score-studio.jpg"
                    alt="Chamber score session supporting Storyloom animated cues"
                    style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: '0.35rem' }}
                  />
                  <figcaption style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)', marginTop: '0.45rem' }}>
                    Plate 02 — Kaji Publishing orchestral cue session synced to live animatics.
                  </figcaption>
                </figure>
                <figure style={{ margin: 0, background: 'var(--site-surface-alt)', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--site-border)' }}>
                  <img
                    src="/media/posters/poster-citadel-of-echoes.jpg"
                    alt="Final key art composition for Citadel of Echoes"
                    style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: '0.35rem' }}
                  />
                  <figcaption style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', color: 'var(--site-muted)', marginTop: '0.45rem' }}>
                    Plate 03 — Citadel of Echoes theatrical key art and color script approval.
                  </figcaption>
                </figure>
              </div>

              <div className="ent-action-row" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <button
                  type="button"
                  className="ent-btn-primary"
                  onClick={() =>
                    data.actions.createProject({
                      title: `Storyloom Illustrated Musical Short (Cycle ${data.cycle})`,
                      kind: 'film',
                      discipline: 'acting',
                      partnerOrgId: site.orgId,
                      budgetCredits: 110,
                    })
                  }
                >
                  Pitch Animated Musical Collaboration (110 ₢)
                </button>
                <SiteLink href={buildSiteUrl(site, '/careers')} navigate={navigate} className="ent-btn-secondary">
                  Apply for Voice Ensemble →
                </SiteLink>
              </div>
            </div>
          </section>
        )}

        {/* CAREERS & VOICE CASTING */}
        {routeId === 'careers' && (
          <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div>
              <span className="ent-mono-tag" style={{ color: 'var(--site-accent)' }}>
                STUDIO ACCESS & CASTING DESK
              </span>
              <h2 style={{ margin: '0.2rem 0 0', fontFamily: 'Georgia, serif' }}>
                Voice Ensemble Castings & Studio Openings
              </h2>
            </div>
            <AuditionListWidget auditions={voiceAuditions} data={data} accentColor="#c25e28" />
          </section>
        )}

        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}
      </main>
    </div>
  );
}
