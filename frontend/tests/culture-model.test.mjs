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

const { CULTURE_SECTORS, CULTURE_FEATURES, cultureURL, cultureSectorFromParam } = await import('../src/apps/Browser/cultureModel.ts');

test('seven distinct culture sectors', () => {
  assert.equal(CULTURE_SECTORS.length, 7);
  const ids = CULTURE_SECTORS.map(sector => sector.id);
  const sectors = CULTURE_SECTORS.map(sector => sector.sector);
  assert.equal(new Set(ids).size, ids.length, 'sector ids are unique');
  assert.equal(new Set(sectors).size, sectors.length, 'sector names are unique');
  for (const sector of CULTURE_SECTORS) assert.ok(sector.label && sector.blurb && sector.accent, sector.id);
});

test('featured culture destinations are complete and unique', () => {
  assert.ok(CULTURE_FEATURES.length >= 4);
  const domains = CULTURE_FEATURES.map(feature => feature.domain);
  assert.equal(new Set(domains).size, domains.length, 'feature domains are unique');
  for (const feature of CULTURE_FEATURES) assert.ok(feature.title && feature.kicker && feature.blurb && feature.domain, feature.id);
});

test('culture URLs and sector params round-trip', () => {
  assert.equal(cultureURL(), 'https://versenet.aure/culture');
  assert.equal(cultureURL('fashion'), 'https://versenet.aure/culture?sector=fashion');
  assert.equal(cultureSectorFromParam('fashion'), 'fashion');
  assert.equal(cultureSectorFromParam('nope'), null);
  assert.equal(cultureSectorFromParam(null), null);
});