import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Printer, Sparkles, UserCheck, Shield, 
  Building, HeartPulse, GraduationCap, Eye, Layers, Clock, CheckCircle2, ChevronRight, RefreshCw
} from 'lucide-react';
import { 
  type CitizenRecord, 
  buildSingleDocumentHtml, 
  buildFullPacketHtml, 
  triggerHtmlDownload,
  recordIssuedSnapshot,
  renderAuraIdHtml,
  renderAuraPassportHtml,
  renderBirthCertificateHtml,
  renderFingerprintFormHtml,
  renderInvestigativeProfileHtml,
  renderResidencyRecordHtml,
  renderPhysicalSheetHtml,
  renderMedicalSummaryHtml,
  renderEducationEmploymentHtml
} from '../services/documentPacketGenerator';
import PortraitStudioModal from '../components/portrait/PortraitStudioModal';
import { MaidIdentityService } from '../services/maidIdentityService';
import { getActiveCitizenContext, openCitizenInApp } from '../integration/citizenBridge';
import { citizenSelection, subscribeCitizenUpdates } from '../integration/citizenEvents';
import { authorizeAuraAction, evaluateAuraRecordPermissions, resolveAuraActor } from '../integration/auraPermissions';
import { useOSStore } from '../store/useOSStore';
import { BRAND_KITS, brandKitCssVariables } from '../game-content/worldAssetLibrary';
import { restoreFyloState } from './files/fyloStore';
import { ornamentFor } from '../data/designAssets';
import '../styles/apps/DocumentStudio.css';

const DEFAULT_CITIZEN: CitizenRecord = {
  name: 'Kieran Vesper',
  dob: '1997-11-12',
  place: 'Nephele Cloud-Spire',
  record: 'MRD-8492-322',
  maid: 'MAID-OR-00481929',
  registrationRegionCode: 'OR',
  legacyAliases: ['MRD-8492-322'],
  passport: 'AUR-782201',
  alias: 'K. Vesper',
  address: 'Citadel Annex, Aureline Central, Orynvell',
  phone: '+1 (202) 555-0149',
  email: 'kieran.vesper@dga.gov',
  district: 'Aureline Central District',
  height: '179 cm',
  eyes: 'Storm Slate',
  hair: 'Dark Ash',
  build: 'Athletic / Calibrated',
  blood: 'O+ (Aura Calibrated)',
  mark: 'Calibrated DGA neural-link sigil',
  species: 'Humanoid · Celestial Citizen',
  ancestry: 'Nephele Lineage',
  abilities: 'Tactical counter-intrusion, spectral trace diagnostics',
  powerSource: 'Hardened Aether-Core',
  affinity: 'Cobalt · vigilance / clarity',
  faction: 'Department of Global Affairs (DGAOS)',
  home: 'Nephele',
  lore: 'Registered canonical citizen holding an Orynvell-issued MAID while residing in Nephele.',
  category: 'DGA / TRACE Operational',
  affiliation: 'Department of Global Affairs (DGAOS)',
  occupation: 'Field Liaison',
  clearance: 'DGA Clearance · Level III',
  aura: 'Calibrated Harmonic Tier III',
  medical: 'Faith Medical Group · intake verified',
  residency: 'Nephele Residency · Verified',
  history: 'Canonical miraverse.db citizen record.',
  status: 'ACTIVE / VERIFIED',
  links: 'Synchronized with AURA Registry and DGAOS.',
  relationships: 'DGAOS Field Liaison Roster',
  household: 'Nephele Residency',
  timeline: 'Registered under Orynvell authority; residing in Nephele',
  biometricSeed: 'MAID-OR-00481929'
};

