import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Disc3, House, Info, LibraryBig, Newspaper, Scissors } from 'lucide-react';
import type { EntertainmentState } from '../../../gameplay/EntertainmentEcosystem';
import { entertainmentUrl, parseEntertainmentUrl, type EntertainmentView } from './entertainmentRouter';
import './entertainment-pilots.css';

type PilotRoute = NonNullable<ReturnType<typeof parseEntertainmentUrl>>;

export function EntertainmentSiteLink({ href, navigate, children, current, id }: {
  href: string;
  navigate: (url: string) => void;
  children: ReactNode;
  current?: boolean;
  id?: string;
}) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    navigate(href);
  }

  return <a href={href} onClick={open} aria-current={current ? 'page' : undefined} id={id}>{children}</a>;
}

export function PilotNavigation({ route, homeId, navigate }: {
  route: PilotRoute;
  homeId: string;
  navigate: (url: string) => void;
}) {
  const { site, pilot, view } = route;
  const primary = { library: Disc3, editorial: Newspaper, stadium: CalendarDays, atelier: Scissors }[pilot.layout];
  const icons = { home: House, front: primary, workspace: ArrowUpRight, directory: LibraryBig, about: Info };
  const navLabels = { library: 'Songbird library', editorial: 'Limelight sections', stadium: 'Stadium visitor information', atelier: 'Atelier navigation' };
  return <nav className="ent-pilot-nav" aria-label={navLabels[pilot.layout]}>
    {(Object.keys(pilot.views) as EntertainmentView[]).map(key => {
      const Icon = icons[key];
      return <EntertainmentSiteLink key={key} href={entertainmentUrl(site, key)} navigate={navigate}
        current={key === view} id={key === 'home' ? homeId : undefined}>
        <Icon size={15} aria-hidden="true" /><span>{pilot.views[key].label}</span>
      </EntertainmentSiteLink>;
    })}
  </nav>;
}

export function LimelightStories({ route, stories, navigate }: {
  route: PilotRoute;
  stories: EntertainmentState['mediaItems'];
  navigate: (url: string) => void;
}) {
  const published = stories.filter(story => story.orgId === route.site.orgId).sort((a, b) => b.cycle - a.cycle);
  const indexUrl = entertainmentUrl(route.site, 'front');
  const storyId = route.params.get('story');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (storyId !== null) heading.current?.focus({ preventScroll: true });
  }, [storyId]);
  if (storyId !== null) {
    const story = published.find(item => item.mediaId === storyId);
    return <article className="ent-limelight-reader ent-pilot-feature" aria-labelledby="limelight-story-title">
      <EntertainmentSiteLink href={indexUrl} navigate={navigate}><ArrowLeft size={15} aria-hidden="true" /> All stories</EntertainmentSiteLink>
      <h2 ref={heading} id="limelight-story-title" tabIndex={-1}>{story?.headline ?? 'Story unavailable'}</h2>
      {story ? <><p className="ent-pilot-meta">{story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}</p><p>{story.summary}</p></> :
        <p>This story could not be found in the published Limelight edition.</p>}
    </article>;
  }

  return <section className="ent-limelight-index ent-pilot-feature">
    <h2>The Greenroom & Cover Dispatch</h2>
    {published.length ? <ul>{published.map(story => (
      <li key={story.mediaId}>
        <p className="ent-pilot-meta">{story.kind.replaceAll('_', ' ')} · Cycle {story.cycle}</p>
        <h3><EntertainmentSiteLink href={entertainmentUrl(route.site, 'front', new URLSearchParams({ story: story.mediaId }))} navigate={navigate}>{story.headline}</EntertainmentSiteLink></h3>
        <p>{story.summary}</p>
      </li>
    ))}</ul> : <p>There are no published stories in this edition.</p>}
  </section>;
}

const stadiumSections = {
  concourse: { label: 'Concourse', description: 'The outer level provides an overview of the full arena.', path: 'M 58 22 H 202 Q 235 22 235 56 V 160 Q 235 194 202 194 H 58 Q 25 194 25 160 V 56 Q 25 22 58 22 Z' },
  'lower-ring': { label: 'Lower Ring', description: 'The lower level wraps around the main floor.', path: 'M 67 53 H 193 Q 205 53 205 65 V 150 Q 205 162 193 162 H 67 Q 55 162 55 150 V 65 Q 55 53 67 53 Z' },
  'club-box': { label: 'Club Box', description: 'The club boxes sit alongside the arena floor.', path: 'M 76 80 H 184 V 106 H 76 Z' },
} as const;

export function StadiumSections({ route, navigate }: { route: PilotRoute; navigate: (url: string) => void }) {
  const choices = Object.entries(stadiumSections);
  const selection = choices.find(([key]) => key === route.params.get('section')) ?? choices[0];
  return <aside className="ent-seating-guide ent-pilot-feature" aria-label="Stadium seating guide">
    <h2>Explore the stadium</h2>
    <svg role="img" aria-label="Schematic of the Silverleaf Stadium seating levels" viewBox="0 0 260 216">
      {choices.map(([id, section]) => <path key={id} d={section.path} className={id === selection[0] ? 'is-selected' : undefined} />)}
      <text x="130" y="138" textAnchor="middle">Arena floor</text>
    </svg>
    <div className="ent-seating-options">
      {choices.map(([id, section]) =>
        <EntertainmentSiteLink key={id} href={entertainmentUrl(route.site, 'front', new URLSearchParams({ section: id }))}
          navigate={navigate} current={id === selection[0]}>{section.label}</EntertainmentSiteLink>,
      )}
    </div>
    <p><strong>{selection[1].label}.</strong> {selection[1].description}</p>
    <p className="ent-pilot-meta">Section guide only. Choose an event and quantity at the box office.</p>
  </aside>;
}

