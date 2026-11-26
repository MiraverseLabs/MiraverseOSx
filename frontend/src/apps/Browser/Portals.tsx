import '../../styles/apps/versenet-portals.css';
import React, { useState } from 'react';
import { 
    Activity, Shield, Building, FileText, Landmark, Truck, Eye, 
    Lock, CheckCircle2, AlertTriangle, Key, Search, ArrowRight, UserCheck, RefreshCw, User, BookOpen,
    Coins, ArrowUpRight, Download, Send, Terminal, Radio, Sparkles, Compass
} from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { FORMAL_INVESTIGATION_CASES } from '../../gameplay/WorldEventEngine';
import Button from '../../components/ui/button';
import { syncFaithMedicalUpdate, syncDgaInvestigativeUpdate } from '../../integration/citizenBridge';
import { SoundFX } from '../../utils/audio';

// ==========================================
// Shared Universal AureID / Citizen MAID Bar
// ==========================================
export function CitizenAureIdBar({ portalName }: { portalName: string }) {
    const player = useOSStore(s => s.gameplay.player);
    const identity = useOSStore(s => s.gameplay.identity);
    const isLoggedIn = useOSStore(s => s.isLoggedIn);
    return <div className="vn-citizen-context" aria-label={`${portalName} account context`}>
        <div><UserCheck size={15} aria-hidden="true" /><span>{isLoggedIn ? player.name || 'Citizen' : 'Guest visitor'}</span><small>{isLoggedIn ? identity.citizenId || 'Citizen account' : 'Browse public information'}</small></div>
        <span>{isLoggedIn ? `Access level ${player.clearanceLevel ?? 1}` : 'Public access'}</span>
    </div>;
}

