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

const { weatherForCycle } = await import('../src/gameplay/worldWeather.ts');

test('weather is deterministic and cycles with the player cycle', () => {
  assert.equal(weatherForCycle(0), 'Aureline Clear');
  assert.equal(weatherForCycle(6), 'Aureline Clear');
  assert.equal(weatherForCycle(1), 'Prism Drift');
  assert.equal(weatherForCycle(5), 'Shadow Static');
  assert.equal(weatherForCycle(Number.NaN), 'Aureline Clear');
});