const DOCUMENT_TABS = [
  { id: 1, title: 'Aura Citizen ID', subtitle: 'Biometric Wallet Card', icon: UserCheck, color: 'text-indigo-400' },
  { id: 2, title: 'Aura Passport', subtitle: 'Official Travel Booklet', icon: Layers, color: 'text-amber-400' },
  { id: 3, title: 'Birth Certificate', subtitle: 'Crown Archival Record', icon: FileText, color: 'text-purple-400' },
  { id: 4, title: '10-Print Biometrics', subtitle: 'Forensic Dermal Sheet', icon: Shield, color: 'text-blue-400' },
  { id: 5, title: 'Investigative Profile', subtitle: 'DGAOS EYES Dossier', icon: Shield, color: 'text-rose-400' },
  { id: 6, title: 'Residency Record', subtitle: 'Municipal Domicile Form', icon: Building, color: 'text-emerald-400' },
  { id: 7, title: 'Physical ID Sheet', subtitle: 'Forensic Biometrics & Marks', icon: Eye, color: 'text-cyan-400' },
  { id: 8, title: 'Medical Summary', subtitle: 'Faith Medical Group Summary', icon: HeartPulse, color: 'text-teal-400' },
  { id: 9, title: 'Education / Service', subtitle: 'Cyberium / Dawn / WORKNET', icon: GraduationCap, color: 'text-yellow-400' },
];

