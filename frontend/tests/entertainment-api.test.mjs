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

const { resourceUrl } = await import('../src/integration/entertainmentApi.ts');

test('entertainment resource URLs encode the run and resource', () => {
  assert.equal(resourceUrl('run 1', 'organizations'), '/api/livingworld/organizations?runId=run%201');
  assert.equal(resourceUrl('abc', 'charts'), '/api/livingworld/charts?runId=abc');
});