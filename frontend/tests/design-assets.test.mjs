import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const mod = await import('../src/data/designAssets.ts');
const {
  APP_ICON_ASSETS,
  APP_ORNAMENTS,
  BRAND_MARKS,
  WALLPAPER_ASSETS,
  NO_CUSTOM_ICON,
  getAppIconAsset,
  getAppOrnament,
  getBrandMark,
} = mod;

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const resolvePublic = (src) => path.join(publicDir, decodeURIComponent(src.replace(/^\//, '')));

const APP_IDS = [
  'fieldOperations', 'dgaos', 'documentStudio', 'creativeStudio', 'meridionRegistry',
  'jobs', 'process', 'housing', 'finance', 'vitals', 'campus', 'study', 'spellforge',
  'browser', 'mail', 'post', 'comms', 'passport', 'maispace', 'files', 'lore',
  'terminal', 'settings',
];

test('every mapped app icon exists in public', () => {
  for (const [appId, src] of Object.entries(APP_ICON_ASSETS)) {
    assert.ok(existsSync(resolvePublic(src)), `${appId} icon missing: ${src}`);
  }
});

test('every ornament and brand asset exists in public', () => {
  for (const src of Object.values(APP_ORNAMENTS)) {
    assert.ok(existsSync(resolvePublic(src)), `ornament missing: ${src}`);
  }
  for (const src of Object.values(BRAND_MARKS)) {
    assert.ok(existsSync(resolvePublic(src)), `brand missing: ${src}`);
  }
});

test('every app id has an icon asset or is explicitly exempt', () => {
  for (const id of APP_IDS) {
    assert.ok(APP_ICON_ASSETS[id] || NO_CUSTOM_ICON.includes(id), `${id} has no icon asset`);
  }
});

test('asset paths are public-root URLs', () => {
  for (const src of [...Object.values(APP_ICON_ASSETS), ...Object.values(APP_ORNAMENTS), ...Object.values(BRAND_MARKS)]) {
    assert.ok(src.startsWith('/'), `asset path must start with /: ${src}`);
  }
});

test('wallpaper assets and helper aliases resolve', () => {
  assert.equal(WALLPAPER_ASSETS.length, 5);
  for (const asset of WALLPAPER_ASSETS) {
    assert.ok(existsSync(resolvePublic(asset.src)), `wallpaper missing: ${asset.src}`);
  }
  assert.equal(getAppIconAsset('mail'), APP_ICON_ASSETS.mail);
  assert.equal(getAppOrnament('documentStudio'), APP_ORNAMENTS.documentStudio);
  assert.equal(getBrandMark('meridianMasthead'), BRAND_MARKS.meridianMasthead);
});