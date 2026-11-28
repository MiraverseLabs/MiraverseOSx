import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { isEduUrl } from './edu/eduRouter';
import { isFaithMedUrl } from './medical/faithMedRouter';
import { isEntertainmentUrl, parseEntertainmentUrl } from './entertainment/entertainmentRouter';
import SearchHome, { NetworkPage } from './SearchHome';
import { DIRECTORY_CATEGORIES, PUBLIC_DIRECTORY } from './verseNetDirectory';
import { WindowTitlebarContent } from '../../components/ui/WindowChrome';
import VerseNetLibrary, { type LibrarySection } from './VerseNetLibrary';
import type { Navigate } from './VerseNetNavigation';
import { NEWS_SITE, isMeridianHost } from './news/newsSite';
import { SOCIAL_REGISTER_SITE } from './publications/socialRegisterModel';
import { BROWSER_HOME, MAX_BROWSER_TABS, resolveBrowserInput, IN_GAME_PORTALS } from './browserModel';
import { externalWebUrl } from './externalWeb';
import ExternalWebPage from './ExternalWebPage';
import OrynvellRecordsSite from './records/OrynvellRecordsSite';
import '../../styles/apps/versenet-browser.css';
import '../../styles/apps/versenet-network.css';
import WebContentPage from './WebContentPage';
import UniversalSearch, { IndexedArchivePage } from './UniversalSearch';
import InteractiveSite from './InteractiveSite';
import { INTERACTIVE_SITES } from './interactiveSites';
import BroadStreetPublicPage from '../investigation/BroadStreetPublicPage';
import AureSuiteApp from './AureSuiteApp';
import { CivinetPortal, QuestNoticePortal } from './Portals';
import {
    DgaPortalView, ShippingPortalView, RoyalHistoryPortalView, VectorNetPortalView
} from './PortalViews';
import { MaiSpacePortal } from './MaiSpacePortal';
import { useOSStore } from '../../store/useOSStore';
import {
    X, Plus, ChevronLeft, ChevronRight, RotateCw, Globe, Home, Star, PanelRight, Search,
    ShieldCheck, Lock, Sparkles, Terminal, Shield, ArrowUpRight, Briefcase, Folder
} from 'lucide-react';

const DispatchNewsSite = lazy(() => import('./news/DispatchNewsSite'));
const SocialRegisterSite = lazy(() => import('./publications/SocialRegisterSite'));
const EduSiteRouter = lazy(() => import('./edu/EduSiteRouter'));
const FaithMedSite = lazy(() => import('./medical/FaithMedSite'));
const BankingWorkspace = lazy(() => import('../banking/BankingWorkspace'));
const EntertainmentSiteRouter = lazy(() => import('./entertainment/EntertainmentSiteRouter'));
const SpeciesRegistry = lazy(() => import('../library/SpeciesRegistry'));

export const QUICK_NAVIGATION_TARGETS = PUBLIC_DIRECTORY.map(p => ({
    domain: p.domain,
    url: p.url,
    title: p.name,
    category: DIRECTORY_CATEGORIES.find(([id]) => id === p.category)?.[1]
}));

function WorkNetAppNotice({ navigateTab }: { navigateTab: (url: string) => void }) {
    return (
        <div className="flex h-full flex-col items-center justify-center bg-[#FAFBFD] text-slate-800 p-8 text-center select-none font-sans">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold mb-4 shadow-xs">
                <Briefcase size={32} />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold mb-2 uppercase">
                Installed OS Desktop Application
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 mb-2">WorkNet is an Installed Application</h2>
            <p className="text-xs text-slate-600 font-mono max-w-md leading-relaxed mb-6">
                WorkNet operates as its own dedicated desktop application in MiraverseOSx, not an in-browser web page. All civic jobs, federal assignments, and work orders are managed through the WorkNet application.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => useOSStore.getState().openAppWorkspace('jobs')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                    <span>Launch WorkNet Desktop App</span>
                    <ArrowUpRight size={14} />
                </button>
                <button
                    onClick={() => navigateTab(BROWSER_HOME)}
                    className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                    Return to Versenet Home
                </button>
            </div>
        </div>
    );
}

