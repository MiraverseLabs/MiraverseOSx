import { NEWS_SITE, isMeridianHost } from './news/newsSite';
import { SOCIAL_REGISTER_SITE } from './publications/socialRegisterModel';
import { eduPageTitle } from './edu/eduRouter';
import { faithMedPageTitle } from './medical/faithMedRouter';
import { ENTERTAINMENT_SITES, entertainmentPageTitle } from './entertainment/entertainmentRouter';
import { portalPageTitle } from './portalRouter';
export const BROWSER_HOME = 'https://versenet.aure';
export const MAX_BROWSER_TABS = 8;

export interface InGamePortal {
  id: string;
  name: string;
  domain: string;
  url: string;
  category: string;
  description: string;
  badge: 'SUITE' | 'SECURE' | 'GOV' | 'HEALTH' | 'CARGO' | 'ONION' | 'ACADEMIC' | 'DEEDS' | 'ARCHIVE' | 'SOCIAL' | 'CIVIC' | 'NEWS';
}

export const IN_GAME_PORTALS: InGamePortal[] = [
  { id: 'cyberium', name: 'Cyberium Academy', domain: 'cyberium.edu', url: 'https://cyberium.edu', category: 'Academic Research', description: 'Cybernetics, spell engineering, and signal systems. Polytechnic admissions, Compiler Lab 4, and academic transcripts.', badge: 'ACADEMIC' },
  { id: 'dawn', name: 'Dawn University', domain: 'dawn.edu', url: 'https://dawn.edu', category: 'Academic Research', description: 'Collegiate university in Dawnson, Aureline: civic studies, natural sciences, and arcane humanities.', badge: 'ACADEMIC' },
  { id: 'regent', name: 'Regent Hall', domain: 'regenthall.edu', url: 'https://regenthall.edu', category: 'Academic Research', description: 'Royal education across all eight realms, sovereign diplomacy, and the exclusive Empress Track.', badge: 'ACADEMIC' },
  { 
    id: 'auresuite', 
    name: 'AureSuite Cloud', 
    domain: 'auresuite.aure', 
    url: 'https://auresuite.aure', 
    category: 'Cloud Productivity', 
    description: 'Unified Mailbox, Cloud Drive, Live AI Chat, 7 Realms Radar & Cipher Decryptor.', 
    badge: 'SUITE' 
  },
  { 
    id: 'dga', 
    name: 'Directorate of Global Affairs', 
    domain: 'dga.gov.aure', 
    url: 'https://dga.gov.aure', 
    category: 'Civic Governance', 
    description: 'Citizen clearance registry lookup, executive directives, active warrants, and security cipher gate.', 
    badge: 'GOV' 
  },
  { 
    id: 'faithmed', 
    name: 'Faith Medical Group', 
    domain: 'faithmed.aure', 
    url: 'https://faithmed.aure', 
    category: 'Healthcare & Telemetry', 
    description: 'Bio-aura baseline diagnostic scans, inpatient care triage, and treatment protocols.', 
    badge: 'HEALTH' 
  },
  { 
    id: 'shipping', 
    name: 'CargoTrack Logistics', 
    domain: 'shipping.aure', 
    url: 'https://shipping.aure', 
    category: 'Freight & Waybills', 
    description: 'Consignment manifest lookup, cargo tracking, and route discrepancy audit (#CG-8821).', 
    badge: 'CARGO' 
  },
  { 
    id: 'vectornet', 
    name: 'VectorNet Underground', 
    domain: 'vectornet.aure', 
    url: 'https://vectornet.aure', 
    category: 'DarkNet Onion Relay', 
    description: 'Encrypted onion route, classified intel broker market, and interactive hacker terminal.', 
    badge: 'ONION' 
  },
  { 
    id: 'records', 
    name: 'Orynvell Public Records', 
    domain: 'records.orynvell.gov', 
    url: 'https://records.orynvell.gov', 
    category: 'Property & Deeds', 
    description: 'Classified property deeds and Subterranean Conduit Sector 7 alignment filings.', 
    badge: 'DEEDS' 
  },
  { 
    id: 'royalhistory', 
    name: 'Royal Historic Society', 
    domain: 'royalhistory.mer', 
    url: 'https://royalhistory.mer', 
    category: 'Dynastic Archives', 
    description: 'Restricted succession codices and pre-Collapse Council charters of succession.', 
    badge: 'ARCHIVE' 
  },
  { 
    id: 'speciesregistry', 
    name: 'Meridion Species Registry', 
    domain: 'species.mer', 
    url: 'https://species.mer', 
    category: 'Natural & Supernatural Archive', 
    description: 'Illustrated Eight Realms encyclopedia of biological species, elemental humans, angelic choirs, magical disciplines, and wildlife.', 
    badge: 'ARCHIVE' 
  },
  { 
    id: 'maispace', 
    name: 'MAI Space Social', 
    domain: 'mai.space', 
    url: 'https://mai.space', 
    category: 'Citizen Social Network', 
    description: 'Decentralized citizen social network, public timelines, profiles, and community dispatches.', 
    badge: 'SOCIAL' 
  },
  { 
    id: 'civinet', 
    name: 'Citizen Hub (CIVINET)', 
    domain: 'civinet.mer', 
    url: 'https://civinet.mer', 
    category: 'Municipal Services', 
    description: 'Personal civic identity, services desk, and residence records.', 
    badge: 'CIVIC' 
  },
  { id: 'meridian', name: NEWS_SITE.name, domain: NEWS_SITE.domain, url: NEWS_SITE.url,
    category: 'News & Public Affairs', description: 'Flagship daily newspaper across all Eight Realms (incorporating The Meridion Dispatch), ten desks, and collectible cycle editions.', badge: 'NEWS' },
  { id: 'socialregister', name: SOCIAL_REGISTER_SITE.name, domain: SOCIAL_REGISTER_SITE.domain, url: SOCIAL_REGISTER_SITE.url,
    category: 'Society & Culture Magazine', description: 'Flagship society magazine featuring The Courts, Style, The Interview, Residences, Heritage, and Issue 01 ("Between Tradition and Tomorrow").', badge: 'NEWS' },
  ...ENTERTAINMENT_SITES.map(site => ({
    id: site.orgId.toLowerCase().replace(/^org_/, ''),
    name: site.name,
    domain: site.domain,
    url: site.url,
    category: `Entertainment · ${site.sector}`,
    description: `${site.tagline} ${site.description}`,
    badge: (site.archetype === 'limelight' || site.archetype === 'popsticker' ? 'NEWS' : 'SOCIAL') as InGamePortal['badge'],
  })),
];

