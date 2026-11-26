import { WORLD_ORGANIZATIONS } from '../../../game-content/worldAssetLibrary';
import {
  SITE_ROUTE_CONFIGS,
  buildSiteUrl,
  getSiteRouteConfig,
  resolveSiteRoute,
  type ResolvedEntertainmentRoute,
  type RouteAccess,
  type SiteRouteConfig,
  type SiteRouteDef,
} from './routing/siteRoutes';

export {
  SITE_ROUTE_CONFIGS,
  buildSiteUrl,
  getSiteRouteConfig,
  resolveSiteRoute,
  type ResolvedEntertainmentRoute,
  type RouteAccess,
  type SiteRouteConfig,
  type SiteRouteDef,
};

export interface EntertainmentSiteMeta {
  orgId: string;
  name: string;
  shortName: string;
  domain: string;
  url: string;
  sector: string;
  kind: string;
  tagline: string;
  description: string;
  realm: string;
  seat: string;
  accentColor: string;
  secondaryColor: string;
  bgHero: string;
  archetype:
    | 'songbird'
    | 'limelight'
    | 'popsticker'
    | 'casting'
    | 'venue'
    | 'agency_label'
    | 'screen_dance'
    | 'fashion_beauty'
    | 'pr_guild_rights'
    | 'awards';
}

function resolveArchetype(id: string): EntertainmentSiteMeta['archetype'] {
  switch (id) {
    case 'ORG_SONGBIRD':
      return 'songbird';
    case 'ORG_LIMELIGHT':
      return 'limelight';
    case 'ORG_POP_STICKER':
      return 'popsticker';
    case 'ORG_OPEN_CALL':
      return 'casting';
    case 'ORG_LOOKING_GLASS':
    case 'ORG_MARIGOLD_THEATRE':
    case 'ORG_SILVERLEAF_STADIUM':
    case 'ORG_VELVET_CURTAIN':
      return 'venue';
    case 'ORG_STARSTRUCK':
    case 'ORG_SECOND_ACT':
    case 'ORG_MARLIE_RECORDS':
    case 'ORG_KAJI_PUBLISHING':
    case 'ORG_LUNERUM_DIST':
    case 'ORG_WILLOW_WHISPER':
      return 'agency_label';
    case 'ORG_MIRRORA_STUDIOS':
    case 'ORG_STORYLOOM_STUDIOS':
    case 'ORG_FEMME_FATALE':
    case 'ORG_WONDER_WIND':
      return 'screen_dance';
    case 'ORG_GLASSLINE_DESIGNS':
    case 'ORG_ROSEMONT_PORTRAIT':
    case 'ORG_AMRIELLE':
      return 'fashion_beauty';
    case 'ORG_RADIANCE_AWARDS':
      return 'awards';
    default:
      return 'pr_guild_rights';
  }
}

export const ENTERTAINMENT_SITES: EntertainmentSiteMeta[] = (
  WORLD_ORGANIZATIONS.entertainmentIndustry || []
).map((org: any) => ({
  orgId: org.id,
  name: org.name,
  shortName: org.shortName || org.name,
  domain: org.domain,
  url: `https://${org.domain}`,
  sector: org.sector,
  kind: org.kind,
  tagline: org.tagline,
  description: org.description,
  realm: org.realm,
  seat: org.seat,
  accentColor: org.accentColor || '#7C3AED',
  secondaryColor: org.secondaryColor || '#F59E0B',
  bgHero: org.bgHero || '#14121D',
  archetype: resolveArchetype(org.id),
}));

const DOMAIN_MAP = new Map<string, EntertainmentSiteMeta>(
  ENTERTAINMENT_SITES.map((s) => [s.domain.toLowerCase(), s]),
);

const ORG_MAP = new Map<string, EntertainmentSiteMeta>(
  ENTERTAINMENT_SITES.map((s) => [s.orgId, s]),
);

export function getEntertainmentSiteByOrgId(orgId: string): EntertainmentSiteMeta | undefined {
  return ORG_MAP.get(orgId);
}

export function matchEntertainmentSite(urlOrHost: string): EntertainmentSiteMeta | undefined {
  if (!urlOrHost) return undefined;
  try {
    const host = urlOrHost.includes('://')
      ? new URL(urlOrHost).hostname.toLowerCase()
      : urlOrHost.split('/')[0].toLowerCase();
    return DOMAIN_MAP.get(host);
  } catch {
    return undefined;
  }
}

