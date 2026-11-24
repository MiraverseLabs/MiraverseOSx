import React, { useState } from 'react';
import {
  Bookmark,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  FolderDown,
  HelpCircle,
  Landmark,
  Lock,
  Search,
  Shield,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useOSStore } from '../../../store/useOSStore';
import { OPPORTUNITIES } from '../../../gameplay/AssignmentFlow';
import { isOpportunityRevealed } from '../../../gameplay/ProgressionEngine';
import {
  ORYNVELL_DIVISIONS,
  RECORD_CATEGORIES,
  SERVICE_FAMILIES,
  canAccessStaffWorkspace,
  canReadFullRecord,
  searchOrynvellRecords,
  type PublicRecord,
  type ServiceRequestType,
} from './orynvellRecordsModel';
import './orynvell-records.css';

type PublicSection = 'home' | 'records' | 'services' | 'requests' | 'departments' | 'help';
type StaffTab = 'queue' | 'records' | 'audit';

export default function OrynvellRecordsSite() {
  const player = useOSStore(s => s.gameplay.player);
  const identity = useOSStore(s => s.gameplay.identity);
  const isLoggedIn = useOSStore(s => s.isLoggedIn);
  const orynvell = useOSStore(s => s.orynvellRecords);
  const orynvellAction = useOSStore(s => s.orynvellAction);

  const isStaff = canAccessStaffWorkspace(player, isLoggedIn);
  const actor = { isLoggedIn, clearance: Number(player?.clearanceLevel ?? 1), isStaff };

  const [section, setSection] = useState<PublicSection>('home');
  const [staffMode, setStaffMode] = useState(false);
  const [staffTab, setStaffTab] = useState<StaffTab>('queue');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedStaffRequestId, setSelectedStaffRequestId] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState('');
  const [notice, setNotice] = useState('');
  const availableMissions = OPPORTUNITIES.filter(o => isOpportunityRevealed(o.id, player) && !o.unlock);
  const defaultCiteMission =
    availableMissions.find(o => player?.worknetOrders?.[o.id]?.status === 'active')?.id ||
    player?.assignmentJournal?.selectedId ||
    availableMissions[0]?.id ||
    'ms-case-002';
  const [citeMissionId, setCiteMissionId] = useState<string>(defaultCiteMission);

  const handleCiteRecordToMission = (record: PublicRecord) => {
    const res = useOSStore.getState().citeInstitutionalEvidence({
      missionId: citeMissionId,
      sourceSystem: 'orynvell-records',
      recordId: record.id,
      title: record.title,
      referenceCode: `${record.id} (${record.version})`,
      custodian: `${record.custodian} · ${record.custodianship}`,
      citationText: `Orynvell Public Records Administration, ${record.id} (${record.version}): "${record.title}", Custodian: ${record.custodian} (${record.district}), Registered ${record.registeredDate}.`,
      excerpt: record.summary,
      certified: record.documentClass === 'Official Issued Document',
    });
    setNotice(res.message);
  };

  // Persistent search state (Search Continuity)
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const results = searchOrynvellRecords(
    orynvell.records,
    { query, category: categoryFilter, divisionId: divisionFilter, effectiveStatus: statusFilter },
    actor,
  );

  const selectedRecord: PublicRecord | null = selectedRecordId
    ? orynvell.records.find(r => r.id === selectedRecordId) || null
    : null;

  const openRecord = (id: string) => {
    setSelectedRecordId(id);
    setSection('records');
  };

  const startServiceForRecord = (serviceType: ServiceRequestType, recordId = '') => {
    orynvellAction('saveDraft', { serviceType, recordId, details: orynvell.draftForm.details });
    setSelectedRecordId(null);
    setSection('services');
  };

  const handleSaveExtractToFylo = (record: PublicRecord) => {
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `opr-extract:${record.id}:${record.version}`,
      name: `${record.id}_${record.version}.doc`,
      desc: `${record.title} — Informational Extract (${record.custodian})`,
      body: `ORYNVELL PUBLIC RECORDS — INFORMATIONAL EXTRACT (NOT CERTIFIED)\nRecord ID: ${record.id} (${record.version})\nTitle: ${record.title}\nCategory: ${record.category}\nCustodian: ${record.custodian} (${record.custodianship})\nJurisdiction: ${record.jurisdiction}\nDistrict: ${record.district}\nEffective Status: ${record.effectiveStatus}\n\nSummary:\n${record.summary}\n\nRegistered Fields:\n${Object.entries(record.structuredFields)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}`,
      dir: '/documents',
      publisher: 'Orynvell Public Records Administration',
      origin: 'versenet',
    });
    setNotice(res.message || `Saved extract ${record.id} to Fylo.`);
  };

  const handleSaveIssuedToFylo = (docId: string) => {
    const doc = orynvell.issuedDocuments.find(d => d.docId === docId);
    if (!doc) return;
    const res = useOSStore.getState().fyloAction('retainAttachment', {
      id: `opr-cert:${doc.docId}`,
      name: `${doc.docId}.pdf`,
      desc: doc.title,
      body: doc.bodyText,
      dir: '/documents',
      publisher: doc.issuingAuthority,
      origin: 'versenet',
      version: doc.recordVersion,
    });
    setNotice(res.message || `Saved certified document ${doc.docId} to Fylo.`);
  };

  const selectedStaffRequest = selectedStaffRequestId
    ? orynvell.requests.find(r => r.id === selectedStaffRequestId) || null
    : orynvell.requests[0] || null;

  return (
    <div className="opr-site">
      {/* Official Government Bar */}
      <div className="opr-gov-bar">
        <span>An official government records website of Orynvell · <strong>records.orynvell.gov</strong></span>
        <span>
          {isLoggedIn
            ? `AURA Verified: ${player?.name || 'Citizen'} (${identity?.maid || 'MAID-OR'})`
            : 'Public Visitor · Sign in via AURA for personal requests'}
        </span>
      </div>

      {/* Institutional Header */}
      <header className="opr-header">
        <button
          type="button"
          className="opr-brand"
          onClick={() => {
            setStaffMode(false);
            setSelectedRecordId(null);
            setSection('home');
          }}
        >
          <span className="opr-seal" aria-hidden="true">
            <Landmark size={20} />
          </span>
          <div>
            <strong>Orynvell Public Records</strong>
            <small>Orynvell Public Records Administration</small>
          </div>
        </button>

        {!staffMode && (
          <nav className="opr-nav" aria-label="Orynvell Public Records navigation">
            {([
              ['home', 'Home'],
              ['records', 'Records'],
              ['services', 'Services'],
              ['requests', `My Requests (${orynvell.requests.length})`],
              ['departments', 'Departments'],
              ['help', 'Help & Policies'],
            ] as [PublicSection, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? 'page' : undefined}
                onClick={() => {
                  setSelectedRecordId(null);
                  setSection(id);
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {isStaff && (
          <button
            type="button"
            className="opr-staff-toggle"
            data-active={staffMode}
            onClick={() => setStaffMode(v => !v)}
          >
            <Shield size={14} />
            {staffMode ? 'Return to Public Site' : 'Staff Workspace'}
          </button>
        )}
      </header>

      {notice && (
        <div className="opr-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      <main className="opr-main">
        {/* === STAFF WORKSPACE (Role-Gated, Related but Distinct) === */}
        {staffMode && isStaff ? (
          <section className="opr-staff-shell" aria-label="Orynvell Records Staff Workspace">
            <nav className="opr-staff-nav" aria-label="Staff sections">
              <span className="opr-eyebrow" style={{ color: '#d7e0e5', padding: '4px 8px 8px' }}>
                STAFF WORKSPACE
              </span>
              <button type="button" aria-pressed={staffTab === 'queue'} onClick={() => setStaffTab('queue')}>
                Request Queue ({orynvell.requests.filter(r => !['fulfilled', 'denied', 'closed'].includes(r.stage)).length})
              </button>
              <button type="button" aria-pressed={staffTab === 'records'} onClick={() => setStaffTab('records')}>
                Authoritative Catalog ({orynvell.records.length})
              </button>
              <button type="button" aria-pressed={staffTab === 'audit'} onClick={() => setStaffTab('audit')}>
                Audit Log ({orynvell.auditLog.length})
              </button>
            </nav>

            <div className="opr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffTab === 'queue' && (
                <>
                  <h2 style={{ margin: 0, fontSize: '1rem', color: '#233b54' }}>Departmental Service Queue</h2>
                  {orynvell.requests.length === 0 ? (
                    <p style={{ margin: 0, color: '#525d6c', fontSize: '0.82rem' }}>
                      No citizen service requests in the queue. Submit a request on the public site to process it here or let NPC clerks advance it over session ticks.
                    </p>
                  ) : (
                    orynvell.requests.map(req => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => setSelectedStaffRequestId(req.id)}
                        className="opr-cat-btn"
                        style={{
                          borderColor: selectedStaffRequest?.id === req.id ? '#233b54' : undefined,
                          background: selectedStaffRequest?.id === req.id ? '#e7ecf3' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <strong>{req.id} · {req.serviceLabel}</strong>
                          <span className="opr-badge" data-tone={req.stage === 'fulfilled' ? 'fulfilled' : undefined}>
                            {req.stage}
                          </span>
                        </div>
                        <small>Applicant: {req.applicantName} ({req.applicantMaid}) {req.recordId ? `· Record ${req.recordId}` : ''}</small>
                      </button>
                    ))
                  )}
                </>
              )}

              {staffTab === 'records' && (
                <>
                  <h2 style={{ margin: 0, fontSize: '1rem', color: '#233b54' }}>Complete Records Registry (Including Protected)</h2>
                  {orynvell.records.map(r => (
                    <div key={r.id} className="opr-record-row">
                      <div className="opr-badge-strip">
                        <span className="opr-badge">{r.id}</span>
                        <span className="opr-badge">{r.version}</span>
                        <span className="opr-badge">{r.custodianship}</span>
                        <span className="opr-badge" data-tone={r.accessClass !== 'public' ? 'restricted' : undefined}>
                          {r.accessClass}
                        </span>
                      </div>
                      <h3>{r.title}</h3>
                      <small style={{ color: '#525d6c' }}>{r.custodian} · {r.effectiveStatus} · {r.preservationStatus}</small>
                    </div>
                  ))}
                </>
              )}

              {staffTab === 'audit' && (
                <>
                  <h2 style={{ margin: 0, fontSize: '1rem', color: '#233b54' }}>Administrative Audit Trail</h2>
                  {orynvell.auditLog.length === 0 ? (
                    <p style={{ margin: 0, color: '#525d6c' }}>No administrative audit events logged yet.</p>
                  ) : (
                    orynvell.auditLog.map(ev => (
                      <div key={ev.id} style={{ padding: 10, borderRadius: 8, background: '#f5f4f2', border: '1px solid #d4dae2', fontSize: '0.78rem' }}>
                        <strong>{ev.action}</strong> · <code>{ev.targetId}</code> · Cycle {ev.cycle}
                        <div style={{ color: '#525d6c' }}>{ev.actor}: {ev.detail}</div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Staff Contextual Case Review Panel */}
            <aside className="opr-card opr-card-cloud" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="opr-eyebrow">CASE DETERMINATION</span>
              {!selectedStaffRequest ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#525d6c' }}>Select a request from the queue to inspect and issue a determination.</p>
              ) : (
                <>
                  <strong style={{ color: '#233b54' }}>{selectedStaffRequest.id} · {selectedStaffRequest.serviceLabel}</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>{selectedStaffRequest.details}</p>
                  <div className="opr-badge-strip">
                    <span className="opr-badge">Stage: {selectedStaffRequest.stage}</span>
                    {selectedStaffRequest.recordId && <span className="opr-badge">Record: {selectedStaffRequest.recordId}</span>}
                  </div>
                  {!['fulfilled', 'denied', 'closed'].includes(selectedStaffRequest.stage) && (
                    <div className="opr-form">
                      <label>
                        Determination / Certification Note
                        <textarea
                          rows={3}
                          value={staffNote}
                          onChange={e => setStaffNote(e.target.value)}
                          placeholder="Record verification findings or grounds for determination…"
                        />
                      </label>
                      <button
                        type="button"
                        className="opr-btn-primary"
                        onClick={() => {
                          const res = orynvellAction('staffDecide', {
                            requestId: selectedStaffRequest.id,
                            decision: 'approve',
                            note: staffNote,
                          });
                          setNotice(res.message);
                          setStaffNote('');
                        }}
                      >
                        <CheckCircle2 size={14} /> Approve & Issue Official Document
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="opr-btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            const res = orynvellAction('staffDecide', {
                              requestId: selectedStaffRequest.id,
                              decision: 'info-required',
                              note: staffNote || 'Additional supporting documentation requested.',
                            });
                            setNotice(res.message);
                            setStaffNote('');
                          }}
                        >
                          Request Info
                        </button>
                        <button
                          type="button"
                          className="opr-btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            const res = orynvellAction('staffDecide', {
                              requestId: selectedStaffRequest.id,
                              decision: 'deny',
                              note: staffNote || 'Denied under statutory disclosure policy.',
                            });
                            setNotice(res.message);
                            setStaffNote('');
                          }}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </aside>
          </section>
        ) : (
          <>
            {/* === PUBLIC SECTION 1: HOMEPAGE === */}
            {section === 'home' && (
              <>
                <section className="opr-hero">
                  <span className="opr-eyebrow">ORYNVELL PUBLIC RECORDS ADMINISTRATION</span>
                  <h1>Official government records and public services.</h1>
                  <p>
                    Search public property deeds, business filings, permits, and government proceedings, or request certified copies and administrative corrections.
                  </p>
                  <form
                    className="opr-search-bar"
                    onSubmit={e => {
                      e.preventDefault();
                      setSection('records');
                    }}
                  >
                    <input
                      type="search"
                      aria-label="Search Orynvell Public Records"
                      placeholder="Search by record ID (e.g. DEED-99401), property, organization, or topic…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                    <button type="submit" className="opr-btn-primary">
                      <Search size={15} /> Search Records
                    </button>
                  </form>
                </section>

                <section>
                  <span className="opr-eyebrow">POPULAR SERVICES</span>
                  <div className="opr-grid-4" style={{ marginTop: 10 }}>
                    {SERVICE_FAMILIES.slice(0, 4).map(service => (
                      <button
                        key={service.id}
                        type="button"
                        className="opr-cat-btn"
                        onClick={() => startServiceForRecord(service.id)}
                      >
                        <strong>{service.label}</strong>
                        <small>{service.description}</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <span className="opr-eyebrow">RECORD CATEGORIES</span>
                  <div className="opr-grid-4" style={{ marginTop: 10 }}>
                    {RECORD_CATEGORIES.map(cat => {
                      const count = searchOrynvellRecords(orynvell.records, { category: cat }, actor).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          className="opr-cat-btn"
                          onClick={() => {
                            setCategoryFilter(cat);
                            setSection('records');
                          }}
                        >
                          <strong>{cat}</strong>
                          <small>{count} indexed record{count === 1 ? '' : 's'}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {/* === PUBLIC SECTION 2: RECORDS SEARCH & DETAIL === */}
            {section === 'records' && !selectedRecord && (
              <section className="opr-search-layout">
                <aside className="opr-filter-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#233b54', fontWeight: 700, fontSize: '0.8rem' }}>
                    <SlidersHorizontal size={14} /> Filter Catalog
                  </div>
                  <label>
                    Keyword or Record ID
                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="DEED-99401, Aureline…" />
                  </label>
                  <label>
                    Category
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                      <option value="All">All Categories</option>
                      {RECORD_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Division
                    <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}>
                      <option value="All">All Divisions</option>
                      {ORYNVELL_DIVISIONS.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Effective Status
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="current">Current</option>
                      <option value="superseded">Superseded</option>
                      <option value="expired">Expired</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="opr-btn-secondary"
                    onClick={() => setNotice(orynvellAction('saveSearch', { query, category: categoryFilter }).message)}
                  >
                    <Bookmark size={13} /> Save Search
                  </button>
                </aside>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#233b54' }}>{results.length} matching public record{results.length === 1 ? '' : 's'}</strong>
                    {(query || categoryFilter !== 'All' || divisionFilter !== 'All') && (
                      <button
                        type="button"
                        className="opr-btn-secondary"
                        onClick={() => {
                          setQuery('');
                          setCategoryFilter('All');
                          setDivisionFilter('All');
                          setStatusFilter('All');
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {results.length === 0 ? (
                    <div className="opr-card">
                      <p style={{ margin: 0, color: '#525d6c' }}>
                        No permitted records match your criteria. Restricted or non-discoverable records require formal access authorization.
                      </p>
                    </div>
                  ) : (
                    results.map(rec => (
                      <article key={rec.id} className="opr-record-row">
                        <div className="opr-badge-strip">
                          <span className="opr-badge">{rec.id}</span>
                          <span className="opr-badge">{rec.category}</span>
                          <span className="opr-badge">{rec.custodianship}</span>
                          <span className="opr-badge" data-tone={rec.accessClass !== 'public' ? 'restricted' : undefined}>
                            {rec.accessClass}
                          </span>
                        </div>
                        <h3>{rec.title}</h3>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#525d6c' }}>{rec.summary}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          <small style={{ color: '#525d6c' }}>{rec.custodian} · {rec.district} · {rec.version}</small>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="opr-btn-primary" onClick={() => openRecord(rec.id)}>
                              View Record
                            </button>
                            <button
                              type="button"
                              className="opr-btn-secondary"
                              onClick={() => setNotice(orynvellAction('toggleSaveRecord', { recordId: rec.id }).message)}
                            >
                              {orynvell.savedRecordIds.includes(rec.id) ? 'Saved ✓' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* === RECORD DETAIL VIEW === */}
            {section === 'records' && selectedRecord && (
              <section className="opr-detail-layout">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <button type="button" className="opr-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setSelectedRecordId(null)}>
                    ← Back to Search Results
                  </button>

                  <article className="opr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div className="opr-badge-strip" style={{ marginBottom: 8 }}>
                        <span className="opr-badge">{selectedRecord.id}</span>
                        <span className="opr-badge">{selectedRecord.version}</span>
                        <span className="opr-badge">{selectedRecord.effectiveStatus}</span>
                        <span className="opr-badge">{selectedRecord.custodianship}</span>
                        <span className="opr-badge">{selectedRecord.documentClass}</span>
                      </div>
                      <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '1.35rem', color: '#233b54' }}>
                        {selectedRecord.title}
                      </h1>
                      <p style={{ margin: '6px 0 0', color: '#525d6c' }}>{selectedRecord.summary}</p>
                    </div>

                    {canReadFullRecord(selectedRecord, actor) ? (
                      <>
                        <dl className="opr-dl">
                          {Object.entries(selectedRecord.structuredFields).map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                        </dl>

                        <div>
                          <span className="opr-eyebrow">CONNECTED ENTITIES</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                            {selectedRecord.entities.map((e, i) => (
                              <span key={i} className="opr-badge">
                                {e.name} — {e.role} ({e.effectiveDates})
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="opr-eyebrow">VERSION & ADMINISTRATIVE HISTORY</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                            {selectedRecord.history.map((h, i) => (
                              <div key={i} style={{ padding: 10, borderRadius: 8, background: '#f5f4f2', border: '1px solid #d4dae2', fontSize: '0.8rem' }}>
                                <strong>{h.version}</strong> ({h.date}) — {h.summary} <small style={{ color: '#525d6c' }}>· {h.authority}</small>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="opr-card opr-card-cloud" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Lock size={18} color="#233b54" />
                        <div>
                          <strong style={{ color: '#233b54' }}>Restricted Record Content</strong>
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#525d6c' }}>
                            Full content requires Clearance {selectedRecord.minClearance ?? 2}+ or an approved Record Access Request through Records Access & Disclosure.
                          </p>
                        </div>
                      </div>
                    )}
                  </article>
                </div>

                {/* Contextual Service Panel */}
                <aside className="opr-card opr-card-cloud" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="opr-eyebrow">RECORD SERVICES</span>
                  <small style={{ color: '#525d6c' }}>
                    Custodian: <strong>{selectedRecord.custodian}</strong> ({selectedRecord.jurisdiction})
                  </small>
                  {canReadFullRecord(selectedRecord, actor) && (
                    <>
                      <button type="button" className="opr-btn-primary" onClick={() => handleSaveExtractToFylo(selectedRecord)}>
                        <FolderDown size={14} /> Save Informational Extract to Fylo
                      </button>
                      <div style={{ borderTop: '1px solid #d5dce3', paddingTop: 10, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="opr-eyebrow">WORKNET & CASEBOOK EVIDENCE</span>
                        <select
                          aria-label="Target mission for citation"
                          value={citeMissionId}
                          onChange={e => setCiteMissionId(e.target.value)}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff', color: '#1e293b' }}
                        >
                          {availableMissions.map(m => (
                            <option key={m.id} value={m.id}>
                              {player?.worknetOrders?.[m.id]?.status === 'active' ? '● ' : ''}{m.title}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="opr-btn-secondary" onClick={() => handleCiteRecordToMission(selectedRecord)}>
                          <Bookmark size={14} /> Cite as Mission Evidence
                        </button>
                      </div>
                    </>
                  )}
                  <button type="button" className="opr-btn-secondary" onClick={() => startServiceForRecord('certified-copy', selectedRecord.id)}>
                    <FileCheck2 size={14} /> Request Certified Copy (25 ₢)
                  </button>
                  <button type="button" className="opr-btn-secondary" onClick={() => startServiceForRecord('record-access', selectedRecord.id)}>
                    <Lock size={14} /> Request Access / Disclosure
                  </button>
                  <button type="button" className="opr-btn-secondary" onClick={() => startServiceForRecord('correction', selectedRecord.id)}>
                    <FileText size={14} /> Submit Correction / Amendment
                  </button>
                </aside>
              </section>
            )}

            {/* === PUBLIC SECTION 3: GOVERNMENT SERVICES FORM === */}
            {section === 'services' && (
              <section className="opr-grid-2">
                <div className="opr-card">
                  <span className="opr-eyebrow">GUIDED GOVERNMENT APPLICATION</span>
                  <h2 style={{ margin: '6px 0 12px', fontFamily: 'Georgia, serif', color: '#233b54' }}>Submit a Public Records Request</h2>
                  <form
                    className="opr-form"
                    onSubmit={e => {
                      e.preventDefault();
                      const res = orynvellAction('submitRequest', orynvell.draftForm);
                      setNotice(res.message);
                      if (res.ok) setSection('requests');
                    }}
                  >
                    <label>
                      Service Family
                      <select
                        value={orynvell.draftForm.serviceType}
                        onChange={e => orynvellAction('saveDraft', { serviceType: e.target.value as ServiceRequestType })}
                      >
                        {SERVICE_FAMILIES.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.label} ({s.feeCredits > 0 ? `${s.feeCredits} ₢ fee` : 'Free'})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Related Record ID (optional)
                      <input
                        type="text"
                        value={orynvell.draftForm.recordId}
                        onChange={e => orynvellAction('saveDraft', { recordId: e.target.value })}
                        placeholder="e.g. DEED-99401 or PROP-AUR-4B"
                      />
                    </label>
                    <label>
                      Request Details & Supporting Grounds
                      <textarea
                        rows={5}
                        required
                        value={orynvell.draftForm.details}
                        onChange={e => orynvellAction('saveDraft', { details: e.target.value })}
                        placeholder="Specify the document, correction grounds, or verification required…"
                      />
                    </label>
                    <small style={{ color: '#525d6c' }}>
                      Drafts save automatically. Submitted requests advance during active simulation time or via Staff Workspace review.
                    </small>
                    <button type="submit" className="opr-btn-primary">
                      Submit Official Request
                    </button>
                  </form>
                </div>

                <div className="opr-card opr-card-cloud" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="opr-eyebrow">AVAILABLE SERVICE FAMILIES</span>
                  {SERVICE_FAMILIES.map(s => (
                    <div key={s.id} style={{ padding: 10, borderRadius: 9, background: '#ffffff', border: '1px solid #d4dae2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#233b54', fontSize: '0.84rem' }}>{s.label}</strong>
                        <span className="opr-badge">{s.feeCredits > 0 ? `${s.feeCredits} ₢` : 'Free'}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#525d6c' }}>{s.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* === PUBLIC SECTION 4: MY REQUESTS (CITIZEN DASHBOARD) === */}
            {section === 'requests' && (
              <section className="opr-grid-2">
                <div className="opr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="opr-eyebrow">CITIZEN REQUEST HISTORY</span>
                  <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', color: '#233b54' }}>My Submitted Requests</h2>
                  {orynvell.requests.length === 0 ? (
                    <p style={{ margin: 0, color: '#525d6c' }}>No requests submitted yet. Visit Services to request a certified copy, access review, or correction.</p>
                  ) : (
                    orynvell.requests.map(req => (
                      <div key={req.id} className="opr-record-row">
                        <div className="opr-badge-strip">
                          <span className="opr-badge">{req.id}</span>
                          <span className="opr-badge" data-tone={req.stage === 'fulfilled' ? 'fulfilled' : undefined}>
                            {req.stage}
                          </span>
                          {req.recordId && <span className="opr-badge">{req.recordId}</span>}
                        </div>
                        <h3>{req.serviceLabel}</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#525d6c' }}>{req.details}</p>
                        {req.decisionNote && <small style={{ color: '#233b54' }}>Determination: {req.decisionNote}</small>}
                        {req.issuedDocId && (
                          <button type="button" className="opr-btn-primary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => handleSaveIssuedToFylo(req.issuedDocId!)}>
                            <FolderDown size={13} /> Save Certified Document ({req.issuedDocId}) to Fylo
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="opr-card">
                    <span className="opr-eyebrow">SAVED RECORD REFERENCES ({orynvell.savedRecordIds.length})</span>
                    {orynvell.savedRecordIds.length === 0 ? (
                      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#525d6c' }}>Bookmark records from the catalog for quick return.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {orynvell.savedRecordIds.map(id => (
                          <button key={id} type="button" className="opr-btn-secondary" onClick={() => openRecord(id)}>
                            Open {id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="opr-card opr-card-cloud">
                    <span className="opr-eyebrow">SAVED SEARCHES ({orynvell.savedSearches.length})</span>
                    {orynvell.savedSearches.length === 0 ? (
                      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#525d6c' }}>No saved searches yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {orynvell.savedSearches.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="opr-btn-secondary"
                            onClick={() => {
                              setQuery(s.query);
                              setCategoryFilter(s.category);
                              setSection('records');
                            }}
                          >
                            {s.query || 'All'} · {s.category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* === PUBLIC SECTION 5: DEPARTMENTS === */}
            {section === 'departments' && (
              <section className="opr-grid-2">
                {ORYNVELL_DIVISIONS.map(div => (
                  <article key={div.id} className="opr-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#233b54' }}>
                      <Building2 size={16} />
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>{div.name}</h3>
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '0.82rem', color: '#525d6c' }}>{div.remit}</p>
                    <small style={{ color: '#233b54', fontWeight: 600 }}>Lead: {div.lead}</small>
                  </article>
                ))}
              </section>
            )}

            {/* === PUBLIC SECTION 6: HELP & POLICIES === */}
            {section === 'help' && (
              <section className="opr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#233b54' }}>
                  <HelpCircle size={18} />
                  <h2 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Public Records Policies & Custodianship</h2>
                </div>
                <p style={{ margin: 0, color: '#525d6c' }}>
                  Orynvell Public Records operates under hybrid jurisdiction across Central Records Administration, participating Municipal/Regional Offices, and Affiliated Institutional Sources.
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#525d6c', fontSize: '0.84rem' }}>
                  <li><strong>Custodianship Transparency:</strong> Every record states whether Orynvell is Primary Custodian, Authorized Repository, Connected Source, or Reference Only.</li>
                  <li><strong>Institutional Boundaries:</strong> AURA remains authoritative for citizen identity, ORYN for financial accounts, Faith Medical for clinical care, DGAOS for classified investigations, and Royal Historic Society for sovereign manuscripts.</li>
                  <li><strong>Version Integrity:</strong> Approved corrections append a new version while preserving historical versions and prior issued certificates.</li>
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="opr-footer">
        <span>Orynvell Public Records Administration · records.orynvell.gov</span>
        <span>Hybrid Jurisdiction · AURA Identity Linked · Session-Based Processing</span>
      </footer>
    </div>
  );
}
