import { isWorldPaused } from '../integration/worldStateManager';
import { PROCESS_CATALOG, PROCESS_INCIDENT, PROCESS_MISSION, restoreProcessMonitor, processVerificationReady, processReportIssues, processDiagnosticText, requiredProcessEvidence, type DiagnosticKind, type ProcessReport } from '../gameplay/ProcessMonitor';
import type { OSStoreState } from './useOSStore';
import { evaluateWorkOrder, type TaskResult } from '../gameplay/ActivityEngine';
export type ProcessCommand =
  | {type:'diagnose';pid:number;kind:DiagnosticKind}
  | {type:'isolate'|'restore';pid:number}
  | {type:'verify'|'submit-report'}
  | {type:'save-report';report:ProcessReport};
type Result = {ok:boolean;message:string};
export interface ProcessActions {
  processAction:(command:ProcessCommand)=>Result;
  finalizeProcessAssignment:()=>Result;
}
export function createProcessActions(set:(update:(state:OSStoreState)=>Partial<OSStoreState>)=>void,get:()=>OSStoreState):ProcessActions {
  const permission = () => !get().isLoggedIn ? 'Log in before changing diagnostics.' : isWorldPaused() ? 'The world is paused. Resume it before changing diagnostics.' : '';
  return {
    processAction: command => {
      const denied=permission(); if(denied) return {ok:false,message:denied};
      if (!command || typeof command !== 'object') return {ok:false,message:'Unknown diagnostic action.'};
      const player=get().gameplay.player;
      const monitor=restoreProcessMonitor(player.processMonitor);
      const at=new Date().toISOString();
      const commit=(text:string)=>{
        monitor.events=[...monitor.events,{id:`PM-${crypto.randomUUID()}`,at,text}].slice(-100);
        set(s=>({gameplay:{...s.gameplay,player:{...s.gameplay.player,processMonitor:monitor}}}));
        return {ok:true,message:text};
      };
      if(command.type==='diagnose' || command.type==='isolate' || command.type==='restore') {
        const process=PROCESS_CATALOG.find(p=>p.pid===command.pid);
        if(!process) return {ok:false,message:'Choose a known process.'};
        if(command.type==='diagnose') {
          if(!['signature','logs','trace'].includes(command.kind)) return {ok:false,message:'Unknown diagnostic.'};
          const id=`${process.pid}:${command.kind}`;
          // Service probes are current observations, not permanent proof of its current availability.
          if(!monitor.evidence.some(e=>e.id===id)) monitor.evidence.push({id,pid:process.pid,kind:command.kind,at,isolated:monitor.isolatedPids.includes(process.pid)});
          return commit(`${process.pid} / ${command.kind}: ${processDiagnosticText(process.pid,command.kind,monitor)}`);
        }
        if(process.isolation==='protected') return {ok:false,message:'This service is protected in this workspace. Preserve the available evidence for authorized review.'};
        const isolated=monitor.isolatedPids.includes(process.pid);
        if(command.type==='isolate' ? isolated : !isolated) return {ok:false,message:isolated ? 'This process is already isolated.' : 'This process is already running.'};
        monitor.isolatedPids=command.type==='isolate' ? [...monitor.isolatedPids,process.pid] : monitor.isolatedPids.filter(pid=>pid!==process.pid);
        if(process.pid===512) {monitor.revision++;monitor.verification=null;monitor.review=null;}
        return commit(`${process.name} ${command.type==='isolate' ? 'isolated' : 'restored'}. ${process.pid===218 ? (command.type==='isolate' ? 'Monitor heartbeat and simulated delivery probe are unavailable; other apps remain usable.' : 'Monitor heartbeat and simulated delivery probe passed again.') : (command.type==='isolate' ? 'Run verification to establish the effect.' : 'Memory-write alerts and the unregistered connection have resumed.')}`);
      }
      if(command.type==='verify') {
        if(!processVerificationReady(monitor)) return {ok:false,message:'Collect PID 512 signature, logs, and trace findings, and isolate it before verification.'};
        if(monitor.verification?.revision===monitor.revision) return {ok:true,message:'This containment revision is already verified.'};
        monitor.verification={id:`${PROCESS_INCIDENT}:verification:${monitor.revision}`,at,revision:monitor.revision};
        return commit('Verification passed: PID 512 protected-memory writes stopped; its unregistered connection is closed. The municipal baseline relay remains available.');
      }
      if(command.type==='save-report') {
        monitor.report=restoreProcessMonitor({...monitor,report:command.report}).report;
        monitor.review=null;
        set(s=>({gameplay:{...s.gameplay,player:{...s.gameplay.player,processMonitor:monitor}}}));
        return {ok:true,message:'Report draft saved.'};
      }
      if(command.type==='submit-report') {
        const order=player.worknetOrders?.[PROCESS_MISSION];
        if(!order || order.id!==`WORK:${PROCESS_MISSION}:once` || order.definitionId!==PROCESS_MISSION || order.subject!==PROCESS_INCIDENT || order.status!=='active' || !order.briefingReadAt || order.remediationRequired) return {ok:false,message:'Accept the shared WorkNet assignment and acknowledge its briefing before submitting a report.'};
        if((player.clearanceLevel??2)<2) return {ok:false,message:'Clearance 2 is required to submit this assignment.'};
        const issues=processReportIssues(monitor); if(issues.length) return {ok:false,message:issues.join(' ')};
        monitor.review={at,revision:monitor.revision};
        const outputs=[
          {stageId:'diagnostics',mechanic:'diagnostics' as const,output:{incidentId:PROCESS_INCIDENT,evidenceIds:requiredProcessEvidence.join(', ')}},
          {stageId:'verification',mechanic:'diagnostics' as const,output:{incidentId:PROCESS_INCIDENT,verificationId:monitor.verification!.id}},
          {stageId:'report',mechanic:'documents' as const,output:{incidentId:PROCESS_INCIDENT,...monitor.report,evidenceIds:monitor.report.evidenceIds.join(', ')}},
        ];
        const results:TaskResult[]=outputs.map(output=>({...output,id:`${order.id}:${output.stageId}`,workOrderId:order.id,definitionId:PROCESS_MISSION,subject:PROCESS_INCIDENT,completedAt:at}));
        monitor.events=[...monitor.events,{id:`PM-${crypto.randomUUID()}`,at,text:'Evidence-supported report accepted for WorkNet sign-off.'}].slice(-100);
        set(s=>({gameplay:{...s.gameplay,player:{...s.gameplay.player,processMonitor:monitor,
          taskResults:{...s.gameplay.player.taskResults,...Object.fromEntries(results.map(result=>[result.id,result]))},
          worknetOrders:{...s.gameplay.player.worknetOrders,[PROCESS_MISSION]:{...order,resultIds:results.map(result=>result.id)}},
        }}}));
        return {ok:true,message:'Report accepted. Finalize the shared WorkNet order to issue its single completion receipt.'};
      }
      return {ok:false,message:'Unknown diagnostic action.'};
    },
    finalizeProcessAssignment:()=>{
      const denied=permission();if(denied)return {ok:false,message:denied};
      const state=get(),player=state.gameplay.player,monitor=restoreProcessMonitor(player.processMonitor);
      const order=player.worknetOrders?.[PROCESS_MISSION];
      if(!order || order.status!=='active' || !order.briefingReadAt || order.remediationRequired || monitor.completion || player.rewardedWorkOrderIds?.includes(order.id)) return {ok:false,message:'No unpaid active diagnostic assignment is available.'};
      if((player.clearanceLevel??2)<2) return {ok:false,message:'Clearance 2 is required for sign-off.'};
      if(order.id!==`WORK:${PROCESS_MISSION}:once` || order.definitionId!==PROCESS_MISSION || order.subject!==PROCESS_INCIDENT || !evaluateWorkOrder(order,player.taskResults||{})) return {ok:false,message:'The diagnostic task receipts are incomplete. Submit the report again.'};
      if(!monitor.review || monitor.review.revision!==monitor.revision || processReportIssues(monitor).length) return {ok:false,message:'Submit a current verified report before sign-off.'};
      if(player.stamina<10) return {ok:false,message:'Finalization requires 10 stamina. Rest and return to your saved work.'};
      const legacyPaid=Array.isArray(player.quarantinedProcessPids)&&player.quarantinedProcessPids.includes(512);
      const paid=!legacyPaid;
      const at=new Date().toISOString(),xp=player.xp+(paid?150:0);
      monitor.completion={at,workOrderId:order.id,paid};
      monitor.events=[...monitor.events,{id:`PM-${crypto.randomUUID()}`,at,text:paid?'WorkNet sign-off complete. One compensation receipt issued.':'WorkNet sign-off complete. Historical compensation retained; no second payout.'}].slice(-100);
      set(s=>({gameplay:{...s.gameplay,
        prismCorruptionLevel:paid?Math.max(2,Number((s.gameplay.prismCorruptionLevel-2.5).toFixed(1))):s.gameplay.prismCorruptionLevel,
        player:{...s.gameplay.player,processMonitor:monitor,xp,level:Math.floor(xp/100)+1,credits:player.credits+(paid?250:0),stamina:player.stamina-10,
          completedWorknetMissionIds:[...new Set([...(player.completedWorknetMissionIds||[]),PROCESS_MISSION])],
          rewardedWorkOrderIds:[...(player.rewardedWorkOrderIds||[]),order.id],
          worknetOrders:{...player.worknetOrders,[PROCESS_MISSION]:{...order,status:'accepted'}},
        }}}));
      if(paid){get().addCareerXP('dga',150);get().addSkillXP('CyberSecurity',30);}
      get().recordAssignmentCompletion(PROCESS_MISSION);
      get().recordWorldEvent({category:'forensic',title:`Accepted process diagnosis ${PROCESS_INCIDENT}`,summary:`Verified evidence and containment report accepted. ${paid?'250 credits and 150 XP issued once.':'Historical payment retained.'}`,institution:'DGA / WorkNet',...(paid?{impact:{reputationTrack:'dga',reputationDelta:5}}:{})});
      return {ok:true,message:paid?'Work accepted: 250 credits, 150 XP, 30 CyberSecurity XP, and 5 DGA reputation. PRISM corruption reduced by 2.5 points.':'Work accepted. Historical compensation retained; no second reward.'};
    },
  };
}