function ContentFrame({ url, openTab, navigateTab, atTabLimit }: {
    url: string;
    openTab: Navigate;
    navigateTab: Navigate;
    atTabLimit: boolean;
}) {
    if (!url) return <SearchHome navigateTab={navigateTab} openTab={openTab} atTabLimit={atTabLimit} />;
    const { hostname: domain, pathname, search, searchParams } = new URL(url);
    if (isMeridianHost(domain)) return <Suspense fallback={<p role="status">Connecting to The Meridian…</p>}><DispatchNewsSite url={url} navigateTab={navigateTab}/></Suspense>;
    if ([SOCIAL_REGISTER_SITE.domain, ...SOCIAL_REGISTER_SITE.altDomains].includes(domain as any)) return <Suspense fallback={<p role="status">Opening The Social Register…</p>}><SocialRegisterSite url={url} navigateTab={navigateTab}/></Suspense>;
    if (isEduUrl(url)) return <Suspense fallback={<p role="status">Loading academic portal…</p>}><EduSiteRouter url={url} navigateTab={navigateTab}/></Suspense>;
    if (isFaithMedUrl(url)) return <Suspense fallback={<p role="status">Connecting to Faith Medical…</p>}><FaithMedSite url={url} navigateTab={navigateTab}/></Suspense>;
    if (isEntertainmentUrl(url)) return <Suspense fallback={<p role="status">Connecting to Meridion Entertainment Network…</p>}><EntertainmentSiteRouter url={url} navigateTab={navigateTab}/></Suspense>;
    if (domain === 'firstfederal.aure' && pathname === '/maintenance') return <BroadStreetPublicPage />;
    if (externalWebUrl(url)) return <ExternalWebPage url={url}/>;
    
    const path = pathname + search;
    const site = INTERACTIVE_SITES.find(site => site.domain === domain);
    if (site) return <InteractiveSite site={site} path={path} navigateTab={navigateTab}/>;

    // WorkNet is an installed application, NOT a web page
    if (domain === 'worknet.aure' || (domain === 'versenet.aure' && (path === '/jobs' || path.startsWith('/jobs?')))) {
        return <WorkNetAppNotice navigateTab={navigateTab} />;
    }

    if (domain === 'versenet.aure' || domain === 'versenet' || domain === 'search.aure' || domain === '') {
        if (/^\/find\/?$/.test(pathname)) {
            const query = searchParams.get('q') ?? '';
            const view = searchParams.get('view') || 'All';
            return <UniversalSearch query={query} view={view} navigateTab={navigateTab} openTab={openTab} atTabLimit={atTabLimit} />;
        }
        const page = pathname.replace(/^\/|\/$/g, '');
        if (page === 'directory' || page === 'culture' || page === 'reading') {
            return <NetworkPage page={page} params={searchParams} openTab={openTab} navigateTab={navigateTab} atTabLimit={atTabLimit} />;
        }
        return <SearchHome openTab={openTab} navigateTab={navigateTab} atTabLimit={atTabLimit} />;
    }

    if (domain === 'bank.aure') return <Suspense fallback={<p role="status">Opening Personal Treasury…</p>}><BankingWorkspace /></Suspense>;

    if (domain === 'fieldnotes.aure') {
        if (path.startsWith('/archive/')) return <IndexedArchivePage id={path.split('?')[0].split('/')[2]} navigateTab={navigateTab}/>;
        return <WebContentPage url={url} navigateTab={navigateTab}/>;
    }

    if (domain === 'civinet.mer' || domain === 'civinet.aure' || domain === 'civinet') return <CivinetPortal />;
    if (domain === 'questnotice.mer' || domain === 'questnotice.aure' || domain === 'questnotice') return <QuestNoticePortal />;
    if (domain === 'royalhistory.mer' || domain === 'royalhistory.aure' || domain === 'royalhistory') return <RoyalHistoryPortalView url={url} navigateTab={navigateTab} />;
    if (domain === 'species.mer' || domain === 'species.aure' || domain === 'species') {
        const focusId = searchParams.get('id') || undefined;
        return <Suspense fallback={<p role="status">Loading Meridion Species Registry…</p>}><SpeciesRegistry publicMode={true} initialSpeciesId={focusId} /></Suspense>;
    }
    if (domain === 'dga.gov' || domain === 'dga.gov.aure') return <DgaPortalView url={url} navigateTab={navigateTab} />;
    if (domain === 'records.orynvell.gov') return <OrynvellRecordsSite />;
    if (domain === 'shipping.aure' || domain === 'cargotrack.aure') return <ShippingPortalView url={url} navigateTab={navigateTab} />;
    if (domain.endsWith('.onion') || domain === 'vectornet.aure') return <VectorNetPortalView url={url} navigateTab={navigateTab} />;
    if (domain === 'auresuite.aure') return <AureSuiteApp />;
    if (domain === 'mai.space' || domain === 'mai.space.aure' || domain === 'maispace.aure' || domain === 'social.aure') return <MaiSpacePortal />;

    return (
        <div className="flex h-full flex-col items-center justify-center bg-[#FAFBFD] text-slate-800 p-6 text-center select-none font-sans">
            <Globe className="h-14 w-14 mb-3 text-[#39234f]" />
            <h2 className="text-base font-bold mb-1 text-slate-900">This address is not on Versenet</h2>
            <p className="text-xs text-slate-500 font-mono">{domain} has no published page in the current network. Try searching the site directory.</p>
            <button
                onClick={() => navigateTab(BROWSER_HOME + '/directory')}
                className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
                Browse directory
            </button>
        </div>
    );
}

