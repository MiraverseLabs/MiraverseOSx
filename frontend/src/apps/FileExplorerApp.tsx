import React, { useEffect, useState } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  Map,
  ShieldAlert,
  Activity,
  Radio,
  Zap,
  ChevronRight,
  Cpu,
  MapPin,
  Search,
  LayoutGrid,
  List,
  Grid2x2,
  Paperclip,
  ExternalLink,
  Home,
  HardDrive,
  Trash2,
  RotateCcw,
  FilePlus2,
  Send,
  Lock,
  Image as ImageIcon,
  Calendar,
  Coins,
  BookOpen,
  X,
  StickyNote,
  Star,
  Clock,
  Copy,
  Pencil,
  FolderInput,
  PanelRight,
} from 'lucide-react';
import Button from '../components/ui/button';
import DocumentModal from '../components/widgets/DocumentModal';
import SignalPlayerModal from '../components/widgets/SignalPlayerModal';
import { MOCK_DOCUMENTS } from '../data/mockDocuments';
import { useOSStore } from '../store/useOSStore';
import { useCommsStore } from '../store/useCommsStore';
import { savedMailFiles } from './mail/savedMailFiles';
import { launchDesktopApp } from '../components/desktop/appDirectory';
import '../styles/apps/FileExplorer.css';
import { CaseSourceView } from './investigation/BroadStreetCasePanel';
import { trashedFyloFiles, visibleFileCatalog } from './files/fileCatalog';
import { CORE_APPLICATIONS, FILE_EXTENSIONS, GENERAL_FILE_RULES, resolveFileExtension } from './files/fileExtensions';
import {
  FYLO_NOTES_DIR,
  FYLO_TRASH_DIR,
  canEditInFylo,
  canManageInFylo,
  toMailAttachment,
} from './files/fyloStore';

type DisplayMode = 'icons' | 'grid' | 'list';
type SortKey = 'name' | 'type' | 'dir';

