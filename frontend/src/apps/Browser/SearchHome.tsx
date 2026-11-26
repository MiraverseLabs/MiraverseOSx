import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Globe, Landmark, Music2, Search } from 'lucide-react';
import { BROWSER_HOME, resolveBrowserInput } from './browserModel';
import { ENTERTAINMENT_SITES } from './entertainment/entertainmentRouter';
import { directoryURL, directoryView, DIRECTORY_CATEGORIES, PUBLIC_DIRECTORY } from './verseNetDirectory';
import { VerseNetLink, VerseNetNavigation, type Navigate, type VerseNetPage } from './VerseNetNavigation';
import { useOSStore } from '../../store/useOSStore';

interface PageProps {
  navigateTab: Navigate;
  openTab?: Navigate;
  atTabLimit?: boolean;
}

const cultureURL = BROWSER_HOME + '/culture';
const readingURL = BROWSER_HOME + '/reading';
const cityImage = '/images/wallpapers/aureline-glassline-twilight.png';
const readingSites = ['meridian.mer', 'socialregister.mer', 'readingroom.aure', 'royalhistory.mer'];
const cultureGroups = [
  ['Music and talent', 'Music, Talent & Management'],
  ['Broadcasting and streaming', 'Broadcasting & Streaming'],
  ['Fashion and modeling', 'Fashion, Modeling & Visuals'],
  ['Screen and dance', 'Dance, Screen & Stage'],
  ['Live events and venues', 'Live Events & Venues'],
  ['Media and recognition', 'Media & Recognition'],
  ['Professional services', 'Representation, PR & Rights'],
] as const;

type LinkedSite = { name: string; domain: string; url: string; description: string };

function SiteRow({ site, navigateTab, openTab, atTabLimit, mark }: PageProps & {
  site: LinkedSite;
  mark?: React.ReactNode;
}) {
  return <article className="vn-destination-row">
    <VerseNetLink url={site.url} navigate={navigateTab} openTab={openTab}>
      {mark}
      <div className="vn-destination-copy">
        <strong>{site.name}</strong><small>{site.domain}</small>
        <p>{site.description}</p>
      </div>
    </VerseNetLink>
    {openTab && <button type="button" className="vn-icon" aria-label={'Open ' + site.name + ' in a new tab'}
      disabled={atTabLimit} onClick={() => openTab(site.url)}><ArrowUpRight size={16} aria-hidden="true" /></button>}
  </article>;
}

function SiteLinks({ domains, ...props }: PageProps & { domains: string[] }) {
  return <div className="vn-site-links">{domains.map(domain => {
    const site = PUBLIC_DIRECTORY.find(item => item.domain === domain);
    return site && <SiteRow key={domain} site={site} {...props} />;
  })}</div>;
}

export default function SearchHome(props: PageProps) {
  const { navigateTab, openTab } = props;
  const [query, setQuery] = useState('');
  const [showImage, setShowImage] = useState(true);
  const visits = useOSStore(s => s.browserState.visits);
  const recent = visits.filter(visit => visit.url !== BROWSER_HOME && visit.url !== BROWSER_HOME + '/').slice(0, 4);

  return <div className="vn-network vn-discovery">
    <VerseNetNavigation page="discover" navigate={navigateTab} openTab={openTab} />
    <div className="vn-network-inner">
      <section className="vn-discovery-hero" aria-label="VerseNet search">
        <h1>Search Meridion.</h1>
        <p>Meridion’s public web, from neighborhood guides to the arts and archives.</p>
        <form role="search" onSubmit={event => {
          event.preventDefault();
          if (query.trim()) navigateTab(resolveBrowserInput(query));
        }}>
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="Search VerseNet" placeholder="Search the network" value={query}
            maxLength={512} onChange={event => setQuery(event.target.value)} spellCheck={false} />
          <button type="submit">Search <ArrowRight size={17} aria-hidden="true" /></button>
        </form>
        <div className="vn-search-topics" aria-label="Suggested searches">
          {['Aureline', 'public archives', 'Marlie Records'].map(topic =>
            <VerseNetLink key={topic} url={resolveBrowserInput(topic)} navigate={navigateTab}>{topic}</VerseNetLink>)}
        </div>
      </section>

      <section className="vn-feature-grid" aria-label="Featured destinations">
        <VerseNetLink className="vn-feature vn-feature-main" url={cultureURL} navigate={navigateTab} openTab={openTab}>
          {showImage && <img src={cityImage} alt="" onError={() => setShowImage(false)} />}
          <div><span>Glassline District</span><h2>Explore Meridion’s creative scene</h2>
            <p>Find the labels, studios, and stages behind the work.</p><ArrowUpRight size={24} aria-hidden="true" /></div>
        </VerseNetLink>
        <div className="vn-feature-links">
          <SiteLinks {...props} domains={['meridian.mer', 'gardenreview.aure']} />
        </div>
      </section>

      <section className="vn-home-section">
        <header><h2>Arts and entertainment</h2><VerseNetLink url={cultureURL} navigate={navigateTab}>Explore arts and culture <ArrowRight size={16} /></VerseNetLink></header>
        <div className="vn-culture-strip">{['ORG_SONGBIRD', 'ORG_POP_STICKER', 'ORG_LIMELIGHT', 'ORG_MARLIE_RECORDS'].map(id => {
          const site = ENTERTAINMENT_SITES.find(item => item.orgId === id);
          return site && <SiteRow key={id} site={site} {...props}
            mark={<span className="vn-brand-dot" style={{ backgroundColor: site.accentColor }} />} />;
        })}</div>
      </section>

      <section className="vn-home-section">
        <header><h2>Places and everyday services</h2></header>
        <SiteLinks {...props} domains={['companion.aure', 'civinet.mer', 'bank.aure', 'dawn.edu']} />
      </section>

      <section className="vn-home-section">
        <header><h2>Reading across Meridion</h2><VerseNetLink url={readingURL} navigate={navigateTab}>See reading destinations <ArrowRight size={16} /></VerseNetLink></header>
        <SiteLinks {...props} domains={readingSites.slice(1, 3)} />
      </section>

      {recent.length > 0 && <section className="vn-home-section">
        <header><h2>Recently visited</h2></header>
        <ul className="vn-recent-links">{recent.map(item => <li key={item.url}><VerseNetLink url={item.url}
          navigate={navigateTab} openTab={openTab}>{item.title}</VerseNetLink></li>)}</ul>
      </section>}
      <footer className="vn-discover-footer"><VerseNetLink url={directoryURL()} navigate={navigateTab}>
        Browse the full directory <ArrowRight size={18} aria-hidden="true" />
      </VerseNetLink></footer>
    </div>
  </div>;
}

