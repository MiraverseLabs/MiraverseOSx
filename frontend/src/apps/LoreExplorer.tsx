import AcademicProjectDesk from './academic/AcademicProjectDesk';
import React, { useEffect, useState } from 'react';
import { miraverseDb } from '../db/miraverseDb';
import { useOSStore } from '../store/useOSStore';
import { OPPORTUNITIES } from '../gameplay/AssignmentFlow';
import { isOpportunityRevealed } from '../gameplay/ProgressionEngine';
import { ALL_SHRINE_REGIONS } from '../data/notices';
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  CreditCard,
  FilePlus2,
  FolderDown,
  Library,
  MapPin,
  Quote,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import WorldJournalPanel from './WorldJournalPanel';
import SevenRealmsMapPanel from './SevenRealmsMapPanel';
import CelestialChronologyPanel from './CelestialChronologyPanel';
import {
  LIBRARY_AUTHORS,
  LIBRARY_BRANCHES,
  LIBRARY_CARD_TIERS,
  LIBRARY_CATALOG,
  LIBRARY_GUIDES,
  formatArchivalCitation,
  type LibraryCardTier,
  type LibraryCatalogItem,
} from './library/libraryModel';
import '../styles/apps/RoyalLibrary.css';

type PortalTab = 'dashboard' | 'catalog' | 'guides' | 'card' | 'collections';
type CollectionSubTab = 'realms' | 'chronology' | 'exploration' | 'factions' | 'locations' | 'npcs' | 'academic-projects';
type GuideFilterMode = 'all' | 'subject' | 'type' | 'curator';

