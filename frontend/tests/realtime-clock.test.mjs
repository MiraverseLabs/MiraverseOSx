import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); }
} });
const { clockMinutes, clockSegments, initialClock, gameDate } = await import('../src/gameplay/RealTimeClock.ts');

test('one wall minute is one game minute; repeated reads and backwards wall clocks do not advance twice', () => {
  const now = new Date(2026, 10, 27, 18, 15, 0).getTime();
  const clock = initialClock({ timeCycleCount: 28 }, now);
  assert.equal(clockMinutes(clock, now + 59_999), clock.elapsedMinutes);
  assert.equal(clockMinutes(clock, now + 60_000), clock.elapsedMinutes + 1);
  const saved = { ...clock, elapsedMinutes: clockMinutes(clock, now + 60_000) };
  assert.equal(clockMinutes(saved, now + 60_000), saved.elapsedMinutes);
  assert.equal(clockMinutes(saved, now - 60_000), saved.elapsedMinutes);
  assert.equal(clockMinutes(saved, now + 3 * 86400_000), clock.elapsedMinutes + 3 * 1440);
});

test('legacy schedule segments stay monotonic across midnight and roll into morning at 06:00', () => {
  assert.deepEqual(clockSegments(28 * 1440 + 18 * 60), { timeCycleCount: 28, timeSegmentIndex: 2 });
  assert.deepEqual(clockSegments(29 * 1440), { timeCycleCount: 28, timeSegmentIndex: 3 });
  assert.deepEqual(clockSegments(29 * 1440 + 6 * 60), { timeCycleCount: 29, timeSegmentIndex: 0 });
});

test('clock face advances with the saved game minutes, including an offline day', () => {
  const now = new Date(2026, 10, 27, 18, 15, 43).getTime();
  const clock = initialClock({ timeCycleCount: 28 }, now);
  const date = gameDate({ realTimeClock: { ...clock, elapsedMinutes: clock.elapsedMinutes + 1440 } });
  assert.equal(date.getDate(), 28);
  assert.equal(date.getHours(), 18);
  assert.equal(date.getMinutes(), 15);
});

test('offline catch-up preserves player resources and active assignments; rest cannot skip time', async () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) } });
  const { useOSStore: store } = await import('../src/store/useOSStore.ts?realtime-clock-test');
  store.getState().loginUser({ name: 'Clock test', credits: 500, clearance: 2 });
  const now = new Date(2026, 10, 27, 18, 15).getTime();
  store.getState().tickRealTimeClock(now);
  const before = structuredClone(store.getState().gameplay.player);
  store.getState().tickRealTimeClock(now + 3 * 86400_000);
  const after = store.getState().gameplay;
  for (const key of ['stamina', 'auraHealth', 'credits', 'bits', 'xp', 'conditions', 'worknetOrders', 'assignmentJournal']) assert.deepEqual(after.player[key], before[key], key);
  assert.equal(after.realTimeClock.elapsedMinutes, initialClock({timeCycleCount:28}, now).elapsedMinutes + 3 * 1440);
  const minutes = after.realTimeClock.elapsedMinutes;
  for (const duration of ['short', 'standard', 'full']) store.getState().restInDorm(duration);
  assert.equal(store.getState().gameplay.realTimeClock.elapsedMinutes, minutes);
  assert.equal(store.getState().gameplay.timeCycleCount, after.timeCycleCount);
  const saved = JSON.parse(values.get('miraverse-os-progress')).state.gameplay.realTimeClock;
  assert.equal(saved.anchorUnixMs, after.realTimeClock.anchorUnixMs);
});
