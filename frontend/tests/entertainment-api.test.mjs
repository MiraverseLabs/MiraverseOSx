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

// Render the real hook against successive synchronized snapshots; no network cache
// should override updated counters or retain tracks when switching/unlinking runs.
test('live charts follow changed track snapshots and clear on unlink', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { useLiveCharts } = await import('../src/integration/useEntertainment.ts');
  let observed;
  function Probe({ runId, tracks }) {
    observed = useLiveCharts(runId, tracks);
    return null;
  }
  const tracks = [
    { trackId: 'a', title: 'A', artistId: 'artist', streams: 10, radioSpins: 0 },
    { trackId: 'b', title: 'B', artistId: 'artist', streams: 5, radioSpins: 2 },
  ];
  const render = (runId, snapshot) => renderToStaticMarkup(createElement(Probe, { runId, tracks: snapshot }));
  render('run-1', tracks);
  assert.deepEqual(observed.map(t => t.trackId), ['a', 'b']);
  const updated = [tracks[0], { ...tracks[1], streams: 20 }];
  render('run-1', updated);
  assert.deepEqual(observed.map(t => t.trackId), ['b', 'a']);
  assert.equal(observed[0].streams, 20);
  assert.equal(tracks[0].trackId, 'a', 'ranking must not mutate the synchronized snapshot');
  render('run-2', []);
  assert.deepEqual(observed, []);
  render(null, updated);
  assert.deepEqual(observed, []);
});
