import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import brandKits from '../../../game-content/media-assets/brand-kits.json';
import manifest from '../../../game-content/media-assets/manifest.json';
import type { EntertainmentState } from '../../../gameplay/EntertainmentEcosystem';
import type { EntertainmentSiteMeta } from './entertainmentRouter';
import { entertainmentHomeDesigns, type HomeDesign, type HomeFeed } from './entertainmentHomeDesigns';
import './entertainment-homepages.css';

type HomepageProps = {
  site: EntertainmentSiteMeta;
  cycle: number;
  state: EntertainmentState;
  organization: { services?: string[]; departments?: { id: string; name: string; focus: string }[] };
};

type Entry = { id: string; title: string; detail?: string; description?: string; image?: string };

export function getEntertainmentHomeDesign(orgId: string): HomeDesign | undefined {
  if (!Object.hasOwn(entertainmentHomeDesigns, orgId)) return undefined;
  return entertainmentHomeDesigns[orgId as keyof typeof entertainmentHomeDesigns];
}

function approvedArtwork(orgId: string): Entry[] {
  return manifest.assets
    .filter(asset => asset.entityIds.includes(orgId) && asset.provenance.approvalStatus === 'approved'
      && ['media.album', 'media.poster', 'media.editorial', 'media.campaign', 'media.photo'].includes(asset.slotRole))
    .slice(0, 4)
    .map(asset => ({ id: asset.id, title: asset.caption, image: asset.src }));
}

function getEntries(feed: HomeFeed, { site, cycle, state, organization }: HomepageProps): Entry[] {
  const id = site.orgId;
  switch (feed) {
    case 'artwork':
      return approvedArtwork(id);
    case 'services':
      return [
        { id, title: site.kind, description: site.description, detail: site.seat },
        ...(organization.services ?? []).map((title, index) => ({ id: id + ':' + index, title })),
      ];
    case 'atelier':
      return (organization.departments ?? []).map(department => ({
        id: department.id, title: department.name, description: department.focus,
      }));
    case 'roster':
    case 'models':
      return state.artists
        .filter(artist => artist.origin === 'npc' && artist.privacyBoundary !== 'strict'
          && [artist.managerOrgId, artist.labelOrgId, artist.publisherOrgId, artist.distributorOrgId].includes(id)
          && (feed === 'roster' || artist.disciplines.includes('modeling')))
        .map(artist => ({ id: artist.artistId, title: artist.stageName, detail: artist.genres.join(' · '), description: artist.bio }));
    case 'releases':
      return state.releases
        .filter(release => release.status === 'released' && (release.labelOrgId === id || release.distributorOrgId === id))
        .sort((a, b) => b.releaseCycle - a.releaseCycle)
        .map(release => ({ id: release.releaseId, title: release.title, detail: release.stageName + ' · ' + release.format }));
    case 'tracks':
    case 'scores':
      return state.tracks
        .filter(track => feed === 'tracks' || (id === 'ORG_MUSIC_RIGHTS_SOCIETY' ? track.mmrsRegistered : track.publisherOrgId === id))
        .sort((a, b) => feed === 'tracks' ? (id === 'ORG_POP_STICKER' ? b.radioSpins - a.radioSpins : b.streams - a.streams) : b.createdCycle - a.createdCycle)
        .map(track => ({ id: track.trackId, title: track.title, detail: track.stageName + ' · ' + track.genre }));
    case 'events':
      return state.concerts
        .filter(event => event.status === 'scheduled' && event.scheduledCycle >= cycle
          && (event.venueOrgId === id || event.promoterOrgId === id))
        .sort((a, b) => a.scheduledCycle - b.scheduledCycle)
        .map(event => ({ id: event.concertId, title: event.title, detail: event.dateLabel + ' · ' + event.venue, description: event.stageName }));
    case 'auditions':
      return state.auditions
        .filter(call => call.status === 'open' && call.deadlineCycle >= cycle && (call.orgId === id || call.productionOrgId === id))
        .sort((a, b) => a.deadlineCycle - b.deadlineCycle)
        .map(call => ({ id: call.auditionId, title: call.title, detail: 'Deadline · Cycle ' + call.deadlineCycle }));
    case 'projects':
      return state.projects.filter(project => project.partnerOrgId === id && project.status === 'released')
        .map(project => ({ id: project.projectId, title: project.title, detail: project.kind.replaceAll('_', ' ') }));
    case 'campaigns':
      return state.projects.filter(project => project.partnerOrgId === id && project.kind === 'fashion_campaign' && project.status === 'released')
        .map(project => ({ id: project.projectId, title: project.title }));
    case 'stories':
      return state.mediaItems.filter(story => story.orgId === id)
        .sort((a, b) => b.cycle - a.cycle)
        .map(story => ({ id: story.mediaId, title: story.headline, detail: 'Cycle ' + story.cycle, description: story.summary }));
    case 'honors':
      return state.awards.filter(edition => edition.status === 'completed')
        .sort((a, b) => b.ceremonyCycle - a.ceremonyCycle)
        .flatMap(edition => edition.winners.map((winner, index) => ({
          id: edition.awardCycleId + ':' + index, title: winner.category,
          detail: winner.stageName + ' · Cycle ' + edition.ceremonyCycle, description: winner.workTitle,
        })));
  }
}

