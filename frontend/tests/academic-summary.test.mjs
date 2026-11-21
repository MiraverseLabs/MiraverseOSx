import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); } } });
const { registerCommunicationsAuthority } = await import('../src/integration/communicationsAccess.ts');
const { MaidIdentityService } = await import('../src/services/maidIdentityService.ts');

test('citizens can synchronize their academic summary without core edit authority or access to another citizen', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  let authority = { isLoggedIn: false, player: {}, identity: {} };
  registerCommunicationsAuthority(() => authority);
  const people = await MaidIdentityService.getAllPersons();
  const self = people[0], other = people[1];
  authority = { isLoggedIn: true, player: { isAdmin: false }, identity: { canonicalPersonId: self.id, citizenId: self.maid } };
  assert.equal((await MaidIdentityService.updatePerson(self.id, { history: 'Unrestricted edit' })).success, false);
  const note = 'Dawn University: 3 credits; certificates: none [academic-summary-test]';
  assert.equal((await MaidIdentityService.appendAcademicSummary(self.id, note)).success, true);
  assert.equal((await MaidIdentityService.appendAcademicSummary(self.id, note)).success, true);
  const after = (await MaidIdentityService.getAllPersons()).find(p => p.id === self.id);
  assert.equal(after.history.split(note).length - 1, 1);
  assert.equal(after.affiliation, self.affiliation); assert.equal(after.maid, self.maid); assert.equal(after.clearance, self.clearance);
  assert.equal((await MaidIdentityService.appendAcademicSummary(other.id, note)).success, false);
  authority.player.isAdmin = true;
  assert.equal((await MaidIdentityService.appendAcademicSummary(other.id, note)).success, true);
  authority.isLoggedIn = false;
  assert.equal((await MaidIdentityService.appendAcademicSummary(self.id, 'Logged out')).success, false);
});