export function isEntertainmentUrl(url: string): boolean {
  return Boolean(matchEntertainmentSite(url));
}

export function resolveEntertainmentRoute(url: string): ResolvedEntertainmentRoute | undefined {
  const site = matchEntertainmentSite(url);
  if (!site) return undefined;
  return resolveSiteRoute(site, url);
}

// ===========================================================================
// Legacy 4-pilot compatibility layer (preserves existing deep-link contracts)
// ===========================================================================
export type EntertainmentView = 'home' | 'front' | 'workspace' | 'directory' | 'about';
type PilotView = { path: string; label: string };
type PilotSite = { layout: 'library' | 'editorial' | 'stadium' | 'atelier'; views: Record<EntertainmentView, PilotView> };

export const entertainmentPilots: Readonly<Record<string, PilotSite>> = {
  ORG_SONGBIRD: {
    layout: 'library',
    views: {
      home: { path: '/', label: 'Home' },
      front: { path: '/listen', label: 'Listen & Top Charts' },
      workspace: { path: '/studio', label: 'Artist Studio' },
      directory: { path: '/directory', label: 'Industry Directory' },
      about: { path: '/about', label: 'About Songbird' },
    },
  },
  ORG_LIMELIGHT: {
    layout: 'editorial',
    views: {
      home: { path: '/', label: 'Home' },
      front: { path: '/stories', label: 'Cover Stories & Rankings' },
      workspace: { path: '/studio', label: 'Press Desk' },
      directory: { path: '/directory', label: 'Industry Directory' },
      about: { path: '/about', label: 'About Limelight' },
    },
  },
  ORG_SILVERLEAF_STADIUM: {
    layout: 'stadium',
    views: {
      home: { path: '/', label: 'Home' },
      front: { path: '/box-office', label: 'Box Office & Calendar' },
      workspace: { path: '/studio', label: 'Venue Booking' },
      directory: { path: '/directory', label: 'Industry Directory' },
      about: { path: '/about', label: 'Venue Information' },
    },
  },
  ORG_GLASSLINE_DESIGNS: {
    layout: 'atelier',
    views: {
      home: { path: '/', label: 'Home' },
      front: { path: '/commissions', label: 'Commissions & Campaigns' },
      workspace: { path: '/studio', label: 'Creative Workspace' },
      directory: { path: '/directory', label: 'Industry Directory' },
      about: { path: '/about', label: 'About the Atelier' },
    },
  },
};

export function entertainmentUrl(site: EntertainmentSiteMeta, view: EntertainmentView, params?: URLSearchParams) {
  const path = entertainmentPilots[site.orgId]?.views[view].path ?? '/';
  const query = params?.toString();
  return site.url + (path === '/' ? '' : path) + (query ? '?' + query : '');
}

export function parseEntertainmentUrl(url: string) {
  const site = matchEntertainmentSite(url);
  const pilot = site && entertainmentPilots[site.orgId];
  if (!site || !pilot) return undefined;
  const { pathname, searchParams } = new URL(url.includes('://') ? url : 'https://' + url);
  const path = pathname.replace(/\/+$/, '') || '/';
  const view =
    path === '/discover'
      ? 'front'
      : (Object.keys(pilot.views) as EntertainmentView[]).find((key) => pilot.views[key].path === path);
  return { site, pilot, view, params: searchParams };
}

export function entertainmentPageTitle(url: string): string | null {
  const site = matchEntertainmentSite(url);
  if (!site) return null;

  // Preserve exact pilot route labels when matching pilot canonical views
  const pilotRoute = parseEntertainmentUrl(url);
  if (pilotRoute) {
    if (pilotRoute.view === 'home') return `${site.name} — ${site.kind}`;
    if (pilotRoute.view) return `${pilotRoute.pilot.views[pilotRoute.view].label} · ${site.name}`;
  }

  // Full 25-site route resolution (including new routes & nested detail pages)
  const resolved = resolveSiteRoute(site, url);
  if (resolved.isNotFound || !resolved.route) {
    return `Page unavailable · ${site.name}`;
  }
  if (resolved.route.id === 'home' && resolved.pathname === '/') {
    return `${site.name} — ${site.kind}`;
  }
  return `${resolved.route.label} · ${site.name}`;
}