const emptyCopy: Partial<Record<HomeFeed, string>> = {
  artwork: 'The public gallery has no artwork yet.',
  auditions: 'There are no open calls listed here.',
  events: 'There are no dates on the public schedule.',
  honors: 'The academy has yet to publish honors.',
  stories: 'There are no published entries here yet.',
  models: 'The agency has yet to publish a roster.',
  roster: 'The company has yet to publish a roster.',
};

function EntryList({ entries, view, onSelectTrack }: {
  entries: Entry[];
  view: HomeDesign['sections'][number]['view'];
  onSelectTrack?: (id: string) => void;
}) {
  if (view === 'gallery') return <div className="ent-home-gallery">
    {entries.map(entry => <figure key={entry.id}>
      <img src={entry.image} alt="" loading="lazy"
        onError={event => { event.currentTarget.hidden = true; }} />
      <figcaption>{entry.title}</figcaption>
    </figure>)}
  </div>;

  return <ul className="ent-home-entries" data-view={view} data-playable={!!onSelectTrack}>
    {entries.map(entry => <li key={entry.id}>
      <div>
        <h3>{entry.title}</h3>
        {entry.description && <p>{entry.description}</p>}
      </div>
      {entry.detail && <small>{entry.detail}</small>}
      {onSelectTrack && <button type="button" className="ent-home-cue"
        aria-label={'Cue ' + entry.title} onClick={() => onSelectTrack(entry.id)}>Cue</button>}
    </li>)}
  </ul>;
}

export function EntertainmentMasthead({ site, action, onAction }: {
  site: EntertainmentSiteMeta;
  action?: string;
  onAction: () => void;
}) {
  const kit = Object.values(brandKits.brandKits).find(brand => 'organizationId' in brand && brand.organizationId === site.orgId);
  const assetIds = Object.values(kit?.assets ?? {});
  const mark = manifest.assets.find(asset => asset.provenance.approvalStatus === 'approved'
    && /^ornament\.(crest|star|monogram|mark|logo)/.test(asset.slotRole)
    && (assetIds.includes(asset.id) || asset.entityIds.includes(site.orgId)));
  return <header className="ent-home-masthead">
    <div className="ent-home-brand">
      <span aria-hidden="true" className="ent-home-monogram">
        {site.name.split(/\s+/).filter(word => word !== 'The').slice(0, 2).map(word => word[0]).join('')}
        {mark && <img src={mark.src} alt="" onError={event => { event.currentTarget.hidden = true; }} />}
      </span>
      <div>
        <small>{site.sector} · {site.seat}</small>
        <h1>{site.name}</h1>
        {action && <p>{site.tagline}</p>}
      </div>
    </div>
    {action && <button type="button" className="ent-home-primary" onClick={onAction}>
      {action}<ArrowRight size={16} aria-hidden="true" />
    </button>}
  </header>;
}

function FeatureImage({ src, alt }: NonNullable<HomeDesign['feature']>) {
  return <figure className="ent-home-feature">
    <img src={src} alt={alt} width={1536} height={1024}
      onError={event => { event.currentTarget.hidden = true; }} />
  </figure>;
}

export function EntertainmentHomepage({ design, labelledBy, isRouted, onSelectTrack, ...props }: HomepageProps & {
  design: HomeDesign;
  labelledBy: string;
  isRouted?: boolean;
  onSelectTrack: (id: string) => void;
}) {
  const feature = design.feature;
  return <div className="ent-home-content" role={isRouted ? "region" : "tabpanel"} aria-labelledby={labelledBy}>
    {feature?.placement === 'campaign' && <FeatureImage {...feature} />}
    <div className="ent-home-sections">
      {design.sections.map(({ title, feed, view }, index) => {
        const entries = getEntries(feed, props).slice(0, view === 'gallery' ? 4 : 5);
        return <section key={title} className="ent-home-section">
          <h2>{title}</h2>
          {feature && ((index === 0 && feature.placement === 'lead')
            || (index === 1 && feature.placement === 'services')) && <FeatureImage {...feature} />}
          {entries.length ? <EntryList entries={entries} view={view} onSelectTrack={feed === 'tracks' ? onSelectTrack : undefined} /> :
            <div className="ent-home-empty">
              {index === 0 && <p>{props.site.description}</p>}
              <p>{emptyCopy[feed] ?? 'There are no published entries yet.'}</p>
            </div>}
        </section>;
      })}
    </div>
  </div>;
}

export function entertainmentHomeStyle(design?: HomeDesign): CSSProperties {
  if (!design) return {};
  const [paper, ink, action] = design.palette;
  return {
    '--ent-home-paper': paper, '--ent-home-ink': ink, '--ent-home-action': action,
  } as CSSProperties;
}

