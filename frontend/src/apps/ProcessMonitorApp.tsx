import React, { useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpRight, Check, Cpu, Download, FileText, Search, Shield, Terminal } from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { PROCESS_CATALOG, PROCESS_INCIDENT, PROCESS_MISSION, restoreProcessMonitor, processDiagnosticText, processReportText, processVerificationReady, requiredProcessEvidence, type DiagnosticKind, type ProcessReport } from '../gameplay/ProcessMonitor';
import { WORKNET_ASSIGNMENTS } from '../gameplay/ActivityEngine';
import { briefingText, getOpportunity } from '../gameplay/AssignmentFlow';
import '../styles/apps/process-monitor.css';

export interface ProcessMonitorProps { host?:'standalone'|'worknet'|'dga'; incidentId?:string }
export default function ProcessMonitorApp({host='standalone',incidentId=PROCESS_INCIDENT}:ProcessMonitorProps) {
  const state=useOSStore();
  const player=state.gameplay.player;
  const monitor=restoreProcessMonitor(player.processMonitor);
  const [selected,setSelected]=useState(512);
  const [query,setQuery]=useState('');
  const [sort,setSort]=useState('pid');
  const [descending,setDescending]=useState(false);
  const [tab,setTab]=useState<'overview'|'evidence'|'activity'|'report'>('overview');
  const inspectorRef=useRef<HTMLElement>(null);
  const openReportTab=()=>{setTab('report');setTimeout(()=>inspectorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),20);};
  const [message,setMessage]=useState('');
  const [command,setCommand]=useState('');
  const [consoleLines,setConsoleLines]=useState<string[]>(['Type help for available diagnostics. Commands use the same evidence tools as the inspector.']);
  const request=useOSStore(s=>s.workspaceRequests.process);
  useEffect(()=>{
    if(host!=='standalone'||!request)return;
    if(request.section===`incident:${PROCESS_INCIDENT}`||request.section===PROCESS_INCIDENT){setSelected(512);setTab('overview');}
    state.consumeWorkspaceRequest('process',request.revision);
  },[request,host]);
  if(incidentId!==PROCESS_INCIDENT)return <p>That diagnostic incident is not available.</p>;
  const process=PROCESS_CATALOG.find(p=>p.pid===selected)!;
  const isolated=monitor.isolatedPids.includes(selected);
  const order=player.worknetOrders?.[PROCESS_MISSION];
  const report=monitor.report;
  const ready=processVerificationReady(monitor);
  const verified=monitor.verification?.revision===monitor.revision;
  const legacy=Array.isArray(player.quarantinedProcessPids)&&player.quarantinedProcessPids.includes(512);
  const run=(type:'isolate'|'restore'|'diagnose',kind?:DiagnosticKind)=>{
    const result=type==='diagnose'?state.processAction({type,pid:selected,kind:kind!}):state.processAction({type,pid:selected});
    setMessage(result.message);
  };
  const edit=(patch:Partial<ProcessReport>)=>state.processAction({type:'save-report',report:{...report,...patch}});
  const finalize=()=>{const result=state.completeWorknetMission(WORKNET_ASSIGNMENTS[PROCESS_MISSION]);setMessage(result.reason||'Work order accepted.');};
  const exportReport=()=>{
    const blob=new Blob([processReportText(monitor)],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${PROCESS_INCIDENT}-diagnostic-report.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const execute=(event:React.FormEvent)=>{
    event.preventDefault();const input=command.trim();if(!input)return;setCommand('');
    const [verb,rawPid,...extra]=input.toLowerCase().split(/\s+/);const pid=Number(rawPid);
    let output='Use help, list, inspect <pid>, signature <pid>, logs <pid>, or trace <pid>.';
    if(verb==='help'&&!rawPid)output='list — available processes; inspect <pid> — metadata; signature/logs/trace <pid> — acquire evidence. Isolation and restoration remain explicit inspector controls.';
    else if(verb==='list'&&!rawPid)output=PROCESS_CATALOG.map(p=>`${p.pid} ${p.name}`).join('\n');
    else if(!extra.length&&PROCESS_CATALOG.some(p=>p.pid===pid)) {
      const target=PROCESS_CATALOG.find(p=>p.pid===pid)!;
      if(verb==='inspect'){setSelected(pid);output=`${target.name}\nDeclared publisher: ${target.publisher}\n${target.description}\nDiagnostic scope: local simulated node; this is not your computer's operating system.`;}
      else if(['signature','logs','trace'].includes(verb)){setSelected(pid);output=state.processAction({type:'diagnose',pid,kind:verb as DiagnosticKind}).message;}
    }
    setConsoleLines(lines=>[...lines,`> ${input}`,output].slice(-30));
  };
  const rows=PROCESS_CATALOG.filter(p=>`${p.pid} ${p.name} ${p.publisher} ${p.description}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    const value=sort==='name'?a.name.localeCompare(b.name):sort==='cpu'?(monitor.isolatedPids.includes(a.pid)?0:a.cpu)-(monitor.isolatedPids.includes(b.pid)?0:b.cpu):sort==='memory'?a.memory-b.memory:sort==='status'?Number(monitor.isolatedPids.includes(a.pid))-Number(monitor.isolatedPids.includes(b.pid)):a.pid-b.pid;
    return descending?-value:value;
  });
  const sortBy=(key:string)=>{if(sort===key)setDescending(!descending);else{setSort(key);setDescending(false);}};
  return <div className="pm-workspace" data-host={host}>
    <header className="pm-header"><div><span className="pm-eyebrow">Local node / {host==='dga'?'DGA diagnostics':host==='worknet'?'WorkNet equipment':'System utilities'}</span><h1><Cpu size={23}/> Process Monitor</h1><p>Observe behavior. Preserve evidence. Verify the effect.</p></div><button onClick={exportReport}><Download size={15}/> Export acquired evidence</button></header>
    <section className="pm-incident" aria-label="Shared incident"><div><span className="pm-eyebrow">{PROCESS_INCIDENT}</span><h2>Local memory intrusion</h2><p>{monitor.completion?'WorkNet sign-off recorded':verified?'Containment verified; report review available':monitor.isolatedPids.includes(512)?'Contained; verification required':'Investigation open'} · {requiredProcessEvidence.filter(id=>monitor.evidence.some(e=>e.id===id)).length}/3 findings acquired</p></div><div className="pm-incident-links">{host!=='worknet'&&<button type="button" onClick={()=>state.openAssignment(PROCESS_MISSION)}>Open WorkNet assignment <ArrowUpRight size={14}/></button>}{host!=='dga'&&<button type="button" onClick={()=>state.openAppWorkspace('dgaos',`process:${PROCESS_INCIDENT}`)}>Open DGA diagnostics <ArrowUpRight size={14}/></button>}<button type="button" onClick={openReportTab}>Report & sign-off <FileText size={14}/></button></div></section>
    {legacy&&!monitor.completion&&<p className="pm-note">A historical PID 512 completion is retained. You may investigate and file a report; its earlier reward will not be paid again.</p>}
    <div className="pm-feedback" role="status">{message}</div>
    <div className="pm-toolbar"><label><Search size={16}/><input type="search" aria-label="Find a process" placeholder="Find a process, PID, or publisher" value={query} onChange={e=>setQuery(e.target.value)}/></label><span>{PROCESS_CATALOG.length-monitor.isolatedPids.length} running · {monitor.isolatedPids.length} isolated</span></div>
    <div className="pm-grid"><section className="pm-processes" aria-label="Processes"><div className="pm-table-scroll"><table><thead><tr>{[['pid','PID'],['name','Process'],['cpu','CPU'],['memory','Memory'],['status','Observed status']].map(([key,label])=><th key={key} scope="col" aria-sort={sort===key?(descending?'descending':'ascending'):'none'}><button onClick={()=>sortBy(key)}>{label}{sort===key?(descending?' ↓':' ↑'):''}</button></th>)}</tr></thead><tbody>{rows.map(p=><tr key={p.pid} data-selected={selected===p.pid}><td>{p.pid}</td><th scope="row"><button aria-pressed={selected===p.pid} onClick={()=>{setSelected(p.pid);if(tab==='report')setTab('overview');}}>{p.name}<small>{p.publisher} · declared publisher</small></button></th><td>{monitor.isolatedPids.includes(p.pid)?'0.0':p.cpu.toFixed(1)}%</td><td>{p.memory.toFixed(1)} MB</td><td><span className={monitor.isolatedPids.includes(p.pid)?'pm-isolated':''}>{monitor.isolatedPids.includes(p.pid)?'Isolated':monitor.evidence.some(e=>e.pid===p.pid)?'Evidence available':'Not assessed'}</span></td></tr>)}</tbody></table></div>{!rows.length&&<p className="pm-empty">No processes match that search.</p>}<p className="pm-caption">Readings describe the in-game local node. Resource use alone does not establish a threat.</p></section>
    <section ref={inspectorRef} className="pm-inspector" aria-label="Process inspector"><nav aria-label="Diagnostic views">{(['overview','evidence','activity','report'] as const).map(id=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{id==='report'?'Report':id[0].toUpperCase()+id.slice(1)}</button>)}</nav>
      {tab==='overview'&&<div className="pm-inspector-body"><span className="pm-eyebrow">PID {selected} / {isolated?'isolated':'running'}</span><h2>{process.name}</h2><p>{process.description}</p><dl className="pm-facts"><div><dt>Declared publisher</dt><dd>{process.publisher}</dd></div><div><dt>Signature assessment</dt><dd>{monitor.evidence.some(e=>e.id===`${selected}:signature`)?process.signature:'Not yet inspected'}</dd></div><div><dt>Local service probes</dt><dd>{selected===218?(isolated?'Heartbeat unavailable · delivery probe failed':'Heartbeat present · delivery probe passed'):selected===512?(isolated?'Writes stopped · connection closed; run verification':'Memory-write alert · connection requires investigation'):'Inspect the service logs to assess behavior.'}</dd></div></dl><h3>Gather evidence</h3><div className="pm-diagnostics">{(['signature','logs','trace'] as const).map(kind=><button key={kind} onClick={()=>run('diagnose',kind)}>{monitor.evidence.some(e=>e.id===`${selected}:${kind}`)?<Check size={14}/>:<Activity size={14}/>} {kind==='signature'?'Compare signature':kind==='logs'?'Inspect memory logs':'Trace connection'}</button>)}</div><div className="pm-containment"><h3>Containment</h3>{process.isolation==='protected'?<p>This service is protected. Preserve its evidence for authorized review; unfamiliar provenance alone is not a threat verdict.</p>:<><p>{selected===218?'Isolating this service interrupts its heartbeat and simulated syllabus probe in this monitor. Other apps stay usable. Restore it here to recover both probes.':'Isolation stops this process’s local writes and connection. It does not establish the source or scope of the wider incident.'}</p><button className={isolated?'':'pm-primary'} onClick={()=>run(isolated?'restore':'isolate')}>{isolated?'Restore process':'Isolate process'}</button></>}{selected===512&&<button disabled={!ready||verified} onClick={()=>setMessage(state.processAction({type:'verify'}).message)}>{verified?'Containment verified':'Verify containment'}</button>}</div></div>}
      {tab==='evidence'&&<div className="pm-inspector-body"><span className="pm-eyebrow">Acquired findings / PID {selected}</span><h2>Evidence record</h2>{monitor.evidence.filter(e=>e.pid===selected).map(e=><article className="pm-evidence" key={e.id}><span className="pm-eyebrow">{e.id}</span><p>{processDiagnosticText(e.pid,e.kind,{...monitor,isolatedPids:e.isolated?[e.pid]:[]})}</p><time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time></article>)}{!monitor.evidence.some(e=>e.pid===selected)&&<p>No evidence acquired for this process. Run the inspector diagnostics to establish a record.</p>}<p className="pm-caption">Evidence retains the diagnostic record. Current service availability appears in Overview.</p></div>}
      {tab==='activity'&&<div className="pm-inspector-body"><h2>Diagnostic activity</h2>{monitor.events.length?<ol className="pm-events">{[...monitor.events].reverse().map(e=><li key={e.id}><time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time><p>{e.text}</p></li>)}</ol>:<p>No diagnostic activity recorded yet.</p>}</div>}
      {tab==='report'&&<div className="pm-inspector-body"><span className="pm-eyebrow">Shared WorkNet / DGA record</span><h2>Report & sign-off</h2><details className="pm-briefing"><summary>Assignment briefing</summary><pre>{briefingText(getOpportunity(PROCESS_MISSION)!)}</pre></details>{!order?<button className="pm-primary" disabled={!state.isLoggedIn} onClick={()=>setMessage(state.openWorknetOrder(PROCESS_MISSION).message)}>Accept shared assignment</button>:!order.briefingReadAt?<button className="pm-primary" onClick={()=>setMessage(state.acknowledgeAssignmentBriefing(PROCESS_MISSION).message)}>Acknowledge briefing</button>:<p className="pm-caption">Briefing acknowledged · {order.id}</p>}
        <form className="pm-report" onSubmit={e=>{e.preventDefault();setMessage(state.processAction({type:'submit-report'}).message);}}><fieldset disabled={!state.isLoggedIn||order?.status==='accepted'}><legend>Evidence-supported findings</legend><div className="pm-citations">{requiredProcessEvidence.map(id=><label key={id}><input type="checkbox" disabled={!monitor.evidence.some(e=>e.id===id)} checked={report.evidenceIds.includes(id)} onChange={e=>edit({evidenceIds:e.target.checked?[...report.evidenceIds,id]:report.evidenceIds.filter(value=>value!==id)})}/>{id}{!monitor.evidence.some(e=>e.id===id)&&' · not acquired'}</label>)}</div><label>Finding<select aria-label="Finding" value={report.finding} onChange={e=>edit({finding:e.target.value})}><option value="">Choose a finding</option><option value="unauthorized-memory-writes">Unregistered process attempted protected-memory writes</option><option value="resource-use-only">High resource use alone proves malicious behavior</option><option value="legacy-malicious">All unfamiliar legacy services are malicious</option></select></label><label>Action taken<select aria-label="Action taken" value={report.action} onChange={e=>edit({action:e.target.value})}><option value="">Record the action</option><option value="isolated-512">Isolated PID 512</option><option value="observed-only">Observed without containment</option></select></label><label>Verified outcome<select aria-label="Verified outcome" value={report.outcome} onChange={e=>edit({outcome:e.target.value})}><option value="">Record the outcome</option><option value="writes-and-connection-stopped">Unauthorized writes stopped and connection closed</option><option value="all-network-safe">Entire network declared safe</option></select></label><label>Limitations<textarea rows={3} maxLength={4000} value={report.limitations} onChange={e=>edit({limitations:e.target.value})} placeholder="What does this local evidence establish, and what remains unknown?"/></label><button type="submit" disabled={!order?.briefingReadAt||!verified}>Submit diagnostic report</button></fieldset></form>
        {monitor.review&&<p className="pm-note">Report accepted for this containment revision.</p>}{monitor.completion?<div className="pm-receipt"><Shield size={18}/><strong>WorkNet sign-off recorded</strong><p>{monitor.completion.workOrderId}</p><p>{monitor.completion.paid?'250 credits · 150 XP · 30 CyberSecurity XP · 5 DGA reputation · corruption −2.5 points':'Historical compensation retained; no second reward.'}</p><button onClick={()=>state.openAssignmentFiles(PROCESS_MISSION)}>Open receipt in Fylo <ArrowUpRight size={14}/></button></div>:<><button className="pm-primary" disabled={!monitor.review||!verified} onClick={finalize}>Finalize shared WorkNet order</button><p className="pm-caption">One published payment for this incident. DGA, WorkNet, and the desktop monitor use the same receipt.</p></>}
      </div>}
    </section></div>
    <details className="pm-console"><summary><Terminal size={16}/> Technical diagnostics <span>Optional</span></summary><pre role="log" aria-label="Technical diagnostic output">{consoleLines.join('\n\n')}</pre><form onSubmit={execute}><label htmlFor={`pm-command-${host}`}>Command</label><input id={`pm-command-${host}`} value={command} onChange={e=>setCommand(e.target.value)} maxLength={120} autoComplete="off" spellCheck={false}/><button>Run</button></form></details>
  </div>;
}
