import { CAREER_REGISTRY, careerStation, contractSalary } from '../../../gameplay/CareerRegistry';
import React, { useState, useEffect } from 'react';
import {
  Award, Shield, CheckCircle2, User, Briefcase, Lock, FileText,
  DollarSign, Building2, Clock, ArrowUpRight, Layers
} from 'lucide-react';
import { useOSStore } from '../../../store/useOSStore';
import { evaluateCareerPromotion } from '../../../gameplay/WorldEventEngine';
import { evaluateFiveDimensions } from '../../../gameplay/WorknetCoreSystems';
import { employed, stationTrack } from '../workplaceModel';
import { INSTITUTIONAL_REGISTRY } from '../worknetData';
import type { WorkplaceStationId } from '../../JobWorkstationApp';
import { ENTERTAINMENT_DISCIPLINES, restoreEntertainmentState } from '../../../gameplay/EntertainmentEcosystem';

interface WorknetCareerRecordProps {
  activeStation: WorkplaceStationId;
  onSwitchWorkplace?: (station: WorkplaceStationId) => void;
  onClaimBaseStipends?: () => void;
  onSelectPathway?: (track: string, pathway: 'specialist' | 'supervisor') => void;
  onFeedback: (msg: string) => void;
}

export default function WorknetCareerRecord({
  activeStation,
  onSwitchWorkplace,
  onClaimBaseStipends,
  onSelectPathway,
  onFeedback
}: WorknetCareerRecordProps) {
  const player = useOSStore(s => s.gameplay.player);
  const worknetSim = useOSStore(s => s.worknetSim);
  const currentCycle = useOSStore(s => s.gameplay.timeCycleCount) ?? 0;
  const requestCareerPromotion = useOSStore(s => s.requestCareerPromotion);
  const logHourlyShiftTime = useOSStore(s => s.logHourlyShiftTime);
  const issuePendingPayroll = useOSStore(s => s.issuePendingPayroll);
  const resignEmployment = useOSStore(s => s.resignEmployment);

  const [selectedTrack, setSelectedTrack] = useState<string>(stationTrack(activeStation));

  useEffect(() => {
    setSelectedTrack(stationTrack(activeStation));
  }, [activeStation]);

  const currentStation = careerStation(selectedTrack) as WorkplaceStationId;
  const theme = INSTITUTIONAL_REGISTRY[currentStation] || INSTITUTIONAL_REGISTRY.dga;
  const careerEval = evaluateCareerPromotion(selectedTrack, player);
  const dimensions = evaluateFiveDimensions(selectedTrack, player);

  const contracts = player.employmentContracts || {};
  const activeContract = contracts[selectedTrack];
  const activeContractsCount = Object.keys(contracts).length;

  const contractEligible = employed(player, currentStation);
  const currentPathway = activeContract?.pathwayChoice || 'specialist';
  const hasStipendPending = contractEligible && activeContract && (activeContract.lastStipendClaimedCycle ?? currentCycle - 1) < currentCycle && !player.compensationReceiptIds?.includes(`SALARY:${selectedTrack}:${currentCycle}`);
  const pendingPayrollEntries = worknetSim.payrollLedger.filter(e => e.stage === 'earned');
  const pendingPayrollTotal = pendingPayrollEntries.reduce((sum, e) => sum + e.netCredits, 0);

  const handleSelectStation = (stationId: WorkplaceStationId) => {
    const track = stationTrack(stationId);
    setSelectedTrack(track);
    onSwitchWorkplace?.(stationId);
  };

  const handleAcceptContract = (track: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const result = useOSStore.getState().acceptEmployment(track);
    onFeedback(result.ok ? `✓ ${result.message}` : `⚠ ${result.message}`);
  };

  const handlePromotion = () => {
    const res = requestCareerPromotion(selectedTrack);
    onFeedback(res.ok ? `🎖️ ${res.message}` : `⚠️ ${res.message}`);
  };

  const handlePathwayToggle = (pathway: 'specialist' | 'supervisor') => {
    if (onSelectPathway) {
      onSelectPathway(selectedTrack, pathway);
    } else {
      const res = useOSStore.getState().setCareerPathwayChoice(selectedTrack, pathway);
      onFeedback(res.ok ? `🎖️ ${res.message}` : `⚠️ ${res.message}`);
    }
  };

  const clearance = player.clearanceLevel ?? 2;

  return (
    <div className="worknet-view-scroll wn-dossier-shell">
      {/* Top Personnel Dossier Banner + KPI Telemetry Strip */}
      <section className="wn-dossier-banner">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="worknet-kicker">Meridion Personnel Dossier · MAID Verified</span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-0.5 tracking-tight">
              Career Record & Institutional Contracts
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Permanent service & career history, active division contracts, dual-track qualifications, and ORYN payroll settlements.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onClaimBaseStipends && (
              <button onClick={onClaimBaseStipends} className="worknet-btn-primary text-xs">
                <DollarSign size={13} /> Claim Cycle Salary
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const res = issuePendingPayroll();
                onFeedback(`${res.ok ? '✓' : '⚠'} ${res.message}`);
              }}
              className="worknet-btn-secondary text-xs"
            >
              <ArrowUpRight size={13} /> Issue Pending ({pendingPayrollEntries.length})
            </button>
          </div>
        </div>

        <div className="wn-kpi-strip">
          <div className="wn-kpi-tile">
            <small>Active Contracts</small>
            <strong>{activeContractsCount} / {Object.keys(INSTITUTIONAL_REGISTRY).length}</strong>
            <span>Divisions affiliated</span>
          </div>
          <div className="wn-kpi-tile">
            <small>Selected Track</small>
            <strong>{theme.shortOrg}</strong>
            <span>{careerEval.currentTitle} · Rank {careerEval.currentRankIndex}</span>
          </div>
          <div className="wn-kpi-tile">
            <small>Track Experience</small>
            <strong>{careerEval.currentXP} XP</strong>
            <span>{dimensions.professionalExperience.completedAssignments} completed ops</span>
          </div>
          <div className="wn-kpi-tile">
            <small>Clearance & Standing</small>
            <strong>Tier {clearance} · {dimensions.institutionalReputation.standing}/100</strong>
            <span>{dimensions.institutionalReputation.label}</span>
          </div>
          <div className="wn-kpi-tile">
            <small>Pending Payroll</small>
            <strong>{pendingPayrollTotal.toLocaleString()} ₢</strong>
            <span>{pendingPayrollEntries.length} earned obligation{pendingPayrollEntries.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      {/* Institutional Employment Contract Cards */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="worknet-kicker">Division Affiliations & Appointments</span>
            <h3 className="text-sm font-bold text-slate-900">Institutional Employment Contract Cards</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Select a card to inspect its personnel file or sign a division contract
          </span>
        </div>

        <div className="wn-contracts-grid">
          {Object.values(INSTITUTIONAL_REGISTRY).map(inst => {
            const track = stationTrack(inst.id);
            const contract = contracts[track];
            const isSelected = selectedTrack === track;
            const InstIcon = inst.icon;
            const meetsClearance = clearance >= inst.clearanceRequired;

            return (
              <div
                key={inst.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectStation(inst.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectStation(inst.id); } }}
                className="wn-contract-card"
                data-selected={isSelected}
                data-active-contract={Boolean(contract)}
                style={{ '--card-accent': inst.accentColor } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: inst.accentColor }}
                    >
                      <InstIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{inst.shortOrg}</div>
                      <div className="text-[10px] text-slate-500 truncate">{inst.name}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                      contract
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : meetsClearance
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {contract ? 'Active' : meetsClearance ? 'Open' : `Tier ${inst.clearanceRequired}`}
                  </span>
                </div>

                <div className="text-[11px] space-y-0.5">
                  <div className="font-semibold text-slate-800 truncate">
                    {contract ? contract.position : `Open Appointment · ${inst.shortOrg}`}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {contract
                      ? `${contractSalary(contract, stationTrack(inst.id))} ₢ / cycle · ${contract.pathwayChoice === 'supervisor' ? 'Supervisor' : 'Specialist'}`
                      : `${CAREER_REGISTRY[stationTrack(inst.id)].baseSalaryCredits} ₢ / cycle · Clearance Tier ${inst.clearanceRequired}+`}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-auto">
                  <span className="text-[10px] font-mono text-slate-500">
                    Backlog: {worknetSim.workloads[inst.id]?.backlog ?? 0}u
                  </span>
                  {contract ? (
                    <span className="text-[10px] font-semibold" style={{ color: inst.accentColor }}>
                      {isSelected ? 'Inspecting File ●' : 'Inspect File →'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!meetsClearance}
                      onClick={e => handleAcceptContract(track, e)}
                      className="px-2 py-1 rounded text-[10px] font-bold text-white transition disabled:opacity-45 cursor-pointer"
                      style={{ backgroundColor: inst.accentColor }}
                    >
                      {meetsClearance ? 'Sign Contract' : `Needs Tier ${inst.clearanceRequired}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Column Personnel Dossier */}
      <div className="worknet-grid-2">
        {/* Central Career Record (Permanent across institutions) */}
        <div className="worknet-card space-y-4">
          <div className="worknet-card-header">
            <h3 className="worknet-card-title">
              <User size={15} style={{ color: 'var(--wn-inst-accent)' }} />
              Central Career Record (Permanent)
            </h3>
            <span className="worknet-badge">Verified Profile</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">Registered Citizen</span>
                <p className="font-mono font-bold text-slate-900 truncate">{player.name || 'Registered Citizen'}</p>
                <span className="text-[10px] text-emerald-700 font-mono">MAID Identity Verified</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">Track Standing</span>
                <p className="font-bold text-slate-900 truncate">{careerEval.currentTitle}</p>
                <span className="text-[10px] text-slate-500 font-mono">Rank {careerEval.currentRankIndex} · {careerEval.currentXP} XP</span>
              </div>
            </div>

            {/* Dual-Track Advancement Pathway */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500">
                  Dual-Track Career Pathway
                </span>
                <span className="worknet-badge">
                  {currentPathway === 'supervisor' ? 'Department Supervisor' : 'Elite Specialist'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Specialists advance through technical assignments and verified qualifications. Supervisors additionally manage division dockets, budgets, and subordinate leave.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={!contractEligible}
                  onClick={() => handlePathwayToggle('specialist')}
                  className={`p-2.5 rounded-md border text-left transition text-xs cursor-pointer disabled:opacity-50 ${
                    currentPathway === 'specialist'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-semibold">Elite Specialist</span>
                  <span className="text-[10px] font-normal text-slate-500">Technical practice & advisory work</span>
                </button>

                <button
                  type="button"
                  disabled={!contractEligible}
                  onClick={() => handlePathwayToggle('supervisor')}
                  className={`p-2.5 rounded-md border text-left transition text-xs cursor-pointer disabled:opacity-50 ${
                    currentPathway === 'supervisor'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-semibold">Department Supervisor</span>
                  <span className="text-[10px] font-normal text-slate-500">Delegation, dockets & leave review</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1.5">
                Verified Qualifications Matrix
              </span>
              <div className="space-y-2">
                {careerEval.pathwayStatuses.map(path => (
                  <div
                    key={path.id}
                    className={`p-2.5 rounded-lg border text-[11px] ${
                      path.met ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <div className="flex items-center gap-1.5">
                        {path.met ? <CheckCircle2 size={13} className="text-emerald-700" /> : <Lock size={13} className="text-slate-400" />}
                        <span>{path.label}</span>
                      </div>
                      <span className="text-[9.5px] font-mono uppercase">{path.met ? 'VERIFIED' : 'PENDING'}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{path.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Employer-Specific Personnel File */}
        <div className="worknet-card space-y-4">
          <div className="worknet-card-header">
            <h3 className="worknet-card-title">
              <Briefcase size={15} style={{ color: 'var(--wn-inst-accent)' }} />
              {theme.shortOrg} Personnel File
            </h3>
            <span className="worknet-badge">Confidential</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">Active Division Contract</span>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  activeContract
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-slate-600 bg-white border-slate-200'
                }`}>
                  {activeContract ? 'Contract Active' : 'Uncontracted'}
                </span>
              </div>
              {activeContract ? (
                <>
                  <p className="font-bold text-slate-900 text-sm">{activeContract.position}</p>
                  <p className="text-[10.5px] text-slate-500 font-mono">{activeContract.id}</p>
                  <p className="text-[11px] text-slate-600">{activeContract.payTerms}</p>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-slate-600">
                    No contract signed for <strong>{theme.fullName}</strong> yet. Standard terms: {CAREER_REGISTRY[selectedTrack].baseSalaryCredits} ₢/cycle plus accepted work orders (Clearance Tier {theme.clearanceRequired} required).
                  </p>
                  <button className="worknet-btn-primary text-xs" onClick={() => handleAcceptContract(selectedTrack)}>
                    Accept Division Employment
                  </button>
                </div>
              )}
            </div>

            {/* Cycle salary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">Cycle Stipend Status</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  hasStipendPending ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {!activeContract ? 'Contract required' : !contractEligible ? 'Clearance required' : hasStipendPending ? 'Stipend Claimable' : `Disbursed · Cycle ${currentCycle}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Baseline Cycle Salary: <strong className="font-mono">{contractSalary(activeContract, selectedTrack)} ₢</strong> / cycle.
              </p>
              {hasStipendPending && onClaimBaseStipends && (
                <button
                  type="button"
                  onClick={onClaimBaseStipends}
                  className="worknet-btn-secondary text-[11px] py-1 px-2.5 mt-1"
                >
                  <DollarSign size={11} /> Disburse Eligible Cycle Stipends
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">Reporting Line & Access</span>
              <p className="font-semibold text-slate-800">
                Supervisor: <strong>{theme.supervisor.name}</strong> ({theme.supervisor.title})
              </p>
              <p className="text-[11px] text-slate-500">{theme.fullName}</p>
              <ul className="space-y-0.5 text-[10.5px] text-slate-600 pt-1.5 border-t border-slate-200 mt-1.5">
                <li>• Authorized terminal equipment clearance: Tier {clearance}</li>
                <li>• AureMail & Comms access governed by verified onboarding</li>
              </ul>
            </div>

            {/* Advancement & Promotion */}
            <div className="pt-2 border-t border-slate-200">
              {careerEval.nextTitle ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Next Promotion Rank:</span>
                    <strong className="text-slate-900">{careerEval.nextTitle}</strong>
                  </div>
                  <button
                    onClick={handlePromotion}
                    disabled={!careerEval.canPromote}
                    className={`w-full py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      careerEval.canPromote
                        ? 'worknet-btn-primary justify-center'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <Award size={14} />
                    {careerEval.canPromote ? 'Request Formal Promotion' : 'Promotion Requirements Pending'}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-center text-xs font-bold text-emerald-900">
                  🎖️ Highest Institutional Rank Achieved
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Five Distinct Professional Dimensions */}
      <div className="worknet-card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span className="worknet-kicker">Career Architecture · Five Professional Dimensions</span>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{dimensions.careerTitle}</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Standing: {dimensions.institutionalReputation.standing}/100
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">01 · Skills</span>
            <strong className="text-slate-900 text-sm">Avg Lv. {dimensions.skillsSummary.averageLevel}</strong>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{dimensions.skillsSummary.count} tracked capabilities</p>
            <div className="wn-progress-track"><div className="wn-progress-fill" style={{ width: `${Math.min(100, dimensions.skillsSummary.averageLevel * 20)}%` }} /></div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">02 · Qualifications</span>
            <strong className="text-slate-900 text-sm">Clearance {dimensions.qualifications.clearance}</strong>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{dimensions.qualifications.credentialsCount} credentials</p>
            <div className="wn-progress-track"><div className="wn-progress-fill" style={{ width: `${Math.min(100, dimensions.qualifications.clearance * 20)}%` }} /></div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">03 · Experience</span>
            <strong className="text-slate-900 text-sm">{dimensions.professionalExperience.careerXp} XP</strong>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{dimensions.professionalExperience.completedAssignments} completed ops</p>
            <div className="wn-progress-track"><div className="wn-progress-fill" style={{ width: `${Math.min(100, Math.round((dimensions.professionalExperience.careerXp / 500) * 100))}%` }} /></div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">04 · Position vs Tier</span>
            <strong className="text-slate-900 text-sm truncate block">{dimensions.employmentPosition.jobTitle}</strong>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{dimensions.employmentPosition.careerDevelopmentTier} · {dimensions.employmentPosition.pathway}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500 block">05 · Reputation</span>
            <strong className="text-slate-900 text-sm">{dimensions.institutionalReputation.label}</strong>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{dimensions.institutionalReputation.standing}/100 standing</p>
            <div className="wn-progress-track"><div className="wn-progress-fill" style={{ width: `${Math.min(100, dimensions.institutionalReputation.standing)}%` }} /></div>
          </div>
        </div>
      </div>

      {/* Oryn Payroll Ledger & Career Mobility */}
      <div className="worknet-grid-2">
        <div className="worknet-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="worknet-kicker">ORYN Treasury · Compensation Lifecycle</span>
              <h3 className="text-sm font-bold text-slate-900">Payroll Ledger (Earned vs. Issued)</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {activeContract && (
                <button
                  type="button"
                  onClick={() => {
                    const res = logHourlyShiftTime(selectedTrack, 2);
                    onFeedback(`${res.ok ? '✓' : '⚠'} ${res.message}`);
                  }}
                  className="worknet-btn-secondary text-[11px] py-1 px-2.5"
                >
                  <Clock size={11} /> Log 2 Work Segments
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const res = issuePendingPayroll();
                  onFeedback(`${res.ok ? '✓' : '⚠'} ${res.message}`);
                }}
                className="worknet-btn-primary text-[11px] py-1 px-2.5"
              >
                <DollarSign size={12} /> Issue ({pendingPayrollEntries.length})
              </button>
            </div>
          </div>
          {worknetSim.payrollLedger.length === 0 ? (
            <p className="text-xs text-slate-500">No logged hourly or partial-settlement payables yet. Earned obligations appear here prior to ORYN Vault issuance.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto text-xs">
              {worknetSim.payrollLedger.slice(0, 8).map(entry => (
                <div key={entry.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{entry.description}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {entry.model} · Gross {entry.grossCredits} ₢ − {entry.civicDeduction} ₢ levy
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="font-mono text-slate-900 block">{entry.netCredits} ₢</strong>
                    <span className={`text-[9.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      entry.stage === 'issued' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>{entry.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="worknet-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="worknet-kicker">Career Mobility & Institutional Record</span>
              <h3 className="text-sm font-bold text-slate-900">Service Timeline & Vacancies</h3>
            </div>
            {activeContract && (
              <button
                type="button"
                onClick={() => {
                  const res = resignEmployment(selectedTrack);
                  onFeedback(`${res.ok ? '✓' : '⚠'} ${res.message}`);
                }}
                className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
              >
                Resign Position
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 font-mono">
            {theme.shortOrg} Vacancies: <strong>{worknetSim.workloads[currentStation]?.vacancies ?? 1}</strong> · Active Backlog: <strong>{worknetSim.workloads[currentStation]?.backlog ?? 0}u</strong>
          </p>
          {worknetSim.careerHistory.length === 0 ? (
            <p className="text-xs text-slate-500">Signed contracts, promotions, transfers, and resignations are permanently recorded on this timeline.</p>
          ) : (
            <ol className="space-y-1.5 max-h-48 overflow-y-auto text-xs border-l-2 border-slate-200 pl-3 ml-1">
              {worknetSim.careerHistory.slice(0, 8).map(item => (
                <li key={item.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-900">{item.title}</strong>
                    <span className="text-[10px] font-mono text-slate-500">Cycle {item.cycle}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Section XIX Entertainment & Celebrity Ecosystem Multi-Career Dossier */}
      {(() => {
        const ent = restoreEntertainmentState(useOSStore.getState().gameplay.entertainment, currentCycle);
        const playerArtist = ent.playerArtistId ? ent.artists.find(a => a.artistId === ent.playerArtistId) : undefined;
        const activeEntContracts = playerArtist ? ent.contracts.filter(c => c.artistId === playerArtist.artistId && c.status === 'active') : [];
        const openAuditionCount = ent.auditions.filter(a => a.status === 'open').length;
        return (
          <section className="worknet-card mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="worknet-kicker">Section XIX · Entertainment & Creative Industries</span>
                <h3 className="text-sm font-bold text-slate-900">
                  Performer, Creator & Representation Dossier ({ENTERTAINMENT_DISCIPLINES.length} Career Disciplines)
                </h3>
                <p className="text-xs text-slate-600">
                  {playerArtist
                    ? `${playerArtist.stageName} · Fame Tier: ${playerArtist.tier} · Recognition ${playerArtist.recognition}/100 · Credibility ${playerArtist.artisticCredibility}/100 · Unclaimed Royalties: ${Math.floor(playerArtist.unclaimedPlayerRoyalties)} ₢`
                    : 'Independent Citizen · Register a performer/creator persona in Creative Studio or any VerseNet agency portal to pursue music, screen, dance, stage, fashion, PR, or live-event careers.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => useOSStore.getState().openAppWorkspace('creativeStudio', 'entertainment')}
                  className="worknet-btn-primary text-xs"
                >
                  Open Creative & Release Studio
                </button>
                <button
                  type="button"
                  onClick={() => useOSStore.getState().openAppWorkspace('browser', 'https://opencallcasting.mer')}
                  className="worknet-btn-secondary text-xs"
                >
                  Open Call Auditions ({openAuditionCount})
                </button>
                <button
                  type="button"
                  onClick={() => useOSStore.getState().openAppWorkspace('browser', 'https://secondact.mer')}
                  className="worknet-btn-secondary text-xs"
                >
                  Representation & Contracts
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {ENTERTAINMENT_DISCIPLINES.map(d => {
                const prog = ent.disciplineProgress[d.id];
                const active = playerArtist?.disciplines.includes(d.id);
                return (
                  <div key={d.id} className={`p-2.5 rounded-lg border ${active ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="font-semibold text-slate-900 truncate">{d.label}</div>
                    <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                      Lv.{prog?.level ?? 1} · {prog?.xp ?? 0} XP · {prog?.completedWorks ?? 0} works
                    </div>
                  </div>
                );
              })}
            </div>
            {activeEntContracts.length > 0 && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-xs">
                {activeEntContracts.map(c => (
                  <span key={c.contractId} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                    {c.orgName} ({c.contractType} · {Math.round(c.royaltySplitArtist * 100)}% artist split)
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}
