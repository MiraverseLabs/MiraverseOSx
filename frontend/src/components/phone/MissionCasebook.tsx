import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, BookOpen, Check, Compass, FileText, FolderOpen,
  Link2, Mail, Pin, Shield, StickyNote, X
} from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { OPPORTUNITIES, opportunityStatus, type Opportunity } from '../../gameplay/AssignmentFlow';
import { WORK_DEFINITIONS, resultForStage } from '../../gameplay/ActivityEngine';
import { BROAD_STREET, CASE_MISSION, restoreCaseProgress } from '../../gameplay/BroadStreetCase';
import { PROCESS_MISSION, requiredProcessEvidence, restoreProcessMonitor } from '../../gameplay/ProcessMonitor';
import { isOpportunityRevealed } from '../../gameplay/ProgressionEngine';
import { INSTITUTIONAL_REGISTRY } from '../../apps/worknet/worknetData';
import type { WorkplaceStationId } from '../../apps/JobWorkstationApp';
import '../../styles/casebook.css';

interface ObjectiveStep {
  id: string;
  label: string;
  done: boolean;
}

const NOTES_STORAGE_KEY = 'miraverse-casebook-notes-v1';
const TRACKED_STORAGE_KEY = 'miraverse-casebook-tracked-v1';

function loadNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveNotes(notes: Record<string, string>) {
  try { localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes)); } catch { /* ignore */ }
}

function buildObjectives(opp: Opportunity, player: any): ObjectiveStep[] {
  const order = player.worknetOrders?.[opp.id];
  const results = player.taskResults || {};

  if (opp.id === CASE_MISSION) {
    const progress = restoreCaseProgress(order?.caseProgress);
    return [
      { id: 'accept', label: 'Accept assignment & review briefing', done: Boolean(order?.briefingReadAt) },
      ...BROAD_STREET.sources.map(src => ({
        id: `src:${src.id}`,
        label: `Acquire ${src.title} (${src.app.toUpperCase()})`,
        done: progress.acquired.includes(src.id),
      })),
      { id: 'witness', label: 'Request & receive guard witness clarification', done: Boolean(progress.witnessRequested) },
      { id: 'finalize', label: 'Submit cited findings & close case', done: order?.status === 'accepted' },
    ];
  }

  if (opp.id === PROCESS_MISSION) {
    const monitor = restoreProcessMonitor(player.processMonitor);
    const acquiredCount = requiredProcessEvidence.filter(id => monitor.evidence.some(e => e.id === id)).length;
    return [
      { id: 'accept', label: 'Accept shared assignment & acknowledge briefing', done: Boolean(order?.briefingReadAt) },
      { id: 'ev', label: `Gather PID 512 diagnostics (${acquiredCount}/3 findings)`, done: acquiredCount >= 3 },
      { id: 'iso', label: 'Isolate PID 512 & verify containment', done: monitor.isolatedPids.includes(512) && monitor.verification?.revision === monitor.revision },
      { id: 'signoff', label: 'Submit diagnostic report & finalize WorkNet sign-off', done: Boolean(monitor.completion) || order?.status === 'accepted' },
    ];
  }

  const def = WORK_DEFINITIONS[opp.id];
  if (def) {
    return [
      { id: 'accept', label: 'Accept work order & review briefing', done: Boolean(order?.briefingReadAt) },
      ...def.stages.map(stage => ({
        id: stage.id,
        label: stage.title,
        done: Boolean(order && resultForStage(order, stage.id, results)),
      })),
    ];
  }

  return opp.missionIds.map(mid => {
    const child = OPPORTUNITIES.find(o => o.id === mid);
    const done = player.worknetOrders?.[mid]?.status === 'accepted' || player.completedWorknetMissionIds?.includes(mid);
    return { id: mid, label: child ? child.title : mid, done: Boolean(done) };
  });
}

function stationForOpportunity(opp: Opportunity): WorkplaceStationId {
  const def = WORK_DEFINITIONS[opp.id];
  const track = def?.track || 'dga';
  if (track === 'medical') return 'faithmed';
  if (track === 'archivist') return 'archives';
  if (track in INSTITUTIONAL_REGISTRY) return track as WorkplaceStationId;
  return 'dga';
}

