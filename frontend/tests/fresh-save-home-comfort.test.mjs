import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { restoreHomePersonalization } from '../src/gameplay/Housing.ts';
import {
  normalizeInterfacePreferences,
  resolveReducedMotion,
} from '../src/store/interfacePreferences.ts';

const tmpDir = mkdtempSync(join(tmpdir(), 'miraverse-fresh-save-'));
const bundlePath = join(tmpDir, 'fresh-save.mjs');
await build({
  entryPoints: [new URL('../src/gameplay/FreshPlayerSave.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  outfile: bundlePath,
  bundle: true,
  format: 'esm',
  platform: 'node',
});
const {
  archiveCurrentWorld,
  listArchivedSaves,
  readArchivedSavePayload,
  deleteArchivedSave,
  buildFreshGameplayPatch,
  STARTER_RESIDENCES,
  STARTER_BACKGROUNDS,
} = await import(pathToFileURL(bundlePath).href);
test.after(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
}

test('fresh player save isolates new citizen from Administrator progress and connects AURA, residence, finances, and comms', () => {
  const fresh = buildFreshGameplayPatch({
    displayName: 'Lyra Solis',
    alias: '@lyra.solis',
    pronouns: 'she/her',
    homeRealm: 'Fross',
    speciesId: 'MR-001',
    residenceId: STARTER_RESIDENCES[1].id,
    backgroundId: STARTER_BACKGROUNDS[1].id,
  }, 'MAID-FR-00512345');

  assert.equal(fresh.player.isAdmin, false);
  assert.equal(fresh.player.clearanceLevel, 1);
  assert.equal(fresh.player.level, 1);
  assert.deepEqual(fresh.player.rewardItems, []);
  assert.equal(fresh.player.skills.Programming.level, 1);
  assert.equal(fresh.identity.maid, 'MAID-FR-00512345');
  assert.equal(fresh.identity.residenceId, STARTER_RESIDENCES[1].id);
  assert.equal(fresh.player.credits, STARTER_BACKGROUNDS[1].credits);
  assert.equal(fresh.player.bits, STARTER_BACKGROUNDS[1].bits);
  assert.match(fresh.welcomeEmail.body, /MAID-FR-00512345/);
  assert.match(fresh.welcomeEmail.body, /Glassline Lofts/);
});

test('archiving Administrator world preserves a restorable snapshot before fresh save', () => {
  const store = memoryStorage();
  store.setItem('miraverse-os-progress', JSON.stringify({ state: { gameplay: { player: { name: 'ADMINISTRATOR', isAdmin: true } } } }));
  const archived = archiveCurrentWorld('Administrator Archive', 'ADMINISTRATOR', true, store);
  assert.ok(archived);
  assert.equal(archived.wasAdmin, true);
  assert.equal(listArchivedSaves(store).length, 1);
  const payload = readArchivedSavePayload(archived.storageKey, store);
  assert.ok(payload && payload.entries['miraverse-os-progress']);
  const remaining = deleteArchivedSave(archived.archiveId, store);
  assert.equal(remaining.length, 0);
});

test('home personalization restores palettes, placements, framed photos, and keepsakes safely', () => {
  const restored = restoreHomePersonalization({
    palette: 'sage',
    suiteNickname: 'Fourth-Floor Conservatory',
    doorplateNote: 'Tea is on',
    placements: { desk: 'Bedroom', invalid: 'NotAZone' },
    photos: [
      { id: 'p1', dataUrl: 'data:image/png;base64,AAAA', caption: 'Harbor dusk' },
      { id: 'bad', dataUrl: 'javascript:alert(1)', caption: 'Blocked' },
    ],
    customKeepsakes: [{ id: 'k1', title: 'Frost crystal', story: 'From Northwake' }],
  });
  assert.equal(restored.palette, 'sage');
  assert.equal(restored.suiteNickname, 'Fourth-Floor Conservatory');
  assert.equal(restored.placements.desk, 'Bedroom');
  assert.equal(restored.photos.length, 1);
  assert.equal(restored.photos[0].caption, 'Harbor dusk');
  assert.equal(restored.customKeepsakes.length, 1);
});

test('comfort preferences normalize text scale, reduced motion, transparency, separate audio volumes, and notifications', () => {
  const prefs = normalizeInterfacePreferences({
    appearance: 'dark',
    density: 'comfortable',
    textScale: 'large',
    reducedMotion: 'reduce',
    transparency: 'solid',
    musicVolume: 130,
    effectsVolume: -10,
    notifications: 'important',
  });
  assert.equal(prefs.textScale, 'large');
  assert.equal(prefs.reducedMotion, 'reduce');
  assert.equal(prefs.transparency, 'solid');
  assert.equal(prefs.musicVolume, 100);
  assert.equal(prefs.effectsVolume, 0);
  assert.equal(prefs.notifications, 'important');
  assert.equal(resolveReducedMotion('reduce', false), true);
  assert.equal(resolveReducedMotion('full', true), false);
  assert.equal(resolveReducedMotion('system', true), true);
});
