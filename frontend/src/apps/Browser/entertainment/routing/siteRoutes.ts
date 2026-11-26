import type { EntertainmentSiteMeta } from '../entertainmentRouter';

export type RouteAccess = 'public' | 'authenticated';

export interface SiteRouteDef {
  /** Route key unique within the site, e.g. 'home', 'charts', 'artist-detail', 'portal' */
  id: string;
  /** Canonical path pattern, e.g. '/', '/charts', '/artist/:id', '/portal' */
  path: string;
  /** Display label for nav & browser tab title */
  label: string;
  /** Where this route appears in the site's navigation chrome */
  navGroup: 'primary' | 'secondary' | 'utility' | 'footer' | 'detail';
  /** Access level for public vs signed-in portals */
  access: RouteAccess;
  /** Legacy / alias paths that resolve to this route */
  aliases?: string[];
}

export interface SiteRouteConfig {
  orgId: string;
  shell:
    | 'streaming-app'
    | 'editorial-magazine'
    | 'lookbook-rail'
    | 'stadium-venue'
    | 'contact-sheet'
    | 'cinematic-studio'
    | 'rights-registry'
    | 'guild-handbook'
    | 'casting-platform'
    | 'indie-label'
    | 'broadcast-console'
    | 'score-library'
    | 'release-console'
    | 'live-club'
    | 'boutique-agency'
    | 'pressroom'
    | 'touring-playbill'
    | 'beauty-storefront'
    | 'portrait-studio'
    | 'dance-collective'
    | 'touring-dance'
    | 'animation-studio'
    | 'repertory-theatre'
    | 'ceremony-hub'
    | 'flagship-agency';
  navAriaLabel: string;
  routes: SiteRouteDef[];
}

export interface ResolvedEntertainmentRoute {
  site: EntertainmentSiteMeta;
  config: SiteRouteConfig;
  route: SiteRouteDef | undefined;
  pathname: string;
  params: URLSearchParams;
  pathParams: Record<string, string>;
  isNotFound: boolean;
  isLegacyPilotFront?: boolean;
}

function r(
  id: string,
  path: string,
  label: string,
  navGroup: SiteRouteDef['navGroup'],
  access: RouteAccess = 'public',
  aliases?: string[],
): SiteRouteDef {
  return { id, path, label, navGroup, access, aliases };
}

