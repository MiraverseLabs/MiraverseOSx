import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarPlus, Download, FilePlus2, Search, Sparkles } from 'lucide-react';
import { useOSStore } from '../../../store/useOSStore';
import { getMediaAssetById, resolveEntityMediaSlot } from '../../../game-content/worldAssetLibrary';
import { CollectibleIssueReader, MediaTemplateRenderer } from '../../../components/media/MediaTemplateRenderer';
import { buildCollectibleIssueTextSummary, type CollectibleIssue, type PublishedMediaArtifact } from '../../../components/media/templateModel';
import {
  SOCIAL_REGISTER_ARTICLES,
  SOCIAL_REGISTER_DEPARTMENTS,
  SOCIAL_REGISTER_SITE,
  buildSocialRegisterIssue01,
  parseSocialRegisterLocation,
  socialRegisterUrl,
  type SocialRegisterArticle,
  type SocialRegisterDepartment,
} from './socialRegisterModel';
import { restoreFyloState } from '../../files/fyloStore';
import './publications.css';

function toSocialRegisterArtifact(article: SocialRegisterArticle): PublishedMediaArtifact {
  return {
    id: `art:${article.id}`,
    templateId: article.department === 'The Interview' ? 'tpl-mag-interview' : 'tpl-mag-department-opener',
    brandKitId: 'the-social-register',
    channel: 'magazine',
    verificationTier: 'verified_reporting',
    slotValues: {
      kicker: article.department,
      headline: article.headline,
      subhead: article.deck,
      byline: `${article.byline} · Cycle ${article.cycle}`,
      pullQuote: article.pullQuote,
      body: article.body[0],
      imageAssetId: article.assetId,
      primaryEntityId: article.entityId,
    },
    entityRefs: article.entityId ? [article.entityId] : [],
    authorId: 'ORG_SOCIAL_REGISTER',
    authorName: 'The Social Register',
    publisherOrgId: 'ORG_SOCIAL_REGISTER',
    publishedCycle: article.cycle,
    createdAt: '2026-11-24T12:00:00Z',
  };
}