export function NetworkPage({ page, params, ...props }: PageProps & {
  page: Exclude<VerseNetPage, 'discover' | 'search'>;
  params: URLSearchParams;
}) {
  const { navigateTab, openTab } = props;
  const { category, filter, matches } = directoryView(params);
  const [draft, setDraft] = useState(filter);
  const title = page === 'directory' ? 'Website directory' : page === 'culture' ? 'Arts and culture' : 'Reading across Meridion';
  return <div className="vn-network">
    <VerseNetNavigation page={page} navigate={navigateTab} openTab={openTab} />
    <div className="vn-network-inner vn-index">
      <h1>{title}</h1>
      {page === 'directory' && <div className="vn-index-layout">
        <nav className="vn-directory-sections" aria-label="Website categories">
          {DIRECTORY_CATEGORIES.map(([id, label]) => <VerseNetLink key={id} url={directoryURL(id, filter)}
            current={category === id} navigate={navigateTab}>{label}</VerseNetLink>)}
        </nav>
        <section className="vn-directory-results" aria-label="Directory results">
          <form className="vn-directory-find" role="search" onSubmit={event => {
            event.preventDefault();
            navigateTab(directoryURL(category, draft));
          }}>
            <Search size={17} aria-hidden="true" /><input type="search" aria-label="Find a website" placeholder="Filter by name, domain, or subject"
              maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} />
            <button type="submit">Filter</button>
          </form>
          <p role="status" className="vn-result-count">{matches.length} {matches.length === 1 ? 'website' : 'websites'}</p>
          {matches.map(site => <SiteRow key={site.domain} site={site} {...props}
            mark={<span className="vn-destination-symbol" aria-hidden="true">{site.category === 'arts' ? <Music2 size={16} /> :
              site.category === 'services' ? <Landmark size={16} /> : <Globe size={16} />}</span>} />)}
          {!matches.length && <div className="vn-directory-empty"><h2>No websites match that search.</h2>
            <p>Try a broader subject or browse the full directory.</p>
            <VerseNetLink url={directoryURL()} navigate={navigateTab}>Show all websites <ArrowRight size={15} /></VerseNetLink>
          </div>}
        </section>
      </div>}
      {page === 'culture' && <><p className="vn-index-intro">Explore the people and organizations behind music, fashion, film, and live performance.</p>
        {cultureGroups.map(([label, sector]) => <section className="vn-home-section" key={sector}>
          <header><h2>{label}</h2></header>
          <div className="vn-culture-grid">{ENTERTAINMENT_SITES.filter(site => site.sector === sector).map(site =>
            <SiteRow key={site.orgId} site={site} {...props}
              mark={<span className="vn-brand-dot" style={{ backgroundColor: site.accentColor }} />} />)}</div>
        </section>)}</>}
      {page === 'reading' && <><p className="vn-index-intro">Newspapers, magazines, and public collections.</p>
        <div className="vn-reading-features">
          {[
            ['meridian.mer', '/media/brands/meridian-masthead.svg'],
            ['socialregister.mer', '/media/brands/social-register-masthead.svg'],
          ].map(([domain, asset]) => {
            const site = PUBLIC_DIRECTORY.find(item => item.domain === domain);
            return site && <SiteRow key={domain} site={site} {...props}
              mark={<img src={asset} alt="" onError={event => { event.currentTarget.hidden = true; }} />} />;
          })}
        </div>
        <section className="vn-home-section"><header><h2>Public collections</h2></header>
          <SiteLinks {...props} domains={readingSites.slice(2)} />
          <p className="vn-archive-link"><VerseNetLink url={BROWSER_HOME + '/find?q=archives&view=Archives'} navigate={navigateTab}>Search archive records <ArrowRight size={16} /></VerseNetLink></p>
        </section></>}
    </div>
  </div>;
}
