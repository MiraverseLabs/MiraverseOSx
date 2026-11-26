import type { RefObject } from 'react';
import { X } from 'lucide-react';
import BrowserTabGroups from './BrowserTabGroups';
import type { BrowserBookmark, BrowserVisit } from './browserModel';
import type { Navigate } from './VerseNetNavigation';

const sections = [['bookmarks', 'Bookmarks'], ['history', 'History'], ['groups', 'Saved groups']] as const;
export type LibrarySection = typeof sections[number][0];

interface LibraryProps {
  libraryRef: RefObject<HTMLElement>;
  closeRef: RefObject<HTMLButtonElement>;
  section: LibrarySection;
  compact: boolean;
  filter: string;
  setFilter: (filter: string) => void;
  entries: (BrowserBookmark | BrowserVisit)[];
  hasHistory: boolean;
  selectSection: (section: LibrarySection) => void;
  onClose: () => void;
  clearHistory: () => void;
  removeBookmark: (url: string) => void;
  onNavigate: Navigate;
}

export default function VerseNetLibrary({
  libraryRef, closeRef, section, compact, filter, setFilter, entries, hasHistory,
  selectSection, onClose, clearHistory, removeBookmark, onNavigate,
}: LibraryProps) {
  function openPage(url: string) {
    onNavigate(url);
    if (compact) onClose();
  }

  return <aside ref={libraryRef} id="vn-library" className="vn-library" aria-label="Browser library"
    role={compact ? 'dialog' : undefined} aria-modal={compact || undefined}>
    <header>
      <h2>Library</h2>
      <button className="vn-icon" ref={closeRef} aria-label="Close browser library" onClick={onClose}><X size={16} /></button>
    </header>
    <nav className="vn-library-sections" aria-label="Library sections">
      {sections.map(([id, label]) => <button key={id} aria-pressed={section === id} onClick={() => selectSection(id)}>{label}</button>)}
    </nav>
    {section === 'groups' ? <BrowserTabGroups onOpenTab={compact ? onClose : undefined} /> : <>
      <input aria-label="Filter browser library" placeholder="Find a page…" value={filter} onChange={event => setFilter(event.target.value)} />
      {section === 'history' && hasHistory && <button className="vn-text-button" onClick={clearHistory}>Clear browsing history</button>}
      <div className="vn-library-list">
        {entries.map(item => <div className="vn-library-item" key={item.url}>
          <button onClick={() => openPage(item.url)}>
            <strong>{item.title}</strong>
            <small>{item.url.replace(/^https?:\/\//, '')}</small>
            {'visitedAt' in item && <time>{new Date(item.visitedAt).toLocaleDateString()}</time>}
          </button>
          {section === 'bookmarks' && <button className="vn-icon" aria-label={'Remove bookmark ' + item.title} onClick={() => removeBookmark(item.url)}>
            <X size={13} />
          </button>}
        </div>)}
      </div>
      {!entries.length && <p role="status">{filter ? 'No matching pages.' : section === 'history' ?
        'Your next visit will appear here.' : 'Use the star beside an address to save a page.'}</p>}
    </>}
  </aside>;
}

