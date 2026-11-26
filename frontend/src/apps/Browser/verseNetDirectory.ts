import { BROWSER_HOME, IN_GAME_PORTALS, type InGamePortal } from './browserModel';
import { INTERACTIVE_SITES } from './interactiveSites';
import { ENTERTAINMENT_SITES } from './entertainment/entertainmentRouter';

export const DIRECTORY_CATEGORIES = [
  ['all', 'All websites'],
  ['arts', 'Arts and entertainment'],
  ['education', 'Education'],
  ['services', 'Public services'],
  ['community', 'Culture and community'],
  ['tools', 'Everyday tools'],
] as const;

export type DirectoryCategory = typeof DIRECTORY_CATEGORIES[number][0];
const entertainmentHosts = new Set(ENTERTAINMENT_SITES.map(site => site.domain));

function categoryFor(site: InGamePortal): DirectoryCategory {
  if (entertainmentHosts.has(site.domain)) return 'arts';
  if (site.badge === 'ACADEMIC') return 'education';
  if (['GOV', 'DEEDS', 'HEALTH', 'SECURE', 'CIVIC'].includes(site.badge)) return 'services';
  if (['NEWS', 'ARCHIVE', 'SOCIAL'].includes(site.badge)) return 'community';
  return 'tools';
}

export const PUBLIC_DIRECTORY = [
  ...IN_GAME_PORTALS.filter(site => site.badge !== 'ONION').map(site => ({
    domain: site.domain, url: site.url, name: site.name, description: site.description, category: categoryFor(site),
  })),
  ...INTERACTIVE_SITES.map(site => ({
    domain: site.domain, url: 'https://' + site.domain, name: site.name, description: site.description, category: 'community' as const,
  })),
  { domain: 'bank.aure', url: 'https://bank.aure', name: 'Personal Treasury', description: 'View your accounts and transaction history.', category: 'tools' as const },
  { domain: 'worknet.aure', url: 'https://worknet.aure', name: 'WorkNet', description: 'Find the installed workspace for careers, jobs, and contracts.', category: 'tools' as const },
  { domain: 'questnotice.mer', url: 'https://questnotice.mer', name: 'QuestNotice', description: 'Browse notices and local opportunities.', category: 'services' as const },
].filter((site, index, sites) => sites.findIndex(other => other.domain === site.domain) === index)
  .sort((a, b) => a.name.localeCompare(b.name));

export function directoryURL(category: DirectoryCategory = 'all', filter = '') {
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (filter.trim()) params.set('q', filter.trim());
  return BROWSER_HOME + '/directory' + (params.size ? '?' + params : '');
}

export function directoryView(params: URLSearchParams) {
  const category = DIRECTORY_CATEGORIES.find(([id]) => id === params.get('category'))?.[0] ?? 'all';
  const filter = (params.get('q') ?? '').slice(0, 200);
  const needle = filter.trim().toLowerCase();
  return { category, filter, matches: PUBLIC_DIRECTORY.filter(site =>
    (category === 'all' || category === site.category) &&
    [site.name, site.domain, site.description].some(value => value.toLowerCase().includes(needle))) };
}
