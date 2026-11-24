import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const {
  ACTIVITY_HIERARCHY,
  WORKNET_ACTIVITY_CATEGORIES,
  ESTABLISHED_CAREERS,
  MISSION_ACTION_VOCABULARY,
  EXECUTION_MODES,
  OBJECTIVE_PATTERNS,
  mapMechanicToActions,
  evaluateHybridOutcome,
  evaluateNpcDecision,
  evaluateFiveDimensions,
  calculateCompensation,
} = await import('../src/gameplay/WorknetCoreSystems.ts');
const { WORK_DEFINITIONS, stageActionTypes } = await import('../src/gameplay/ActivityEngine.ts');
const {
  emptyWorknetSimulation,
  advanceWorknetSimulation,
  recordEarnedPayroll,
  issueEarnedPayroll,
  availableExecutionModes,
} = await import('../src/gameplay/WorknetSimulation.ts');

test('WorknetCoreSystems defines canonical scopes, categories, 9 careers, 16 actions, and maps existing WORKNET mechanics', () => {
  assert.equal(Object.keys(ACTIVITY_HIERARCHY).length, 5);
  assert.equal(WORKNET_ACTIVITY_CATEGORIES.length, 5);
  assert.equal(ESTABLISHED_CAREERS.length, 10);
  assert.equal(MISSION_ACTION_VOCABULARY.length, 16);
  assert.equal(EXECUTION_MODES.length, 4);
  assert.equal(OBJECTIVE_PATTERNS.length, 5);

  for (const def of Object.values(WORK_DEFINITIONS)) {
    for (const stage of def.stages) {
      const actions = stageActionTypes(stage);
      assert.ok(actions.length > 0, `Stage ${def.id}:${stage.id} must map to canonical actions`);
      for (const action of actions) {
        assert.ok(MISSION_ACTION_VOCABULARY.includes(action));
      }
    }
  }
  assert.deepEqual(mapMechanicToActions('investigation'), ['Investigate', 'Observe', 'Analyze']);
});

test('Hybrid outcome evaluation separates validity, quality, objective satisfaction, and institutional acceptance', () => {
  const unauth = evaluateHybridOutcome({
    action: 'Verify',
    mode: 'guided',
    authorized: false,
    validInput: true,
    evidenceSufficient: true,
  });
  assert.equal(unauth.actionValid, false);
  assert.equal(unauth.objectiveSatisfied, false);

  const pendingApproval = evaluateHybridOutcome({
    action: 'Submit',
    mode: 'direct',
    authorized: true,
    validInput: true,
    evidenceSufficient: true,
    institutionalApprovalRequired: true,
    institutionalApproved: false,
    skillLevel: 4,
    difficulty: 2,
    contextRoll: 0.6,
  });
  assert.equal(pendingApproval.actionValid, true);
  assert.equal(pendingApproval.objectiveSatisfied, true);
  assert.equal(pendingApproval.institutionallyAccepted, false);
});

test('NPC decision model enforces safety and authorization boundaries over urgency', () => {
  const unsafe = evaluateNpcDecision({
    npcId: 'npc-1',
    role: 'Assistant',
    autonomy: 'routine',
    authorizedForTask: true,
    withinRoleRemit: true,
    hasRequiredInformation: true,
    trust: 80,
    cooperation: 90,
    status: 'Desk',
    hasOpenCommitment: false,
    safetyCompliant: false,
    urgent: true,
  });
  assert.equal(unsafe.decision, 'refuse');

  const unauth = evaluateNpcDecision({
    npcId: 'npc-1',
    role: 'Library Assistant',
    autonomy: 'routine',
    authorizedForTask: false,
    withinRoleRemit: false,
    hasRequiredInformation: true,
    trust: 80,
    cooperation: 90,
    status: 'Desk',
    hasOpenCommitment: false,
    safetyCompliant: true,
    urgent: true,
  });
  assert.equal(unauth.decision, 'refer');

  const urgentValid = evaluateNpcDecision({
    npcId: 'npc-2',
    role: 'Archivist',
    autonomy: 'routine',
    authorizedForTask: true,
    withinRoleRemit: true,
    hasRequiredInformation: true,
    trust: 70,
    cooperation: 80,
    status: 'Desk',
    hasOpenCommitment: true,
    safetyCompliant: true,
    urgent: true,
  });
  assert.equal(urgentValid.decision, 'defer');
  const available = evaluateNpcDecision({ ...{ npcId: 'npc-2', role: 'Archivist', autonomy: 'routine', authorizedForTask: true, withinRoleRemit: true, hasRequiredInformation: true, trust: 70, cooperation: 80, status: 'Desk', hasOpenCommitment: false, safetyCompliant: true, urgent: true } });
  assert.equal(available.decision, 'execute');
  assert.equal(available.autonomyUsed, 'situational');
});

