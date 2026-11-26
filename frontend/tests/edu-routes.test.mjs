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

const { institutionFromHostname, parseEduUrl, eduUrl, eduPageTitle } = await import('../src/apps/Browser/edu/eduRouter.ts');

test('university domains resolve and subpaths parse', () => {
  assert.equal(institutionFromHostname('dawn.edu'), 'dawn');
  assert.equal(institutionFromHostname('cyberium.edu'), 'cyberium');
  assert.equal(institutionFromHostname('regenthall.edu'), 'regent');
  assert.equal(parseEduUrl('https://dawn.edu/admissions')?.section, 'admissions');
  assert.equal(parseEduUrl('https://cyberium.edu/academics')?.section, 'academics');
  assert.equal(parseEduUrl('https://regenthall.edu/portal')?.section, 'portal');
});

test('invalid subpaths are marked invalid without crashing', () => {
  const location = parseEduUrl('https://dawn.edu/not-a-section');
  assert.ok(location);
  assert.equal(location.valid, false);
  assert.equal(location.section, 'home');
});

test('urls and titles come from the same parser', () => {
  assert.ok(eduUrl('regent', 'courses').endsWith('/courses'));
  assert.match(eduPageTitle('https://dawn.edu/admissions') || '', /Admissions/);
  assert.match(eduPageTitle('https://cyberium.edu/faculty') || '', /Faculty/);
  assert.match(eduPageTitle('https://regenthall.edu/portal') || '', /Student Portal/);
});