import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search, Globe, BookOpen, Landmark, Newspaper, Compass } from 'lucide-react';
import { resolveBrowserInput, IN_GAME_PORTALS, BROWSER_HOME, type InGamePortal } from './browserModel';
import { useOSStore } from '../../store/useOSStore';

export interface SearchHomeProps {
  openTab?: (url: string, title?: string) => void;
  navigateTab: (url: string, title?: string) => void;
}
const SECTIONS = ['All websites', 'Education', 'Public services', 'Culture & community', 'Everyday tools'] as const;
type Section = typeof SECTIONS[number];
function sectionFor(portal: InGamePortal): Section {
  if (portal.badge === 'ACADEMIC') return 'Education';
  if (['GOV', 'DEEDS', 'HEALTH', 'SECURE'].includes(portal.badge)) return 'Public services';
  if (['NEWS', 'ARCHIVE', 'SOCIAL', 'CIVIC'].includes(portal.badge)) return 'Culture & community';
  return 'Everyday tools';
}
function SectionIcon({ section }: { section: Section }) {
  const Icon = section === 'Education' ? BookOpen : section === 'Public services' ? Landmark : section === 'Culture & community' ? Newspaper : Globe;
  return <Icon size={18} strokeWidth={1.5} aria-hidden="true" />;
}
export default function SearchHome({ navigateTab, openTab }: SearchHomeProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [section, setSection] = useState<Section>('All websites');
  const visits = useOSStore(s => s.browserState.visits);
  const sites = useMemo(() => IN_GAME_PORTALS.filter(site => site.id !== 'cyacademy'), []);
  const matches = sites.filter(site => (section === 'All websites' || sectionFor(site) === section)
    && `${site.name} ${site.domain} ${site.description}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const recent = visits.filter(visit => visit.url !== BROWSER_HOME && visit.url !== `${BROWSER_HOME}/`).slice(0, 3);
  const visit = (event: React.MouseEvent<HTMLAnchorElement>, site: { url: string; name: string }) => {
    event.preventDefault();
    if ((event.ctrlKey || event.metaKey) && openTab) openTab(site.url, site.name);
    else navigateTab(site.url, site.name);
  };
  return <div className="vn-discovery">
    <header className="vn-discovery-header">
      <a href={BROWSER_HOME} className="vn-wordmark" onClick={event => { event.preventDefault(); navigateTab(BROWSER_HOME); }}>
        <Compass size={23} strokeWidth={1.4} aria-hidden="true" /> versenet<span>Meridion’s public web</span>
      </a>
    </header>
    <section className="vn-discovery-hero" aria-label="Versenet search">
      <span className="vn-section-label">Explore the network</span><h1>Search Meridion.</h1>
      <p>Public records, independent publications, universities, and everyday services.</p>
      <form role="search" onSubmit={event => { event.preventDefault(); if (query.trim()) navigateTab(resolveBrowserInput(query)); }}>
        <Search size={21} strokeWidth={1.6} aria-hidden="true" />
        <input type="search" aria-label="Search VerseNet" placeholder="What would you like to find?" value={query} onChange={event => setQuery(event.target.value)} spellCheck={false} />
        <button type="submit">Search <ArrowRight size={17} aria-hidden="true" /></button>
      </form>
      <div className="vn-search-topics"><span>Start with</span>{['Aureline', 'public archives', 'universities'].map(topic => <button key={topic} onClick={() => navigateTab(resolveBrowserInput(topic))}>{topic} <ArrowUpRight size={12} /></button>)}</div>
    </section>
    <div className="vn-discovery-layout">
      <section className="vn-network-directory" aria-labelledby="vn-directory-title">
        <div className="vn-section-heading"><div><span className="vn-section-label">A place to begin</span><h2 id="vn-directory-title">Around the network</h2></div><span className="vn-result-count" role="status">{matches.length} websites</span></div>
        <div className="vn-directory-tools">
          <div className="vn-directory-sections" role="group" aria-label="Website categories">{SECTIONS.map(item => <button key={item} aria-pressed={section === item} onClick={() => setSection(item)}>{item}</button>)}</div>
          <label className="vn-directory-find"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Find a website" placeholder="Filter by name or subject" value={filter} onChange={event => setFilter(event.target.value)} /></label>
        </div>
        <div className="vn-destination-list">{matches.map(site => <article className="vn-destination-row" key={site.id}>
          <span className="vn-destination-symbol" data-section={sectionFor(site)}><SectionIcon section={sectionFor(site)} /></span>
          <a href={site.url} onClick={event => visit(event, site)}><span className="vn-destination-domain">{site.domain}</span><h3>{site.name}</h3><p>{site.description}</p></a>
          <button className="vn-icon" aria-label={`Open ${site.name} in a new tab`} title="Open in a new tab" onClick={() => openTab ? openTab(site.url, site.name) : navigateTab(site.url, site.name)}><ArrowUpRight size={17} /></button>
        </article>)}</div>
        {!matches.length && <div className="vn-directory-empty"><h3>No websites match that search.</h3><p>Try a broader subject or browse the full directory.</p><button onClick={() => { setFilter(''); setSection('All websites'); }}>Show all websites <ArrowRight size={14} /></button></div>}
      </section>
      <aside className="vn-reading-list" aria-label="Network highlights">
        <span className="vn-section-label">The reading list</span><h2>Worth a visit.</h2>
        <a href="https://dispatch.mer" onClick={event => visit(event, { url: 'https://dispatch.mer', name: 'The Meridion Dispatch' })}><span>News & perspectives</span><h3>The Meridion Dispatch</h3><p>Reporting on the places, institutions, and people shaping daily life.</p><span className="vn-editorial-link">Read the latest edition <ArrowUpRight size={14} /></span></a>
        <a href="https://dawn.edu" onClick={event => visit(event, { url: 'https://dawn.edu', name: 'Dawn University' })}><span>Study in Dawnson</span><h3>A university in the city.</h3><p>Explore Dawn University’s courses, faculty, and collegiate community.</p><span className="vn-editorial-link">Visit Dawn University <ArrowUpRight size={14} /></span></a>
        {recent.length > 0 && <section className="vn-recent-pages"><span className="vn-section-label">Pick up where you left off</span>{recent.map(page => <a key={page.url} href={page.url} onClick={event => visit(event, { url: page.url, name: page.title })}><strong>{page.title}</strong><small>{new URL(page.url).hostname}</small><ArrowUpRight size={14} /></a>)}</section>}
      </aside>
    </div>
    <footer className="vn-discovery-footer"><span>VerseNet · The public web of Meridion</span></footer>
  </div>;
}
