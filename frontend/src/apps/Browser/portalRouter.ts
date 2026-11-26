export type PortalId = 'dga' | 'shipping' | 'royalhistory' | 'vectornet';

export interface PortalLocation {
  id: PortalId;
  view: string;
  valid: boolean;
}

export const PORTAL_DOMAINS: Record<PortalId, string> = {
  dga: 'dga.gov.aure',
  shipping: 'shipping.aure',
  royalhistory: 'royalhistory.mer',
  vectornet: 'vectornet.aure',
};

export const PORTAL_NAMES: Record<PortalId, string> = {
  dga: 'Directorate of Global Affairs',
  shipping: 'CargoTrack Logistics',
  royalhistory: 'Royal Historic Society',
  vectornet: 'VectorNet Underground',
};

export const PORTAL_VIEWS: Record<PortalId, { id: string; label: string }[]> = {
  dga: [
    { id: 'overview', label: 'Gateway' },
    { id: 'registry', label: 'Registry' },
    { id: 'cipher', label: 'Cipher' },
    { id: 'cases', label: 'Cases' },
  ],
  shipping: [
    { id: 'overview', label: 'Tracking' },
    { id: 'routes', label: 'Routes' },
    { id: 'audits', label: 'Audits' },
  ],
  royalhistory: [
    { id: 'overview', label: 'Hall' },
    { id: 'charters', label: 'Charters' },
    { id: 'lineages', label: 'Lineages' },
    { id: 'chronicle', label: 'Chronicle' },
  ],
  vectornet: [
    { id: 'overview', label: 'Market' },
    { id: 'relays', label: 'Relays' },
    { id: 'console', label: 'Console' },
  ],
};

const DOMAIN_MAP: Record<string, PortalId> = {};
for (const [id, domain] of Object.entries(PORTAL_DOMAINS)) {
  DOMAIN_MAP[domain.toLowerCase()] = id as PortalId;
}
DOMAIN_MAP['dga.gov'] = 'dga';
DOMAIN_MAP['cargotrack.aure'] = 'shipping';
DOMAIN_MAP['royalhistory.aure'] = 'royalhistory';

export function portalFromHostname(hostname: string): PortalId | null {
  return DOMAIN_MAP[hostname.toLowerCase()] || null;
}

export function isPortalUrl(url: string): boolean {
  try {
    return portalFromHostname(new URL(url).hostname) !== null;
  } catch {
    return false;
  }
}

export function parsePortalUrl(url: string): PortalLocation | null {
  try {
    const parsed = new URL(url);
    const id = portalFromHostname(parsed.hostname);
    if (!id) return null;
    const head = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)[0];
    if (!head) return { id, view: 'overview', valid: true };
    const valid = PORTAL_VIEWS[id].some(view => view.id === head);
    return { id, view: valid ? head : 'overview', valid };
  } catch {
    return null;
  }
}

export function portalUrl(id: PortalId, view = 'overview'): string {
  const domain = PORTAL_DOMAINS[id];
  return view === 'overview' ? `https://${domain}` : `https://${domain}/${view}`;
}

export function portalPageTitle(url: string): string | null {
  const location = parsePortalUrl(url);
  if (!location) return null;
  const name = PORTAL_NAMES[location.id];
  if (!location.valid) return `Page unavailable · ${name}`;
  if (location.view === 'overview') return name;
  const label = PORTAL_VIEWS[location.id].find(view => view.id === location.view)?.label || location.view;
  return `${label} · ${name}`;
}