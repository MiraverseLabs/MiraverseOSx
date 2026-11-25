import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

// Match Vite's extensionless TypeScript imports using Node's built-in TS support.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

const mod = await import('../src/integration/livingWorldLink.ts');
const { segmentsToSteps, stepsToSegments, creditMirrorRequestId, reconcileLink, citizenBalance, runCitizens } = mod;
const bridge = await import('../src/integration/worknetSimulationBridge.ts');

const link = { runId: 'run-1', characterId: 'cit-1', canonicalPersonId: 'P-1', displayName: 'Tester', creditMirrorRevision: 0 };

test('segments map to simulation steps at the default 30-minute step', () => {
  assert.equal(segmentsToSteps(30, 1), 12);
  assert.equal(segmentsToSteps(30, 4), 48);
  assert.equal(segmentsToSteps(60, 1), 6);
});

test('step conversion clamps to the API range', () => {
  assert.equal(segmentsToSteps(30, 0), 1);
  assert.equal(segmentsToSteps(30, 9999), 1440);
  assert.equal(segmentsToSteps(Number.NaN, 1), 12);
});

test('steps convert back to player segments', () => {
  assert.equal(stepsToSegments(30, 12), 1);
  assert.equal(stepsToSegments(30, 144), 12);
  assert.equal(stepsToSegments(60, 6), 1);
});

test('credit mirror request id is stable and revision-scoped', () => {
  const a = creditMirrorRequestId(link, 28);
  const b = creditMirrorRequestId(link, 28);
  assert.equal(a, b);
  assert.notEqual(a, creditMirrorRequestId({ ...link, creditMirrorRevision: 1 }, 28));
  assert.notEqual(a, creditMirrorRequestId(link, 29));
});

test('reconcile derives player time from the authoritative run clock', () => {
  const clock = { elapsed_minutes: 360 * 10, step_minutes: 30, tick_count: 120 };
  const result = reconcileLink(link, clock, 500);
  assert.equal(result.timeCycleCount, 2);
  assert.equal(result.timeSegmentIndex, 2);
  assert.equal(result.creditBaseline, 500);
});

test('reconcile tolerates a missing citizen balance', () => {
  const clock = { elapsed_minutes: 0, step_minutes: 30, tick_count: 0 };
  const result = reconcileLink(link, clock, undefined);
  assert.equal(result.creditBaseline, null);
  assert.equal(result.timeCycleCount, 0);
  assert.equal(result.timeSegmentIndex, 0);
});

test('citizen balance and roster read from a run snapshot', () => {
  const snapshot = {
    run: { run_id: 'run-1', name: 'R', revision: 1, calendar: {}, state: { citizens: {
      'cit-1': { name: 'Tester', balance: 250 },
      'cit-2': { name: 'Other' },
    } } },
    clock: { elapsed_minutes: 0, step_minutes: 30, tick_count: 0 },
    date: 'Year 0',
    transactions: [],
  };
  assert.equal(citizenBalance(snapshot, 'cit-1'), 250);
  assert.equal(citizenBalance(snapshot, 'cit-2'), null);
  const roster = runCitizens(snapshot);
  assert.equal(roster.length, 2);
  assert.equal(roster[0].characterId, 'cit-1');
});

const completion = {
  missionId: 'ms-shift-02',
  track: 'engineer',
  orderId: 'WORK:ms-shift-02:28',
  subject: 'Relay calibration',
  evaluation: 90,
  credits: 350,
  xp: 120,
  institution: 'WORKNET // ENGINEER',
  position: 'Junior Engineer',
};

test('worknet event payload records the order and rewards', () => {
  const event = bridge.buildWorknetEvent(completion);
  assert.equal(event.kind, 'worknet');
  assert.match(event.title, /WORK:ms-shift-02:28/);
  assert.match(event.description, /350 credits/);
  assert.match(event.description, /120 career XP/);
});

test('employment is assigned only when the citizen has no career', () => {
  assert.equal(bridge.shouldAssignCareer([], 'cit-1'), true);
  assert.equal(bridge.shouldAssignCareer([{ characterId: 'cit-1', title: 'Engineer' }], 'cit-1'), false);
  assert.equal(bridge.shouldAssignCareer([{ characterId: 'cit-2' }], 'cit-1'), true);
});