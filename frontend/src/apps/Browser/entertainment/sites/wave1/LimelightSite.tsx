import { useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
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

  // Support both `/stories/:id` and legacy `/stories?story=<id>`
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
        <SiteLink href={buildSiteUrl(site, '/celebrity')} navigate={navigate} style={{ color: 'var(--site-accent)', fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Cover Dispatch</span>
        </SiteLink>
        {story ? (
          <>
            <div className="ll-kicker">
              {story.outletName} · {story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.2cqi, 2.3rem)', margin: '0.4rem 0 1rem', lineHeight: 1.15 }}>
              {story.headline}
            </h2>
            <p>{story.summary}</p>
            <p style={{ fontSize: '0.92rem', color: 'var(--site-muted)' }}>
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
      <div className="ll-front-grid">
        <section className="ll-cover-story">
          <span className="ll-kicker">{deskTitle} Desk · Limelight Edition</span>
          <h2>{deskTitle} Coverage & Greenroom Notes</h2>
          <ul className="ll-trending-list" role="list">
            {limelightStories.map((story) => (
              <li key={story.mediaId}>
                <span className="ll-kicker">
                  {story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}
                </span>
                <h3 style={{ margin: '0.25rem 0 0.4rem', fontSize: '1.25rem' }}>
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
        <aside className="ent-widget-stack">
          <h3 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'system-ui, sans-serif' }}>
            In The {deskTitle} Spotlight
          </h3>
          <ul className="ll-trending-list" role="list">
            {matchingArtists.map((art) => (
              <li key={art.artistId}>
                <strong>
                  <SiteLink href={crossSiteLinks.songbirdArtist(art.artistId)} navigate={navigate} style={{ color: 'inherit' }}>
                    {art.stageName}
                  </SiteLink>
                </strong>
                <div className="ll-kicker" style={{ marginTop: '0.15rem' }}>
                  {art.tier} · Recognition {art.recognition}
                </div>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--site-muted)' }}>{art.bio}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    );
  };

  return (
    <div className="ent-root site-limelight" data-site-shell="editorial-magazine">
      <header className="ll-masthead">
        <div className="ll-masthead-top">
          <span>29 Quay Arcade · Glassline District, Aureline</span>
          <span>Cycle {data.cycle} Digital & Print Edition</span>
          <span>Behind the Curtain · Ahead of the Conversation</span>
        </div>
        <h1 className="ll-wordmark">{site.name}</h1>
      </header>

      <nav className="ll-deck-bar" aria-label={resolved.config.navAriaLabel}>
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
      </nav>

      <main className="ll-body">
        <SiteFeedbackBanner message={data.feedback} onDismiss={() => data.setFeedback('')} accentColor="#8f1d4c" />

        {resolved.isNotFound && <SiteNotFoundView site={site} navigate={navigate} />}

        {activeStoryId && !resolved.isNotFound && renderStoryReader(activeStoryId)}

        {/* FRONT PAGE */}
        {routeId === 'home' && !activeStoryId && (
          <>
            <div className="ll-front-grid">
              <article className="ll-cover-story">
                <img
                  src="/media/albums/album-amber-silhouette.jpg"
                  alt="Warm amber stage silhouette from the Limelight cover feature"
                />
                <span className="ll-kicker">Cover Feature · Cycle {leadStory?.cycle ?? data.cycle}</span>
                <h2>
                  {leadStory ? (
                    <SiteLink
                      href={buildSiteUrl(site, `/stories/${encodeURIComponent(leadStory.mediaId)}`)}
                      navigate={navigate}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {leadStory.headline}
                    </SiteLink>
                  ) : (
                    site.tagline
                  )}
                </h2>
                <p style={{ fontSize: '1rem', lineHeight: 1.65, color: 'var(--site-muted)' }}>
                  {leadStory?.summary ?? site.description}
                </p>
                {leadStory && (
                  <SiteLink
                    href={buildSiteUrl(site, `/stories/${encodeURIComponent(leadStory.mediaId)}`)}
                    navigate={navigate}
                    className="ent-btn-primary"
                  >
                    Read Full Cover Story
                  </SiteLink>
                )}
              </article>

              <aside className="ent-widget-stack">
                <h2 style={{ margin: 0, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>
                  Trending Across Meridion
                </h2>
                <ul className="ll-trending-list" role="list">
                  {allStories.map((story) => (
                    <li key={story.mediaId}>
                      <span className="ll-kicker">
                        {story.outletName} · Cycle {story.cycle}
                      </span>
                      <h3 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1.05rem' }}>
                        <SiteLink
                          href={buildSiteUrl(site, `/stories/${encodeURIComponent(story.mediaId)}`)}
                          navigate={navigate}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {story.headline}
                        </SiteLink>
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--site-muted)' }}>{story.summary}</p>
                    </li>
                  ))}
                </ul>

                <div style={{ padding: '1rem', background: 'var(--site-surface-alt)', border: '1px solid var(--site-border)' }}>
                  <span className="ll-kicker">The Lists</span>
                  <h3 style={{ margin: '0.25rem 0 0.45rem' }}>Culture & 8-Axis Power Index</h3>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--site-muted)' }}>
                    Explore recognition, artistic credibility, favorability, and local-scene trust across Meridion’s active figures.
                  </p>
                  <SiteLink href={buildSiteUrl(site, '/lists')} navigate={navigate} className="ent-btn-secondary">
                    Open The Lists →
                  </SiteLink>
                </div>
              </aside>
            </div>
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
              <table className="ent-data-table" style={{ fontFamily: 'system-ui, sans-serif' }}>
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
            <ul className="ll-trending-list" role="list">
              {allStories
                .filter((s) => {
                  const q = archiveFilter.trim().toLowerCase();
                  return !q || s.headline.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q);
                })
                .map((story) => (
                  <li key={story.mediaId}>
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