test('Career dimensions separate development tier from job title, and compensation prevents duplicate payouts', () => {
  const dims = evaluateFiveDimensions('engineer', {
    skills: { Engineering: { level: 5 }, Cryptography: { level: 3 } },
    clearanceLevel: 3,
    careerTrackXp: { engineer: 900 },
    completedWorknetMissionIds: ['ms-shift-04', 'ms-dev-01'],
    employmentContracts: { engineer: { id: 'EMP:engineer', track: 'engineer', position: 'Senior Relay Technician', pathwayChoice: 'specialist' } },
  });
  assert.equal(dims.employmentPosition.jobTitle, 'Senior Relay Technician');
  assert.equal(dims.employmentPosition.careerDevelopmentTier, 'Established Veteran');
  assert.equal(dims.employmentPosition.pathway, 'specialist');

  const hourly = calculateCompensation({
    claimId: 'PAY-1',
    model: 'hourly',
    payer: 'Oryn Department of Finance',
    actorId: 'player',
    verifiedUnits: 4,
    ratePerUnit: 45,
    authorizedPremiums: 20,
    verified: true,
    priorReceiptIds: [],
  });
  assert.equal(hourly.ok, true);
  assert.equal(hourly.grossCredits, 200);

  const duplicate = calculateCompensation({
    claimId: 'PAY-1',
    model: 'assignment',
    payer: 'WORKNET',
    actorId: 'player',
    agreedFee: 300,
    verified: true,
    priorReceiptIds: ['PAY-1'],
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.grossCredits, 0);
});

test('WorknetSimulation advances autonomous NPCs, backlogs, peer bonds, payroll ledger, and execution modes', () => {
  let sim = emptyWorknetSimulation(0);
  // Same tick does not advance simulation (session-based clock discipline)
  assert.deepEqual(advanceWorknetSimulation(sim, 0), sim);

  // Advancing 3 session ticks drives NPC autonomous work, XP growth, and backlog clearing
  sim = advanceWorknetSimulation(sim, 3);
  assert.equal(sim.lastTick, 3);
  const totalCleared = Object.values(sim.workloads).reduce((sum, w) => sum + w.completedBackgroundUnits, 0);
  assert.ok(totalCleared > 0, 'NPCs should clear background institutional backlog units');
  assert.ok(sim.activityFeed.length > 0, 'Autonomous NPC activity feed should record actions');

  // Payroll lifecycle: earn -> verify -> issue once with Oryn 5% civic levy
  const earned = recordEarnedPayroll(sim, {
    claimId: 'HOURLY:dga:1:0',
    model: 'hourly',
    payer: 'Oryn Department of Finance',
    track: 'dga',
    description: '2 verified work units',
    verifiedUnits: 2,
    ratePerUnit: 50,
    verified: true,
    cycle: 1,
  });
  assert.equal(earned.ok, true);
  assert.equal(earned.entry.grossCredits, 100);
  assert.equal(earned.entry.civicDeduction, 5);
  assert.equal(earned.entry.netCredits, 95);
  assert.equal(earned.entry.stage, 'earned');

  // Duplicate claim is blocked
  assert.equal(
    recordEarnedPayroll(earned.state, {
      claimId: 'HOURLY:dga:1:0',
      model: 'hourly',
      payer: 'Oryn Department of Finance',
      track: 'dga',
      description: 'duplicate',
      verifiedUnits: 2,
      ratePerUnit: 50,
      verified: true,
      cycle: 1,
    }).ok,
    false,
  );

  // Issue pays once and transitions stage to issued
  const issued = issueEarnedPayroll(earned.state, 1);
  assert.equal(issued.issuedCount, 1);
  assert.equal(issued.totalNetCredits, 95);
  assert.equal(issueEarnedPayroll(issued.state, 1).issuedCount, 0);

  // Execution modes gate Assisted and Delegated appropriately
  const entryModes = availableExecutionModes({ clearanceLevel: 1, employmentContracts: {} }, 'dga', true);
  assert.equal(entryModes.find(m => m.mode === 'direct').enabled, true);
  assert.equal(entryModes.find(m => m.mode === 'assisted').enabled, false);
  assert.equal(entryModes.find(m => m.mode === 'delegated').enabled, false);

  const supModes = availableExecutionModes(
    { clearanceLevel: 3, employmentContracts: { dga: { pathwayChoice: 'supervisor' } } },
    'dga',
    true,
  );
  assert.equal(supModes.find(m => m.mode === 'assisted').enabled, true);
  assert.equal(supModes.find(m => m.mode === 'delegated').enabled, true);
});
