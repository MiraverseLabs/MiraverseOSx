import { BROWSER_HOME } from './browserModel';

export interface CultureSector {
  id: string;
  label: string;
  sector: string;
  blurb: string;
  accent: string;
}

export const CULTURE_SECTORS: CultureSector[] = [
  { id: 'music', label: 'Music and talent', sector: 'Music, Talent & Management', blurb: 'Labels, artists, and management across the Glassline scene.', accent: '#8b5cf6' },
  { id: 'broadcast', label: 'Broadcasting and streaming', sector: 'Broadcasting & Streaming', blurb: 'On-air booths, streamers, and collector shows.', accent: '#0ea5e9' },
  { id: 'fashion', label: 'Fashion and modeling', sector: 'Fashion, Modeling & Visuals', blurb: 'Ateliers, lookbooks, and editorial sittings.', accent: '#ec4899' },
  { id: 'screen', label: 'Screen and dance', sector: 'Dance, Screen & Stage', blurb: 'Casting slates, dance companies, and stage work.', accent: '#f59e0b' },
  { id: 'live', label: 'Live events and venues', sector: 'Live Events & Venues', blurb: 'Stadiums, theatres, and multi-realm tours.', accent: '#10b981' },
  { id: 'media', label: 'Media and recognition', sector: 'Media & Recognition', blurb: 'Press, awards, and the recognition circuit.', accent: '#6366f1' },
  { id: 'services', label: 'Professional services', sector: 'Representation, PR & Rights', blurb: 'Agencies, publishers, and rights registries.', accent: '#64748b' },
];

export interface CultureFeature {
  id: string;
  title: string;
  kicker: string;
  blurb: string;
  domain: string;
}

export const CULTURE_FEATURES: CultureFeature[] = [
  { id: 'songbird', title: 'Songbird Sessions', kicker: 'Listening room', blurb: 'New releases and the Pan-Meridion chart.', domain: 'songbird.mer' },
  { id: 'limelight', title: 'Limelight Issue 08', kicker: 'Culture broadsheet', blurb: 'Cover stories, rankings, and community reception.', domain: 'limelight.mer' },
  { id: 'silverleaf', title: 'Silverleaf Summer Season', kicker: 'Box office', blurb: 'Live fixtures, seating guide, and calendar.', domain: 'silverleafstadium.mer' },
  { id: 'glassline', title: 'Glassline Atelier', kicker: 'Lookbook', blurb: 'Seasonal collections and commission briefs.', domain: 'glasslinedesigns.mer' },
];

export function cultureURL(sector?: string): string {
  return BROWSER_HOME + '/culture' + (sector ? '?sector=' + encodeURIComponent(sector) : '');
}

export function cultureSectorFromParam(value: string | null): string | null {
  return CULTURE_SECTORS.find(sector => sector.id === value)?.id ?? null;
}