const BASE = '/api/livingworld';

export interface EntertainmentOrganization {
  OrganizationId: string;
  Name: string;
  ShortName: string;
  Sector: string;
  Kind: string;
  Domain: string;
  Realm: string;
  Seat: string;
  Tagline: string;
  VenueCapacity?: number;
  artistCount?: number;
  staffCount?: number;
  productionCount?: number;
  concertCount?: number;
}

export interface ProjectSummary {
  projectId: string;
  title: string;
  kind: string;
  studioOrgId: string;
  leadId: string;
  stage: string;
  progress: number;
  budget: number;
  quality: number;
  status: string;
  milestones: unknown[];
}

export interface ChartEntry {
  trackId: string;
  title: string;
  artistId: string;
  streams: number;
  radioSpins: number;
}

export function resourceUrl(runId: string, resource: string): string {
  return `${BASE}/${encodeURIComponent(resource)}?runId=${encodeURIComponent(runId)}`;
}

async function get<T>(runId: string, resource: string): Promise<T> {
  const response = await fetch(resourceUrl(runId, resource), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Living World ${resource} request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export const getOrganizations = (runId: string) => get<{ organizations: EntertainmentOrganization[] }>(runId, 'organizations');
export const getProjects = (runId: string) => get<{ projects: ProjectSummary[] }>(runId, 'projects');
export const getCharts = (runId: string) => get<{ charts: ChartEntry[] }>(runId, 'charts');
export const getRoyalties = (runId: string) => get<{ totalsByKind: Record<string, number>; artists: unknown[] }>(runId, 'royalties');
export const getRights = (runId: string) => get<{ rights: unknown[] }>(runId, 'rights');
export const getLicensing = (runId: string) => get<{ licenses: unknown[] }>(runId, 'licensing');
export const getMedia = (runId: string) => get<{ media: unknown[] }>(runId, 'media');
export const getMemberships = (runId: string) => get<{ fanCommunities: unknown[]; staff: unknown[] }>(runId, 'memberships');
export const getBookings = (runId: string) => get<{ bookings: unknown[] }>(runId, 'bookings');
export const getTours = (runId: string) => get<{ tours: unknown[] }>(runId, 'tours');
export const getBroadcasting = (runId: string) => get<{ broadcasting: unknown[] }>(runId, 'broadcasting');
export const getCampaigns = (runId: string) => get<{ campaigns: unknown[] }>(runId, 'campaigns');
export const getAwards = (runId: string) => get<{ awards: unknown[] }>(runId, 'awards');

export async function createProject(runId: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(BASE + '/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, ...body }),
  });
  if (!response.ok) throw new Error(`Living World project request failed (${response.status}).`);
  return response.json();
}