export default function SocialRegisterSite({
  url,
  navigateTab,
}: {
  url: string;
  navigateTab: (url: string, title?: string) => void;
}) {
  const cycle = useOSStore(s => s.gameplay.timeCycleCount ?? 28);
  const customMedia: PublishedMediaArtifact[] = useOSStore(s => (s.gameplay as any).publishedMediaArtifacts || []);
  const location = parseSocialRegisterLocation(url);
  const [searchInput, setSearchInput] = useState(location.query);
  const [notice, setNotice] = useState('');

  const issue01 = useMemo(() => buildSocialRegisterIssue01(cycle), [cycle]);
  const masthead = getMediaAssetById('canon:brand-sr-masthead');
  const monogram = getMediaAssetById('canon:brand-sr-monogram');

  const dynamicMagazineStories: SocialRegisterArticle[] = useMemo(
    () =>
      customMedia
        .filter(m => m.channel === 'magazine' || m.publisherOrgId === 'ORG_SOCIAL_REGISTER')
        .map(m => ({
          id: m.id,
          department: (SOCIAL_REGISTER_DEPARTMENTS.includes(m.slotValues.kicker as any)
            ? m.slotValues.kicker
            : 'Society') as Exclude<SocialRegisterDepartment, 'All Departments'>,
          headline: m.slotValues.headline,
          deck: m.slotValues.subhead || 'Dispatched through Miraverse Creative Studio.',
          byline: m.slotValues.byline || `By ${m.authorName}`,
          pullQuote: m.slotValues.pullQuote,
          cycle: m.publishedCycle,
          assetId: m.slotValues.imageAssetId,
          entityId: m.slotValues.primaryEntityId || m.entityRefs[0],
          body: (m.slotValues.body || m.slotValues.subhead || '').split(/\n+/).filter(Boolean),
        })),
    [customMedia],
  );

  const allArticles = useMemo(() => [...dynamicMagazineStories, ...SOCIAL_REGISTER_ARTICLES], [dynamicMagazineStories]);

  const filtered = useMemo(() => {
    const words = location.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return allArticles.filter(
      a =>
        (location.department === 'All Departments' || a.department === location.department) &&
        words.every(w => `${a.department} ${a.headline} ${a.deck} ${a.byline} ${a.body.join(' ')}`.toLowerCase().includes(w)),
    );
  }, [allArticles, location.department, location.query]);

  const activeArticle = location.articleId ? allArticles.find(a => a.id === location.articleId) : undefined;

  const saveFyloEntry = (fileId: string, name: string, dir: string, desc: string, body: string) => {
    useOSStore.setState(state => {
      const fylo = restoreFyloState(state.gameplay.player.fylo);
      const now = new Date().toISOString();
      fylo.files[fileId] = {
        id: fileId,
        name,
        type: name.split('.').pop() || 'pdf',
        dir,
        size: `${Math.max(1, Math.ceil(body.length / 1024))} KB`,
        desc,
        body,
        owner: 'player',
        origin: 'versenet',
        publisher: SOCIAL_REGISTER_SITE.name,
        webUrl: url,
        createdAt: now,
        updatedAt: now,
      };
      if (!fylo.folders.includes(dir)) fylo.folders.push(dir);
      return {
        gameplay: {
          ...state.gameplay,
          player: { ...state.gameplay.player, fylo },
        },
      };
    });
  };

  const handleSaveIssuePdf = (issue: CollectibleIssue) => {
    const body = buildCollectibleIssueTextSummary(issue);
    saveFyloEntry(
      `fylo:sr-${issue.id}`,
      'the-social-register-issue-01-between-tradition-and-tomorrow.pdf',
      '/downloads/publications',
      `${issue.title} ${issue.issueNumber} — ${issue.theme}`,
      body,
    );
    setNotice('Saved Collectible Edition (.pdf) to Fylo under /downloads/publications.');
  };

  const handleSaveIcs = (title: string, details: string) => {
    const icsBody = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Social Register//MiraverseOSx//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n+/g, ' ')}`,
      'LOCATION:Rosemont Editorial House, 7 Rosemont Terrace, Aureline',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
    saveFyloEntry(`fylo:ics-${slug}`, `${slug}.ics`, '/downloads/calendar', `Social Calendar Invitation: ${title}`, icsBody);
    setNotice(`Saved calendar invitation (${slug}.ics) to Fylo under /downloads/calendar.`);
  };

  const handleCiteLead = (headline: string, excerpt: string, pageOrCycle?: number) => {
    const store = useOSStore.getState();
    const targetMission =
      store.gameplay?.player?.assignmentJournal?.selectedId ||
      Object.keys(store.gameplay?.player?.worknetOrders || {})[0] ||
      'ms-case-002';
    const res = store.citeInstitutionalEvidence({
      missionId: targetMission,
      sourceSystem: 'versenet-publication-lead',
      recordId: `SR-CLIP-${headline.slice(0, 18).replace(/\W+/g, '').toUpperCase()}`,
      title: `[Press Lead] ${headline}`,
      referenceCode: `SR-C${cycle}`,
      custodian: 'The Social Register · Public Press Clipping (Corroborating Lead Only)',
      citationText: `The Social Register (${SOCIAL_REGISTER_SITE.domain}), "${headline}" [Ref ${pageOrCycle ?? cycle}]: ${excerpt} — Cited as public media lead/timestamp, not standalone forensic proof.`,
      excerpt,
      certified: false,
    });
    saveFyloEntry(
      `fylo:clip-sr-${headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 36)}`,
      `clipping-${headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}.note`,
      '/notes',
      `Clipping from The Social Register: ${headline}`,
      `${headline}\nSource: ${SOCIAL_REGISTER_SITE.name} (${url})\nVerification: Public Editorial Reporting (Lead / Context)\n\n${excerpt}`,
    );
    setNotice(res.ok ? `${res.message} Also saved clipping to Fylo /notes.` : 'Saved press clipping to Fylo /notes.');
  };

  if (!location.valid) {
    return (
      <section className="sr-portal" aria-label="The Social Register">
        <div className="sr-body">
          <h1>Page not in Register</h1>
          <p>This address is not part of the current Social Register index.</p>
          <button type="button" className="sr-gold-btn" onClick={() => navigateTab(SOCIAL_REGISTER_SITE.url, SOCIAL_REGISTER_SITE.name)}>
            Return to Front Salon
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="sr-portal" aria-label="The Social Register">
      <header className="sr-header">
        <button
          type="button"
          onClick={() => navigateTab(SOCIAL_REGISTER_SITE.url, SOCIAL_REGISTER_SITE.name)}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', width: '100%' }}
          aria-label="The Social Register Home"
        >
          {masthead ? (
            <img className="sr-masthead-img" src={masthead.src} alt="The Social Register" />
          ) : (
            <h1 style={{ fontFamily: 'var(--font-editorial-masthead)', fontSize: '2.4rem', margin: 0 }}>THE SOCIAL REGISTER</h1>
          )}
        </button>
        <div className="sr-header-meta">
          <span>HERITAGE ✦ SOCIETY ✦ CONTEMPORARY DISTINCTION</span>
          <span>•</span>
          <span>EIGHT REALMS · CYCLE {cycle}</span>
          <span>•</span>
          <span>ISSUE 01: BETWEEN TRADITION AND TOMORROW</span>
        </div>
      </header>

      <nav className="sr-dept-nav" aria-label="Social Register Departments">
        {SOCIAL_REGISTER_DEPARTMENTS.map(dept => (
          <button
            key={dept}
            type="button"
            aria-pressed={location.view === 'digital' && location.department === dept && !location.articleId}
            onClick={() => navigateTab(socialRegisterUrl({ department: dept }), `${dept} · ${SOCIAL_REGISTER_SITE.name}`)}
          >
            {dept}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={location.view === 'issue-01'}
          onClick={() => navigateTab(socialRegisterUrl({ view: 'issue-01' }), `Issue 01 · ${SOCIAL_REGISTER_SITE.name}`)}
        >
          <BookOpen size={13} style={{ display: 'inline', marginRight: 4 }} /> Collectible Issue 01
        </button>
      </nav>

      <div className="sr-body">
        {notice && (
          <div
            role="status"
            style={{
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: '#FAF6F8',
              border: '1px solid #C6AE73',
              color: '#48293D',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}
          >
            <span>✦ {notice}</span>
            <button type="button" className="sr-outline-btn" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}

        {location.view === 'issue-01' ? (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" className="sr-outline-btn" onClick={() => navigateTab(SOCIAL_REGISTER_SITE.url, SOCIAL_REGISTER_SITE.name)}>
                <ArrowLeft size={13} style={{ display: 'inline', marginRight: 4 }} /> Back to Continuous Digital Edition
              </button>
            </div>
            <CollectibleIssueReader
              issue={issue01}
              onSaveIssueToFylo={handleSaveIssuePdf}
              onSaveIcsEvent={handleSaveIcs}
              onCiteLead={handleCiteLead}
            />
          </>
        ) : activeArticle ? (
          <article style={{ maxWidth: 780, margin: '0 auto', background: '#FFFFFF', padding: '2rem', border: '1.5px solid #C6AE73', borderRadius: '10px' }}>
            <button
              type="button"
              className="sr-outline-btn"
              onClick={() => navigateTab(socialRegisterUrl({ department: activeArticle.department }), SOCIAL_REGISTER_SITE.name)}
            >
              <ArrowLeft size={13} style={{ display: 'inline', marginRight: 4 }} /> Back to {activeArticle.department}
            </button>

            <div style={{ marginTop: '1.1rem', fontSize: '0.76rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#48293D', fontWeight: 700 }}>
              {activeArticle.department} · CYCLE {activeArticle.cycle}
            </div>
            <h1 style={{ fontFamily: 'var(--font-editorial-masthead)', fontSize: '2.2rem', lineHeight: 1.15, margin: '0.4rem 0', color: '#241620' }}>
              {activeArticle.headline}
            </h1>
            <p style={{ fontSize: '1.12rem', fontStyle: 'italic', color: '#45304D', margin: '0 0 0.75rem' }}>{activeArticle.deck}</p>
            <div style={{ fontSize: '0.82rem', color: '#636D79', borderBottom: '1px solid #D8C0CB', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              {activeArticle.byline}
            </div>

            {(() => {
              const media = resolveEntityMediaSlot({
                assetId: activeArticle.assetId,
                entityId: activeArticle.entityId,
                brandKitId: 'the-social-register',
                fallbackLabel: activeArticle.headline,
              });
              return (
                media.src && (
                  <figure style={{ margin: '0 0 1.25rem' }}>
                    <img
                      src={media.src}
                      alt={media.caption}
                      style={{ width: '100%', maxHeight: '340px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #C6AE73' }}
                    />
                    <figcaption style={{ fontSize: '0.76rem', color: '#636D79', marginTop: '0.35rem' }}>{media.caption}</figcaption>
                  </figure>
                )
              );
            })()}

            {activeArticle.pullQuote && (
              <blockquote
                style={{
                  margin: '1.1rem 0',
                  padding: '0.75rem 1.1rem',
                  borderLeft: '3px solid #C6AE73',
                  background: '#FAF6F8',
                  fontFamily: 'var(--font-editorial-heritage)',
                  fontStyle: 'italic',
                  fontSize: '1.08rem',
                }}
              >
                “{activeArticle.pullQuote}”
              </blockquote>
            )}

            <div style={{ fontSize: '1.04rem', lineHeight: 1.75 }}>
              {activeArticle.body.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            <footer style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #D8C0CB' }}>
              <button type="button" className="sr-outline-btn" onClick={() => handleCiteLead(activeArticle.headline, activeArticle.deck, activeArticle.cycle)}>
                <FilePlus2 size={13} style={{ display: 'inline', marginRight: 4 }} /> Save Clipping & Cite Lead
              </button>
              {activeArticle.calendarEvent && (
                <button
                  type="button"
                  className="sr-gold-btn"
                  onClick={() =>
                    handleSaveIcs(
                      activeArticle.calendarEvent!.title,
                      `${activeArticle.calendarEvent!.venue} — ${activeArticle.calendarEvent!.cycleNote}`,
                    )
                  }
                >
                  <CalendarPlus size={13} style={{ display: 'inline', marginRight: 4 }} /> Add to Calendar (.ics)
                </button>
              )}
            </footer>
          </article>
        ) : (
          <>
            <div className="sr-issue-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {monogram && <img src={monogram.src} alt="" aria-hidden="true" style={{ width: 58, height: 58 }} />}
                <div>
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D8C0CB' }}>
                    COLLECTIBLE MONTHLY FOLIO · ISSUE 01
                  </div>
                  <h2 style={{ margin: '0.15rem 0', fontFamily: 'var(--font-editorial-masthead)', fontSize: '1.55rem' }}>
                    “Between Tradition and Tomorrow”
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#EAD8E0' }}>
                    Turn pages through The Courts, Vivienne Rose’s Interview, Glassline & Elmore Residences, and Maison Seraphine’s autumn study.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                <button type="button" className="sr-gold-btn" onClick={() => navigateTab(socialRegisterUrl({ view: 'issue-01' }), `Issue 01 · ${SOCIAL_REGISTER_SITE.name}`)}>
                  <Sparkles size={13} style={{ display: 'inline', marginRight: 4 }} /> Open Page-Turning Issue 01
                </button>
                <button type="button" className="sr-outline-btn" onClick={() => handleSaveIssuePdf(issue01)}>
                  <Download size={13} style={{ display: 'inline', marginRight: 4 }} /> Save .pdf to Fylo
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.15rem' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-editorial-masthead)', fontSize: '1.5rem', color: '#48293D' }}>
                {location.department === 'All Departments' ? 'Latest Across All Ten Departments' : location.department}
              </h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  navigateTab(socialRegisterUrl({ department: location.department, query: searchInput }));
                }}
                style={{ display: 'flex', gap: '0.4rem' }}
              >
                <input
                  type="search"
                  aria-label="Search The Social Register"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search departments, houses, salons…"
                  style={{ padding: '0.38rem 0.75rem', borderRadius: '9999px', border: '1px solid #C6AE73', fontSize: '0.84rem' }}
                />
                <button type="submit" className="sr-outline-btn">
                  <Search size={13} style={{ display: 'inline', marginRight: 4 }} /> Search
                </button>
              </form>
            </div>

            <div className="sr-grid">
              {filtered.map(item => (
                <MediaTemplateRenderer
                  key={item.id}
                  artifact={toSocialRegisterArtifact(item)}
                  adaptiveHorizontal={false}
                  actions={
                    <button
                      type="button"
                      className="sr-outline-btn"
                      onClick={() => navigateTab(socialRegisterUrl({ articleId: item.id }), `${item.headline} · ${SOCIAL_REGISTER_SITE.name}`)}
                    >
                      Read Feature <span className="mira-sr-only">about {item.headline}</span>
                    </button>
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