export const STARTER_SITES = IN_GAME_PORTALS.slice(0, 5);

export interface BrowserTab { id: number; url: string; title: string; groupId?: string }
export interface BrowserTabGroup { id: string; name: string }
export interface TabHistory { stack: string[]; index: number }
export interface BrowserVisit { url: string; title: string; visitedAt: number }
export interface BrowserBookmark { url: string; title: string }
export interface BrowserState {
  tabs: BrowserTab[]; 
  groups: BrowserTabGroup[];
  activeTabId: number; 
  nextTabId: number;
  historyMap: Record<number, TabHistory>;
  visits: BrowserVisit[]; 
  bookmarks: BrowserBookmark[];
}

// Resolve addresses without executing schemes. External destinations first show an explicit gateway.
export function resolveBrowserInput(input: string): string {
  const value = input.trim();
  if (!value) return BROWSER_HOME;
  if (!/\s/.test(value) && (/^https?:\/\//i.test(value) || /^[\w-]+(?:\.[\w-]+)+(?:[/?#].*)?$/.test(value))) {
    try { 
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); 
      if (!url.username && !url.password) return url.href.replace(/\/$/, ''); 
    } catch { /* Treat malformed addresses as a search. */ }
  }
  return `${BROWSER_HOME}/find?q=${encodeURIComponent(value)}`;
}

