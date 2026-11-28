import { gameDate } from '../../../gameplay/RealTimeClock';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useWorldMedia } from '../../../components/media/useWorldMedia';
import { useOSStore } from '../../../store/useOSStore';
import {
  Radio, ArrowUpRight, ArrowLeft, Bookmark, Search, Check,
  Activity, Landmark, HeartPulse, Globe, GraduationCap, BookOpen, Download, FilePlus2
} from 'lucide-react';
import {
  buildMeridianExpandedEdition,
  buildMeridianCollectibleIssue,
  filterNews,
  newsExposure,
  NEWS_SECTIONS,
  MERIDIAN_DEPARTMENTS,
  restoreNewsReading,
  type NewsArticle,
  type NewsSection,
  type MeridianDepartment,
} from './newsModel';
import { getCelestialState } from '../../../data/meridionWorld';
import { getMediaAssetById } from '../../../game-content/worldAssetLibrary';
import { CollectibleIssueReader } from '../../../components/media/MediaTemplateRenderer';
import { buildCollectibleIssueTextSummary, type CollectibleIssue } from '../../../components/media/templateModel';
import { restoreFyloState } from '../../files/fyloStore';
import meridionWorld from '../../../assets/images/meridion_world.jpg';
import './dispatch.css';
import '../publications/publications.css';
import { NEWS_SITE, newsUrl, parseNewsLocation } from './newsSite';

const ARTWORK: Record<string, { src: string; caption: string }> = {
  'prism-watch': { src: '/images/worknet/transit-junction.png', caption: 'Photograph · Aureline transit & grid relay infrastructure' },
  'civic-network': { src: '/images/wallpapers/aureline-harbor-twin-moons.jpg', caption: 'Photograph · Aureline Harbor beneath Radiance and Echo' },
  'employment-guide': { src: '/images/worknet/depository.png', caption: 'Photograph · Institutional colonnade in Aureline' },
  'seven-realms': { src: meridionWorld, caption: 'Cartographic Reference · Across Meridion’s Eight Realms' },
  'campus-practice': { src: '/images/wallpapers/aureline-glassline-twilight.png', caption: 'Photograph · Glassline & Academic Vector at dusk' },
  'meridian-society-concord': { src: '/images/wallpapers/aureline-terraces-twin-moons.jpg', caption: 'Photograph · Aureline Terraces & Crown District beneath Twin Moons' },
};

const SECTION_ICONS = { Civic: Landmark, Security: Activity, Health: HeartPulse, Economy: Landmark, Culture: GraduationCap };

function NewsArtwork({ article, compact = false }: { article: NewsArticle; compact?: boolean }) {
  useWorldMedia();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const candidate = article.assetId ? getMediaAssetById(article.assetId) : undefined;
  const customAsset = candidate?.provenance.approvalStatus === 'approved' && (!candidate.scope || ['canon', 'admin_canon'].includes(candidate.scope)) ? candidate : undefined;
  const art = ARTWORK[article.id] || (customAsset ? { src: customAsset.src, caption: `${article.sourceRef ? 'Illustration · ' : ''}${customAsset.caption}` } : undefined);
  const Icon = SECTION_ICONS[article.section] || Globe;
  return art && failedSource !== art.src ? (
    <figure className={`pulse-art ${compact ? 'pulse-art-compact' : ''}`}>
      <img src={art.src} alt={art.caption} loading={compact ? 'lazy' : 'eager'} onError={() => setFailedSource(art.src)} />
      {!compact && <figcaption>{art.caption}</figcaption>}
    </figure>
  ) : (
    <div className={`pulse-topic-art pulse-topic-${article.section.toLowerCase()}`} aria-hidden="true">
      <Icon size={compact ? 28 : 58} strokeWidth={1} />
      <span>{(article.department || article.section).toUpperCase()} · THE MERIDIAN</span>
    </div>
  );
}