export default function BrowserApp() {
    const state = useOSStore(s => s.browserState);
    const { tabs, activeTabId, historyMap, bookmarks, visits } = state;
    const openTab = useOSStore(s => s.openBrowserTab);
    const openService = useOSStore(s => s.setBrowserUrl);
    const workspaceRequest = useOSStore(s => s.workspaceRequests.browser);
    
    const closeTab = useOSStore(s => s.closeBrowserTab);
    const activate = useOSStore(s => s.setActiveBrowserTab);
    const navigateTab = useOSStore(s => s.navigateBrowserTab);
    const goBack = useOSStore(s => s.goBrowserBack);
    const goForward = useOSStore(s => s.goBrowserForward);
    const toggleBookmark = useOSStore(s => s.toggleBrowserBookmark);
    const removeBookmark = useOSStore(s => s.removeBrowserBookmark);
    const clearHistory = useOSStore(s => s.clearBrowserHistory);
    const goHome = useOSStore(s => s.goBrowserHome);

    // Only explicit workspace requests change the current page. Consuming a
    // request must not erase an inter-app destination or the restored session.
    useEffect(() => {
        if (!workspaceRequest) return;
        if (workspaceRequest.section === 'home') {
            goHome();
            useOSStore.getState().consumeWorkspaceRequest('browser', workspaceRequest.revision);
        } else if (/^https?:\/\//i.test(workspaceRequest.section)) {
            openService(workspaceRequest.section);
            useOSStore.getState().consumeWorkspaceRequest('browser', workspaceRequest.revision);
        }
    }, [workspaceRequest, openService, navigateTab, goHome]);

    const [addressInput, setAddressInput] = useState('');
    const [panel, setPanel] = useState<LibrarySection | null>(null);
    const [librarySection, setLibrarySection] = useState<LibrarySection>('bookmarks');
    const [compact, setCompact] = useState(false);
    const browserRef = useRef<HTMLDivElement>(null);
    const libraryRef = useRef<HTMLElement>(null);
    const libraryToggleRef = useRef<HTMLButtonElement>(null);
    const libraryCloseRef = useRef<HTMLButtonElement>(null);
    const [filter, setFilter] = useState('');
    const [reload, setReload] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const addressRef = useRef<HTMLInputElement>(null);
    const addressContainerRef = useRef<HTMLDivElement>(null);

    const pageRef = React.useRef<HTMLElement>(null);
    const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

    useEffect(() => { 
        setAddressInput(activeTab.url); 
    }, [activeTab.url, activeTab.id]);

    useEffect(() => { 
        pageRef.current?.scrollTo(0, 0); 
    }, [activeTab.url, activeTab.id, reload]);

    // Close suggestions on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (addressContainerRef.current && !addressContainerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const history = historyMap[activeTabId];
    const saved = bookmarks.some(item => item.url === activeTab.url);
    const entries = (panel === 'history' ? visits : bookmarks).filter(item => `${item.title} ${item.url}`.toLowerCase().includes(filter.toLowerCase()));
    const libraryOpen = panel !== null;
    const closeLibrary = () => {
        setPanel(null);
        libraryToggleRef.current?.focus();
    };
    const selectLibrary = (section: typeof librarySection) => {
        setLibrarySection(section);
        setPanel(section);
        setFilter('');
    };
    useEffect(() => {
        const browser = browserRef.current;
        if (!browser) return;
        const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width <= 1000));
        observer.observe(browser);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (libraryOpen) libraryCloseRef.current?.focus();
    }, [libraryOpen]);

    // Autocomplete filter
    const filteredSuggestions = QUICK_NAVIGATION_TARGETS.filter(target => {
        const query = addressInput.trim().toLowerCase().replace(/^https?:\/\//, '');
        return target.domain.includes(query) || target.title.toLowerCase().includes(query);
    }).slice(0, 8);

    useEffect(() => { setSuggestionIndex(-1); }, [addressInput, activeTabId]);

    const handleBrowserKey = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape' && libraryOpen && !event.defaultPrevented) {
            event.preventDefault();
            closeLibrary();
            return;
        }
        if (compact && libraryOpen && event.key === 'Tab') {
            const controls = Array.from(libraryRef.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], input:not(:disabled)'
            ) ?? []);
            const first = controls[0];
            const last = controls.at(-1);
            if (!libraryRef.current?.contains(document.activeElement)) {
                event.preventDefault();
                first?.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
            return;
        }
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        if (event.key.toLowerCase() === 'l') {
            event.preventDefault();
            if (compact && libraryOpen) closeLibrary();
            addressRef.current?.focus(); addressRef.current?.select();
        } else if (event.key.toLowerCase() === 't' && tabs.length < MAX_BROWSER_TABS) {
            event.preventDefault();
            if (compact && libraryOpen) closeLibrary();
            openTab(BROWSER_HOME);
            setTimeout(() => { addressRef.current?.focus(); addressRef.current?.select(); }, 0);
        } else if (event.key.toLowerCase() === 'w' && tabs.length > 1) {
            event.preventDefault(); closeTab(activeTabId);
        }
    };

    // Determine security badge for current URL
    const currentUrl = activeTab.url || '';
    // One mounted site per pilot tab keeps playback and draft controls alive during site navigation.
    const siteKey = parseEntertainmentUrl(currentUrl)?.site.domain ?? currentUrl;
    const hostname = new URL(currentUrl).hostname;
    const isAureSuite = hostname === 'auresuite.aure';
    const isOnion = hostname.endsWith('.onion') || hostname === 'vectornet.aure';
    const isVerifiedCivic = IN_GAME_PORTALS.some(site => site.domain === hostname && ['GOV', 'SECURE', 'HEALTH', 'ACADEMIC', 'DEEDS', 'ARCHIVE'].includes(site.badge)) || ['dga.gov', 'finance.oryn.gov'].includes(hostname);

    return (
        <div className="versenet-browser" ref={browserRef} onKeyDown={handleBrowserKey}>
            <WindowTitlebarContent><div className="vn-tabs" role="tablist" aria-label="Browser tabs">
                {tabs.map(tab => (
                    <div className={`vn-tab ${tab.id === activeTabId ? 'is-active' : ''} ${tab.groupId ? 'is-grouped' : ''}`} key={tab.id}>
                        <button role="tab" onKeyDown={event => {
                            const at = tabs.findIndex(item => item.id === tab.id);
                            const next = event.key === 'ArrowRight' ? tabs[(at + 1) % tabs.length]
                                : event.key === 'ArrowLeft' ? tabs[(at + tabs.length - 1) % tabs.length] : undefined;
                            if (!next) return;
                            event.preventDefault();
                            activate(next.id);
                            document.getElementById('vn-tab-' + next.id)?.focus();
                        }} aria-selected={tab.id === activeTabId} aria-controls="vn-page" id={`vn-tab-${tab.id}`} onClick={() => activate(tab.id)} title={tab.url}>
                            <Globe size={13}/>
                            <span>{tab.title}</span>
                            {tab.groupId && <span className="vn-tab-group-tag" title="Saved tab group">{state.groups.find(group => group.id === tab.groupId)?.name}</span>}
                        </button>
                        {(tabs.length > 1 || tab.groupId) && (
                            <button className="vn-close" aria-label={`Close ${tab.title} tab`} onClick={() => closeTab(tab.id)}>
                                <X size={13}/>
                            </button>
                        )}
                    </div>
                ))}
                <button className="vn-icon" onClick={() => openTab(BROWSER_HOME)} disabled={tabs.length >= MAX_BROWSER_TABS} aria-label="New tab" title={`New tab (${tabs.length}/${MAX_BROWSER_TABS})`}>
                    <Plus size={16}/>
                </button>
            </div></WindowTitlebarContent>

            <div className="vn-toolbar">
                <button className="vn-icon" onClick={goBack} disabled={!history || history.index === 0} aria-label="Back">
                    <ChevronLeft size={17}/>
                </button>
                <button className="vn-icon" onClick={goForward} disabled={!history || history.index >= history.stack.length - 1} aria-label="Forward">
                    <ChevronRight size={17}/>
                </button>
                <button className="vn-icon" onClick={() => setReload(value => value + 1)} aria-label="Reload page">
                    <RotateCw size={15}/>
                </button>
                <button className="vn-icon vn-home" onClick={goHome} aria-label="Home">
                    <Home size={16}/>
                </button>

                {/* Enhanced Omnibox with Security Badge & Autocomplete Dropdown */}
                <div ref={addressContainerRef} className="vn-address-wrap" onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowSuggestions(false);
                }}>
                    <form 
                        className="vn-address w-full relative" 
                        onSubmit={event => { 
                            event.preventDefault(); 
                            setShowSuggestions(false);
                            if (addressInput.trim()) navigateTab(resolveBrowserInput(addressInput)); 
                        }}
                    >
                        {/* Dynamic Security Badge */}
                        <div className="vn-site-identity" title={isOnion ? 'Private relay' : isAureSuite ? 'AureSuite' : isVerifiedCivic ? 'Listed in the VerseNet directory' : 'Website address'}>
                            {isOnion ? (
                                <Lock size={14} />
                            ) : isAureSuite ? (
                                <Sparkles size={14} />
                            ) : isVerifiedCivic ? (
                                <ShieldCheck size={14} />
                            ) : (
                                <Globe size={14} className="text-slate-500" />
                            )}
                        </div>

                        <input 
                            ref={addressRef}
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={showSuggestions && filteredSuggestions.length > 0}
                            aria-controls={showSuggestions && filteredSuggestions.length > 0 ? 'vn-address-suggestions' : undefined}
                            aria-activedescendant={showSuggestions && filteredSuggestions[suggestionIndex] ? `vn-suggestion-${suggestionIndex}` : undefined}
                            aria-label="Search VerseNet or enter a web address" 
                            value={addressInput} 
                            onChange={event => {
                                setAddressInput(event.target.value);
                                setShowSuggestions(true);
                            }} 
                            onFocus={event => {
                                event.target.select();
                                setShowSuggestions(true);
                            }} 
                            spellCheck={false}
                            onKeyDown={event => {
                                if (event.key === 'Escape' && showSuggestions) { event.preventDefault(); setShowSuggestions(false); setSuggestionIndex(-1); }
                                else if (['ArrowDown', 'ArrowUp'].includes(event.key) && filteredSuggestions.length) {
                                    event.preventDefault(); setShowSuggestions(true);
                                    setSuggestionIndex(index => event.key === 'ArrowDown' ? (index + 1) % filteredSuggestions.length : (index <= 0 ? filteredSuggestions.length - 1 : index - 1));
                                } else if (event.key === 'Enter' && showSuggestions && suggestionIndex >= 0) {
                                    event.preventDefault(); const suggestion = filteredSuggestions[suggestionIndex]; if (suggestion) navigateTab(suggestion.url); setShowSuggestions(false); addressRef.current?.blur();
                                }
                            }}
                        />

                        <button type="button" className={`vn-icon ${saved ? 'is-saved' : ''}`} aria-label={saved ? 'Remove current bookmark' : 'Bookmark this page'} aria-pressed={saved} onClick={toggleBookmark}>
                            <Star size={15} fill={saved ? 'currentColor' : 'none'}/>
                        </button>
                        <button type="submit" className="vn-icon" aria-label="Go to address">
                            <Search size={15}/>
                        </button>
                    </form>

                    {/* Instant Omnibox Autocomplete Dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="vn-suggestions-menu">
                            <div className="vn-suggestions-label">Websites <span>↑ ↓ to browse · Enter to open</span></div>
                            <div id="vn-address-suggestions" role="listbox" aria-label="Website suggestions">
                                {filteredSuggestions.map((target, index) => (
                                    <button
                                        id={`vn-suggestion-${index}`}
                                        role="option"
                                        aria-selected={index === suggestionIndex}
                                        tabIndex={-1}
                                        key={target.url}
                                        type="button"
                                        onClick={() => {
                                            navigateTab(target.url);
                                            setShowSuggestions(false);
                                        }}
                                        className="vn-suggestion-option"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="vn-suggestion-title">
                                                <span>{target.title}</span>
                                                <span className="vn-suggestion-category">
                                                    {target.category}
                                                </span>
                                            </div>
                                            <div className="vn-suggestion-url">{target.domain}</div>
                                        </div>
                                        <ArrowUpRight size={14} className="text-slate-400 ml-2 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button className="vn-icon vn-library-toggle" ref={libraryToggleRef}
                    aria-label="Browser library" aria-expanded={libraryOpen} aria-controls="vn-library"
                    onClick={() => libraryOpen ? closeLibrary() : selectLibrary(librarySection)}>
                    <PanelRight size={18} />
                </button>
            </div>

            <div className="vn-body">
                <main ref={pageRef} inert={compact && libraryOpen} id="vn-page" role="tabpanel" aria-labelledby={`vn-tab-${activeTabId}`} className="vn-page">
                    <ContentFrame key={`${activeTabId}:${siteKey}:${reload}`} url={activeTab.url} openTab={openTab} atTabLimit={tabs.length >= MAX_BROWSER_TABS} navigateTab={navigateTab}/>
                </main>
                {panel && (
                    <div className="vn-library-backdrop" aria-hidden="true" onClick={closeLibrary} />
                )}
                {panel && (
                    <VerseNetLibrary libraryRef={libraryRef} closeRef={libraryCloseRef} section={panel}
                        compact={compact} filter={filter} setFilter={setFilter} entries={entries}
                        hasHistory={visits.length > 0} selectSection={selectLibrary} onClose={closeLibrary}
                        clearHistory={clearHistory} removeBookmark={removeBookmark} onNavigate={navigateTab} />
                )}
            </div>
            <footer className="vn-status">
                <span>{hostname}</span>
                <span>{externalWebUrl(activeTab.url) ? 'External website' : 'VerseNet'} <span className="vn-key-hint">· Ctrl / ⌘ L to enter an address</span></span>
            </footer>
        </div>
    );
}
