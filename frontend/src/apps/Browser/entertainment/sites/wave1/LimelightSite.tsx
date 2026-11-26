import { useState } from 'react';
import { ArrowLeft, Search, Star } from 'lucide-react';
import { buildSiteUrl } from '../../entertainmentRouter';
import { crossSiteLinks } from '../../services/entertainmentDataService';
import { AuthPortalGate } from '../../components/AuthPortalGate';
import { SiteFeedbackBanner } from '../../components/SiteFeedbackBanner';
import { SiteLink } from '../../components/SiteLink';
import {
  EcosystemDirectorySection,
  OrgAboutSection,
  SiteNotFoundView,
} from '../../components/SiteStandardSections';
import type { SiteComponentProps } from '../types';

export function LimelightSite({ site, org, resolved, data, navigate }: SiteComponentProps) {
  const [archiveFilter, setArchiveFilter] = useState('');
  const routeId = resolved.route?.id;

  const queryStoryId = resolved.params.get('story');
  const activeStoryId = routeId === 'story-detail' ? resolved.pathParams.id : queryStoryId;

  const limelightStories = data.ent.mediaItems
    .filter((m) => m.orgId === site.orgId)
    .sort((a, b) => b.cycle - a.cycle);
  const allStories = [...data.ent.mediaItems].sort((a, b) => b.cycle - a.cycle);
  const leadStory = limelightStories[0] ?? allStories[0];

  const deskNav = [
    { id: 'home', path: '/', label: 'Front Page' },
    { id: 'celebrity', path: '/celebrity', label: 'Celebrity' },
    { id: 'music', path: '/music', label: 'Music' },
    { id: 'screen', path: '/screen', label: 'Screen' },
    { id: 'fashion', path: '/fashion', label: 'Fashion' },
    { id: 'culture', path: '/culture', label: 'Culture' },
    { id: 'lists', path: '/lists', label: 'The Lists' },
    { id: 'archive', path: '/archive', label: 'Archive' },
    { id: 'press-desk', path: '/press-desk', label: 'Press Desk' },
  ];

  const renderStoryReader = (storyId: string) => {
    const story = allStories.find((s) => s.mediaId === storyId);
    const linkedArtists = story
      ? data.ent.artists.filter((a) => story.subjectArtistIds.includes(a.artistId))
      : [];
    return (
      <article className="ll-article-reader">
        <SiteLink
          href={buildSiteUrl(site, '/celebrity')}
          navigate={navigate}
          style={{
            color: 'var(--site-accent)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Cover Dispatch</span>
        </SiteLink>
        {story ? (
          <>
            <div className="ll-kicker">
              {story.outletName} · {story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.2cqi, 2.4rem)', margin: '0.4rem 0 1rem', lineHeight: 1.12, fontStyle: 'italic' }}>
              {story.headline}
            </h2>
            <p style={{ fontSize: '1.06rem', lineHeight: 1.72 }}>{story.summary}</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--site-muted)' }}>
              Filed from 29 Quay Arcade, Glassline District, Aureline · Editorial tone: {story.sentiment}.
            </p>
            {linkedArtists.length > 0 && (
              <div className="ent-action-row" style={{ marginTop: '1.25rem' }}>
                {linkedArtists.map((art) => (
                  <SiteLink
                    key={art.artistId}
                    href={crossSiteLinks.songbirdArtist(art.artistId)}
                    navigate={navigate}
                    className="ent-btn-secondary"
                  >
                    Listen to {art.stageName} on Songbird →
                  </SiteLink>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h2>Story unavailable</h2>
            <p>This entry could not be located in the current Limelight edition.</p>
          </>
        )}
      </article>
    );
  };

  const renderDeskSection = (deskTitle: string, disciplineFilter?: string) => {
    const matchingArtists = disciplineFilter
      ? data.rankedArtists.filter((a) => a.disciplines.includes(disciplineFilter as any))
      : data.rankedArtists;
    return (
      <div className="ll-hero-band">
        <section style={{ background: '#ffffff', border: '1px solid var(--site-border)', padding: '1.35rem' }} className="ent-widget-stack">
          <span className="ll-kicker">{deskTitle} Desk · Limelight Edition</span>
          <h2 style={{ margin: 0, fontStyle: 'italic' }}>{deskTitle} Coverage & Greenroom Notes</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="ent-widget-stack">
            {limelightStories.map((story) => (
              <li key={story.mediaId} style={{ paddingBlockEnd: '0.9rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                <span className="ll-kicker">
                  {story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}
                </span>
                <h3 style={{ margin: '0.2rem 0 0.4rem', fontSize: '1.25rem' }}>
                  <SiteLink
                    href={buildSiteUrl(site, `/stories/${encodeURIComponent(story.mediaId)}`)}
                    navigate={navigate}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {story.headline}
                  </SiteLink>
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--site-muted)', lineHeight: 1.55 }}>
                  {story.summary}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <aside className="ll-interviews-col">
          <span className="ll-kicker">In The {deskTitle} Spotlight</span>
          {matchingArtists.map((art) => (
            <div key={art.artistId} style={{ paddingBlockEnd: '0.75rem', borderBlockEnd: '1px solid var(--site-border)' }}>
              <strong>
                <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} style={{ color: 'inherit' }}>
                  {art.stageName}
                </SiteLink>
              </strong>
              <div className="ll-kicker" style={{ marginTop: '0.15rem' }}>
                {art.tier} · Recognition {art.recognition}
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--site-muted)' }}>{art.bio}</p>
            </div>
          ))}
        </aside>
      </div>
    );
  };

  return (
    <div className="ent-root site-limelight" data-site-shell="editorial-magazine">
      <div className="ll-top-strip">
        <span>29 Quay Arcade · Glassline District, Aureline</span>
        <span>Cycle {data.cycle} · Arts · Celebrity · Culture</span>
        <SiteLink href={buildSiteUrl(site, '/press-desk')} navigate={navigate} style={{ color: '#f9e3c6', fontWeight: 700 }}>
          Press Desk →
        </SiteLink>
      </div>

      <header className="ll-masthead">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="ll-wordmark">{site.name}</h1>
          <span style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--site-muted)' }}>
            The Culture Magazine of VerseNet
          </span>
        </div>
        <span className="ll-kicker">ARTS · CELEBRITY · CULTURE · BEHIND THE CURTAIN</span>
      </header>

      <nav className="ll-deck-bar" aria-label={resolved.config.navAriaLabel}>
        <div className="ll-deck-links">
          {deskNav.map((item) => (
            <SiteLink
              key={item.id}
              href={buildSiteUrl(site, item.path)}
              navigate={navigate}
              current={routeId === item.id && !activeStoryId}
            >
              {item.label}
            </SiteLink>
          ))}
        </div>
        <SiteLink
          href={buildSiteUrl(site, '/archive')}
          navigate={navigate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--site-muted)', fontSize: '0.76rem' }}
        >
          <Search size={13} aria-hidden="true" />
          <span>Search Limelight</span>
        </SiteLink>
      </nav>

      <main className="ll-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#6e1735" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {activeStoryId && !resolved.isNotFound && renderStoryReader(activeStoryId)}

        {/* FRONT PAGE — Round 2 Mockup Composition (PDF p. 40) */}
        {routeId === 'home' && !activeStoryId && (
          <>
            {/* Top Asymmetric Band: Cover Story + Spotlight Interviews */}
            <section className="ll-hero-band">
              <article className="ll-cover-feature">
                <img
                  src="/media/entertainment/limelight-cover-editorial.jpg"
                  alt="Editorial cover portrait of Meridion creative artists in sunlit burgundy gallery"
                  onError={(e) => {
                    e.currentTarget.src = '/media/albums/album-amber-silhouette.jpg';
                  }}
                />
                <div className="ll-cover-scrim">
                  <span className="ll-kicker" style={{ color: '#f3d1a3' }}>
                    COVER STORY · CYCLE {leadStory?.cycle ?? data.cycle}
                  </span>
                  <h2>
                    {leadStory ? (
                      <SiteLink
                        href={buildSiteUrl(site, `/stories/${encodeURIComponent(leadStory.mediaId)}`)}
                        navigate={navigate}
                        style={{ color: '#ffffff', textDecoration: 'none' }}
                      >
                        {leadStory.headline}
                      </SiteLink>
                    ) : (
                      site.tagline
                    )}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#f6e7dc', maxInlineSize: '30rem', lineHeight: 1.5 }}>
                    {leadStory?.summary ?? site.description}
                  </p>
                  {leadStory && (
                    <div style={{ marginTop: '0.45rem' }}>
                      <SiteLink
                        href={buildSiteUrl(site, `/stories/${encodeURIComponent(leadStory.mediaId)}`)}
                        navigate={navigate}
                        className="ent-btn-primary"
                        style={{ background: '#7d1d3f', borderColor: '#d9a962' }}
                      >
                        Read the Cover Story →
                      </SiteLink>
                    </div>
                  )}
                </div>
              </article>

              <aside className="ll-interviews-col" aria-label="Spotlight interviews">
                <span className="ll-kicker">Spotlight Interviews</span>
                {allStories.slice(0, 2).map((story, i) => (
                  <article key={story.mediaId} className="ll-interview-item">
                    <img
                      src={i === 0 ? '/media/albums/album-meadow-dusk.jpg' : '/media/albums/album-amber-silhouette.jpg'}
                      alt={`Editorial inset for ${story.headline}`}
                      loading="lazy"
                    />
                    <div>
                      <span className="ll-kicker">{i === 0 ? 'Exclusive' : 'The Conversation'}</span>
                      <h3 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1.02rem', fontStyle: 'italic', lineHeight: 1.2 }}>
                        <SiteLink
                          href={buildSiteUrl(site, `/stories/${encodeURIComponent(story.mediaId)}`)}
                          navigate={navigate}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {story.headline}
                        </SiteLink>
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--site-muted)', lineHeight: 1.45 }}>
                        {story.summary}
                      </p>
                    </div>
                  </article>
                ))}
              </aside>
            </section>

            {/* Full-Width Numbered Trending Culture Strip (01–04) */}
            <section className="ll-trending-strip" aria-label="Trending culture stories">
              <div className="ll-trending-badge">Trending Culture →</div>
              {[
                { num: '01', title: 'NYLA’s Independent Marlowe Rise at The Looking Glass', img: '/media/albums/album-meadow-dusk.jpg', href: crossSiteLinks.songbirdArtist('ART-NYLA') },
                { num: '02', title: 'Inside Mirrora’s Glassline Harbor Season II', img: '/media/posters/poster-last-witness-noir.jpg', href: crossSiteLinks.orgHome('ORG_MIRRORA_STUDIOS') },
                { num: '03', title: 'Glassline Designs’ Stage Couture for Femme Fatale', img: '/media/entertainment/glassline-atelier.jpg', href: crossSiteLinks.orgHome('ORG_GLASSLINE_DESIGNS') },
                { num: '04', title: 'Silverleaf Stadium Preps 45,000-Seat Radiance Bowl', img: '/media/albums/album-neon-starlight.jpg', href: crossSiteLinks.orgHome('ORG_SILVERLEAF_STADIUM') },
              ].map((t) => (
                <SiteLink key={t.num} href={t.href} navigate={navigate} className="ll-trend-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="ll-trend-num">{t.num}</span>
                  <img src={t.img} alt="" loading="lazy" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, fontFamily: 'system-ui, sans-serif', lineHeight: 1.25 }}>
                    {t.title}
                  </span>
                </SiteLink>
              ))}
            </section>

            {/* 3-Column Bottom Editorial Band: Culture 50 | Editors' Picks | Pull Quote */}
            <section className="ll-bottom-band">
              <article className="ll-culture50-card">
                <img
                  src="/media/brands/meridian-laurel-emblem.png"
                  alt=""
                  aria-hidden="true"
                  style={{ inlineSize: '46px', blockSize: '46px', objectFit: 'contain' }}
                />
                <span className="ll-kicker" style={{ color: '#e6c27a' }}>
                  THE LISTS · EIGHT REALMS
                </span>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontStyle: 'italic', lineHeight: 1.05 }}>
                  The Culture 50 & Fame Index
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#f3d7c6', fontFamily: 'system-ui, sans-serif' }}>
                  The performers, writers, and directors shaping Meridion across all 8 reputation axes.
                </p>
                <SiteLink
                  href={buildSiteUrl(site, '/lists')}
                  navigate={navigate}
                  className="ent-btn-primary"
                  style={{ background: '#c89d54', color: '#240b14', marginTop: '0.3rem' }}
                >
                  See the Full Index →
                </SiteLink>
              </article>

              <section className="ll-editors-box" aria-label="Editors picks">
                <div className="ent-widget-stack">
                  <span className="ll-kicker">Editors’ Picks</span>
                  <img
                    src="/media/entertainment/willow-editorial.jpg"
                    alt="Conservatory editorial shoot featured in Limelight"
                    style={{ inlineSize: '100%', aspectRatio: '16 / 10', objectFit: 'cover' }}
                  />
                  <h3 style={{ margin: 0, fontStyle: 'italic', fontSize: '1.15rem' }}>
                    Conservatory Tailoring & The New Visual Agencies
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--site-muted)', fontFamily: 'system-ui, sans-serif' }}>
                    How Willow Whisper Models, Rosemont Portrait, and Glassline Designs are elevating stage visual craft.
                  </p>
                </div>
                <div className="ent-widget-stack" style={{ justifyContent: 'space-between' }}>
                  {data.rankedArtists.slice(0, 3).map((art) => (
                    <div key={art.artistId} style={{ paddingBlockEnd: '0.55rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                      <span className="ll-kicker">{art.tier}</span>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                        <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} style={{ color: 'inherit' }}>
                          {art.stageName}
                        </SiteLink>
                      </div>
                      <small style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--site-muted)', fontSize: '0.74rem' }}>
                        Recognition {art.recognition} · Credibility {art.artisticCredibility}
                      </small>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="ll-quote-box" aria-label="Featured pull quote">
                <span style={{ fontSize: '2.6rem', lineHeight: 0.7, color: '#8f1d4c', fontStyle: 'italic' }}>“</span>
                <p style={{ margin: 0, fontSize: '1.2rem', fontStyle: 'italic', lineHeight: 1.35, color: '#3b1222' }}>
                  Visibility isn’t just exposure — in Meridion’s living press, it’s authorship.
                </p>
                <span className="ll-kicker">— Sloane Vesper, Greenroom Desk</span>
              </aside>
            </section>
          </>
        )}

        {routeId === 'celebrity' && !activeStoryId && renderDeskSection('Celebrity')}
        {routeId === 'music' && !activeStoryId && renderDeskSection('Music', 'music')}
        {routeId === 'screen' && !activeStoryId && renderDeskSection('Screen', 'acting')}
        {routeId === 'fashion' && !activeStoryId && renderDeskSection('Fashion', 'modeling')}
        {routeId === 'culture' && !activeStoryId && renderDeskSection('Culture', 'dance')}

        {/* THE LISTS (8-Axis Fame Power Index) */}
        {routeId === 'lists' && !activeStoryId && (
          <section className="ent-widget-stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={18} aria-hidden="true" />
              <h2 style={{ margin: 0 }}>Limelight 8-Axis Fame Power Index</h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--site-muted)', maxInlineSize: '52rem' }}>
              Celebrity standing in Meridion is never a single number—Limelight tracks recognition alongside
              artistic credibility, favorability, and commercial influence.
            </p>
            <div className="ent-table-scroll" tabIndex={0}>
              <table className="ent-data-table" style={{ fontFamily: 'system-ui, sans-serif', background: '#ffffff' }}>
                <caption>Active Public Figures Ranked Across Fame Dimensions</caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Performer</th>
                    <th scope="col">Tier</th>
                    <th scope="col">Recognition</th>
                    <th scope="col">Credibility</th>
                    <th scope="col">Favorability</th>
                    <th scope="col">Commercial</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankedArtists.map((art, i) => (
                    <tr key={art.artistId}>
                      <td className="ent-mono-tag">#{i + 1}</td>
                      <td>
                        <SiteLink
                          href={crossSiteLinks.songbirdArtist(art.artistId)}
                          navigate={navigate}
                          style={{ color: 'var(--site-accent)', fontWeight: 700, textDecoration: 'none' }}
                        >
                          {art.stageName}
                        </SiteLink>
                      </td>
                      <td>{art.tier}</td>
                      <td className="ent-mono-tag">{art.recognition}</td>
                      <td className="ent-mono-tag">{art.artisticCredibility}</td>
                      <td className="ent-mono-tag">{art.favorability}</td>
                      <td className="ent-mono-tag">{art.commercialInfluence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ARCHIVE */}
        {routeId === 'archive' && !activeStoryId && (
          <section className="ent-widget-stack">
            <h2 style={{ margin: 0 }}>Limelight Editorial Archive</h2>
            <div className="ent-field" style={{ maxInlineSize: '26rem', fontFamily: 'system-ui, sans-serif' }}>
              <label htmlFor="ll-archive-search" className="ent-field-label">
                Filter dispatches by headline or keyword
              </label>
              <input
                id="ll-archive-search"
                type="search"
                value={archiveFilter}
                onChange={(e) => setArchiveFilter(e.target.value)}
                placeholder="e.g. Starstruck, NYLA, Radiance..."
                className="ent-input"
              />
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="ent-widget-stack">
              {allStories
                .filter((s) => {
                  const q = archiveFilter.trim().toLowerCase();
                  return !q || s.headline.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q);
                })
                .map((story) => (
                  <li key={story.mediaId} style={{ paddingBlockEnd: '0.9rem', borderBlockEnd: '1px solid var(--site-border)' }}>
                    <span className="ll-kicker">
                      {story.outletName} · Cycle {story.cycle}
                    </span>
                    <h3 style={{ margin: '0.2rem 0' }}>
                      <SiteLink href={buildSiteUrl(site, `/stories/${encodeURIComponent(story.mediaId)}`)} navigate={navigate} style={{ color: 'inherit' }}>
                        {story.headline}
                      </SiteLink>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--site-muted)' }}>{story.summary}</p>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* AUTHENTICATED PRESS DESK */}
        {routeId === 'press-desk' && !activeStoryId && (
          <AuthPortalGate
            data={data}
            portalName="Limelight Press & Interview Desk"
            description="Schedule verified artist interviews, submit greenroom fact-checks, or accept editorial desk assignments."
          >
            <section className="ent-widget-stack" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <h2>Press & Media Scheduling</h2>
              <div className="ent-action-row">
                <button
                  type="button"
                  className="ent-btn-primary"
                  onClick={() => data.actions.acceptAppearance('ORG_LIMELIGHT', 'interview')}
                >
                  Sit for Limelight Feature Interview
                </button>
                <button
                  type="button"
                  className="ent-btn-secondary"
                  onClick={() => data.actions.openWorknetMission('ms-press-02')}
                >
                  Open WORKNET: Limelight Greenroom Fact-Check ↗
                </button>
              </div>
              {data.ent.controversies.filter((c) => c.status === 'active').length > 0 && (
                <div className="ent-widget-stack">
                  <h3>Active Public Statements & Right of Reply</h3>
                  {data.ent.controversies
                    .filter((c) => c.status === 'active')
                    .map((cnv) => (
                      <div key={cnv.controversyId} className="ent-ticket-item">
                        <div className="ent-ticket-meta">
                          <strong>{cnv.stageName}</strong>
                          <span>{cnv.topic}</span>
                        </div>
                        <button
                          type="button"
                          className="ent-btn-primary"
                          onClick={() => data.actions.respondControversy(cnv.controversyId, 'accountable_statement')}
                        >
                          Issue On-Record Statement
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </AuthPortalGate>
        )}

        {routeId === 'directory' && <EcosystemDirectorySection currentSite={site} data={data} navigate={navigate} />}
        {routeId === 'about' && <OrgAboutSection site={site} org={org} data={data} navigate={navigate} />}

        <footer style={{ borderBlockStart: '1px solid var(--site-border)', paddingBlockStart: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem' }}>
          <SiteLink href={buildSiteUrl(site, '/about')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            About Limelight
          </SiteLink>
          <SiteLink href={buildSiteUrl(site, '/directory')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            Meridion Industry Directory
          </SiteLink>
          <SiteLink href={crossSiteLinks.orgHome('ORG_WORD_OF_MOUTH', '/pressroom')} navigate={navigate} style={{ color: 'var(--site-muted)' }}>
            Word of Mouth Pressroom ↗
          </SiteLink>
        </footer>
      </main>
    </div>
  );
}