export default function DispatchNewsSite({ url, navigateTab }: { url: string; navigateTab: (url: string, title?: string) => void }) {
  const gameplay = useOSStore(s => s.gameplay);
  const location = parseNewsLocation(url);
  const { section, query, savedOnly, articleId: selected } = location;
  const [searchText, setSearchText] = useState(query);
  const [activeDesk, setActiveDesk] = useState<MeridianDepartment>('All Desks');
  const [folioMode, setFolioMode] = useState(false);
  const [notice, setNotice] = useState('');

  const setQuery = (value: string) => navigateTab(newsUrl({ section, savedOnly, query: value }));
  const heading = useRef<HTMLHeadingElement>(null);
  const reading = restoreNewsReading(gameplay.pulseNews);

  const customArtifacts = (gameplay as any).publishedMediaArtifacts || [];
  const edition = useMemo(
    () =>
      buildMeridianExpandedEdition({
        cycle: gameplay.timeCycleCount,
        corruption: gameplay.prismCorruptionLevel,
        publishedArtifacts: customArtifacts,
        publications: gameplay.worldPublications,
      }),
    [gameplay.timeCycleCount, gameplay.prismCorruptionLevel, gameplay.worldPublications, customArtifacts],
  );

  const collectibleIssue = useMemo(
    () => buildMeridianCollectibleIssue({ cycle: gameplay.timeCycleCount, corruption: gameplay.prismCorruptionLevel, publications: gameplay.worldPublications }),
    [gameplay.timeCycleCount, gameplay.prismCorruptionLevel, gameplay.worldPublications],
  );

  const celestial = getCelestialState(gameplay.timeCycleCount ?? 28, gameplay.realTimeClock ? gameDate(gameplay) : undefined);
  const mastheadSvg = getMediaAssetById('canon:brand-meridian-masthead-illustrated') || getMediaAssetById('canon:brand-meridian-masthead');
  const meridianCrest = getMediaAssetById('canon:brand-meridian-laurel-emblem');

  const baseArticles = filterNews(edition, section, query, savedOnly, reading.saved);
  const articles = activeDesk === 'All Desks' ? baseArticles : baseArticles.filter(a => a.department === activeDesk);
  const article = edition.find(item => item.id === selected);
  const isFrontPage = section === 'All news' && activeDesk === 'All Desks' && !query.trim() && !savedOnly && !folioMode;
  const lead = articles[0];

  const updateReading = (id: string, save = false) =>
    useOSStore.setState(state => {
      const current = restoreNewsReading(state.gameplay.pulseNews);
      const next = save
        ? { ...current, saved: current.saved.includes(id) ? current.saved.filter(value => value !== id) : [...current.saved, id] }
        : { ...current, read: [...new Set([...current.read, id])] };
      return { gameplay: { ...state.gameplay, pulseNews: restoreNewsReading(next) } };
    });

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [url]);

  const openArticle = (item: NewsArticle) => {
    setFolioMode(false);
    navigateTab(newsUrl({ section, query, savedOnly, articleId: item.id }), `${item.headline} · ${NEWS_SITE.name}`);
  };

  const chooseSection = (value: NewsSection) => {
    setFolioMode(false);
    setActiveDesk('All Desks');
    navigateTab(newsUrl({ section: value }));
  };

  useEffect(() => {
    if (article && !reading.read.includes(article.id)) updateReading(article.id);
  }, [article?.id]);

  const reset = () => chooseSection('All news');

  const saveIssueToFylo = (issue: CollectibleIssue) => {
    const body = buildCollectibleIssueTextSummary(issue);
    const id = `fylo:${issue.id}`;
    useOSStore.setState(state => {
      const fylo = restoreFyloState(state.gameplay.player.fylo);
      const now = new Date().toISOString();
      fylo.files[id] = {
        id,
        name: `the-meridian-cycle-${issue.cycle}-edition.pdf`,
        type: 'pdf',
        dir: '/downloads/publications',
        size: `${Math.max(1, Math.ceil(body.length / 1024))} KB`,
        desc: `${issue.title} — ${issue.issueNumber}`,
        body,
        owner: 'player',
        origin: 'versenet',
        publisher: NEWS_SITE.name,
        webUrl: NEWS_SITE.url,
        createdAt: now,
        updatedAt: now,
      };
      if (!fylo.folders.includes('/downloads/publications')) fylo.folders.push('/downloads/publications');
      return { gameplay: { ...state.gameplay, player: { ...state.gameplay.player, fylo } } };
    });
    setNotice(`Saved ${issue.issueNumber} (.pdf) to Fylo under /downloads/publications.`);
  };

  const citeMeridianLead = (headline: string, excerpt: string, refNum?: number, sourceId?: string) => {
    const store = useOSStore.getState();
    const targetMission =
      store.gameplay?.player?.assignmentJournal?.selectedId ||
      Object.keys(store.gameplay?.player?.worknetOrders || {})[0] ||
      'ms-case-002';
    const res = store.citeInstitutionalEvidence({
      missionId: targetMission,
      sourceSystem: 'meridian-press-lead',
      recordId: sourceId || `MER-CLIP-C${gameplay.timeCycleCount}-P${refNum ?? 0}-${headline.slice(0, 80).replace(/\W+/g, '').toUpperCase()}`,
      title: `[Meridian Public Lead] ${headline}`,
      referenceCode: `MER-C${refNum ?? gameplay.timeCycleCount ?? 28}`,
      custodian: 'The Meridian · Public Press Reporting (Lead / Timestamp Corroboration)',
      citationText: `The Meridian (${NEWS_SITE.domain}), "${headline}" [Cycle ${refNum ?? gameplay.timeCycleCount ?? 28}]: ${excerpt} — Public press lead; does not replace TRACE forensic proof.`,
      excerpt,
      certified: false,
    });
    setNotice(res.message);
  };

  const saveButton = (item: NewsArticle) => (
    <button
      className="pulse-bookmark"
      aria-label={`${reading.saved.includes(item.id) ? 'Unsave' : 'Save'} ${item.headline}`}
      aria-pressed={reading.saved.includes(item.id)}
      onClick={() => updateReading(item.id, true)}
    >
      <Bookmark size={15} />
    </button>
  );

  const storyMeta = (item: NewsArticle) => (
    <div className="pulse-story-bottom">
      <span>
        {item.source} · Cycle {item.cycle}
      </span>
      <span>
        {reading.read.includes(item.id) && (
          <small>
            <Check size={12} /> Read
          </small>
        )}
        {saveButton(item)}
      </span>
    </div>
  );

  const card = (item: NewsArticle) => (
    <article key={item.id} className="pulse-story">
      <button className="pulse-image-link" aria-label={`Read ${item.headline}`} onClick={() => openArticle(item)}>
        <NewsArtwork article={item} compact />
      </button>
      <div className="pulse-story-meta">
        {item.department || item.section} / {item.kind}
      </div>
      <h2>
        <button onClick={() => openArticle(item)}>{item.headline}</button>
      </h2>
      <p>{item.summary}</p>
      {storyMeta(item)}
    </article>
  );

  if (!location.valid || (selected && !article)) {
    return (
      <section className="pulse-news pulse-empty" aria-label="The Meridian">
        <h1 tabIndex={-1} ref={heading}>
          Story unavailable
        </h1>
        <p>This address does not have a published page in The Meridian.</p>
        <button className="pulse-related" onClick={reset}>
          Return to the front page
        </button>
      </section>
    );
  }

  const redirectedFromDispatch = (() => {
    try {
      return new URL(url).hostname === NEWS_SITE.legacyDomain;
    } catch {
      return false;
    }
  })();

  return (
    <section className="pulse-news" style={{ background: '#F7F9FC', color: '#141214' }} aria-label="The Meridian">
      <header className="meridian-brand-bar">
        <button
          type="button"
          onClick={reset}
          aria-label="The Meridian home"
          style={{ background: 'transparent', border: 0, cursor: 'pointer', width: '100%' }}
        >
          {mastheadSvg ? (
            <img className="meridian-masthead-svg" src={mastheadSvg.src} alt="The Meridian — News, Analysis, Perspective" fetchPriority="high" />
          ) : (
            <strong style={{ fontFamily: 'var(--font-editorial-masthead)', fontSize: '2.4rem' }}>THE MERIDIAN</strong>
          )}
        </button>
        {meridianCrest && (
          <img src={meridianCrest.src} alt="" aria-hidden="true" style={{ height: 28, width: 'auto', margin: '0.25rem auto 0', display: 'block', opacity: 0.9 }} />
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '0.4rem',
            fontSize: '0.73rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#464C55',
          }}
        >
          <span>
            {celestial.weekday}, {celestial.monthName} {celestial.dayOfMonth} · CYCLE {gameplay.timeCycleCount}
          </span>
          <span>•</span>
          <span>
            {celestial.radiance.phaseIcon} Radiance: {celestial.radiance.phaseName} · {celestial.echo.phaseIcon} Echo: {celestial.echo.phaseName}
          </span>
          {redirectedFromDispatch && (
            <>
              <span>•</span>
              <span style={{ color: '#506F8A', fontWeight: 700 }}>Incorporating The Meridion Dispatch</span>
            </>
          )}
        </div>
      </header>

      {/* Ten Canonical Meridian Editorial Desks */}
      <div className="meridian-desk-strip" role="navigation" aria-label="Meridian Editorial Desks">
        {MERIDIAN_DEPARTMENTS.map(desk => (
          <button
            key={desk}
            type="button"
            className="meridian-desk-pill"
            aria-pressed={!folioMode && activeDesk === desk}
            onClick={() => {
              setFolioMode(false);
              setActiveDesk(desk);
              if (selected) navigateTab(newsUrl({ section: 'All news', query }));
            }}
          >
            {desk}
          </button>
        ))}
        <button
          type="button"
          className="meridian-desk-pill"
          style={{ background: '#48293D', borderColor: '#C6AE73' }}
          aria-pressed={folioMode}
          onClick={() => setFolioMode(v => !v)}
        >
          <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Broadsheet Edition
        </button>
      </div>

      <nav className="pulse-nav" aria-label="News sections">
        {NEWS_SECTIONS.map(value => (
          <button key={value} aria-pressed={section === value && !savedOnly && !folioMode} onClick={() => chooseSection(value)}>
            {value}
          </button>
        ))}
        <button
          className="pulse-saved-filter"
          aria-pressed={savedOnly}
          onClick={() => {
            setFolioMode(false);
            navigateTab(newsUrl({ section, query, savedOnly: !savedOnly }));
          }}
        >
          <Bookmark size={13} /> Saved stories ({reading.saved.length})
        </button>
        <button
          type="button"
          className="pulse-saved-filter"
          onClick={() => navigateTab('https://socialregister.mer', 'The Social Register')}
        >
          Visit The Social Register <ArrowUpRight size={12} />
        </button>
      </nav>

      <div className="pulse-content">
        {notice && (
          <div
            role="status"
            style={{
              padding: '0.6rem 1rem',
              marginBottom: '0.9rem',
              borderRadius: '6px',
              background: '#FFFFFF',
              border: '1px solid #506F8A',
              color: '#141214',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem',
            }}
          >
            <span>{notice}</span>
            <button type="button" className="pulse-text-button" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}

        {folioMode ? (
          <CollectibleIssueReader
            issue={collectibleIssue}
            onSaveIssueToFylo={saveIssueToFylo}
            onCiteLead={citeMeridianLead}
          />
        ) : article ? (
          <article className="pulse-reader" aria-label={article.headline}>
            <button className="pulse-text-button" onClick={() => navigateTab(newsUrl({ section, query, savedOnly }))}>
              <ArrowLeft size={14} /> Back to edition
            </button>
            <div className="pulse-story-meta">
              {article.department || article.section} / {article.kind} / Cycle {article.cycle}
            </div>
            <h1 tabIndex={-1} ref={heading} style={{ fontFamily: 'var(--font-editorial-masthead)' }}>
              {article.headline}
            </h1>
            <p className="pulse-reader-deck">{article.summary}</p>
            <div className="pulse-byline">
              <span>
                {article.source}
                <small>{article.kind === 'World advisory' ? `Current coverage · Cycle ${article.cycle}` : `Published cycle ${article.cycle}`}</small>
              </span>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  className="pulse-text-button"
                  aria-pressed={reading.saved.includes(article.id)}
                  onClick={() => updateReading(article.id, true)}
                >
                  <Bookmark size={14} />
                  {reading.saved.includes(article.id) ? 'Remove saved story' : 'Save story'}
                </button>
                <button
                  type="button"
                  className="pulse-text-button"
                  onClick={() => citeMeridianLead(article.headline, article.summary, article.cycle, article.id)}
                >
                  <FilePlus2 size={14} /> Cite as Press Lead
                </button>
              </div>
            </div>
            <NewsArtwork article={article} />
            <div className="pulse-reader-body" style={{ fontFamily: 'var(--font-editorial-body)', fontSize: '1.06rem' }}>
              {article.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            {article.link && (
              <button className="pulse-related" onClick={() => useOSStore.getState().openAppWorkspace(article.link!.app)}>
                {article.link.label}
                <ArrowUpRight size={15} />
              </button>
            )}
          </article>
        ) : (
          <>
            <div className="pulse-toolbar">
              <div>
                <span className="pulse-eyebrow">AURELINE & THE EIGHT REALMS</span>
                <h1 tabIndex={-1} ref={heading} style={{ fontFamily: 'var(--font-editorial-masthead)' }}>
                  {savedOnly ? 'Your reading shelf' : activeDesk !== 'All Desks' ? `${activeDesk} Desk` : section === 'All news' ? 'The Front Page' : section}
                </h1>
              </div>
              <form
                className="pulse-search"
                onSubmit={event => {
                  event.preventDefault();
                  setQuery(searchText);
                }}
              >
                <Search size={15} />
                <input
                  type="search"
                  aria-label="Search news"
                  placeholder="Search The Meridian"
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </div>
            <p className="pulse-result-count" role="status">
              {articles.length} {articles.length === 1 ? 'story' : 'stories'}
              {savedOnly ? ' saved in this edition' : ' in this edition'}
            </p>
            {lead ? (
              <>
                {isFrontPage ? (
                  <>
                    <div className="pulse-top-grid">
                      <article className="pulse-lead">
                        <div className="pulse-story-meta">
                          <span className="pulse-coverage-label" style={{ background: '#48293D', color: '#FFFFFF' }}>
                            BREAKING / WORLD GRID
                          </span>{' '}
                          {lead.department || lead.section}
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-editorial-masthead)' }}>
                          <button onClick={() => openArticle(lead)}>{lead.headline}</button>
                        </h2>
                        <button className="pulse-image-link" aria-label={`Read ${lead.headline}`} onClick={() => openArticle(lead)}>
                          <NewsArtwork article={lead} />
                        </button>
                        <p>{lead.summary}</p>
                        {storyMeta(lead)}
                        <button
                          className="pulse-related-headline"
                          onClick={() => openArticle(edition.find(item => item.id === 'faith-recovery') || lead)}
                        >
                          What the world reading means for your personal aura <ArrowUpRight size={13} />
                        </button>
                      </article>
                      <aside className="pulse-headline-rail" aria-label="Latest news">
                        <h2 className="pulse-section-heading">Latest across the desks</h2>
                        {articles.slice(1, 6).map(item => (
                          <article key={item.id}>
                            <span className="pulse-story-meta">
                              {item.department || item.section} · Cycle {item.cycle}
                            </span>
                            <h3>
                              <button onClick={() => openArticle(item)}>{item.headline}</button>
                            </h3>
                            <span className="pulse-rail-source">{item.source}</span>
                          </article>
                        ))}
                      </aside>
                      <aside className="pulse-sidebar" aria-label="World briefing">
                        <div className="pulse-briefing" style={{ background: '#22354A', color: '#FFFFFF' }}>
                          <Radio size={26} />
                          <span>THE MERIDIAN · TELEMETRY DESK</span>
                          <h2>
                            Eight Realms
                            <br />
                            right now.
                          </h2>
                          <p>PRISM exposure</p>
                          <strong>
                            {newsExposure(gameplay.prismCorruptionLevel).toFixed(1)}
                            <small>%</small>
                          </strong>
                          <p>Current world reading · Cycle {gameplay.timeCycleCount}</p>
                          <button onClick={() => saveIssueToFylo(collectibleIssue)}>
                            <Download size={13} /> Save Cycle Broadsheet (.pdf)
                          </button>
                        </div>
                        <div className="pulse-editors">
                          <h2 className="pulse-section-heading">Editor’s picks</h2>
                          {articles
                            .filter(item => ['seven-realms', 'campus-practice', 'meridian-opinion-civic-pace'].includes(item.id))
                            .map(item => (
                              <button key={item.id} onClick={() => openArticle(item)}>
                                <span>{item.department || item.section}</span>
                                {item.headline}
                                <ArrowUpRight size={13} />
                              </button>
                            ))}
                        </div>
                      </aside>
                    </div>
                    <section className="pulse-more" aria-label="More top stories">
                      <div className="pulse-section-header">
                        <h2 className="pulse-section-heading">Reporting Across Meridion</h2>
                        <span>TEN EDITORIAL DESKS · PUBLIC RECORD</span>
                      </div>
                      <div className="pulse-card-grid">{articles.slice(1, 7).map(card)}</div>
                    </section>
                  </>
                ) : (
                  <div className="pulse-card-grid pulse-results-grid">{articles.map(card)}</div>
                )}
              </>
            ) : (
              <div className="pulse-empty">
                <Search size={30} />
                <h2>{savedOnly ? 'Your shelf is quiet.' : 'No stories found.'}</h2>
                <p>{savedOnly ? 'Use a story’s bookmark button to keep it here.' : 'Try another search or desk.'}</p>
                <button className="pulse-text-button" onClick={reset}>
                  Show all news <ArrowUpRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
        <footer className="pulse-footer">
          <strong>THE MERIDIAN</strong>
          <span>
            Meridion’s flagship daily newspaper (incorporating The Meridion Dispatch)
            <br />
            News • Analysis • Perspective · Available offline
          </span>
          <div>
            {NEWS_SECTIONS.slice(1).map(value => (
              <button key={value} aria-label={`Browse ${value} news`} onClick={() => chooseSection(value)}>
                {value}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </section>
  );
}
