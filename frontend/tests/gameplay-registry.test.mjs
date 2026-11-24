import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND' || !s.startsWith('.')) throw e; return next(`${s}.ts`, c); } } });

const { GAMEPLAY_REGISTRY: registry, validateGameplayRegistry } = await import('../src/gameplay/GameplayRegistry.ts');
const { CAREER_REGISTRY, contractSalary } = await import('../src/gameplay/CareerRegistry.ts');
const { CAREERS, MISSIONS } = await import('../src/db/miraverseDb.ts');
const { evaluateFiveDimensions, calculateCompensation } = await import('../src/gameplay/WorknetCoreSystems.ts');
const { restoreWorknetPlayer } = await import('../src/gameplay/WorknetPersistence.ts');
const { restoreWorkplace, changeWorkplace } = await import('../src/apps/worknet/workplaceModel.ts');
const { emptyWorknetSimulation, advanceWorknetSimulation, restoreWorknetSimulation, issueEarnedPayroll, availableStageColleague } = await import('../src/gameplay/WorknetSimulation.ts');

test('definition graph resolves every career, institution, mission, stage, chapter, schedule, NPC and discovery reference', () => {
  assert.deepEqual(validateGameplayRegistry(), []);
  assert.equal(CAREERS.length, 9);
  assert.ok(CAREERS.every(c => c === CAREER_REGISTRY[c.id]));
  assert.equal(MISSIONS, registry.missionList);
  assert.equal(registry.progression.dga.rankTitles, CAREER_REGISTRY.dga.tierTitles);
});

test('invalid authoring produces actionable errors for dangling stages, compensation and schedule references', () => {
  const invalid = { ...registry, missionList: registry.missionList.map(m => m.id === 'qn-01' ? { ...m, rewardCredits: -1 } : m),
    activities: [{ id: 'broken', milestones: [{ id: 'm', requirements: [{ definitionId: 'missing', stageId: 'unknown' }] }] }],
    shifts: [{ ...registry.shifts[0], assignmentId: 'unknown' }] };
  const errors = validateGameplayRegistry(invalid);
  assert.ok(errors.some(e => e.includes('missions.qn-01.rewardCredits')));
  assert.ok(errors.some(e => e.includes('activities.broken.m')));
  assert.ok(errors.some(e => e.includes('shifts.sch-01')));
});

test('career summary excludes unrelated skills, global XP and other career assignments', () => {
  const dims = evaluateFiveDimensions('engineer', { xp: 9000, careers: { engineer: { xp: 75 } }, skills: { Engineering: { level: 3 }, Empathy: { level: 99 } }, completedWorknetMissionIds: ['ms-shift-04', 'ms-shift-04', 'qn-01', 'ms-case-002'] });
  assert.deepEqual(dims.skillsSummary, { count: 1, averageLevel: 3 });
  assert.deepEqual(dims.professionalExperience, { careerXp: 75, completedAssignments: 1 });
  assert.equal(dims.employmentPosition.jobTitle, 'Unemployed');
  assert.equal(evaluateFiveDimensions('medical', { xp: 9000 }).professionalExperience.careerXp, 0);
});

test('alias migration preserves signed pay, highest earned progress, outputs and paid receipts without adding XP', () => {
  const old = { careers: { enforcer: { xp: 200, rankIndex: 2 }, dga: { xp: 100, rankIndex: 1 } }, careerTrackXp: { enforcer: 180 },
    employmentContracts: { enforcer: { id: 'EMP:enforcer', track: 'enforcer', position: 'Legacy Guardian', baseSalaryCredits: 150, lastStipendClaimedCycle: 28 } },
    taskResults: { output: { id: 'output' } }, rewardedWorkOrderIds: ['WORK:paid:once'], workplace: { originTick: 112 } };
  const restored = restoreWorknetPlayer(old, 112);
  assert.equal(restored.careers.dga.xp, 200);
  assert.equal(restored.careers.dga.rankIndex, 2);
  assert.equal(restored.careers.enforcer, undefined);
  assert.equal(contractSalary(restored.employmentContracts.dga, 'dga'), 150);
  assert.equal(restored.employmentContracts.dga.position, 'Legacy Guardian');
  assert.ok(restored.compensationReceiptIds.includes('SALARY:dga:28'));
  assert.deepEqual(restored.taskResults, old.taskResults);
  assert.deepEqual(restoreWorknetPlayer(restored, 112), restored);
});

