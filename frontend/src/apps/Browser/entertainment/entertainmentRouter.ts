import { WORLD_ORGANIZATIONS } from '../../../game-content/worldAssetLibrary';

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

export function entertainmentPageTitle(url: string): string | null {
  const site = matchEntertainmentSite(url);
  if (!site) return null;
  try {
    const parsed = new URL(url);
    const sub = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (sub) return `${sub[0].toUpperCase()}${sub.slice(1)} · ${site.name}`;
  } catch {
    /* ignore */
  }
  return `${site.name} — ${site.kind}`;
}