export default function MissionCasebookOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = useOSStore(s => s.gameplay.player);
  const cycle = useOSStore(s => s.gameplay.timeCycleCount);

  const [tab, setTab] = useState<'overview' | 'evidence' | 'notes' | 'archive' | 'connections'>('overview');
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes);
  const [trackedId, setTrackedId] = useState<string>(() => {
    try { return localStorage.getItem(TRACKED_STORAGE_KEY) || ''; } catch { return ''; }
  });

  const classified = useMemo(() => {
    const active: Opportunity[] = [];
    const available: Opportunity[] = [];
    const completed: Opportunity[] = [];

    for (const opp of OPPORTUNITIES) {
      if (!isOpportunityRevealed(opp.id, player)) continue;
      const status = opportunityStatus(opp, player, cycle);
      if (status === 'In progress' || status === 'Journey ongoing') active.push(opp);
      else if (status === 'Completed' || status === 'Collected') completed.push(opp);
      else available.push(opp);
    }
    return { active, available, completed };
  }, [player, cycle]);

  const defaultSelected =
    (trackedId && OPPORTUNITIES.find(o => o.id === trackedId)) ||
    classified.active[0] ||
    classified.available[0] ||
    classified.completed[0] ||
    OPPORTUNITIES[0];

  const [selectedId, setSelectedId] = useState<string>(defaultSelected?.id || '');
  const selectedOpp = OPPORTUNITIES.find(o => o.id === selectedId) || defaultSelected;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !selectedOpp) return null;

  const updateNote = (id: string, value: string) => {
    const next = { ...notes, [id]: value };
    setNotes(next);
    saveNotes(next);
  };

  const toggleTrack = (id: string) => {
    const next = trackedId === id ? '' : id;
    setTrackedId(next);
    try { localStorage.setItem(TRACKED_STORAGE_KEY, next); } catch { /* ignore */ }
  };

  const jumpTo = (fn: () => void) => {
    fn();
    onClose();
  };

  const objectives = buildObjectives(selectedOpp, player);
  const doneCount = objectives.filter(o => o.done).length;
  const status = opportunityStatus(selectedOpp, player, cycle);
  const isCleared = status === 'Completed' || status === 'Collected';
  const station = INSTITUTIONAL_REGISTRY[stationForOpportunity(selectedOpp)] || INSTITUTIONAL_REGISTRY.dga;

  const allMissionFiles = Object.values(player.assignmentJournal?.files || {}) as any[];
  const currentFiles = allMissionFiles.filter(f => f.assignmentId === selectedOpp.id);
  const citedEvidence = player.assignmentJournal?.citations?.[selectedOpp.id] || [];
  const totalCount = classified.active.length + classified.available.length + classified.completed.length;
  const completionPct = totalCount ? Math.round((classified.completed.length / totalCount) * 100) : 0;

  return createPortal(
    <div className="cb-overlay" role="dialog" aria-modal="true" aria-label="Journal — The Casebook" onClick={onClose}>
      <div className="cb-shell" onClick={e => e.stopPropagation()}>
        {/* Top Masthead + Protruding Folder Index Tabs */}
        <div className="cb-top-strip">
          <div className="cb-masthead">
            <h2>Journal — The Casebook</h2>
            <p>Your active leads, collected mission files, and field notes.</p>
          </div>

          <nav className="cb-folder-tabs" aria-label="Casebook tabs">
            <button type="button" className="cb-folder-tab" data-active={tab === 'overview'} onClick={() => setTab('overview')}>
              <BookOpen size={12} /> Overview
            </button>
            <button type="button" className="cb-folder-tab" data-active={tab === 'evidence'} onClick={() => setTab('evidence')}>
              <FileText size={12} /> Evidence ({currentFiles.length + citedEvidence.length})
            </button>
            <button type="button" className="cb-folder-tab" data-active={tab === 'notes'} onClick={() => setTab('notes')}>
              <StickyNote size={12} /> Personal Notes
            </button>
            <button type="button" className="cb-folder-tab" data-active={tab === 'archive'} onClick={() => setTab('archive')}>
              <Archive size={12} /> Archive ({classified.completed.length})
            </button>
            <button type="button" className="cb-folder-tab" data-active={tab === 'connections'} onClick={() => setTab('connections')}>
              <Link2 size={12} /> Connections
            </button>
          </nav>

          <button type="button" className="cb-close-btn" onClick={onClose}>
            <X size={13} /> Close
          </button>
        </div>

        {/* Workspace: Left Index Drawer + Open Leather-Bound Two-Page Book */}
        <div className="cb-workspace">
          <aside className="cb-index-drawer">
            <div>
              <div className="cb-index-group-title">Active Missions ({classified.active.length})</div>
              {classified.active.length ? classified.active.map(opp => {
                const st = buildObjectives(opp, player);
                return (
                  <button key={opp.id} type="button" className="cb-index-item" data-selected={selectedOpp.id === opp.id} onClick={() => setSelectedId(opp.id)}>
                    <div>
                      <strong>{trackedId === opp.id ? '◆ ' : '◇ '}{opp.title}</strong>
                      <small>{opp.institution} · {st.filter(x => x.done).length}/{st.length}</small>
                    </div>
                  </button>
                );
              }) : <p style={{ fontSize: 11, color: '#8f8069', padding: '0 6px', fontStyle: 'italic' }}>No active work orders yet.</p>}
            </div>

            <div>
              <div className="cb-index-group-title">Open Leads ({classified.available.length})</div>
              {classified.available.map(opp => (
                <button key={opp.id} type="button" className="cb-index-item" data-selected={selectedOpp.id === opp.id} onClick={() => setSelectedId(opp.id)}>
                  <div>
                    <strong>{opp.title}</strong>
                    <small>{opp.kind.toUpperCase()} · {opp.institution}</small>
                  </div>
                </button>
              ))}
            </div>

            {classified.completed.length > 0 && (
              <div>
                <div className="cb-index-group-title">Completed ({classified.completed.length})</div>
                {classified.completed.map(opp => (
                  <button key={opp.id} type="button" className="cb-index-item" data-selected={selectedOpp.id === opp.id} onClick={() => setSelectedId(opp.id)}>
                    <div>
                      <strong>{opp.title}</strong>
                      <small>{opp.institution}</small>
                    </div>
                    <Check size={14} color="#86efac" />
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Open Leather-Bound Book */}
          <div className="cb-leather-cover">
            <div className="cb-book-spread">
              {/* LEFT PARCHMENT PAGE: Official Dossier & Live Checklist */}
              <section className="cb-page cb-page-left" aria-label="Mission dossier">
                <div className="cb-doc-header">
                  <div>
                    <div className="cb-doc-code">File {selectedOpp.id.toUpperCase()} · Cycle {cycle}</div>
                    <h3 className="cb-doc-title">{selectedOpp.title}</h3>
                  </div>
                  <span className="cb-stamp" data-cleared={isCleared}>
                    {isCleared ? 'CLEARED' : status === 'In progress' ? 'ACTIVE' : 'CONFIDENTIAL'}
                  </span>
                </div>

                <dl className="cb-meta-grid">
                  <div><dt>Institution</dt><dd>{selectedOpp.institution}</dd></div>
                  <div><dt>Location</dt><dd>{selectedOpp.location}</dd></div>
                  <div><dt>Category</dt><dd style={{ textTransform: 'capitalize' }}>{selectedOpp.kind}</dd></div>
                  <div><dt>Published Pay</dt><dd>{selectedOpp.reward}</dd></div>
                </dl>

                <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: '0 0 12px', color: '#2e2317' }}>
                  {selectedOpp.description}
                </p>

                <div className="cb-section-label">
                  <span>Objectives Checklist</span>
                  <span>{doneCount} / {objectives.length}</span>
                </div>
                <ul className="cb-obj-list">
                  {objectives.map(step => (
                    <li key={step.id} className="cb-obj-item" data-done={step.done}>
                      <span className="cb-diamond">{step.done ? '✓' : '◇'}</span>
                      <span>{step.label}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px dashed #b49f7d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="cb-track-btn" data-tracked={trackedId === selectedOpp.id} onClick={() => toggleTrack(selectedOpp.id)}>
                    <Pin size={12} /> {trackedId === selectedOpp.id ? 'Tracked Mission' : 'Track Mission'}
                  </button>
                  <button
                    type="button"
                    className="cb-track-btn"
                    data-tracked="true"
                    onClick={() => jumpTo(() => useOSStore.getState().openAssignment(selectedOpp.id))}
                  >
                    <Shield size={12} /> Open in WORKNET
                  </button>
                </div>
              </section>

              {/* RIGHT PARCHMENT PAGE: Tab-Specific View (Remarks / Evidence / Notes / Archive / Connections) */}
              <section className="cb-page cb-page-right" aria-label="Casebook notes and records">
                {tab === 'overview' && (
                  <>
                    <div className="cb-section-label" style={{ marginTop: 0 }}>
                      <span>Institutional Remarks</span>
                      <span>{station.shortOrg}</span>
                    </div>

                    <div className="cb-remark-card">
                      <div className="cb-remark-avatar">{station.supervisor.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{station.supervisor.name} · {station.supervisor.title}</strong>
                        <p>“{station.supervisor.expectations}”</p>
                      </div>
                    </div>

                    {station.coworkers.slice(0, 2).map(cw => (
                      <div key={cw.id} className="cb-remark-card">
                        <div className="cb-remark-avatar">{cw.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <strong>{cw.name} · {cw.title}</strong>
                          <p>“{cw.quote}”</p>
                        </div>
                      </div>
                    ))}

                    <div className="cb-section-label">
                      <span>Personal Field Notes</span>
                      <span>Auto-saved</span>
                    </div>
                    <textarea
                      className="cb-lined-notes"
                      value={notes[selectedOpp.id] || ''}
                      onChange={e => updateNote(selectedOpp.id, e.target.value)}
                      placeholder="Write your own leads, PIDs, names, or reminders to come back to..."
                    />
                  </>
                )}

                {tab === 'evidence' && (
                  <>
                    <div className="cb-section-label" style={{ marginTop: 0 }}>
                      <span>Cited Deeds, Filings & Manuscripts</span>
                      <span>{citedEvidence.length} Cited</span>
                    </div>
                    {citedEvidence.length ? citedEvidence.map(cite => (
                      <div key={cite.id} className="cb-file-slip">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 9.5, fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase', color: cite.sourceSystem === 'orynvell-records' ? '#1e3a5f' : '#7c2d12' }}>
                            {cite.sourceSystem === 'orynvell-records' ? 'Orynvell Public Records' : 'Royal Archive & Library'} · {cite.referenceCode}
                          </span>
                          {cite.certified && <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 800, color: '#166534' }}>CERTIFIED</span>}
                        </div>
                        <strong style={{ fontSize: 12.5, display: 'block' }}>{cite.title}</strong>
                        <small style={{ fontSize: 10.5, color: '#5c4b35', display: 'block', marginTop: 2 }}>{cite.custodian}</small>
                        <p style={{ fontSize: 11, color: '#3b2e1e', margin: '5px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>{cite.excerpt}</p>
                      </div>
                    )) : (
                      <p style={{ fontSize: 11.5, fontStyle: 'italic', color: '#5c4b35', marginBottom: 10 }}>
                        No deeds, filings, or manuscripts cited yet. Cite records directly from Orynvell Public Records or Royal Archive & Library to pin them here.
                      </p>
                    )}

                    <div className="cb-section-label">
                      <span>Collected Mission Files (Fylo)</span>
                      <span>/assignments/{selectedOpp.id}</span>
                    </div>
                    {currentFiles.length ? currentFiles.map(file => (
                      <div key={file.id} className="cb-file-slip">
                        <strong style={{ fontSize: 12.5, display: 'block' }}>{file.name}</strong>
                        <small style={{ fontSize: 11, color: '#5c4b35' }}>{file.desc}</small>
                      </div>
                    )) : (
                      <p style={{ fontSize: 12, fontStyle: 'italic', color: '#5c4b35' }}>
                        No files collected for this mission yet. Open its Fylo folder or accept the assignment in WORKNET to file its Briefing.txt and Assignment_checklist.txt.
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <button
                        type="button"
                        className="cb-track-btn"
                        data-tracked="true"
                        onClick={() => jumpTo(() => { useOSStore.getState().saveAssignmentBriefing(selectedOpp.id); useOSStore.getState().openAssignmentFiles(selectedOpp.id); })}
                      >
                        <FolderOpen size={12} /> Fylo Folder
                      </button>
                      <button
                        type="button"
                        className="cb-track-btn"
                        onClick={() => jumpTo(() => useOSStore.getState().openAppWorkspace('browser', 'https://records.orynvell.gov'))}
                      >
                        <FileText size={12} /> Orynvell Records
                      </button>
                      <button
                        type="button"
                        className="cb-track-btn"
                        onClick={() => jumpTo(() => useOSStore.getState().openWindow('lore'))}
                      >
                        <BookOpen size={12} /> Royal Library
                      </button>
                    </div>
                  </>
                )}

                {tab === 'notes' && (
                  <>
                    <div className="cb-section-label" style={{ marginTop: 0 }}>
                      <span>Personal Field Notes — {selectedOpp.title}</span>
                      <span>Auto-saved</span>
                    </div>
                    <textarea
                      className="cb-lined-notes"
                      style={{ minHeight: 360 }}
                      value={notes[selectedOpp.id] || ''}
                      onChange={e => updateNote(selectedOpp.id, e.target.value)}
                      placeholder="Keep your own running deductions, clue trails, witness quotes, or reminders here..."
                    />
                  </>
                )}

                {tab === 'archive' && (
                  <>
                    <div className="cb-section-label" style={{ marginTop: 0 }}>
                      <span>Cleared Operations Archive</span>
                      <span>{classified.completed.length} Records</span>
                    </div>
                    {classified.completed.length ? classified.completed.map(opp => (
                      <div key={opp.id} className="cb-file-slip" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(opp.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 12 }}>{opp.title}</strong>
                          <span style={{ fontSize: 10, color: '#166534', fontWeight: 700, fontFamily: 'monospace' }}>CLEARED ✓</span>
                        </div>
                        <small style={{ fontSize: 10.5, color: '#5c4b35' }}>{opp.institution} · {opp.reward}</small>
                      </div>
                    )) : (
                      <p style={{ fontSize: 12, fontStyle: 'italic', color: '#5c4b35' }}>
                        Completed missions and accepted work orders are permanently archived here.
                      </p>
                    )}
                  </>
                )}

                {tab === 'connections' && (
                  <>
                    <div className="cb-section-label" style={{ marginTop: 0 }}>
                      <span>Connections Board · Connected Apps</span>
                      <span>1-Click Jump</span>
                    </div>
                    <div className="cb-connections-board">
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openAssignment(selectedOpp.id))}>
                        <strong><Shield size={12} /> WORKNET</strong>
                        <small>Open work order, stages & sign-off</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => { useOSStore.getState().saveAssignmentBriefing(selectedOpp.id); useOSStore.getState().openAssignmentFiles(selectedOpp.id); })}>
                        <strong><FolderOpen size={12} /> FYLO FILES</strong>
                        <small>/assignments/{selectedOpp.id}</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openWindow('mail'))}>
                        <strong><Mail size={12} /> AUREMAIL</strong>
                        <small>Dispatches, witness replies & receipts</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openAppWorkspace('dgaos', 'overview'))}>
                        <strong><Compass size={12} /> DGAOS</strong>
                        <small>Evidence notebook & lab forensics</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openWindow('fieldOperations'))}>
                        <strong><BookOpen size={12} /> FIELD OPS</strong>
                        <small>Playable Tunnel 09 field scene</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openAppWorkspace('browser', 'https://records.orynvell.gov'))}>
                        <strong><FileText size={12} /> ORYNVELL</strong>
                        <small>Public deeds, filings & certified copies</small>
                      </button>
                      <button type="button" className="cb-pin-card" onClick={() => jumpTo(() => useOSStore.getState().openWindow('lore'))}>
                        <strong><BookOpen size={12} /> ROYAL LIBRARY</strong>
                        <small>Historical manuscripts & archive volumes</small>
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Bottom Journal Progress Strip */}
        <footer className="cb-footer">
          <span>CASEBOOK PROGRESS: {completionPct}% ({classified.completed.length}/{totalCount} CLEARED)</span>
          <span>ESC TO CLOSE · NOTES AUTO-SAVED LOCALLY</span>
        </footer>
      </div>
    </div>,
    document.body
  );
}
