import { NEWS_SECTIONS, buildNewsEdition, buildMeridianExpandedEdition, type NewsSection } from './newsModel.ts';

export const NEWS_SITE = {
  name: 'The Meridian',
  legacyName: 'The Meridion Dispatch',
  domain: 'meridian.mer',
  legacyDomain: 'dispatch.mer',
  url: 'https://meridian.mer',
} as const;

export interface NewsLocation {
  section: NewsSection;
  query: string;
  savedOnly: boolean;
  articleId: string | null;
  valid: boolean;
}

const slug = (section: NewsSection) => section.toLowerCase().replaceAll(' ', '-');
const sectionFor = (value: string | null) => NEWS_SECTIONS.find(section => slug(section) === value);

export function isMeridianHost(hostname: string): boolean {
  return hostname === NEWS_SITE.domain || hostname === NEWS_SITE.legacyDomain;
}

export function newsUrl(input: Partial<NewsLocation> = {}): string {
  const section = input.section || 'All news';
  const url = new URL(NEWS_SITE.url);
  if (input.articleId) url.pathname = `/article/${encodeURIComponent(input.articleId)}`;
  else if (input.savedOnly) url.pathname = '/saved';
  else if (section !== 'All news') url.pathname = `/section/${slug(section)}`;
  if ((input.articleId || input.savedOnly) && section !== 'All news') url.searchParams.set('section', slug(section));
  if (input.articleId && input.savedOnly) url.searchParams.set('saved', '1');
  if (input.query) url.searchParams.set('q', input.query);
  return url.href.replace(/\/$/, '');
}

export function parseNewsLocation(input: string): NewsLocation {
  const result: NewsLocation = { section: 'All news', query: '', savedOnly: false, articleId: null, valid: false };
  try {
    const url = new URL(input);
    if (!isMeridianHost(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return result;
    const path = url.pathname.replace(/\/$/, '') || '/';
    result.query = url.searchParams.get('q') || '';
    const contextSection = url.searchParams.get('section');
    if (contextSection && !sectionFor(contextSection)) return result;
    result.section = sectionFor(contextSection) || 'All news';
    if (path === '/') result.valid = true;
    else if (path === '/saved') {
      result.savedOnly = true;
      result.valid = true;
    } else if (/^\/section\/[^/]+$/.test(path)) {
      const section = sectionFor(path.split('/')[2]);
      if (section) {
        result.section = section;
        result.valid = true;
      }
    } else if (/^\/article\/[^/]+$/.test(path)) {
      result.articleId = decodeURIComponent(path.split('/')[2]);
      result.savedOnly = url.searchParams.get('saved') === '1';
      result.valid = true;
    }
  } catch {
    /* Unrecognized addresses stay on the publication's unavailable page. */
  }
  return result;
}

export function newsSearchRecords(input: { cycle?: number; corruption?: number; publications?: unknown; publishedArtifacts?: any[] }) {
  return (input.publishedArtifacts ? buildMeridianExpandedEdition(input) : buildNewsEdition(input)).map(article => ({
    id: `news:${article.id}`,
    type: 'site',
    title: article.headline,
    summary: article.summary,
    publisher: NEWS_SITE.name,
    url: newsUrl({ articleId: article.id }),
  }));
}
