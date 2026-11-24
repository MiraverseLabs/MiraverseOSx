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
  WORLD_PLACES,
  WORLD_ORGANIZATIONS,
  WORLD_OBJECTS,
  WORLD_HISTORY,
  BRAND_KITS,
  EDITORIAL_FONTS,
  resolveEntityMediaSlot,
  resolveWorldEntity,
  listWorldLibraryByDomain,
  uploadRuntimeMediaToBackend,
  brandKitCssVariables,
} = await import('../src/game-content/worldAssetLibrary.ts');
const { EIGHT_REALMS, SEVEN_REALMS, REALM_POSTAL_PREFIXES } = await import('../src/data/meridionWorld.ts');

test('World Asset Library consolidates all 5 domains and reconciles the 8th realm Ve’Raylia', () => {
  assert.equal(EIGHT_REALMS.length, 8);
  assert.equal(SEVEN_REALMS.length, 8, 'compatibility alias reflects canonical 8 realms');
  const veraylia = WORLD_PLACES.realms.find(r => r.id === 'REG_VERAYLIA');
  assert.ok(veraylia);
  assert.equal(veraylia.capital, 'Elmore');
  assert.equal(veraylia.rulingLineage, 'House Valmon');
  assert.equal(REALM_POSTAL_PREFIXES['Ve’Raylia'], 'VR');

  assert.equal(WORLD_ORGANIZATIONS.royalLineages.length, 8);
  assert.equal(WORLD_ORGANIZATIONS.colorHouses.length, 7);
  assert.ok(WORLD_OBJECTS.length >= 6);
  assert.ok(WORLD_HISTORY.eras.length >= 6);

  for (const domain of ['people', 'places', 'organizations', 'objects', 'history']) {
    assert.ok(listWorldLibraryByDomain(domain).length > 0, domain);
  }

  assert.equal(resolveWorldEntity('REG_VERAYLIA')?.name, 'Ve’Raylia');
  assert.equal(resolveWorldEntity('ORG_SOCIAL_REGISTER')?.domain, 'organizations');
  assert.equal(resolveWorldEntity('ORG_THE_MERIDIAN')?.domain, 'organizations');
});

test('Brand kits, OFL font hold rules, and missing-art fallback chain behave deterministically', () => {
  const bjcree = EDITORIAL_FONTS.find(f => f.id === 'bjcree');
  assert.equal(bjcree.status, 'held_pending_license');
  assert.deepEqual(bjcree.localFiles, []);

  const srVars = brandKitCssVariables('the-social-register');
  assert.equal(srVars['--mk-bg-hero'], '#48293D');
  assert.equal(srVars['--mk-accent-primary'], '#C6AE73');

  const exact = resolveEntityMediaSlot({ entityId: 'ORG_SOCIAL_REGISTER', slotRole: 'masthead.primary', brandKitId: 'the-social-register' });
  assert.equal(exact.mode, 'exact_slot');
  assert.match(exact.src, /social-register-masthead\.svg$/);

  const fallbackOrnament = resolveEntityMediaSlot({ entityId: 'NPC_WITHOUT_BESPOKE_PORTRAIT', slotRole: 'portrait.formal', brandKitId: 'the-social-register', fallbackLabel: 'Lady Seraphine' });
  assert.equal(fallbackOrnament.mode, 'brand_ornament');
  assert.equal(fallbackOrnament.monogramText, 'LS');
});

test('Runtime media upload validates MIME types and registers assets for unified resolution', async () => {
  const rejected = await uploadRuntimeMediaToBackend({
    name: 'script.exe',
    mimeType: 'application/octet-stream',
    dataBase64: 'AAAA',
    slotRole: 'portrait.primary',
    creator: 'Tester',
    scope: 'player_work',
  }, undefined);
  assert.equal(rejected.ok, false);

  const uploaded = await uploadRuntimeMediaToBackend({
    name: 'editorial-portrait.png',
    mimeType: 'image/png',
    dataBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    slotRole: 'portrait.editorial',
    entityIds: ['test-entity-01'],
    creator: 'Tester',
    scope: 'player_work',
  }, undefined);
  assert.equal(uploaded.ok, true);
  const resolved = resolveEntityMediaSlot({ entityId: 'test-entity-01', slotRole: 'portrait.editorial' });
  assert.equal(resolved.mode, 'exact_slot');
  assert.equal(resolved.asset.id, uploaded.asset.id);
});