export const SITE_ROUTE_CONFIGS: Readonly<Record<string, SiteRouteConfig>> = {
  // =========================================================================
  // WAVE 1 — FLAGSHIP MEDIA, STREAMING, FASHION & MAJOR VENUES (10 SITES)
  // =========================================================================
  ORG_SONGBIRD: {
    orgId: 'ORG_SONGBIRD',
    shell: 'streaming-app',
    navAriaLabel: 'Songbird library navigation',
    routes: [
      r('home', '/', 'Discover', 'primary', 'public', ['/discover']),
      r('charts', '/charts', 'Charts', 'primary', 'public', ['/listen']),
      r('releases', '/releases', 'New Releases', 'primary', 'public'),
      r('search', '/search', 'Search', 'primary', 'public'),
      r('library', '/library', 'Your Library', 'secondary', 'public'),
      r('artist-studio', '/artist-studio', 'Artist Studio', 'utility', 'authenticated', ['/studio']),
      r('directory', '/directory', 'Industry Directory', 'footer', 'public'),
      r('about', '/about', 'About Songbird', 'footer', 'public'),
      r('artist-detail', '/artist/:id', 'Artist Profile', 'detail', 'public'),
      r('album-detail', '/album/:id', 'Release Details', 'detail', 'public'),
    ],
  },

  ORG_LIMELIGHT: {
    orgId: 'ORG_LIMELIGHT',
    shell: 'editorial-magazine',
    navAriaLabel: 'Limelight editorial desks',
    routes: [
      r('home', '/', 'Front Page', 'primary', 'public'),
      r('celebrity', '/celebrity', 'Celebrity', 'primary', 'public', ['/stories', '/discover']),
      r('music', '/music', 'Music', 'primary', 'public'),
      r('screen', '/screen', 'Screen', 'primary', 'public'),
      r('fashion', '/fashion', 'Fashion', 'primary', 'public'),
      r('culture', '/culture', 'Culture', 'primary', 'public'),
      r('lists', '/lists', 'The Lists', 'primary', 'public'),
      r('archive', '/archive', 'Archive', 'secondary', 'public'),
      r('press-desk', '/press-desk', 'Press Desk', 'utility', 'authenticated', ['/studio']),
      r('directory', '/directory', 'Industry Directory', 'footer', 'public'),
      r('about', '/about', 'About Limelight', 'footer', 'public'),
      r('story-detail', '/stories/:id', 'Feature Story', 'detail', 'public'),
    ],
  },

  ORG_GLASSLINE_DESIGNS: {
    orgId: 'ORG_GLASSLINE_DESIGNS',
    shell: 'lookbook-rail',
    navAriaLabel: 'Glassline Designs atelier sections',
    routes: [
      r('home', '/', 'Lookbook', 'primary', 'public'),
      r('collections', '/collections', 'Collections', 'primary', 'public', ['/discover']),
      r('runway', '/runway', 'Runway', 'primary', 'public'),
      r('couture', '/couture', 'Couture', 'primary', 'public'),
      r('atelier', '/atelier', 'Atelier', 'primary', 'public'),
      r('commissions', '/commissions', 'Commissions', 'primary', 'public'),
      r('campaigns', '/campaigns', 'Campaigns', 'primary', 'public'),
      r('studio', '/studio', 'Client Fitting Room', 'utility', 'authenticated'),
      r('directory', '/directory', 'Industry Directory', 'footer', 'public'),
      r('about', '/about', 'The House', 'footer', 'public'),
    ],
  },

  ORG_SILVERLEAF_STADIUM: {
    orgId: 'ORG_SILVERLEAF_STADIUM',
    shell: 'stadium-venue',
    navAriaLabel: 'Silverleaf Stadium visitor navigation',
    routes: [
      r('home', '/', 'Stadium Home', 'primary', 'public'),
      r('events', '/events', "What's On", 'primary', 'public', ['/box-office', '/discover']),
      r('tickets', '/tickets', 'Tickets', 'primary', 'public'),
      r('visit', '/visit', 'Plan Your Visit', 'primary', 'public'),
      r('hospitality', '/hospitality', 'Hospitality', 'primary', 'public'),
      r('venue-hire', '/venue-hire', 'Venue Hire', 'utility', 'authenticated', ['/studio']),
      r('directory', '/directory', 'Industry Directory', 'footer', 'public'),
      r('about', '/about', 'Venue Information', 'footer', 'public'),
      r('event-detail', '/events/:id', 'Event Details', 'detail', 'public'),
    ],
  },

  ORG_WILLOW_WHISPER: {
    orgId: 'ORG_WILLOW_WHISPER',
    shell: 'contact-sheet',
    navAriaLabel: 'Willow Whisper roster navigation',
    routes: [
      r('home', '/', 'Board', 'primary', 'public'),
      r('women', '/women', 'Women', 'primary', 'public'),
      r('men', '/men', 'Men', 'primary', 'public'),
      r('new-faces', '/new-faces', 'New Faces', 'primary', 'public'),
      r('editorials', '/editorials', 'Editorials', 'primary', 'public'),
      r('apply', '/apply', 'Become a Model', 'primary', 'public'),
      r('bookings', '/bookings', 'Bookings', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'Agency', 'footer', 'public'),
      r('model-detail', '/models/:id', 'Model Portfolio', 'detail', 'public'),
    ],
  },

  ORG_MIRRORA_STUDIOS: {
    orgId: 'ORG_MIRRORA_STUDIOS',
    shell: 'cinematic-studio',
    navAriaLabel: 'Mirrora Studios filmstrip navigation',
    routes: [
      r('home', '/', 'Studio Lot', 'primary', 'public'),
      r('films', '/films', 'Films', 'primary', 'public'),
      r('series', '/series', 'Series', 'primary', 'public'),
      r('in-production', '/in-production', 'In Production', 'primary', 'public'),
      r('news', '/news', 'Studio News', 'primary', 'public'),
      r('casting', '/casting', 'Casting', 'primary', 'public'),
      r('portal', '/portal', 'Production Desk', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About Mirrora', 'footer', 'public'),
      r('production-detail', '/productions/:id', 'Production', 'detail', 'public'),
    ],
  },

  ORG_MUSIC_RIGHTS_SOCIETY: {
    orgId: 'ORG_MUSIC_RIGHTS_SOCIETY',
    shell: 'rights-registry',
    navAriaLabel: 'MMRS rights registry navigation',
    routes: [
      r('home', '/', 'Registry Home', 'primary', 'public'),
      r('repertoire', '/repertoire', 'Repertoire Search', 'primary', 'public'),
      r('licensing', '/licensing', 'Licensing', 'primary', 'public'),
      r('royalties', '/royalties', 'Royalties', 'primary', 'public'),
      r('registration', '/registration', 'Registration', 'primary', 'public'),
      r('portal', '/portal', 'Member Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About MMRS', 'footer', 'public'),
    ],
  },

  ORG_PERFORMERS_ASSOC: {
    orgId: 'ORG_PERFORMERS_ASSOC',
    shell: 'guild-handbook',
    navAriaLabel: 'Meridion Performers Association navigation',
    routes: [
      r('home', '/', 'Guild Home', 'primary', 'public'),
      r('membership', '/membership', 'Membership', 'primary', 'public'),
      r('benefits', '/benefits', 'Benefits', 'primary', 'public'),
      r('contracts', '/contracts', 'Contracts & Rights', 'primary', 'public'),
      r('advocacy', '/advocacy', 'Advocacy', 'primary', 'public'),
      r('training', '/training', 'Workshops & Training', 'primary', 'public'),
      r('portal', '/portal', 'Member Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About MPA', 'footer', 'public'),
    ],
  },

  ORG_OPEN_CALL: {
    orgId: 'ORG_OPEN_CALL',
    shell: 'casting-platform',
    navAriaLabel: 'Open Call Casting navigation',
    routes: [
      r('home', '/', 'Find Auditions', 'primary', 'public', ['/auditions']),
      r('productions', '/productions', 'Productions', 'primary', 'public'),
      r('casting', '/casting', 'Casting Professionals', 'primary', 'public'),
      r('applications', '/applications', 'My Applications', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'How Casting Works', 'footer', 'public'),
      r('audition-detail', '/auditions/:id', 'Audition Breakdown', 'detail', 'public'),
    ],
  },

  ORG_MARLIE_RECORDS: {
    orgId: 'ORG_MARLIE_RECORDS',
    shell: 'indie-label',
    navAriaLabel: 'Marlie Records navigation',
    routes: [
      r('home', '/', 'Pressing Room', 'primary', 'public'),
      r('artists', '/artists', 'Artists', 'primary', 'public'),
      r('releases', '/releases', 'Releases', 'primary', 'public'),
      r('new-releases', '/new-releases', 'New Releases', 'primary', 'public'),
      r('sessions', '/sessions', 'Sessions', 'primary', 'public'),
      r('demos', '/demos', 'Demo Submissions', 'primary', 'public'),
      r('portal', '/portal', 'Label Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About Marlie', 'footer', 'public'),
    ],
  },

  // =========================================================================
  // WAVE 2 — RADIO, PUBLISHING, DISTRIBUTION, CLUB, MANAGEMENT & PR (6 SITES)
  // =========================================================================
  ORG_POP_STICKER: {
    orgId: 'ORG_POP_STICKER',
    shell: 'broadcast-console',
    navAriaLabel: 'Pop Sticker Radio channels',
    routes: [
      r('home', '/', 'On Air', 'primary', 'public', ['/on-air']),
      r('schedule', '/schedule', 'Schedule', 'primary', 'public'),
      r('countdown', '/countdown', 'Countdown', 'primary', 'public'),
      r('requests', '/requests', 'Requests', 'primary', 'public'),
      r('sessions', '/sessions', 'Sessions', 'primary', 'public'),
      r('about', '/about', 'Booth 88', 'footer', 'public'),
    ],
  },

  ORG_KAJI_PUBLISHING: {
    orgId: 'ORG_KAJI_PUBLISHING',
    shell: 'score-library',
    navAriaLabel: 'Kaji Publishing Studios navigation',
    routes: [
      r('home', '/', 'Catalog', 'primary', 'public', ['/catalog']),
      r('composers', '/composers', 'Composers', 'primary', 'public'),
      r('publishing', '/publishing', 'Publishing', 'primary', 'public'),
      r('studios', '/studios', 'Recording Studios', 'primary', 'public'),
      r('licensing', '/licensing', 'Licensing', 'primary', 'public'),
      r('portal', '/portal', 'Writer Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'Balisya Chambers', 'footer', 'public'),
    ],
  },

  ORG_LUNERUM_DIST: {
    orgId: 'ORG_LUNERUM_DIST',
    shell: 'release-console',
    navAriaLabel: 'Lunerum Dist workflow navigation',
    routes: [
      r('home', '/', 'Distribution', 'primary', 'public', ['/distribution']),
      r('platforms', '/platforms', 'Platforms', 'primary', 'public'),
      r('pricing', '/pricing', 'Pricing', 'primary', 'public'),
      r('resources', '/resources', 'Resources', 'primary', 'public'),
      r('portal', '/portal', 'Artist Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About Lunerum', 'footer', 'public'),
    ],
  },

  ORG_LOOKING_GLASS: {
    orgId: 'ORG_LOOKING_GLASS',
    shell: 'live-club',
    navAriaLabel: 'The Looking Glass club navigation',
    routes: [
      r('home', '/', 'Tonight', 'primary', 'public', ['/tonight']),
      r('gigs', '/gigs', 'Upcoming Gigs', 'primary', 'public'),
      r('the-room', '/the-room', 'The Room', 'primary', 'public'),
      r('tickets', '/tickets', 'Tickets', 'primary', 'public'),
      r('submissions', '/submissions', 'Artist Submissions', 'primary', 'public'),
      r('about', '/about', '9 Lantern Alley', 'footer', 'public'),
    ],
  },

  ORG_SECOND_ACT: {
    orgId: 'ORG_SECOND_ACT',
    shell: 'boutique-agency',
    navAriaLabel: 'Second Act Management navigation',
    routes: [
      r('home', '/', 'Our Clients', 'primary', 'public', ['/clients']),
      r('management', '/management', 'Management', 'primary', 'public'),
      r('career-development', '/career-development', 'Career Development', 'primary', 'public'),
      r('inquiries', '/inquiries', 'Inquiries', 'primary', 'public'),
      r('portal', '/portal', 'Client Access', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'Dawnson Green', 'footer', 'public'),
    ],
  },

  ORG_WORD_OF_MOUTH: {
    orgId: 'ORG_WORD_OF_MOUTH',
    shell: 'pressroom',
    navAriaLabel: 'Word of Mouth Publicity navigation',
    routes: [
      r('home', '/', 'Pressroom', 'primary', 'public', ['/pressroom']),
      r('services', '/services', 'Services', 'primary', 'public'),
      r('campaigns', '/campaigns', 'Campaigns', 'primary', 'public'),
      r('clients', '/clients', 'Clients', 'primary', 'public'),
      r('portal', '/portal', 'Client Access', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'About Word of Mouth', 'footer', 'public'),
    ],
  },

  // =========================================================================
  // WAVE 3 — PRODUCTION, BEAUTY, PORTRAIT, DANCE, ANIMATION, THEATRE, AWARDS, AGENCY (9 SITES)
  // =========================================================================
  ORG_VELVET_CURTAIN: {
    orgId: 'ORG_VELVET_CURTAIN',
    shell: 'touring-playbill',
    navAriaLabel: 'Velvet Curtain touring navigation',
    routes: [
      r('home', '/', 'Current Productions', 'primary', 'public', ['/productions']),
      r('touring', '/touring', 'Touring', 'primary', 'public'),
      r('tickets', '/tickets', 'Tickets', 'primary', 'public'),
      r('services', '/services', 'Production Services', 'primary', 'public'),
      r('about', '/about', 'About Velvet Curtain', 'footer', 'public'),
    ],
  },

  ORG_AMRIELLE: {
    orgId: 'ORG_AMRIELLE',
    shell: 'beauty-storefront',
    navAriaLabel: 'Amrielle boutique navigation',
    routes: [
      r('home', '/', 'Collections', 'primary', 'public', ['/collections']),
      r('beauty', '/beauty', 'Beauty', 'primary', 'public'),
      r('fragrance', '/fragrance', 'Fragrance', 'primary', 'public'),
      r('campaigns', '/campaigns', 'Campaigns', 'primary', 'public'),
      r('shop', '/shop', 'Shop', 'primary', 'public'),
      r('about', '/about', 'Maison Amrielle', 'footer', 'public'),
    ],
  },

  ORG_ROSEMONT_PORTRAIT: {
    orgId: 'ORG_ROSEMONT_PORTRAIT',
    shell: 'portrait-studio',
    navAriaLabel: 'Rosemont Portrait House navigation',
    routes: [
      r('home', '/', 'Portfolio', 'primary', 'public', ['/portfolio']),
      r('editorial', '/editorial', 'Editorial', 'primary', 'public'),
      r('portraiture', '/portraiture', 'Portraiture', 'primary', 'public'),
      r('exhibitions', '/exhibitions', 'Exhibitions', 'primary', 'public'),
      r('book', '/book', 'Book a Sitting', 'primary', 'public'),
      r('about', '/about', '11 Rosemont Terrace', 'footer', 'public'),
    ],
  },

  ORG_FEMME_FATALE: {
    orgId: 'ORG_FEMME_FATALE',
    shell: 'dance-collective',
    navAriaLabel: 'Femme Fatale Dance Company navigation',
    routes: [
      r('home', '/', 'The Company', 'primary', 'public', ['/company']),
      r('repertoire', '/repertoire', 'Repertoire', 'primary', 'public'),
      r('performances', '/performances', 'Performances', 'primary', 'public'),
      r('dancers', '/dancers', 'Dancers', 'primary', 'public'),
      r('auditions', '/auditions', 'Auditions', 'primary', 'public'),
      r('about', '/about', 'Rehearsal Lofts', 'footer', 'public'),
    ],
  },

  ORG_WONDER_WIND: {
    orgId: 'ORG_WONDER_WIND',
    shell: 'touring-dance',
    navAriaLabel: 'Wonder-Wind Dance Company navigation',
    routes: [
      r('home', '/', 'Productions', 'primary', 'public', ['/productions']),
      r('tour', '/tour', 'Tour', 'primary', 'public'),
      r('company', '/company', 'Company', 'primary', 'public'),
      r('collaborations', '/collaborations', 'Collaborations', 'primary', 'public'),
      r('workshops', '/workshops', 'Workshops', 'primary', 'public'),
      r('about', '/about', 'Trade-Wind Pavilion', 'footer', 'public'),
    ],
  },

  ORG_STORYLOOM_STUDIOS: {
    orgId: 'ORG_STORYLOOM_STUDIOS',
    shell: 'animation-studio',
    navAriaLabel: 'Storyloom Studios navigation',
    routes: [
      r('home', '/', 'Our Worlds', 'primary', 'public', ['/worlds']),
      r('productions', '/productions', 'Productions', 'primary', 'public'),
      r('characters', '/characters', 'Characters', 'primary', 'public'),
      r('behind-the-scenes', '/behind-the-scenes', 'Behind the Scenes', 'primary', 'public'),
      r('careers', '/careers', 'Careers', 'primary', 'public'),
      r('about', '/about', 'Lantern Workshop', 'footer', 'public'),
    ],
  },

  ORG_MARIGOLD_THEATRE: {
    orgId: 'ORG_MARIGOLD_THEATRE',
    shell: 'repertory-theatre',
    navAriaLabel: 'The Marigold Theatre playbill navigation',
    routes: [
      r('home', '/', "What's On", 'primary', 'public', ['/whats-on']),
      r('season', '/season', 'The Season', 'primary', 'public'),
      r('company', '/company', 'Our Company', 'primary', 'public'),
      r('visit', '/visit', 'Visit', 'primary', 'public'),
      r('auditions', '/auditions', 'Auditions', 'primary', 'public'),
      r('about', '/about', 'Marigold Square', 'footer', 'public'),
      r('production-detail', '/productions/:id', 'Production Playbill', 'detail', 'public'),
    ],
  },

  ORG_RADIANCE_AWARDS: {
    orgId: 'ORG_RADIANCE_AWARDS',
    shell: 'ceremony-hub',
    navAriaLabel: 'The Radiance Awards navigation',
    routes: [
      r('home', '/', 'This Season', 'primary', 'public', ['/season']),
      r('nominees', '/nominees', 'Nominees', 'primary', 'public'),
      r('winners', '/winners', 'Winners', 'primary', 'public'),
      r('ceremony', '/ceremony', 'Ceremony', 'primary', 'public'),
      r('archives', '/archives', 'Archives', 'primary', 'public'),
      r('portal', '/portal', 'Ballot Filing', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'Radiance Hall', 'footer', 'public'),
    ],
  },

  ORG_STARSTRUCK: {
    orgId: 'ORG_STARSTRUCK',
    shell: 'flagship-agency',
    navAriaLabel: 'Starstruck Entertainment navigation',
    routes: [
      r('home', '/', 'Talent', 'primary', 'public', ['/talent']),
      r('divisions', '/divisions', 'Divisions', 'primary', 'public'),
      r('projects', '/projects', 'Projects', 'primary', 'public'),
      r('news', '/news', 'News', 'primary', 'public'),
      r('representation', '/representation', 'Representation', 'primary', 'public'),
      r('portal', '/portal', 'Artist Portal', 'utility', 'authenticated', ['/studio']),
      r('about', '/about', 'Showcase Tower', 'footer', 'public'),
    ],
  },
};

export function getSiteRouteConfig(orgId: string): SiteRouteConfig | undefined {
  return SITE_ROUTE_CONFIGS[orgId];
}

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const normPattern = pattern.replace(/\/+$/, '') || '/';
  const normPath = pathname.replace(/\/+$/, '') || '/';
  if (normPattern === normPath) return {};
  if (!normPattern.includes(':')) return null;

  const patSegs = normPattern.split('/').filter(Boolean);
  const pathSegs = normPath.split('/').filter(Boolean);
  if (patSegs.length !== pathSegs.length) return null;

  const extracted: Record<string, string> = {};
  for (let i = 0; i < patSegs.length; i++) {
    if (patSegs[i].startsWith(':')) {
      extracted[patSegs[i].slice(1)] = decodeURIComponent(pathSegs[i]);
    } else if (patSegs[i] !== pathSegs[i]) {
      return null;
    }
  }
  return extracted;
}

export function resolveSiteRoute(site: EntertainmentSiteMeta, rawUrl: string): ResolvedEntertainmentRoute {
  const config = SITE_ROUTE_CONFIGS[site.orgId] ?? {
    orgId: site.orgId,
    shell: 'flagship-agency' as const,
    navAriaLabel: `${site.name} navigation`,
    routes: [r('home', '/', 'Home', 'primary', 'public')],
  };

  let pathname = '/';
  let params = new URLSearchParams();
  try {
    const parsed = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
    pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    params = parsed.searchParams;
  } catch {
    pathname = '/';
  }

  for (const route of config.routes) {
    const direct = matchPattern(route.path, pathname);
    if (direct !== null) {
      return { site, config, route, pathname, params, pathParams: direct, isNotFound: false };
    }
    if (route.aliases) {
      for (const alias of route.aliases) {
        const aliased = matchPattern(alias, pathname);
        if (aliased !== null) {
          return {
            site,
            config,
            route,
            pathname,
            params,
            pathParams: aliased,
            isNotFound: false,
            isLegacyPilotFront: ['/listen', '/stories', '/box-office', '/commissions', '/discover'].includes(alias),
          };
        }
      }
    }
  }

  return {
    site,
    config,
    route: undefined,
    pathname,
    params,
    pathParams: {},
    isNotFound: true,
  };
}

export function buildSiteUrl(site: Pick<EntertainmentSiteMeta, 'url'>, path: string, params?: URLSearchParams): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const suffix = cleanPath === '/' ? '' : cleanPath;
  const query = params?.toString();
  return `${site.url}${suffix}${query ? `?${query}` : ''}`;
}