export function browserTitle(url: string): string {
  try {
    const parsed = new URL(url);
    if (isMeridianHost(parsed.hostname)) return parsed.pathname === '/saved' ? `Saved stories · ${NEWS_SITE.name}` : parsed.pathname.startsWith('/article/') ? `Article · ${NEWS_SITE.name}` : NEWS_SITE.name;
    if ([SOCIAL_REGISTER_SITE.domain, ...SOCIAL_REGISTER_SITE.altDomains].includes(parsed.hostname as any)) return parsed.pathname === '/issue/01' ? `Issue 01 · ${SOCIAL_REGISTER_SITE.name}` : SOCIAL_REGISTER_SITE.name;
    const eduTitle = eduPageTitle(url);
    if (eduTitle) return eduTitle;
    const medTitle = faithMedPageTitle(url);
    if (medTitle) return medTitle;
    const entTitle = entertainmentPageTitle(url);
    if (entTitle) return entTitle;
    const portalTitle = portalPageTitle(url);
    if (portalTitle) return portalTitle;
    const siteNames: Record<string, string> = { 
      'companion.aure': 'Aureline Companion', 
      'gardenreview.aure': 'Glassline Garden Review', 
      'readingroom.aure': 'Aureline Open Reading Room',
      'auresuite.aure': 'AureSuite Cloud',
      'dga.gov.aure': 'Directorate of Global Affairs',
      'dga.gov': 'Directorate of Global Affairs',
      'faithmed.aure': 'Faith Medical Group',
      'worknet.aure': 'WorkNet',
      'bank.aure': 'Personal Treasury',
      'shipping.aure': 'CargoTrack Logistics',
      'vectornet.aure': 'VectorNet Underground',
      'records.orynvell.gov': 'Orynvell Public Records',
      'royalhistory.mer': 'Royal Historic Society',
      'species.mer': 'Meridion Species Registry',
      'species.aure': 'Meridion Species Registry',
      'mai.space': 'MAI Space Social',
      'civinet.mer': 'Citizen Hub',
      'civinet.aure': 'Citizen Hub'
    };
    if (siteNames[parsed.hostname]) {
      const section = parsed.pathname.startsWith('/records/') 
        ? parsed.pathname.split('/')[2] 
        : ({ '/profile': 'My profile', '/request': 'Request', '/records': 'My records' }[parsed.pathname] || '');
      const name = parsed.hostname === 'faithmed.aure' ? 'Faith Medical' : siteNames[parsed.hostname];
      return section ? `${section} · ${name}` : name;
    }
    if (parsed.hostname === 'fieldnotes.aure') return parsed.searchParams.get('title')?.slice(0, 200) || 'Fieldnotes · Public reading';
    if (['versenet.aure', 'search.aure', 'versenet'].includes(parsed.hostname)) return parsed.pathname === '/find' ? `${parsed.searchParams.get('q') || 'Search'} — VerseNet` : ({ '/directory': 'Directory · VerseNet', '/culture': 'Arts and culture · VerseNet', '/reading': 'Reading · VerseNet' }[parsed.pathname.replace(/\/$/, '')] || 'Home');
    const portal = IN_GAME_PORTALS.find(site => site.domain === parsed.hostname);
    return portal?.name || parsed.hostname;
  } catch { return 'VerseNet'; }
}

export function initialBrowserState(): BrowserState {
  return { 
    tabs: [{ id: 1, url: BROWSER_HOME, title: browserTitle(BROWSER_HOME) }],
    groups: [],
    activeTabId: 1, 
    nextTabId: 2, 
    historyMap: { 1: { stack: [BROWSER_HOME], index: 0 } }, 
    visits: [], 
    bookmarks: []
  };
}

export function recordBrowserVisit(state: BrowserState, url: string): BrowserVisit[] {
  return [{ url, title: browserTitle(url), visitedAt: Date.now() }, ...state.visits.filter(visit => visit.url !== url)].slice(0, 150);
}