test('background simulation respects the same colleague commitment and leave as delegation', () => {
  const workplace = restoreWorkplace({}, 112);
  workplace.delegatedTasks.push({ assigneeId: 'cw-dga-1', status: 'In Progress' });
  const next = advanceWorknetSimulation(emptyWorknetSimulation(112), 113, workplace);
  assert.equal(next.npcs['cw-dga-1'].completedUnits, 0);
  assert.equal(next.npcs['cw-dga-1'].lastDecision, 'defer');
  workplace.subordinateLeaves.push({ subordinateId: 'cw-fm-1', status: 'Approved', untilTick: 120 });
  const onLeave = advanceWorknetSimulation(emptyWorknetSimulation(112), 113, workplace);
  assert.equal(onLeave.npcs['cw-fm-1'].completedUnits, 0);
  assert.equal(onLeave.npcs['cw-fm-1'].lastDecision, 'defer');
});

test('structured department rewards and assignment-linked schedules survive projection', () => {
  const workplace = restoreWorkplace({}, 112, { worknetOrders: { 'ms-shift-01': { status: 'accepted' } } });
  const clinical = workplace.scheduleItems.find(s => s.assignmentId === 'ms-shift-01');
  assert.equal(clinical.status, 'Completed');
  assert.equal(clinical.startTick, 113);
  assert.equal(clinical.timeSlot, 'Afternoon');
  assert.ok(registry.delegation.every(t => Number.isInteger(t.rewardCredits) && Number.isInteger(t.rewardMerit)));
});

test('payroll rejects invalid numbers and unverified work; duplicate saved claims prefer issued receipts', () => {
  assert.equal(calculateCompensation({ claimId: 'bad', model: 'hourly', verified: true, verifiedUnits: NaN, ratePerUnit: 40 }).ok, false);
  assert.equal(calculateCompensation({ claimId: 'bad', model: 'hourly', verified: false, verifiedUnits: 2, ratePerUnit: 40 }).ok, false);
  const restored = restoreWorknetSimulation({ payrollLedger: [{ id: '1', claimId: 'same', netCredits: 40, stage: 'earned' }, { id: '2', claimId: 'same', netCredits: 40, stage: 'issued' }] });
  assert.equal(restored.payrollLedger.length, 1);
  assert.equal(issueEarnedPayroll(restored, 28).totalNetCredits, 0);
});

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
globalThis.window = { localStorage: globalThis.localStorage };
const { useOSStore: store } = await import('../src/store/useOSStore.ts?registry=initial');
const initial = structuredClone(store.getState().gameplay);
function reset() {
  store.setState({ gameplay: { ...structuredClone(initial), timeCycleCount: 28, timeSegmentIndex: 0 }, worknetSim: emptyWorknetSimulation(112), isLoggedIn: true });
  store.setState(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, clearanceLevel: 5, credits: 1000, stamina: 100, employmentContracts: {}, compensationReceiptIds: [], rewardedWorkOrderIds: [], worknetOrders: {}, taskResults: {}, completedWorknetMissionIds: [] } } }));
}

test('all careers accept contracts, salary comes from catalog, and rehire cannot claim the same cycle twice', () => {
  reset();
  for (const track of Object.keys(CAREER_REGISTRY)) assert.equal(store.getState().acceptEmployment(track).ok, true, track);
  const expected = Object.values(CAREER_REGISTRY).reduce((sum, c) => sum + c.baseSalaryCredits, 0);
  assert.equal(store.getState().claimCycleStipends().creditsClaimed, expected);
  store.getState().resignEmployment('dga');
  store.getState().acceptEmployment('enforcer');
  assert.equal(store.getState().claimCycleStipends().ok, false);
});