// ==========================================
// Shared Pillar III: Formal Case Reasoning Panel
// ==========================================
function FormalCaseReasoningBoard({ filterInstitution }: { filterInstitution?: string }) {
    const player = useOSStore((s) => s.gameplay?.player);
    const submitInvestigationCase = useOSStore((s) => s.submitInvestigationCase);
    const solvedIds = player?.solvedInvestigationCaseIds || [];

    const cases = filterInstitution
        ? FORMAL_INVESTIGATION_CASES.filter((c) => c.institution.includes(filterInstitution))
        : FORMAL_INVESTIGATION_CASES;

    const [selectedEvidenceByCase, setSelectedEvidenceByCase] = useState<Record<string, string[]>>({});
    const [selectedHypothesisByCase, setSelectedHypothesisByCase] = useState<Record<string, string>>({});
    const [feedbackByCase, setFeedbackByCase] = useState<Record<string, { ok: boolean; message: string }>>({});

    const toggleEvidence = (caseId: string, evId: string) => {
        const current = selectedEvidenceByCase[caseId] || [];
        const next = current.includes(evId)
            ? current.filter((x) => x !== evId)
            : [...current, evId];
        setSelectedEvidenceByCase({ ...selectedEvidenceByCase, [caseId]: next });
    };

    const handleSubmitCase = async (caseId: string) => {
        if (!submitInvestigationCase) return;
        const ev = selectedEvidenceByCase[caseId] || [];
        const hyp = selectedHypothesisByCase[caseId] || '';
        const res = submitInvestigationCase(caseId, ev, hyp);
        setFeedbackByCase({
            ...feedbackByCase,
            [caseId]: { ok: res.ok, message: res.message }
        });
        if (res.ok && res.verified) {
            SoundFX.playCoin();
            const caseDef = FORMAL_INVESTIGATION_CASES.find(c => c.id === caseId);
            if (caseDef?.subjectMaid) {
                if (caseDef.institution.toLowerCase().includes('faith medical')) {
                    await syncFaithMedicalUpdate(caseDef.subjectMaid, {
                        medicalSummary: `Forensic case ${caseDef.id} resolved: ${res.message}`,
                        auraStatus: 'Stabilized Tier II Â· Investigation Closed',
                        attendingClinician: 'Faith Medical & TRACE Forensics'
                    });
                } else {
                    await syncDgaInvestigativeUpdate(caseDef.subjectMaid, {
                        investigativeNote: `Case ${caseDef.id} resolved: ${res.message}`,
                        caseId: caseDef.id,
                        status: 'VERIFIED / CLEARED'
                    });
                }
            }
        }
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={14} className="text-indigo-600" /> Formal Case Reasoning & Evidence Verification
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                    Solved: {solvedIds.length}/{FORMAL_INVESTIGATION_CASES.length}
                </span>
            </div>

            {cases.map((c) => {
                const isSolved = solvedIds.includes(c.id);
                const selectedEv = selectedEvidenceByCase[c.id] || [];
                const selectedHyp = selectedHypothesisByCase[c.id] || '';
                const feedback = feedbackByCase[c.id];

                return (
                    <div key={c.id} className="p-4 border border-slate-200 rounded-2xl bg-white space-y-3 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div>
                                <div className="text-xs font-bold text-slate-900">
                                    [{c.id}] {c.title}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    Subject: {c.subjectName} ({c.subjectMaid}) â€¢ Institution: {c.institution}
                                </div>
                            </div>
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    isSolved
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                            >
                                {isSolved ? 'âœ“ VERIFIED DETERMINATION' : `REWARD: +${c.rewardCredits} â‚¡ / +${c.rewardXP} XP / +${c.rewardBits} â—ˆ`}
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{c.symptomOrAnomaly}</p>

                        {/* Step 1: Select Corroborating Evidence */}
                        <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-700 uppercase">
                                1. Select Corroborating Exhibits (Exclude Unverified Rumors):
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {c.availableEvidence.map((ev) => {
                                    const checked = selectedEv.includes(ev.id);
                                    return (
                                        <label
                                            key={ev.id}
                                            className={`p-2.5 rounded-xl border text-left text-[11px] cursor-pointer transition flex items-start gap-2 ${
                                                checked
                                                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950'
                                                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100/70'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={isSolved}
                                                checked={checked}
                                                onChange={() => toggleEvidence(c.id, ev.id)}
                                                className="mt-0.5 rounded"
                                            />
                                            <div>
                                                <div className="font-bold">{ev.label}</div>
                                                <div className="text-[10px] text-slate-500">{ev.detail}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 2: Select Formal Hypothesis */}
                        <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-700 uppercase">
                                2. Formulate Probative Hypothesis:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {c.hypotheses.map((h) => {
                                    const chosen = selectedHyp === h.id;
                                    return (
                                        <label
                                            key={h.id}
                                            className={`p-2.5 rounded-xl border text-left text-[11px] cursor-pointer transition flex items-start gap-2 ${
                                                chosen
                                                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`hyp-${c.id}`}
                                                disabled={isSolved}
                                                checked={chosen}
                                                onChange={() =>
                                                    setSelectedHypothesisByCase({ ...selectedHypothesisByCase, [c.id]: h.id })
                                                }
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <div className="font-bold">{h.title}</div>
                                                <div className="text-[10px] text-slate-600">{h.explanation}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {feedback && (
                            <div
                                className={`p-2.5 rounded-xl text-xs font-mono border ${
                                    feedback.ok
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                        : 'bg-rose-50 border-rose-200 text-rose-900'
                                }`}
                            >
                                {feedback.message}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={() => handleSubmitCase(c.id)}
                                disabled={isSolved}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                {isSolved ? 'âœ“ Case Filed in Canonical Registry' : 'Submit Formal Determination'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ==========================================
// 2. DGA Government Portal (dga.gov.aure)
// ==========================================
export function DGAPortal() {
    const player = useOSStore((s) => s.gameplay?.player);
    const addXP = useOSStore((s) => s.addXP);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<any | null>(null);
    const [bypassCipher, setBypassCipher] = useState('');
    const [bypassFeedback, setBypassFeedback] = useState<string | null>(null);

    // Canonical Citizen Clearance Directory (backed by miraverse.db via registry.ts)
    const citizenRegistry = [
        { name: 'Director Evelyn Cross', maid: 'MAID-OR-00481939', dept: 'Department of Global Affairs · Executive Command', clearance: 'Tier 3 (Master)', status: 'ACTIVE DIRECTIVES LEAD' },
        { name: 'Deputy Chief Nathaniel Miller', maid: 'MAID-OR-00481954', dept: 'DGA Tactical & TRACE Forensic Bureau', clearance: 'Tier 2 (High Clearance)', status: 'ACTIVE OPERATIONS' },
        { name: 'Jeremie Belpois', maid: 'MAID-OR-00481935', dept: 'Cyberium Academy Compiler Lab 4', clearance: 'Tier 2 (Academic Auth)', status: 'DIAGNOSTIC ADVISOR' },
        { name: 'Aelita Hopper', maid: 'MAID-OR-00481945', dept: 'Cyberium Academy Research / Node Liaison', clearance: 'Tier 2 (Academic Auth)', status: 'SUBTERRANEAN CONTACT' },
        { name: 'Dr. Sharon Voss', maid: 'MAID-FR-00481974', dept: 'Faith Medical & Deep Telemetry', clearance: 'Tier 2 (Clinical Auth)', status: 'PRISM CHIEF RESEARCHER' },
        { name: 'Franz Hopper', maid: 'DOCUMENT-ONLY', dept: 'Pre-Collapse Network Architect', clearance: 'Tier 3 (Classified)', status: 'HISTORICAL ARCHIVE SEAL' },
    ];

    const handleSearchCitizen = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim().toLowerCase();
        if (!q) return;

        const found = citizenRegistry.find(c => 
            c.name.toLowerCase().includes(q) || c.maid.toLowerCase().includes(q)
        );

        if (found) {
            setSearchResult(found);
            SoundFX.playSnap();
        } else if (player?.name && (player.name.toLowerCase().includes(q) || (player.identity?.citizenId || '').toLowerCase().includes(q))) {
            setSearchResult({
                name: player.name,
                maid: player.identity?.citizenId || 'MAID-9041-AURE',
                dept: 'Provisional Citizenry & Field Investigations',
                clearance: `Tier ${player.clearanceLevel ?? 1} (${(player.clearanceLevel ?? 1) >= 2 ? 'AUTHORIZED' : 'PROVISIONAL'})`,
                status: 'ONLINE Â· CITIZEN SSO ACTIVE'
            });
            SoundFX.playSnap();
        } else {
            setSearchResult({ notFound: true, query: searchQuery });
        }
    };

    const handleCipherBypass = (e: React.FormEvent) => {
        e.preventDefault();
        const cipher = bypassCipher.trim().toLowerCase();
        if (cipher === '0x8891' || cipher === 'dga-alpha-9' || cipher === 'trace-clear') {
            SoundFX.playCoin();
            setBypassFeedback('AUTHORIZATION VERIFIED: Clearance elevated to Tier 2 Authorized. Subterranean Conduit Sector 7 research privileges granted (+150 XP).');
            if (addXP) addXP(150);
        } else {
            SoundFX.playSnap();
            setBypassFeedback('SECURITY CIPHER REJECTED: Invalid municipal bypass token. Check AureMail dispatches.');
        }
    };

    return (
        <div className="vn-service-portal vn-service-government p-6 space-y-6 bg-[#FAFBFD] min-h-full text-slate-800 font-sans select-none">
            <CitizenAureIdBar portalName="DGA Central Gateway" />

            <header className="flex items-center justify-between border-b border-blue-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Directorate of Global Affairs</h1>
                        <p className="text-xs text-blue-600 font-mono">DGA Public Security & Clearance Registry â€¢ dga.gov.aure</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs rounded-full">
                    Official Government Network
                </span>
            </header>

            {/* Directive Notice */}
            <div className="p-5 border border-blue-200 bg-blue-50/60 rounded-2xl space-y-2 shadow-xs">
                <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Shield size={18} className="text-blue-600" /> Executive Directive 14-B: Curfew & Verification
                </h2>
                <p className="text-xs text-blue-800 leading-relaxed font-mono">
                    Provisional citizens must maintain synchronized MAID biometrics. Sector 3 (Warehouse District) remains under active curfew following the unauthorized diversion of Manifest CG-8821.
                </p>
            </div>

            {/* Citizen Clearance Registry Search */}
            <div className="p-5 border border-slate-200 bg-white rounded-2xl space-y-3 shadow-xs">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={14} className="text-blue-600" /> Search Citizen Clearance Registry
                </h3>
                <form onSubmit={handleSearchCitizen} className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search citizen by name or MAID (e.g. Vane, Thorne, Belpois, Aelita)..."
                        className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                        Lookup MAID
                    </button>
                </form>

                {searchResult && (
                    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-1">
                        {searchResult.notFound ? (
                            <div className="text-rose-700 font-bold">No registered citizen found matching "{searchResult.query}".</div>
                        ) : (
                            <>
                                <div className="font-bold text-blue-950 flex items-center justify-between">
                                    <span>{searchResult.name} ({searchResult.maid})</span>
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{searchResult.clearance}</span>
                                </div>
                                <div className="text-slate-600">Department: {searchResult.dept}</div>
                                <div className="text-[11px] text-slate-500">Status: {searchResult.status}</div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Security Cipher Bypass Terminal */}
            <div className="p-5 border border-slate-200 bg-white rounded-2xl space-y-3 shadow-xs font-mono">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Key size={14} className="text-amber-600" /> Security Clearance Elevation Terminal
                    </h3>
                    <span className="text-[10px] text-slate-400">Supported: #0x8891, #DGA-ALPHA-9</span>
                </div>
                <form onSubmit={handleCipherBypass} className="flex gap-2">
                    <input
                        type="text"
                        value={bypassCipher}
                        onChange={(e) => setBypassCipher(e.target.value)}
                        placeholder="Enter clearance authorization cipher..."
                        className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                        Verify Token
                    </button>
                </form>
                {bypassFeedback && (
                    <div className="p-2.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-800">
                        {bypassFeedback}
                    </div>
                )}
            </div>

            {/* Formal Case Reasoning Board */}
            <FormalCaseReasoningBoard filterInstitution="DGAOS" />
        </div>
    );
}

// ==========================================
// 6. CIVINET Municipal Services Hub (civinet.mer)
// ==========================================
export function CivinetPortal() {
    return (
        <section className="workspace-transition">
            <Landmark size={30}/>
            <span className="workspace-kicker">Citizen Hub / formerly CIVINET</span>
            <h1>Your civic services have a new home.</h1>
            <p>Open Citizen Hub for personal services, civic support, residence, and your document history. Your existing support claim and saved progress are retained.</p>
            <button onClick={() => useOSStore.getState().openAppWorkspace('passport', 'services')}>
                Open Citizen Hub <ArrowRight size={15}/>
            </button>
        </section>
    );
}

// ==========================================
// 7. QUESTNOTICE Public Errands (questnotice.mer)
// ==========================================
export function QuestNoticePortal() {
    const claimedTasks = useOSStore(s => s.gameplay.player.claimedPortalActionIds || []);
    const listings = [
        { id: 'qn-web-1', title: 'Library Return Cart Sorting', desc: 'Sort 20 returned volumes by catalog number in the East Reading Room.' },
        { id: 'qn-web-2', title: 'Lost Familiar Trace in Sector 4', desc: 'Search for a glowing cyan sprite near the central district water fountain.' },
        { id: 'qn-web-3', title: 'Apothecary Herb Delivery', desc: 'Deliver dried Sunspire blossom bundles to Faith Medical Clinic Ward 2.' },
    ];
    return (
        <section className="workspace-transition">
            <FileText size={30}/>
            <span className="workspace-kicker">QUESTNOTICE / WORKNET</span>
            <h1>Civic work, together.</h1>
            <p>Neighborhood jobs and playable assignments are managed in WORKNET. Review the work, complete its objectives, and submit it there.</p>
            <button onClick={() => useOSStore.getState().openAppWorkspace('jobs', 'civic-jobs')}>
                Open civic jobs in WORKNET <ArrowRight size={15}/>
            </button>
            <details style={{ marginTop: 28 }}>
                <summary>Earlier public listings</summary>
                <p>Earlier completion records are retained. These archived listings do not issue additional rewards.</p>
                {listings.map(item => (
                    <article key={item.id} style={{ marginTop: 20 }}>
                        <h2 style={{ fontSize: 15 }}>{item.title}</h2>
                        <p>{item.desc}</p>
                        <small>{claimedTasks.includes(item.id) ? 'Previously completed' : 'Archived listing'}</small>
                    </article>
                ))}
            </details>
        </section>
    );
}

// ==========================================
// 8. Royal Historic Society (royalhistory.mer)
// ==========================================
export function RoyalHistoryPortal() {
    return (
        <div className="vn-service-portal vn-service-archive p-6 space-y-6 bg-[#FAFBFD] text-slate-800 min-h-full font-serif select-none">
            <CitizenAureIdBar portalName="Royal Historic Society" />

            <header className="flex items-center justify-between border-b border-cyan-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Royal Historic Society</h1>
                        <p className="text-xs text-cyan-700 font-mono">Restricted Dynastic & Succession Archive â€¢ royalhistory.mer</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-mono rounded-full font-bold">
                    Classified Council Access
                </span>
            </header>

            <div className="p-5 border border-cyan-200 bg-white rounded-2xl space-y-3 font-sans shadow-xs">
                <h3 className="text-sm font-bold text-cyan-950 font-serif">Sealed Council Charter of Succession (Pre-Collapse)</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                    Treaty archives confirm the sovereign authority of the Seraphima lineage across upper Orynvell. High-clearance Archivist research unlocks restricted genealogical codices and early AETHERCORE energy grid blueprints.
                </p>
            </div>
        </div>
    );
}

// ==========================================
// 9. CargoTrack Logistics (shipping.aure)
// ==========================================
export function ShippingPortal() {
    const addXP = useOSStore((s) => s.addXP);
    const addCredits = useOSStore((s) => s.addCredits);
    const [trackingCode, setTrackingCode] = useState('CG-8821');
    const [auditRevealed, setAuditRevealed] = useState(false);

    const manifests: Record<string, any> = {
        'CG-8821': {
            id: 'CG-8821',
            cargo: 'Unrefined Mana Crystals (120 Units)',
            origin: 'Kaelis Spire Foundries',
            scheduledDest: 'Sector 3 Central Warehouse',
            divertedDest: 'Subterranean Conduit Sector 7',
            status: 'FLAGGED / ROUTE DISCREPANCY',
            courier: 'Courier #C-42 (Status: Disappeared)',
            notes: 'Seals compromised. Radiation signature matches subterranean harmonic bleed.'
        },
        'MED-4402': {
            id: 'MED-4402',
            cargo: 'Bio-Aura Stabilizer Ampoules',
            origin: 'Lyria Spring Refineries',
            scheduledDest: 'Faith Medical Central Hospital',
            status: 'IN TRANSIT // ON SCHEDULE',
            courier: 'Aureline Medical Transit',
            notes: 'Temperature regulation steady at 37.2Â°C.'
        },
        'AURA-109': {
            id: 'AURA-109',
            cargo: 'Reinforced Conduit Couplers',
            origin: 'Valen Territorial Bastion',
            scheduledDest: 'Sector 1 Capital Citadel',
            status: 'DELIVERED & VERIFIED',
            courier: 'Valen Logistics Escort',
            notes: 'Civic clearance Tier 2 signed by Agent Thorne.'
        }
    };

    const currentManifest = manifests[trackingCode.toUpperCase()] || null;

    const handleAuditDiscrepancy = () => {
        setAuditRevealed(true);
        SoundFX.playCoin();
        if (addXP) addXP(30);
        if (addCredits) addCredits(75);
    };

    return (
        <div className="vn-service-portal vn-service-shipping p-6 space-y-6 bg-[#FAFBFD] min-h-full text-slate-800 font-sans select-none">
            <CitizenAureIdBar portalName="Aureline CargoTrack Logistics" />

            <header className="flex items-center justify-between border-b border-orange-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <Truck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">CargoTrack Logistics</h1>
                        <p className="text-xs text-orange-600 font-mono">Consignment Manifests & Route Audits â€¢ shipping.aure</p>
                    </div>
                </div>
            </header>

            {/* Tracking Search Input */}
            <div className="p-5 border border-slate-200 bg-white rounded-2xl space-y-3 shadow-xs">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={14} className="text-orange-600" /> Consignment Tracking Lookup
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                        placeholder="Enter tracking code (e.g. CG-8821, MED-4402, AURA-109)..."
                        className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-orange-500"
                    />
                    <div className="flex gap-1.5">
                        {['CG-8821', 'MED-4402', 'AURA-109'].map(code => (
                            <button
                                key={code}
                                onClick={() => setTrackingCode(code)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                </div>

                {currentManifest ? (
                    <div className="mt-4 p-4 border border-orange-200 bg-orange-50/60 rounded-xl space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                            <span className="font-bold text-orange-950 text-sm">Manifest #{currentManifest.id}</span>
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${currentManifest.status.includes('FLAGGED') ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {currentManifest.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 pt-1">
                            <div><strong>Cargo:</strong> {currentManifest.cargo}</div>
                            <div><strong>Origin:</strong> {currentManifest.origin}</div>
                            <div><strong>Scheduled:</strong> {currentManifest.scheduledDest}</div>
                            {currentManifest.divertedDest && (
                                <div className="text-rose-700 font-bold"><strong>Diverted Destination:</strong> {currentManifest.divertedDest}</div>
                            )}
                            {currentManifest.courier && <div><strong>Courier:</strong> {currentManifest.courier}</div>}
                        </div>
                        <div className="text-slate-600 italic pt-1">{currentManifest.notes}</div>

                        {currentManifest.id === 'CG-8821' && (
                            <div className="pt-3 border-t border-orange-200 flex items-center justify-between">
                                <span className="text-[11px] text-orange-900 font-bold">Investigative Evidence Available</span>
                                <button
                                    onClick={handleAuditDiscrepancy}
                                    disabled={auditRevealed}
                                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                    {auditRevealed ? 'âœ“ Route Discrepancy Filed (+75 â‚¡, +30 XP)' : 'Audit Route Discrepancy'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-500 font-mono text-xs">
                        No consignment found matching tracking code.
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 10. VectorNet / Dark Web Onion Portal (.onion / vectornet.aure)
// ==========================================
export function DarkWebOnionPortal() {
    const player = useOSStore((s) => s.gameplay?.player);
    const addCredits = useOSStore((s) => s.addCredits);
    const addXP = useOSStore((s) => s.addXP);

    const [purchasedIntel, setPurchasedIntel] = useState<string[]>([]);
    const [terminalInput, setTerminalInput] = useState('');
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        'VECTORNET ANONYMOUS ONION ROUTER v2.4',
        'Connected through encrypted relay #88.4 MHz Â· Identity masked.',
        'Type "/help" for available underground commands.'
    ]);

    const intelItems = [
        { id: 'intel-conduit', title: 'Conduit 7 Blueprint Bypass', cost: 15, desc: 'Airlock circuit schematics for Subterranean Conduit 7.', secret: 'Airlock pneumatic override cipher: 0x8891. Frequency alignment: 88.2 MHz.' },
        { id: 'intel-vault', title: 'First Federal Vault Drill Logs', cost: 25, desc: 'Sonic tunneling data beneath Broad Street Vault 4.', secret: 'Seismic acoustic frequency 88.4 MHz recorded during vault floor breach.' },
        { id: 'intel-prism', title: 'PRISM Anomaly Audio Intercept', cost: 10, desc: 'Raw carrier audio frequency intercept from Sector 4.', secret: 'Carrier repeating pulse indicates Lyoko-pattern virtual telemetry.' },
    ];

    const handlePurchaseIntel = (item: typeof intelItems[0]) => {
        if (purchasedIntel.includes(item.id)) return;
        const currentBits = player?.bits ?? 0;
        if (currentBits < item.cost) {
            setTerminalOutput(prev => [...prev, `[ERROR]: Insufficient Bits. Required: ${item.cost} â—ˆ, You have: ${currentBits} â—ˆ.`]);
            return;
        }

        // Deduct bits via store logic
        useOSStore.setState((state) => ({
            gameplay: {
                ...state.gameplay,
                player: {
                    ...state.gameplay.player,
                    bits: Math.max(0, (state.gameplay.player.bits || 0) - item.cost)
                }
            }
        }));

        setPurchasedIntel(prev => [...prev, item.id]);
        setTerminalOutput(prev => [
            ...prev,
            `[PURCHASE VERIFIED]: -${item.cost} â—ˆ Bits. Unlocked: "${item.title}".`,
            `[DECRYPTED DOSSIER]: ${item.secret}`
        ]);
        SoundFX.playCoin();
        if (addXP) addXP(40);
    };

    const handleTerminalCommand = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = terminalInput.trim().toLowerCase();
        if (!cmd) return;

        setTerminalOutput(prev => [...prev, `> ${terminalInput}`]);
        setTerminalInput('');

        if (cmd === '/help') {
            setTerminalOutput(prev => [
                ...prev,
                'Available commands:',
                '  /status     - Display connection & anonymity status',
                '  /clearance  - View active citizen clearance & MAID',
                '  /trace      - Ping active underground node relays',
                '  /decrypt [key] - Test cryptographic cipher keys',
                '  /clear      - Reset terminal log'
            ]);
        } else if (cmd === '/status') {
            setTerminalOutput(prev => [
                ...prev,
                `Onion Proxy: ONLINE (Node #88.4 MHz) Â· Encryption: 4096-bit AES`,
                `Player Bits: ${player?.bits ?? 0} â—ˆ Â· Credits: ${player?.credits ?? 0} â‚¡`
            ]);
        } else if (cmd === '/clearance') {
            setTerminalOutput(prev => [
                ...prev,
                `Citizen Identity: ${player?.name || 'Citizen'} (${player?.identity?.citizenId || 'MAID-9041-AURE'})`,
                `Clearance Rating: Tier ${player?.clearanceLevel ?? 1}`
            ]);
        } else if (cmd === '/trace') {
            setTerminalOutput(prev => [
                ...prev,
                'Pinging node relays...',
                '  Node 1: Sector 3 Warehouse [ACTIVE]',
                '  Node 2: Subterranean Conduit 7 [88.2 MHz CARRIER]',
                '  Node 3: First Federal Broad Street [FAULT DETECTED]'
            ]);
        } else if (cmd.startsWith('/decrypt')) {
            const key = cmd.replace('/decrypt', '').trim();
            if (key === '0x8891' || key === '8891') {
                setTerminalOutput(prev => [...prev, '[CIPHER ACCEPTED]: Unlocks Subterranean Conduit Sector 7 Airlock Deed.']);
            } else if (key === 'cg-8821') {
                setTerminalOutput(prev => [...prev, '[CIPHER ACCEPTED]: Unlocks Mana Crystal Contraband Manifest.']);
            } else {
                setTerminalOutput(prev => [...prev, `[CIPHER REJECTED]: Key "${key}" failed decryption matrix.`]);
            }
        } else if (cmd === '/clear') {
            setTerminalOutput(['VECTORNET TERMINAL CLEARED']);
        } else {
            setTerminalOutput(prev => [...prev, `Unknown command: "${cmd}". Type /help for options.`]);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-full font-mono select-none">
            <header className="flex items-center justify-between border-b border-purple-900 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-xs">
                        <Terminal size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-purple-300">VectorNet Underground (.onion)</h1>
                        <p className="text-xs text-purple-400">Anonymized Encrypted Onion Network // vectornet.aure</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-purple-950 border border-purple-700 text-purple-300 rounded-lg text-xs font-bold">
                        Bits: <strong className="text-emerald-400">{player?.bits ?? 0} â—ˆ</strong>
                    </span>
                    <span className="px-3 py-1 bg-purple-900 border border-purple-600 text-purple-200 text-xs rounded-full font-bold">
                        Onion Proxy Active
                    </span>
                </div>
            </header>

            {/* Underground Intel Market */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Classified Intel Broker Market</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {intelItems.map((item) => {
                        const isBought = purchasedIntel.includes(item.id);
                        return (
                            <div key={item.id} className="p-4 bg-slate-900 border border-purple-900/60 rounded-xl space-y-2.5 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <div className="font-bold text-xs text-purple-200 flex items-center justify-between">
                                        <span>{item.title}</span>
                                        <span className="text-emerald-400 font-bold">{item.cost} â—ˆ</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                                    {isBought && (
                                        <div className="p-2 bg-purple-950/80 border border-purple-700/60 rounded-lg text-[10px] text-purple-200">
                                            {item.secret}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handlePurchaseIntel(item)}
                                    disabled={isBought}
                                    className="w-full py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                                >
                                    {isBought ? 'âœ“ Decrypted' : `Purchase for ${item.cost} â—ˆ`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Interactive Terminal Prompt */}
            <div className="p-4 bg-black border border-purple-900 rounded-2xl space-y-3 shadow-inner">
                <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal size={13} /> Interactive Hacker Console
                </div>
                <div className="h-44 overflow-y-auto space-y-1 text-xs text-emerald-400 p-2 bg-slate-950 rounded-lg border border-purple-950">
                    {terminalOutput.map((line, i) => (
                        <div key={i} className="leading-relaxed">{line}</div>
                    ))}
                </div>
                <form onSubmit={handleTerminalCommand} className="flex gap-2">
                    <span className="text-purple-400 font-bold self-center">&gt;</span>
                    <input
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder="Type /help, /status, /trace, or /decrypt 0x8891..."
                        className="flex-1 h-9 px-3 bg-slate-900 border border-purple-900 rounded-xl text-xs text-slate-100 outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                        type="submit"
                        className="px-4 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                        Execute
                    </button>
                </form>
            </div>
        </div>
    );
}

export { MaiSpacePortal } from './MaiSpacePortal';