// Ordinary tabs belong to the current session. A fresh session keeps saved groups,
// bookmarks and visit history, and always selects a separate homepage tab.
export function restartBrowserSession(state: BrowserState): BrowserState {
  const groups = state.groups || [];
  const tabs = state.tabs.filter(tab => tab.groupId && groups.some(group => group.id === tab.groupId)).slice(0, MAX_BROWSER_TABS - 1);
  let homeId = 1;
  while (tabs.some(tab => tab.id === homeId)) homeId++;
  const home: BrowserTab = { id: homeId, url: BROWSER_HOME, title: browserTitle(BROWSER_HOME) };
  const historyMap: Record<number, TabHistory> = { [homeId]: { stack: [BROWSER_HOME], index: 0 } };
  for (const tab of tabs) historyMap[tab.id] = state.historyMap[tab.id] || { stack: [tab.url], index: 0 };
  return { ...state, groups, tabs: [home, ...tabs], activeTabId: homeId, historyMap, nextTabId: Math.max(state.nextTabId, homeId + 1) };
}

export function restoreBrowserState(saved: unknown): BrowserState {
  const defaults = initialBrowserState();
  if (!saved || typeof saved !== 'object') return defaults;
  const data = saved as Partial<BrowserState>;
  const cleanItems = (items: unknown) => Array.isArray(items) 
    ? items.filter(item => item && typeof item.url === 'string')
        .map(item => ({ ...item, url: resolveBrowserInput(item.url), title: browserTitle(resolveBrowserInput(item.url)) }))
        .filter((item, index, all) => all.findIndex(other => other.url === item.url) === index) 
    : [];

  const bookmarks = cleanItems(data.bookmarks).slice(0, 100);
  const visits = cleanItems(data.visits).filter(item => Number.isFinite(item.visitedAt)).slice(0, 150);
  const groups: BrowserTabGroup[] = [];
  for (const group of Array.isArray(data.groups) ? data.groups : []) {
    if (!group || typeof group.id !== 'string' || !/^group-[a-z0-9-]{1,80}$/i.test(group.id) || typeof group.name !== 'string' || !group.name.trim() || groups.some(item => item.id === group.id)) continue;
    groups.push({ id: group.id, name: group.name.trim().slice(0, 40) });
    if (groups.length === 20) break;
  }
  const tabs: BrowserTab[] = [];
  for (const tab of Array.isArray(data.tabs) ? data.tabs : []) {
    if (!tab || !Number.isSafeInteger(tab.id) || tab.id <= 0 || tab.id >= Number.MAX_SAFE_INTEGER - 1 || typeof tab.url !== 'string' || tabs.some(other => other.id === tab.id)) continue;
    const url = resolveBrowserInput(tab.url);
    const defaultTitle = browserTitle(url);
    const title = defaultTitle === 'Home' || typeof tab.title !== 'string' || !tab.title.trim()
      ? defaultTitle
      : tab.title.slice(0, 200);
    tabs.push({ id: tab.id, url, title, ...(groups.some(group => group.id === tab.groupId) ? { groupId: tab.groupId } : {}) });
    if (tabs.length === MAX_BROWSER_TABS) break;
  }
  if (!tabs.length) tabs.push(...defaults.tabs);
  const historyMap: Record<number, TabHistory> = {};
  for (const tab of tabs) {
    const raw = data.historyMap && Object.hasOwn(data.historyMap, tab.id) ? data.historyMap[tab.id] : undefined;
    const stack = Array.isArray(raw?.stack) ? raw.stack.filter(value => typeof value === 'string').slice(-100).map(resolveBrowserInput) : [];
    const index = Number.isInteger(raw?.index) ? Math.max(0, Math.min(stack.length - 1, raw.index)) : stack.length - 1;
    historyMap[tab.id] = stack.length && stack[index] === tab.url ? { stack, index } : { stack: [tab.url], index: 0 };
  }
  const minimumNext = Math.max(...tabs.map(tab => tab.id)) + 1;
  return restartBrowserSession({ tabs, groups, historyMap, bookmarks, visits,
    activeTabId: tabs.some(tab => tab.id === data.activeTabId) ? data.activeTabId! : tabs[0].id,
    nextTabId: Number.isSafeInteger(data.nextTabId) && data.nextTabId! >= minimumNext ? data.nextTabId! : minimumNext,
  });
}