test('hourly work requires elapsed session time, fixed rates, and cannot claim overlapping units at different employers', () => {
  reset(); store.getState().acceptEmployment('dga'); store.getState().acceptEmployment('engineer');
  assert.equal(store.getState().logHourlyShiftTime('dga', 2).ok, false);
  store.setState(s => ({ gameplay: { ...s.gameplay, timeSegmentIndex: 2 } }));
  assert.equal(store.getState().logHourlyShiftTime('dga', 2, 999999).ok, true);
  assert.equal(store.getState().worknetSim.payrollLedger.reduce((sum, e) => sum + e.grossCredits, 0), 80);
  assert.equal(store.getState().logHourlyShiftTime('engineer', 2).ok, false);
  assert.equal(store.getState().issuePendingPayroll().netCredits, 76);
  assert.equal(store.getState().issuePendingPayroll().ok, false);
});

test('simulation initializes workplace state without opening WORKNET and advances only with the shared clock', () => {
  reset();
  store.getState().syncWorknetSimulation();
  assert.equal(store.getState().gameplay.player.worknetWorkplace.originTick, 112);
  store.setState(s => ({ gameplay: { ...s.gameplay, timeSegmentIndex: 1 } }));
  store.getState().syncWorknetSimulation();
  assert.equal(store.getState().gameplay.player.worknetWorkplace.coworkerStats['cw-dga-1'].status, 'In Meeting');
  const snapshot = structuredClone(store.getState().worknetSim);
  store.getState().syncWorknetSimulation();
  assert.deepEqual(store.getState().worknetSim, snapshot);
});

test('stage delegation checks actual availability and saves reviewed attribution on the original output', () => {
  reset(); store.getState().acceptEmployment('engineer');
  store.getState().openWorknetOrder('ms-shift-04');
  store.setState(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player,
    worknetOrders: { ...s.gameplay.player.worknetOrders, 'ms-shift-04': { ...s.gameplay.player.worknetOrders['ms-shift-04'], briefingReadAt: 'reviewed' } } } } }));
  const stage = registry.procedures['ms-shift-04'].stages[0];
  const values = { ...Object.fromEntries(stage.fields.map(f => [f.id, f.expected])), _executionMode: 'delegated' };
  assert.equal(store.getState().submitWorknetStage('ms-shift-04', stage.id, values).ok, false);
  store.getState().setCareerPathwayChoice('engineer', 'supervisor');
  const colleague = availableStageColleague(store.getState().gameplay.player, 'engineer', 112);
  assert.ok(colleague);
  assert.equal(store.getState().submitWorknetStage('ms-shift-04', stage.id, values).ok, true);
  const result = Object.values(store.getState().gameplay.player.taskResults)[0];
  assert.equal(result.assigneeId, colleague.id);
  assert.equal(result.executionMode, 'delegated');
  assert.ok(result.assignedBy && result.approvedBy);
  const busy = { ...store.getState().gameplay.player, worknetWorkplace: { delegatedTasks: [{ assigneeId: colleague.id, status: 'Review Ready' }] } };
  assert.equal(availableStageColleague(busy, 'engineer', 112), undefined);
});

test('partial settlement seals the work identity and its receipt survives hydration', async () => {
  reset(); store.getState().acceptEmployment('engineer');
  assert.equal(store.getState().openWorknetOrder('ms-shift-04').ok, true);
  const order = store.getState().gameplay.player.worknetOrders['ms-shift-04'];
  const result = { id: `${order.id}:preflight`, workOrderId: order.id, stageId: 'preflight', definitionId: 'ms-shift-04', subject: order.subject };
  store.setState(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, taskResults: { [result.id]: result }, worknetOrders: { 'ms-shift-04': { ...order, resultIds: [result.id] } } } } }));
  assert.equal(store.getState().settleInterruptedOrder('ms-shift-04').ok, true);
  assert.equal(store.getState().openWorknetOrder('ms-shift-04').ok, false);
  const { useOSStore: hydrated } = await import('../src/store/useOSStore.ts?registry=hydrated');
  assert.equal(hydrated.getState().openWorknetOrder('ms-shift-04').ok, false);
  assert.ok(hydrated.getState().gameplay.player.compensationReceiptIds.includes(order.id));
  assert.equal(hydrated.getState().worknetSim.payrollLedger.length, 1);
});
