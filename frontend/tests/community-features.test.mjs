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

const { COMMUNITY_FEATURES } = await import('../src/apps/Browser/communityFeatures.ts');
const IDS = ['companion', 'garden', 'reading'];

test('each community site has a complete presentation set', () => {
  for (const id of IDS) {
    const set = COMMUNITY_FEATURES[id];
    assert.ok(set, `${id} is missing a feature set`);
    assert.ok(set.kicker && set.heading && set.badge && set.note, `${id} has empty metadata`);
    assert.ok(set.features.length >= 3, `${id} needs at least three features`);
    const ids = set.features.map(feature => feature.id);
    assert.equal(new Set(ids).size, ids.length, `${id} has duplicate feature ids`);
    for (const feature of set.features) {
      assert.ok(feature.title && feature.body, `${id}/${feature.id} is incomplete`);
    }
  }
});

test('the three community feature sets are distinct', () => {
  const headings = IDS.map(id => COMMUNITY_FEATURES[id].heading);
  const badges = IDS.map(id => COMMUNITY_FEATURES[id].badge);
  assert.equal(new Set(headings).size, IDS.length, 'headings should be distinct');
  assert.equal(new Set(badges).size, IDS.length, 'badges should be distinct');
});