export default function DocumentStudioApp() {
  const [citizens, setCitizens] = useState<CitizenRecord[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenRecord>(DEFAULT_CITIZEN);
  const [activeDocId, setActiveDocId] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isPortraitModalOpen, setIsPortraitModalOpen] = useState(false);
  const [issuanceNotice, setIssuanceNotice] = useState<string | null>(null);
  const [studioMode, setStudioMode] = useState<'civic' | 'editorial'>('civic');
  const [edTitle, setEdTitle] = useState('Aureline Press & Institutional Dispatch');
  const [edKicker, setEdKicker] = useState('PRESS RELEASE · PUBLIC INFORMATION');
  const [edBrandKit, setEdBrandKit] = useState('the-meridian');
  const [edFormat, setEdFormat] = useState<'doc' | 'docx' | 'pdf'>('docx');
  const [edBody, setEdBody] = useState(
    'FOR IMMEDIATE RELEASE — MERIDION EIGHT REALMS\n\nPrepared in Document Studio for distribution to Fylo, AureMail, or formal filing with Orynvell Public Records.\n\n1. Summary of Notice\nProvide verified facts, dates, and responsible institutional contacts.\n\n2. Public Access & Provenance\nRetaining or transmitting this document in Fylo preserves its extension and contents without conferring authority to alter sealed registries.',
  );
  const fyloRaw = useOSStore(s => s.gameplay.player?.fylo);
  const fyloDocs = Object.values(restoreFyloState(fyloRaw).files).filter(f => ['doc', 'docx', 'pdf'].includes(f.type) && !f.trashedAt);
  const academicRecords = useOSStore(s => s.gameplay.academics);
  const osPlayer = useOSStore(s => s.gameplay.player);
  const osIdentity = useOSStore(s => s.gameplay.identity);
  const isLoggedIn = useOSStore(s => s.isLoggedIn);
  const auraActor = resolveAuraActor({ player: osPlayer, identity: osIdentity, isLoggedIn });
  const recordPermissions = evaluateAuraRecordPermissions(selectedCitizen as any, auraActor);

  const selectedCitizenRef = useRef(selectedCitizen);
  const mountedRef = useRef(false);
  const loadVersionRef = useRef(0);
  useEffect(() => { selectedCitizenRef.current = selectedCitizen; }, [selectedCitizen]);

  const loadSavedCitizens = async (overrideCitizenId?: string, overrideDocId?: number) => {
    const version = ++loadVersionRef.current;
    try {
      const rawList = await MaidIdentityService.ensureDefaultPopulationSeeded();
      if (!mountedRef.current || version !== loadVersionRef.current) return;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const list: CitizenRecord[] = rawList
          .filter(person => evaluateAuraRecordPermissions(person, auraActor).canViewRecord)
          .map(person => ({ ...person, record: person.maid || person.legacyRecord || person.id }));
        const current = selectedCitizenRef.current;
        const targetId = overrideCitizenId || current.maid || current.record;
        const matched = list.find(citizen => citizen.maid === targetId || citizen.record === targetId || (citizen as any).legacyRecord === targetId || (citizen as any).id === targetId);
        setCitizens(list);
        if (matched) {
          selectedCitizenRef.current = matched;
          setSelectedCitizen(matched);
        }
        if (Number.isInteger(overrideDocId) && overrideDocId! >= 1 && overrideDocId! <= 9) setActiveDocId(overrideDocId!);
        return;
      }
    } catch {
      if (!mountedRef.current || version !== loadVersionRef.current) return;
      setIssuanceNotice('Citizen records could not be refreshed. Your current document selection has been kept.');
    }
    setCitizens(current => current.length ? current : [DEFAULT_CITIZEN]);
  };

  useEffect(() => {
    mountedRef.current = true;
    const rawContext = getActiveCitizenContext();
    const context = citizenSelection(rawContext);
    void loadSavedCitizens(context?.citizenId, rawContext && Date.now() - rawContext.timestamp < 15000 ? context?.targetDocId : undefined);
    const unsubscribe = subscribeCitizenUpdates(update => { void loadSavedCitizens(update.citizenId, update.targetDocId); });
    return () => {
      mountedRef.current = false;
      ++loadVersionRef.current;
      unsubscribe();
    };
  }, []);

  const handleCitizenChange = (recordId: string) => {
    const found = citizens.find(citizen => citizen.maid === recordId || citizen.record === recordId || (citizen as any).id === recordId || (citizen as any).legacyRecord === recordId);
    if (found) {
      ++loadVersionRef.current;
      selectedCitizenRef.current = found;
      setSelectedCitizen(found);
    }
  };

  const handlePrintCurrent = () => {
    window.print();
  };

  const handleDownloadCurrentHtml = () => {
    const auth = authorizeAuraAction('issue_document', { actor: auraActor, targetPerson: selectedCitizen as any, documentId: activeDocId });
    if (!auth.authorized) {
      setIssuanceNotice(auth.reason || 'Institutional authorization required to export this document.');
      return;
    }
    const docInfo = DOCUMENT_TABS.find(t => t.id === activeDocId);
    const slug = (selectedCitizen.name || 'citizen').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const idKey = selectedCitizen.maid || selectedCitizen.record;
    const filename = `${docInfo?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${slug}_${idKey}.html`;
    const html = buildSingleDocumentHtml(activeDocId, selectedCitizen);
    triggerHtmlDownload(html, filename);
  };

  const handleExportFullPacket = () => {
    const auth = authorizeAuraAction('issue_full_packet', { actor: auraActor, targetPerson: selectedCitizen as any });
    if (!auth.authorized) {
      setIssuanceNotice(auth.reason || 'Sovereign Administrator or Registrar/DGA authorization required to export the full 9-document packet.');
      return;
    }
    const slug = (selectedCitizen.name || 'citizen').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const idKey = selectedCitizen.maid || selectedCitizen.record;
    const filename = `miraverse_nine_document_packet_${slug}_${idKey}.html`;
    const html = buildFullPacketHtml(selectedCitizen);
    triggerHtmlDownload(html, filename);

    // Record formal issuance snapshot
    const record = recordIssuedSnapshot({
      documentType: 'FULL_NINE_DOCUMENT_PACKET',
      citizenId: idKey,
      citizenName: selectedCitizen.name,
      issuedAt: new Date().toISOString(),
      issuingAuthority: 'Aureline Civic Identity Administration & Crown Archives',
      version: '1.0'
    });

    setIssuanceNotice(`Exported complete 9-document packet! Snapshot logged: [${record.id}]`);
    setTimeout(() => setIssuanceNotice(null), 4000);
  };

  const handleLogIssuance = () => {
    const auth = authorizeAuraAction('issue_document', { actor: auraActor, targetPerson: selectedCitizen as any, documentId: activeDocId });
    if (!auth.authorized) {
      setIssuanceNotice(auth.reason || 'Institutional authorization required to log a formal issuance snapshot.');
      return;
    }
    const docInfo = DOCUMENT_TABS.find(t => t.id === activeDocId);
    const idKey = selectedCitizen.maid || selectedCitizen.record;
    const record = recordIssuedSnapshot({
      documentType: docInfo?.title || 'CIVIL_DOCUMENT',
      citizenId: idKey,
      citizenName: selectedCitizen.name,
      issuedAt: new Date().toISOString(),
      issuingAuthority: 'Aureline Civic Identity Bureau',
      version: '1.0'
    });

    setIssuanceNotice(`Formal issuance snapshot created for ${idKey}: [${record.id}] (Hash: ${record.hash})`);
    setTimeout(() => setIssuanceNotice(null), 4000);
  };

  const handleSaveCurrentToFylo = () => {
    if (!recordPermissions.allowedDocumentIds.includes(activeDocId)) {
      setIssuanceNotice('Institutional authorization required to retain a copy of this record in Fylo.');
      return;
    }
    const docInfo = DOCUMENT_TABS.find(t => t.id === activeDocId);
    const title = docInfo?.title || 'Document';
    const slug = `${title}_${selectedCitizen.name || 'citizen'}`.replace(/[^a-zA-Z0-9]+/g, '_');
    const idKey = selectedCitizen.maid || selectedCitizen.record;
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `docstudio:${idKey}:${activeDocId}`,
      name: `${slug}.doc`,
      desc: `${title} — retained personal copy (${selectedCitizen.name})`,
      body: `${title}\nPrepared for: ${selectedCitizen.name} (${idKey})\nSubtitle: ${docInfo?.subtitle || ''}\nOrigin: Document Studio\nNote: Personal copy retained in Fylo. Authoritative institutional records remain with their issuing agency.`,
      dir: '/documents',
      publisher: 'Document Studio',
      origin: 'document-studio',
      version: 'v1.0',
    });
    setIssuanceNotice(res.message || `Saved ${slug}.doc to Fylo (/documents).`);
    setTimeout(() => setIssuanceNotice(null), 4000);
  };

  const handleSaveEditorialDocToFylo = () => {
    const cleanSlug = (edTitle || 'untitled-document').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'Document';
    const filename = `${cleanSlug}.${edFormat}`;
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `docstudio:ed:${cleanSlug.toLowerCase()}:${edFormat}`,
      name: filename,
      desc: `${edKicker} — ${edTitle}`,
      body: `${edKicker}\n${edTitle}\nBrand Style: ${BRAND_KITS[edBrandKit]?.name || edBrandKit}\n\n${edBody}`,
      dir: '/documents',
      publisher: BRAND_KITS[edBrandKit]?.name || 'Document Studio',
      origin: 'document-studio',
      version: 'v1.0',
    });
    setIssuanceNotice(res.message || `Saved ${filename} to Fylo (/documents).`);
    setTimeout(() => setIssuanceNotice(null), 4000);
  };

  const handleFileNoticeToOrynvell = () => {
    const res = useOSStore.getState().orynvellAction('submitRequest', {
      serviceType: 'public-filing',
      details: `[${edKicker}] ${edTitle}\n\n${edBody}`.slice(0, 1900),
    });
    setIssuanceNotice(res.message);
    setTimeout(() => setIssuanceNotice(null), 4500);
  };

  // Render the active document HTML inline
  const renderActiveDocumentContent = () => {
    if (!recordPermissions.allowedDocumentIds.includes(activeDocId)) {
      return (
        <div className="p-8 text-center text-slate-300 bg-slate-900/90 rounded-xl border border-amber-500/30">
          <Shield size={28} className="mx-auto mb-2 text-amber-400" />
          <h3 className="text-base font-bold text-white mb-1">Institutional Authorization Required</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {authorizeAuraAction('issue_document', { actor: auraActor, targetPerson: selectedCitizen as any, documentId: activeDocId }).reason}
          </p>
        </div>
      );
    }
    switch (activeDocId) {
      case 1:
        return <div dangerouslySetInnerHTML={{ __html: renderAuraIdHtml(selectedCitizen) }} />;
      case 2:
        return <div dangerouslySetInnerHTML={{ __html: renderAuraPassportHtml(selectedCitizen) }} />;
      case 3:
        return <div dangerouslySetInnerHTML={{ __html: renderBirthCertificateHtml(selectedCitizen) }} />;
      case 4:
        return <div dangerouslySetInnerHTML={{ __html: renderFingerprintFormHtml(selectedCitizen) }} />;
      case 5:
        return <div dangerouslySetInnerHTML={{ __html: renderInvestigativeProfileHtml(selectedCitizen) }} />;
      case 6:
        return <div dangerouslySetInnerHTML={{ __html: renderResidencyRecordHtml(selectedCitizen) }} />;
      case 7:
        return <div dangerouslySetInnerHTML={{ __html: renderPhysicalSheetHtml(selectedCitizen) }} />;
      case 8:
        return <div dangerouslySetInnerHTML={{ __html: renderMedicalSummaryHtml(selectedCitizen) }} />;
      case 9:
        return <div dangerouslySetInnerHTML={{ __html: renderEducationEmploymentHtml(selectedCitizen) }} />;
      default:
        return <div dangerouslySetInnerHTML={{ __html: renderAuraIdHtml(selectedCitizen) }} />;
    }
  };

  return (
    <div className="document-studio">
      <aside className="document-library" aria-label="Official document library">
        <header>
          <img className="app-ornament" src={ornamentFor('documentStudio')} alt="" aria-hidden="true" />
          <span className="workspace-kicker">Studio / documents & press</span>
          <h1>{studioMode === 'civic' ? 'The civil file.' : 'Editorial & Press.'}</h1>
          <p>{studioMode === 'civic' ? 'Nine records. One identity.' : 'Author .doc, .docx & .pdf reports.'}</p>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem' }}>
            <button type="button" aria-pressed={studioMode === 'civic'} onClick={() => setStudioMode('civic')} style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', borderRadius: '6px' }}>
              9-Doc Packet
            </button>
            <button type="button" aria-pressed={studioMode === 'editorial'} onClick={() => setStudioMode('editorial')} style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', borderRadius: '6px' }}>
              Press & .docx/.pdf
            </button>
          </div>
        </header>
        {studioMode === 'civic' ? (
          <>
            <label className="document-citizen-label">Prepared for<select id="doc-studio-citizen-select" aria-label="Document citizen" value={selectedCitizen.maid || selectedCitizen.record} onChange={event => handleCitizenChange(event.target.value)}>{citizens.map(citizen => <option key={citizen.maid || citizen.record} value={citizen.maid || citizen.record}>{citizen.name}</option>)}</select></label>
            <nav aria-label="Choose a document">{DOCUMENT_TABS.map(document => <button key={document.id} aria-pressed={activeDocId === document.id} onClick={() => setActiveDocId(document.id)}><span className="document-file-number">{document.id.toString().padStart(2, '0')}</span><span><strong>{document.title}</strong><small>{document.subtitle}</small></span></button>)}</nav>
            <div className="document-library-actions"><button className="document-export" onClick={handleExportFullPacket}><Download size={14} />Export complete packet</button><details><summary>Record actions</summary><button onClick={() => openCitizenInApp(selectedCitizen.maid || selectedCitizen.record, 'meridionRegistry', { sourceApp: 'documentStudio' })}>Open citizen dossier</button><button onClick={() => setIsPortraitModalOpen(true)}>Edit portrait</button><button onClick={handleLogIssuance}>Log issuance snapshot</button></details></div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem', padding: '0.5rem 0' }}>
            <label className="document-citizen-label">
              Brand / Typography Kit
              <select value={edBrandKit} onChange={e => setEdBrandKit(e.target.value)}>
                {Object.values(BRAND_KITS).map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </label>
            <label className="document-citizen-label">
              Fylo File Extension
              <select value={edFormat} onChange={e => setEdFormat(e.target.value as 'doc' | 'docx' | 'pdf')}>
                <option value="docx">.docx (Modern Editable Document)</option>
                <option value="doc">.doc (Classic Editable Document)</option>
                <option value="pdf">.pdf (Fixed-Layout Publication)</option>
              </select>
            </label>
            {fyloDocs.length > 0 && (
              <label className="document-citizen-label">
                Open from Fylo (/documents)
                <select
                  defaultValue=""
                  onChange={e => {
                    const found = fyloDocs.find(d => d.id === e.target.value);
                    if (found) {
                      setEdTitle(found.name.replace(/\.(doc|docx|pdf)$/i, ''));
                      setEdBody(found.body || '');
                    }
                  }}
                >
                  <option value="">Select saved Fylo document…</option>
                  {fyloDocs.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="document-library-actions">
              <button type="button" className="document-export" onClick={handleSaveEditorialDocToFylo}>
                <FileText size={14} /> Save .{edFormat} to Fylo
              </button>
              <button type="button" onClick={handleFileNoticeToOrynvell} style={{ marginTop: '0.35rem', padding: '0.45rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                File Public Notice to Orynvell Records
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className="document-workbench">
        <header className="document-toolbar">
          <div>
            <span className="workspace-kicker">
              {studioMode === 'civic' ? `Document ${activeDocId.toString().padStart(2, '0')} / 09` : `Editorial Desk · .${edFormat.toUpperCase()}`}
            </span>
            <h2>{studioMode === 'civic' ? DOCUMENT_TABS.find(document => document.id === activeDocId)?.title : edTitle}</h2>
          </div>
          <div className="document-toolbar-actions">
            <div className="document-zoom"><button aria-label="Zoom out" onClick={() => setZoomScale(Math.max(60, zoomScale - 10))}>−</button><span>{zoomScale}%</span><button aria-label="Zoom in" onClick={() => setZoomScale(Math.min(140, zoomScale + 10))}>+</button></div>
            <button onClick={handlePrintCurrent}><Printer size={14} /><span>Print</span></button>
            <button onClick={studioMode === 'civic' ? handleSaveCurrentToFylo : handleSaveEditorialDocToFylo}><FileText size={14} /><span>Save to Fylo</span></button>
            {studioMode === 'civic' && <button onClick={handleDownloadCurrentHtml}><Download size={14} /><span>Save HTML</span></button>}
          </div>
        </header>
        {issuanceNotice && <div className="document-notice" role="status"><CheckCircle2 size={14} /><span>{issuanceNotice}</span><button aria-label="Dismiss issuance notice" onClick={() => setIssuanceNotice(null)}>×</button></div>}
        <div className="document-pasteboard">
          <div className="document-paper" style={{ transform: `scale(${zoomScale / 100})`, transformOrigin: 'top center' }}>
            {studioMode === 'civic' ? (
              renderActiveDocumentContent()
            ) : (
              <div
                style={{
                  ...(brandKitCssVariables(edBrandKit) as React.CSSProperties),
                  background: 'var(--mk-bg-surface)',
                  color: 'var(--mk-text-primary)',
                  padding: '2.25rem',
                  border: '2px solid var(--mk-border-ornament)',
                  borderRadius: '8px',
                  fontFamily: 'var(--mk-font-body)',
                  display: 'grid',
                  gap: '0.85rem',
                }}
              >
                <input
                  aria-label="Document kicker"
                  value={edKicker}
                  onChange={e => setEdKicker(e.target.value)}
                  style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mk-accent-primary)', fontWeight: 700, background: 'transparent', borderBottom: '1px dashed var(--mk-border-ornament)', paddingBottom: '0.25rem' }}
                />
                <input
                  aria-label="Document title"
                  value={edTitle}
                  onChange={e => setEdTitle(e.target.value)}
                  style={{ fontFamily: 'var(--mk-font-display)', fontSize: '1.85rem', fontWeight: 700, color: 'var(--mk-text-primary)', background: 'transparent', borderBottom: '1px solid var(--mk-border-ornament)', paddingBottom: '0.35rem' }}
                />
                <textarea
                  aria-label="Document body"
                  rows={14}
                  value={edBody}
                  onChange={e => setEdBody(e.target.value)}
                  style={{ width: '100%', fontFamily: 'var(--mk-font-body)', fontSize: '1rem', lineHeight: 1.68, color: 'var(--mk-text-primary)', background: 'var(--mk-bg-elevated)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--mk-border-ornament)' }}
                />
              </div>
            )}
          </div>
        </div>
        <footer className="document-workbench-footer"><span>{selectedCitizen.maid || selectedCitizen.record}</span><span>Sovereign Realm of Meridion · Specimen view</span></footer>
      </main>
      {/* Integrated Portrait Studio Modal */}
      <PortraitStudioModal
        citizen={selectedCitizen}
        isOpen={isPortraitModalOpen}
        onClose={() => setIsPortraitModalOpen(false)}
        onPortraitSaved={(newUri) => {
          setSelectedCitizen(prev => ({ ...prev, portraitData: newUri }));
          loadSavedCitizens();
        }}
      />
    </div>
  );
}