export default function LoreExplorer() {
  const [portalTab, setPortalTab] = useState<PortalTab>('dashboard');
  const [activeCollection, setActiveCollection] = useState<CollectionSubTab>('realms');
  const [factions, setFactions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [npcs, setNPCs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Catalog filters
  const [catalogQuery, setCatalogQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [sortCatalog, setSortCatalog] = useState<'relevance' | 'citations'>('relevance');
  const [citationPreview, setCitationPreview] = useState<string | null>(null);
  const [citeMissionId, setCiteMissionId] = useState<string>('');

  // Guides filters
  const [guideMode, setGuideMode] = useState<GuideFilterMode>('all');
  const [guideQuery, setGuideQuery] = useState('');

  const player = useOSStore(s => s.gameplay.player);
  const identity = useOSStore(s => s.gameplay.identity);
  const library = useOSStore(s => s.library);
  const libraryAction = useOSStore(s => s.libraryAction);
  const discoveredShrines = player?.discoveredShrines || [];
  const discoverRegionalShrine = useOSStore(s => s.discoverRegionalShrine);
  const availableMissions = OPPORTUNITIES.filter(o => isOpportunityRevealed(o.id, player) && !o.unlock);
  const activeCiteMissionId =
    citeMissionId ||
    availableMissions.find(o => player?.worknetOrders?.[o.id]?.status === 'active')?.id ||
    player?.assignmentJournal?.selectedId ||
    availableMissions[0]?.id ||
    'ms-spec-03';

  const handleCiteVolumeToMission = (item: LibraryCatalogItem) => {
    const res = useOSStore.getState().citeInstitutionalEvidence({
      missionId: activeCiteMissionId,
      sourceSystem: 'royal-library',
      recordId: item.id,
      title: item.title,
      referenceCode: item.callNumber,
      custodian: 'Royal Archive & Library',
      citationText: formatArchivalCitation(item),
      excerpt: item.tldr || item.abstract,
      certified: item.restrictedTier !== 'citizen',
    });
    setNotice(res.message);
  };
  const journalRequest = player.worldJournal?.openRequest;
  const workspaceRequest = useOSStore(state => state.workspaceRequests['lore']);

  // Card issuance form state
  const [cardHolderName, setCardHolderName] = useState(library.card?.holderName || player?.name || 'Citizen Reader');
  const [cardMaid, setCardMaid] = useState(library.card?.maid || identity?.maid || 'MAID-OR-00481926');
  const [cardBranch, setCardBranch] = useState<string>(library.card?.homeBranch || LIBRARY_BRANCHES[0]);
  const [cardTier, setCardTier] = useState<LibraryCardTier>(library.card?.tier || 'citizen');
  const [reflectionsDraft, setReflectionsDraft] = useState(library.reflections || '');

  useEffect(() => {
    if (journalRequest) {
      setPortalTab('collections');
      setActiveCollection('exploration');
    }
  }, [journalRequest]);

  useEffect(() => {
    if (workspaceRequest?.section) {
      if (['realms', 'chronology', 'exploration', 'factions', 'locations', 'npcs', 'academic-projects'].includes(workspaceRequest.section)) {
        setPortalTab('collections');
        setActiveCollection(workspaceRequest.section as CollectionSubTab);
      } else if (['dashboard', 'catalog', 'guides', 'card'].includes(workspaceRequest.section)) {
        setPortalTab(workspaceRequest.section as PortalTab);
      }
      useOSStore.getState().consumeWorkspaceRequest('lore', workspaceRequest.revision);
    }
  }, [workspaceRequest]);

  const loadData = () => {
    setLoading(true);
    setFactions(miraverseDb.getFactions());
    setLocations(miraverseDb.getRegions());
    setNPCs(miraverseDb.getNPCs());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueCard = (event: React.FormEvent) => {
    event.preventDefault();
    const res = libraryAction('issueCard', {
      holderName: cardHolderName,
      maid: cardMaid,
      homeBranch: cardBranch,
      tier: cardTier,
    });
    setNotice(res.message);
  };

  const handleSaveCardToFylo = () => {
    if (!library.card) return;
    const c = library.card;
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `library-card:${c.cardNumber}`,
      name: `Royal_Library_Card_${c.cardNumber}.doc`,
      desc: `${c.tierLabel} · ${c.homeBranch}`,
      body: `ROYAL HISTORIC SOCIETY & MERIDION PUBLIC ARCHIVES\nOFFICIAL LIBRARY PATRON CARD\n\nCard Number: ${c.cardNumber}\nPatron: ${c.holderName}\nMAID: ${c.maid}\nTier: ${c.tierLabel} (Limit: ${c.borrowLimit} active loans)\nHome Branch: ${c.homeBranch}\nIssued Cycle: ${c.issuedCycle}\nStatus: ${c.status}`,
      dir: '/documents',
      publisher: 'Royal Historic Society · Library Desk',
      origin: 'fylo',
    });
    setNotice(res.message || 'Saved library card copy to Fylo (/documents).');
  };

  const handleSaveVolumeToFylo = (item: LibraryCatalogItem) => {
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `library-vol:${item.id}`,
      name: `${item.callNumber}.${item.format}`,
      desc: `${item.title} (${item.collection})`,
      body: `${item.title}\nAuthors: ${item.authors.join(', ')}\nYear: ${item.year}\nCall No.: ${item.callNumber}\n\nTLDR: ${item.tldr}\n\nAbstract:\n${item.abstract}\n\nCitation: ${formatArchivalCitation(item)}`,
      dir: '/documents',
      publisher: item.collection,
      origin: 'fylo',
    });
    setNotice(res.message || `Saved ${item.callNumber}.${item.format} to Fylo.`);
  };

  const handleSaveReflectionsToFylo = () => {
    libraryAction('saveReflections', { text: reflectionsDraft });
    const res = useOSStore.getState().fyloAction('createNote', {
      name: 'Royal_Archive_Reading_Notes.note',
      desc: 'Personal reading reflections from the Royal Historic Archive',
      body: reflectionsDraft || 'Reading notes.',
      dir: '/notes',
      ext: 'note',
    });
    setNotice(res.message || 'Reflections saved to Fylo (/notes).');
  };

  // Filtered scholarly catalog
  const fields = [...new Set(LIBRARY_CATALOG.map(i => i.field))];
  const filteredCatalog = LIBRARY_CATALOG.filter(item => {
    const q = catalogQuery.trim().toLowerCase();
    const matchesQ =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.tldr.toLowerCase().includes(q) ||
      item.callNumber.toLowerCase().includes(q) ||
      item.authors.some(a => a.toLowerCase().includes(q));
    const matchesField = fieldFilter === 'all' || item.field === fieldFilter;
    const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
    const matchesAuthor = authorFilter === 'all' || item.authors.includes(authorFilter);
    return matchesQ && matchesField && matchesFormat && matchesAuthor;
  }).sort((a, b) => (sortCatalog === 'citations' ? b.citations - a.citations : 0));

  // Filtered library guides
  const filteredGuides = LIBRARY_GUIDES.filter(g => {
    const q = guideQuery.trim().toLowerCase();
    return (
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.subject.toLowerCase().includes(q) ||
      g.curator.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (guideMode === 'subject') return a.subject.localeCompare(b.subject);
    if (guideMode === 'type') return a.type.localeCompare(b.type);
    if (guideMode === 'curator') return a.curator.localeCompare(b.curator);
    return a.title.localeCompare(b.title);
  });

  const goalPct = Math.min(100, Math.round((library.completedIds.length / Math.max(1, library.readingGoal)) * 100));
  const ringCircumference = 2 * Math.PI * 38;
  const ringOffset = ringCircumference * (1 - goalPct / 100);

  return (
    <div className="royal-library">
      {/* Top Institutional Breadcrumb & Card Strip */}
      <div className="rl-top-strip">
        <div className="rl-breadcrumbs">
          <strong>Royal Historic Society</strong>
          <span>/</span>
          <span>Meridion Public Archives</span>
          <span>/</span>
          <span>Library & Research Portal</span>
        </div>
        <button
          type="button"
          className="rl-card-pill"
          data-issued={Boolean(library.card)}
          onClick={() => setPortalTab('card')}
        >
          <CreditCard size={13} />
          {library.card ? `${library.card.cardNumber} · ${library.card.tierLabel}` : 'Issue Library Card'}
        </button>
      </div>

      {/* Navy & Gold Institutional Navigation Bar */}
      <nav className="rl-nav-bar" aria-label="Royal Archive and Library navigation">
        <div className="rl-nav-tabs">
          <button type="button" aria-current={portalTab === 'dashboard' ? 'page' : undefined} onClick={() => setPortalTab('dashboard')}>
            <BookOpen size={14} /> Dashboard
          </button>
          <button type="button" aria-current={portalTab === 'catalog' ? 'page' : undefined} onClick={() => setPortalTab('catalog')}>
            <Search size={14} /> Research Catalog
          </button>
          <button type="button" aria-current={portalTab === 'guides' ? 'page' : undefined} onClick={() => setPortalTab('guides')}>
            <Library size={14} /> Library Guides
          </button>
          <button type="button" aria-current={portalTab === 'card' ? 'page' : undefined} onClick={() => setPortalTab('card')}>
            <CreditCard size={14} /> Library Card
          </button>
          <button type="button" aria-current={portalTab === 'collections' ? 'page' : undefined} onClick={() => setPortalTab('collections')}>
            <MapPin size={14} /> Collections & Atlas
          </button>
        </div>
        <button type="button" className="rl-refresh-btn" onClick={loadData} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </nav>

      {notice && (
        <div className="rl-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      <main className="rl-main">
        {/* === TAB 1: READER DASHBOARD === */}
        {portalTab === 'dashboard' && (
          <>
            <header className="rl-journal-banner">
              <h1>THE ROYAL HISTORIC ARCHIVE</h1>
              <p>Meridion Public Archives · Aureline Reading & Research Universe</p>
            </header>

            <div className="rl-dashboard-grid">
              {/* Left Literary Rail */}
              <aside className="rl-dash-rail">
                <div className="rl-rail-label">CURRENT READS</div>
                <button type="button" onClick={() => setPortalTab('catalog')}>
                  <Search size={14} /> Browse Catalog
                </button>
                <button type="button" onClick={() => setPortalTab('guides')}>
                  <Library size={14} /> Research Guides
                </button>
                <button type="button" onClick={() => setPortalTab('card')}>
                  <CreditCard size={14} /> {library.card ? 'My Library Card' : 'Issue Library Card'}
                </button>

                <div className="rl-rail-label">COLLECTIONS</div>
                <button type="button" onClick={() => { setPortalTab('collections'); setActiveCollection('academic-projects'); }}>
                  <BookOpen size={14} /> Assigned Reading
                </button>
                <button type="button" onClick={() => { setPortalTab('collections'); setActiveCollection('realms'); }}>
                  <MapPin size={14} /> Eight Realms Atlas
                </button>
                <button type="button" onClick={() => { setPortalTab('collections'); setActiveCollection('chronology'); }}>
                  <Sparkles size={14} /> Twin Moons & Era
                </button>
                <button type="button" onClick={() => { setPortalTab('collections'); setActiveCollection('factions'); }}>
                  <Shield size={14} /> Color Houses ({factions.length})
                </button>
                <button type="button" onClick={() => { setPortalTab('collections'); setActiveCollection('npcs'); }}>
                  <Users size={14} /> People & Monarchs ({npcs.length})
                </button>
              </aside>

              {/* Center Column: Currently Reading, Quote, Reflections */}
              <div className="rl-dash-center">
                <section className="rl-dash-card">
                  <div className="rl-card-kicker">
                    <span>Currently Reading ({library.loans.length})</span>
                    <button type="button" className="rl-btn-sm" style={{ flex: 'none' }} onClick={() => setPortalTab('catalog')}>
                      + Check Out Volume
                    </button>
                  </div>
                  {library.loans.length === 0 ? (
                    <p style={{ margin: 0, color: '#6b6257', fontSize: '0.82rem' }}>
                      {library.card
                        ? 'No volumes currently checked out. Visit the Research Catalog to borrow manuscripts or monographs.'
                        : 'Issue your Royal Library Card first to borrow volumes from the archive.'}
                    </p>
                  ) : (
                    <div className="rl-book-gallery">
                      {library.loans.map(loan => {
                        const item = LIBRARY_CATALOG.find(i => i.id === loan.itemId);
                        if (!item) return null;
                        return (
                          <article key={loan.itemId} className="rl-book-card">
                            <div className="rl-book-cover" data-tone={item.coverTone}>
                              <span>{item.callNumber}</span>
                              <strong>{item.title}</strong>
                            </div>
                            <div className="rl-progress-bar" aria-label={`Reading progress ${loan.progress}%`}>
                              <span style={{ width: `${loan.progress}%` }} />
                            </div>
                            <small style={{ color: '#6c6152', fontSize: '0.7rem' }}>
                              {loan.progress}% read · Due Cycle {loan.dueCycle}
                            </small>
                            <div className="rl-book-actions">
                              <button
                                type="button"
                                className="rl-btn-sm rl-btn-navy"
                                onClick={() => setNotice(libraryAction('read', { itemId: item.id, delta: 35 }).message)}
                              >
                                Read +35%
                              </button>
                              <button
                                type="button"
                                className="rl-btn-sm"
                                onClick={() => setNotice(libraryAction('return', { itemId: item.id }).message)}
                              >
                                Return
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <blockquote className="rl-quote-card">
                  <Quote size={16} style={{ marginBottom: 4, opacity: 0.6 }} />
                  <div>“Meridion endures through what it remembers with honesty—not merely what is sealed behind marble.”</div>
                  <footer>— Archivist Veyra Solenne, Royal Historic Society</footer>
                </blockquote>

                <section className="rl-dash-card">
                  <div className="rl-card-kicker">
                    <span>Notes & Reading Reflections</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="rl-btn-sm"
                        style={{ flex: 'none' }}
                        onClick={() => setNotice(libraryAction('saveReflections', { text: reflectionsDraft }).message)}
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        className="rl-btn-sm rl-btn-navy"
                        style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={handleSaveReflectionsToFylo}
                      >
                        <FilePlus2 size={12} /> Save to Fylo
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="rl-notes-area"
                    value={reflectionsDraft}
                    onChange={e => setReflectionsDraft(e.target.value)}
                    placeholder="Write research notes, citations, or archival observations…"
                  />
                </section>
              </div>

              {/* Right Column: Reading Progress Ring, Stats, Saved Reading List */}
              <div className="rl-dash-right">
                <section className="rl-dash-card rl-ring-wrap">
                  <div className="rl-card-kicker" style={{ width: '100%' }}>
                    <span>Reading Progress</span>
                  </div>
                  <svg width="96" height="96" viewBox="0 0 96 96" aria-label={`${goalPct}% of reading goal completed`}>
                    <circle cx="48" cy="48" r="38" fill="none" stroke="#e6dfd2" strokeWidth="9" />
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      fill="none"
                      stroke="#0b2545"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      transform="rotate(-90 48 48)"
                    />
                    <text x="48" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0b2545">
                      {goalPct}%
                    </text>
                    <text x="48" y="61" textAnchor="middle" fontSize="9" fill="#6b6257">
                      Completed
                    </text>
                  </svg>
                  <small style={{ color: '#6b6257' }}>
                    {library.completedIds.length} of {library.readingGoal} archive volumes finished
                  </small>
                </section>

                <section className="rl-dash-card">
                  <div className="rl-card-kicker">
                    <span>Reading Stats</span>
                  </div>
                  <div className="rl-stats-grid">
                    <div className="rl-stat-box">
                      <strong>{library.completedIds.length}</strong>
                      <span>Volumes Read</span>
                    </div>
                    <div className="rl-stat-box">
                      <strong>{library.loans.length}</strong>
                      <span>Active Loans</span>
                    </div>
                    <div className="rl-stat-box">
                      <strong>{library.savedReadingListIds.length}</strong>
                      <span>Reading List</span>
                    </div>
                    <div className="rl-stat-box">
                      <strong>{library.viewedGuideIds.length}</strong>
                      <span>Guides Used</span>
                    </div>
                  </div>
                </section>

                <section className="rl-dash-card">
                  <div className="rl-card-kicker">
                    <span>Saved Reading List</span>
                  </div>
                  {library.savedReadingListIds.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#6b6257' }}>Bookmark volumes in the Research Catalog.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {library.savedReadingListIds.map(id => {
                        const item = LIBRARY_CATALOG.find(i => i.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} style={{ padding: 8, borderRadius: 8, background: '#faf8f3', border: '1px solid #dfd8ca' }}>
                            <strong style={{ display: 'block', fontSize: '0.76rem', color: '#0b2545' }}>{item.title}</strong>
                            <small style={{ color: '#6b6257', fontSize: '0.68rem' }}>{item.callNumber}</small>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}

        {/* === TAB 2: SCHOLARLY RESEARCH CATALOG === */}
        {portalTab === 'catalog' && (
          <section className="rl-scholar-shell">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.08rem', color: '#0b2545' }}>
                About {filteredCatalog.length} archival records {catalogQuery ? `for “${catalogQuery}”` : 'in the Royal Historic Catalog'}
              </h2>
            </div>

            <div className="rl-scholar-filters">
              <input
                type="text"
                aria-label="Search research catalog"
                placeholder="Search titles, authors, call numbers, or TLDR…"
                value={catalogQuery}
                onChange={e => setCatalogQuery(e.target.value)}
              />
              <select aria-label="Filter by field of study" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
                <option value="all">Fields of Study</option>
                {fields.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select aria-label="Filter by format" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                <option value="all">All Formats</option>
                <option value="arch">.arch Manuscript</option>
                <option value="pdf">.pdf Monograph</option>
                <option value="doc">.doc Handbook</option>
                <option value="map">.map Survey</option>
              </select>
              <select aria-label="Sort catalog" value={sortCatalog} onChange={e => setSortCatalog(e.target.value as 'relevance' | 'citations')}>
                <option value="relevance">Sort by Relevance</option>
                <option value="citations">Sort by Citations</option>
              </select>
              <select aria-label="Target mission for evidence citation" value={activeCiteMissionId} onChange={e => setCiteMissionId(e.target.value)} title="Target WORKNET / Casebook mission for + Mission Evidence">
                {availableMissions.map(m => (
                  <option key={m.id} value={m.id}>
                    Cite → {player?.worknetOrders?.[m.id]?.status === 'active' ? '● ' : ''}{m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Chronicler / Author Spotlight Cards */}
            <div className="rl-author-strip">
              {LIBRARY_AUTHORS.map(author => (
                <button
                  type="button"
                  key={author.name}
                  className="rl-author-card"
                  data-active={authorFilter === author.name}
                  onClick={() => setAuthorFilter(prev => (prev === author.name ? 'all' : author.name))}
                >
                  <strong>{author.name}</strong>
                  <small>
                    {author.publications} Publications · {author.citations.toLocaleString()} Citations · {author.field}
                  </small>
                </button>
              ))}
            </div>

            {citationPreview && (
              <div className="rl-notice" style={{ borderRadius: 8 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem' }}>{citationPreview}</span>
                <button type="button" onClick={() => setCitationPreview(null)}>
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="rl-result-list">
              {filteredCatalog.map(item => {
                const isBorrowed = library.loans.some(l => l.itemId === item.id);
                const isSaved = library.savedReadingListIds.includes(item.id);
                return (
                  <article key={item.id} className="rl-result-row">
                    <h3>{item.title}</h3>
                    <div className="rl-author-pills">
                      {item.authors.map(author => (
                        <span key={author} className="rl-author-pill">{author}</span>
                      ))}
                      <span>{item.field}</span>
                      <span>·</span>
                      <span>{item.collection}</span>
                      <span>·</span>
                      <span>{item.year}</span>
                      <span>·</span>
                      <code>{item.callNumber}</code>
                    </div>
                    <p className="rl-tldr">
                      <span className="rl-tldr-badge">TLDR</span>
                      {item.tldr}
                    </p>
                    <div className="rl-result-actions">
                      <span className="rl-cite-pill">“ {item.citations.toLocaleString()}</span>
                      <span className="rl-cite-pill">.{item.format.toUpperCase()}</span>
                      {item.restrictedTier && (
                        <span className="rl-cite-pill">{LIBRARY_CARD_TIERS[item.restrictedTier].label}</span>
                      )}
                      <button
                        type="button"
                        className="rl-btn-sm rl-btn-navy"
                        style={{ flex: 'none' }}
                        disabled={isBorrowed}
                        onClick={() => setNotice(libraryAction('borrow', { itemId: item.id }).message)}
                      >
                        {isBorrowed ? 'Checked Out ✓' : 'Borrow Volume'}
                      </button>
                      <button
                        type="button"
                        className="rl-btn-sm"
                        style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setNotice(libraryAction('toggleReadingList', { itemId: item.id }).message)}
                      >
                        <Bookmark size={12} /> {isSaved ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="rl-btn-sm"
                        style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleSaveVolumeToFylo(item)}
                      >
                        <FolderDown size={12} /> Save to Fylo
                      </button>
                      <button
                        type="button"
                        className="rl-btn-sm"
                        style={{ flex: 'none' }}
                        onClick={() => {
                          const cite = formatArchivalCitation(item);
                          setCitationPreview(cite);
                          navigator.clipboard?.writeText(cite).catch(() => {});
                        }}
                      >
                        “ Cite
                      </button>
                      <button
                        type="button"
                        className="rl-btn-sm"
                        style={{ flex: 'none', background: '#1e293b', color: '#f8fafc', borderColor: '#1e293b' }}
                        onClick={() => handleCiteVolumeToMission(item)}
                        title="Attach this volume as citable evidence in WORKNET & Casebook"
                      >
                        + Mission Evidence
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* === TAB 3: LIBRARY GUIDES (Georgia Southern Libraries Directory) === */}
        {portalTab === 'guides' && (
          <section className="rl-guides-shell">
            <div className="rl-guides-bar">
              <div className="rl-guides-tabs" role="group" aria-label="Sort library guides">
                <button type="button" aria-pressed={guideMode === 'all'} onClick={() => setGuideMode('all')}>ALL GUIDES</button>
                <button type="button" aria-pressed={guideMode === 'subject'} onClick={() => setGuideMode('subject')}>BY SUBJECT</button>
                <button type="button" aria-pressed={guideMode === 'type'} onClick={() => setGuideMode('type')}>BY TYPE</button>
                <button type="button" aria-pressed={guideMode === 'curator'} onClick={() => setGuideMode('curator')}>BY CURATOR</button>
              </div>
            </div>

            <div className="rl-guides-search">
              <label htmlFor="rl-guide-search" style={{ fontSize: '0.76rem', fontWeight: 600 }}>Search:</label>
              <input
                id="rl-guide-search"
                type="text"
                placeholder="Library Guides"
                value={guideQuery}
                onChange={e => setGuideQuery(e.target.value)}
              />
            </div>

            <div className="rl-guides-grid">
              {filteredGuides.map(guide => (
                <article key={guide.id} className="rl-guide-item">
                  <h3>{guide.title}</h3>
                  <p>{guide.summary}</p>
                  <div className="rl-guide-meta">
                    <span>{guide.subject} · {guide.curator}</span>
                    {guide.targetCollection && (
                      <button
                        type="button"
                        className="rl-btn-sm rl-btn-navy"
                        style={{ flex: 'none' }}
                        onClick={() => {
                          libraryAction('viewGuide', { guideId: guide.id });
                          setPortalTab('collections');
                          setActiveCollection(guide.targetCollection!);
                        }}
                      >
                        Open →
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* === TAB 4: ROYAL LIBRARY CARD ISSUANCE === */}
        {portalTab === 'card' && (
          <section className="rl-card-layout">
            <div className="rl-dash-card">
              <div className="rl-card-kicker">
                <span>Royal Library Card Issuance Desk</span>
              </div>
              <form className="rl-card-form" onSubmit={handleIssueCard}>
                <label>
                  Patron Full Name
                  <input type="text" required value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} />
                </label>
                <label>
                  MAID / Citizen Registry ID
                  <input type="text" required value={cardMaid} onChange={e => setCardMaid(e.target.value)} />
                </label>
                <label>
                  Home Branch
                  <select value={cardBranch} onChange={e => setCardBranch(e.target.value)}>
                    {LIBRARY_BRANCHES.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Patron Access Tier (Your Clearance: {player?.clearanceLevel ?? 2})
                  <select value={cardTier} onChange={e => setCardTier(e.target.value as LibraryCardTier)}>
                    {(Object.entries(LIBRARY_CARD_TIERS) as [LibraryCardTier, (typeof LIBRARY_CARD_TIERS)[LibraryCardTier]][]).map(
                      ([key, spec]) => (
                        <option key={key} value={key}>
                          {spec.label} — Limit {spec.borrowLimit} loans (Clearance {spec.minClearance}+)
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#5a6070' }}>
                  {LIBRARY_CARD_TIERS[cardTier].description}
                </p>
                <button type="submit" className="rl-btn-sm rl-btn-navy" style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
                  {library.card ? 'Update / Renew Royal Library Card' : 'Issue Official Royal Library Card'}
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rl-physical-card">
                <div className="rl-physical-head">
                  <div>
                    <span>Royal Historic Society · Meridion Public Archives</span>
                    <h2>Official Library Patron Card</h2>
                  </div>
                  <CreditCard size={24} color="#dfd0a8" />
                </div>
                <div className="rl-physical-grid">
                  <div>
                    <small>Card Number</small>
                    <strong style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {library.card?.cardNumber || 'UNISSUED — SUBMIT FORM'}
                    </strong>
                  </div>
                  <div>
                    <small>Patron Tier</small>
                    <strong>{library.card?.tierLabel || LIBRARY_CARD_TIERS[cardTier].label}</strong>
                  </div>
                  <div>
                    <small>Patron Name</small>
                    <strong>{library.card?.holderName || cardHolderName}</strong>
                  </div>
                  <div>
                    <small>MAID Identity</small>
                    <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{library.card?.maid || cardMaid}</strong>
                  </div>
                  <div>
                    <small>Home Branch</small>
                    <strong>{library.card?.homeBranch || cardBranch}</strong>
                  </div>
                  <div>
                    <small>Borrowing Privilege</small>
                    <strong>Up to {library.card?.borrowLimit || LIBRARY_CARD_TIERS[cardTier].borrowLimit} active volumes</strong>
                  </div>
                </div>
                <div className="rl-barcode" aria-hidden="true" />
              </div>

              {library.card && (
                <button
                  type="button"
                  className="rl-btn-sm"
                  style={{ padding: '9px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={handleSaveCardToFylo}
                >
                  <FolderDown size={14} /> Save Patron Card Copy to Fylo (/documents)
                </button>
              )}
            </div>
          </section>
        )}

        {/* === TAB 5: COLLECTIONS & ATLAS (Preserves all 7 existing LoreExplorer views) === */}
        {portalTab === 'collections' && (
          <div>
            <div className="rl-collections-bar" role="group" aria-label="Archive collections">
              {([
                ['academic-projects', 'Academic Reading'],
                ['realms', 'Seven Realms Atlas'],
                ['chronology', 'Twin Moons & Chronology'],
                ['exploration', 'Discovery Journal'],
                ['factions', `Institutions & Houses (${factions.length})`],
                ['locations', `Regions & Shrines (${locations.length})`],
                ['npcs', `People & Monarchs (${npcs.length})`],
              ] as [CollectionSubTab, string][]).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={activeCollection === id} onClick={() => setActiveCollection(id)}>
                  {label}
                </button>
              ))}
            </div>

            {activeCollection === 'academic-projects' && <AcademicProjectDesk workspace="archive" />}
            {activeCollection === 'realms' && <SevenRealmsMapPanel />}
            {activeCollection === 'chronology' && <CelestialChronologyPanel />}
            {activeCollection === 'exploration' && <WorldJournalPanel />}

            {activeCollection === 'factions' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {factions.map(faction => {
                  const name = faction.name || faction.title || 'Unnamed Faction';
                  const color = faction.accentColor || faction.color || '#0b2545';
                  const ideology = faction.ideology || faction.description || 'No ideology manifest recorded.';
                  const influence = faction.influenceLevel ?? faction.influence ?? 50;
                  return (
                    <div key={faction.id} className="bg-white p-5 rounded-xl border border-[#dfd8ca] shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-base text-[#0b2545]">{name}</h3>
                          <span className="text-[11px] px-2.5 py-0.5 rounded font-mono font-bold border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}>
                            {faction.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-4">{ideology}</p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-mono">
                        <span className="text-slate-400">INFLUENCE RATING</span>
                        <span className="font-bold text-[#0b2545]">{influence} / 100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeCollection === 'locations' && (
              <div className="space-y-5">
                <div className="bg-white p-4 rounded-xl border border-[#dfd8ca] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#0b2545] uppercase">
                      <Sparkles size={14} className="text-amber-600" />
                      <span>Elemental Shrine Attunement Grid ({discoveredShrines.length} / {ALL_SHRINE_REGIONS.length} Attuned)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">Chronicle Expedition Protocol (n-05)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SHRINE_REGIONS.map(region => {
                      const attuned = discoveredShrines.includes(region);
                      return (
                        <button
                          key={region}
                          type="button"
                          onClick={() => discoverRegionalShrine(region)}
                          disabled={attuned}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                            attuned ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-[#faf8f3] border-[#dfd8ca] text-slate-700 hover:bg-amber-50'
                          }`}
                        >
                          {attuned ? <CheckCircle2 size={13} /> : <MapPin size={13} />}
                          {region}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locations.map(loc => (
                    <div key={loc.id} className="bg-white p-4 rounded-xl border border-[#dfd8ca]">
                      <h3 className="font-bold text-sm text-[#0b2545]">{loc.name || loc.title}</h3>
                      <p className="text-xs text-slate-600 mt-1">{loc.description || loc.climate || 'Regional survey record.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCollection === 'npcs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {npcs.map(npc => (
                  <div key={npc.id} className="bg-white p-4 rounded-xl border border-[#dfd8ca]">
                    <h3 className="font-bold text-sm text-[#0b2545]">{npc.name}</h3>
                    <p className="text-[11px] font-mono text-amber-800 mt-0.5">{npc.role || npc.title || 'Citizen'}</p>
                    <p className="text-xs text-slate-600 mt-2">{npc.bio || npc.description || 'Registered in the Royal Historic Society index.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
