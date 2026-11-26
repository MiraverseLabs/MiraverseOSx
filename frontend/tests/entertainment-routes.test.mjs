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

const {
  ENTERTAINMENT_SITES,
  matchEntertainmentSite,
  parseEntertainmentUrl,
  entertainmentUrl,
  entertainmentPageTitle,
} = await import('../src/apps/Browser/entertainment/entertainmentRouter.ts');

const byId = (id) => ENTERTAINMENT_SITES.find((site) => site.orgId === id);

test('canonical domains resolve, including kajistudios.mer and velcur.mer', () => {
  assert.equal(matchEntertainmentSite('https://songbird.mer')?.orgId, 'ORG_SONGBIRD');
  assert.equal(matchEntertainmentSite('https://kajistudios.mer')?.orgId, 'ORG_KAJI_PUBLISHING');
  assert.equal(matchEntertainmentSite('https://velcur.mer')?.orgId, 'ORG_VELVET_CURTAIN');
});

test('the four pilot sub-paths parse to the selected view', () => {
  const cases = [
    ['https://songbird.mer/listen', 'front'],
    ['https://limelight.mer/stories', 'front'],
    ['https://silverleafstadium.mer/box-office', 'front'],
    ['https://glasslinedesigns.mer/commissions', 'front'],
    ['https://songbird.mer/studio', 'workspace'],
    ['https://songbird.mer/directory', 'directory'],
    ['https://songbird.mer/', 'home'],
  ];
  for (const [url, view] of cases) {
    const route = parseEntertainmentUrl(url);
    assert.ok(route, `expected a route for ${url}`);
    assert.equal(route.view, view, url);
  }
});

test('query deep-links are preserved by the parser', () => {
  const section = parseEntertainmentUrl('https://silverleafstadium.mer/box-office?section=club-box');
  assert.equal(section?.params.get('section'), 'club-box');
  const story = parseEntertainmentUrl('https://limelight.mer/stories?story=abc');
  assert.equal(story?.params.get('story'), 'abc');
  const genre = parseEntertainmentUrl('https://songbird.mer/listen?genre=Rock');
  assert.equal(genre?.params.get('genre'), 'Rock');
});

test('urls and titles come from the same route parser', () => {
  const songbird = byId('ORG_SONGBIRD');
  assert.ok(entertainmentUrl(songbird, 'front').endsWith('/listen'));
  assert.match(entertainmentPageTitle('https://songbird.mer/listen'), /Listen & Top Charts · Songbird/);
  assert.match(entertainmentPageTitle('https://limelight.mer/stories'), /Cover Stories & Rankings · Limelight/);
  assert.match(entertainmentPageTitle('https://silverleafstadium.mer/box-office'), /Box Office & Calendar · Silverleaf/);
  assert.match(entertainmentPageTitle('https://glasslinedesigns.mer/commissions'), /Commissions & Campaigns · Glassline/);
});

test('unknown sub-paths do not crash and yield no selected view', () => {
  const route = parseEntertainmentUrl('https://songbird.mer/does-not-exist');
  assert.ok(route);
  assert.equal(route.view, undefined);
  assert.match(entertainmentPageTitle('https://songbird.mer/does-not-exist'), /Page unavailable/);
});

test('legacy /discover still maps to the front view', () => {
  const route = parseEntertainmentUrl('https://songbird.mer/discover');
  assert.equal(route?.view, 'front');
});