import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND'||!specifier.startsWith('.'))throw error;return next(`${specifier}.ts`,context);}}});
const { PROCESS_MISSION, PROCESS_INCIDENT, restoreProcessMonitor, requiredProcessEvidence, validatedQuarantinePids, processReportText }=await import('../src/gameplay/ProcessMonitor.ts');
const { WORKNET_ASSIGNMENTS }=await import('../src/gameplay/ActivityEngine.ts');
let instance=0;
async function fresh(legacy=[]) {
 const data=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}});
 const {useOSStore:store}=await import(`../src/store/useOSStore.ts?monitor=${instance++}`);
 store.setState(s=>({isLoggedIn:true,gameplay:{...s.gameplay,prismCorruptionLevel:10,player:{...s.gameplay.player,stamina:100,credits:1000,xp:0,clearanceLevel:2,quarantinedProcessPids:legacy,processMonitor:undefined}}}));return store;
}
function acquire(store) {for(const kind of ['signature','logs','trace'])assert.equal(store.getState().processAction({type:'diagnose',pid:512,kind}).ok,true);}
function report(store) {return store.getState().processAction({type:'save-report',report:{evidenceIds:requiredProcessEvidence,finding:'unauthorized-memory-writes',action:'isolated-512',outcome:'writes-and-connection-stopped',limitations:'Local node findings do not establish the source or scope of the wider intrusion.'}});}
function prepare(store) {
 assert.equal(store.getState().openWorknetOrder(PROCESS_MISSION).ok,true);
 assert.equal(store.getState().acknowledgeAssignmentBriefing(PROCESS_MISSION).ok,true);
 acquire(store);assert.equal(store.getState().quarantineProcess(512),true);
 assert.equal(store.getState().processAction({type:'verify'}).ok,true);
 report(store);assert.equal(store.getState().processAction({type:'submit-report'}).ok,true);
}
test('diagnostics reject invalid operations and do not disclose unacquired archival findings',async()=>{
 const store=await fresh();const before=store.getState().gameplay.player;
 for(const pid of [0,999,'512',null])assert.equal(store.getState().quarantineProcess(pid),false);
 assert.equal(store.getState().processAction({type:'diagnose',pid:512,kind:'unknown'}).ok,false);
 assert.equal(store.getState().quarantineProcess(660),false);
 assert.equal(store.getState().gameplay.player.credits,before.credits);
 const exported=processReportText(restoreProcessMonitor(store.getState().gameplay.player.processMonitor));
 assert.equal(exported.includes('AETHERCORE'),false);assert.equal(exported.includes('Sealed'),false);
});
test('early isolation requires evidence and verification and does not award a quarantine bonus',async()=>{
 const store=await fresh();assert.equal(store.getState().quarantineProcess(512),true);
 assert.equal(store.getState().processAction({type:'verify'}).ok,false);
 assert.equal(store.getState().gameplay.player.credits,1000);
 assert.equal(validatedQuarantinePids(store.getState().gameplay.player).length,0);
 acquire(store);assert.equal(store.getState().processAction({type:'verify'}).ok,true);
 assert.equal(store.getState().gameplay.prismCorruptionLevel,10);
});
test('legitimate isolation is reversible and does not touch academic or medical data',async()=>{
 const store=await fresh();const before=structuredClone(store.getState().gameplay.player);
 assert.equal(store.getState().quarantineProcess(218),true);
 const result=store.getState().processAction({type:'diagnose',pid:218,kind:'logs'});
 assert.match(result.message,/probe failed/);
 assert.match(processReportText(restoreProcessMonitor(store.getState().gameplay.player.processMonitor)),/probe failed/);
 assert.equal(store.getState().processAction({type:'restore',pid:218}).ok,true);
 assert.match(store.getState().processAction({type:'diagnose',pid:218,kind:'logs'}).message,/probe passed/);
 assert.deepEqual(store.getState().gameplay.player.worknetOrders,before.worknetOrders);
 assert.equal(store.getState().gameplay.player.credits,before.credits);
});
test('generic stages and report guesses cannot bypass the shared diagnostic evidence',async()=>{
 const store=await fresh();store.getState().openWorknetOrder(PROCESS_MISSION);store.getState().acknowledgeAssignmentBriefing(PROCESS_MISSION);
 for(const stage of ['diagnostics','verification','report'])assert.equal(store.getState().submitWorknetStage(PROCESS_MISSION,stage,{report:'all evidence verified'}).ok,false);
 report(store);assert.equal(store.getState().processAction({type:'submit-report'}).ok,false);
 assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS[PROCESS_MISSION]).ok,false);
 acquire(store);store.getState().quarantineProcess(512);store.getState().processAction({type:'verify'});
 store.getState().processAction({type:'save-report',report:{...store.getState().gameplay.player.processMonitor.report,finding:'legacy-malicious'}});
 assert.equal(store.getState().processAction({type:'submit-report'}).ok,false);
});
test('one shared sign-off pays the canonical reward once and retains original evidence references',async()=>{
 const store=await fresh();prepare(store);
 const before=store.getState().gameplay.player;
 assert.equal(store.getState().completeWorknetMission({...WORKNET_ASSIGNMENTS[PROCESS_MISSION],rewardCredits:99999}).ok,true);
 const after=store.getState().gameplay.player;
 assert.equal(after.credits,1250);assert.equal(after.xp,150);
 assert.equal(store.getState().gameplay.prismCorruptionLevel,7.5);
 assert.equal(after.careers.dga.xp,(before.careers.dga?.xp??0)+150);
 assert.equal(after.worknetOrders[PROCESS_MISSION].resultIds.length,3);
 assert.equal(after.taskResults[`WORK:${PROCESS_MISSION}:once:verification`].output.verificationId,`${PROCESS_INCIDENT}:verification:1`);
 assert.deepEqual(validatedQuarantinePids(after),[512]);
 assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS[PROCESS_MISSION]).ok,false);
 store.getState().processAction({type:'restore',pid:512});store.getState().quarantineProcess(512);store.getState().processAction({type:'verify'});
 assert.equal(store.getState().finalizeProcessAssignment().ok,false);assert.equal(store.getState().gameplay.player.credits,1250);
 const {CAREER_TRACK_SPECS}=await import('../src/gameplay/WorldEventEngine.ts');
 const pathway=CAREER_TRACK_SPECS.dga.pathways.find(p=>p.id==='dga-field-forensics');
 assert.equal(pathway.isMet(after,1),true);assert.equal(pathway.isMet(after,2),false);
});
test('restoration and editing the report invalidate a prior review',async()=>{
 const store=await fresh();prepare(store);store.getState().processAction({type:'restore',pid:512});
 assert.equal(store.getState().finalizeProcessAssignment().ok,false);
 assert.equal(store.getState().gameplay.player.processMonitor.verification,null);
 const {evaluateWorknetObjective}=await import('../src/gameplay/WorldEventEngine.ts');
 assert.equal(evaluateWorknetObjective(PROCESS_MISSION,'dga',store.getState().gameplay.player).verified,false);
 store.getState().quarantineProcess(512);store.getState().processAction({type:'verify'});store.getState().processAction({type:'submit-report'});report(store);
 assert.equal(store.getState().finalizeProcessAssignment().ok,false);
});
test('legacy progress remains recognized without another payment or fabricated evidence',async()=>{
 const store=await fresh([512,660,899,999,218,512]);
 assert.deepEqual(validatedQuarantinePids(store.getState().gameplay.player),[512,660,899]);
 assert.deepEqual(restoreProcessMonitor(store.getState().gameplay.player.processMonitor).evidence,[]);
 prepare(store);assert.equal(store.getState().finalizeProcessAssignment().ok,true);
 assert.equal(store.getState().gameplay.player.credits,1000);assert.equal(store.getState().gameplay.player.xp,0);
 assert.equal(store.getState().gameplay.prismCorruptionLevel,10);
 const receipt=store.getState().gameplay.player.assignmentJournal.files[`completion:WORK:${PROCESS_MISSION}:once`];
 assert.match(receipt.body,/Historical PID 512 compensation retained/);
});
test('login, pause, clearance and stamina gates apply at the action boundary',async()=>{
 const store=await fresh();store.setState({isLoggedIn:false});assert.equal(store.getState().quarantineProcess(512),false);assert.equal(store.getState().openWorknetOrder(PROCESS_MISSION).ok,false);
 store.setState({isLoggedIn:true});localStorage.setItem('miraverse-creator-studio-state-v1',JSON.stringify({isPaused:true}));assert.equal(store.getState().quarantineProcess(512),false);
 localStorage.removeItem('miraverse-creator-studio-state-v1');prepare(store);
 store.setState(s=>({gameplay:{...s.gameplay,player:{...s.gameplay.player,clearanceLevel:1}}}));assert.equal(store.getState().finalizeProcessAssignment().ok,false);
 store.setState(s=>({gameplay:{...s.gameplay,player:{...s.gameplay.player,clearanceLevel:2,stamina:0}}}));assert.equal(store.getState().finalizeProcessAssignment().ok,false);
});
test('monitor evidence and containment hydrate, while malformed records are discarded',async()=>{
 const store=await fresh();acquire(store);store.getState().quarantineProcess(512);store.getState().processAction({type:'verify'});report(store);
 const saved=store.getState().gameplay.player.processMonitor;assert.deepEqual(restoreProcessMonitor(JSON.parse(JSON.stringify(saved))),saved);
 const malformed=restoreProcessMonitor({evidence:[null,{id:'bad',pid:999,kind:'logs',at:'today'}],isolatedPids:[104,999,'512',512],report:null,events:[null],revision:-1,completion:{at:'today',workOrderId:'bad',paid:true}});
 assert.deepEqual(malformed.evidence,[]);assert.deepEqual(malformed.isolatedPids,[512]);assert.equal(malformed.completion,null);
 await store.persist.rehydrate();assert.equal(store.getState().gameplay.player.processMonitor.verification.id,`${PROCESS_INCIDENT}:verification:1`);
});
