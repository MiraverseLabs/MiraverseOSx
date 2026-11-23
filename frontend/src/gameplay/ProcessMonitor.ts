export const PROCESS_MISSION = 'ms-process-001';
export const PROCESS_INCIDENT = 'PM-PRISM-001';
export type DiagnosticKind = 'signature' | 'logs' | 'trace';
export interface MonitoredProcess {
  pid: number; name: string; description: string; publisher: string; cpu: number; memory: number;
  isolation: 'incident' | 'service' | 'protected'; signature: string; logs: string; trace: string;
}
export const PROCESS_CATALOG: MonitoredProcess[] = [
  { pid:104, name:'net_relay.sys', description:'Municipal mesh relay driver', publisher:'Municipal Systems', cpu:1.2, memory:34.5, isolation:'protected', signature:'Municipal manifest and installed signature match.', logs:'Authenticated routes are being forwarded. No unauthorized writes observed.', trace:'Municipal gateway → authenticated civic mesh. This service is required for core routing.' },
  { pid:218, name:'cyacademy_sync.daemon', description:'Campus syllabus delivery service', publisher:'Cyberium Academy', cpu:0.8, memory:48.2, isolation:'service', signature:'Cyberium manifest and installed signature match. Publisher certificate is current.', logs:'Read-only syllabus delivery completed. Heartbeat and delivery probe passed; no protected-memory writes.', trace:'Campus gateway → authenticated student syllabus endpoint. Traffic matches the declared purpose.' },
  { pid:342, name:'faith_telemetry.service', description:'Patient telemetry interface', publisher:'Faith Medical', cpu:2.1, memory:62, isolation:'protected', signature:'Faith Medical manifest and installed signature match.', logs:'Telemetry reads are within the declared scope.', trace:'Authenticated Faith Medical telemetry endpoint. Health-service isolation is protected in this workspace.' },
  { pid:409, name:'dga_warden_scan.node', description:'Civic compliance sentinel', publisher:'DGA', cpu:4.5, memory:112.4, isolation:'protected', signature:'DGA service manifest and installed signature match.', logs:'Scheduled integrity checks completed; no unauthorized writes observed.', trace:'Agency gateway → registered compliance node.' },
  { pid:512, name:'prism_subconduit_bleed.hex', description:'Unregistered memory hook', publisher:'Unverified', cpu:18.4, memory:340.1, isolation:'incident', signature:'No installed-service manifest matches this signature. Publisher cannot be verified.', logs:'Retained pre-isolation log: PID 512 attempted unauthorized writes to /sys/veil/matrix. The baseline relay driver has read-only access.', trace:'Retained connection: PID 512 → unregistered Sub-Conduit endpoint SC-512. This destination is absent from the approved relay routes.' },
  { pid:660, name:'AETHERCORE.sys', description:'Legacy driver reference', publisher:'Unverified legacy record', cpu:9.8, memory:512, isolation:'protected', signature:'Legacy signature is not in the current manifest. Age and unfamiliarity alone do not establish malicious behavior.', logs:'Metadata identifies a subterranean driver reference. The available record does not establish its purpose or safety.', trace:'Archived route metadata is incomplete. No verified live destination is available; further authorized archive review is required.' },
  { pid:780, name:'lumen_market_ticker.app', description:'District merchant price index', publisher:'Lumen Market', cpu:0.5, memory:24.1, isolation:'protected', signature:'Market publisher signature matches its registered manifest.', logs:'Public price-index reads only; no protected-memory writes observed.', trace:'Registered district market endpoint.' },
  { pid:899, name:'FAITH_WARD_07.log.daemon', description:'Sealed archive reader reference', publisher:'Unverified archive record', cpu:3.4, memory:88, isolation:'protected', signature:'Archive metadata has no current publisher certificate. This is an unresolved provenance question.', logs:'Only reader metadata is available. Patient records and sealed archive contents are not exposed by this diagnostic.', trace:'No live route can be established from available metadata. Seek authorized archival evidence.' },
  { pid:914, name:'sub_aureline_node.relay', description:'Underground transit mesh proxy', publisher:'Aureline Transit', cpu:1.1, memory:42, isolation:'protected', signature:'Transit manifest and installed signature match.', logs:'Relay traffic stays within its declared route permissions.', trace:'Registered transit junction → municipal relay.' },
];
export interface ProcessEvidence { id:string; pid:number; kind:DiagnosticKind; at:string; isolated:boolean }
export interface ProcessReport {
  evidenceIds:string[]; finding:string; action:string; outcome:string; limitations:string;
}
export interface ProcessMonitorState {
  evidence:ProcessEvidence[]; isolatedPids:number[]; revision:number;
  verification: { id:string; at:string; revision:number } | null;
  report:ProcessReport; review: { at:string; revision:number } | null;
  events:{ id:string; at:string; text:string }[];
  completion: { at:string; workOrderId:string; paid:boolean } | null;
}
export const emptyProcessReport = ():ProcessReport => ({ evidenceIds:[], finding:'', action:'', outcome:'', limitations:'' });
export function restoreProcessMonitor(raw:unknown):ProcessMonitorState {
  const value = raw && typeof raw === 'object' ? raw as Partial<ProcessMonitorState> : {};
  const evidence:ProcessEvidence[] = [];
  for (const item of Array.isArray(value.evidence) ? value.evidence : []) {
    if (!item || !PROCESS_CATALOG.some(p => p.pid === item.pid) || !['signature','logs','trace'].includes(item.kind) || item.id !== `${item.pid}:${item.kind}` || typeof item.at !== 'string' || evidence.some(e => e.id === item.id)) continue;
    evidence.push({id:item.id,pid:item.pid,kind:item.kind,at:item.at,isolated:item.isolated===true});
  }
  const revision = Number.isSafeInteger(value.revision) && value.revision! >= 0 ? value.revision! : 0;
  const report = value.report && typeof value.report === 'object' ? value.report : emptyProcessReport();
  const text = (input:unknown) => typeof input === 'string' ? input.slice(0,4000) : '';
  return {
    evidence, revision,
    isolatedPids: [...new Set((Array.isArray(value.isolatedPids) ? value.isolatedPids : []).filter(pid => pid === 218 || pid === 512))],
    verification: value.verification && value.verification.id === `${PROCESS_INCIDENT}:verification:${revision}` && value.verification.revision === revision && typeof value.verification.at === 'string' ? value.verification : null,
    report:{ evidenceIds:[...new Set((Array.isArray(report.evidenceIds) ? report.evidenceIds : []).filter(id => typeof id === 'string' && evidence.some(e => e.id === id)))], finding:text(report.finding),action:text(report.action),outcome:text(report.outcome),limitations:text(report.limitations) },
    review:value.review && value.review.revision === revision && typeof value.review.at === 'string' ? value.review : null,
    events:(Array.isArray(value.events) ? value.events : []).filter(e => e && typeof e.id === 'string' && typeof e.at === 'string' && typeof e.text === 'string').slice(-100).map(e => ({id:e.id,at:e.at,text:e.text.slice(0,1000)})),
    completion:value.completion && typeof value.completion.at === 'string' && value.completion.workOrderId === `WORK:${PROCESS_MISSION}:once` && typeof value.completion.paid === 'boolean' ? value.completion : null,
  };
}
export const requiredProcessEvidence = ['512:signature','512:logs','512:trace'];
export function processVerificationReady(state:ProcessMonitorState) {
  return state.isolatedPids.includes(512) && requiredProcessEvidence.every(id => state.evidence.some(item => item.id === id));
}
export function processReportIssues(state:ProcessMonitorState):string[] {
  const issues:string[] = [];
  if (!processVerificationReady(state) || state.verification?.revision !== state.revision) issues.push('Gather the three PID 512 findings, isolate it, and verify the result.');
  if (!requiredProcessEvidence.every(id => state.report.evidenceIds.includes(id))) issues.push('Cite the signature, memory-write log, and connection trace.');
  if (state.report.finding !== 'unauthorized-memory-writes') issues.push('Choose a finding supported by the memory-write evidence.');
  if (state.report.action !== 'isolated-512') issues.push('Record the containment action actually taken.');
  if (state.report.outcome !== 'writes-and-connection-stopped') issues.push('Record the verified outcome of containment.');
  if (state.report.limitations.trim().length < 20) issues.push('Explain the limits of this local diagnosis (at least 20 characters).');
  return issues;
}
export function validatedQuarantinePids(player:any):number[] {
  const legacy = Array.isArray(player?.quarantinedProcessPids) ? player.quarantinedProcessPids.filter((pid:number) => [512,660,899].includes(pid)) : [];
  const monitor = restoreProcessMonitor(player?.processMonitor);
  return [...new Set<number>([...legacy, ...(monitor.completion ? [512] : [])])];
}
export function processDiagnosticText(pid:number, kind:DiagnosticKind, state:ProcessMonitorState):string {
  const process = PROCESS_CATALOG.find(p => p.pid === pid);
  if (!process) return 'Unknown process.';
  if (pid === 218 && state.isolatedPids.includes(pid) && kind !== 'signature') return 'Campus service is isolated. Heartbeat unavailable; simulated syllabus delivery probe failed. Restore the service to recover these monitor probes. Other apps are unaffected.';
  return process[kind];
}
export function processReportText(state:ProcessMonitorState):string {
  return [`Process Monitor / ${PROCESS_INCIDENT}`, ...state.evidence.map(e => `${e.at} [${e.id}] ${processDiagnosticText(e.pid,e.kind,{...state,isolatedPids:e.isolated?[e.pid]:[]})}`), '', 'Report', JSON.stringify(state.report,null,2), state.verification ? `Verification: ${state.verification.id} at ${state.verification.at}` : 'Not verified', ...state.events.map(e => `${e.at} ${e.text}`), state.completion ? `WorkNet receipt: ${state.completion.workOrderId}; ${state.completion.paid ? 'compensation issued' : 'historical compensation retained'}` : 'No completion receipt'].join('\n');
}
