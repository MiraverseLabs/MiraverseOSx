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

const { isPortalUrl, parsePortalUrl, portalUrl, portalPageTitle } = await import('../src/apps/Browser/portalRouter.ts');

test('portal domains and subpaths parse', () => {
  assert.equal(isPortalUrl('https://dga.gov.aure/registry'), true);
  assert.equal(isPortalUrl('https://shipping.aure/routes'), true);
  assert.equal(isPortalUrl('https://royalhistory.mer/charters'), true);
  assert.equal(isPortalUrl('https://vectornet.aure/relays'), true);
  assert.equal(isPortalUrl('https://example.com'), false);
  const location = parsePortalUrl('https://shipping.aure/routes');
  assert.equal(location?.id, 'shipping');
  assert.equal(location?.view, 'routes');
});

test('invalid portal subpaths fall back without crashing', () => {
  const location = parsePortalUrl('https://dga.gov.aure/not-a-view');
  assert.ok(location);
  assert.equal(location.valid, false);
  assert.equal(location.view, 'overview');
});

test('urls and titles come from the same parser', () => {
  assert.equal(portalUrl('royalhistory', 'charters'), 'https://royalhistory.mer/charters');
  assert.equal(portalUrl('dga'), 'https://dga.gov.aure');
  assert.match(portalPageTitle('https://dga.gov.aure/registry') || '', /Registry · Directorate/);
  assert.match(portalPageTitle('https://royalhistory.mer/charters') || '', /Charters · Royal/);
  assert.match(portalPageTitle('https://shipping.aure/routes') || '', /Routes · CargoTrack/);
  assert.match(portalPageTitle('https://vectornet.aure/relays') || '', /Relays · VectorNet/);
  assert.equal(portalPageTitle('https://example.com'), null);
});