export default function FileExplorerApp() {
  const [caseSourceId, setCaseSourceId] = useState<string | null>(null);
  const caseRequest = useOSStore(s => s.workspaceRequests.files);
  useOSStore(s => s.isLoggedIn);
  const fyloState = useOSStore(state => state.fylo);
  const recentFiles = useOSStore(state => state.desktopPreferences.recentFiles || []);
  const caseEligible = useOSStore.getState().broadStreetEligible();

  useEffect(() => {
    if (!caseRequest?.section.startsWith('broadstreet:')) return;
    setCaseSourceId(caseRequest.section.split(':')[1]);
    useOSStore.getState().consumeWorkspaceRequest('files', caseRequest.revision);
  }, [caseRequest]);

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'document' | 'sig' | 'image' | 'note' | 'catalog' | 'folder' | 'rename' | 'move' | 'confirmDelete' | null>(null);
  const [activeDirectory, setActiveDirectory] = useState('/home');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<DisplayMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [fileOpenNotice, setFileOpenNotice] = useState('');

  // Modal form inputs
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteName, setNoteName] = useState('');
  const [noteExt, setNoteExt] = useState<'note' | 'txt'>('note');
  const [noteDesc, setNoteDesc] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [moveTargetDir, setMoveTargetDir] = useState(FYLO_NOTES_DIR);

  const recordFileInspection = useOSStore(s => s.recordFileInspection);
  const journal = useOSStore(state => state.gameplay.player.assignmentJournal);
  const savedWebFiles = useOSStore(state => state.versenetContent.savedFiles);
  const webFiles = Object.values(savedWebFiles);
  const emails = useCommsStore(state => state.emails);
  const savedAttachmentIds = useCommsStore(state => state.savedAttachmentIds);
  const mailFiles = savedMailFiles(emails, savedAttachmentIds);
  const assignmentFiles = Object.values(journal?.files || {}) as any[];
  const trashedFiles = trashedFyloFiles(useOSStore.getState());
  const fyloActiveDirs = [...new Set(Object.values(fyloState.files).filter(f => !f.trashedAt).map(f => f.dir))];

  const directories = [
    ...new Set([
      FYLO_NOTES_DIR,
      '/root',
      '/documents',
      '/spells',
      '/diagnostics',
      '/system',
      '/assignments',
      ...assignmentFiles.map(file => file.dir),
      ...(mailFiles.length || fyloActiveDirs.includes('/downloads/auremail') ? ['/downloads/auremail'] : []),
      ...(webFiles.length ? ['/downloads/versenet', ...webFiles.filter(file => file.type !== 'folder').map(file => file.dir)] : []),
      ...fyloState.folders,
      ...fyloActiveDirs,
    ]),
  ];

  useEffect(() => {
    if (journal?.fileDirectory) {
      setActiveDirectory(journal.fileDirectory);
      setSelectedFile(null);
      if (!caseRequest?.section.startsWith('broadstreet:')) setCaseSourceId(null);
    }
  }, [journal?.fileRequest]);

  const allFiles = visibleFileCatalog(useOSStore.getState(), emails, savedAttachmentIds);
  const isTrashView = activeDirectory === FYLO_TRASH_DIR;
  const isFavoritesView = activeDirectory === '/favorites';
  const isRecentView = activeDirectory === '/recent';
  const sourcePool = isTrashView ? trashedFiles : allFiles;
  const recentIds = new Set(recentFiles.map(r => r.id));

  const filteredFiles = sourcePool
    .filter(file => {
      if ((file as any).assignmentId === 'ms-case-002' && !caseEligible) return false;
      const matchesDir =
        isTrashView ||
        activeDirectory === '/home' ||
        (isFavoritesView && fyloState.favorites.includes(file.id)) ||
        (isRecentView && recentIds.has(file.id)) ||
        file.dir === activeDirectory ||
        (activeDirectory === '/assignments' && file.dir.startsWith('/assignments/'));
      const q = searchQuery.trim().toLowerCase();
      const spec = file.extensionSpec || resolveFileExtension(file.name || file.type);
      const matchesSearch =
        !q ||
        file.name.toLowerCase().includes(q) ||
        (file.desc || '').toLowerCase().includes(q) ||
        (file.type || '').toLowerCase().includes(q) ||
        spec.associatedApp.toLowerCase().includes(q);
      return matchesDir && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '') || a.name.localeCompare(b.name);
      if (sortBy === 'dir') return (a.dir || '').localeCompare(b.dir || '') || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

  // Keep selectedFile in sync with latest store record
  const activeSelected = selectedFile
    ? sourcePool.find(f => f.id === selectedFile.id) || null
    : null;

  const goToDirectory = (dir: string) => {
    setActiveDirectory(dir);
    setSelectedFile(null);
    setSearchQuery('');
    setFileOpenNotice('');
  };

  const directoryName = (dir: string) => {
    if (dir === '/home') return 'Dashboard';
    if (dir === '/favorites') return 'Favorites';
    if (dir === '/recent') return 'Recent';
    if (dir === '/root') return 'My Files';
    if (dir === FYLO_NOTES_DIR) return 'Notes';
    if (dir === FYLO_TRASH_DIR) return 'Trash';
    if (dir === '/downloads/auremail') return 'AureMail';
    if (dir === '/downloads/versenet') return 'VerseNet';
    return (dir.split('/').filter(Boolean).pop() || 'Files').replace(/^./, letter => letter.toUpperCase());
  };

  const openNewNoteModal = () => {
    setEditingNoteId(null);
    setNoteName('');
    setNoteExt('note');
    setNoteDesc('');
    setNoteBody('');
    setActiveModal('note');
  };

  const openEditNoteModal = (file: any) => {
    setEditingNoteId(file.id);
    setNoteName(file.name);
    setNoteExt(file.type === 'txt' ? 'txt' : 'note');
    setNoteDesc(file.desc || '');
    setNoteBody(file.body || '');
    setActiveModal('note');
  };

  const handleSaveNote = (event: React.FormEvent) => {
    event.preventDefault();
    const targetDir =
      activeDirectory === '/home' || activeDirectory === '/favorites' || activeDirectory === '/recent' || activeDirectory === FYLO_TRASH_DIR
        ? FYLO_NOTES_DIR
        : activeDirectory;
    const res = editingNoteId
      ? useOSStore.getState().fyloAction('updateNote', {
          id: editingNoteId,
          name: noteName,
          desc: noteDesc,
          body: noteBody,
        })
      : useOSStore.getState().fyloAction('createNote', {
          name: noteName,
          ext: noteExt,
          desc: noteDesc,
          body: noteBody,
          dir: targetDir,
        });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok) {
      setActiveModal(null);
      if (res.file) setSelectedFile({ ...res.file, extensionSpec: resolveFileExtension(res.file.name) });
    }
  };

  const handleCreateFolder = (event: React.FormEvent) => {
    event.preventDefault();
    const res = useOSStore.getState().fyloAction('createFolder', { name: newFolderName });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok && res.dir) {
      setNewFolderName('');
      setActiveModal(null);
      goToDirectory(res.dir);
    }
  };

  const handleRenameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSelected) return;
    const res = useOSStore.getState().fyloAction('rename', { id: activeSelected.id, name: renameValue });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok) setActiveModal(null);
  };

  const handleMoveSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSelected) return;
    const res = useOSStore.getState().fyloAction('move', { id: activeSelected.id, dir: moveTargetDir });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok) setActiveModal(null);
  };

  const handleCopyFile = (file: any) => {
    const res = useOSStore.getState().fyloAction('copy', { source: file });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok && res.file) setSelectedFile(res.file);
  };

  const handleToggleFavorite = (key: string) => {
    const res = useOSStore.getState().fyloAction('toggleFavorite', { key });
    setFileOpenNotice(res.message || '');
  };

  const executeFile = (file: any) => {
    if (!file) return;
    if (isTrashView) {
      setFileOpenNotice('Restore this file from Trash before opening it.');
      return;
    }
    if (file.type !== 'folder') {
      useOSStore.getState().desktopAction({ type: 'recent', file: { id: file.id, name: file.name } });
    }
    if (file.caseSourceId) {
      const source = ['access-audit', 'thermal-log'].includes(file.caseSourceId);
      if (source) setCaseSourceId(file.caseSourceId);
      else useOSStore.getState().openCaseSource(file.caseSourceId);
      return;
    }
    if (file.webUrl && file.type === 'folder') {
      setActiveDirectory(`/downloads/versenet/${file.id.slice(4).split(':')[0]}`);
      setSelectedFile(null);
      return;
    }

    const spec = file.extensionSpec || resolveFileExtension(file.name || file.type);

    if (canEditInFylo(file) && fyloState.files[file.id]) {
      openEditNoteModal(file);
      return;
    }

    if (spec.viewer === 'image') {
      setSelectedFile(file);
      setActiveModal('image');
      return;
    }

    const catalogDoc = MOCK_DOCUMENTS[file.mockKey];
    const resolvedDoc =
      file.document ||
      (catalogDoc
        ? { ...catalogDoc, id: file.id, name: file.name, filename: file.name, size: file.size, type: file.type, inspectionKey: file.mockKey }
        : {
            id: file.id,
            name: file.name,
            filename: file.name,
            extension: `.${file.type}`,
            category: spec.category,
            meta: {
              classification: file.mailId
                ? 'RETAINED MAIL ATTACHMENT'
                : file.webUrl
                  ? 'VERSENET DOWNLOAD'
                  : file.assignmentId
                    ? 'PERSONAL ASSIGNMENT RECORD'
                    : file.protected
                      ? 'PROTECTED SYSTEM RECORD'
                      : 'FYLO PERSONAL FILE',
              author: file.publisher || (file.assignmentId ? 'WORKNET DISPATCH' : file.owner === 'player' ? 'CITIZEN OWNER' : 'SYSTEM DAEMON'),
              timestamp: 'WINTER',
              fileSize: file.size,
            },
            security: { isEncrypted: false },
            attachments: [],
            content: {
              title: file.name.replace(/_/g, ' '),
              subtitle: `${file.desc} · ${spec.associatedApp}`,
              bodyText:
                file.body ||
                `${file.desc}\n\nFile Location: ${file.dir}/${file.name}\nExtension: ${spec.dotExt} (${spec.purpose})\nAssociated Application: ${spec.associatedApp}\nFile Size: ${file.size}`,
            },
          });

    setSelectedDoc(resolvedDoc);

    if (spec.viewer === 'signal') {
      if (file.mockKey) recordFileInspection(file.mockKey);
      setActiveModal('sig');
    } else {
      setActiveModal('document');
    }
  };

  const handleSendViaAureMail = (file: any) => {
    if (!file || file.type === 'folder') return;
    useCommsStore.getState().requestComposeWithAttachment(toMailAttachment(file));
    launchDesktopApp('mail');
  };

  const handleMoveToTrash = (file: any) => {
    const res = useOSStore.getState().fyloAction('trash', { id: file.id });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok) setSelectedFile(null);
  };

  const handleRestoreFromTrash = (file: any) => {
    const res = useOSStore.getState().fyloAction('restore', { id: file.id });
    setFileOpenNotice(res.message || res.reason || '');
    if (res.ok) setSelectedFile(null);
  };

  const handleDeletePermanentConfirmed = () => {
    if (!activeSelected) return;
    const res = useOSStore.getState().fyloAction('deletePermanent', { id: activeSelected.id });
    setFileOpenNotice(res.message || res.reason || '');
    setActiveModal(null);
    if (res.ok) setSelectedFile(null);
  };

  const handleEmptyTrash = () => {
    const res = useOSStore.getState().fyloAction('emptyTrash');
    setFileOpenNotice(res.message || '');
    setSelectedFile(null);
  };

  useEffect(() => {
    const section = caseRequest?.section || '';
    if (!section.startsWith('file:') && !section.startsWith('directory:')) return;
    useOSStore.getState().consumeWorkspaceRequest('files', caseRequest!.revision);
    try {
      const value = decodeURIComponent(section.slice(section.indexOf(':') + 1));
      if (section.startsWith('directory:')) {
        if (value === '/home' || value === FYLO_TRASH_DIR || directories.includes(value)) {
          goToDirectory(value);
        } else {
          setFileOpenNotice('This folder is no longer available.');
        }
      } else {
        const file = allFiles.find(f => f.id === value);
        if (file) {
          setActiveDirectory(file.dir);
          setSearchQuery('');
          setFileOpenNotice('');
          executeFile(file);
        } else {
          setFileOpenNotice('This file is no longer available or accessible.');
        }
      }
    } catch {
      setFileOpenNotice('This file link could not be opened.');
    }
  }, [caseRequest?.revision]);

  const getFileIcon = (type: string, size = 17) => {
    switch (type) {
      case 'osform':
      case 'form':
        return <FileText size={size} className="fylo-icon-warm" />;
      case 'note':
        return <StickyNote size={size} className="fylo-icon-sunset" />;
      case 'txt':
      case 'doc':
      case 'docx':
      case 'pdf':
        return <FileText size={size} className="fylo-icon-scampi" />;
      case 'ics':
        return <Calendar size={size} className="fylo-icon-sky" />;
      case 'folder':
        return <Folder size={size} className="fylo-icon-portage" />;
      case 'log':
      case 'arch':
        return <FileText size={size} className="fylo-icon-statice" />;
      case 'map':
        return <Map size={size} className="fylo-icon-scampi" />;
      case 'node':
      case 'grid':
        return <MapPin size={size} className="fylo-icon-warm" />;
      case 'mod':
      case 'spell':
      case 'veil':
        return <Zap size={size} className="fylo-icon-portage" />;
      case 'diag':
      case 'aura':
        return <Activity size={size} className="fylo-icon-sky" />;
      case 'sig':
      case 'wav':
        return <Radio size={size} className="fylo-icon-statice" />;
      case 'img':
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return <ImageIcon size={size} className="fylo-icon-warm" />;
      case 'grant':
      case 'payment':
        return <Coins size={size} className="fylo-icon-sunset" />;
      case 'sys':
        return <Cpu size={size} className="fylo-icon-muted" />;
      case 'prism':
      case 'corrupt':
        return <ShieldAlert size={size} className="fylo-icon-alert" />;
      default:
        return <FileText size={size} className="fylo-icon-scampi" />;
    }
  };

  const getAttachmentCount = (mockKey?: string) => {
    if (!mockKey || !MOCK_DOCUMENTS[mockKey]) return 0;
    return MOCK_DOCUMENTS[mockKey].attachments?.length || 0;
  };

  if (caseSourceId) return <CaseSourceView id={caseSourceId} app="files" onBack={() => setCaseSourceId(null)} />;

  const selectedSpec = activeSelected
    ? activeSelected.extensionSpec || resolveFileExtension(activeSelected.name || activeSelected.type)
    : null;
  const isSelectedManaged = Boolean(activeSelected && canManageInFylo(activeSelected) && fyloState.files[activeSelected.id]);
  const isSelectedFavorite = Boolean(activeSelected && fyloState.favorites.includes(activeSelected.id));

  return (
    <div className="file-explorer-container fylo-shell">
      {fileOpenNotice && (
        <div role="status" className="fylo-notice">
          <span>{fileOpenNotice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setFileOpenNotice('')}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Top Navigation & Command Toolbar */}
      <header className="fylo-toolbar">
        <div className="fylo-breadcrumb">
          <button type="button" className="fylo-brand-btn" aria-label="Go to Fylo Dashboard" onClick={() => goToDirectory('/home')}>
            <span className="fylo-brand-gem" aria-hidden="true" />
            <strong>Fylo</strong>
          </button>
          <ChevronRight size={13} className="fylo-crumb-sep" />
          <span className="fylo-crumb-current">{directoryName(activeDirectory)}</span>
        </div>

        <div className="fylo-toolbar-actions">
          <button type="button" className="fylo-cmd-btn fylo-cmd-primary" onClick={openNewNoteModal}>
            <FilePlus2 size={14} /> New Note
          </button>
          <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal('folder')}>
            <FolderPlus size={14} /> New Folder
          </button>
          <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal('catalog')}>
            <BookOpen size={14} /> 30 Formats
          </button>

          <div className="fylo-search-wrap">
            <Search size={13} className="fylo-search-icon" />
            <input
              type="text"
              aria-label="Search files"
              placeholder="Search files, extensions, apps…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Sort files"
            className="fylo-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            <option value="name">Sort: Name</option>
            <option value="type">Sort: Extension</option>
            <option value="dir">Sort: Folder</option>
          </select>

          <div className="fylo-view-switch" role="group" aria-label="Display mode">
            <button type="button" aria-pressed={viewMode === 'icons'} onClick={() => setViewMode('icons')} title="Large Icons">
              <Grid2x2 size={14} />
            </button>
            <button type="button" aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="Grid View">
              <LayoutGrid size={14} />
            </button>
            <button type="button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} title="Details / List View">
              <List size={14} />
            </button>
          </div>

          <button
            type="button"
            className={`fylo-cmd-btn ${detailsOpen ? 'active' : ''}`}
            aria-pressed={detailsOpen}
            onClick={() => setDetailsOpen(v => !v)}
            title="Toggle File Details Panel"
          >
            <PanelRight size={14} />
          </button>
        </div>
      </header>

      {/* Three-Pane Desktop Layout */}
      <div className="fylo-body" data-details-open={detailsOpen}>
        {/* Left Navigation Sidebar */}
        <nav aria-label="Fylo directories" className="fylo-sidebar">
          <div className="fylo-sidebar-group">
            <button
              type="button"
              className="fylo-nav-item"
              aria-current={activeDirectory === '/home' ? 'page' : undefined}
              onClick={() => goToDirectory('/home')}
            >
              <Home size={15} /> Dashboard
            </button>
            <button
              type="button"
              className="fylo-nav-item"
              aria-current={isRecentView ? 'page' : undefined}
              onClick={() => goToDirectory('/recent')}
            >
              <Clock size={15} /> Recent
            </button>
            <button
              type="button"
              className="fylo-nav-item"
              aria-current={isFavoritesView ? 'page' : undefined}
              onClick={() => goToDirectory('/favorites')}
            >
              <Star size={15} /> Favorites
              {fyloState.favorites.length > 0 && <span className="fylo-nav-badge">{fyloState.favorites.length}</span>}
            </button>
          </div>

          <div className="fylo-sidebar-label">FOLDERS</div>
          <div className="fylo-sidebar-group">
            {directories.map(dir => (
              <button
                type="button"
                key={dir}
                title={dir}
                className="fylo-nav-item"
                aria-current={activeDirectory === dir ? 'page' : undefined}
                onClick={() => goToDirectory(dir)}
              >
                <Folder size={14} />
                <span className="truncate">{directoryName(dir)}</span>
              </button>
            ))}
          </div>

          <div className="fylo-sidebar-label">RECOVERY</div>
          <div className="fylo-sidebar-group">
            <button
              type="button"
              className="fylo-nav-item fylo-nav-trash"
              aria-current={isTrashView ? 'page' : undefined}
              onClick={() => goToDirectory(FYLO_TRASH_DIR)}
            >
              <Trash2 size={14} />
              <span>Trash</span>
              {trashedFiles.length > 0 && <span className="fylo-trash-count">{trashedFiles.length}</span>}
            </button>
          </div>

          <div className="fylo-device-card">
            <HardDrive size={17} />
            <div>
              <strong>Fylo Systems</strong>
              <small>Personal & retained storage</small>
            </div>
          </div>
        </nav>

        {/* Central File Workspace */}
        <section className="fylo-workspace">
          <header className="fylo-hero">
            <div>
              <span className="fylo-eyebrow">FYLO SYSTEMS · PERSONAL FILE MANAGER</span>
              <h1>
                {activeDirectory === '/home'
                  ? 'Personal Dashboard'
                  : isTrashView
                    ? 'Trash'
                    : directoryName(activeDirectory)}
              </h1>
              <p>
                {activeDirectory === '/home'
                  ? 'Organized folders, retained correspondence, personal notes, and application files.'
                  : isTrashView
                    ? 'Player-owned files can be restored to their original folder or permanently deleted.'
                    : `${activeDirectory} · ${filteredFiles.length} item${filteredFiles.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {isTrashView && trashedFiles.length > 0 && (
              <button type="button" className="fylo-cmd-btn fylo-cmd-danger" onClick={handleEmptyTrash}>
                <Trash2 size={13} /> Empty Trash
              </button>
            )}
          </header>

          {/* Soft 3D Folder Dashboard (Home view) */}
          {activeDirectory === '/home' && !searchQuery && (
            <section className="fylo-dashboard-folders" aria-label="Quick access folders">
              <div className="fylo-section-head">
                <h2>Folders</h2>
                <span>Soft 3D collections</span>
              </div>
              <div className="fylo-folder-grid">
                {[FYLO_NOTES_DIR, '/documents', '/downloads/auremail', '/spells', '/diagnostics', '/assignments'].map((dir, index) => {
                  const count = allFiles.filter(
                    file => file.dir === dir || (dir === '/assignments' && file.dir.startsWith('/assignments/')),
                  ).length;
                  return (
                    <button
                      type="button"
                      key={dir}
                      className="fylo-soft3d-folder"
                      data-tone={index % 4}
                      onClick={() => goToDirectory(dir)}
                    >
                      <span className="fylo-soft3d-glyph" aria-hidden="true">
                        <span className="fylo-soft3d-tab" />
                        <span className="fylo-soft3d-body" />
                      </span>
                      <strong>{directoryName(dir)}</strong>
                      <small>{count} items</small>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="fylo-section-head">
            <h2>{activeDirectory === '/home' ? 'All retained & system files' : isTrashView ? 'Deleted items' : 'Files'}</h2>
            <span>
              {filteredFiles.length} items · {viewMode === 'icons' ? 'Large Icons' : viewMode === 'grid' ? 'Grid' : 'Details'}
            </span>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="fylo-empty-state">
              {isTrashView ? <Trash2 size={28} /> : <Folder size={28} />}
              <span>
                {isTrashView
                  ? 'Trash is empty'
                  : isFavoritesView
                    ? 'No pinned favorites yet — star any file to pin it here.'
                    : 'No matching files in this location.'}
              </span>
              {activeDirectory === FYLO_NOTES_DIR && (
                <button type="button" className="fylo-cmd-btn fylo-cmd-primary" onClick={openNewNoteModal}>
                  <FilePlus2 size={13} /> Create a .note file
                </button>
              )}
            </div>
          ) : viewMode === 'icons' ? (
            /* 1. Large Icons View */
            <div className="fylo-large-icons-grid">
              {filteredFiles.map(file => {
                const spec = file.extensionSpec || resolveFileExtension(file.name || file.type);
                const selected = activeSelected?.id === file.id;
                return (
                  <div
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    className={`fylo-icon-tile ${selected ? 'selected' : ''}`}
                    onClick={() => setSelectedFile(file)}
                    onDoubleClick={() => executeFile(file)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        executeFile(file);
                      } else if (event.key === ' ') {
                        event.preventDefault();
                        setSelectedFile(file);
                      }
                    }}
                  >
                    <div className="fylo-icon-thumb">
                      {getFileIcon(file.type, 26)}
                      <span className="fylo-thumb-ext">{spec.dotExt}</span>
                      {file.protected && (
                        <span className="fylo-thumb-lock" title="Protected record">
                          <Lock size={10} />
                        </span>
                      )}
                    </div>
                    <strong className="fylo-tile-name" title={file.name}>
                      {file.name}
                    </strong>
                    <small className="fylo-tile-app">{spec.associatedApp}</small>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grid' ? (
            /* 2. Grid View */
            <div className="fylo-card-grid">
              {filteredFiles.map(file => {
                const attCount = getAttachmentCount(file.mockKey);
                const spec = file.extensionSpec || resolveFileExtension(file.name || file.type);
                return (
                  <div
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        executeFile(file);
                      } else if (event.key === ' ') {
                        event.preventDefault();
                        setSelectedFile(file);
                      }
                    }}
                    onClick={() => setSelectedFile(file)}
                    onDoubleClick={() => executeFile(file)}
                    className={`file-grid-card ${activeSelected?.id === file.id ? 'selected' : ''}`}
                  >
                    <div className="fylo-card-main">
                      <div className="fylo-card-icon">{getFileIcon(file.type, 18)}</div>
                      <div className="fylo-card-copy">
                        <div className="fylo-card-title">
                          <span>{file.name}</span>
                          {file.protected && <Lock size={11} className="fylo-lock-inline" />}
                          {fyloState.favorites.includes(file.id) && <Star size={11} className="fylo-star-inline" />}
                          {attCount > 0 && (
                            <span className="fylo-att-pill">
                              <Paperclip size={10} /> {attCount}
                            </span>
                          )}
                        </div>
                        <p className="fylo-card-desc">{file.desc}</p>
                        <div className="fylo-card-tags">
                          <span className="files-type-label">{spec.dotExt}</span>
                          <span className="files-app-label">{spec.associatedApp}</span>
                        </div>
                      </div>
                    </div>
                    <span className="fylo-card-size">{file.size}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 3. Details / List View */
            <div className="fylo-list-wrap">
              <table className="fylo-list-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Extension & Handler</th>
                    <th>Location</th>
                    <th>Ownership</th>
                    <th className="text-right">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(file => {
                    const isSelected = activeSelected?.id === file.id;
                    const spec = file.extensionSpec || resolveFileExtension(file.name || file.type);
                    return (
                      <tr
                        key={file.id}
                        tabIndex={0}
                        aria-label={`Open ${file.name}`}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => setSelectedFile(file)}
                        onDoubleClick={() => executeFile(file)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') executeFile(file);
                        }}
                      >
                        <td className="fylo-list-name">
                          {getFileIcon(file.type, 15)}
                          <span>{file.name}</span>
                        </td>
                        <td>
                          <span className="files-type-label">{spec.dotExt}</span>{' '}
                          <span className="files-app-label">{spec.associatedApp}</span>
                        </td>
                        <td className="fylo-mono-cell">{file.dir}</td>
                        <td>
                          {file.protected ? (
                            <span className="fylo-status-protected">
                              <Lock size={10} /> Protected
                            </span>
                          ) : (
                            <span className="fylo-status-personal">Personal</span>
                          )}
                        </td>
                        <td className="fylo-mono-cell text-right">{file.size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Optional Collapsible Right-Side File Details Panel */}
        {detailsOpen && (
          <aside className="fylo-details-panel" aria-label="File details">
            {!activeSelected || !selectedSpec ? (
              <div className="fylo-details-empty">
                <span className="fylo-soft3d-glyph fylo-soft3d-sm" aria-hidden="true">
                  <span className="fylo-soft3d-tab" />
                  <span className="fylo-soft3d-body" />
                </span>
                <strong>Select a file</strong>
                <p>Inspect format associations, provenance, ownership permissions, and actions here.</p>
              </div>
            ) : (
              <div className="fylo-details-content">
                <div className="fylo-details-preview">
                  <div className="fylo-details-icon">{getFileIcon(activeSelected.type, 28)}</div>
                  <span className="files-type-label">{selectedSpec.dotExt}</span>
                  <h3>{activeSelected.name}</h3>
                  <p>{activeSelected.desc}</p>
                </div>

                <dl className="fylo-details-meta">
                  <div>
                    <dt>Format</dt>
                    <dd>{selectedSpec.purpose}</dd>
                  </div>
                  <div>
                    <dt>Opens with</dt>
                    <dd>{selectedSpec.associatedApp}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd className="fylo-mono-cell">{activeSelected.dir}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd className="fylo-mono-cell">{activeSelected.size}</dd>
                  </div>
                  <div>
                    <dt>Ownership</dt>
                    <dd>{activeSelected.protected ? 'Protected / Read-only' : 'Personal (Player-owned)'}</dd>
                  </div>
                  {activeSelected.publisher && (
                    <div>
                      <dt>Origin</dt>
                      <dd>{activeSelected.publisher}</dd>
                    </div>
                  )}
                </dl>

                <div className="fylo-details-actions">
                  {isTrashView ? (
                    <>
                      <button type="button" className="fylo-cmd-btn fylo-cmd-primary w-full" onClick={() => handleRestoreFromTrash(activeSelected)}>
                        <RotateCcw size={13} /> Restore to {activeSelected.previousDir || '/notes'}
                      </button>
                      <button type="button" className="fylo-cmd-btn fylo-cmd-danger w-full" onClick={() => setActiveModal('confirmDelete')}>
                        <Trash2 size={13} /> Delete permanently
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="fylo-cmd-btn fylo-cmd-primary w-full" onClick={() => executeFile(activeSelected)}>
                        {canEditInFylo(activeSelected) && fyloState.files[activeSelected.id] ? 'Edit in Fylo Note Editor' : 'Open File'}{' '}
                        <ExternalLink size={13} />
                      </button>

                      {activeSelected.type !== 'folder' && (
                        <button type="button" className="fylo-cmd-btn w-full" onClick={() => handleSendViaAureMail(activeSelected)}>
                          <Send size={13} /> Attach in AureMail
                        </button>
                      )}

                      <div className="fylo-details-row">
                        <button type="button" className="fylo-cmd-btn" onClick={() => handleToggleFavorite(activeSelected.id)}>
                          <Star size={13} /> {isSelectedFavorite ? 'Unpin' : 'Pin'}
                        </button>
                        {activeSelected.type !== 'folder' && (
                          <button type="button" className="fylo-cmd-btn" onClick={() => handleCopyFile(activeSelected)}>
                            <Copy size={13} /> Copy
                          </button>
                        )}
                      </div>

                      {isSelectedManaged && (
                        <div className="fylo-details-row">
                          <button
                            type="button"
                            className="fylo-cmd-btn"
                            onClick={() => {
                              setRenameValue(activeSelected.name);
                              setActiveModal('rename');
                            }}
                          >
                            <Pencil size={13} /> Rename
                          </button>
                          <button
                            type="button"
                            className="fylo-cmd-btn"
                            onClick={() => {
                              setMoveTargetDir(activeSelected.dir);
                              setActiveModal('move');
                            }}
                          >
                            <FolderInput size={13} /> Move
                          </button>
                        </div>
                      )}

                      {isSelectedManaged && (
                        <button type="button" className="fylo-cmd-btn fylo-cmd-danger w-full" onClick={() => handleMoveToTrash(activeSelected)}>
                          <Trash2 size={13} /> Move to Trash
                        </button>
                      )}

                      {activeSelected.assignmentId && (
                        <button type="button" className="fylo-cmd-btn w-full" onClick={() => useOSStore.getState().openAssignment(activeSelected.assignmentId)}>
                          Continue in WORKNET
                        </button>
                      )}
                      {activeSelected.mailId && (
                        <button
                          type="button"
                          className="fylo-cmd-btn w-full"
                          onClick={() => {
                            useCommsStore.getState().requestMailMessage(activeSelected.mailId);
                            launchDesktopApp('mail');
                          }}
                        >
                          Open source email
                        </button>
                      )}
                      {activeSelected.webUrl && (
                        <button
                          type="button"
                          className="fylo-cmd-btn w-full"
                          onClick={() => {
                            const store = useOSStore.getState();
                            store.setBrowserUrl(activeSelected.webUrl);
                            if (store.windows.some(win => win.id === 'browser')) store.focusWindow('browser');
                            else store.toggleApp({ id: 'browser', title: 'VerseNet', contentKey: 'browser' });
                          }}
                        >
                          Open source in VerseNet
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Document & Signal Viewers */}
      {activeModal === 'document' && selectedDoc && (
        <DocumentModal
          file={selectedDoc}
          onClose={() => {
            setActiveModal(null);
            setSelectedDoc(null);
          }}
        />
      )}
      {activeModal === 'sig' && activeSelected && (
        <SignalPlayerModal
          title={activeSelected.name}
          onClose={() => {
            setActiveModal(null);
            setSelectedDoc(null);
          }}
        />
      )}

      {/* Image Viewer Modal */}
      {activeModal === 'image' && activeSelected && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label={activeSelected.name}>
          <div className="fylo-modal">
            <header>
              <div>
                <span className="files-type-label">{resolveFileExtension(activeSelected.name).dotExt}</span>
                <h3>{activeSelected.name}</h3>
              </div>
              <button type="button" aria-label="Close image viewer" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-image-body">
              {activeSelected.imageUrl ? (
                <img src={activeSelected.imageUrl} alt={activeSelected.desc || activeSelected.name} />
              ) : (
                <div className="fylo-image-placeholder">
                  <ImageIcon size={32} />
                  <p>{activeSelected.desc || 'Image file retained in Fylo.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fylo Note Editor Modal */}
      {activeModal === 'note' && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Fylo Note Editor">
          <form className="fylo-modal" onSubmit={handleSaveNote}>
            <header>
              <div>
                <span className="files-type-label">FYLO NOTE EDITOR</span>
                <h3>{editingNoteId ? `Edit ${noteName}` : 'New personal note'}</h3>
              </div>
              <button type="button" aria-label="Close note editor" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-note-form">
              <div className="fylo-note-row">
                <label>
                  Filename
                  <input type="text" required value={noteName} onChange={e => setNoteName(e.target.value)} placeholder="Field_Observation.note" />
                </label>
                {!editingNoteId && (
                  <label>
                    Format
                    <select value={noteExt} onChange={e => setNoteExt(e.target.value as 'note' | 'txt')}>
                      <option value="note">.note (Fylo Note)</option>
                      <option value="txt">.txt (Plain text)</option>
                    </select>
                  </label>
                )}
              </div>
              <label>
                Summary
                <input type="text" value={noteDesc} onChange={e => setNoteDesc(e.target.value)} placeholder="Short description for Fylo listing" />
              </label>
              <label>
                Contents
                <textarea rows={8} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="Write your note here…" />
              </label>
              <div className="fylo-note-actions">
                <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <Button type="submit" size="sm" variant="solid" className="fylo-submit-btn">
                  Save to Fylo
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Create Folder Modal */}
      {activeModal === 'folder' && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Create Folder">
          <form className="fylo-modal" onSubmit={handleCreateFolder}>
            <header>
              <div>
                <span className="files-type-label">NEW FOLDER</span>
                <h3>Create personal folder</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-note-form">
              <label>
                Folder name
                <input type="text" required value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. research-notes" />
              </label>
              <div className="fylo-note-actions">
                <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <Button type="submit" size="sm" variant="solid" className="fylo-submit-btn">
                  Create Folder
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Rename File Modal */}
      {activeModal === 'rename' && activeSelected && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Rename File">
          <form className="fylo-modal" onSubmit={handleRenameSubmit}>
            <header>
              <div>
                <span className="files-type-label">RENAME FILE</span>
                <h3>Rename {activeSelected.name}</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-note-form">
              <label>
                New filename (must retain .{activeSelected.type})
                <input type="text" required value={renameValue} onChange={e => setRenameValue(e.target.value)} />
              </label>
              <div className="fylo-note-actions">
                <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <Button type="submit" size="sm" variant="solid" className="fylo-submit-btn">
                  Rename
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Move File Modal */}
      {activeModal === 'move' && activeSelected && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Move File">
          <form className="fylo-modal" onSubmit={handleMoveSubmit}>
            <header>
              <div>
                <span className="files-type-label">MOVE FILE</span>
                <h3>Move {activeSelected.name}</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-note-form">
              <label>
                Destination folder
                <select value={moveTargetDir} onChange={e => setMoveTargetDir(e.target.value)}>
                  {directories
                    .filter(d => d !== '/system')
                    .map(dir => (
                      <option key={dir} value={dir}>
                        {directoryName(dir)} ({dir})
                      </option>
                    ))}
                </select>
              </label>
              <div className="fylo-note-actions">
                <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <Button type="submit" size="sm" variant="solid" className="fylo-submit-btn">
                  Move File
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Permanent Delete Modal */}
      {activeModal === 'confirmDelete' && activeSelected && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm permanent deletion">
          <div className="fylo-modal">
            <header>
              <div>
                <span className="files-type-label">CONFIRM DELETION</span>
                <h3>Permanently delete {activeSelected.name}?</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-note-form">
              <p className="text-xs text-slate-600">
                This permanently removes your personal copy from Fylo Trash. Authoritative institutional records are unaffected.
              </p>
              <div className="fylo-note-actions">
                <button type="button" className="fylo-cmd-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="button" className="fylo-cmd-btn fylo-cmd-danger" onClick={handleDeletePermanentConfirmed}>
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30 File Extensions & General Rules Reference Modal */}
      {activeModal === 'catalog' && (
        <div className="fylo-modal-backdrop" role="dialog" aria-modal="true" aria-label="Fylo File Types and Rules">
          <div className="fylo-modal fylo-modal-wide">
            <header>
              <div>
                <span className="files-type-label">FYLO SYSTEMS · 30 EXTENSIONS</span>
                <h3>File Types, Associations & General Rules</h3>
              </div>
              <button type="button" aria-label="Close file types catalog" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="fylo-catalog-scroll">
              <div className="fylo-core-grid">
                {CORE_APPLICATIONS.map(app => (
                  <div key={app.name} className="fylo-core-card">
                    <strong>{app.name}</strong>
                    <p>{app.purpose}</p>
                  </div>
                ))}
              </div>

              <table className="fylo-ext-table">
                <thead>
                  <tr>
                    <th>Extension</th>
                    <th>Purpose</th>
                    <th>Associated Application</th>
                  </tr>
                </thead>
                <tbody>
                  {FILE_EXTENSIONS.map(spec => (
                    <tr key={spec.ext}>
                      <td>
                        <code>{spec.dotExt}</code>
                      </td>
                      <td>{spec.purpose}</td>
                      <td>{spec.associatedApp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="fylo-rules-box">
                <strong>General File Rules</strong>
                <ol>
                  {GENERAL_FILE_RULES.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
