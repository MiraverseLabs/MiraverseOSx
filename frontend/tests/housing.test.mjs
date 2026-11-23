import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); } } });
const { restoreHomeAmbiance, restoreHomeMemos } = await import('../src/gameplay/Housing.ts');
let instance = 0;
async function fresh() {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } });
  const { useOSStore: store } = await import(`../src/store/useOSStore.ts?housing=${instance++}`);
  store.setState(s => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, credits: 10000, xp: 0, unlockedHousingUpgrades: ['banner'], roomComfort: 95 } } }));
  return store;
}
test('housing preferences recover from malformed data and preserve an intentionally empty board', () => {
  assert.equal(restoreHomeAmbiance('bogus'), 'warm');
  assert.equal(restoreHomeAmbiance('starlight'), 'starlight');
  assert.deepEqual(restoreHomeMemos([null, {}, { id:'a',title:'  hello ',body:' world ' }, { id:'a',title:'duplicate',body:'skip' }]), [{ id:'a',title:'hello',body:'world' }]);
  assert.deepEqual(restoreHomeMemos([], [{ id:'default',title:'a',body:'b' }]), []);
});
test('furnishing purchases use catalog prices, reject unknown products and cap comfort', async () => {
  const store = await fresh();
  assert.equal(store.getState().purchaseHousingUpgrade('missing', -100).ok, false);
  assert.equal(store.getState().purchaseHousingUpgrade('mattress', -100, 1).ok, true);
  assert.equal(store.getState().gameplay.player.credits, 9650);
  assert.equal(store.getState().gameplay.player.roomComfort, 100);
  assert.equal(store.getState().purchaseHousingUpgrade('mattress', 0).ok, false);
  assert.equal(store.getState().gameplay.player.credits, 9650);
});
test('guest rewards require seating and are limited to one visit per friend per cycle', async () => {
  const store = await fresh();
  assert.equal(store.getState().inviteHousingGuest('aelita').ok, false);
  store.getState().purchaseHousingUpgrade('seating', 400);
  assert.equal(store.getState().inviteHousingGuest('missing').ok, false);
  const before = store.getState().gameplay.player.xp;
  store.getState().inviteHousingGuest('aelita');
  store.getState().inviteHousingGuest('aelita');
  assert.equal(store.getState().gameplay.player.xp, before + 15);
  store.getState().restInDorm('full');
  store.getState().inviteHousingGuest('aelita');
  assert.equal(store.getState().gameplay.player.xp, before + 30);
});
