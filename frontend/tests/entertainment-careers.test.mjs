import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});

const { ENTERTAINMENT_CAREER_FAMILIES, ENTERTAINMENT_ROLES, isArtistRole, rolesForFamily } = await import('../src/gameplay/EntertainmentCareers.ts');
const work = (await import('../src/data/entertainment-worknet.json', { with: { type: 'json' } })).default;

test('eight career families with unique roles', () => {
  assert.equal(ENTERTAINMENT_CAREER_FAMILIES.length, 8);
  const ids = ENTERTAINMENT_ROLES.map(role => role.id);
  assert.equal(new Set(ids).size, ids.length, 'role ids are unique');
  for (const family of ENTERTAINMENT_CAREER_FAMILIES) {
    assert.ok(family.roles.length >= 3, `${family.id} needs roles`);
    for (const role of family.roles) {
      assert.ok(role.title && role.skills.length, `${role.id} is incomplete`);
      assert.ok(role.kind === 'artist' || role.kind === 'staff');
    }
  }
});

test('artist and staff roles are distinct across families', () => {
  assert.equal(isArtistRole('singer'), true);
  assert.equal(isArtistRole('producer'), false);
  assert.equal(isArtistRole('royalty_analyst'), false);
  assert.ok(rolesForFamily('administration').every(role => role.kind === 'staff'));
  assert.ok(rolesForFamily('music').some(role => role.kind === 'artist'));
});

test('non-artist WORKNET assignments are valid and mapped', () => {
  assert.ok(work.length >= 6);
  for (const mission of work) {
    assert.ok(mission.track, `${mission.id} needs a track`);
    assert.ok(mission.careerId, `${mission.id} needs a careerId`);
    assert.ok(mission.rewardCredits > 0);
    assert.ok(mission.permittedTools.length > 0);
    assert.equal(mission.activityScope, 'shift');
  }
});