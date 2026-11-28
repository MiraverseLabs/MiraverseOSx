import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch(error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); } } });
const { restoreCharacterProfile, validateCharacterProfile, personalDisplayName } = await import('../src/gameplay/CharacterProfile.ts');
const { findSpeciesRecord } = await import('../src/game-content/species/registry.ts');
const { hasCreatorAccess, grantLocalCredentials } = await import('../src/gameplay/localCredentials.ts');
const { resolveAuraActor } = await import('../src/integration/auraPermissions.ts');

test('profile recovery bounds fields, rejects external portraits and separates practices from species', () => {
  const practice = findSpeciesRecord('Techno Witch');
  const value = restoreCharacterProfile({ displayName: '  My character  ', alias: 'x'.repeat(100), portrait: 'https://example.com/tracker.png', speciesId: practice.id, practiceIds: [practice.id, practice.id, '__proto__'], interests: ['Music', 'Music', null] });
  assert.equal(value.displayName, 'My character');
  assert.equal(value.alias.length, 40);
  assert.equal(value.speciesId, '');
  assert.equal(value.portrait, '');
  assert.deepEqual(value.practiceIds, [practice.id]);
  assert.deepEqual(value.interests, ['Music']);
  assert.equal(personalDisplayName({ characterProfile: value, player: { name: 'Account name' } }), 'My character');
});

test('a witch tradition requires Witchkind heritage and descriptive choices do not grant powers', () => {
  const practiceIds = [findSpeciesRecord('Techno Witch').id];
  assert.equal(validateCharacterProfile({ displayName: 'Draft', speciesId: findSpeciesRecord('Orynvellian').id, practiceIds }).ok, false);
  const result = validateCharacterProfile({ displayName: 'Draft', speciesId: findSpeciesRecord('Witchkind').id, practiceIds });
  assert.equal(result.ok, true);
  assert.equal(result.profile.powers, undefined);
  assert.equal(validateCharacterProfile({ displayName: 'Draft', ancestry: 'Mixed Witchkind ancestry', practiceIds }).ok, true);
});

test('owning the local world enables a tool capability without promoting the player', () => {
  const game = { lockedApps: ['comms'], player: { name: 'Player', isAdmin: false, clearanceLevel: 1, credits: 500, xp: 0, organizationMemberships: {} } };
  const next = grantLocalCredentials(game, '2026-11-27');
  assert.equal(next.player.creatorAccess, true);
  assert.equal(hasCreatorAccess(next.player), false);
  for (const key of Object.keys(game.player)) assert.deepEqual(next.player[key], game.player[key]);
  assert.deepEqual(next.lockedApps, ['comms']);
  const enabled = { ...next.player, creatorMode: true };
  assert.equal(hasCreatorAccess(enabled), true);
  assert.equal(resolveAuraActor({ isLoggedIn: true, player: next.player }).isAdmin, false);
  assert.equal(resolveAuraActor({ isLoggedIn: true, player: enabled }).isAdmin, true);
  assert.equal(resolveAuraActor({ isLoggedIn: true, player: enabled }).roleLabel, 'Creator tools');
  assert.equal(enabled.isAdmin, false);
});

test('saving and reloading a personal profile preserves issued identity, resources and earned progress', async () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k) } });
  const { useOSStore: os } = await import('../src/store/useOSStore.ts?character-profile-test');
  os.getState().loginUser({ name: 'A regular player', credits: 500, clearance: 1 });
  const before = structuredClone(os.getState().gameplay);
  const profile = { displayName: 'My character', alias: 'cyberbrat', pronouns: '', speciesId: findSpeciesRecord('Witchkind').id, practiceIds: [findSpeciesRecord('Techno Witch').id], bio: 'A character still in planning.', homeDescription: 'A cozy workspace.', appearance: 'Lavender clothes.' };
  assert.equal(os.getState().saveCharacterProfile(profile).ok, true);
  const after = os.getState().gameplay;
  assert.deepEqual(after.player, before.player);
  assert.deepEqual(after.identity, before.identity);
  assert.equal(after.characterProfile.alias, 'cyberbrat');
  const restored = (await import('../src/store/useOSStore.ts?character-profile-reload')).useOSStore;
  assert.equal(restored.getState().gameplay.characterProfile.alias, 'cyberbrat');
  assert.deepEqual(restored.getState().gameplay.identity, before.identity);
  assert.equal(restored.getState().saveCharacterProfile({ displayName: '' }).ok, false);
  restored.getState().logoutUser();
  assert.equal(restored.getState().saveCharacterProfile(profile).ok, false);
});
