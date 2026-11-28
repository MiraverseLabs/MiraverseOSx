import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  SPECIES_RECORDS, SPECIES_MANIFEST, LINEAGE_RECORDS, PRACTICE_RECORDS,
  ELEMENTAL_HUMAN_RECORDS, findSpeciesRecord, searchSpeciesRecords,
} from '../src/game-content/species/registry.ts';

test('the complete approved source is preserved byte-for-byte with all 386 distinct IDs', async () => {
  const bytes = await readFile(new URL('../src/game-content/species/records.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), SPECIES_MANIFEST.sha256);
  assert.equal(SPECIES_RECORDS.length, 386);
  assert.equal(new Set(SPECIES_RECORDS.map(record => record.id)).size, 386);
  for (let i = 1; i <= 386; i++) assert.ok(findSpeciesRecord(`MR-${String(i).padStart(3, '0')}`));
  for (const record of SPECIES_RECORDS) {
    for (const key of ['name', 'realm', 'category', 'family', 'physiology', 'passiveAbilities', 'activePowers', 'abilityConstraints']) assert.equal(typeof record[key], 'string', `${record.id}.${key}`);
    assert.ok(Array.isArray(record.powerReferences));
  }
});

test('practices remain distinct from lineage options, including Witchkind and Techno Witch', () => {
  assert.equal(ELEMENTAL_HUMAN_RECORDS.length, 8);
  assert.equal(PRACTICE_RECORDS.length, 54);
  assert.ok(LINEAGE_RECORDS.some(record => record.name === 'Witchkind'));
  assert.ok(!LINEAGE_RECORDS.some(record => record.name === 'Techno Witch'));
  assert.equal(findSpeciesRecord('techno witch').family, 'Witch tradition');
  assert.match(findSpeciesRecord('Witchkind').abilityConstraints, /Only Witchkind/);
});

test('search combines name/power keywords with exact realm, family and category filters', () => {
  assert.equal(searchSpeciesRecords({ query: ' digital ritual ', category: 'Practices & statuses' })[0].name, 'Techno Witch');
  const winter = searchSpeciesRecords({ realm: 'Fross', family: 'Elven' });
  assert.ok(winter.length > 0);
  assert.ok(winter.every(record => record.realm === 'Fross' && record.family === 'Elven'));
  assert.equal(searchSpeciesRecords({ query: 'MR-386' })[0].name, 'Fallen Angel');
  assert.deepEqual(searchSpeciesRecords({ query: 'nonexistent-species-012345' }), []);
});


test('the lightweight character identity index stays in sync with canonical profiles', async () => {
  const index = JSON.parse(await readFile(new URL('../src/game-content/species/identityIndex.json', import.meta.url), 'utf8'));
  assert.deepEqual(index, SPECIES_RECORDS.map(({id, name, category, family}) => ({id, name, category, family})));
});
