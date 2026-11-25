import React, { useEffect, useRef, useState } from 'react';
import { useWorldMedia } from './useWorldMedia';
import { ChevronLeft, ChevronRight, Download, FilePlus2, CalendarPlus, ShieldCheck } from 'lucide-react';
import {
  brandKitCssVariables,
  getBrandKit,
  getMediaAssetById,
  resolveEntityMediaSlot,
} from '../../game-content/worldAssetLibrary';
import {
  verificationBadgeLabel,
  type CollectibleIssue,
  type PublishedMediaArtifact,
} from './templateModel';
import './media-templates.css';

interface AccessibleCarouselProps {
  label: string;
  slideLabels: string[];
  children: React.ReactNode[];
}

export function AccessibleSnapCarousel({ label, slideLabels, children }: AccessibleCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const count = children.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;

    let rafId = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const supportsScrollEnd = 'onscrollend' in window;

    const nearestIndex = () => {
      const width = Math.max(1, track.clientWidth);
      return Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / width)));
    };

    const onScroll = () => {
      if (pendingRef.current !== null) return;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const idx = nearestIndex();
        setActiveIndex(prev => (prev === idx ? prev : idx));
      });
      if (!supportsScrollEnd) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(onSettle, 140);
      }
    };

    const onSettle = () => {
      const idx = nearestIndex();
      pendingRef.current = null;
      setActiveIndex(idx);
      if (idx !== settledRef.current) {
        settledRef.current = idx;
        setAnnouncement(`Slide ${idx + 1} of ${count}: ${slideLabels[idx] || ''}`);
      }
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) track.addEventListener('scrollend', onSettle as EventListener);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(debounceTimer);
      track.removeEventListener('scroll', onScroll);
      if (supportsScrollEnd) track.removeEventListener('scrollend', onSettle as EventListener);
    };
  }, [count, slideLabels]);

  const scrollToSlide = (targetIdx: number) => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const bounded = ((targetIdx % count) + count) % count;
    pendingRef.current = bounded;
    setActiveIndex(bounded);
    const slideEl = track.children[bounded] as HTMLElement | undefined;
    if (slideEl) {
      const offset = slideEl.offsetLeft - track.scrollLeft;
      const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      track.scrollBy({ left: offset, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  return (
    <section className="mira-carousel" aria-roledescription="carousel" aria-label={label}>
      {count > 1 && (
        <div className="mira-carousel-controls">
          <button type="button" className="mira-carousel-btn" onClick={() => scrollToSlide((pendingRef.current ?? activeIndex) - 1)}>
            <ChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Previous
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {activeIndex + 1} / {count} · {slideLabels[activeIndex] || ''}
          </span>
          <button type="button" className="mira-carousel-btn" onClick={() => scrollToSlide((pendingRef.current ?? activeIndex) + 1)}>
            Next <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </div>
      )}

      <div ref={trackRef} className="mira-carousel-track" tabIndex={0} role="group" aria-label="Slides">
        {React.Children.map(children, (child, idx) => (
          <div
            key={idx}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${count}`}
            data-marker-name={slideLabels[idx] || `Go to slide ${idx + 1}`}
          >
            {child}
          </div>
        ))}
      </div>

      <p className="mira-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {count > 1 && (
        <nav className="mira-carousel-markers" aria-label="Choose a slide">
          {slideLabels.map((name, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to ${name}`}
              aria-current={activeIndex === idx ? 'true' : undefined}
              onClick={() => scrollToSlide(idx)}
            >
              {idx + 1}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}

interface MediaTemplateRendererProps {
  artifact: PublishedMediaArtifact;
  density?: 'compact' | 'comfortable' | 'spacious';
  adaptiveHorizontal?: boolean;
  pollVotes?: Record<number, number>;
  selectedPollIndex?: number | null;
  onVotePoll?: (optionIndex: number) => void;
  actions?: React.ReactNode;
}

export function MediaTemplateRenderer({
  artifact,
  density = 'comfortable',
  adaptiveHorizontal = true,
  pollVotes,
  selectedPollIndex,
  onVotePoll,
  actions,
}: MediaTemplateRendererProps) {
  useWorldMedia();
  const [failedMediaSource, setFailedMediaSource] = useState<string | null>(null);
  const kit = getBrandKit(artifact.brandKitId);
  const cssVars = brandKitCssVariables(artifact.brandKitId, artifact.tokenOverrides) as React.CSSProperties;
  const { slotValues } = artifact;
  const dividerAsset = getMediaAssetById(kit.assets.divider);

  const hasVisualSlot = Boolean(
    slotValues.imageAssetId ||
      slotValues.primaryEntityId ||
      ['tpl-social-personal-photo', 'tpl-social-breaking-news', 'tpl-social-article-promo', 'tpl-social-event-promotion', 'tpl-social-product-ad', 'tpl-mag-cover', 'tpl-news-front-page'].includes(
        artifact.templateId,
      ),
  );

  const candidateMedia = hasVisualSlot
    ? resolveEntityMediaSlot({
        assetId: slotValues.imageAssetId,
        entityId: slotValues.primaryEntityId || artifact.entityRefs[0],
        brandKitId: artifact.brandKitId,
        fallbackLabel: slotValues.headline,
      })
    : null;

  const resolvedMedia = candidateMedia?.src && failedMediaSource === candidateMedia.src
    ? { ...candidateMedia, mode: 'typographic_fallback', src: undefined }
    : candidateMedia;
  return (
    <div className="mira-tpl-host" data-density={density} style={{ ...cssVars, ['--density' as any]: density }}>
      <article className={`mira-tpl-card ${adaptiveHorizontal ? 'mira-tpl-adapt' : ''}`}>
        {/* Region 1: Media (direct <img> or .media hero per modern card guidelines) */}
        {resolvedMedia &&
          (resolvedMedia.mode === 'exact_slot' || resolvedMedia.mode === 'entity_primary' ? (
            <img src={resolvedMedia.src} alt={resolvedMedia.caption} loading="lazy" onError={() => setFailedMediaSource(resolvedMedia.src || null)} />
          ) : (
            <div className="media">
              {resolvedMedia.src ? (
                <img src={resolvedMedia.src} alt="" aria-hidden="true" onError={() => setFailedMediaSource(resolvedMedia.src || null)} />
              ) : (
                <div className="mira-tpl-monogram-badge" aria-hidden="true">
                  {resolvedMedia.monogramText}
                </div>
              )}
              <small style={{ opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
                {kit.name}
              </small>
            </div>
          ))}

        {/* Region 2: Header */}
        <header>
          <div className="mira-tpl-kicker">
            <span className="mira-tpl-kicker-pill">{slotValues.kicker || kit.name}</span>
            {slotValues.issueDate && <span>{slotValues.issueDate}</span>}
          </div>
          <h3 className="mira-tpl-headline">{slotValues.headline}</h3>
          {slotValues.subhead && <p className="mira-tpl-subhead">{slotValues.subhead}</p>}
          {slotValues.dateLocation && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', fontWeight: 600 }}>✦ {slotValues.dateLocation}</p>
          )}
        </header>

        {/* Region 3: Content */}
        <div>
          {Array.isArray(slotValues.slides) && slotValues.slides.length > 0 && (
            <AccessibleSnapCarousel
              label={slotValues.headline}
              slideLabels={slotValues.slides.map((s, i) => s.headline || `Slide ${i + 1}`)}
            >
              {slotValues.slides.map(slide => {
                const slideMedia = resolveEntityMediaSlot({
                  assetId: slide.assetId,
                  entityId: slide.entityId,
                  brandKitId: artifact.brandKitId,
                  fallbackLabel: slide.headline,
                });
                return (
                  <div
                    key={slide.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: 'var(--mk-bg-elevated)',
                      border: '1px solid var(--mk-border-ornament)',
                    }}
                  >
                    {slideMedia.src && (
                      <img
                        src={slideMedia.src}
                        alt={slideMedia.caption}
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.6rem' }}
                      />
                    )}
                    <strong style={{ display: 'block', fontFamily: 'var(--mk-font-display)', fontSize: '1.05rem' }}>
                      {slide.headline}
                    </strong>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem' }}>{slide.caption}</p>
                  </div>
                );
              })}
            </AccessibleSnapCarousel>
          )}

          {slotValues.pullQuote && <blockquote className="mira-tpl-quote">“{slotValues.pullQuote}”</blockquote>}

          {slotValues.body && (
            <div style={{ fontSize: '0.93rem', lineHeight: 1.62 }}>
              {slotValues.body
                .split(/\n+/)
                .slice(0, 4)
                .map((para, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : '0.55rem 0 0' }}>
                    {para}
                  </p>
                ))}
            </div>
          )}

          {Array.isArray(slotValues.coverLines) && slotValues.coverLines.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
              {slotValues.coverLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}

          {Array.isArray(slotValues.pollOptions) && slotValues.pollOptions.length > 0 && (
            <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
              {slotValues.pollOptions.map((opt, idx) => {
                const votes = pollVotes?.[idx] || 0;
                const chosen = selectedPollIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onVotePoll?.(idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '2px solid',
                      borderColor: chosen ? 'var(--mk-accent-primary)' : 'var(--mk-border-ornament)',
                      background: 'var(--mk-bg-elevated)',
                      color: 'var(--mk-text-primary)',
                      cursor: onVotePoll ? 'pointer' : 'default',
                      fontSize: '0.84rem',
                      textAlign: 'left',
                    }}
                  >
                    <span>{chosen ? `✓ ${opt}` : opt}</span>
                    <small>{votes} votes</small>
                  </button>
                );
              })}
            </div>
          )}

          {dividerAsset && (
            <img
              src={dividerAsset.src}
              alt=""
              aria-hidden="true"
              style={{ width: '180px', height: '18px', display: 'block', margin: '0.65rem auto 0', opacity: 0.85 }}
            />
          )}
        </div>

        {/* Region 4: Footer */}
        <footer className="mira-tpl-footer">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} />
            <strong>{verificationBadgeLabel(artifact.verificationTier)}</strong> · {slotValues.byline || `${artifact.authorName} · Cycle ${artifact.publishedCycle}`}
          </span>
          {actions && <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>{actions}</div>}
        </footer>
      </article>
    </div>
  );
}

interface CollectibleIssueReaderProps {
  issue: CollectibleIssue;
  onSaveIssueToFylo?: (issue: CollectibleIssue) => void;
  onSaveIcsEvent?: (title: string, details: string) => void;
  onCiteLead?: (headline: string, excerpt: string, pageNumber: number) => void;
}

export function CollectibleIssueReader({
  issue,
  onSaveIssueToFylo,
  onSaveIcsEvent,
  onCiteLead,
}: CollectibleIssueReaderProps) {
  useWorldMedia();
  const kit = getBrandKit(issue.brandKitId);
  const cssVars = brandKitCssVariables(issue.brandKitId) as React.CSSProperties;
  const masthead = getMediaAssetById(kit.assets.masthead);
  const crest = getMediaAssetById(kit.assets.crest || kit.assets.monogram);

  return (
    <div className="mira-tpl-host" style={{ ...cssVars, padding: '1rem', background: 'var(--mk-bg-elevated)', borderRadius: '12px', border: '1px solid var(--mk-border-ornament)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div>
          <span className="mira-tpl-kicker">{issue.issueNumber} · COLLECTIBLE PAGE-TURNING EDITION</span>
          <h2 style={{ margin: '0.15rem 0 0', fontFamily: 'var(--mk-font-display)', fontSize: '1.45rem' }}>
            {issue.title}: <em>{issue.theme}</em>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onSaveIssueToFylo && (
            <button type="button" className="mira-carousel-btn" onClick={() => onSaveIssueToFylo(issue)}>
              <Download size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Save Collectible .pdf to Fylo
            </button>
          )}
        </div>
      </div>

      <AccessibleSnapCarousel
        label={`${issue.title} ${issue.issueNumber}`}
        slideLabels={issue.pages.map(p => `P.${p.pageNumber} ${p.kicker}`)}
      >
        {issue.pages.map(page => {
          const media = resolveEntityMediaSlot({
            assetId: page.assetId,
            entityId: page.entityId,
            brandKitId: issue.brandKitId,
            fallbackLabel: page.headline,
          });
          const isCover = page.kind === 'cover';
          return (
            <article
              key={page.id}
              style={{
                minHeight: '440px',
                padding: '1.75rem',
                borderRadius: '10px',
                background: isCover ? 'var(--mk-bg-hero)' : 'var(--mk-bg-surface)',
                color: isCover ? 'var(--mk-text-inverse)' : 'var(--mk-text-primary)',
                border: '2px solid var(--mk-accent-primary)',
                display: 'grid',
                gap: '0.9rem',
                alignContent: 'space-between',
              }}
            >
              <div>
                {isCover && masthead && (
                  <img
                    src={masthead.src}
                    alt={kit.name}
                    style={{ width: '100%', maxHeight: '110px', objectFit: 'contain', marginBottom: '0.75rem', filter: issue.publicationId === 'the-social-register' ? 'brightness(1.85)' : 'invert(1) hue-rotate(180deg)' }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: isCover ? 'var(--mk-accent-secondary)' : 'var(--mk-accent-primary)' }}>
                  <span>{page.kicker}</span>
                  <span>Page {page.pageNumber} of {issue.pages.length}</span>
                </div>
                <h3 style={{ margin: '0.4rem 0 0', fontFamily: 'var(--mk-font-display)', fontSize: isCover ? '2.05rem' : '1.65rem', lineHeight: 1.15 }}>
                  {page.headline}
                </h3>
                {page.subhead && (
                  <p style={{ margin: '0.35rem 0 0', fontStyle: 'italic', opacity: 0.9, fontSize: '1rem' }}>{page.subhead}</p>
                )}
                {page.byline && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>{page.byline}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: media.src ? 'minmax(180px, 38%) 1fr' : '1fr', gap: '1.1rem', alignItems: 'start' }}>
                {media.src && (
                  <figure style={{ margin: 0 }}>
                    <img
                      src={media.src}
                      alt={media.caption}
                      style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--mk-accent-primary)' }}
                    />
                    <figcaption style={{ fontSize: '0.7rem', marginTop: '0.3rem', opacity: 0.8 }}>{media.caption}</figcaption>
                  </figure>
                )}
                <div style={{ fontSize: '0.95rem', lineHeight: 1.65, fontFamily: 'var(--mk-font-body)' }}>
                  {page.pullQuote && (
                    <blockquote className="mira-tpl-quote" style={{ color: 'var(--mk-text-primary)' }}>
                      “{page.pullQuote}”
                    </blockquote>
                  )}
                  {page.paragraphs.map((para, idx) => (
                    <p key={idx} style={{ margin: idx === 0 ? 0 : '0.6rem 0 0' }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(198,174,115,0.4)', paddingTop: '0.65rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {crest && <img src={crest.src} alt="" aria-hidden="true" style={{ width: 20, height: 20 }} />}
                  {page.adSponsor ? `Sponsored House Placement · ${page.adSponsor}` : `${issue.title} · ${issue.publishedLabel}`}
                </span>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {page.department === 'The Social Calendar' && onSaveIcsEvent && (
                    <button type="button" className="mira-carousel-btn" onClick={() => onSaveIcsEvent(page.headline, page.paragraphs.join('\n'))}>
                      <CalendarPlus size={12} style={{ display: 'inline', marginRight: 4 }} /> Save .ics Invite
                    </button>
                  )}
                  {page.kind !== 'advertisement' && onCiteLead && (
                    <button type="button" className="mira-carousel-btn" onClick={() => onCiteLead(page.headline, page.subhead || page.paragraphs[0] || '', page.pageNumber)}>
                      <FilePlus2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Clip / Cite Lead
                    </button>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
      </AccessibleSnapCarousel>
    </div>
  );
}
